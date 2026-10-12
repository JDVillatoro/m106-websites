// =============================================================================
// graph/eulerian.js  –  Eulerian graphs: generators, Eulerizing
// =============================================================================
//
// Part of lib/graph/: see the top of core.js.
// =============================================================================

import { vertexId, vertexIndex, makeLabels, shuffle, getOddVertices, getDirectedDegrees } from './core.js';
import {
    _simpleGraph, _toEdges, _generateConnectedMultigraph, generateSimpleGraph, generateMSCDigraph,
} from './generate.js';


// ---------------------------------------------------------------------------
// Undirected Eulerian generators
// ---------------------------------------------------------------------------

/**
 * Generate a random Eulerian simple graph (all vertices even-degree).
 * Rerolls up to maxRerolls times if simple pairing is impossible.
 * @param {number} n
 * @param {number} [targetEdges]
 * @param {number} [maxRerolls=30]
 * @returns {object}  graph object
 */
export function generateEulerianSimpleGraph(n, targetEdges, maxRerolls = 30) {
    for (let roll = 0; roll < maxRerolls; roll++) {
        const indexEdges = _simpleGraph(n, targetEdges);
        const edgeSet    = new Set(indexEdges.map(({ s, t }) => `${Math.min(s,t)}-${Math.max(s,t)}`));
        const odds       = shuffle(getOddVertices({ n, edges: _toEdges(indexEdges) }));

        if (odds.length === 0) {
            return { n, names: makeLabels(n), directed: false, edgeLabel: null, edges: _toEdges(indexEdges) };
        }

        if (odds.length % 2 === 0) {
            const pairs = _findSimplePairing(odds, edgeSet);
            if (pairs !== null) {
                for (const [u, v] of pairs) {
                    indexEdges.push({ s: u, t: v });
                    edgeSet.add(`${Math.min(u,v)}-${Math.max(u,v)}`);
                }
                return { n, names: makeLabels(n), directed: false, edgeLabel: null, edges: _toEdges(indexEdges) };
            }
        }
    }
    // Fallback: return a plain simple graph (extremely rare)
    return generateSimpleGraph(n, targetEdges);
}

/**
 * Generate a random Eulerian multigraph (no loops).
 * @param {number} n
 * @param {number} [targetEdges]
 * @returns {object}  graph object
 */
export function generateEulerianMultigraph(n, targetEdges) {
    const base = _generateConnectedMultigraph(n, targetEdges, { allowLoops: false, allowMultiple: true });
    const indexEdges = base.edges.map(e => ({ s: vertexIndex(e.source), t: vertexIndex(e.target) }));
    const edgeSet    = new Set(indexEdges.map(({ s, t }) => `${Math.min(s,t)}-${Math.max(s,t)}`));
    const odds       = shuffle(getOddVertices(base));

    if (odds.length === 0) return base;

    if (odds.length % 2 === 0) {
        for (let i = 0; i < odds.length; i += 2) {
            const u = odds[i], v = odds[i + 1];
            const key = `${Math.min(u,v)}-${Math.max(u,v)}`;
            indexEdges.push({ s: u, t: v });
            edgeSet.add(key);
        }
    }

    // Assign lowercase letter labels (edge names) for display
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const edges   = indexEdges.map((e, i) => ({
        source: vertexId(e.s),
        target: vertexId(e.t),
        label:  letters[i] || `e${i}`,
    }));

    return { n, names: makeLabels(n), directed: false, edgeLabel: 'name', edges };
}

/**
 * Pairing helper used by Eulerian simple graph generator.
 * Finds a perfect matching on `odds` using only edges absent from edgeSet.
 * @param {number[]} odds
 * @param {Set<string>} edgeSet
 * @returns {Array<[number,number]>|null}
 */
function _findSimplePairing(odds, edgeSet) {
    function backtrack(remaining) {
        if (remaining.length === 0) return [];
        const first = remaining[0];
        const rest  = shuffle([...remaining.slice(1)]);
        for (const partner of rest) {
            const key = `${Math.min(first,partner)}-${Math.max(first,partner)}`;
            if (!edgeSet.has(key)) {
                const sub = backtrack(rest.filter(v => v !== partner));
                if (sub !== null) return [[first, partner], ...sub];
            }
        }
        return null;
    }
    return backtrack(odds);
}


// ---------------------------------------------------------------------------
// Directed Eulerian generator
// ---------------------------------------------------------------------------

/**
 * Balance a directed graph so every vertex has in-degree == out-degree.
 * Mutates and returns the edges array.
 * @param {Edge[]} edges
 * @param {number} n
 * @returns {Edge[]}
 */
function _eulerizeDigraph(edges, n) {
    const { inDeg, outDeg } = getDirectedDegrees({ n, edges, directed: true });

    // Build surplus (more out than in) and deficit (more in than out) lists
    const sources = []; // need more in-edges
    const sinks   = []; // need more out-edges
    for (let v = 0; v < n; v++) {
        const delta = outDeg[v] - inDeg[v];
        for (let k = 0; k < Math.abs(delta); k++) {
            if (delta > 0) sinks.push(vertexId(v));
            else           sources.push(vertexId(v));
        }
    }

    shuffle(sources);
    shuffle(sinks);

    const edgeSet = new Set(edges.map(e => `${e.source}->${e.target}`));

    while (sources.length > 0 && sinks.length > 0) {
        const s = sources[sources.length - 1];

        // Priority 1: avoid duplicate and reverse
        let chosenIdx = sinks.findLastIndex(t => t !== s && !edgeSet.has(`${s}->${t}`) && !edgeSet.has(`${t}->${s}`));
        // Priority 2: avoid duplicate only
        if (chosenIdx === -1) chosenIdx = sinks.findLastIndex(t => t !== s && !edgeSet.has(`${s}->${t}`));
        // Priority 3: any non-duplicate
        if (chosenIdx === -1) chosenIdx = sinks.findLastIndex(t => !edgeSet.has(`${s}->${t}`));
        // Give up on this source if completely stuck
        if (chosenIdx === -1) { sources.pop(); continue; }

        sources.pop();
        const t = sinks.splice(chosenIdx, 1)[0];
        edges.push({ source: s, target: t, label: null });
        edgeSet.add(`${s}->${t}`);
    }

    return edges;
}

/**
 * Generate a random Eulerian directed graph (in-deg == out-deg everywhere).
 * @param {number} n
 * @param {number} [targetEdges]
 * @returns {object}  graph object
 */
export function generateEulerianDigraph(n, targetEdges) {
    const maxEdges = n * (n - 1);
    if (typeof targetEdges !== 'number' || isNaN(targetEdges) || targetEdges <= 0) {
        const minT = Math.floor(0.1 * maxEdges);
        const maxT = Math.floor(0.2 * maxEdges);
        targetEdges = Math.floor(Math.random() * (maxT - minT + 1)) + minT;
    }

    const msc    = generateMSCDigraph(n);
    const edges  = msc.edges.slice();
    const edgeSet = new Set(edges.map(e => `${e.source}->${e.target}`));

    let tries = 0;
    while (edges.length < targetEdges && tries < maxEdges * 20) {
        let found = false;
        for (let attempt = 0; attempt < 40 && !found; attempt++) {
            const i = Math.floor(Math.random() * n);
            const j = Math.floor(Math.random() * n);
            if (i === j) continue;
            const key = `${vertexId(i)}->${vertexId(j)}`;
            const rev = `${vertexId(j)}->${vertexId(i)}`;
            if (!edgeSet.has(key) && !edgeSet.has(rev)) {
                edges.push({ source: vertexId(i), target: vertexId(j), label: null });
                edgeSet.add(key);
                found = true;
            }
        }
        if (!found) {
            for (let attempt = 0; attempt < 100 && !found; attempt++) {
                const i = Math.floor(Math.random() * n);
                const j = Math.floor(Math.random() * n);
                if (i === j) continue;
                const key = `${vertexId(i)}->${vertexId(j)}`;
                if (!edgeSet.has(key)) {
                    edges.push({ source: vertexId(i), target: vertexId(j), label: null });
                    edgeSet.add(key);
                    found = true;
                }
            }
        }
        if (!found) break;
        tries++;
    }

    return {
        n,
        names:     makeLabels(n),
        directed:  true,
        edgeLabel: null,
        edges:     _eulerizeDigraph(edges, n),
    };
}


// ---------------------------------------------------------------------------
// Eulerizing
// ---------------------------------------------------------------------------

/**
 * Minimum number of edges needed to Eulerize a connected undirected graph,
 * where added edges must duplicate existing edges (Chinese Postman approach).
 *
 * Algorithm:
 *   1. Find all odd-degree vertices.
 *   2. BFS shortest-path distances between every pair of odd vertices
 *      (each unit = one edge to duplicate along the path).
 *   3. Minimum-weight perfect matching over odd vertices via bitmask DP.
 *
 * @param {object} graph
 * @returns {number}
 */
export function minEulerizeEdges(graph) {
    const odds = getOddVertices(graph); // vertex indices
    const k = odds.length;
    if (k === 0) return 0;

    // Build undirected adjacency list (ignoring self-loops)
    const adj = Array.from({ length: graph.n }, () => []);
    for (const { source, target } of graph.edges) {
        const s = vertexIndex(source), t = vertexIndex(target);
        if (s !== t) { adj[s].push(t); adj[t].push(s); }
    }

    // BFS from `start`; returns distance array indexed by vertex index
    function bfsDist(start) {
        const dist = new Array(graph.n).fill(-1);
        dist[start] = 0;
        const queue = [start];
        while (queue.length) {
            const u = queue.shift();
            for (const v of adj[u]) {
                if (dist[v] === -1) { dist[v] = dist[u] + 1; queue.push(v); }
            }
        }
        return dist;
    }

    // Pairwise shortest-path distances between odd vertices (k×k matrix)
    const dist = odds.map(v => {
        const d = bfsDist(v);
        return odds.map(w => (d[w] === -1 ? Infinity : d[w]));
    });

    // Minimum-weight perfect matching via bitmask DP — O(k² · 2^k), fast for k ≤ 8
    const INF = Infinity;
    const full = (1 << k) - 1;
    const memo = new Array(1 << k).fill(INF);
    memo[0] = 0;

    for (let mask = 0; mask <= full; mask++) {
        if (memo[mask] === INF) continue;
        // Find the lowest-indexed unmatched vertex
        let first = -1;
        for (let i = 0; i < k; i++) {
            if (!(mask >> i & 1)) { first = i; break; }
        }
        if (first === -1) continue; // all matched
        // Pair it with every other unmatched vertex
        for (let j = first + 1; j < k; j++) {
            if (mask >> j & 1) continue;
            const newMask = mask | (1 << first) | (1 << j);
            const cost = memo[mask] + dist[first][j];
            if (cost < memo[newMask]) memo[newMask] = cost;
        }
    }

    return memo[full];
}

/**
 * Return the display-names of vertices where in-degree ≠ out-degree.
 * These are the vertices "responsible" for a directed graph not being Eulerian.
 * @param {object} graph
 * @returns {string[]}
 */
export function getMismatchedVertices(graph) {
    const { inDeg, outDeg } = getDirectedDegrees(graph);
    return graph.names.filter((_, i) => inDeg[i] !== outDeg[i]);
}

// =============================================================================
// graph/generate.js  –  Random graph generators
// =============================================================================
//
// Part of lib/graph/: see the top of core.js.
// =============================================================================

import { vertexId, makeLabels, shuffle, isStronglyConnected } from './core.js';

// ---------------------------------------------------------------------------
// Simple graph generators (undirected, numeric-index helpers)
// ---------------------------------------------------------------------------
// Internal helpers use vertex *indices* (numbers) for compactness;
// public generators return complete graph objects with "vN" string ids.

/**
 * Generate a random spanning tree on n vertices.
 * Starts from K_n, shuffles its edges, and removes them one at a time
 * (skipping any whose removal would disconnect the graph). What's left is a
 * spanning tree; not every tree is equally likely.
 * @param {number} n
 * @returns {Array<{s: number, t: number}>}  index-pair edges
 */
function _minimalConnectedGraph(n) {
    if (n < 2) return [];
    const edges = [];
    for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++)
            edges.push({ s: i, t: j });
    shuffle(edges);

    // Greedily remove edges that don't disconnect
    for (let idx = edges.length - 1; idx >= 0; idx--) {
        const removed = edges.splice(idx, 1);
        if (!_indexEdgesConnected(edges, n)) edges.splice(idx, 0, removed[0]);
    }
    return edges;
}

/** Connectivity check on index-pair edges. */
export function _indexEdgesConnected(indexEdges, n) {
    const adj = Array.from({ length: n }, () => []);
    for (const { s, t } of indexEdges) { adj[s].push(t); adj[t].push(s); }
    const visited = new Uint8Array(n);
    const queue = [0]; visited[0] = 1; let count = 1;
    while (queue.length) {
        for (const nb of adj[queue.pop()]) {
            if (!visited[nb]) { visited[nb] = 1; count++; queue.push(nb); }
        }
    }
    return count === n;
}

/**
 * Generate a random connected simple graph with targetEdges edges, as index
 * pairs. generateSimpleGraph wraps this in a graph object; other generators
 * use the index pairs directly.
 * Strategy:
 *   1) Clamp targetEdges to [n-1, n(n-1)/2]; if it's missing, pick a random
 *      count between roughly 40% and 80% of n(n-1)/2.
 *   2) Start from a random spanning tree (_minimalConnectedGraph), so the
 *      graph is connected.
 *   3) Add random edges not already in the graph until targetEdges is reached.
 * @param {number} n
 * @param {number} [targetEdges]
 * @returns {Array<{s: number, t: number}>}  index-pair edges
 */
export function _simpleGraph(n, targetEdges) {
    const minE = n - 1;
    const maxE = (n * (n - 1)) / 2;
    if (targetEdges == null || isNaN(targetEdges) || targetEdges <= 0) {
        const lo = Math.max(Math.round(0.4 * maxE), minE + 2);
        const hi = Math.min(Math.round(0.8 * maxE), maxE);
        targetEdges = Math.floor(Math.random() * (hi - lo + 1) + lo);
    }
    targetEdges = Math.max(minE, Math.min(maxE, Math.round(targetEdges)));

    const edges  = _minimalConnectedGraph(n);
    if (edges.length >= targetEdges) return edges;

    const edgeSet = new Set(edges.map(({ s, t }) => `${Math.min(s,t)}-${Math.max(s,t)}`));
    const candidates = [];
    for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++)
            if (!edgeSet.has(`${i}-${j}`)) candidates.push({ s: i, t: j });
    shuffle(candidates);
    for (const e of candidates) {
        if (edges.length >= targetEdges) break;
        edges.push(e);
    }
    return edges;
}

/**
 * Turn index pairs ({ s: 0, t: 2 }) into Edge objects
 * ({ source: 'v0', target: 'v2', label: null }), the form a graph object's
 * edges take. extraProps is copied into every edge (e.g. to set a label).
 * @param {Array<{s: number, t: number}>} indexEdges
 * @param {object} [extraProps]
 * @returns {Edge[]}
 */
export function _toEdges(indexEdges, extraProps = {}) {
    return indexEdges.map(({ s, t }) => ({
        source: vertexId(s),
        target: vertexId(t),
        label:  null,
        ...extraProps,
    }));
}

// ---------------------------------------------------------------------------
// Public graph generators — all return complete graph objects
// ---------------------------------------------------------------------------

/**
 * Generate a random connected simple undirected graph: _simpleGraph's edges
 * in a graph object.
 * @param {number} n
 * @param {number} [targetEdges]
 * @returns {object}  graph object
 */
export function generateSimpleGraph(n, targetEdges) {
    return {
        n,
        names:     makeLabels(n),
        directed:  false,
        edgeLabel: null,
        edges:     _toEdges(_simpleGraph(n, targetEdges)),
    };
}

/**
 * Generate a random connected multigraph (may include parallel edges and loops).
 * @param {number} n
 * @param {number} [targetEdges]
 * @param {{ allowLoops?: boolean, allowMultiple?: boolean }} [options]
 * @returns {object}  graph object
 */
export function _generateConnectedMultigraph(n, targetEdges, options = {}) {
    const { allowLoops = false, allowMultiple = false } = options;
    const maxSimple = (n * (n - 1)) / 2;

    if (targetEdges == null || isNaN(targetEdges) || targetEdges <= 0) {
        const lo = Math.max(Math.round(0.4 * maxSimple), n + 1);
        const hi = Math.min(Math.round(0.8 * maxSimple), maxSimple);
        targetEdges = lo + Math.floor(Math.random() * (hi - lo + 1));
    }

    const anySpecial  = allowLoops || allowMultiple;
    const types       = shuffle([...(allowLoops ? ['loop'] : []), ...(allowMultiple ? ['multiple'] : [])]);
    const specialCount = (!anySpecial || targetEdges <= n - 1) ? 0 : (Math.random() < 0.5 ? 1 : 2);
    const specialTypes = Array.from({ length: specialCount }, (_, i) => types[i % types.length]);

    const indexEdges = _simpleGraph(n, targetEdges - specialCount);
    const edgeSet    = new Set(indexEdges.map(({ s, t }) => `${Math.min(s,t)}-${Math.max(s,t)}`));

    for (const type of specialTypes) {
        if (type === 'loop') {
            const v = Math.floor(Math.random() * n);
            indexEdges.push({ s: v, t: v });
        } else if (type === 'multiple') {
            const simples = indexEdges.filter(e => e.s !== e.t);
            if (simples.length === 0) {
                if (allowLoops) { const v = Math.floor(Math.random() * n); indexEdges.push({ s: v, t: v }); }
                continue;
            }
            const base = simples[Math.floor(Math.random() * simples.length)];
            indexEdges.push({ s: base.s, t: base.t });
        }
    }

    return {
        n,
        names:     makeLabels(n),
        directed:  false,
        edgeLabel: null,
        edges:     _toEdges(indexEdges),
    };
}


// ---------------------------------------------------------------------------
// Directed graph generators
// ---------------------------------------------------------------------------

/**
 * Generate a minimal strongly-connected directed graph on n vertices.
 * Starts from the complete digraph and removes edges while preserving
 * strong connectivity.
 * @param {number} n
 * @returns {object}  graph object
 */
export function generateMSCDigraph(n) {
    const edges = [];
    for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++)
            if (i !== j) edges.push({ source: vertexId(i), target: vertexId(j), label: null });

    while (true) {
        let removed = false;
        for (const cand of shuffle(edges.slice())) {
            const idx  = edges.indexOf(cand);
            if (idx === -1) continue;
            const trial = edges.filter((_, i) => i !== idx);
            if (isStronglyConnected({ n, edges: trial, directed: true })) { edges.splice(idx, 1); removed = true; }
        }
        if (!removed) break;
    }

    return { n, names: makeLabels(n), directed: true, edgeLabel: null, edges };
}

/**
 * Generate a random undirected or directed graph (for the graph editor/make mode).
 * The graph type (directed, weighted) is chosen randomly.
 * @param {number} n
 * @param {number} [numComponents=1]
 * @returns {object}  graph object
 */
export function generateRandomGraph(n, numComponents = 1) {
    const directed  = Math.random() < 0.5;
    const weighted  = Math.random() < 0.5;

    const groups = Array.from({ length: numComponents }, () => []);
    for (let i = 0; i < n; i++) groups[i % numComponents].push(i);

    const edges   = [];
    const edgeSet = new Set();

    for (const group of groups) {
        if (group.length === 0) continue;
        // Isolated vertex — no edges needed; its existence is recorded by n
        if (group.length === 1) continue;

        // Spanning tree for this component
        const order = shuffle(group.slice());
        for (let i = 1; i < order.length; i++) {
            const u = order[i - 1], v = order[i];
            const key = directed ? `${u}->${v}` : [u,v].sort().join('--');
            if (edgeSet.has(key)) continue;
            edgeSet.add(key);
            edges.push({ source: vertexId(u), target: vertexId(v), label: weighted ? String(Math.floor(Math.random() * 10) + 1) : null });
        }

        // Extra random edges within the component
        const maxExtra = group.length * (group.length - 1) / 2 - (group.length - 1);
        const numExtra = Math.floor(Math.random() * (maxExtra + 1));
        let added = 0, tries = 0;
        while (added < numExtra && tries < 100 * numExtra) {
            const u = group[Math.floor(Math.random() * group.length)];
            const v = group[Math.floor(Math.random() * group.length)];
            if (u === v) { tries++; continue; }
            const key = directed ? `${u}->${v}` : [u,v].sort().join('--');
            if (edgeSet.has(key)) { tries++; continue; }
            edgeSet.add(key);
            edges.push({ source: vertexId(u), target: vertexId(v), label: weighted ? String(Math.floor(Math.random() * 10) + 1) : null });
            added++;
            tries++;
        }
    }

    return {
        n,
        names:     makeLabels(n),
        directed,
        edgeLabel: weighted ? 'weight' : null,
        edges,
    };
}

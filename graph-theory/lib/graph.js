// =============================================================================
// graph.js  –  Graph data model, generators, and algorithms
// =============================================================================
//
// Copied from legacy/graph-theory/graph.js (see its git history) and made into
// an ES module: every public name is exported, unchanged. No DOM code here,
// so the functions can be tested in Node (test/graph.test.js).
//
// Names starting with "_" are private helpers and aren't exported.
//
// This file is for graph math that any mode can use. Puzzle design (what
// kinds of graphs a mode asks about, difficulty tuning, wording) belongs in
// the mode's file.
//
// GRAPH OBJECT SHAPE
// ------------------
// All functions that accept or return a complete graph use this structure:
//
//   {
//     n:          number,        // vertex count; vertices are v0..v{n-1}
//     names:      string[],      // display label for each vertex (names[i] → vi)
//     directed:   boolean,       // true = all edges are directed
//     edgeLabel:  'weight'       // numeric labels are algorithmically meaningful
//                 | 'name'       // labels are identifiers only (e.g. multigraph edges)
//                 | null,        // no labels
//     edges:      Edge[],
//   }
//
// EDGE SHAPE
// ----------
//   {
//     source:  string,   // "v0", "v1", ... — always a "vN" id
//     target:  string,   // "v0", "v1", ...
//     label:   string | null,
//   }
//
// Isolated vertices (degree zero) are represented implicitly: they simply
// do not appear as any edge endpoint. The authoritative vertex list is
// always v0..v{n-1} regardless of the edge list.
//
// =============================================================================


// ---------------------------------------------------------------------------
// Vertex utilities
// ---------------------------------------------------------------------------

/**
 * Return the "vN" id for vertex index i.
 * @param {number} i
 * @returns {string}
 */
export function vertexId(i) {
    return `v${i}`;
}

/**
 * Parse the index from a "vN" id string.
 * @param {string} id
 * @returns {number}
 */
export function vertexIndex(id) {
    return parseInt(id.slice(1), 10);
}

/**
 * Resolve a vertex id to its display label given a names array.
 * Falls back to the id itself when names is absent or the slot is empty.
 * @param {string} id        - "vN" internal id
 * @param {string[]} names
 * @returns {string}
 */
export function vertexLabel(id, names) {
    const i = vertexIndex(id);
    return (names && names[i] && String(names[i]).trim()) ? String(names[i]).trim() : id;
}

/**
 * Generate default vertex labels.
 * Uses alphabetic labels first (A..Z, AA..AZ, BA.., ...), then falls back
 * to numeric labels only if n is very large.
 * @param {number} n
 * @returns {string[]}
 */
export function makeLabels(n) {
    const alphaLabel = (idx) => {
        let x = idx;
        let out = '';
        do {
            out = String.fromCharCode(65 + (x % 26)) + out;
            x = Math.floor(x / 26) - 1;
        } while (x >= 0);
        return out;
    };

    if (n <= 702) return Array.from({ length: n }, (_, i) => alphaLabel(i));
    return Array.from({ length: n }, (_, i) => String(i + 1));
}


// ---------------------------------------------------------------------------
// Fisher-Yates shuffle (in-place, returns the array)
// ---------------------------------------------------------------------------

/**
 * In-place Fisher-Yates shuffle.
 * Produces a uniformly random permutation of the input array.
 * @template T
 * @param {T[]} arr
 * @returns {T[]}
 */
export function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}


// ---------------------------------------------------------------------------
// Degree utilities
// ---------------------------------------------------------------------------

/**
 * Compute the degree of every vertex in an undirected graph.
 * Self-loops contribute 2 to their vertex's degree (standard convention).
 * @param {object} graph
 * @returns {number[]}  degree[i] = degree of vi
 */
export function getDegrees(graph) {
    const edges = Array.isArray(graph?.edges) ? graph.edges : [];
    const n = Number(graph?.n) || 0;
    const deg = new Array(n).fill(0);
    for (const { source, target } of edges) {
        const s = vertexIndex(source);
        const t = vertexIndex(target);
        if (s === t) { deg[s] += 2; }
        else         { deg[s]++; deg[t]++; }
    }
    return deg;
}

/**
 * Return the indices of vertices with odd degree.
 * By the handshaking lemma this list always has even length.
 * @param {object} graph
 * @returns {number[]}
 */
export function getOddVertices(graph) {
    return getDegrees(graph)
        .reduce((acc, d, i) => { if (d % 2 !== 0) acc.push(i); return acc; }, []);
}

/**
 * Return the degree sequence (sorted non-decreasing) for a graph of n vertices.
 * @param {object} graph
 * @returns {number[]}
 */
export function degreeSequence(graph) {
    return getDegrees(graph).sort((a, b) => a - b);
}

/**
 * Compute in-degree and out-degree for every vertex in a directed graph.
 * @param {object} graph
 * @returns {{ inDeg: number[], outDeg: number[] }}
 */
export function getDirectedDegrees(graph) {
    const edges = Array.isArray(graph?.edges) ? graph.edges : [];
    const n = Number(graph?.n) || 0;
    const inDeg  = new Array(n).fill(0);
    const outDeg = new Array(n).fill(0);
    for (const { source, target } of edges) {
        outDeg[vertexIndex(source)]++;
        inDeg[vertexIndex(target)]++;
    }
    return { inDeg, outDeg };
}


// ---------------------------------------------------------------------------
// Connectivity
// ---------------------------------------------------------------------------

/**
 * Build an undirected adjacency list (as Sets of indices) for n vertices.
 * Self-loops are ignored for connectivity purposes.
 * @param {object} graph
 * @returns {Set<number>[]}
 */
function _buildAdjList(graph) {
    const edges = Array.isArray(graph?.edges) ? graph.edges : [];
    const n = Number(graph?.n) || 0;
    const adj = Array.from({ length: n }, () => new Set());
    for (const { source, target } of edges) {
        const s = vertexIndex(source);
        const t = vertexIndex(target);
        if (s !== t) { adj[s].add(t); adj[t].add(s); }
    }
    return adj;
}

/**
 * Count vertices reachable from a start vertex using BFS.
 *
 * _reachableCount(graph, startVertex)
 *   - graph: { n, edges }, treated as undirected
 *   - startVertex: vertex index (number) or vertex id ("vN")
 *
 * _reachableCount(adj, startIndex)
 *   - adj: adjacency list as Set<number>[]; may be directed (isStronglyConnected
 *     passes forward and reversed lists)
 *
 * Invalid/absent start vertices return 0.
 * @param {object|Set<number>[]} graphOrAdj
 * @param {number|string} [startVertex=0]
 * @returns {number}
 */
function _reachableCount(graphOrAdj, startVertex = 0) {
    let n = 0;
    let adj = [];

    // Adjacency-list form: _reachableCount(adj, startIndex)
    if (Array.isArray(graphOrAdj) && graphOrAdj.every(s => s instanceof Set)) {
        adj = graphOrAdj;
        n = adj.length;
    } else {
        const graph = graphOrAdj || {};
        n = Number(graph.n) || 0;
        adj = _buildAdjList(graph);
    }

    if (n === 0) return 0;

    const start = typeof startVertex === 'string' ? vertexIndex(startVertex) : Number(startVertex);
    if (!Number.isInteger(start) || start < 0 || start >= n) return 0;

    const visited = new Uint8Array(n);
    const queue = [start];
    visited[start] = 1;
    let count = 1;
    while (queue.length) {
        for (const nb of adj[queue.pop()]) {
            if (!visited[nb]) { visited[nb] = 1; count++; queue.push(nb); }
        }
    }
    return count;
}

/**
 * Test undirected connectivity for a graph of n vertices.
 * @param {object} graph
 * @param {number|string} [startVertex=0]
 * @returns {boolean}
 */
export function isConnected(graph, startVertex = 0) {
    const n = Number(graph?.n) || 0;
    if (n <= 1) return true;
    return _reachableCount(graph, startVertex) === n;
}

/**
 * Test strong connectivity for a directed graph of n vertices: every vertex
 * is reachable from v0, and v0 is reachable from every vertex (checked by a
 * BFS from v0 with every edge reversed).
 * @param {object} graph
 * @returns {boolean}
 */
export function isStronglyConnected(graph) {
    const n = Number(graph?.n) || 0;
    const edges = Array.isArray(graph?.edges) ? graph.edges : [];
    if (n <= 1) return true;

    // Build directed and reversed adjacency lists
    const fwd = Array.from({ length: n }, () => new Set());
    const rev = Array.from({ length: n }, () => new Set());
    for (const { source, target } of edges) {
        const s = vertexIndex(source);
        const t = vertexIndex(target);
        fwd[s].add(t);
        rev[t].add(s);
    }

    return _reachableCount(fwd) === n && _reachableCount(rev) === n;
}


// ---------------------------------------------------------------------------
// Property detection (derived from graph data)
// ---------------------------------------------------------------------------

/**
 * Test whether the edge list contains any parallel edges.
 * For directed graphs, u→v and v→u are considered distinct.
 * @param {object} graph
 * @returns {boolean}
 */
export function isMultiGraph(graph) {
    const edges = Array.isArray(graph?.edges) ? graph.edges : [];
    const directed = !!graph?.directed;
    const seen = new Set();
    for (const { source, target } of edges) {
        const key = directed
            ? `${source}->${target}`
            : [source, target].sort().join('--');
        if (seen.has(key)) return true;
        seen.add(key);
    }
    return false;
}


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
function _indexEdgesConnected(indexEdges, n) {
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
function _simpleGraph(n, targetEdges) {
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
function _toEdges(indexEdges, extraProps = {}) {
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
function _generateConnectedMultigraph(n, targetEdges, options = {}) {
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


// =============================================================================
// Planar graph puzzle helpers
// =============================================================================

function _randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function _edgeKey(a, b) {
    return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function _isColinear(a, b, c, eps = 1e-6) {
    const area2 = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    return Math.abs(area2) <= eps;
}

function _generateNonColinearPoints(n, maxAttempts = 120) {
    const minSep = 0.08;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const pts = [];
        let ok = true;

        for (let i = 0; i < n; i++) {
            let placed = false;

            for (let tries = 0; tries < 1200 && !placed; tries++) {
                const p = { x: Math.random(), y: Math.random() };

                let tooClose = false;
                for (const q of pts) {
                    const dx = p.x - q.x;
                    const dy = p.y - q.y;
                    if ((dx * dx + dy * dy) < (minSep * minSep)) {
                        tooClose = true;
                        break;
                    }
                }
                if (tooClose) continue;

                let colinear = false;
                for (let a = 0; a < pts.length && !colinear; a++) {
                    for (let b = a + 1; b < pts.length; b++) {
                        if (_isColinear(pts[a], pts[b], p)) {
                            colinear = true;
                            break;
                        }
                    }
                }
                if (colinear) continue;

                pts.push(p);
                placed = true;
            }

            if (!placed) {
                ok = false;
                break;
            }
        }

        if (ok && pts.length === n) return pts;
    }

    return null;
}

function _ccw(a, b, c) {
    return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
}

function _segmentsIntersect(p1, p2, p3, p4) {
    return _ccw(p1, p3, p4) !== _ccw(p2, p3, p4) && _ccw(p1, p2, p3) !== _ccw(p1, p2, p4);
}

function _wouldCrossAny(a, b, indexEdges, pos) {
    for (const e of indexEdges) {
        if (e.s === a || e.s === b || e.t === a || e.t === b) continue;
        if (_segmentsIntersect(pos[a], pos[b], pos[e.s], pos[e.t])) return true;
    }
    return false;
}

function _generateConnectedPlanarIndexEdges(n, targetEdges) {
    void targetEdges;

    let points = _generateNonColinearPoints(n);
    if (!points) points = Array.from({ length: n }, () => ({ x: Math.random(), y: Math.random() }));

    const root = _randInt(0, n - 1);
    const indexEdges = [];
    const edgeSet = new Set();

    // Build a connected non-crossing seed (spanning tree) as a random-root star
    for (let v = 0; v < n; v++) {
        if (v === root) continue;
        const key = _edgeKey(root, v);
        indexEdges.push({ s: root, t: v });
        edgeSet.add(key);
    }

    // Add random non-crossing edges until no more can be added (maximal)
    while (true) {
        const candidates = [];
        for (let a = 0; a < n; a++) {
            for (let b = a + 1; b < n; b++) {
                const key = _edgeKey(a, b);
                if (edgeSet.has(key)) continue;
                if (_wouldCrossAny(a, b, indexEdges, points)) continue;
                candidates.push({ s: a, t: b, key });
            }
        }

        if (candidates.length === 0) break;
        const pick = candidates[_randInt(0, candidates.length - 1)];
        indexEdges.push({ s: pick.s, t: pick.t });
        edgeSet.add(pick.key);
    }

    return indexEdges;
}

/**
 * Count vertices in a graph object.
 * @param {object} graph
 * @returns {number}
 */
export function vertexCount(graph) {
    return Number(graph?.n) || 0;
}

/**
 * Count edges in a graph object.
 * @param {object} graph
 * @returns {number}
 */
export function edgeCount(graph) {
    return Array.isArray(graph?.edges) ? graph.edges.length : 0;
}

/**
 * Compute face count using Euler's formula F = 2 - V + E.
 *
 * Note: this is valid for connected planar embeddings. The function does not
 * validate planarity or connectedness of the input graph.
 * @param {object} graph
 * @returns {number}
 */
export function faceCount(graph) {
    return 2 - vertexCount(graph) + edgeCount(graph);
}

/**
 * Generate a connected planar graph using a geometric non-crossing strategy.
 *
 * Strategy:
 *   1) Build a maximal connected non-crossing graph from random non-colinear
 *      points by repeatedly adding non-crossing candidate edges.
 *   2) Pick a target edge count in [n-1, 3n-6] via factor range.
 *   3) Sparsify by removing random removable edges while preserving
 *      connectedness until the target is reached.
 *
 * @param {number} n
 * @param {number} planarExtraEdgeFactorMin
 * @param {number} planarExtraEdgeFactorMax
 * @returns {object}
 */
export function generatePlanarGraph(n, planarExtraEdgeFactorMin, planarExtraEdgeFactorMax) {
    const factor = planarExtraEdgeFactorMin
        + Math.random() * (planarExtraEdgeFactorMax - planarExtraEdgeFactorMin);
    const target = Math.min(3 * n - 6, Math.max(n - 1, Math.round(n * factor)));
    let indexEdges = _generateConnectedPlanarIndexEdges(n, target);

    while (indexEdges.length > target) {
        const removableIdx = [];
        for (let i = 0; i < indexEdges.length; i++) {
            const trial = indexEdges.filter((_, j) => j !== i);
            if (_indexEdgesConnected(trial, n)) removableIdx.push(i);
        }
        if (removableIdx.length === 0) break;

        const drop = removableIdx[_randInt(0, removableIdx.length - 1)];
        indexEdges = indexEdges.filter((_, i) => i !== drop);
    }

    return {
        n,
        names: makeLabels(n),
        directed: false,
        edgeLabel: null,
        edges: _toEdges(indexEdges),
    };
}

function _injectK5(indexEdges, n) {
    const vertices = shuffle(Array.from({ length: n }, (_, i) => i)).slice(0, 5);
    const required = [];
    for (let i = 0; i < vertices.length; i++) {
        for (let j = i + 1; j < vertices.length; j++) {
            required.push({ s: vertices[i], t: vertices[j] });
        }
    }
    return { required, witnessVertices: vertices };
}

function _injectK33(indexEdges, n) {
    const vertices = shuffle(Array.from({ length: n }, (_, i) => i)).slice(0, 6);
    const left = vertices.slice(0, 3);
    const right = vertices.slice(3, 6);
    const required = [];
    for (const a of left) {
        for (const b of right) required.push({ s: a, t: b });
    }
    return { required, witnessVertices: vertices, left, right };
}

/**
 * Generate a connected non-planar graph by injecting a required obstruction
 * into a planar base graph.
 *
 * Strategy:
 *   1) Start from a generated connected planar base graph.
 *   2) Inject all edges of a required K5 or K3,3 obstruction among sampled
 *      vertices.
 *   3) Randomly remove non-core edges while keeping connectedness to control
 *      density.
 *
 * @param {number} n
 * @param {'K5'|'K3,3'} type
 * @param {number} nonPlanarExtraEdgeSlackMax
 * @param {number} planarExtraEdgeFactorMin  for the planar base (see generatePlanarGraph)
 * @param {number} planarExtraEdgeFactorMax
 * @returns {object}
 */
export function generateNonPlanarGraph(n, type, nonPlanarExtraEdgeSlackMax,
                                       planarExtraEdgeFactorMin, planarExtraEdgeFactorMax) {
    const base = generatePlanarGraph(n, planarExtraEdgeFactorMin, planarExtraEdgeFactorMax);
    let indexEdges = base.edges.map(e => ({ s: vertexIndex(e.source), t: vertexIndex(e.target) }));
    const baseEdgeCount = indexEdges.length;

    const obstruction = type;
    const injected = obstruction === 'K3,3' ? _injectK33(indexEdges, n) : _injectK5(indexEdges, n);

    const edgeSet = new Set(indexEdges.map(e => _edgeKey(e.s, e.t)));
    const coreSet = new Set();

    for (const e of injected.required) {
        const key = _edgeKey(e.s, e.t);
        coreSet.add(key);
        if (!edgeSet.has(key)) {
            indexEdges.push({ s: e.s, t: e.t });
            edgeSet.add(key);
        }
    }

    const target = baseEdgeCount + _randInt(0, Math.min(nonPlanarExtraEdgeSlackMax, indexEdges.length - baseEdgeCount));
    const removable = shuffle(indexEdges.filter(e => !coreSet.has(_edgeKey(e.s, e.t))));

    for (const cand of removable) {
        if (indexEdges.length <= target) break;
        const key = _edgeKey(cand.s, cand.t);
        const trial = indexEdges.filter(e => !(e.s === cand.s && e.t === cand.t) && !(e.s === cand.t && e.t === cand.s));
        if (_indexEdgesConnected(trial, n)) {
            indexEdges = trial;
            edgeSet.delete(key);
        }
    }

    return {
        n,
        names: makeLabels(n),
        directed: false,
        edgeLabel: null,
        edges: _toEdges(indexEdges),
    };
}


// =============================================================================
// Graph coloring puzzle helpers
// =============================================================================

function _makeNumberNames(n) {
    return Array.from({ length: n }, (_, i) => String(i + 1));
}

// Can the vertices be colored with k colors so that neighbors differ?
// adj is from _buildAdjList, which drops self-loops and repeated edges.
function _isColorableWithK(adj, k) {
    if (k <= 0) return false;
    const n = adj.length;

    const order = Array.from({ length: n }, (_, i) => i)
        .sort((a, b) => adj[b].size - adj[a].size);
    const color = new Array(n).fill(-1);

    function dfs(pos) {
        if (pos >= order.length) return true;
        const v = order[pos];

        const used = new Set();
        for (const nb of adj[v]) {
            if (color[nb] !== -1) used.add(color[nb]);
        }

        for (let c = 0; c < k; c++) {
            if (used.has(c)) continue;
            color[v] = c;
            if (dfs(pos + 1)) return true;
            color[v] = -1;
        }
        return false;
    }

    return dfs(0);
}

export function chromaticNumber(graph, maxColors = 6) {
    if (!graph || !Array.isArray(graph.edges)) return null;
    const adj = _buildAdjList(graph);

    for (let k = 1; k <= maxColors; k++) {
        if (_isColorableWithK(adj, k)) return k;
    }
    return null;
}

// Puzzle-specific graph-coloring generation now lives in graph-coloring-mode.js
// so each mode can tune puzzle distributions independently.

/**
 * Validate a full vertex coloring for an undirected graph.
 *
 * @param {object} graph
 * @param {Object.<string,string>} colorByVertexId map from vertex id ('v0',...)
 * @param {number} [minColors]
 * @returns {{
 *   ok: boolean,
 *   reason?: 'incomplete'|'conflict',
 *   v1?: string,
 *   v2?: string,
 *   color?: string,
 *   usedColors?: number,
 *   isMinimal?: boolean,
 * }}
 */
export function validateGraphColoring(graph, colorByVertexId, minColors) {
    if (!graph || !Array.isArray(graph.edges)) return { ok: false, reason: 'incomplete' };

    const n = Number(graph.n) || 0;
    const names = Array.isArray(graph.names) ? graph.names : _makeNumberNames(n);
    const normalize = c => String(c || '').trim().toLowerCase();

    const used = new Set();
    for (let i = 0; i < n; i++) {
        const vid = vertexId(i);
        const c = normalize(colorByVertexId ? colorByVertexId[vid] : '');
        if (!c) return { ok: false, reason: 'incomplete' };
        used.add(c);
    }

    for (const e of graph.edges) {
        const s = e.source;
        const t = e.target;
        const cs = normalize(colorByVertexId[s]);
        const ct = normalize(colorByVertexId[t]);
        if (cs && ct && cs === ct) {
            const si = vertexIndex(s);
            const ti = vertexIndex(t);
            return {
                ok: false,
                reason: 'conflict',
                v1: names[si] || String(si + 1),
                v2: names[ti] || String(ti + 1),
                color: cs,
            };
        }
    }

    const usedColors = used.size;
    return {
        ok: true,
        usedColors,
        isMinimal: typeof minColors === 'number' ? usedColors === minColors : false,
    };
}

/**
 * Compute the deterministic greedy-color assignment for a given vertex order.
 * For each vertex in order, assign the first available color not used by
 * already-colored neighbors.
 *
 * @param {object} graph
 * @param {string[]} vertexOrderIds e.g. ['v0','v3','v1',...]
 * @param {string[]} colorOrder tokens in priority order, e.g. ['a','b','c','d','e','f']
 * @returns {{ assignment: Object.<string,string>, ok: boolean }}
 */
function _computeGreedyColoring(graph, vertexOrderIds, colorOrder) {
    if (!graph || !Array.isArray(graph.edges)) return { assignment: {}, ok: false };

    const n = Number(graph.n) || 0;
    const order = Array.isArray(vertexOrderIds) && vertexOrderIds.length === n
        ? vertexOrderIds.slice()
        : Array.from({ length: n }, (_, i) => vertexId(i));
    const colors = Array.isArray(colorOrder) && colorOrder.length > 0
        ? colorOrder.slice()
        : ['a', 'b', 'c', 'd', 'e', 'f'];

    const adj = Array.from({ length: n }, () => new Set());
    for (const e of graph.edges) {
        const s = vertexIndex(e.source);
        const t = vertexIndex(e.target);
        if (s === t) continue;
        adj[s].add(t);
        adj[t].add(s);
    }

    const assignment = {};
    for (const vid of order) {
        const v = vertexIndex(vid);
        const used = new Set();
        for (const nb of adj[v]) {
            const nbColor = assignment[vertexId(nb)];
            if (nbColor) used.add(nbColor);
        }
        const chosen = colors.find(c => !used.has(c));
        if (!chosen) return { assignment, ok: false };
        assignment[vid] = chosen;
    }

    return { assignment, ok: true };
}

/**
 * Validate a user coloring against the greedy-coloring algorithm, reporting
 * the first vertex (in the specified order) where the color differs from the
 * required greedy choice.
 *
 * @param {object} graph
 * @param {string[]} vertexOrderIds
 * @param {Object.<string,string>} userColorByVertexId
 * @param {string[]} colorOrder
 * @returns {{
 *   ok: boolean,
 *   reason?: 'incomplete'|'incorrect',
 *   vertexId?: string,
 *   vertexLabel?: string,
 *   expected?: string,
 *   got?: string,
 * }}
 */
export function validateGreedyColoring(graph, vertexOrderIds, userColorByVertexId, colorOrder) {
    const n = Number(graph?.n) || 0;
    const names = Array.isArray(graph?.names) ? graph.names : _makeNumberNames(n);
    const order = Array.isArray(vertexOrderIds) && vertexOrderIds.length === n
        ? vertexOrderIds.slice()
        : Array.from({ length: n }, (_, i) => vertexId(i));

    const normalized = {};
    for (let i = 0; i < n; i++) {
        const vid = vertexId(i);
        normalized[vid] = String(userColorByVertexId?.[vid] || '').trim().toLowerCase();
    }

    const { assignment, ok } = _computeGreedyColoring(graph, order, colorOrder);
    if (!ok) {
        return { ok: false, reason: 'incorrect' };
    }

    for (const vid of order) {
        const got = normalized[vid];
        if (!got) {
            return {
                ok: false,
                reason: 'incomplete',
                vertexId: vid,
                vertexLabel: names[vertexIndex(vid)] || String(vertexIndex(vid) + 1),
            };
        }

        const expected = assignment[vid];
        if (got !== expected) {
            return {
                ok: false,
                reason: 'incorrect',
                vertexId: vid,
                vertexLabel: names[vertexIndex(vid)] || String(vertexIndex(vid) + 1),
                expected,
                got,
            };
        }
    }

    return { ok: true };
}


// =============================================================================
// Isomorphism: invariants and checking a witness
// =============================================================================

// ---------------------------------------------------------------------------
// Structural invariants
// ---------------------------------------------------------------------------

/**
 * Count undirected triangles (unordered triples of mutually adjacent vertices).
 * @param {object} graph
 * @returns {number}
 */
export function countTriangles(graph) {
    const n = Number(graph?.n) || 0;
    const edges = Array.isArray(graph?.edges) ? graph.edges : [];
    const adj = Array.from({ length: n }, () => new Set());
    for (const { source, target } of edges) {
        const s = vertexIndex(source), t = vertexIndex(target);
        if (s !== t) { adj[s].add(t); adj[t].add(s); }
    }
    let count = 0;
    for (let u = 0; u < n; u++)
        for (const v of adj[u]) if (v > u)
            for (const w of adj[v]) if (w > v && adj[u].has(w)) count++;
    return count;
}

/**
 * Count connected components (undirected BFS over all vertices).
 * @param {object} graph
 * @returns {number}
 */
export function componentCount(graph) {
    const n = Number(graph?.n) || 0;
    const edges = Array.isArray(graph?.edges) ? graph.edges : [];
    const visited = new Uint8Array(n);
    const adj     = Array.from({ length: n }, () => []);
    for (const { source, target } of edges) {
        const s = vertexIndex(source), t = vertexIndex(target);
        if (s !== t) { adj[s].push(t); adj[t].push(s); }
    }
    let comps = 0;
    for (let i = 0; i < n; i++) {
        if (visited[i]) continue;
        comps++;
        const queue = [i]; visited[i] = 1;
        while (queue.length)
            for (const nb of adj[queue.pop()])
                if (!visited[nb]) { visited[nb] = 1; queue.push(nb); }
    }
    return comps;
}

/**
 * Collect the five quick structural invariants used to discriminate isomorphism.
 * @param {object} graph
 * @returns {{ n, edgeCount, degSeq, components, triangles }}
 */
export function graphInvariants(graph) {
    return {
        n:          graph.n,
        edgeCount:  graph.edges.length,
        degSeq:     degreeSequence(graph).join(','),
        components: componentCount(graph),
        triangles:  countTriangles(graph),
    };
}

// ---------------------------------------------------------------------------
// Graph transformers
// ---------------------------------------------------------------------------

/**
 * Return a new graph with the same names but edges re-wired by permutation sigma.
 * sigma[i] = j means vertex index i in g1 maps to vertex index j in g2.
 * @param {object}   graph
 * @param {number[]} sigma  permutation of length graph.n
 * @returns {object}
 */
export function applyPermutation(graph, sigma) {
    const edges = graph.edges.map(e => ({
        source: vertexId(sigma[vertexIndex(e.source)]),
        target: vertexId(sigma[vertexIndex(e.target)]),
        label:  e.label,
    }));
    return { ...graph, edges };
}

/**
 * Verify a student-supplied isomorphism witness for two undirected simple graphs.
 * @param {object}                  g1
 * @param {object}                  g2
 * @param {Object.<string,string>}  nameMap  { g1Label: g2Label, … }
 * @returns {boolean}
 */
export function verifyIsomorphismWitness(g1, g2, nameMap) {
    if (Object.keys(nameMap).length !== g1.n) return false;

    const g1Set = new Set(g1.names);
    const g2Set = new Set(g2.names);
    for (const [k, v] of Object.entries(nameMap)) {
        if (!g1Set.has(k) || !g2Set.has(v)) return false;
    }
    // Must be a bijection
    if (new Set(Object.values(nameMap)).size !== g2.n) return false;

    // Build g2 edge set keyed by sorted name pairs
    const g2EdgeSet = new Set(
        g2.edges.map(e => {
            const s = vertexLabel(e.source, g2.names);
            const t = vertexLabel(e.target, g2.names);
            return [s, t].sort().join('--');
        })
    );
    if (g2EdgeSet.size !== g1.edges.length) return false;

    for (const e of g1.edges) {
        const s = nameMap[vertexLabel(e.source, g1.names)];
        const t = nameMap[vertexLabel(e.target, g1.names)];
        if (!s || !t) return false;
        if (!g2EdgeSet.has([s, t].sort().join('--'))) return false;
    }
    return true;
}


// =============================================================================
// Cut vertices, leaves, bipartite parts (used by the Hamiltonian mode)
// =============================================================================

/**
 * Return indices of all cut vertices in an undirected graph.
 * A cut vertex is a vertex whose removal increases connected-component count.
 * @param {object} graph
 * @returns {number[]}
 */
export function cutVertices(graph) {
    const { edges, n } = graph;
    if (n <= 2) return [];
    const result = [];
    for (let v = 0; v < n; v++) {
        const kept = edges.filter(e => vertexIndex(e.source) !== v && vertexIndex(e.target) !== v);
        const remaining = Array.from({ length: n }, (_, i) => i).filter(i => i !== v);
        if (remaining.length === 0) continue;
        // BFS over remaining
        const adj = Array.from({ length: n }, () => []);
        for (const e of kept) {
            const s = vertexIndex(e.source), t = vertexIndex(e.target);
            if (s !== t) { adj[s].push(t); adj[t].push(s); }
        }
        const visited = new Set();
        const queue = [remaining[0]];
        visited.add(remaining[0]);
        while (queue.length) {
            for (const nb of adj[queue.pop()]) {
                if (!visited.has(nb)) { visited.add(nb); queue.push(nb); }
            }
        }
        if (visited.size < remaining.length) result.push(v);
    }
    return result;
}

/**
 * Return indices of all leaf vertices (degree 1) in an undirected graph.
 * @param {object} graph
 * @returns {number[]}
 */
export function leafVertices(graph) {
    const deg = getDegrees(graph);
    return deg.reduce((acc, d, i) => { if (d === 1) acc.push(i); return acc; }, []);
}

/**
 * Test whether an undirected graph is bipartite using BFS 2-coloring.
 * Returns the two parts as arrays of vertex indices, or null if not bipartite.
 * @param {object} graph
 * @returns {[number[], number[]]|null}
 */
export function bipartiteParts(graph) {
    const n = Number(graph?.n) || 0;
    const adj = _buildAdjList(graph);
    const color = new Array(n).fill(-1);
    const parts = [[], []];
    for (let start = 0; start < n; start++) {
        if (color[start] !== -1) continue;
        color[start] = 0;
        parts[0].push(start);
        const queue = [start];
        while (queue.length) {
            const u = queue.shift();
            for (const v of adj[u]) {
                if (color[v] === -1) {
                    color[v] = 1 - color[u];
                    parts[color[v]].push(v);
                    queue.push(v);
                } else if (color[v] === color[u]) {
                    return null; // not bipartite
                }
            }
        }
    }
    return parts;
}

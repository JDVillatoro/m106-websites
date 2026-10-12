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
// TODO(refactor): the Applications puzzle code below still belongs in its mode
// (see legacy/graph-theory/notes/WORK_SESSION_HANDOFF_2026-03-10.md).
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

/**
 * Build an array of all vertex ids for a graph of size n.
 * @param {number} n
 * @returns {string[]}
 */
export function vertexIds(n) {
    return Array.from({ length: n }, (_, i) => vertexId(i));
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
export function buildAdjList(graph) {
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
 * Preferred signature: reachableCount(graph, startVertex)
 *   - graph: { n, edges }
 *   - startVertex: vertex index (number) or vertex id ("vN")
 *
 * Backward-compatible signature (legacy): reachableCount(adj, startIndex)
 *   - adj: adjacency list as Set<number>[]
 *
 * Invalid/absent start vertices return 0.
 * @param {object|Set<number>[]} graphOrAdj
 * @param {number|string} [startVertex=0]
 * @returns {number}
 */
export function reachableCount(graphOrAdj, startVertex = 0) {
    let n = 0;
    let adj = [];

    // Legacy form: reachableCount(adjList, startIndex)
    if (Array.isArray(graphOrAdj) && graphOrAdj.every(s => s instanceof Set)) {
        adj = graphOrAdj;
        n = adj.length;
    } else {
        const graph = graphOrAdj || {};
        n = Number(graph.n) || 0;
        adj = buildAdjList(graph);
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
    return reachableCount(graph, startVertex) === n;
}

/**
 * Test strong connectivity for a directed graph of n vertices.
 * Uses two BFS passes (forward and reversed adjacency).
 * @param {object} graph
 * @returns {boolean}
 */
export function isStronglyConnected(graph) {
    const n = Number(graph?.n) || 0;
    const edges = Array.isArray(graph?.edges) ? graph.edges : [];
    if (n <= 1) return true;

    // Build directed and reversed adjacency lists
    const fwd = Array.from({ length: n }, () => []);
    const rev = Array.from({ length: n }, () => []);
    for (const { source, target } of edges) {
        const s = vertexIndex(source);
        const t = vertexIndex(target);
        fwd[s].push(t);
        rev[t].push(s);
    }

    /**
     * BFS reachability count from vertex 0 over a directed adjacency list.
     * Used by isStronglyConnected on both forward and reverse graphs.
     * @param {number[][]} adj
     * @returns {number}
     */
    function bfsCount(adj) {
        const visited = new Uint8Array(n);
        const queue = [0];
        visited[0] = 1;
        let count = 1;
        while (queue.length) {
            for (const nb of adj[queue.pop()]) {
                if (!visited[nb]) { visited[nb] = 1; count++; queue.push(nb); }
            }
        }
        return count;
    }

    return bfsCount(fwd) === n && bfsCount(rev) === n;
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
// Graph description (for screen readers / alt text)
// ---------------------------------------------------------------------------

/**
 * Convert a graph object to a plain-English description suitable for screen
 * readers and alt-text output.
 * @param {object} graph  - full graph object {n, names, directed, edgeLabel, edges}
 * @returns {{ text: string, isLong: boolean }}
 */
export function graphToDescription(graph) {
    if (!graph) return { text: 'No graph data available.', isLong: false };

    const n      = Number(graph.n) || 0;
    const names  = Array.isArray(graph.names)  ? graph.names  : [];
    const edges  = Array.isArray(graph.edges)  ? graph.edges  : [];
    const isLong = edges.length > 10 || n > 8;

    const parts = [];
    parts.push(`A ${graph.directed ? 'directed ' : ''}graph with ${n} ${n === 1 ? 'vertex' : 'vertices'} and ${edges.length} ${edges.length === 1 ? 'edge' : 'edges'}.`);

    if (isLong) parts.push('Note: this graph is large. The following description may be lengthy.');

    for (let i = 0; i < n; i++) {
        const name = names[i] && String(names[i]).trim();
        parts.push(name ? `Vertex ${i + 1} labeled ${name}.` : `Vertex ${i + 1}.`);
    }

    parts.push(edges.length === 0 ? 'There are no edges.' : 'The full edge list is as follows.');

    for (const e of edges) {
        const src  = vertexLabel(e.source, names);
        const tgt  = vertexLabel(e.target, names);
        const lbl  = e.label && String(e.label).trim() !== '' ? String(e.label).trim() : null;
        const loop = vertexIndex(e.source) === vertexIndex(e.target);

        let sentence;
        if (graph.directed) {
            sentence = lbl !== null
                ? (graph.edgeLabel === 'weight'
                    ? `A directed edge from ${src} to ${tgt} with weight ${lbl}.`
                    : `A directed edge from ${src} to ${tgt} labeled ${lbl}.`)
                : `A directed edge from ${src} to ${tgt}.`;
        } else if (loop) {
            sentence = lbl !== null ? `A loop on vertex ${src} labeled ${lbl}.` : `A loop on vertex ${src}.`;
        } else {
            sentence = lbl !== null
                ? (graph.edgeLabel === 'weight'
                    ? `An edge between ${src} and ${tgt} with weight ${lbl}.`
                    : `An edge between ${src} and ${tgt} labeled ${lbl}.`)
                : `An edge between ${src} and ${tgt}.`;
        }
        parts.push(sentence);
    }

    return { text: parts.join(' '), isLong };
}


// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

/**
 * Serialize a graph's edge list to CSV.
 * @param {object} graph
 * @returns {string}
 */
export function graphToCSV(graph) {
    const header = graph.edgeLabel ? 'source,target,label\n' : 'source,target\n';
    return header + (graph.edges || []).map(e =>
        graph.edgeLabel ? `${e.source},${e.target},${e.label ?? ''}` : `${e.source},${e.target}`
    ).join('\n');
}


// ---------------------------------------------------------------------------
// Simple graph generators (undirected, numeric-index helpers)
// ---------------------------------------------------------------------------
// Internal helpers use vertex *indices* (numbers) for compactness;
// public generators return complete graph objects with "vN" string ids.

/**
 * Generate a random spanning tree on n vertices (as index pairs).
 * Implementation: shuffle vertices and connect consecutive vertices in that
 * random order (a random Hamiltonian path).
 * Note: this does not sample uniformly from all labeled spanning trees.
 * @param {number} n
 * @returns {Array<{s: number, t: number}>}
 */
function _randomSpanningTree(n) {
    const order = shuffle(Array.from({ length: n }, (_, i) => i));
    const tree  = [];
    for (let i = 1; i < order.length; i++) {
        tree.push({ s: order[i - 1], t: order[i] });
    }
    return tree;
}

/**
 * Generate a minimal connected simple graph on n vertices.
 * Starts from K_n and greedily removes edges while maintaining connectivity.
 * The result is always a spanning tree.
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
 * Generate a random connected simple graph with approximately targetEdges edges.
 * Strategy:
 *   1) Build a minimal connected simple graph (spanning tree backbone).
 *   2) Clamp/choose targetEdges in [n-1, n(n-1)/2].
 *   3) Add random non-duplicate edges until targetEdges is reached.
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

/** Convert index-pair edges to "vN" edge objects. */
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
 * Generate a random simple undirected graph.
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
export function generateConnectedMultigraph(n, targetEdges, options = {}) {
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
    const base = generateConnectedMultigraph(n, targetEdges, { allowLoops: false, allowMultiple: true });
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
 * @returns {object}
 */
export function generateNonPlanarGraph(n, type, nonPlanarExtraEdgeSlackMax) {
    const base = generatePlanarGraph(n, 1.14, 1.55);
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

function _dedupeIndexEdges(indexEdges) {
    const seen = new Set();
    const out = [];
    for (const e of indexEdges) {
        const key = _edgeKey(e.s, e.t);
        if (e.s === e.t || seen.has(key)) continue;
        seen.add(key);
        out.push({ s: Math.min(e.s, e.t), t: Math.max(e.s, e.t) });
    }
    return out;
}

function _buildAdjFromIndexEdges(indexEdges, n) {
    const adj = Array.from({ length: n }, () => new Set());
    for (const { s, t } of indexEdges) {
        if (s === t) continue;
        adj[s].add(t);
        adj[t].add(s);
    }
    return adj;
}

function _isColorableWithK(indexEdges, n, k) {
    if (k <= 0) return false;
    const adj = _buildAdjFromIndexEdges(indexEdges, n);

    for (let i = 0; i < n; i++) {
        if (adj[i].has(i)) return false;
    }

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
    const n = Number(graph.n) || 0;
    const indexEdges = _dedupeIndexEdges(
        graph.edges.map(e => ({ s: vertexIndex(e.source), t: vertexIndex(e.target) }))
    );

    for (let k = 1; k <= maxColors; k++) {
        if (_isColorableWithK(indexEdges, n, k)) return k;
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
export function computeGreedyColoring(graph, vertexOrderIds, colorOrder) {
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

    const { assignment, ok } = computeGreedyColoring(graph, order, colorOrder);
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
// Applications puzzle helpers
// =============================================================================

export const APPLICATIONS_COMMITTEE_NAMES = [
    'Appeals Board', 'Welcoming Committee', 'Oversight Panel', 'Ethics Subcommittee', 'Grievance Council',
    'Advisory Circle', 'Review Board', 'Standards Committee', 'Nominations Panel', 'Steering Group',
    'Transition Team', 'Allocation Board', 'Credentials Committee', 'Incident Review Panel', 'Social Committee',
    'Recognition Board', 'Continuity Group', 'Founding Council', 'Exceptions Committee', 'Peripheral Affairs Bureau',
];

export const APPLICATIONS_MEMBER_NAMES = [
    'Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Frank', 'Grace', 'Heidi', 'Ivan', 'Judy',
    'Karl', 'Leo', 'Mallory', 'Nina', 'Oscar', 'Peggy', 'Quentin', 'Rupert', 'Sybil', 'Trent',
    'Uma', 'Victor', 'Walter', 'Xavier', 'Yvonne', 'Zara', 'Abby', 'Ben', 'Cathy', 'Derek', 
    'Ella', 'Fred', 'Gina', 'Hank', 'Ivy', 'Jack', 'Kara', 'Liam', 'Mona', 'Nate', 'Olivia', 
    'Paul', 'Queen', 'Ralph', 'Sara', 'Tom', 'Ursula', 'Vince', 'Wendy', 'Xander', 'Yara', 'Zane',
];

export const APPLICATIONS_LOCATION_NAMES = [
    'Downtown', 'Uptown', 'Suburbia', 'Industrial Park', 'University District', 'Waterfront',
    'Historic Quarter', 'Business Center', 'Residential Area', 'Cultural Hub', 'Tech Park', 'Greenbelt',
    'Airport', 'Shopping District', 'Entertainment Zone', 'Medical Center', 'Government Plaza', 'Sports Complex',
];

export const APPLICATIONS_FREQUENCY_OPTIONS = ['540 kHz', '600 kHz', '700 kHz', '800 kHz', '900 kHz', '1000 kHz'];

export const APPLICATIONS_SCHEDULING_CONFIG = {
    nMin: 5,
    nMax: 8,
    bipartiteWeight: 0.25,
    planarWeight: 0.50,
    k5Weight: 0.25,
    generationMaxChromatic: 5,
};

function _pickUniqueNames(pool, count, fallbackPrefix) {
    const shuffled = shuffle(pool.slice());
    const out = [];
    for (let i = 0; i < count; i++) {
        if (i < shuffled.length) out.push(shuffled[i]);
        else out.push(`${fallbackPrefix} ${i + 1}`);
    }
    return out;
}

function _makeBipartiteApplicationsGraph(n) {
    const leftSize = _randInt(2, n - 2);
    const vertices = shuffle(Array.from({ length: n }, (_, i) => i));
    const left = vertices.slice(0, leftSize);
    const right = vertices.slice(leftSize);

    const edgeSet = new Set();
    const edges = [];
    const addEdge = (a, b) => {
        const key = _edgeKey(a, b);
        if (a === b || edgeSet.has(key)) return false;
        edgeSet.add(key);
        edges.push({ s: Math.min(a, b), t: Math.max(a, b) });
        return true;
    };

    for (const r of right) addEdge(r, left[_randInt(0, left.length - 1)]);
    for (const l of left) addEdge(l, right[_randInt(0, right.length - 1)]);

    const target = Math.max(n + 1, Math.min(Math.floor(1.7 * n), left.length * right.length));
    let guard = 0;
    while (edges.length < target && guard < 3000) {
        guard++;
        addEdge(left[_randInt(0, left.length - 1)], right[_randInt(0, right.length - 1)]);
    }

    return {
        n,
        names: _makeNumberNames(n),
        directed: false,
        edgeLabel: null,
        edges: _toEdges(edges),
    };
}

function _makePlanarApplicationsGraph(n) {
    const g = generatePlanarGraph(n, 1.14, 1.55);
    return {
        n: g.n,
        names: _makeNumberNames(g.n),
        directed: false,
        edgeLabel: null,
        edges: g.edges.slice(),
    };
}

function _makeK5ApplicationsGraph(n) {
    const vertices = shuffle(Array.from({ length: n }, (_, i) => i));
    const core = vertices.slice(0, 5);
    const extras = vertices.slice(5);

    const edgeSet = new Set();
    const edges = [];
    const addEdge = (a, b) => {
        const key = _edgeKey(a, b);
        if (a === b || edgeSet.has(key)) return;
        edgeSet.add(key);
        edges.push({ s: Math.min(a, b), t: Math.max(a, b) });
    };

    for (let i = 0; i < core.length; i++) {
        for (let j = i + 1; j < core.length; j++) addEdge(core[i], core[j]);
    }

    for (const v of extras) {
        const shuffledCore = shuffle(core.slice());
        const degreeToCore = _randInt(2, 4);
        for (let i = 0; i < degreeToCore; i++) addEdge(v, shuffledCore[i]);
    }

    return {
        n,
        names: _makeNumberNames(n),
        directed: false,
        edgeLabel: null,
        edges: _toEdges(edges),
    };
}

function _generateSchedulingBaseGraph() {
    for (let attempt = 0; attempt < 60; attempt++) {
        const n = _randInt(APPLICATIONS_SCHEDULING_CONFIG.nMin, APPLICATIONS_SCHEDULING_CONFIG.nMax);
        const roll = Math.random();

        let graph;
        if (roll < APPLICATIONS_SCHEDULING_CONFIG.bipartiteWeight) {
            graph = _makeBipartiteApplicationsGraph(n);
        } else if (roll < APPLICATIONS_SCHEDULING_CONFIG.bipartiteWeight + APPLICATIONS_SCHEDULING_CONFIG.planarWeight) {
            graph = _makePlanarApplicationsGraph(n);
        } else {
            graph = _makeK5ApplicationsGraph(Math.max(n, 5));
        }

        const minResources = chromaticNumber(graph, APPLICATIONS_SCHEDULING_CONFIG.generationMaxChromatic);
        if (!minResources || minResources > APPLICATIONS_SCHEDULING_CONFIG.generationMaxChromatic) continue;

        return { graph, minResources };
    }

    const fallback = _makeBipartiteApplicationsGraph(6);
    return { graph: fallback, minResources: 2 };
}

// Generates a scheduling puzzle by dressing up a graph coloring problem in
// committee/member language. The process works as follows:
//
// 1. A base graph is generated by _generateSchedulingBaseGraph (vertices =
//    committees, minResources = minimum time slots needed).
//
// 2. Each committee gets 1 unique member assigned to it, with a 35% chance of
//    receiving a second unique member. These members belong to only that committee.
//
// 3. For every edge (s, t) in the base graph, a single new member name is drawn
//    and added to BOTH committees s and t. This is the key structural step: it
//    encodes the graph's adjacency directly into shared membership. Two committees
//    share a member if and only if there is an edge between them.
//
// 4. The resulting puzzle asks: assign meeting time slots to committees such that
//    no two committees with a shared member meet at the same time. This is exactly
//    graph coloring — the minimum number of time slots required equals minResources
//    from the base puzzle.
function _generateSchedulingApplicationsPuzzle() {
    const { graph: base, minResources } = _generateSchedulingBaseGraph();
    const committeeNames = _pickUniqueNames(APPLICATIONS_COMMITTEE_NAMES, base.n, 'Committee');

    const committeeMembers = Array.from({ length: base.n }, () => []);
    const availableMembers = shuffle(APPLICATIONS_MEMBER_NAMES.slice());
    let syntheticMemberCounter = 1;

    function takeMemberName() {
        if (availableMembers.length > 0) return availableMembers.pop();
        const name = `Member ${syntheticMemberCounter}`;
        syntheticMemberCounter++;
        return name;
    }

    for (let i = 0; i < base.n; i++) {
        committeeMembers[i].push(takeMemberName());
        if (Math.random() < 0.35) committeeMembers[i].push(takeMemberName());
    }

    for (const e of base.edges) {
        const s = vertexIndex(e.source);
        const t = vertexIndex(e.target);
        const shared = takeMemberName();
        committeeMembers[s].push(shared);
        committeeMembers[t].push(shared);
    }

    const committees = Array.from({ length: base.n }, (_, i) => ({
        vertexId: vertexId(i),
        name: committeeNames[i],
        members: Array.from(new Set(committeeMembers[i])),
    }));

    const namesById = Object.fromEntries(committees.map(c => [c.vertexId, c.name]));

    return {
        type: 'scheduling',
        n: base.n,
        names: committeeNames,
        committees,
        edges: base.edges.slice(),
        minResources,
        namesById,
    };
}

function _distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
}

function _generateSeparatedPoints(n, minSep, maxTries = 4000) {
    const pts = [];
    let tries = 0;
    while (pts.length < n && tries < maxTries) {
        tries++;
        const p = { x: Math.random() * 2, y: Math.random() * 2 };
        let ok = true;
        for (const q of pts) {
            if (_distance(p, q) < minSep) { ok = false; break; }
        }
        if (ok) pts.push(p);
    }
    return pts.length === n ? pts : null;
}

function _pairwiseDistances(points) {
    const n = points.length;
    const d = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const dist = _distance(points[i], points[j]);
            d[i][j] = dist;
            d[j][i] = dist;
        }
    }
    return d;
}

function _mstBottleneckDistance(dist) {
    const n = dist.length;
    const edges = [];
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            edges.push({ i, j, w: dist[i][j] });
        }
    }
    edges.sort((a, b) => a.w - b.w);

    const parent = Array.from({ length: n }, (_, i) => i);
    const rank = new Array(n).fill(0);
    const find = x => {
        while (parent[x] !== x) {
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        return x;
    };
    const unite = (a, b) => {
        const ra = find(a);
        const rb = find(b);
        if (ra === rb) return false;
        if (rank[ra] < rank[rb]) parent[ra] = rb;
        else if (rank[rb] < rank[ra]) parent[rb] = ra;
        else { parent[rb] = ra; rank[ra]++; }
        return true;
    };

    let used = 0;
    let bottleneck = 0;
    for (const e of edges) {
        if (!unite(e.i, e.j)) continue;
        used++;
        if (e.w > bottleneck) bottleneck = e.w;
        if (used === n - 1) break;
    }
    return bottleneck;
}

function _buildInterferenceGraphFromDistance(dist, threshold) {
    const n = dist.length;
    const indexEdges = [];
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (dist[i][j] <= threshold) indexEdges.push({ s: i, t: j });
        }
    }
    return _toEdges(indexEdges);
}

// Generates a frequency-assignment puzzle by constructing a geometric interference
// graph from randomly placed radio stations. The process works as follows:
//
// 1. n points are scattered randomly in a 2D unit square, representing station
//    locations. Points are kept at a minimum separation to avoid degenerate layouts.
//
// 2. Pairwise distances are computed. Two key distances characterise the layout:
//    - MST bottleneck: the longest edge in the minimum spanning tree. Any threshold
//      below this would disconnect the graph.
//    - Half-diameter: half the largest pairwise distance.
//
// 3. A raw interference threshold is chosen uniformly at random between the MST
//    bottleneck and 0.6× the diameter (or just 0.6× the diameter if it lies below
//    the bottleneck, which yields a disconnected graph ~25% of the time by design).
//    Using the full diameter would produce very dense graphs; this value was tuned
//    via simulation to keep the disconnected rate near 25%.
//
// 4. An edge is added between every pair of stations whose distance is ≤ the
//    threshold — these stations interfere with each other and must be assigned
//    different frequencies.
//
// 5. The raw coordinates and threshold are scaled so the closest pair of stations
//    is a random human-readable distance (100–500 miles apart).
//
// 6. The chromatic number of the interference graph is computed. This is the
//    minimum number of distinct frequencies required. If it exceeds the number of
//    available frequency options the attempt is discarded; up to 60 attempts are
//    made before falling back to a scheduling-style puzzle with dummy distances.
function _generateInterferenceApplicationsPuzzle() {
    for (let attempt = 0; attempt < 60; attempt++) {
        const n = _randInt(APPLICATIONS_SCHEDULING_CONFIG.nMin, APPLICATIONS_SCHEDULING_CONFIG.nMax);
        const points = _generateSeparatedPoints(n, 0.05);
        if (!points) continue;

        const dist = _pairwiseDistances(points);
        let minDist = Infinity;
        let diameter = 0;
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const dij = dist[i][j];
                if (dij < minDist) minDist = dij;
                if (dij > diameter) diameter = dij;
            }
        }

        const connectThreshold = _mstBottleneckDistance(dist);
        const upperDiameter = diameter * 0.6;
        const thresholdRaw = upperDiameter >= connectThreshold
            ? connectThreshold + Math.random() * (upperDiameter - connectThreshold)
            : upperDiameter;

        const targetMinMiles = Number((_randInt(100, 500) / 100).toFixed(2));
        const scale = targetMinMiles / minDist;
        const thresholdMiles = Number((thresholdRaw * scale).toFixed(2));

        const edgeList = _buildInterferenceGraphFromDistance(dist, thresholdRaw);
        const graph = {
            n,
            names: _pickUniqueNames(APPLICATIONS_LOCATION_NAMES, n, 'Station'),
            directed: false,
            edgeLabel: null,
            edges: edgeList,
        };

        const minResources = chromaticNumber(graph, APPLICATIONS_FREQUENCY_OPTIONS.length);
        if (!minResources || minResources > APPLICATIONS_FREQUENCY_OPTIONS.length) continue;

        const normalizedDistance = Array.from({ length: n }, (_, i) =>
            Array.from({ length: n }, (_, j) => Number((dist[i][j] * scale).toFixed(2)))
        );

        return {
            type: 'interference',
            n,
            names: graph.names,
            stations: graph.names.slice(),
            edges: graph.edges,
            minResources,
            thresholdMiles,
            distanceMiles: normalizedDistance,
            frequencyOptions: APPLICATIONS_FREQUENCY_OPTIONS.slice(),
            namesById: Object.fromEntries(Array.from({ length: n }, (_, i) => [vertexId(i), graph.names[i]])),
        };
    }

    const fallback = _generateSchedulingApplicationsPuzzle();
    return {
        type: 'interference',
        n: fallback.n,
        names: fallback.names,
        stations: fallback.names.slice(),
        edges: fallback.edges,
        minResources: fallback.minResources,
        thresholdMiles: 3,
        distanceMiles: Array.from({ length: fallback.n }, (_, i) =>
            Array.from({ length: fallback.n }, (_, j) => (i === j ? 0 : 3.01))
        ),
        frequencyOptions: APPLICATIONS_FREQUENCY_OPTIONS.slice(),
        namesById: fallback.namesById,
    };
}

export function generateApplicationsPuzzle() {
    return Math.random() < 0.5
        ? _generateSchedulingApplicationsPuzzle()
        : _generateInterferenceApplicationsPuzzle();
}

function _sharedMembersForEdge(puzzle, sourceId, targetId) {
    if (!puzzle || puzzle.type !== 'scheduling') return [];
    const committees = Array.isArray(puzzle.committees) ? puzzle.committees : [];
    const byId = Object.fromEntries(committees.map(c => [c.vertexId, c]));
    const s = byId[sourceId];
    const t = byId[targetId];
    if (!s || !t) return [];
    const sSet = new Set(s.members || []);
    return (t.members || []).filter(m => sSet.has(m));
}

export function validateApplicationsAssignment(puzzle, assignmentByVertexId) {
    if (!puzzle || !Array.isArray(puzzle.edges)) return { ok: false, reason: 'incomplete' };

    const n = Number(puzzle.n) || 0;
    const used = new Set();

    for (let i = 0; i < n; i++) {
        const vid = vertexId(i);
        const value = String(assignmentByVertexId?.[vid] || '').trim();
        if (!value) return { ok: false, reason: 'incomplete' };
        used.add(value);
    }

    for (const e of puzzle.edges) {
        const a = String(assignmentByVertexId?.[e.source] || '').trim();
        const b = String(assignmentByVertexId?.[e.target] || '').trim();
        if (!a || !b) return { ok: false, reason: 'incomplete' };
        if (a === b) {
            const shared = _sharedMembersForEdge(puzzle, e.source, e.target);
            return {
                ok: false,
                reason: 'conflict',
                v1Id: e.source,
                v2Id: e.target,
                v1Name: puzzle.namesById?.[e.source] || e.source,
                v2Name: puzzle.namesById?.[e.target] || e.target,
                sharedMember: shared[0] || null,
            };
        }
    }

    const usedCount = used.size;
    const minResources = Number(puzzle.minResources) || usedCount;
    return {
        ok: true,
        usedCount,
        minResources,
        optimal: usedCount === minResources,
    };
}


// =============================================================================
// Isomorphism puzzle helpers
// =============================================================================

/** Vertex-count range for isomorphism puzzles.  Change [min, max] to tune difficulty. */
export const ISO_PUZZLE_N_RANGE = [4, 6];

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

/**
 * Check whether a user-supplied reason for non-isomorphism is actually true
 * for the given pair of graphs.
 * @param {object} g1
 * @param {object} g2
 * @param {string} reason
 * @returns {boolean}
 */
export function checkNeitherReason(g1, g2, reason) {
    const i1 = graphInvariants(g1);
    const i2 = graphInvariants(g2);
    switch (reason) {
        case 'diff_vertices':   return i1.n          !== i2.n;
        case 'diff_edges':      return i1.edgeCount  !== i2.edgeCount;
        case 'diff_degree_seq': return i1.degSeq     !== i2.degSeq;
        case 'diff_components': return i1.components !== i2.components;
        case 'diff_triangles':  return i1.triangles  !== i2.triangles;
    }
    return false;
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

// ---------------------------------------------------------------------------
// Internal helpers for puzzle generation
// ---------------------------------------------------------------------------

/**
 * Generate a random connected undirected simple graph suitable for iso puzzles.
 * @param {number} n
 * @returns {object}
 */
function _isoBaseGraph(n) {
    const minE = n - 1;
    const maxE = Math.min(Math.floor(n * 1.5), (n * (n - 1)) / 2);
    const target = Math.floor(Math.random() * (maxE - minE + 1)) + minE;
    return {
        n,
        names:     makeLabels(n),
        directed:  false,
        edgeLabel: null,
        edges:     _toEdges(_simpleGraph(n, target)),
    };
}

/**
 * Random spanning tree returned as index pairs [[a,b], …].
 * @param {number} n
 * @returns {Array<[number,number]>}
 */
function _randomSpanningTreePairs(n) {
    const order = shuffle(Array.from({ length: n }, (_, i) => i));
    return order.slice(1).map((v, i) => [order[i], v]);
}

/**
 * Attempt up to maxSwaps random 2-opt degree-preserving swaps until the
 * triangle count of the graph changes.  Returns the modified graph, or null
 * if no triangle-changing swap was found.
 *
 * A 2-opt swap: pick two edges (a−b) and (c−d) with all 4 endpoints distinct
 * and neither a−c nor b−d already present; replace with a−c and b−d.
 * This is degree-preserving by construction.
 * @param {object} graph
 * @param {number} [maxSwaps=80]
 * @returns {object|null}
 */
function _swapToChangeTriangles(graph, maxSwaps = 80) {
    const origTri = countTriangles(graph);
    let edges = graph.edges.map(e => ({ ...e }));

    for (let attempt = 0; attempt < maxSwaps; attempt++) {
        const simples = edges.filter(e => vertexIndex(e.source) !== vertexIndex(e.target));
        if (simples.length < 2) break;

        const i = Math.floor(Math.random() * simples.length);
        let   j = Math.floor(Math.random() * (simples.length - 1));
        if (j >= i) j++;

        const ea = simples[i], eb = simples[j];
        const a = vertexIndex(ea.source), b = vertexIndex(ea.target);
        const c = vertexIndex(eb.source), d = vertexIndex(eb.target);
        if (new Set([a, b, c, d]).size < 4) continue;

        const edgeSet = new Set(edges.map(e => {
            const s = vertexIndex(e.source), t = vertexIndex(e.target);
            return `${Math.min(s, t)}-${Math.max(s, t)}`;
        }));
        const k1 = `${Math.min(a, c)}-${Math.max(a, c)}`;
        const k2 = `${Math.min(b, d)}-${Math.max(b, d)}`;
        if (edgeSet.has(k1) || edgeSet.has(k2)) continue;

        // Tentatively apply the swap
        const trial = edges.map(e =>
            e === ea ? { ...e, source: vertexId(a), target: vertexId(c) } :
            e === eb ? { ...e, source: vertexId(b), target: vertexId(d) } : e
        );
        const newTri = countTriangles({ ...graph, edges: trial });
        if (newTri !== origTri) return { ...graph, edges: trial };
        edges = trial; // continue walking from new state
    }
    return null;
}

// ---------------------------------------------------------------------------
// Neither-reason sub-generators
// ---------------------------------------------------------------------------

function _neitherByReason(reason, n, nMin, nMax) {
    switch (reason) {

        case 'diff_vertices': {
            const n1 = Math.floor(Math.random() * (nMax - nMin)) + nMin;
            const n2 = n1 < nMax ? n1 + 1 : n1 - 1;
            return { g1: _isoBaseGraph(n1), g2: _isoBaseGraph(n2) };
        }

        case 'diff_edges': {
            for (let attempt = 0; attempt < 40; attempt++) {
                const g1 = _isoBaseGraph(n);
                const g2 = _isoBaseGraph(n);
                if (g1.edges.length !== g2.edges.length) return { g1, g2 };
            }
            return null;
        }

        case 'diff_degree_seq': {
            // Prefer pairs with the same edge count for a cleaner puzzle
            for (let attempt = 0; attempt < 50; attempt++) {
                const g1 = _isoBaseGraph(n);
                const g2 = _isoBaseGraph(n);
                const d1 = degreeSequence(g1).join(',');
                const d2 = degreeSequence(g2).join(',');
                if (g1.edges.length === g2.edges.length && d1 !== d2) return { g1, g2 };
            }
            // Fallback: any different degree sequence
            for (let attempt = 0; attempt < 30; attempt++) {
                const g1 = _isoBaseGraph(n);
                const g2 = _isoBaseGraph(n);
                const d1 = degreeSequence(g1).join(',');
                const d2 = degreeSequence(g2).join(',');
                if (d1 !== d2) return { g1, g2 };
            }
            return null;
        }

        case 'diff_components': {
            if (n < 4) return null;
            // g1 is connected; g2 is deliberately disconnected (two components)
            const g1    = _isoBaseGraph(n);
            const split = Math.max(2, Math.floor(n / 2));
            const e1 = _randomSpanningTreePairs(split).map(([a, b]) =>
                ({ source: vertexId(a), target: vertexId(b), label: null }));
            const e2 = _randomSpanningTreePairs(n - split).map(([a, b]) =>
                ({ source: vertexId(a + split), target: vertexId(b + split), label: null }));
            const g2 = { n, names: makeLabels(n), directed: false, edgeLabel: null, edges: [...e1, ...e2] };
            if (componentCount(g2) > 1) return { g1, g2 };
            return null;
        }

        case 'diff_triangles': {
            // Strategy A: 2-opt swap that changes triangles while preserving degree sequence
            for (let attempt = 0; attempt < 20; attempt++) {
                const g1      = _isoBaseGraph(n);
                const swapped = _swapToChangeTriangles(g1);
                if (!swapped) continue;
                const d1 = degreeSequence(g1).join(',');
                const d2 = degreeSequence(swapped).join(',');
                if (d1 === d2) return { g1, g2: swapped };
            }
            // Strategy B: two independent graphs, same n/|E|/degSeq, different triangles
            for (let attempt = 0; attempt < 40; attempt++) {
                const g1 = _isoBaseGraph(n);
                const g2 = _isoBaseGraph(n);
                const i1 = graphInvariants(g1);
                const i2 = graphInvariants(g2);
                if (i1.edgeCount === i2.edgeCount &&
                    i1.degSeq    === i2.degSeq    &&
                    i1.triangles !== i2.triangles) return { g1, g2 };
            }
            // Strategy C: just different triangle counts (any degree sequences)
            for (let attempt = 0; attempt < 40; attempt++) {
                const g1 = _isoBaseGraph(n);
                const g2 = _isoBaseGraph(n);
                if (countTriangles(g1) !== countTriangles(g2)) return { g1, g2 };
            }
            return null;
        }
    }
    return null;
}

// ---------------------------------------------------------------------------
// Public puzzle factory
// ---------------------------------------------------------------------------

/**
 * Return true when two undirected simple graphs have identical edge sets
 * (same n and same set of sorted label pairs).
 * @param {object} ga
 * @param {object} gb
 * @returns {boolean}
 */
function _graphsEqual(ga, gb) {
    if (ga.n !== gb.n || ga.edges.length !== gb.edges.length) return false;
    const key = e => {
        const s = vertexLabel(e.source, ga.names);
        const t = vertexLabel(e.target, ga.names);
        return [s, t].sort().join('--');
    };
    const setA = new Set(ga.edges.map(key));
    const setB = new Set(gb.edges.map(e => {
        const s = vertexLabel(e.source, gb.names);
        const t = vertexLabel(e.target, gb.names);
        return [s, t].sort().join('--');
    }));
    if (setA.size !== setB.size) return false;
    for (const k of setA) if (!setB.has(k)) return false;
    return true;
}

/**
 * Generate a random isomorphism puzzle consisting of two undirected simple graphs.
 *
 * Returns an object extended with:
 *   scenario   'equal' | 'isomorphic' | 'neither'
 *   witness    { [g1Label]: g2Label }   (only for 'isomorphic')
 *   reason     string                  (only for 'neither')
 *
 * @returns {{ g1: object, g2: object, scenario: string, witness?: object, reason?: string }}
 */
export function generateIsoPuzzle() {
    const [nMin, nMax] = ISO_PUZZLE_N_RANGE;
    const n    = Math.floor(Math.random() * (nMax - nMin + 1)) + nMin;
    const roll = Math.random();

    // ── Equal (⅓) ─────────────────────────────────────────────────────────────
    if (roll < 1 / 3) {
        const g = _isoBaseGraph(n);
        return { g1: g, g2: g, scenario: 'equal' };
    }

    // ── Isomorphic (⅓) ────────────────────────────────────────────────────────
    if (roll < 2 / 3) {
        // Outer loop: try different base graphs.
        // Inner loop: try many permutations of the same base graph before giving up.
        // This handles highly-symmetric graphs (K_n, cycles, etc.) where most or
        // all permutations are automorphisms.
        for (let baseAttempt = 0; baseAttempt < 10; baseAttempt++) {
            const g1    = _isoBaseGraph(n);
            const perms = Array.from({ length: n }, (_, i) => i);
            for (let permAttempt = 0; permAttempt < 20; permAttempt++) {
                const sigma = shuffle(perms.slice());
                if (sigma.every((v, i) => v === i)) continue;          // identity
                const g2 = applyPermutation(g1, sigma);
                if (_graphsEqual(g1, g2)) continue;                    // automorphism
                const witness = {};
                for (let i = 0; i < n; i++) witness[g1.names[i]] = g1.names[sigma[i]];
                return { g1, g2, scenario: 'isomorphic', witness };
            }
            // All permutations of this graph were automorphisms — try a new base graph.
        }
        // Every candidate base graph was fully symmetric.  Fall through to 'neither'
        // rather than quietly returning 'equal', so the scenario distribution stays fair.
    }

    // ── Neither (⅓) — pick one of 5 sub-reasons ──────────────────────────────
    const reasons = shuffle(['diff_vertices', 'diff_edges', 'diff_degree_seq',
                             'diff_components', 'diff_triangles']);
    for (const reason of reasons) {
        const result = _neitherByReason(reason, n, nMin, nMax);
        if (result) return { ...result, scenario: 'neither', reason };
    }

    // Ultimate fallback
    const g1 = _isoBaseGraph(n);
    const g2 = _isoBaseGraph(n + (n < nMax ? 1 : -1));
    return { g1, g2, scenario: 'neither', reason: 'diff_vertices' };
}


// =============================================================================
// Hamiltonian graph puzzle helpers
// =============================================================================
//
// TODO(refactor): this section was written before the 2026-03-10 refactor (see
// notes/WORK_SESSION_HANDOFF_2026-03-10.md). Its helpers still take (edges, n)
// instead of a graph object, and the puzzle generation and validation here are
// Hamiltonian-mode policy that the target architecture puts in
// hamiltonian-mode.js. Only the shared helpers (cut vertices, leaves,
// bipartite parts) belong in graph.js.

// ---------------------------------------------------------------------------
// Property detection helpers for Hamiltonian analysis
// ---------------------------------------------------------------------------

/**
 * Return indices of all cut vertices in an undirected graph.
 * A cut vertex is a vertex whose removal increases connected-component count.
 * @param {Edge[]} edges
 * @param {number} n
 * @returns {number[]}
 */
function _hamCutVertices(edges, n) {
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
 * @param {Edge[]} edges
 * @param {number} n
 * @returns {number[]}
 */
function _hamLeafVertices(edges, n) {
    const deg = getDegrees({ edges, n });
    return deg.reduce((acc, d, i) => { if (d === 1) acc.push(i); return acc; }, []);
}

/**
 * Test whether an undirected graph is bipartite using BFS 2-coloring.
 * Returns the two parts as arrays of vertex indices, or null if not bipartite.
 * @param {Edge[]} edges
 * @param {number} n
 * @returns {[number[], number[]]|null}
 */
function _hamBipartiteParts(edges, n) {
    const adj = buildAdjList({ edges, n });
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

// ---------------------------------------------------------------------------
// Simulation helpers (index-based)
// ---------------------------------------------------------------------------

/**
 * Simulate the Nearest Neighbor algorithm on an undirected weighted graph.
 * @param {Array<{s:number,t:number}>} indexEdges
 * @param {number[]} weights  parallel to indexEdges
 * @param {number} startIdx
 * @param {number} n
 * @returns {number[]|null}  tour of length n, or null if stuck
 */
function _simulateNN(indexEdges, weights, startIdx, n) {
    const visited = new Array(n).fill(false);
    let current = startIdx;
    visited[current] = true;
    const tour = [current];
    for (let step = 0; step < n - 1; step++) {
        let bestNeighbor = -1;
        let bestWeight = Infinity;
        for (let i = 0; i < indexEdges.length; i++) {
            const { s, t } = indexEdges[i];
            const w = weights[i];
            let neighbor = -1;
            if (s === current && !visited[t]) neighbor = t;
            else if (t === current && !visited[s]) neighbor = s;
            if (neighbor === -1) continue;
            if (w < bestWeight || (w === bestWeight && neighbor < bestNeighbor)) {
                bestWeight = w;
                bestNeighbor = neighbor;
            }
        }
        if (bestNeighbor === -1) return null;
        visited[bestNeighbor] = true;
        tour.push(bestNeighbor);
        current = bestNeighbor;
    }
    return tour;
}

/**
 * Simulate the Sorted Edge algorithm on an undirected weighted graph.
 * Returns selected {s,t} pairs forming the Hamiltonian cycle, or null if failed.
 * @param {Array<{s:number,t:number}>} indexEdges
 * @param {number[]} weights
 * @param {number} n
 * @returns {Array<{s:number,t:number}>|null}
 */
function _simulateSE(indexEdges, weights, n) {
    const sorted = indexEdges.map((e, i) => ({ s: e.s, t: e.t, w: weights[i], i }))
        .sort((a, b) => a.w - b.w || a.i - b.i);
    const degree = new Array(n).fill(0);
    // Union-Find for cycle detection
    const parent = Array.from({ length: n }, (_, i) => i);
    function find(x) { return parent[x] === x ? x : (parent[x] = find(parent[x])); }
    const selected = [];
    for (const { s, t } of sorted) {
        if (degree[s] >= 2 || degree[t] >= 2) continue;
        if (find(s) === find(t) && selected.length < n - 1) continue;
        selected.push({ s, t });
        degree[s]++;
        degree[t]++;
        const fs = find(s), ft = find(t);
        if (fs !== ft) parent[fs] = ft;
        if (selected.length === n) break;
    }
    if (selected.length < n) return null;
    return selected;
}

/**
 * Extract a Hamiltonian cycle as an ordered vertex array from a set of cycle edges.
 * @param {Array<{s:number,t:number}>} cycleEdges  exactly n edges forming one cycle
 * @param {number} n
 * @param {number} [startVertex=0]
 * @returns {number[]|null}  ordered vertices (length n), or null if not a cycle
 */
function _extractCycleOrder(cycleEdges, n, startVertex = 0) {
    const adj = Array.from({ length: n }, () => []);
    for (const { s, t } of cycleEdges) { adj[s].push(t); adj[t].push(s); }
    const visited = new Array(n).fill(false);
    const tour = [startVertex];
    visited[startVertex] = true;
    let current = startVertex;
    for (let step = 0; step < n - 1; step++) {
        const next = adj[current].find(v => !visited[v]);
        if (next === undefined) return null;
        visited[next] = true;
        tour.push(next);
        current = next;
    }
    // Verify closes back to start
    if (!adj[current].includes(startVertex)) return null;
    return tour;
}

// ---------------------------------------------------------------------------
// Non-Hamiltonian graph generators
// ---------------------------------------------------------------------------

/**
 * Generate a graph that has a cut vertex by joining two sub-graphs at one vertex.
 * @param {number} n  total vertices, must be ≥ 4
 * @returns {Array<{s:number,t:number}>}  index-pair edges
 */
function _hamMakeCutVertex(n) {
    // Split n vertices: G1 on [0..k], G2 on [k..n-1], shared vertex = k
    const k = Math.max(1, Math.min(n - 2, Math.floor(Math.random() * (n - 2)) + 1));
    const g1Size = k + 1;    // vertices 0..k
    const g2Size = n - k;    // vertices k..n-1
    const edges = [];
    for (const e of _simpleGraph(g1Size)) edges.push({ s: e.s, t: e.t });
    for (const e of _simpleGraph(g2Size)) edges.push({ s: e.s + k, t: e.t + k });
    return edges;
}

/**
 * Generate a graph with at least one leaf vertex.
 * @param {number} n  total vertices, must be ≥ 3
 * @returns {Array<{s:number,t:number}>}  index-pair edges
 */
function _hamMakeLeaf(n) {
    // Generate connected base on n-1 vertices, then attach a leaf at n-1
    const base = _simpleGraph(n - 1);
    const target = Math.floor(Math.random() * (n - 1));
    return [...base, { s: n - 1, t: target }];
}

/**
 * Generate a bipartite graph with unequal partition sizes (connected).
 * @param {number} n  total vertices, must be ≥ 3
 * @returns {Array<{s:number,t:number}>}  index-pair edges
 */
function _hamMakeBipartiteUnequal(n) {
    // Ensure unequal parts: p1 < p2
    const maxP1 = Math.floor((n - 1) / 2);
    const p1 = Math.max(1, Math.floor(Math.random() * maxP1) + 1);
    const p2 = n - p1;

    const part1 = shuffle(Array.from({ length: p1 }, (_, i) => i));
    const part2 = shuffle(Array.from({ length: p2 }, (_, i) => p1 + i));

    const edges = [];
    const edgeSet = new Set();
    const addEdge = (u, v) => {
        const key = `${Math.min(u, v)}-${Math.max(u, v)}`;
        if (!edgeSet.has(key)) { edgeSet.add(key); edges.push({ s: u, t: v }); }
    };

    // Spanning tree: connect each part1 vertex to a random part2 vertex and vice versa
    addEdge(part1[0], part2[0]);
    for (let i = 1; i < p1; i++) addEdge(part1[i], part2[Math.floor(Math.random() * p2)]);
    for (let i = 1; i < p2; i++) addEdge(part2[i], part1[Math.floor(Math.random() * p1)]);

    // Add extra bipartite edges for density
    const target = Math.min(p1 * p2, Math.floor(n * 1.4) + 1);
    const candidates = [];
    for (const u of part1) for (const v of part2) {
        const key = `${Math.min(u, v)}-${Math.max(u, v)}`;
        if (!edgeSet.has(key)) candidates.push({ s: u, t: v });
    }
    shuffle(candidates);
    for (const { s, t } of candidates) {
        if (edges.length >= target) break;
        addEdge(s, t);
    }
    return edges;
}

// ---------------------------------------------------------------------------
// Hamiltonian graph generators
// ---------------------------------------------------------------------------

const _HAM_EDGE_CAP_LO = 0.4;   // fraction of max edges (lower bound for target)
const _HAM_EDGE_CAP_HI = 0.75;  // fraction of max edges (upper bound for target)

/**
 * Generate a Hamiltonian graph solvable by the Nearest Neighbor strategy.
 * Returns extended graph object with hamiltonianCycle and startVertex.
 * @param {number} n
 * @returns {object|null}
 */
function _makeHamiltonianNN(n) {
    const maxEdges = (n * (n - 1)) / 2;
    const edgeCap = Math.floor(_HAM_EDGE_CAP_LO * maxEdges) +
        Math.floor(Math.random() * (_HAM_EDGE_CAP_HI - _HAM_EDGE_CAP_LO) * maxEdges) + 1;

    for (let attempt = 0; attempt < 30; attempt++) {
        const perm = shuffle(Array.from({ length: n }, (_, i) => i));
        const startIdx = perm[0];
        const targetTour = perm;

        // Cycle edges in NN visitation order, closing edge last
        const cycleEdges = perm.map((v, i) => ({ s: v, t: perm[(i + 1) % n] }));
        // Initial ordering: NN steps in order 0..n-2, then closing edge
        let ordering = cycleEdges.slice();

        // Collect all possible non-cycle edges
        const edgeSet = new Set(cycleEdges.map(({ s, t }) => `${Math.min(s, t)}-${Math.max(s, t)}`));
        const candidates = [];
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
            if (!edgeSet.has(`${i}-${j}`)) candidates.push({ s: i, t: j });
        }
        shuffle(candidates);

        for (const cand of candidates) {
            if (ordering.length >= edgeCap) break;
            const validPos = [];
            for (let pos = 0; pos <= ordering.length; pos++) {
                const testOrd = [...ordering.slice(0, pos), cand, ...ordering.slice(pos)];
                const wts = testOrd.map((_, k) => k + 1);
                const tour = _simulateNN(testOrd, wts, startIdx, n);
                if (tour && tour.every((v, k) => v === targetTour[k])) validPos.push(pos);
            }
            if (validPos.length > 0) {
                const pos = validPos[Math.floor(Math.random() * validPos.length)];
                ordering.splice(pos, 0, cand);
                edgeSet.add(`${Math.min(cand.s, cand.t)}-${Math.max(cand.s, cand.t)}`);
            }
        }

        // Final verification
        const weights = ordering.map((_, k) => k + 1);
        const tour = _simulateNN(ordering, weights, startIdx, n);
        if (!tour || !tour.every((v, k) => v === targetTour[k])) continue;

        // Build graph with weighted edges
        const names = makeLabels(n);
        const edges = ordering.map((e, k) => ({
            source: vertexId(e.s),
            target: vertexId(e.t),
            label: String(k + 1),
        }));
        return {
            n, names, directed: false, edgeLabel: 'weight', edges,
            hamiltonianCycle: perm,
            startVertex: startIdx,
            strategy: 'nearest_neighbor',
        };
    }
    return null;
}

/**
 * Generate a Hamiltonian graph solvable by the Sorted Edge strategy.
 * Returns extended graph object with hamiltonianCycle and sortedEdgeResult.
 * @param {number} n
 * @returns {object|null}
 */
function _makeHamiltonianSE(n) {
    const maxEdges = (n * (n - 1)) / 2;
    const edgeCap = Math.floor(_HAM_EDGE_CAP_LO * maxEdges) +
        Math.floor(Math.random() * (_HAM_EDGE_CAP_HI - _HAM_EDGE_CAP_LO) * maxEdges) + 1;

    for (let attempt = 0; attempt < 30; attempt++) {
        const perm = shuffle(Array.from({ length: n }, (_, i) => i));
        const cycleEdgesSet = new Set(perm.map((v, i) => {
            const a = v, b = perm[(i + 1) % n];
            return `${Math.min(a, b)}-${Math.max(a, b)}`;
        }));
        const cycleEdges = perm.map((v, i) => ({ s: v, t: perm[(i + 1) % n] }));

        // Initial ordering of cycle edges: random (Sorted Edge doesn't depend on initial ordering)
        let ordering = shuffle(cycleEdges.slice());

        // Verify SE produces the target cycle with just the cycle edges
        const initWeights = ordering.map((_, k) => k + 1);
        const initResult = _simulateSE(ordering, initWeights, n);
        if (!initResult || initResult.length !== n) continue;
        const initKeys = new Set(initResult.map(e => `${Math.min(e.s, e.t)}-${Math.max(e.s, e.t)}`));
        if (initKeys.size !== cycleEdgesSet.size || ![...cycleEdgesSet].every(k => initKeys.has(k))) continue;

        // Add extra edges
        const edgeSet = new Set(cycleEdges.map(({ s, t }) => `${Math.min(s, t)}-${Math.max(s, t)}`));
        const candidates = [];
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
            if (!edgeSet.has(`${i}-${j}`)) candidates.push({ s: i, t: j });
        }
        shuffle(candidates);

        for (const cand of candidates) {
            if (ordering.length >= edgeCap) break;
            const validPos = [];
            for (let pos = 0; pos <= ordering.length; pos++) {
                const testOrd = [...ordering.slice(0, pos), cand, ...ordering.slice(pos)];
                const wts = testOrd.map((_, k) => k + 1);
                const result = _simulateSE(testOrd, wts, n);
                if (!result || result.length !== n) continue;
                const keys = new Set(result.map(e => `${Math.min(e.s, e.t)}-${Math.max(e.s, e.t)}`));
                if (keys.size === cycleEdgesSet.size && [...cycleEdgesSet].every(k => keys.has(k))) validPos.push(pos);
            }
            if (validPos.length > 0) {
                const pos = validPos[Math.floor(Math.random() * validPos.length)];
                ordering.splice(pos, 0, cand);
                edgeSet.add(`${Math.min(cand.s, cand.t)}-${Math.max(cand.s, cand.t)}`);
            }
        }

        // Final verification
        const weights = ordering.map((_, k) => k + 1);
        const seResult = _simulateSE(ordering, weights, n);
        if (!seResult || seResult.length !== n) continue;
        const finalKeys = new Set(seResult.map(e => `${Math.min(e.s, e.t)}-${Math.max(e.s, e.t)}`));
        if (![...cycleEdgesSet].every(k => finalKeys.has(k))) continue;

        const names = makeLabels(n);
        const edges = ordering.map((e, k) => ({
            source: vertexId(e.s),
            target: vertexId(e.t),
            label: String(k + 1),
        }));

        // Compute default cycle order for SE (from startVertex 0)
        const startPerm = _extractCycleOrder(seResult, n, 0) || perm;
        return {
            n, names, directed: false, edgeLabel: 'weight', edges,
            hamiltonianCycle: startPerm,
            sortedEdgeCycleKeys: cycleEdgesSet,
            strategy: 'sorted_edge',
        };
    }
    return null;
}

/**
 * Generate a Hamiltonian graph for freeform strategy (no weights needed).
 * @param {number} n
 * @returns {object}
 */
function _makeHamiltonianFreeform(n) {
    // Reuse sorted edge logic but strip weights
    const g = _makeHamiltonianSE(n);
    if (g) {
        const edges = g.edges.map(e => ({ ...e, label: null }));
        return {
            n: g.n, names: g.names, directed: false, edgeLabel: null, edges,
            hamiltonianCycle: g.hamiltonianCycle,
            strategy: 'freeform',
        };
    }
    // Fallback: start with cycle and add random edges
    const perm = shuffle(Array.from({ length: n }, (_, i) => i));
    const edgeSet = new Set();
    const indexEdges = [];
    for (let i = 0; i < n; i++) {
        const s = perm[i], t = perm[(i + 1) % n];
        edgeSet.add(`${Math.min(s, t)}-${Math.max(s, t)}`);
        indexEdges.push({ s, t });
    }
    const extra = Math.floor(n * 0.4);
    let guard = 0;
    while (indexEdges.length < n + extra && guard < 200) {
        guard++;
        const i = Math.floor(Math.random() * n);
        const j = Math.floor(Math.random() * n);
        if (i === j) continue;
        const key = `${Math.min(i, j)}-${Math.max(i, j)}`;
        if (!edgeSet.has(key)) { edgeSet.add(key); indexEdges.push({ s: i, t: j }); }
    }
    return {
        n,
        names: makeLabels(n),
        directed: false,
        edgeLabel: null,
        edges: _toEdges(indexEdges),
        hamiltonianCycle: perm,
        strategy: 'freeform',
    };
}

// ---------------------------------------------------------------------------
// Main Hamiltonian puzzle generator
// ---------------------------------------------------------------------------

/**
 * Generate a random Hamiltonian graph puzzle.
 *
 * Returns a puzzle object with properties:
 *   n, names, directed, edgeLabel, edges  — the graph
 *   isHamiltonian {boolean}
 *   strategy {'freeform'|'nearest_neighbor'|'sorted_edge'|null}
 *   hamiltonianCycle {number[]}   vertex index order (for Hamiltonian graphs)
 *   startVertex {number|null}     for nearest_neighbor strategy
 *   sortedEdgeCycleKeys {Set<string>|null}  edge key set for sorted_edge validation
 *   nonHamiltonianReasons {string[]}  subset of ['leaf','cut_vertex','bipartite_unequal']
 *   showWeights {boolean}
 *
 * @returns {object}
 */
export function generateHamiltonianPuzzle() {
    const n = Math.floor(Math.random() * 5) + 4;  // 4–8 vertices
    const isHamiltonian = Math.random() > 0.25;

    if (!isHamiltonian) {
        const nonHamType = Math.floor(Math.random() * 3); // 0=cut_vertex, 1=leaf, 2=bipartite
        let indexEdges;
        if (nonHamType === 0) {
            indexEdges = _hamMakeCutVertex(n);
        } else if (nonHamType === 1) {
            indexEdges = _hamMakeLeaf(n);
        } else {
            indexEdges = _hamMakeBipartiteUnequal(n);
        }

        const names = makeLabels(n);
        const edges = _toEdges(indexEdges);

        // Compute valid reasons for this specific graph
        const leaves = _hamLeafVertices(edges, n);
        const cutVerts = _hamCutVertices(edges, n);
        const bipParts = _hamBipartiteParts(edges, n);

        const reasons = [];
        if (leaves.length > 0) reasons.push('leaf');
        if (cutVerts.length > 0) reasons.push('cut_vertex');
        if (bipParts && bipParts[0].length !== bipParts[1].length) reasons.push('bipartite_unequal');

        // If no reason detected (should be rare), force one
        if (reasons.length === 0) reasons.push('cut_vertex');

        return {
            n, names, directed: false, edgeLabel: null, edges,
            isHamiltonian: false,
            strategy: null,
            hamiltonianCycle: null,
            startVertex: null,
            sortedEdgeCycleKeys: null,
            nonHamiltonianReasons: reasons,
            showWeights: false,
        };
    }

    // Hamiltonian case: pick strategy
    const strategies = ['freeform', 'nearest_neighbor', 'sorted_edge'];
    let strategy = strategies[Math.floor(Math.random() * 3)];

    let g = null;
    if (strategy === 'nearest_neighbor') {
        for (let t = 0; t < 5 && !g; t++) g = _makeHamiltonianNN(n);
        if (!g) strategy = 'freeform';  // fallback: downgrade strategy
    } else if (strategy === 'sorted_edge') {
        for (let t = 0; t < 5 && !g; t++) g = _makeHamiltonianSE(n);
        if (!g) strategy = 'freeform';  // fallback: downgrade strategy
    }
    if (!g) g = _makeHamiltonianFreeform(n);

    return {
        ...g,
        isHamiltonian: true,
        strategy,
        nonHamiltonianReasons: [],
        // ?? not ||: start vertex 0 (A) is valid. The old site lost it ("Start at vertex undefined").
        startVertex: g.startVertex ?? null,
        sortedEdgeCycleKeys: g.sortedEdgeCycleKeys || null,
        showWeights: strategy === 'nearest_neighbor' || strategy === 'sorted_edge',
    };
}

// ---------------------------------------------------------------------------
// Hamiltonian cycle validation
// ---------------------------------------------------------------------------

/**
 * Parse a Hamiltonian cycle input string into an array of vertex display-names.
 * Accepts "ABCDA", "A,B,C,D,A", "A B C D A", etc.
 * Strips trailing repeat of starting vertex for uniform processing.
 * Returns array of unique labels (length n), or null if unparseable.
 * @param {string} input
 * @param {string[]} names  valid vertex display-names
 * @returns {string[]|null}
 */
function _parseHamCycleInput(input, names) {
    if (!input || !input.trim()) return null;
    const upper = input.trim().toUpperCase(); // Normalize
    // Try multi-char names first (comma/space separated)
    let tokens;
    if (upper.includes(',')) {
        tokens = upper.split(',').map(s => s.trim()).filter(Boolean);
    } else if (upper.includes(' ')) {
        tokens = upper.split(/\s+/).map(s => s.trim()).filter(Boolean);
    } else {
        // Single-char names: each character is a vertex
        tokens = upper.split('');
    }
    // Strip trailing repeat
    if (tokens.length > 1 && tokens[0] === tokens[tokens.length - 1]) {
        tokens = tokens.slice(0, -1);
    }
    if (tokens.length === 0) return null;
    // Validate all tokens are known vertex names
    for (const tok of tokens) {
        if (!names.includes(tok)) return null;
    }
    return tokens;
}

/**
 * Validate a freeform Hamiltonian cycle input against a graph.
 * Returns { valid, reason, detail } where reason is a user-facing error string.
 * @param {string} input
 * @param {object} graph  {n, names, edges}
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateHamiltonianCycleFreeform(input, graph) {
    const { n, names, edges } = graph;
    const tokens = _parseHamCycleInput(input, names);
    if (!tokens) return { valid: false, reason: 'not_a_valid_path' };

    // Must visit exactly n vertices
    if (tokens.length !== n) {
        if (tokens.length < n) {
            // Find first missing vertex
            const missing = names.find(nm => !tokens.includes(nm));
            return { valid: false, reason: 'missing_vertex', detail: missing };
        }
        // Find first vertex visited more than once
        const seen = new Set();
        for (const tok of tokens) {
            if (seen.has(tok)) return { valid: false, reason: 'repeated_vertex', detail: tok };
            seen.add(tok);
        }
        return { valid: false, reason: 'not_a_valid_path' };
    }

    // Check all vertices visited
    const seen = new Set(tokens);
    if (seen.size !== n) {
        const dup = tokens.find((t, i) => tokens.indexOf(t) !== i);
        return { valid: false, reason: 'repeated_vertex', detail: dup };
    }
    for (const nm of names) {
        if (!seen.has(nm)) return { valid: false, reason: 'missing_vertex', detail: nm };
    }

    // Build adjacency for quick lookup
    const adjSet = new Set(edges.map(e => {
        const a = vertexLabel(e.source, names), b = vertexLabel(e.target, names);
        return `${[a, b].sort().join('--')}`;
    }));
    const hasEdge = (u, v) => adjSet.has(`${[u, v].sort().join('--')}`);

    // Check each consecutive pair + closing edge
    const cycle = [...tokens, tokens[0]];
    for (let i = 0; i < n; i++) {
        if (!hasEdge(cycle[i], cycle[i + 1])) {
            return { valid: false, reason: 'no_edge', detail: `${cycle[i]}–${cycle[i + 1]}` };
        }
    }

    return { valid: true };
}

/**
 * Validate a Nearest Neighbor Hamiltonian cycle input.
 * @param {string} input
 * @param {object} puzzle  {n, names, edges, hamiltonianCycle, startVertex}
 * @returns {{ valid: boolean, reason?: string, detail?: string }}
 */
export function validateHamiltonianCycleNN(input, puzzle) {
    const { n, names, edges, hamiltonianCycle, startVertex } = puzzle;
    const tokens = _parseHamCycleInput(input, names);
    if (!tokens) return { valid: false, reason: 'not_a_valid_path' };

    const startName = names[startVertex];
    if (tokens[0] !== startName) {
        return { valid: false, reason: 'wrong_start', detail: startName };
    }

    if (tokens.length !== n) {
        if (tokens.length < n) {
            return { valid: false, reason: 'incomplete_cycle' };
        }
        const dup = tokens.find((t, i) => tokens.indexOf(t) !== i);
        if (dup) return { valid: false, reason: 'repeated_vertex', detail: dup };
        return { valid: false, reason: 'not_a_valid_path' };
    }

    // Check all vertices present
    const seen = new Set(tokens);
    if (seen.size !== n) {
        const dup = tokens.find((t, i) => tokens.indexOf(t) !== i);
        return { valid: false, reason: 'repeated_vertex', detail: dup };
    }

    // Build edge weight lookup
    const edgeWeightMap = new Map();
    for (const e of edges) {
        const a = vertexLabel(e.source, names), b = vertexLabel(e.target, names);
        const key = `${[a, b].sort().join('--')}`;
        const w = parseFloat(e.label);
        if (!isNaN(w)) edgeWeightMap.set(key, w);
    }
    const getWeight = (u, v) => edgeWeightMap.get(`${[u, v].sort().join('--')}`) ?? Infinity;

    // Build adjacency list
    const adjMap = new Map(names.map(nm => [nm, []]));
    for (const e of edges) {
        const a = vertexLabel(e.source, names), b = vertexLabel(e.target, names);
        adjMap.get(a).push(b);
        adjMap.get(b).push(a);
    }

    // NN simulation
    const visitedSet = new Set([tokens[0]]);
    for (let step = 0; step < n - 1; step++) {
        const cur = tokens[step];
        const next = tokens[step + 1];
        const curW = getWeight(cur, next);

        // Check edge exists first
        if (curW === Infinity) {
            return { valid: false, reason: 'no_edge', detail: `${cur}–${next}` };
        }

        // Find actual nearest unvisited neighbor and verify user chose correctly
        let bestNb = null, bestW = Infinity;
        for (const nb of (adjMap.get(cur) || [])) {
            if (visitedSet.has(nb)) continue;
            const w = getWeight(cur, nb);
            if (w < bestW) { bestW = w; bestNb = nb; }
        }
        if (bestNb !== null && bestNb !== next) {
            return { valid: false, reason: 'wrong_nn_step', detail: `at step ${step + 1}, the nearest neighbor is ${bestNb} but you went to ${next}` };
        }
        visitedSet.add(next);
    }

    // Check closing edge exists
    const last = tokens[n - 1];
    const adjSet = new Set(edges.map(e => {
        const a = vertexLabel(e.source, names), b = vertexLabel(e.target, names);
        return `${[a, b].sort().join('--')}`;
    }));
    if (!adjSet.has(`${[last, tokens[0]].sort().join('--')}`)) {
        return { valid: false, reason: 'cant_close_cycle' };
    }

    return { valid: true };
}

/**
 * Validate a Sorted Edge Hamiltonian cycle input.
 * @param {string} input
 * @param {object} puzzle  {n, names, edges, sortedEdgeCycleKeys}
 * @returns {{ valid: boolean, reason?: string, detail?: string }}
 */
export function validateHamiltonianCycleSE(input, puzzle) {
    const { n, names, edges, sortedEdgeCycleKeys } = puzzle;
    const tokens = _parseHamCycleInput(input, names);
    if (!tokens) return { valid: false, reason: 'not_a_valid_path' };

    if (tokens.length !== n) {
        if (tokens.length < n) {
            const missing = names.find(nm => !tokens.includes(nm));
            return { valid: false, reason: 'missing_vertex', detail: missing };
        }
        return { valid: false, reason: 'not_a_valid_path' };
    }

    // Check no repeated vertices
    const seen = new Set(tokens);
    if (seen.size !== n) {
        const dup = tokens.find((t, i) => tokens.indexOf(t) !== i);
        return { valid: false, reason: 'repeated_vertex', detail: dup };
    }

    // Build adjacency set for validity check
    const adjSet = new Set(edges.map(e => {
        const a = vertexLabel(e.source, names), b = vertexLabel(e.target, names);
        return `${[a, b].sort().join('--')}`;
    }));
    const hasEdge = (u, v) => adjSet.has(`${[u, v].sort().join('--')}`);
    const nameToIdx = new Map(names.map((nm, i) => [nm, i]));

    // Extract the edges the user chose and compare to sortedEdgeCycleKeys
    const userEdgeKeys = new Set();
    for (let i = 0; i < n; i++) {
        const u = tokens[i], v = tokens[(i + 1) % n];
        if (!hasEdge(u, v)) return { valid: false, reason: 'no_edge', detail: `${u}–${v}` };
        const ui = nameToIdx.get(u), vi = nameToIdx.get(v);
        userEdgeKeys.add(`${Math.min(ui, vi)}-${Math.max(ui, vi)}`);
    }

    if (!sortedEdgeCycleKeys) return { valid: true }; // no reference, accept any valid cycle

    // Check edge sets match
    const missing = [...sortedEdgeCycleKeys].find(k => !userEdgeKeys.has(k));
    const extra = [...userEdgeKeys].find(k => !sortedEdgeCycleKeys.has(k));
    if (missing) {
        // Convert key to display names
        const [si, ti] = missing.split('-').map(Number);
        return { valid: false, reason: 'wrong_edge_missing', detail: `${names[si]}–${names[ti]}` };
    }
    if (extra) {
        const [si, ti] = extra.split('-').map(Number);
        return { valid: false, reason: 'wrong_edge_extra', detail: `${names[si]}–${names[ti]}` };
    }

    return { valid: true };
}
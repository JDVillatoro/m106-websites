// =============================================================================
// graph/core.js  –  Graph object, vertices, degrees, connectivity
// =============================================================================
//
// lib/graph/ is graph math that any mode can use, one file per subject; it
// was split from lib/graph.js (see its git history), which was copied from
// legacy/graph-theory/graph.js. No DOM code here, so the functions can be
// tested in Node (test/graph-theory/graph/).
//
// Puzzle design (what kinds of graphs a mode asks about, difficulty tuning,
// wording) belongs in the mode's file. Modes import from the file they need;
// there's no index.js re-exporting everything.
//
// Names starting with "_" are helpers for the other lib/graph/ files only:
// some are exported for them, but modes don't import them.
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
export function _buildAdjList(graph) {
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


// ---------------------------------------------------------------------------
// Cut vertices, leaves, bipartite parts (used by the Hamiltonian mode)
// ---------------------------------------------------------------------------

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

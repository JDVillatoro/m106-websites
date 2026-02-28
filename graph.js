// =============================================================================
// graph.js  –  Graph data model, generators, and algorithms
// =============================================================================
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
function vertexId(i) {
    return `v${i}`;
}

/**
 * Parse the index from a "vN" id string.
 * @param {string} id
 * @returns {number}
 */
function vertexIndex(id) {
    return parseInt(id.slice(1), 10);
}

/**
 * Resolve a vertex id to its display label given a names array.
 * Falls back to the id itself when names is absent or the slot is empty.
 * @param {string} id        - "vN" internal id
 * @param {string[]} names
 * @returns {string}
 */
function vertexLabel(id, names) {
    const i = vertexIndex(id);
    return (names && names[i] && String(names[i]).trim()) ? String(names[i]).trim() : id;
}

/**
 * Generate default vertex labels: A–H for n ≤ 8, else 1, 2, 3, …
 * @param {number} n
 * @returns {string[]}
 */
function makeLabels(n) {
    if (n <= 8) return Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
    return Array.from({ length: n }, (_, i) => String(i + 1));
}

/**
 * Build an array of all vertex ids for a graph of size n.
 * @param {number} n
 * @returns {string[]}
 */
function vertexIds(n) {
    return Array.from({ length: n }, (_, i) => vertexId(i));
}


// ---------------------------------------------------------------------------
// Fisher-Yates shuffle (in-place, returns the array)
// ---------------------------------------------------------------------------

function shuffle(arr) {
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
 * @param {Edge[]} edges
 * @param {number} n
 * @returns {number[]}  degree[i] = degree of vi
 */
function getDegrees(edges, n) {
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
 * @param {Edge[]} edges
 * @param {number} n
 * @returns {number[]}
 */
function getOddVertices(edges, n) {
    return getDegrees(edges, n)
        .reduce((acc, d, i) => { if (d % 2 !== 0) acc.push(i); return acc; }, []);
}

/**
 * Return the degree sequence (sorted non-decreasing) for a graph of n vertices.
 * @param {Edge[]} edges
 * @param {number} n
 * @returns {number[]}
 */
function degreeSequence(edges, n) {
    return getDegrees(edges, n).sort((a, b) => a - b);
}

/**
 * Compute in-degree and out-degree for every vertex in a directed graph.
 * @param {Edge[]} edges
 * @param {number} n
 * @returns {{ inDeg: number[], outDeg: number[] }}
 */
function getDirectedDegrees(edges, n) {
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
 * @param {Edge[]} edges
 * @param {number} n
 * @returns {Set<number>[]}
 */
function buildAdjList(edges, n) {
    const adj = Array.from({ length: n }, () => new Set());
    for (const { source, target } of edges) {
        const s = vertexIndex(source);
        const t = vertexIndex(target);
        if (s !== t) { adj[s].add(t); adj[t].add(s); }
    }
    return adj;
}

/**
 * BFS from vertex 0; returns number of vertices reachable (including 0).
 * @param {Set<number>[]} adj
 * @param {number} n
 * @returns {number}
 */
function reachableCount(adj, n) {
    if (n === 0) return 0;
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

/**
 * Test undirected connectivity for a graph of n vertices.
 * @param {Edge[]} edges
 * @param {number} n
 * @returns {boolean}
 */
function isConnected(edges, n) {
    if (n <= 1) return true;
    return reachableCount(buildAdjList(edges, n), n) === n;
}

/**
 * Test strong connectivity for a directed graph of n vertices.
 * Uses two BFS passes (forward and reversed adjacency).
 * @param {Edge[]} edges
 * @param {number} n
 * @returns {boolean}
 */
function isStronglyConnected(edges, n) {
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
 * @param {Edge[]} edges
 * @param {boolean} directed
 * @returns {boolean}
 */
function isMultiGraph(edges, directed) {
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
function graphToDescription(graph) {
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
function graphToCSV(graph) {
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
function generateSimpleGraph(n, targetEdges) {
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
function generateConnectedMultigraph(n, targetEdges, options = {}) {
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
function generateEulerianSimpleGraph(n, targetEdges, maxRerolls = 30) {
    for (let roll = 0; roll < maxRerolls; roll++) {
        const indexEdges = _simpleGraph(n, targetEdges);
        const edgeSet    = new Set(indexEdges.map(({ s, t }) => `${Math.min(s,t)}-${Math.max(s,t)}`));
        const odds       = shuffle(getOddVertices(_toEdges(indexEdges), n));

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
function generateEulerianMultigraph(n, targetEdges) {
    const base = generateConnectedMultigraph(n, targetEdges, { allowLoops: false, allowMultiple: true });
    const indexEdges = base.edges.map(e => ({ s: vertexIndex(e.source), t: vertexIndex(e.target) }));
    const edgeSet    = new Set(indexEdges.map(({ s, t }) => `${Math.min(s,t)}-${Math.max(s,t)}`));
    const odds       = shuffle(getOddVertices(base.edges, n));

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
function generateMSCDigraph(n) {
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
            if (isStronglyConnected(trial, n)) { edges.splice(idx, 1); removed = true; }
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
    const { inDeg, outDeg } = getDirectedDegrees(edges, n);

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
function generateEulerianDigraph(n, targetEdges) {
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
function generateRandomGraph(n, numComponents = 1) {
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


// ---------------------------------------------------------------------------
// Eulerian trail puzzle generators
// ---------------------------------------------------------------------------

/** @returns {object} graph */
function _makeEulerianDigraph(n)    { return generateEulerianDigraph(n); }

/** @returns {object} graph */
function _makeNonEulerianDigraph(n) {
    for (let attempt = 0; attempt < 20; attempt++) {
        const g  = generateEulerianDigraph(n);
        const candidates = shuffle(g.edges.slice());
        for (const cand of candidates) {
            const trial = g.edges.filter(e => e !== cand);
            if (isStronglyConnected(trial, n)) {
                return { ...g, edges: trial };
            }
        }
    }
    return _makeEulerianDigraph(n);
}

/** @returns {object} graph */
function _makeEulerianSimple(n)    { return generateEulerianSimpleGraph(n); }

/** @returns {object} graph */
function _makeNonEulerianSimple(n) {
    for (let attempt = 0; attempt < 20; attempt++) {
        const g   = generateEulerianSimpleGraph(n);
        let edges = g.edges.slice();
        const numDelete = Math.random() < 0.5 ? 1 : 2;
        let deleted = 0;
        for (const cand of shuffle(edges.slice())) {
            if (deleted >= numDelete) break;
            const trial = edges.filter(e => e !== cand);
            if (isConnected(trial, n) && getOddVertices(trial, n).length > 0) {
                edges = trial;
                deleted++;
            }
        }
        if (deleted > 0) return { ...g, edges };
    }
    return _makeEulerianSimple(n);
}

/** @returns {object} graph */
function _makeEulerianMulti(n)    { return generateEulerianMultigraph(n); }

/** @returns {object} graph */
function _makeNonEulerianMulti(n) {
    for (let attempt = 0; attempt < 20; attempt++) {
        const g   = generateEulerianMultigraph(n);
        let edges = g.edges.slice();
        const numDelete = Math.random() < 0.5 ? 1 : 2;
        let deleted = 0;
        for (const cand of shuffle(edges.slice())) {
            if (deleted >= numDelete) break;
            const trial = edges.filter(e => e !== cand);
            if (isConnected(trial, n) && getOddVertices(trial, n).length > 0) {
                edges = trial;
                deleted++;
            }
        }
        if (deleted > 0) return { ...g, edges };
    }
    return _makeEulerianMulti(n);
}

/**
 * Generate a random Eulerian trail puzzle.
 *
 * Returns a graph object extended with:
 *   isEulerian  {boolean}  — ground-truth answer
 *   isMulti     {boolean}  — true when edge labels are edge-names (for path input format)
 *
 * @returns {object}
 */
function generateEulerianTrailPuzzle() {
    const n        = Math.floor(Math.random() * 3) + 4;   // 4–6 vertices
    const scenario = Math.floor(Math.random() * 6);

    const makers = [
        _makeEulerianDigraph,
        _makeNonEulerianDigraph,
        _makeEulerianSimple,
        _makeNonEulerianSimple,
        _makeEulerianMulti,
        _makeNonEulerianMulti,
    ];
    const graph   = makers[scenario](n);
    const isMulti = graph.edgeLabel === 'name';

    // Determine ground truth
    let isEulerian;
    if (graph.directed) {
        const { inDeg, outDeg } = getDirectedDegrees(graph.edges, n);
        const balanced = inDeg.every((d, i) => d === outDeg[i]);
        isEulerian = balanced && isStronglyConnected(graph.edges, n);
    } else {
        isEulerian = isConnected(graph.edges, n) && getOddVertices(graph.edges, n).length <= 2;
    }

    return { ...graph, isEulerian, isMulti };
}


// ---------------------------------------------------------------------------
// Eulerian trail validation
// ---------------------------------------------------------------------------

/**
 * Check whether a sequence of vertex display-names forms a valid Eulerian
 * path/circuit in a simple undirected graph.
 * @param {string[]} path            - display names e.g. ["A","B","C","A"]
 * @param {object}   graph
 * @param {boolean}  requireCircuit
 * @returns {boolean}
 */
function validateEulerianPathSimple(path, graph, requireCircuit) {
    if (path.length < 2) return false;
    if (requireCircuit && path[0] !== path[path.length - 1]) return false;

    const pool = graph.edges.map(e => ({
        a: vertexLabel(e.source, graph.names),
        b: vertexLabel(e.target, graph.names),
        used: false,
    }));

    for (let step = 0; step < path.length - 1; step++) {
        const u = path[step], v = path[step + 1];
        const ei = pool.findIndex(e => !e.used && ((e.a === u && e.b === v) || (e.a === v && e.b === u)));
        if (ei === -1) return false;
        pool[ei].used = true;
    }
    return pool.every(e => e.used);
}

/**
 * Check whether an alternating vertex/edge-label string is a valid Eulerian
 * path in a multigraph, e.g. "AaBbCcA".
 * @param {string}  input
 * @param {object}  graph
 * @param {boolean} requireCircuit
 * @returns {boolean}
 */
function validateEulerianPathMulti(input, graph, requireCircuit) {
    const tokens = input.match(/[A-Z]|[a-z]/g);
    if (!tokens || tokens.length < 3) return false;
    for (let i = 0; i < tokens.length; i++) {
        if (i % 2 === 0 && !/[A-Z]/.test(tokens[i])) return false;
        if (i % 2 === 1 && !/[a-z]/.test(tokens[i])) return false;
    }
    if (tokens.length % 2 === 0) return false;
    if (requireCircuit && tokens[0] !== tokens[tokens.length - 1]) return false;

    const edgeUsed = new Array(graph.edges.length).fill(false);

    for (let i = 0; i < tokens.length - 2; i += 2) {
        const u = tokens[i], edgeLbl = tokens[i + 1], v = tokens[i + 2];
        const ei = graph.edges.findIndex((e, idx) =>
            !edgeUsed[idx] &&
            e.label === edgeLbl &&
            ((vertexLabel(e.source, graph.names) === u && vertexLabel(e.target, graph.names) === v) ||
             (vertexLabel(e.source, graph.names) === v && vertexLabel(e.target, graph.names) === u))
        );
        if (ei === -1) return false;
        edgeUsed[ei] = true;
    }
    return edgeUsed.every(Boolean);
}

/**
 * Check whether a sequence of vertex display-names is a valid Eulerian circuit
 * in a directed graph.
 * @param {string[]} path
 * @param {object}   graph
 * @returns {boolean}
 */
function validateEulerianCircuitDigraph(path, graph) {
    if (path.length < 2) return false;
    if (path[0] !== path[path.length - 1]) return false;

    const pool = graph.edges.map(e => ({
        a: vertexLabel(e.source, graph.names),
        b: vertexLabel(e.target, graph.names),
        used: false,
    }));

    for (let step = 0; step < path.length - 1; step++) {
        const u = path[step], v = path[step + 1];
        const ei = pool.findIndex(e => !e.used && e.a === u && e.b === v);
        if (ei === -1) return false;
        pool[ei].used = true;
    }
    return pool.every(e => e.used);
}

/**
 * Check whether adding a set of edges to a graph makes it Eulerian.
 * Added edges are specified by display names and must duplicate existing edges
 * (no introducing new vertex relationships).
 *
 * @param {object}  graph      - the original graph
 * @param {Array<{from: string, to: string}>} addedEdges  - display-name pairs
 * @returns {boolean}
 */
function validateEulerization(graph, addedEdges) {
    const { n, names, directed, edges: origEdges } = graph;

    if (directed) {
        const origSet = new Set(origEdges.map(e => {
            const a = vertexLabel(e.source, names), b = vertexLabel(e.target, names);
            return a !== b ? `${a}->${b}` : null;
        }).filter(Boolean));

        const combined = origEdges
            .map(e => ({ s: vertexLabel(e.source, names), t: vertexLabel(e.target, names) }))
            .filter(e => e.s !== e.t);

        for (const ae of addedEdges) {
            if (!ae.from || !ae.to) continue;
            const from = ae.from.trim().toUpperCase();
            const to   = ae.to.trim().toUpperCase();
            if (!names.includes(from) || !names.includes(to)) return false;
            if (from === to) continue;
            if (!origSet.has(`${from}->${to}`)) return false;
            combined.push({ s: from, t: to });
        }

        const inDeg  = Object.fromEntries(names.map(nm => [nm, 0]));
        const outDeg = Object.fromEntries(names.map(nm => [nm, 0]));
        for (const { s, t } of combined) { outDeg[s]++; inDeg[t]++; }
        return names.every(nm => inDeg[nm] === outDeg[nm]);

    } else {
        const origSet = new Set(origEdges.map(e => {
            const a = vertexLabel(e.source, names), b = vertexLabel(e.target, names);
            return a !== b ? [a, b].sort().join('--') : null;
        }).filter(Boolean));

        const combined = origEdges
            .map(e => ({ s: vertexLabel(e.source, names), t: vertexLabel(e.target, names) }))
            .filter(e => e.s !== e.t);

        for (const ae of addedEdges) {
            if (!ae.from || !ae.to) continue;
            const from = ae.from.trim().toUpperCase();
            const to   = ae.to.trim().toUpperCase();
            if (!names.includes(from) || !names.includes(to)) return false;
            if (from === to) continue;
            if (!origSet.has([from, to].sort().join('--'))) return false;
            combined.push({ s: from, t: to });
        }

        const deg = Object.fromEntries(names.map(nm => [nm, 0]));
        for (const { s, t } of combined) { deg[s]++; deg[t]++; }
        return Object.values(deg).every(d => d % 2 === 0);
    }
}
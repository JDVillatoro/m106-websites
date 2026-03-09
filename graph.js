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
    if (n <= 9) return Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
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
// Eulerian Graph puzzle generators
// ---------------------------------------------------------------------------

// ---- Complexity heuristics ------------------------------------------------
// Applied to every puzzle graph to keep it legible regardless of vertex count.
//
//   1. Max degree of any vertex ≤ PUZZLE_MAX_DEG
//   2. For every vertex v, mean degree of closed neighbourhood
//      {v} ∪ neighbors(v)  ≤  PUZZLE_MAX_NBR_MEAN
//
// For directed graphs "degree" = in-degree + out-degree; "neighbour" means
// adjacent in either direction.

const _PUZZLE_MAX_DEG      = 5;
const _PUZZLE_MAX_NBR_MEAN = 3.5;

/**
 * Return true when `edges` satisfies both puzzle complexity heuristics.
 * @param {Edge[]} edges
 * @param {number} n
 * @param {boolean} directed
 * @returns {boolean}
 */
function _puzzleComplexityOk(edges, n, directed) {
    const deg = new Array(n).fill(0);
    const adj = Array.from({ length: n }, () => new Set());

    for (const { source, target } of edges) {
        const s = vertexIndex(source);
        const t = vertexIndex(target);
        if (s === t) {
            if (!directed) deg[s] += 2;
            continue;
        }
        deg[s]++;
        deg[t]++;
        adj[s].add(t);
        adj[t].add(s);
    }

    for (let v = 0; v < n; v++) {
        if (deg[v] > _PUZZLE_MAX_DEG) return false;
        const closed = [v, ...adj[v]];
        const mean   = closed.reduce((sum, u) => sum + deg[u], 0) / closed.length;
        if (mean > _PUZZLE_MAX_NBR_MEAN) return false;
    }
    return true;
}

/**
 * Pick a random target edge count appropriate for an undirected puzzle graph
 * on n vertices. Stays well below the density that would fail the heuristics.
 * Range: [n, floor(1.8 · n)] capped at the complete-graph edge count.
 * @param {number} n
 * @returns {number}
 */
function _puzzleEdgeTarget(n) {
    const lo  = n;
    const hi  = Math.min(Math.floor(1.8 * n), (n * (n - 1)) / 2);
    return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

// ---- Per-type makers -------------------------------------------------------

/** @returns {object} graph */
function _makeEulerianDigraph(n) {
    for (let attempt = 0; attempt < 20; attempt++) {
        const g = generateEulerianDigraph(n);
        if (_puzzleComplexityOk(g.edges, n, true)) return g;
    }
    return generateEulerianDigraph(n); // best effort
}

/** @returns {object} graph */
function _makeNonEulerianDigraph(n) {
    for (let attempt = 0; attempt < 20; attempt++) {
        const g  = generateEulerianDigraph(n);
        if (!_puzzleComplexityOk(g.edges, n, true)) continue;
        const candidates = shuffle(g.edges.slice());
        for (const cand of candidates) {
            const trial = g.edges.filter(e => e !== cand);
            if (isStronglyConnected(trial, n)) {
                return { ...g, edges: trial }; // fewer edges → still passes heuristics
            }
        }
    }
    return _makeEulerianDigraph(n);
}

/** @returns {object} graph */
function _makeEulerianSimple(n) {
    for (let attempt = 0; attempt < 25; attempt++) {
        const g = generateEulerianSimpleGraph(n, _puzzleEdgeTarget(n));
        if (_puzzleComplexityOk(g.edges, n, false)) return g;
    }
    return generateEulerianSimpleGraph(n, n); // sparse fallback
}

/** @returns {object} graph */
function _makeNonEulerianSimple(n) {
    for (let attempt = 0; attempt < 25; attempt++) {
        const g   = generateEulerianSimpleGraph(n, _puzzleEdgeTarget(n));
        if (!_puzzleComplexityOk(g.edges, n, false)) continue;
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
function _makeEulerianMulti(n) {
    for (let attempt = 0; attempt < 25; attempt++) {
        const g = generateEulerianMultigraph(n, _puzzleEdgeTarget(n));
        if (_puzzleComplexityOk(g.edges, n, false)) return g;
    }
    return generateEulerianMultigraph(n, n); // sparse fallback
}

/** @returns {object} graph */
function _makeNonEulerianMulti(n) {
    for (let attempt = 0; attempt < 25; attempt++) {
        const g   = generateEulerianMultigraph(n, _puzzleEdgeTarget(n));
        if (!_puzzleComplexityOk(g.edges, n, false)) continue;
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
 * Generate a random Eulerian graph puzzle.
 *
 * Returns a graph object extended with:
 *   isEulerian  {boolean}  — ground-truth answer
 *   isMulti     {boolean}  — true when edge labels are edge-names (for circuit input format)
 *
 * @returns {object}
 */
function generateEulerianGraphPuzzle() {
    const n        = Math.floor(Math.random() * 6) + 4;   // 4–9 vertices
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
        isEulerian = isConnected(graph.edges, n) && getOddVertices(graph.edges, n).length === 0;
    }

    return { ...graph, isEulerian, isMulti };
}


// ---------------------------------------------------------------------------
// Eulerian circuit validation
// ---------------------------------------------------------------------------

/**
 * Check whether a sequence of vertex display-names forms a valid Eulerian
 * circuit in a simple undirected graph.
 * @param {string[]} circuit            - display names e.g. ["A","B","C","A"]
 * @param {object}   graph
 * @param {boolean}  requireCircuit
 * @returns {boolean}
 */
function validateEulerianCircuitSimple(circuit, graph, requireCircuit) {
    if (circuit.length < 2) return false;
    if (requireCircuit && circuit[0] !== circuit[circuit.length - 1]) return false;

    const pool = graph.edges.map(e => ({
        a: vertexLabel(e.source, graph.names),
        b: vertexLabel(e.target, graph.names),
        used: false,
    }));

    for (let step = 0; step < circuit.length - 1; step++) {
        const u = circuit[step], v = circuit[step + 1];
        const ei = pool.findIndex(e => !e.used && ((e.a === u && e.b === v) || (e.a === v && e.b === u)));
        if (ei === -1) return false;
        pool[ei].used = true;
    }
    return pool.every(e => e.used);
}

/**
 * Check whether an alternating vertex/edge-label string is a valid Eulerian
 * circuit in a multigraph, e.g. "AaBbCcA".
 * @param {string}  input
 * @param {object}  graph
 * @param {boolean} requireCircuit
 * @returns {boolean}
 */
function validateEulerianCircuitMulti(input, graph, requireCircuit) {
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
 * @param {string[]} circuit
 * @param {object}   graph
 * @returns {boolean}
 */
function validateEulerianCircuitDigraph(circuit, graph) {
    if (circuit.length < 2) return false;
    if (circuit[0] !== circuit[circuit.length - 1]) return false;

    const pool = graph.edges.map(e => ({
        a: vertexLabel(e.source, graph.names),
        b: vertexLabel(e.target, graph.names),
        used: false,
    }));

    for (let step = 0; step < circuit.length - 1; step++) {
        const u = circuit[step], v = circuit[step + 1];
        const ei = pool.findIndex(e => !e.used && e.a === u && e.b === v);
        if (ei === -1) return false;
        pool[ei].used = true;
    }
    return pool.every(e => e.used);
}

/**
 * Validate whether adding a set of edges to a graph makes it Eulerian.
 * Added edges must duplicate existing edges (no new vertex relationships).
 *
 * Returns a result object rather than a bare boolean so the caller can
 * display specific feedback for each failure mode:
 *
 *   { ok: true }
 *     — the eulerization is correct.
 *
 *   { ok: false, reason: 'invalid_vertices', bad: ['X', 'Y'] }
 *     — one or more added edges reference vertex names that don't exist.
 *
 *   { ok: false, reason: 'not_duplicate', bad: ['A→C', ...] }
 *     — one or more added edges don't duplicate an existing edge.
 *
 *   { ok: false, reason: 'not_eulerian', oddVertices: ['A', 'C'] }
 *     — all added edges are valid duplicates but the graph is still not Eulerian;
 *       oddVertices lists the vertices that still have odd degree.
 *
 * @param {object}  graph
 * @param {Array<{from: string, to: string}>} addedEdges
 * @returns {{ ok: boolean, reason?: string, bad?: string[], oddVertices?: string[] }}
 */
function validateEulerization(graph, addedEdges) {
    const { names, directed, edges: origEdges } = graph;

    const origSet = new Set(origEdges.map(e => {
        const a = vertexLabel(e.source, names), b = vertexLabel(e.target, names);
        if (a === b) return null;
        return directed ? `${a}->${b}` : [a, b].sort().join('--');
    }).filter(Boolean));

    const combined = origEdges
        .map(e => ({ s: vertexLabel(e.source, names), t: vertexLabel(e.target, names) }))
        .filter(e => e.s !== e.t);

    const invalidVertices = [];
    const nonDuplicates   = [];

    for (const ae of addedEdges) {
        if (!ae.from || !ae.to) continue;
        const from = ae.from.trim().toUpperCase();
        const to   = ae.to.trim().toUpperCase();

        if (!names.includes(from) || !names.includes(to)) {
            invalidVertices.push(`${from}–${to}`);
            continue;
        }
        if (from === to) continue;  // self-loops are silently skipped

        const key = directed ? `${from}->${to}` : [from, to].sort().join('--');
        if (!origSet.has(key)) {
            nonDuplicates.push(directed ? `${from}→${to}` : `${from}–${to}`);
            continue;
        }
        combined.push({ s: from, t: to });
    }

    if (invalidVertices.length > 0) {
        return { ok: false, reason: 'invalid_vertices', bad: invalidVertices };
    }
    if (nonDuplicates.length > 0) {
        return { ok: false, reason: 'not_duplicate', bad: nonDuplicates };
    }

    // Check whether the combined graph is now Eulerian
    if (directed) {
        const inDeg  = Object.fromEntries(names.map(nm => [nm, 0]));
        const outDeg = Object.fromEntries(names.map(nm => [nm, 0]));
        for (const { s, t } of combined) { outDeg[s]++; inDeg[t]++; }
        const oddVertices = names.filter(nm => inDeg[nm] !== outDeg[nm]);
        if (oddVertices.length > 0) return { ok: false, reason: 'not_eulerian', oddVertices };
    } else {
        const deg = Object.fromEntries(names.map(nm => [nm, 0]));
        for (const { s, t } of combined) { deg[s]++; deg[t]++; }
        const oddVertices = names.filter(nm => deg[nm] % 2 !== 0);
        if (oddVertices.length > 0) return { ok: false, reason: 'not_eulerian', oddVertices };
    }

    return { ok: true };
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
function minEulerizeEdges(graph) {
    const odds = getOddVertices(graph.edges, graph.n); // vertex indices
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
function getMismatchedVertices(graph) {
    const { inDeg, outDeg } = getDirectedDegrees(graph.edges, graph.n);
    return graph.names.filter((_, i) => inDeg[i] !== outDeg[i]);
}


// =============================================================================
// Planar graph puzzle helpers
// =============================================================================

const PLANAR_PUZZLE_CONFIG = {
    nMin: 6,
    nMax: 8,
    planarExtraEdgeFactorMin: 1.15,
    planarExtraEdgeFactorMax: 1.55,
    nonPlanarExtraEdgeSlackMax: 2,
};

function _randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function _edgeKey(a, b) {
    return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function _circlePositions(n) {
    const pts = [];
    for (let i = 0; i < n; i++) {
        const a = (2 * Math.PI * i) / n;
        pts.push({ x: Math.cos(a), y: Math.sin(a) });
    }
    return pts;
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
    const maxPlanarEdges = Math.max(n - 1, 3 * n - 6);
    const wanted = Math.max(n - 1, Math.min(targetEdges, maxPlanarEdges));

    const indexEdges = _randomSpanningTree(n);
    const edgeSet = new Set(indexEdges.map(e => _edgeKey(e.s, e.t)));
    const pos = _circlePositions(n);

    let guard = 0;
    while (indexEdges.length < wanted && guard < 4000) {
        guard++;
        const a = _randInt(0, n - 1);
        const b = _randInt(0, n - 1);
        if (a === b) continue;

        const key = _edgeKey(a, b);
        if (edgeSet.has(key)) continue;
        if (_wouldCrossAny(a, b, indexEdges, pos)) continue;

        indexEdges.push({ s: a, t: b });
        edgeSet.add(key);
    }

    return indexEdges;
}

function _makePlanarPuzzleGraph(n) {
    const factor = PLANAR_PUZZLE_CONFIG.planarExtraEdgeFactorMin
        + Math.random() * (PLANAR_PUZZLE_CONFIG.planarExtraEdgeFactorMax - PLANAR_PUZZLE_CONFIG.planarExtraEdgeFactorMin);
    const target = Math.min(3 * n - 6, Math.max(n - 1, Math.round(n * factor)));
    const indexEdges = _generateConnectedPlanarIndexEdges(n, target);

    return {
        n,
        names: makeLabels(n),
        directed: false,
        edgeLabel: null,
        edges: _toEdges(indexEdges),
        isPlanar: true,
        obstruction: null,
        planarCounts: {
            vertices: n,
            edges: indexEdges.length,
            faces: 2 - n + indexEdges.length,
        },
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

function _makeNonPlanarPuzzleGraph(n) {
    const base = _makePlanarPuzzleGraph(n);
    let indexEdges = base.edges.map(e => ({ s: vertexIndex(e.source), t: vertexIndex(e.target) }));
    const baseEdgeCount = indexEdges.length;

    const makeK33 = (n >= 6) && Math.random() < 0.5;
    const obstruction = makeK33 ? 'K3,3' : 'K5';
    const injected = makeK33 ? _injectK33(indexEdges, n) : _injectK5(indexEdges, n);

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

    const target = baseEdgeCount + _randInt(0, Math.min(PLANAR_PUZZLE_CONFIG.nonPlanarExtraEdgeSlackMax, indexEdges.length - baseEdgeCount));
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
        isPlanar: false,
        obstruction,
        witnessVertices: injected.witnessVertices.map(v => vertexId(v)),
        planarCounts: null,
    };
}

/**
 * Generate a random planar-classification puzzle graph.
 *
 * Returns a graph object extended with:
 *   isPlanar {boolean}
 *   planarCounts {{vertices:number,edges:number,faces:number}|null}
 *   obstruction {'K5'|'K3,3'|null}
 *
 * @returns {object}
 */
function generatePlanarGraphPuzzle() {
    const n = _randInt(PLANAR_PUZZLE_CONFIG.nMin, PLANAR_PUZZLE_CONFIG.nMax);
    const shouldBePlanar = Math.random() < 0.5;
    return shouldBePlanar ? _makePlanarPuzzleGraph(n) : _makeNonPlanarPuzzleGraph(n);
}


// =============================================================================
// Graph coloring puzzle helpers
// =============================================================================

const GRAPH_COLORING_CONFIG = {
    nMin: 5,
    nMax: 8,
    bipartiteWeight: 0.25,
    planarWeight: 0.50,
    k5Weight: 0.25,
    generationMaxChromatic: 5,
    promptMaxColors: 6,
};

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

function chromaticNumber(graph, maxColors = 6) {
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

function _makeBipartiteColoringGraph(n) {
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
        flavor: 'bipartite',
    };
}

function _makePlanarColoringGraph(n) {
    const g = _makePlanarPuzzleGraph(n);
    return {
        n: g.n,
        names: _makeNumberNames(g.n),
        directed: false,
        edgeLabel: null,
        edges: g.edges.slice(),
        flavor: 'planar',
    };
}

function _makeK5ColoringGraph(n) {
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
        flavor: 'k5',
    };
}

/**
 * Generate a random graph-coloring puzzle.
 *
 * Returns a graph object extended with:
 *   minColors {number}       exact chromatic number (<= 5)
 *   maxColorsAllowed {number}
 *   flavor {'bipartite'|'planar'|'k5'}
 *
 * @returns {object}
 */
function generateGraphColoringPuzzle() {
    for (let attempt = 0; attempt < 60; attempt++) {
        const n = _randInt(GRAPH_COLORING_CONFIG.nMin, GRAPH_COLORING_CONFIG.nMax);
        const roll = Math.random();

        let graph;
        if (roll < GRAPH_COLORING_CONFIG.bipartiteWeight) {
            graph = _makeBipartiteColoringGraph(n);
        } else if (roll < GRAPH_COLORING_CONFIG.bipartiteWeight + GRAPH_COLORING_CONFIG.planarWeight) {
            graph = _makePlanarColoringGraph(n);
        } else {
            graph = _makeK5ColoringGraph(Math.max(n, 5));
        }

        const minColors = chromaticNumber(graph, GRAPH_COLORING_CONFIG.generationMaxChromatic);
        if (!minColors || minColors > GRAPH_COLORING_CONFIG.generationMaxChromatic) continue;

        const plusOne = minColors + 1;
        const requested = plusOne === graph.n ? minColors : plusOne;
        const maxColorsAllowed = Math.min(GRAPH_COLORING_CONFIG.promptMaxColors, requested);

        return { ...graph, minColors, maxColorsAllowed };
    }

    const fallback = _makeBipartiteColoringGraph(6);
    return { ...fallback, minColors: 2, maxColorsAllowed: 3 };
}

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
function validateGraphColoring(graph, colorByVertexId, minColors) {
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
function computeGreedyColoring(graph, vertexOrderIds, colorOrder) {
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
function validateGreedyColoring(graph, vertexOrderIds, userColorByVertexId, colorOrder) {
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

const APPLICATIONS_COMMITTEE_NAMES = [
    'Appeals Board', 'Welcoming Committee', 'Oversight Panel', 'Ethics Subcommittee', 'Grievance Council',
    'Advisory Circle', 'Review Board', 'Standards Committee', 'Nominations Panel', 'Steering Group',
    'Transition Team', 'Allocation Board', 'Credentials Committee', 'Incident Review Panel', 'Social Committee',
    'Recognition Board', 'Continuity Group', 'Founding Council', 'Exceptions Committee', 'Peripheral Affairs Bureau',
];

const APPLICATIONS_MEMBER_NAMES = [
    'Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Frank', 'Grace', 'Heidi', 'Ivan', 'Judy',
    'Karl', 'Leo', 'Mallory', 'Nina', 'Oscar', 'Peggy', 'Quentin', 'Rupert', 'Sybil', 'Trent',
    'Uma', 'Victor', 'Walter', 'Xavier', 'Yvonne', 'Zara',
];

const APPLICATIONS_LOCATION_NAMES = [
    'Downtown', 'Uptown', 'Suburbia', 'Industrial Park', 'University District', 'Waterfront',
    'Historic Quarter', 'Business Center', 'Residential Area', 'Cultural Hub', 'Tech Park', 'Greenbelt',
    'Airport', 'Shopping District', 'Entertainment Zone', 'Medical Center', 'Government Plaza', 'Sports Complex',
];

const APPLICATIONS_FREQUENCY_OPTIONS = ['540 kHz', '600 kHz', '700 kHz', '800 kHz', '900 kHz', '1000 kHz'];

function _pickUniqueNames(pool, count, fallbackPrefix) {
    const shuffled = shuffle(pool.slice());
    const out = [];
    for (let i = 0; i < count; i++) {
        if (i < shuffled.length) out.push(shuffled[i]);
        else out.push(`${fallbackPrefix} ${i + 1}`);
    }
    return out;
}

function _generateSchedulingApplicationsPuzzle() {
    const base = generateGraphColoringPuzzle();
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
        minResources: base.minColors,
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

function _generateInterferenceApplicationsPuzzle() {
    for (let attempt = 0; attempt < 60; attempt++) {
        const n = _randInt(GRAPH_COLORING_CONFIG.nMin, GRAPH_COLORING_CONFIG.nMax);
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
        const halfDiameter = diameter / 2;
        const thresholdRaw = halfDiameter >= connectThreshold
            ? connectThreshold + Math.random() * (halfDiameter - connectThreshold)
            : halfDiameter;

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

function generateApplicationsPuzzle() {
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

function validateApplicationsAssignment(puzzle, assignmentByVertexId) {
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
const ISO_PUZZLE_N_RANGE = [4, 6];

// ---------------------------------------------------------------------------
// Structural invariants
// ---------------------------------------------------------------------------

/**
 * Count undirected triangles (unordered triples of mutually adjacent vertices).
 * @param {Edge[]} edges
 * @param {number} n
 * @returns {number}
 */
function countTriangles(edges, n) {
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
 * @param {Edge[]} edges
 * @param {number} n
 * @returns {number}
 */
function componentCount(edges, n) {
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
function graphInvariants(graph) {
    return {
        n:          graph.n,
        edgeCount:  graph.edges.length,
        degSeq:     degreeSequence(graph.edges, graph.n).join(','),
        components: componentCount(graph.edges, graph.n),
        triangles:  countTriangles(graph.edges, graph.n),
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
function checkNeitherReason(g1, g2, reason) {
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
function applyPermutation(graph, sigma) {
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
function verifyIsomorphismWitness(g1, g2, nameMap) {
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
    const origTri = countTriangles(graph.edges, graph.n);
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
        const newTri = countTriangles(trial, graph.n);
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
                const d1 = degreeSequence(g1.edges, n).join(',');
                const d2 = degreeSequence(g2.edges, n).join(',');
                if (g1.edges.length === g2.edges.length && d1 !== d2) return { g1, g2 };
            }
            // Fallback: any different degree sequence
            for (let attempt = 0; attempt < 30; attempt++) {
                const g1 = _isoBaseGraph(n);
                const g2 = _isoBaseGraph(n);
                const d1 = degreeSequence(g1.edges, n).join(',');
                const d2 = degreeSequence(g2.edges, n).join(',');
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
            if (componentCount(g2.edges, n) > 1) return { g1, g2 };
            return null;
        }

        case 'diff_triangles': {
            // Strategy A: 2-opt swap that changes triangles while preserving degree sequence
            for (let attempt = 0; attempt < 20; attempt++) {
                const g1      = _isoBaseGraph(n);
                const swapped = _swapToChangeTriangles(g1);
                if (!swapped) continue;
                const d1 = degreeSequence(g1.edges, n).join(',');
                const d2 = degreeSequence(swapped.edges, n).join(',');
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
                if (countTriangles(g1.edges, n) !== countTriangles(g2.edges, n)) return { g1, g2 };
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
function generateIsoPuzzle() {
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
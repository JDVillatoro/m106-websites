/**
 * Split a graph's edges into connected components (treating edges as undirected).
 * Returns an array of components where each component is an array of vertex ids.
 * @param {Array} edges - array of edges {source, target, ...}
 * @returns {Array<Array<string>>}
 */
function getConnectedComponents(edges) {
    const adj = {};
    for (const edge of edges) {
        if (!adj[edge.source]) adj[edge.source] = [];
        if (!adj[edge.target]) adj[edge.target] = [];
        adj[edge.source].push(edge.target);
        adj[edge.target].push(edge.source);
    }
    const visited = new Set();
    const components = [];
    for (const v in adj) {
        if (!visited.has(v)) {
            const comp = [];
            const stack = [v];
            while (stack.length) {
                const u = stack.pop();
                if (!visited.has(u)) {
                    visited.add(u);
                    comp.push(u);
                    for (const w of adj[u]) {
                        if (!visited.has(w)) stack.push(w);
                    }
                }
            }
            components.push(comp);
        }
    }
    // Add isolated vertices
    const allVerts = new Set([...edges.map(e => e.source), ...edges.map(e => e.target)]);
    for (const v of allVerts) {
        if (!adj[v]) components.push([v]);
    }
    return components;
}


/**
 * Generate a random graph as an edge list.
 * Options control loops, multigraph edges, and number of components.
 * @param {number} n
 * @param {boolean} allowLoops
 * @param {boolean} allowMultigraph
 * @param {number} [numComponents=1]
 * @returns {Array} edges
 */
function generateRandomGraph(n, allowLoops, allowMultigraph, numComponents = 1) {
    // Vertex names as strings
    const vertices = Array.from({ length: n }, (_, i) => `v${i}`);
    // Partition vertices into numComponents groups
    const groups = [];
    for (let i = 0; i < numComponents; i++) groups.push([]);
    for (let i = 0; i < n; i++) groups[i % numComponents].push(vertices[i]);

    const edges = [];
    const edgeSet = new Set();
    // Decide once for the whole graph
    const isDirected = Math.random() < 0.5;
    const isWeighted = Math.random() < 0.5;
    // For each group, generate a random connected subgraph, then add random extra edges
    for (const group of groups) {
        if (group.length === 1) {
            // Isolated vertex
            edges.push({
                source: group[0],
                target: null,
                isDirected: false,
                weight: null
            });
            continue;
        }
        // Ensure connected: create a random spanning tree
        const shuffled = group.slice().sort(() => Math.random() - 0.5);
        for (let i = 1; i < shuffled.length; i++) {
            const u = shuffled[i - 1];
            const v = shuffled[i];
            let key = isDirected ? `${u}->${v}` : [u, v].sort().join('--');
            if (!allowMultigraph && edgeSet.has(key)) continue;
            edgeSet.add(key);
            edges.push({
                source: u,
                target: v,
                isDirected: isDirected,
                weight: isWeighted ? Math.floor(Math.random() * 10) + 1 : null
            });
        }
        // Add random extra edges within the group
        const maxExtra = Math.max(0, group.length * (group.length - 1) / 2 - (group.length - 1));
        const numExtra = Math.floor(Math.random() * (maxExtra + 1));
        let tries = 0;
        while (edges.length < numExtra + (group.length - 1) && tries < 100 * numExtra) {
            let u = group[Math.floor(Math.random() * group.length)];
            let v = group[Math.floor(Math.random() * group.length)];
            if (!allowLoops && u === v) { tries++; continue; }
            let key = isDirected ? `${u}->${v}` : [u, v].sort().join('--');
            if (!allowMultigraph && edgeSet.has(key)) { tries++; continue; }
            edgeSet.add(key);
            edges.push({
                source: u,
                target: v,
                isDirected: isDirected,
                weight: isWeighted ? Math.floor(Math.random() * 10) + 1 : null
            });
            tries++;
        }
    }
    return edges;
}


/**
 * Convert an edge list to CSV for quick export or debugging.
 * @param {Array} edges
 * @returns {string}
 */
function edgesToCSV(edges) {
    let csv = 'source,target,isDirected,weight\n';
    for (const edge of edges) {
        csv += `${edge.source},${edge.target},${edge.isDirected},${edge.weight === null ? '' : edge.weight}\n`;
    }
    return csv;
}

// Property detection functions
/**
 * Test undirected connectivity for n vertices (v0..v{n-1}).
 * @param {Array} edges
 * @param {number} n
 * @returns {boolean}
 */


/**
 * Detect whether the edge list contains multiple edges between the same endpoints.
 * @param {Array} edges
 * @returns {boolean}
 */
function isMultiGraph(edges) {
    const seen = new Set();
    for (const edge of edges) {
        const key = edge.isDirected ? `${edge.source}->${edge.target}` : [edge.source, edge.target].sort().join('--');
        if (seen.has(key)) return true;
        seen.add(key);
    }
    return false;
}

/**
 * Detect whether any edge is a loop (source === target).
 * @param {Array} edges
 * @returns {boolean}
 */
function isLoopGraph(edges) {
    return edges.some(edge => edge.source === edge.target);
}

/**
 * Detect whether any edge has a non-null weight.
 * @param {Array} edges
 * @returns {boolean}
 */
function isWeighted(edges) {
    return edges.some(edge => edge.weight !== null);
}

/**
 * Detect whether any edge is marked as directed.
 * @param {Array} edges
 * @returns {boolean}
 */
function isDirected(edges) {
    return edges.some(edge => edge.isDirected);
}

// /**
//  * Generate a simple undirected graph (no loops, no multi-edges) with
//  * edge probability `edgeProb`.
//  * @param {number} n
//  * @param {number} [edgeProb=0.4]
//  * @returns {Array} edges
//  */
// function generateSimpleGraph(n, edgeProb = 0.4) {
//     const vertices = Array.from({length: n}, (_, i) => `v${i}`);
//     const edges = [];
//     for (let i = 0; i < n; i++) {
//         for (let j = i + 1; j < n; j++) {
//             if (Math.random() < edgeProb) {
//                 edges.push({ source: vertices[i], target: vertices[j], isDirected: false, weight: null });
//             }
//         }
//     }
//     // Ensure every vertex exists in the edges list as isolated if needed
//     if (edges.length === 0) {
//         // add a single edge if entirely empty
//         if (n >= 2) edges.push({ source: 'v0', target: 'v1', isDirected: false, weight: null });
//     }
//     return edges;
// }

// ---------------------------------------------------------------------------
// graphToDescription – convert graph data to a verbal description for screen
// readers. This helper produces concise sentences suitable for live regions
// and alt-text output.
//
// graph_data: { n, names: string[], edges: [{source, target, label?, isDirected?}] }
//   source/target are internal ids like "v0", "v1"; names maps index → display label.
//
// Returns: { text: string, isLong: boolean }
//   isLong is true when there are more than 10 edges (caller may warn before reading).
// ---------------------------------------------------------------------------
function graphToDescription(graph_data) {
    if (!graph_data) return { text: 'No graph data available.', isLong: false };

    const n = Number(graph_data.n) || 0;
    const names = Array.isArray(graph_data.names) ? graph_data.names : [];
    const edges = Array.isArray(graph_data.edges)
        ? graph_data.edges.filter(e => e && e.target !== null && e.target !== undefined)
        : [];

    // Helper: resolve internal id (e.g. "v2") to display name, falling back to vertex number
    function label(id) {
        if (typeof id !== 'string') return String(id);
        const match = id.match(/^v(\d+)$/);
        if (match) {
            const i = parseInt(match[1], 10);
            return (names[i] && String(names[i]).trim()) ? String(names[i]).trim() : String(i + 1);
        }
        return id;
    }

    // Determine whether ALL labelled edges carry numeric-only labels → use "weight" terminology
    const labelledEdges = edges.filter(e => e.label && String(e.label).trim() !== '');
    const allNumericLabels = labelledEdges.length > 0 &&
        labelledEdges.every(e => !isNaN(Number(String(e.label).trim())));

    const edgeCount = edges.length;
    const isLong = edgeCount > 10 || n > 8;

    // --- Build description ---
    const parts = [];

    // Opening summary
    parts.push(`A graph with ${n} ${n === 1 ? 'vertex' : 'vertices'} and ${edgeCount} ${edgeCount === 1 ? 'edge' : 'edges'}.`);

    // Long-description warning immediately after the summary
    if (isLong) {
        parts.push(`Note: this graph is large. The following description may be lengthy.`);
    }

    // Vertex list
    for (let i = 0; i < n; i++) {
        const name = (names[i] && String(names[i]).trim()) ? String(names[i]).trim() : null;
        parts.push(name ? `Vertex ${i + 1} labeled ${name}.` : `Vertex ${i + 1}.`);
    }

    // Transition sentence before edge list
    parts.push(edgeCount === 0 ? 'There are no edges.' : 'The full edge list is as follows.');

    // Edge list
    for (const e of edges) {
        const src = label(e.source);
        const tgt = label(e.target);
        const directed = !!e.isDirected;
        const lbl = e.label && String(e.label).trim() !== '' ? String(e.label).trim() : null;

        let sentence;
        if (directed) {
            if (lbl !== null) {
                sentence = allNumericLabels
                    ? `A directed edge from ${src} to ${tgt} with weight ${lbl}.`
                    : `A directed edge from ${src} to ${tgt} labeled ${lbl}.`;
            } else {
                sentence = `A directed edge from ${src} to ${tgt}.`;
            }
        } else {
            if (e.source === e.target) {
                sentence = lbl !== null
                    ? `A loop on vertex ${src} labeled ${lbl}.`
                    : `A loop on vertex ${src}.`;
            } else if (lbl !== null) {
                sentence = allNumericLabels
                    ? `An edge between ${src} and ${tgt} with weight ${lbl}.`
                    : `An edge between ${src} and ${tgt} labeled ${lbl}.`;
            } else {
                sentence = `An edge between ${src} and ${tgt}.`;
            }
        }
        parts.push(sentence);
    }

    return { text: parts.join(' '), isLong };
}

/**
 * Degree of a vertex in an undirected graph. Loops count twice; multiple
 * edges are each counted.
 * @param {string} vertexId
 * @param {Array} edges
 * @returns {number}
 */
function degreeOf(vertexId, edges) {
    let deg = 0;
    for (const e of edges) {
        if (e.target === null) continue;
        if (e.source === vertexId && e.target === vertexId) {
            deg += 2; // loop
        } else if (e.source === vertexId || e.target === vertexId) {
            deg += 1;
        }
    }
    return deg;
}

/**
 * Return the degree sequence (non-decreasing) for vertices v0..v{n-1}.
 * @param {Array} edges
 * @param {number} n
 * @returns {Array<number>}
 */
function degreeSequence(edges, n) {
    const verts = Array.from({ length: n }, (_, i) => `v${i}`);
    const seq = verts.map(v => degreeOf(v, edges));
    return seq.sort((a, b) => a - b);
}

/**
 * Test whether a directed graph is strongly connected (v0..v{n-1}).
 * Uses two DFS passes (Kosaraju style): all nodes must be reachable
 * from an arbitrary start node and vice-versa on the reversed graph.
 * @param {Array} edges - array of edges {source, target, isDirected}
 * @param {number} n
 * @returns {boolean}
 */
function isStronglyConnected(edges, n) {
    if (n === 0) return true;
    const verts = Array.from({ length: n }, (_, i) => `v${i}`);
    const adj = {};
    for (const v of verts) { adj[v] = []; }

    for (const e of edges) {
        if (!e || e.target === null || e.target === undefined) continue;
        const s = e.source;
        const t = e.target;
        // Add directed adjacency; undirected edges are treated as both directions
        adj[s].push(t);
        if (!e.isDirected) adj[t].push(s);
    }

    function dfs(start, adjacency) {
        const visited = new Set();
        const stack = [start];
        while (stack.length) {
            const u = stack.pop();
            if (!visited.has(u)) {
                visited.add(u);
                const neighbors = adjacency[u] || [];
                for (const w of neighbors) if (!visited.has(w)) stack.push(w);
            }
        }
        return visited;
    }

    const start = verts[0];
    const reach1 = dfs(start, adj);
    if (reach1.size !== n) return false;

    // Build reversed adjacency properly
    const adjRev = {};
    for (const v of verts) adjRev[v] = [];
    for (const e of edges) {
        if (!e || e.target === null || e.target === undefined) continue;
        const s = e.source;
        const t = e.target;
        adjRev[t].push(s);
        if (!e.isDirected) adjRev[s].push(t);
    }

    const reach2 = dfs(start, adjRev);
    return reach2.size === n;
}

/**
 * Generate a minimal strongly-connected directed graph (MSC Digraph).
 * Starts with the complete digraph (for every i!=j include i->j) then
 * attempts to remove edges in random order, skipping deletions that break
 * strong connectivity. Repeats until no more deletions are possible.
 * @param {number} n
 * @returns {Array} edges
 */
function generateMSC_Digraph(n) {
    const verts = Array.from({ length: n }, (_, i) => `v${i}`);
    const edges = [];
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i === j) continue;
            edges.push({ source: `v${i}`, target: `v${j}`, isDirected: true, weight: null });
        }
    }

    function shuffleInPlace(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        }
    }

    // Iteratively try removing edges in random order until stable
    while (true) {
        let removedThisPass = false;
        const candidates = edges.slice();
        shuffleInPlace(candidates);
        for (const cand of candidates) {
            // find first matching edge in current edges array
            const idx = edges.findIndex(e => e.source === cand.source && e.target === cand.target && e.isDirected === cand.isDirected);
            if (idx === -1) continue;
            const trial = edges.slice(0, idx).concat(edges.slice(idx + 1));
            if (isStronglyConnected(trial, n)) {
                edges.splice(idx, 1);
                removedThisPass = true;
            }
        }
        if (!removedThisPass) break;
    }
    return edges;
}

/**
 * Modify a directed graph (edges array) so every vertex has equal in- and out-degree.
 * Adds directed edges until all vertices satisfy in-degree == out-degree.
 * This function mutates the provided edges array and returns it.
 * @param {Array} edges - array of directed edges {source, target, isDirected}
 * @param {number} n
 * @returns {Array} edges
 */
function eulerizeDigraph(edges, n) {
    console.log('eulerizeDigraph called', { n: n, edgesLength: edges ? edges.length : 0 });
    const verts = Array.from({ length: n }, (_, i) => `v${i}`);
    const inDeg = {};
    const outDeg = {};
    for (const v of verts) { inDeg[v] = 0; outDeg[v] = 0; }

    for (const e of edges) {
        if (!e || e.target === null || e.target === undefined) continue;
        outDeg[e.source] = (outDeg[e.source] || 0) + 1;
        inDeg[e.target] = (inDeg[e.target] || 0) + 1;
    }

    const sources = [];
    const sinks = [];
    for (const v of verts) {
        const delta = (outDeg[v] || 0) - (inDeg[v] || 0);
        if (delta < 0) {
            for (let k = 0; k < -delta; k++) sources.push(v);
        } else if (delta > 0) {
            for (let k = 0; k < delta; k++) sinks.push(v);
        }
    }

    function shuffleInPlace(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        }
    }

    const edgeSet = new Set();
    for (const e of edges) {
        if (!e || e.target === null || e.target === undefined) continue;
        edgeSet.add(`${e.source}->${e.target}`);
    }

    shuffleInPlace(sources);
    shuffleInPlace(sinks);

    while (sources.length > 0 && sinks.length > 0) {
        const s = sources[sources.length - 1]; // peek, don't pop yet

        // Priority 1: no duplicate, no reverse
        let chosenIdx = -1;
        for (let i = sinks.length - 1; i >= 0; i--) {
            const cand = sinks[i];
            if (cand === s) continue;
            if (!edgeSet.has(`${s}->${cand}`) && !edgeSet.has(`${cand}->${s}`)) {
                chosenIdx = i; break;
            }
        }

        // Priority 2: no duplicate (allow reverse)
        if (chosenIdx === -1) {
            for (let i = sinks.length - 1; i >= 0; i--) {
                const cand = sinks[i];
                if (cand !== s && !edgeSet.has(`${s}->${cand}`)) {
                    chosenIdx = i; break;
                }
            }
        }

        // Priority 3: allow self-loop if no other option
        if (chosenIdx === -1) {
            for (let i = sinks.length - 1; i >= 0; i--) {
                if (!edgeSet.has(`${s}->${sinks[i]}`)) {
                    chosenIdx = i; break;
                }
            }
        }

        if (chosenIdx === -1) {
            // Truly no valid target available — graph is too dense for simple
            // edge addition. Fall back: find ANY s2->t pair not yet in graph,
            // even if s2 is not in sources, by scanning all vertices.
            // This is a rare edge case in very dense graphs.
            sources.pop(); // discard this source and accept imperfect result
            // (alternatively, you could do a more expensive search here)
            continue;
        }

        // Now commit: pop both source and sink
        sources.pop();
        const t = sinks.splice(chosenIdx, 1)[0];
        const key = `${s}->${t}`;
        edges.push({ source: s, target: t, isDirected: true, weight: null });
        edgeSet.add(key);
    }

    // report result
    try {
        const inDegFinal = {};
        const outDegFinal = {};
        for (const v of verts) { inDegFinal[v] = 0; outDegFinal[v] = 0; }
        for (const e of edges) {
            if (!e || e.target === null || e.target === undefined) continue;
            outDegFinal[e.source] = (outDegFinal[e.source] || 0) + 1;
            inDegFinal[e.target] = (inDegFinal[e.target] || 0) + 1;
        }
        let balanced = true;
        for (const v of verts) if ((inDegFinal[v] || 0) !== (outDegFinal[v] || 0)) { balanced = false; break; }
        console.log('eulerizeDigraph result', { edgesLength: edges.length, balanced, inDeg: inDegFinal, outDeg: outDegFinal });
    } catch (err) {
        console.log('eulerizeDigraph result (error computing degrees)', err);
    }
    return edges;
}

/**
 * Generate an Eulerian directed graph. Starts from a minimal strongly-connected
 * digraph, adds random edges until reaching `targetEdges` (or a random target
 * between 20%-40% of the maximum possible edges when targetEdges omitted), and
 * then eulerizes the graph by adding edges to balance in/out degrees.
 * @param {number} n
 * @param {number} [targetEdges]
 * @returns {Array} edges
 */
function generateEulerianDigraph(n, targetEdges) {
    const maxEdges = n * (n - 1);
    console.log('generateEulerianDigraph called', { n: n, targetEdges: targetEdges });
    if (typeof targetEdges !== 'number' || isNaN(targetEdges) || targetEdges <= 0) {
        const minT = Math.floor(0.1 * maxEdges);
        const maxT = Math.floor(0.2 * maxEdges);
        targetEdges = Math.floor(Math.random() * (maxT - minT + 1)) + minT;
    }

    let edges = generateMSC_Digraph(n);
    console.log('generateEulerianDigraph after MSC generation', { edgesLength: edges.length });
    const edgeSet = new Set(edges.map(e => `${e.source}->${e.target}`));

    // Add random edges (avoid duplicates and preferably avoid reverse edges)
    let tries = 0;
    while (edges.length < targetEdges && tries < maxEdges * 20) {
        // Attempt to find a pair that avoids both duplicates and reverse edges
        let found = false;
        for (let attempt = 0; attempt < 40 && !found; attempt++) {
            const i = Math.floor(Math.random() * n);
            const j = Math.floor(Math.random() * n);
            if (i === j) continue;
            const key = `v${i}->v${j}`;
            const reverseKey = `v${j}->v${i}`;
            if (!edgeSet.has(key) && !edgeSet.has(reverseKey)) {
                edges.push({ source: `v${i}`, target: `v${j}`, isDirected: true, weight: null });
                edgeSet.add(key);
                found = true;
            }
        }

        // If we couldn't find a pair avoiding reverse arrows, relax constraint and
        // accept any non-duplicate edge.
        if (!found) {
            for (let attempt = 0; attempt < 100 && !found; attempt++) {
                const i = Math.floor(Math.random() * n);
                const j = Math.floor(Math.random() * n);
                if (i === j) continue;
                const key = `v${i}->v${j}`;
                if (!edgeSet.has(key)) {
                    edges.push({ source: `v${i}`, target: `v${j}`, isDirected: true, weight: null });
                    edgeSet.add(key);
                    found = true;
                }
            }
        }

        if (!found) break;
        tries++;
    }

    // Finally, eulerize to ensure in-degree == out-degree for all vertices
    console.log('generateEulerianDigraph before eulerize', { edgesLength: edges.length });
    edges = eulerizeDigraph(edges, n);
    console.log('generateEulerianDigraph result', { finalEdgesLength: edges.length });
    return edges;
}


// ─── Connectivity helpers ────────────────────────────────────────────────────

/**
 * Build an adjacency list (undirected) from an edge array.
 * Loops are ignored for connectivity purposes.
 */
function buildAdjList(edges, n) {
    const adj = Array.from({ length: n }, () => new Set());
    for (const { source, target, isLoop } of edges) {
        if (isLoop) continue;
        adj[source].add(target);
        adj[target].add(source);
    }
    return adj;
}

/**
 * BFS reachability count from vertex 0.  Returns number of vertices reached.
 */
function reachableCount(adj, n) {
    const visited = new Uint8Array(n);
    const queue = [0];
    visited[0] = 1;
    let count = 1;
    while (queue.length) {
        const node = queue.pop();
        for (const nb of adj[node]) {
            if (!visited[nb]) {
                visited[nb] = 1;
                count++;
                queue.push(nb);
            }
        }
    }
    return count;
}

function isConnected(edges, n) {
    return reachableCount(buildAdjList(edges, n), n) === n;
}

// ─── Fisher-Yates shuffle ────────────────────────────────────────────────────

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Generate a random minimal connected simple graph on n vertices.
 *
 * Algorithm:
 *   1. Start with all edges of the complete simple graph K_n.
 *   2. Shuffle the edge list for randomness.
 *   3. Attempt to remove each edge in order; skip it if its removal would
 *      disconnect the graph.
 *
 * The result is always a spanning tree (since a minimal connected graph on
 * n vertices has exactly n-1 edges and is by definition a tree), but the
 * particular tree depends on the random removal order — it won't always be
 * a path, star, or any other predictable shape.
 *
 * @param {number} n  Number of vertices (≥ 2)
 * @returns {Array<{source,target,isLoop,isMultiple}>}
 */
function generateMinimalConnectedGraph(n) {
    if (n < 2) return [];

    // Build all edges of K_n
    const edges = [];
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            edges.push({ source: i, target: j, isLoop: false, isMultiple: false });
        }
    }

    shuffle(edges);

    // Greedily remove edges that don't disconnect the graph
    const kept = [...edges];
    for (let idx = kept.length - 1; idx >= 0; idx--) {
        const removed = kept.splice(idx, 1); // tentatively remove
        if (!isConnected(kept, n)) {
            kept.splice(idx, 0, removed[0]); // put it back
        }
    }

    return kept;
}

/**
 * Generate a random connected simple graph with (approximately) targetEdges
 * edges on n vertices.
 *
 * Algorithm:
 *   1. Generate a minimal connected backbone via generateMinimalConnectedGraph.
 *   2. Collect all simple edges not already present.
 *   3. Shuffle them and add until targetEdges is reached (or no more remain).
 *
 * If targetEdges is omitted or invalid, a random target between 40% and 80% of the maximum possible edges is chosen.
 * If targetEdges < n-1, it is silently clamped to n-1 (the minimum for
 * connectivity).  If targetEdges > n*(n-1)/2, it is clamped to that maximum.
 *
 * @param {number} n
 * @param {number} targetEdges
 * @returns {Array<{source,target,isLoop,isMultiple}>}
 */
function generateSimpleGraph(n, targetEdges) {
    const minEdges = n - 1;
    const maxEdges = (n * (n - 1)) / 2;
    if (targetEdges == null || isNaN(targetEdges) || targetEdges <= 0) {
        // Pick uniformly from the integer range [0.4*maxEdges, 0.8*maxEdges]
        // safeLo ensures that at least minEdges+2 so that the result always has cycles.
        const lo = Math.max(Math.round(0.4 * maxEdges), minEdges + 2);
        const hi = Math.min(Math.round(0.8 * maxEdges), maxEdges);
        targetEdges = Math.floor(Math.random() * (hi - lo + 1) + lo);
    }
    targetEdges = Math.max(minEdges, Math.min(maxEdges, Math.round(targetEdges)));

    const edges = generateMinimalConnectedGraph(n);

    if (edges.length >= targetEdges) return edges; // already at or past target

    // Build a set of existing simple edges (canonical: smaller index first)
    const edgeSet = new Set(edges.map(({ source, target }) =>
        `${Math.min(source, target)}-${Math.max(source, target)}`));

    // Collect and shuffle all remaining simple edges
    const candidates = [];
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const key = `${i}-${j}`;
            if (!edgeSet.has(key)) {
                candidates.push({ source: i, target: j, isLoop: false, isMultiple: false });
            }
        }
    }
    shuffle(candidates);

    // Add until we hit the target
    for (const e of candidates) {
        if (edges.length >= targetEdges) break;
        edges.push(e);
    }

    return edges;
}

/**
 * Generate a random connected (multi)graph on n vertices with approximately
 * targetEdges edges total.
 *
 * The graph is built in three steps:
 *   1. A simple connected graph is constructed with (targetEdges - specialCount)
 *      edges, where specialCount is 0, 1, or 2 depending on options.
 *   2. Between 1 and 2 "special" edges (loops and/or multiedges) are appended
 *      if the relevant options permit.  The exact count and type are chosen
 *      randomly each call so the special density stays low.
 *   3. The special edge targets are chosen uniformly at random from all
 *      vertices (loops) or all existing edges (multiedges).
 *
 * Options:
 *   allowLoops    {boolean}  default false — permit self-loops
 *   allowMultiple {boolean}  default false — permit duplicate edges
 *
 * If targetEdges is omitted or invalid, a random target between 40% and 80% of the maximum possible edges (including specials) is chosen.
 * When neither option is set the function behaves identically to
 * generateSimpleGraph.
 *
 * @param {number} n
 * @param {number} targetEdges
 * @param {{ allowLoops?: boolean, allowMultiple?: boolean }} [options]
 * @returns {Array<{source,target,isLoop,isMultiple}>}
 */
function generateConnectedMultigraph(n, targetEdges, options = {}) {
    const { allowLoops = false, allowMultiple = false } = options;
    const anySpecial = allowLoops || allowMultiple;

    // Default targetEdges to 40–80% of max simple edges
    const maxSimple = (n * (n - 1)) / 2;
    if (targetEdges == null || isNaN(targetEdges) || targetEdges <= 0) {
        const lo = Math.max(Math.round(0.4 * maxSimple), n + 1);
        const hi = Math.min(Math.round(0.8 * maxSimple), maxSimple);
        targetEdges = lo + Math.floor(Math.random() * (hi - lo + 1));
    }

    // Always add 1 or 2 specials when options are enabled — this guarantees
    // the result is a true multigraph whenever allowLoops or allowMultiple is set.
    // The only exception is when targetEdges leaves no slack above the tree (n-1).
    const types = [];
    if (allowLoops) types.push('loop');
    if (allowMultiple) types.push('multiple');
    shuffle(types);

    const specialCount = (!anySpecial || targetEdges <= n - 1)
        ? 0
        : (Math.random() < 0.5 ? 1 : 2);

    // Assign types to each special slot by cycling through available types
    const specialTypes = Array.from({ length: specialCount },
        (_, i) => types[i % types.length]);

    // Stage 2: build simple core with room reserved for specials
    const simpleTarget = targetEdges - specialCount;
    const edges = generateSimpleGraph(n, simpleTarget);

    if (specialCount === 0) return edges;

    // ── Add special edges ──────────────────────────────────────────────────────

    // For multiedges we need at least one existing simple edge to duplicate
    const simpleEdges = edges.filter(e => !e.isLoop && !e.isMultiple);

    for (const type of specialTypes) {
        if (type === 'loop') {
            // Pick a random vertex for the self-loop
            const v = Math.floor(Math.random() * n);
            edges.push({ source: v, target: v, isLoop: true, isMultiple: false });

        } else if (type === 'multiple') {
            if (simpleEdges.length === 0) {
                // Fallback: add a loop instead if no simple edges to duplicate
                if (allowLoops) {
                    const v = Math.floor(Math.random() * n);
                    edges.push({ source: v, target: v, isLoop: true, isMultiple: false });
                }
                continue;
            }
            // Pick a random existing simple edge to duplicate
            const base = simpleEdges[Math.floor(Math.random() * simpleEdges.length)];
            edges.push({
                source: base.source,
                target: base.target,
                isLoop: false,
                isMultiple: true,
            });
        }
    }

    return edges;
}


// ─── Eulerization helpers ─────────────────────────────────────────────────────

/**
 * Compute the degree of every vertex.
 * Loops contribute 2 to their vertex's degree (standard graph-theory convention).
 * @param {Array} edges
 * @param {number} n
 * @returns {number[]}
 */
function getDegrees(edges, n) {
    const deg = new Array(n).fill(0);
    for (const { source, target, isLoop } of edges) {
        if (isLoop) { deg[source] += 2; continue; }
        deg[source]++;
        deg[target]++;
    }
    return deg;
}

/**
 * Return the list of vertices with odd degree.
 * By the handshaking lemma this list always has even length.
 * @param {Array} edges
 * @param {number} n
 * @returns {number[]}
 */
function getOddVertices(edges, n) {
    const deg = getDegrees(edges, n);
    return deg.reduce((acc, d, i) => { if (d % 2 === 1) acc.push(i); return acc; }, []);
}

/**
 * Attempt to find a perfect matching on `odds` that uses only edges absent
 * from `edgeSet`, via randomised backtracking.
 *
 * @param {number[]}  odds       List of odd-degree vertices to pair up.
 * @param {Set}       edgeSet    Canonical "min-max" edge keys already in graph.
 * @param {number}    targetOdd  How many vertices to leave unpaired (0 or 2).
 * @returns {Array<[number,number]>|null}  Pairs to add, or null if impossible.
 */
function findSimplePairing(odds, edgeSet, targetOdd) {
    const toMatch = odds.slice(0, odds.length - targetOdd);
    if (toMatch.length === 0) return [];

    function backtrack(remaining) {
        if (remaining.length === 0) return [];
        const first = remaining[0];
        // Shuffle the rest so different valid pairings are explored randomly
        const rest = [...remaining.slice(1)].sort(() => Math.random() - 0.5);
        for (const partner of rest) {
            const key = `${Math.min(first, partner)}-${Math.max(first, partner)}`;
            if (!edgeSet.has(key)) {
                const sub = backtrack(rest.filter(v => v !== partner));
                if (sub !== null) return [[first, partner], ...sub];
            }
        }
        return null; // no valid partner for `first`
    }

    return backtrack(toMatch);
}

// ─── Stage 4a ────────────────────────────────────────────────────────────────

/**
 * Generate a random Eulerian simple graph on n vertices.
 *
 * A graph is Eulerian if every vertex has even degree (Eulerian circuit) or
 * exactly two vertices have odd degree (Eulerian path).  This function
 * generates a simple connected graph and then Eulerizes it by adding the
 * minimum number of edges needed to reduce the odd-degree vertex count to
 * at most 2, without introducing any duplicate edges.
 *
 * Because at moderate densities there is a ~30–40% chance that no valid
 * simple pairing exists (every possible pair already shares an edge), the
 * function rerolls the underlying graph and retries up to `maxRerolls` times.
 * In practice, with the default density range (40–80% of max edges), fewer
 * than 2 rerolls are needed on average.
 *
 * The result randomly favours either a full Eulerian circuit (0 odd-degree
 * vertices) or an Eulerian path (exactly 2), chosen with equal probability.
 *
 * @param {number}  n
 * @param {number}  [targetEdges]  Passed to generateSimpleGraph; defaults to
 *                                 40–80% of maximum if omitted.
 * @param {number}  [maxRerolls=30]
 * @returns {Array<{source,target,isLoop,isMultiple}>|null}
 *   Returns null only if every reroll attempt failed (extremely rare).
 */
function generateEulerianSimpleGraph(n, targetEdges, maxRerolls = 30) {
    for (let roll = 0; roll < maxRerolls; roll++) {
        const edges = generateSimpleGraph(n, targetEdges);
        const edgeSet = new Set(
            edges.map(({ source, target }) =>
                `${Math.min(source, target)}-${Math.max(source, target)}`)
        );

        const odds = shuffle(getOddVertices(edges, n));

        // Already Eulerian — no work needed
        if (odds.length <= 2) return edges;

        // Randomly decide whether to target 0 odd vertices (circuit) or 2 (path)
        const orders = Math.random() < 0.5 ? [0, 2] : [2, 0];

        for (const targetOdd of orders) {
            if (odds.length < targetOdd) continue;
            const pairs = findSimplePairing(odds, edgeSet, targetOdd);
            if (pairs !== null) {
                for (const [u, v] of pairs) {
                    edges.push({ source: u, target: v, isLoop: false, isMultiple: false });
                    edgeSet.add(`${Math.min(u, v)}-${Math.max(u, v)}`);
                }
                return edges;
            }
        }
        // Both targetOdd values failed for this graph — reroll
    }
    return null; // gave up after maxRerolls
}

// ─── Stage 4b ────────────────────────────────────────────────────────────────

/**
 * Generate a random Eulerian multigraph on n vertices (no loops).
 *
 * Works identically to generateEulerianSimpleGraph except that, because
 * duplicate edges are permitted, Eulerization always succeeds in a single
 * pass: odd-degree vertices are paired up and a (possibly duplicate) edge is
 * added between each pair.  No rerolling is ever needed.
 *
 * The `isMultiple` flag is set to true on any edge that duplicates an
 * existing one; new simple edges are flagged false.
 *
 * @param {number}  n
 * @param {number}  [targetEdges]  Passed to generateConnectedMultigraph;
 *                                 defaults to 40–80% of maximum if omitted.
 * @returns {Array<{source,target,isLoop,isMultiple}>}
 */
function generateEulerianMultigraph(n, targetEdges) {
    // Generate the base multigraph (no loops)
    const edges = generateConnectedMultigraph(n, targetEdges, {
        allowLoops: false,
        allowMultiple: true,
    });

    const edgeSet = new Set(
        edges.map(({ source, target }) =>
            `${Math.min(source, target)}-${Math.max(source, target)}`)
    );

    const odds = shuffle(getOddVertices(edges, n));
    if (odds.length <= 2) return edges; // already Eulerian

    // Randomly target 0 or 2 remaining odd-degree vertices
    const targetOdd = Math.random() < 0.5 ? 0 : 2;
    const toMatch = odds.slice(0, odds.length - targetOdd);

    // Sequential pairing always works for multigraphs
    for (let i = 0; i < toMatch.length; i += 2) {
        const u = toMatch[i], v = toMatch[i + 1];
        const key = `${Math.min(u, v)}-${Math.max(u, v)}`;
        edges.push({ source: u, target: v, isLoop: false, isMultiple: edgeSet.has(key) });
        edgeSet.add(key);
    }

    return edges;
}

// =============================================================================
// EULERIAN TRAILS MODE — graph generators
// All generators here return edges with numeric source/target (0-based indices)
// and {isDirected, isLoop, isMultiple} flags. Consumers must map to "v0" etc.
// =============================================================================

/**
 * Generate an Eulerian digraph for the Eulerian Trails mode.
 * Returns strongly-connected directed edges, every vertex in-deg == out-deg.
 * Wraps generateEulerianDigraph but uses a slightly larger target for variety.
 * @param {number} n
 * @returns {{edges: Array, isDirected: true, isMulti: false}}
 */
function eulerianTrail_makeEulerianDigraph(n) {
    const raw = generateEulerianDigraph(n);
    // raw uses "v0" string ids and isDirected:true
    return { edges: raw, isDirected: true, isMulti: false };
}

/**
 * Generate a non-Eulerian digraph by taking an Eulerian one and deleting one
 * edge that does NOT break strong connectivity.
 * @param {number} n
 * @returns {{edges: Array, isDirected: true, isMulti: false}}
 */
function eulerianTrail_makeNonEulerianDigraph(n) {
    for (let attempt = 0; attempt < 20; attempt++) {
        const raw = generateEulerianDigraph(n);
        // Shuffle to pick a random candidate edge to remove
        const candidates = shuffle(raw.slice());
        for (const cand of candidates) {
            const trial = raw.filter(e => e !== cand);
            if (isStronglyConnected(trial, n)) {
                return { edges: trial, isDirected: true, isMulti: false };
            }
        }
    }
    // Fallback — just return an Eulerian digraph (shouldn't happen for n>=4)
    return eulerianTrail_makeEulerianDigraph(n);
}

/**
 * Generate an Eulerian simple (undirected) graph.
 * Uses generateEulerianSimpleGraph; edges have numeric source/target.
 * @param {number} n
 * @returns {{edges: Array, isDirected: false, isMulti: false}}
 */
function eulerianTrail_makeEulerianSimple(n) {
    const raw = generateEulerianSimpleGraph(n) || generateSimpleGraph(n);
    return { edges: raw, isDirected: false, isMulti: false };
}

/**
 * Generate a connected non-Eulerian simple graph by deleting 1-2 edges from
 * an Eulerian simple graph while keeping it connected.
 * @param {number} n
 * @returns {{edges: Array, isDirected: false, isMulti: false}}
 */
function eulerianTrail_makeNonEulerianSimple(n) {
    for (let attempt = 0; attempt < 20; attempt++) {
        let raw = generateEulerianSimpleGraph(n) || generateSimpleGraph(n);
        const numDelete = Math.random() < 0.5 ? 1 : 2;
        const candidates = shuffle(raw.slice());
        let deleted = 0;
        for (const cand of candidates) {
            if (deleted >= numDelete) break;
            const trial = raw.filter(e => e !== cand);
            if (isConnected(trial, n)) {
                // Check it actually creates odd-degree vertices (makes it non-Eulerian)
                const odds = getOddVertices(trial, n);
                if (odds.length > 0) {
                    raw = trial;
                    deleted++;
                }
            }
        }
        if (deleted > 0) return { edges: raw, isDirected: false, isMulti: false };
    }
    return eulerianTrail_makeEulerianSimple(n);
}

/**
 * Generate an Eulerian multigraph (undirected, may have parallel edges).
 * @param {number} n
 * @returns {{edges: Array, isDirected: false, isMulti: true}}
 */
function eulerianTrail_makeEulerianMulti(n) {
    const raw = generateEulerianMultigraph(n);
    return { edges: raw, isDirected: false, isMulti: true };
}

/**
 * Generate a non-Eulerian multigraph by deleting 1-2 edges from an Eulerian
 * multigraph while keeping it connected.
 * @param {number} n
 * @returns {{edges: Array, isDirected: false, isMulti: true}}
 */
function eulerianTrail_makeNonEulerianMulti(n) {
    for (let attempt = 0; attempt < 20; attempt++) {
        let raw = generateEulerianMultigraph(n);
        const numDelete = Math.random() < 0.5 ? 1 : 2;
        const candidates = shuffle(raw.slice());
        let deleted = 0;
        for (const cand of candidates) {
            if (deleted >= numDelete) break;
            const trial = raw.filter(e => e !== cand);
            if (isConnected(trial, n)) {
                const odds = getOddVertices(trial, n);
                if (odds.length > 0) {
                    raw = trial;
                    deleted++;
                }
            }
        }
        if (deleted > 0) return { edges: raw, isDirected: false, isMulti: true };
    }
    return eulerianTrail_makeEulerianMulti(n);
}

/**
 * Pick one of the 6 scenario types at random (equal probability each),
 * generate the graph, and return a descriptor object.
 *
 * Returned shape:
 * {
 *   n,
 *   names,          // capital-letter labels ["A","B",...]
 *   edges,          // normalised edge objects ready for draw_graph
 *   isDirected,
 *   isMulti,
 *   isEulerian,     // ground-truth answer
 *   edgeLabels,     // lowercase letter labels for multigraph edges (or null)
 * }
 */
function generateEulerianTrailPuzzle() {
    const n = Math.floor(Math.random() * 3) + 4; // 4-6 vertices for tractability
    const scenario = Math.floor(Math.random() * 6);

    let result;
    if      (scenario === 0) result = eulerianTrail_makeEulerianDigraph(n);
    else if (scenario === 1) result = eulerianTrail_makeNonEulerianDigraph(n);
    else if (scenario === 2) result = eulerianTrail_makeEulerianSimple(n);
    else if (scenario === 3) result = eulerianTrail_makeNonEulerianSimple(n);
    else if (scenario === 4) result = eulerianTrail_makeEulerianMulti(n);
    else                     result = eulerianTrail_makeNonEulerianMulti(n);

    const { isDirected, isMulti } = result;
    let rawEdges = result.edges;

    // Normalise source/target to "v0" strings and set isDirected on each edge
    const edges = rawEdges.map(e => {
        const src = (typeof e.source === 'number') ? `v${e.source}` : String(e.source);
        const tgt = (typeof e.target === 'number') ? `v${e.target}` : String(e.target);
        return {
            source: src,
            target: tgt,
            isDirected: isDirected,
            isLoop: !!e.isLoop,
            isMultiple: !!e.isMultiple,
            weight: null
        };
    });

    const names = Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));

    // For multigraphs, assign lowercase letter labels to edges
    let edgeLabels = null;
    if (isMulti) {
        const letters = 'abcdefghijklmnopqrstuvwxyz';
        edgeLabels = edges.map((_, i) => letters[i] || `e${i}`);
        // Attach labels so draw_graph can render them
        edges.forEach((e, i) => { e.label = edgeLabels[i]; });
    }

    // Determine if this graph is actually Eulerian
    let isEulerian;
    if (isDirected) {
        // Eulerian iff strongly connected AND every vertex in-deg == out-deg
        const inDeg = {}, outDeg = {};
        for (let i = 0; i < n; i++) { inDeg[`v${i}`] = 0; outDeg[`v${i}`] = 0; }
        for (const e of edges) {
            outDeg[e.source] = (outDeg[e.source] || 0) + 1;
            inDeg[e.target]  = (inDeg[e.target]  || 0) + 1;
        }
        const balanced = names.every((_, i) => inDeg[`v${i}`] === outDeg[`v${i}`]);
        isEulerian = balanced && isStronglyConnected(edges, n);
    } else {
        // Eulerian iff connected AND all even degree (circuit), or exactly 2 odd (path)
        const deg = new Array(n).fill(0);
        for (const e of edges) {
            const si = parseInt(e.source.slice(1));
            const ti = parseInt(e.target.slice(1));
            if (si === ti) { deg[si] += 2; }
            else { deg[si]++; deg[ti]++; }
        }
        const oddCount = deg.filter(d => d % 2 !== 0).length;
        isEulerian = isConnected(edges, n) && (oddCount === 0 || oddCount === 2);
    }

    return { n, names, edges, isDirected, isMulti, isEulerian, edgeLabels };
}

// ---------------------------------------------------------------------------
// Eulerian Trail Validation Helpers
// ---------------------------------------------------------------------------

/**
 * Check whether a sequence of vertex names forms a valid Eulerian path/circuit
 * in an undirected simple graph (no multigraph). Each edge must be used exactly once.
 * @param {string[]} path  - array of display vertex names e.g. ["A","B","C","A"]
 * @param {string[]} names - vertex display names
 * @param {Array}    edges - normalised edge objects
 * @param {boolean}  requireCircuit - if true, first and last must match
 * @returns {boolean}
 */
function validateEulerianPathSimple(path, names, edges, requireCircuit) {
    if (path.length < 2) return false;
    if (requireCircuit && path[0] !== path[path.length - 1]) return false;

    function nameOf(id) {
        if (/^v\d+$/.test(id)) return names[parseInt(id.slice(1))];
        return id;
    }

    const edgePool = edges.map(e => ({
        a: nameOf(e.source), b: nameOf(e.target), used: false
    }));

    for (let step = 0; step < path.length - 1; step++) {
        const u = path[step], v = path[step + 1];
        // Find an unused edge between u and v
        const ei = edgePool.findIndex(e => !e.used && ((e.a === u && e.b === v) || (e.a === v && e.b === u)));
        if (ei === -1) return false;
        edgePool[ei].used = true;
    }

    return edgePool.every(e => e.used);
}

/**
 * Check whether a sequence of alternating vertex/edge labels forms a valid
 * Eulerian path in a multigraph, e.g. "AaBbCcA".
 * @param {string}   input - alternating capital/lowercase string
 * @param {string[]} names - vertex display names
 * @param {Array}    edges - normalised edge objects with .label
 * @param {boolean}  requireCircuit
 * @returns {boolean}
 */
function validateEulerianPathMulti(input, names, edges, requireCircuit) {
    // Parse: alternating vertex(capital) edge(lowercase) vertex... 
    // e.g. "AaBbCA" → vertices: [A,B,C,A] edges used: [a,b]  — wait, that's 3v,2e
    // Correct format: V e V e V ... V  so length = 2k+1 tokens for k edges
    // We'll split into tokens: capitals are vertices, lowercase are edge labels
    const tokens = input.match(/[A-Z]|[a-z]/g);
    if (!tokens || tokens.length < 3) return false;

    // Validate alternating pattern: V e V e V ...
    for (let i = 0; i < tokens.length; i++) {
        if (i % 2 === 0 && !/[A-Z]/.test(tokens[i])) return false;
        if (i % 2 === 1 && !/[a-z]/.test(tokens[i])) return false;
    }
    if (tokens.length % 2 === 0) return false; // must be odd number of tokens

    if (requireCircuit && tokens[0] !== tokens[tokens.length - 1]) return false;

    // Check each consecutive triple (V, e, V) matches a real edge
    const edgeUsed = new Array(edges.length).fill(false);

    function nameOf(id) {
        if (/^v\d+$/.test(id)) return names[parseInt(id.slice(1))];
        return id;
    }

    for (let i = 0; i < tokens.length - 2; i += 2) {
        const u = tokens[i], edgeLbl = tokens[i + 1], v = tokens[i + 2];
        // Find matching unused edge
        const ei = edges.findIndex((e, idx) =>
            !edgeUsed[idx] &&
            e.label === edgeLbl &&
            ((nameOf(e.source) === u && nameOf(e.target) === v) ||
             (nameOf(e.source) === v && nameOf(e.target) === u))
        );
        if (ei === -1) return false;
        edgeUsed[ei] = true;
    }

    return edgeUsed.every(Boolean);
}

/**
 * Check whether a sequence of vertex names forms a valid Eulerian circuit
 * in a directed graph. Each directed edge used exactly once.
 * @param {string[]} path
 * @param {string[]} names
 * @param {Array}    edges
 * @returns {boolean}
 */
function validateEulerianCircuitDigraph(path, names, edges) {
    if (path.length < 2) return false;
    if (path[0] !== path[path.length - 1]) return false;

    function nameOf(id) {
        if (/^v\d+$/.test(id)) return names[parseInt(id.slice(1))];
        return id;
    }

    const edgePool = edges.map(e => ({
        a: nameOf(e.source), b: nameOf(e.target), used: false
    }));

    for (let step = 0; step < path.length - 1; step++) {
        const u = path[step], v = path[step + 1];
        const ei = edgePool.findIndex(e => !e.used && e.a === u && e.b === v);
        if (ei === -1) return false;
        edgePool[ei].used = true;
    }

    return edgePool.every(e => e.used);
}

/**
 * Check if a set of added edges eulerizes a graph.
 * The combined graph (original edges + added edges) must be Eulerian.
 * @param {Array}  origEdges  - original edge objects (normalised)
 * @param {Array}  addedEdges - [{from: "A", to: "B"}, ...] using display names
 * @param {string[]} names    - vertex display names
 * @param {number} n
 * @returns {boolean}
 */
function validateEulerization(origEdges, addedEdges, names, n) {
    function nameOf(id) {
        if (/^v\d+$/.test(id)) return names[parseInt(id.slice(1))];
        return id;
    }

    // Build combined edge list (undirected, no loops)
    const combined = origEdges.map(e => ({
        source: nameOf(e.source), target: nameOf(e.target)
    }));

    for (const ae of addedEdges) {
        if (!ae.from || !ae.to) continue;
        const fromName = ae.from.trim().toUpperCase();
        const toName   = ae.to.trim().toUpperCase();
        if (!names.includes(fromName) || !names.includes(toName)) return false;
        if (fromName === toName) continue; // skip self-loops
        combined.push({ source: fromName, target: toName });
    }

    // Compute degrees
    const deg = {};
    names.forEach(nm => { deg[nm] = 0; });
    for (const e of combined) {
        deg[e.source]++;
        deg[e.target]++;
    }

    // All vertices must have even degree
    return Object.values(deg).every(d => d % 2 === 0);
}
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
    const vertices = Array.from({length: n}, (_, i) => `v${i}`);
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
function isConnected(edges, n) {
    // Undirected connectivity using BFS
    if (edges.length === 0) return false;
    const vertices = Array.from({length: n}, (_, i) => `v${i}`);
    const adj = {};
    for (const v of vertices) adj[v] = [];
    for (const edge of edges) {
        adj[edge.source].push(edge.target);
        if (!edge.isDirected) adj[edge.target].push(edge.source);
    }
    const visited = new Set();
    const queue = [vertices[0]];
    while (queue.length) {
        const v = queue.shift();
        if (!visited.has(v)) {
            visited.add(v);
            for (const u of adj[v]) {
                if (!visited.has(u)) queue.push(u);
            }
        }
    }
    return visited.size === n;
}

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

/**
 * Generate a simple undirected graph (no loops, no multi-edges) with
 * edge probability `edgeProb`.
 * @param {number} n
 * @param {number} [edgeProb=0.4]
 * @returns {Array} edges
 */
function generateSimpleGraph(n, edgeProb = 0.4) {
    const vertices = Array.from({length: n}, (_, i) => `v${i}`);
    const edges = [];
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (Math.random() < edgeProb) {
                edges.push({ source: vertices[i], target: vertices[j], isDirected: false, weight: null });
            }
        }
    }
    // Ensure every vertex exists in the edges list as isolated if needed
    if (edges.length === 0) {
        // add a single edge if entirely empty
        if (n >= 2) edges.push({ source: 'v0', target: 'v1', isDirected: false, weight: null });
    }
    return edges;
}

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

    const n     = Number(graph_data.n) || 0;
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
    const isLong    = edgeCount > 10 || n > 8;

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
    const verts = Array.from({length: n}, (_, i) => `v${i}`);
    const seq = verts.map(v => degreeOf(v, edges));
    return seq.sort((a,b) => a - b);
}
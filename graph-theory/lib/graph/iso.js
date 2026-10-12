// =============================================================================
// graph/iso.js  –  Isomorphism: invariants and checking a witness
// =============================================================================
//
// Part of lib/graph/: see the top of core.js.
// =============================================================================

import { vertexId, vertexIndex, vertexLabel, degreeSequence, componentCount } from './core.js';

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

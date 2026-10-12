// =============================================================================
// graph/coloring.js  –  Vertex coloring
// =============================================================================
//
// Part of lib/graph/: see the top of core.js.
// =============================================================================

import { vertexId, vertexIndex, _buildAdjList } from './core.js';

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

// Puzzle-specific graph-coloring generation lives in modes/coloring.js
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

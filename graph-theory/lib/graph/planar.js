// =============================================================================
// graph/planar.js  –  Planar and non-planar graphs, faces
// =============================================================================
//
// Part of lib/graph/: see the top of core.js.
// =============================================================================

import { vertexIndex, makeLabels, shuffle, vertexCount, edgeCount } from './core.js';
import { _indexEdgesConnected, _toEdges } from './generate.js';

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

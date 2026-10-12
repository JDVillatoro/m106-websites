// Small hand-checked graphs for the unit tests of graph-theory/lib/graph/.

import { makeLabels, vertexId } from '../../graph-theory/lib/graph/core.js';

/** Build a graph object from index pairs, e.g. graph(3, [[0, 1], [1, 2]]). */
export function graph(n, pairs, { directed = false } = {}) {
  return {
    n,
    names: makeLabels(n),
    directed,
    edgeLabel: null,
    edges: pairs.map(([s, t]) => ({ source: vertexId(s), target: vertexId(t), label: null })),
  };
}

export const triangle = graph(3, [[0, 1], [1, 2], [2, 0]]);
export const path3 = graph(3, [[0, 1], [1, 2]]);
export const square = graph(4, [[0, 1], [1, 2], [2, 3], [3, 0]]);
export const k4 = graph(4, [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]]);
// Triangle with a pendant vertex: v0-v1-v2-v0, v2-v3.
export const kite = graph(4, [[0, 1], [1, 2], [2, 0], [2, 3]]);

export const REPEAT = 25;   // runs per random generator check

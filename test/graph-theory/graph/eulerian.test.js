// Tests for graph-theory/lib/graph/eulerian.js: small hand-checked examples,
// plus checks that the random generators always produce what they promise.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as g from '../../../graph-theory/lib/graph/eulerian.js';
import { isConnected, getOddVertices, isMultiGraph } from '../../../graph-theory/lib/graph/core.js';
import { graph, triangle, path3, k4, kite, REPEAT } from '../../helpers/small-graphs.js';

test('vertices with in-degree ≠ out-degree', () => {
  const directed = graph(3, [[0, 1], [0, 2], [1, 2]], { directed: true });
  assert.deepEqual(g.getMismatchedVertices(directed), ['A', 'C']);
});

test('Eulerizing: fewest duplicated edges', () => {
  assert.equal(g.minEulerizeEdges(triangle), 0);
  assert.equal(g.minEulerizeEdges(path3), 2);   // duplicate both edges
  assert.equal(g.minEulerizeEdges(k4), 2);      // four odd vertices, matched by two edges
  assert.equal(g.minEulerizeEdges(kite), 1);    // duplicate v2-v3
});

test('Eulerian simple graph: connected, all degrees even, no repeated edges', () => {
  for (let i = 0; i < REPEAT; i++) {
    const r = g.generateEulerianSimpleGraph(6, 8);
    assert.equal(isConnected(r), true);
    assert.deepEqual(getOddVertices(r), []);
    assert.equal(isMultiGraph(r), false);
  }
});

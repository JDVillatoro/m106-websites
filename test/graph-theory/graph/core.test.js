// Tests for graph-theory/lib/graph/core.js: small hand-checked examples.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as g from '../../../graph-theory/lib/graph/core.js';
import { graph, triangle, square, k4, kite } from '../../helpers/small-graphs.js';

test('vertex ids and labels', () => {
  assert.equal(g.vertexId(3), 'v3');
  assert.equal(g.vertexIndex('v12'), 12);
  assert.deepEqual(g.makeLabels(3), ['A', 'B', 'C']);
  assert.deepEqual(g.makeLabels(28).slice(25), ['Z', 'AA', 'AB']);
  assert.equal(g.vertexLabel('v1', ['A', 'B']), 'B');
  assert.equal(g.vertexLabel('v5', ['A', 'B']), 'v5');
});

test('degrees', () => {
  assert.deepEqual(g.getDegrees(kite), [2, 2, 3, 1]);
  assert.deepEqual(g.degreeSequence(kite), [1, 2, 2, 3]);
  assert.deepEqual(g.getOddVertices(kite), [2, 3]);
  // A loop adds 2 to its vertex's degree.
  assert.deepEqual(g.getDegrees(graph(2, [[0, 0], [0, 1]])), [3, 1]);

  const directed = graph(3, [[0, 1], [0, 2], [1, 2]], { directed: true });
  assert.deepEqual(g.getDirectedDegrees(directed), { inDeg: [0, 1, 2], outDeg: [2, 1, 0] });
});

test('connectivity', () => {
  assert.equal(g.isConnected(triangle), true);
  assert.equal(g.isConnected(graph(4, [[0, 1], [2, 3]])), false);
  assert.equal(g.componentCount(graph(5, [[0, 1], [2, 3]])), 3);

  const cycle = graph(3, [[0, 1], [1, 2], [2, 0]], { directed: true });
  const oneWay = graph(3, [[0, 1], [1, 2]], { directed: true });
  assert.equal(g.isStronglyConnected(cycle), true);
  assert.equal(g.isStronglyConnected(oneWay), false);
});

test('multigraphs', () => {
  assert.equal(g.isMultiGraph(triangle), false);
  assert.equal(g.isMultiGraph(graph(2, [[0, 1], [1, 0]])), true);
  assert.equal(g.isMultiGraph(graph(2, [[0, 1], [1, 0]], { directed: true })), false);
});

test('counts', () => {
  assert.equal(g.vertexCount(k4), 4);
  assert.equal(g.edgeCount(k4), 6);
});

test('cut vertices, leaves, bipartite parts', () => {
  assert.deepEqual(g.cutVertices(kite), [2]);
  assert.deepEqual(g.cutVertices(square), []);
  assert.deepEqual(g.leafVertices(kite), [3]);
  assert.deepEqual(g.bipartiteParts(square), [[0, 2], [1, 3]]);
  assert.equal(g.bipartiteParts(triangle), null);
});

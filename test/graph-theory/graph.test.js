// Tests for graph-theory/lib/graph.js: small hand-checked examples, plus
// checks that the random generators always produce what they promise.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as g from '../../graph-theory/lib/graph.js';

/** Build a graph object from index pairs, e.g. graph(3, [[0, 1], [1, 2]]). */
function graph(n, pairs, { directed = false } = {}) {
  return {
    n,
    names: g.makeLabels(n),
    directed,
    edgeLabel: null,
    edges: pairs.map(([s, t]) => ({ source: g.vertexId(s), target: g.vertexId(t), label: null })),
  };
}

const triangle = graph(3, [[0, 1], [1, 2], [2, 0]]);
const path3 = graph(3, [[0, 1], [1, 2]]);
const square = graph(4, [[0, 1], [1, 2], [2, 3], [3, 0]]);
const k4 = graph(4, [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]]);
// Triangle with a pendant vertex: v0-v1-v2-v0, v2-v3.
const kite = graph(4, [[0, 1], [1, 2], [2, 0], [2, 3]]);

const REPEAT = 25;   // runs per random generator check

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
  assert.deepEqual(g.getMismatchedVertices(directed), ['A', 'C']);
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

test('Eulerizing: fewest duplicated edges', () => {
  assert.equal(g.minEulerizeEdges(triangle), 0);
  assert.equal(g.minEulerizeEdges(path3), 2);   // duplicate both edges
  assert.equal(g.minEulerizeEdges(k4), 2);      // four odd vertices, matched by two edges
  assert.equal(g.minEulerizeEdges(kite), 1);    // duplicate v2-v3
});

test('counts, faces and triangles', () => {
  assert.equal(g.vertexCount(k4), 4);
  assert.equal(g.edgeCount(k4), 6);
  assert.equal(g.faceCount(k4), 4);   // Euler: 2 - 4 + 6
  assert.equal(g.countTriangles(k4), 4);
  assert.equal(g.countTriangles(square), 0);
});

test('chromatic number', () => {
  assert.equal(g.chromaticNumber(graph(3, [])), 1);
  assert.equal(g.chromaticNumber(square), 2);
  assert.equal(g.chromaticNumber(triangle), 3);
  assert.equal(g.chromaticNumber(k4), 4);
});

test('coloring check', () => {
  const ok = g.validateGraphColoring(square, { v0: 'red', v1: 'blue', v2: 'red', v3: 'blue' }, 2);
  assert.equal(ok.ok, true);
  const clash = g.validateGraphColoring(square, { v0: 'red', v1: 'red', v2: 'blue', v3: 'blue' }, 2);
  assert.equal(clash.ok, false);
  assert.equal(clash.reason, 'conflict');
  const missing = g.validateGraphColoring(square, { v0: 'red' }, 2);
  assert.equal(missing.ok, false);
  assert.equal(missing.reason, 'incomplete');
});

test('isomorphism helpers', () => {
  // Relabel the kite by a permutation: the invariants don't change.
  const moved = g.applyPermutation(kite, [3, 1, 0, 2]);
  assert.deepEqual(g.graphInvariants(moved), g.graphInvariants(kite));
});

test('cut vertices, leaves, bipartite parts', () => {
  assert.deepEqual(g.cutVertices(kite), [2]);
  assert.deepEqual(g.cutVertices(square), []);
  assert.deepEqual(g.leafVertices(kite), [3]);
  assert.deepEqual(g.bipartiteParts(square), [[0, 2], [1, 3]]);
  assert.equal(g.bipartiteParts(triangle), null);
});

test('random graph: requested number of components', () => {
  for (let i = 0; i < REPEAT; i++) {
    const r = g.generateRandomGraph(6, 2);
    assert.equal(r.n, 6);
    assert.equal(g.componentCount(r), 2);
  }
});

test('Eulerian simple graph: connected, all degrees even, no repeated edges', () => {
  for (let i = 0; i < REPEAT; i++) {
    const r = g.generateEulerianSimpleGraph(6, 8);
    assert.equal(g.isConnected(r), true);
    assert.deepEqual(g.getOddVertices(r), []);
    assert.equal(g.isMultiGraph(r), false);
  }
});

test('planar graph: connected, at most 3n - 6 edges', () => {
  for (let i = 0; i < REPEAT; i++) {
    const n = 7;
    const r = g.generatePlanarGraph(n, 1.14, 1.55);
    assert.equal(g.isConnected(r), true);
    assert.ok(g.edgeCount(r) <= 3 * n - 6, `${g.edgeCount(r)} edges`);
  }
});

test('non-planar graph: contains enough edges for K5 or K3,3', () => {
  for (let i = 0; i < REPEAT; i++) {
    assert.ok(g.edgeCount(g.generateNonPlanarGraph(7, 'K5', 3, 1.14, 1.55)) >= 10);
    assert.ok(g.edgeCount(g.generateNonPlanarGraph(7, 'K3,3', 3, 1.14, 1.55)) >= 9);
  }
});

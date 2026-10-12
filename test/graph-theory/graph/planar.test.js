// Tests for graph-theory/lib/graph/planar.js: faces, plus checks that the
// random generators always produce what they promise.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as g from '../../../graph-theory/lib/graph/planar.js';
import { isConnected, edgeCount } from '../../../graph-theory/lib/graph/core.js';
import { k4, REPEAT } from '../../helpers/small-graphs.js';

test('faces', () => {
  assert.equal(g.faceCount(k4), 4);   // Euler: 2 - 4 + 6
});

test('planar graph: connected, at most 3n - 6 edges', () => {
  for (let i = 0; i < REPEAT; i++) {
    const n = 7;
    const r = g.generatePlanarGraph(n, 1.14, 1.55);
    assert.equal(isConnected(r), true);
    assert.ok(edgeCount(r) <= 3 * n - 6, `${edgeCount(r)} edges`);
  }
});

test('non-planar graph: contains enough edges for K5 or K3,3', () => {
  for (let i = 0; i < REPEAT; i++) {
    assert.ok(edgeCount(g.generateNonPlanarGraph(7, 'K5', 3, 1.14, 1.55)) >= 10);
    assert.ok(edgeCount(g.generateNonPlanarGraph(7, 'K3,3', 3, 1.14, 1.55)) >= 9);
  }
});

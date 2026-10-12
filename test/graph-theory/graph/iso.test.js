// Tests for graph-theory/lib/graph/iso.js: small hand-checked examples.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as g from '../../../graph-theory/lib/graph/iso.js';
import { square, k4, kite } from '../../helpers/small-graphs.js';

test('triangles', () => {
  assert.equal(g.countTriangles(k4), 4);
  assert.equal(g.countTriangles(square), 0);
});

test('isomorphism helpers', () => {
  // Relabel the kite by a permutation: the invariants don't change.
  const moved = g.applyPermutation(kite, [3, 1, 0, 2]);
  assert.deepEqual(g.graphInvariants(moved), g.graphInvariants(kite));
});

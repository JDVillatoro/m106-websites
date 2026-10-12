// Tests for graph-theory/lib/graph/coloring.js: small hand-checked examples.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as g from '../../../graph-theory/lib/graph/coloring.js';
import { graph, triangle, square, k4 } from '../../helpers/small-graphs.js';

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

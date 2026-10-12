// Tests for graph-theory/lib/render.js: the parts that don't need a page.
// Drawing is checked by the browser tests of each mode.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeLabels, vertexId } from '../../graph-theory/lib/graph/core.js';
import { graphToDescription } from '../../graph-theory/lib/render.js';

test('screen reader description', () => {
  const path3 = {
    n: 3, names: makeLabels(3), directed: false, edgeLabel: null,
    edges: [[0, 1], [1, 2]].map(([s, t]) => ({ source: vertexId(s), target: vertexId(t), label: null })),
  };
  const { text, isLong } = graphToDescription(path3);
  assert.equal(isLong, false);
  assert.match(text, /^A graph with 3 vertices and 2 edges\./);
  assert.match(text, /An edge between A and B\./);
});

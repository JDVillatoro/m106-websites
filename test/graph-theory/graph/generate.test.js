// Tests for graph-theory/lib/graph/generate.js: checks that the random
// generators always produce what they promise.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as g from '../../../graph-theory/lib/graph/generate.js';
import { componentCount } from '../../../graph-theory/lib/graph/core.js';
import { REPEAT } from '../../helpers/small-graphs.js';

test('random graph: requested number of components', () => {
  for (let i = 0; i < REPEAT; i++) {
    const r = g.generateRandomGraph(6, 2);
    assert.equal(r.n, 6);
    assert.equal(componentCount(r), 2);
  }
});

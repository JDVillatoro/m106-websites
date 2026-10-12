// Tests for game-theory/lib/game.js, using small games checked by hand.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as gt from '../../game-theory/lib/game.js';

/** Build payoffs from rows of [p1, p2] pairs. */
function payoffs(rows) {
  const out = {};
  rows.forEach((row, i) => row.forEach(([p1, p2], j) => { out[`${i}-${j}`] = { p1, p2 }; }));
  return out;
}

// Rows/columns: 0 = cooperate, 1 = defect.
const prisoners = payoffs([
  [[3, 3], [0, 5]],
  [[5, 0], [1, 1]],
]);
const pennies = payoffs([
  [[1, -1], [-1, 1]],
  [[-1, 1], [1, -1]],
]);
// Battle of the sexes: two pure equilibria (0-0 and 1-1).
const battle = payoffs([
  [[2, 1], [0, 0]],
  [[0, 0], [1, 2]],
]);

const REPEAT = 25;

test('best responses', () => {
  // Player 1 plays row 0; Player 2's best response is column 1.
  assert.deepEqual(gt.calculateBestResponses(prisoners, 2, 2, 1, 0), [1]);
  // Player 2 plays column 1; Player 1's best response is row 1.
  assert.deepEqual(gt.calculateBestResponses(prisoners, 2, 2, 2, 1), [1]);
  // Ties: both columns give Player 2 the same payoff.
  const tie = payoffs([[[0, 4], [0, 4]], [[0, 1], [0, 2]]]);
  assert.deepEqual(gt.calculateBestResponses(tie, 2, 2, 1, 0), [0, 1]);
});

test('dominance', () => {
  // Defect (row 1) strictly dominates cooperate (row 0) for Player 1.
  assert.equal(gt.getDominanceRelation(prisoners, 2, 2, 1, 0, 1), 'B-strict');
  assert.equal(gt.getDominanceRelation(prisoners, 2, 2, 2, 1, 0), 'A-strict');
  assert.equal(gt.hasStrictDominance(prisoners, 2, 2), true);
  assert.equal(gt.hasStrictDominance(pennies, 2, 2), false);
  assert.equal(gt.getDominanceRelation(pennies, 2, 2, 1, 0, 1), 'none');

  // Row 0 is never worse and sometimes better: weak dominance.
  const weak = payoffs([[[1, 0], [1, 0]], [[1, 0], [0, 0]]]);
  assert.equal(gt.getDominanceRelation(weak, 2, 2, 1, 0, 1), 'A-weak');
});

test('pure Nash equilibria', () => {
  assert.deepEqual([...gt.calculateNashEquilibria(prisoners, 2, 2)], ['1-1']);
  assert.deepEqual([...gt.calculateNashEquilibria(battle, 2, 2)].sort(), ['0-0', '1-1']);
  assert.equal(gt.calculateNashEquilibria(pennies, 2, 2).size, 0);
});

test('expected value against a mixed strategy', () => {
  // Player 1 cooperates against a 50/50 mix: 0.5 * 3 + 0.5 * 0.
  assert.equal(gt.calculateExpectedValue(prisoners, 2, 2, 1, 0, [0.5, 0.5]), 1.5);
  // Player 2 plays column 1 against Player 1's (0.2, 0.8): 0.2 * 5 + 0.8 * 1.
  assert.ok(Math.abs(gt.calculateExpectedValue(prisoners, 2, 2, 2, 1, [0.2, 0.8]) - 1.8) < 1e-9);
});

test('indifference probabilities', () => {
  assert.equal(gt.calculateIndifferenceProbability(pennies, 1), 0.5);
  assert.equal(gt.calculateIndifferenceProbability(pennies, 2), 0.5);
  // Player 1 plays row 0 with p = 2/3, so Player 2 gets 2/3 from either column.
  assert.ok(Math.abs(gt.calculateIndifferenceProbability(battle, 1) - 2 / 3) < 1e-9);
  assert.ok(Math.abs(gt.calculateIndifferenceProbability(battle, 2) - 1 / 3) < 1e-9);
  // All payoffs equal: no unique answer.
  const flat = payoffs([[[1, 1], [1, 1]], [[1, 1], [1, 1]]]);
  assert.equal(gt.calculateIndifferenceProbability(flat, 1), null);
});

test('random payoffs stay in range', () => {
  const p = gt.generateRandomPayoffs(3, 4, -2, 2);
  assert.equal(Object.keys(p).length, 12);
  for (const { p1, p2 } of Object.values(p)) {
    assert.ok(Number.isInteger(p1) && p1 >= -2 && p1 <= 2);
    assert.ok(Number.isInteger(p2) && p2 >= -2 && p2 <= 2);
  }
});

test('mixed strategies: tenths that add up to 1', () => {
  for (let i = 0; i < REPEAT; i++) {
    const mix = gt.generateMixedStrategy(3);
    assert.equal(mix.length, 3);
    assert.ok(mix.every(x => x >= 0 && Math.abs(x * 10 - Math.round(x * 10)) < 1e-9), String(mix));
    assert.ok(Math.abs(mix.reduce((a, b) => a + b, 0) - 1) < 1e-9, String(mix));
  }
});

test('2x2 games without a pure Nash equilibrium', () => {
  for (let i = 0; i < REPEAT; i++) {
    assert.equal(gt.calculateNashEquilibria(gt.generate2x2WithoutPureNash(), 2, 2).size, 0);
  }
});

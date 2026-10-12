// Tests for the fraction helpers in shared/js/math.js.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFraction, decimalToFraction, plainMath } from '../../shared/js/math.js';
import { generate2x2WithoutPureNash, calculateIndifferenceProbability } from '../../game-theory/lib/game.js';

test('parseFraction', () => {
  assert.equal(parseFraction('1/2'), 0.5);
  assert.equal(parseFraction(' 3 / 4 '), 0.75);
  for (const bad of ['', '0.5', '1', '1/0', 'a/b', '1/2/3']) assert.equal(parseFraction(bad), null, bad);
});

test('decimalToFraction is exact', () => {
  assert.equal(decimalToFraction(0.5), '1/2');
  assert.equal(decimalToFraction(2 / 3), '2/3');
  assert.equal(decimalToFraction(7 / 13), '7/13');   // the old version said 6/11
  assert.equal(decimalToFraction(5 / 17), '5/17');   // and 2/7 here
  // Every indifference answer comes out exactly.
  for (let i = 0; i < 500; i++) {
    const p = generate2x2WithoutPureNash();
    for (const who of [1, 2]) {
      const q = calculateIndifferenceProbability(p, who);
      if (q === null || q < 0 || q > 1) continue;
      assert.ok(Math.abs(parseFraction(decimalToFraction(q)) - q) < 1e-9, `${q} → ${decimalToFraction(q)}`);
    }
  }
});

test('plainMath', () => {
  assert.equal(plainMath('\\(A_{1}\\)'), 'A1');
  assert.equal(plainMath('\\(\\text{Rock}\\)'), 'Rock');
  assert.equal(plainMath('\\(X\\)'), 'X');
});

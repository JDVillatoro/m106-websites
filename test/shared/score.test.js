// Tests for the score (shared/js/score.js) and how it is shown.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createScore, describeScore } from '../../shared/js/score.js';

test('a score as text: points out of questions', () => {
  assert.equal(describeScore({ questions: 0, points: 0 }), 'No score');
  assert.equal(describeScore({ questions: 4, points: 3 }), '3 / 4 points');
  assert.equal(describeScore({ questions: 4, points: 2.5 }), '2.5 / 4 points');
  assert.equal(describeScore({ questions: 3, points: 0.1 + 0.2 }), '0.3 / 3 points');
});

test('scores are saved, and parts of a question add up', () => {
  const saved = new Map();
  const storage = { get: (k, d) => saved.get(k) ?? d, set: (k, v) => saved.set(k, v) };
  const score = createScore(storage);
  score.record(0.5);
  score.addPoints(0.5);
  score.record(0);
  assert.deepEqual(saved.get('score'), { questions: 2, points: 1 });
  assert.equal(describeScore(createScore(storage)), '1 / 2 points');
  score.reset();
  assert.equal(describeScore(score), 'No score');
});

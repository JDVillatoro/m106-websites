// Indifference mode (game-theory/modes/indifference.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateIndifferenceProblem } from '../../game-theory/modes/indifference.js';
import { calculateNashEquilibria } from '../../game-theory/lib/game.js';
import { useBrowser, checkScoreSavedAndReset } from '../helpers/browser.js';
import { matrixOnScreen } from '../helpers/matrix-on-screen.js';

test('problems: no pure equilibrium, and the probability makes the other player indifferent', () => {
  for (let i = 0; i < 200; i++) {
    const { payoffs: P, mixingPlayer, probability: q } = generateIndifferenceProblem();
    assert.equal(calculateNashEquilibria(P, 2, 2).size, 0);
    assert.ok(q > 0 && q < 1);
    // Expected payoffs of the other player's two strategies are equal.
    const ev = mixingPlayer === 1
      ? [0, 1].map(j => q * P[`0-${j}`].p2 + (1 - q) * P[`1-${j}`].p2)
      : [0, 1].map(i => q * P[`${i}-0`].p1 + (1 - q) * P[`${i}-1`].p1);
    assert.ok(Math.abs(ev[0] - ev[1]) < 1e-9);
  }
});

const site = useBrowser();

/** The answer as fractions [p, 1 - p], computed with integers from the matrix. */
async function answer(page) {
  const mixing = Number((await page.locator('.question-text').innerText()).match(/for Player (\d)/)[1]);
  const { payoffs: P } = await matrixOnScreen(page);
  // Other player's payoffs: a, b for their first strategy, c, d for their second.
  const [a, b, c, d] = mixing === 1
    ? [P['0-0'].p2, P['1-0'].p2, P['0-1'].p2, P['1-1'].p2]
    : [P['0-0'].p1, P['0-1'].p1, P['1-0'].p1, P['1-1'].p1];
  // p·a + (1−p)·b = p·c + (1−p)·d  ⇒  p = (d − b) / (a − b − c + d)
  let num = d - b, den = a - b - c + d;
  if (den < 0) { num = -num; den = -den; }
  return [`${num}/${den}`, `${den - num}/${den}`, num / den];
}

test('right, wrong, bad input; scoring and reset', async () => {
  const { page, errors, close } = await site.openPage('game-theory/#indifference', { mathjax: false });
  await page.waitForSelector('.question-text strong');

  await page.fill('#indiff-1', '0.5');
  await page.fill('#indiff-2', '1/2');
  await page.press('#indiff-2', 'Enter');
  assert.match(await page.locator('.input-error').innerText(), /as fractions/);
  await page.fill('#indiff-1', '1/2');
  await page.fill('#indiff-2', '1/3');
  await page.press('#indiff-2', 'Enter');
  assert.match(await page.locator('.input-error').innerText(), /must sum to 1/);

  let [f1, f2] = await answer(page);
  await page.fill('#indiff-1', f1);
  await page.fill('#indiff-2', f2);
  await page.press('#indiff-2', 'Enter');
  assert.equal(await page.locator('.feedback-title').innerText(), 'Correct',
    await page.locator('.feedback-message').innerText());
  await page.click('.feedback-next');

  // Wrong (0 and 1 is never right: the answer is strictly between).
  const [, , p] = await answer(page);
  await page.fill('#indiff-1', '0/1');
  await page.fill('#indiff-2', '1/1');
  await page.press('#indiff-2', 'Enter');
  assert.equal(await page.locator('.feedback-title').innerText(), 'Incorrect');
  // The feedback shows the exact fraction (in lowest terms).
  const shown = (await page.locator('.feedback-message').innerText()).match(/is (\d+)\/(\d+)/);
  assert.ok(Math.abs(shown[1] / shown[2] - p) < 1e-9);

  await checkScoreSavedAndReset(page, 'Questions: 2 Points: 1 Score: 50%');
  assert.deepEqual(errors, []);
  await close();
});

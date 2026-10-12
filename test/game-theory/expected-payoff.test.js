// Expected Payoff mode (game-theory/modes/expected-payoff.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateExpectedPayoffProblem } from '../../game-theory/modes/expected-payoff.js';
import { useBrowser, checkScoreSavedAndReset } from '../helpers/browser.js';
import { matrixOnScreen, labelIndex } from '../helpers/matrix-on-screen.js';

test('problems: the answer is the probability-weighted payoff', () => {
  for (let i = 0; i < 200; i++) {
    const p = generateExpectedPayoffProblem();
    let sum = 0;
    p.mix.forEach((prob, k) => {
      const key = p.askedPlayer === 1 ? `${p.askedStrategy}-${k}` : `${k}-${p.askedStrategy}`;
      sum += prob * p.payoffs[key][p.askedPlayer === 1 ? 'p1' : 'p2'];
    });
    assert.ok(Math.abs(sum - p.answer) < 1e-9);
  }
});

const site = useBrowser();

/** Work out the answer from the question text and the matrix. */
async function answer(page) {
  const text = await page.locator('.question-text').innerText();
  const asked = Number(text.match(/What is Player (\d)/)[1]);
  const strategy = labelIndex(text.match(/play strategy (\\\(.+?\\\))/)[1]);
  const m = await matrixOnScreen(page);
  let sum = 0;
  for (const [, pct, label] of text.matchAll(/(\d+)% (\\\(.+?\\\))/g)) {
    const k = labelIndex(label);
    const key = asked === 1 ? `${strategy}-${k}` : `${k}-${strategy}`;
    sum += Number(pct) / 100 * m.payoffs[key][asked === 1 ? 'p1' : 'p2'];
  }
  return sum;
}

test('right, wrong, empty; scoring and reset', async () => {
  const { page, errors, close } = await site.openPage('game-theory/#expected-payoff', { mathjax: false });
  await page.waitForSelector('.question-text strong');

  await page.press('#ep-answer', 'Enter');
  assert.equal(await page.locator('.input-error').innerText(), 'Enter a number.');

  await page.fill('#ep-answer', (await answer(page)).toFixed(2));
  await page.press('#ep-answer', 'Enter');
  assert.equal(await page.locator('.feedback-title').innerText(), 'Correct',
    await page.locator('.feedback-message').innerText());
  await page.click('.feedback-next');

  const right = await answer(page);
  await page.fill('#ep-answer', String(right + 1));
  await page.press('#ep-answer', 'Enter');
  assert.equal(await page.locator('.feedback-title').innerText(), 'Incorrect');
  assert.equal(await page.locator('.feedback-message').innerText(), `The correct expected payoff is ${right.toFixed(2)}.`);

  await checkScoreSavedAndReset(page, 'Questions: 2 Points: 1 Score: 50%');
  assert.deepEqual(errors, []);
  await close();
});

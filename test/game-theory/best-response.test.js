// Best Response mode (game-theory/modes/best-response.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateBestResponses } from '../../game-theory/lib/game.js';
import { generateBestResponseProblem } from '../../game-theory/modes/best-response.js';
import { useBrowser, scoreText, checkScoreSavedAndReset } from '../helpers/browser.js';
import { matrixOnScreen, labelIndex } from '../helpers/matrix-on-screen.js';

test('problems: the best responses are right', () => {
  for (let i = 0; i < 200; i++) {
    const p = generateBestResponseProblem();
    assert.deepEqual(p.best, calculateBestResponses(p.payoffs, p.rows, p.cols, p.fixedPlayer, p.fixedIndex));
    assert.ok(p.best.length >= 1);
  }
});

const site = useBrowser();

/** The question on screen and its answer. */
async function onScreen(page) {
  const prompt = await page.locator('.prompt').innerText();
  const [, fixed, label] = prompt.match(/^Player (\d) picks (\\\(.+?\\\))\./);
  const m = await matrixOnScreen(page);
  const best = calculateBestResponses(m.payoffs, m.rows, m.cols, Number(fixed), labelIndex(label));
  const count = await page.locator('.response-buttons .choice-btn').count();
  return { best, count, fixedPlayer: Number(fixed) };
}

test('right, wrong, nothing selected; scoring and reset', async () => {
  const { page, errors, close } = await site.openPage('game-theory/#best-response', { mathjax: false });
  await page.waitForSelector('.response-buttons .choice-btn');

  await page.click('.br-submit');
  assert.equal(await page.locator('.input-error').innerText(), 'Select at least one strategy before submitting.');

  let q = await onScreen(page);
  for (const i of q.best) await page.click(`.response-buttons .choice-btn[data-index="${i}"]`);
  await page.click('.br-submit');
  assert.equal(await page.locator('.feedback-title').innerText(), 'Correct');
  assert.equal(await page.locator('.response-buttons .is-correct').count(), q.best.length);
  await page.click('.feedback-next');

  // Wrong: choose every strategy (never right unless all are best: then choose none of them but one).
  q = await onScreen(page);
  const pick = q.best.length === q.count ? [] : [...Array(q.count).keys()];
  if (pick.length === 0) pick.push(...q.best.slice(1));
  for (const i of pick) await page.click(`.response-buttons .choice-btn[data-index="${i}"]`);
  await page.click('.br-submit');
  assert.equal(await page.locator('.feedback-title').innerText(), 'Not quite');
  assert.match(await page.locator('.feedback-message').innerText(), /best responses? (is|are)/);
  assert.equal(await page.locator('.matrix-cell.is-answer').count(), q.best.length);

  await checkScoreSavedAndReset(page, 'Questions: 2 Points: 1 Score: 50%');
  assert.deepEqual(errors, []);
  await close();
});

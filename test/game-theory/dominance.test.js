// Dominance Relations mode (game-theory/modes/dominance.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDominanceRelation } from '../../game-theory/lib/game.js';
import { useBrowser, scoreText, checkScoreSavedAndReset } from '../helpers/browser.js';
import { matrixOnScreen } from '../helpers/matrix-on-screen.js';

const site = useBrowser();

/** Each pair's menu id and right answer, worked out from the matrix. */
async function answers(page) {
  const m = await matrixOnScreen(page);
  const out = [];
  for (const [player, count] of [[1, m.rows], [2, m.cols]]) {
    for (let i = 0; i < count; i++) for (let j = i + 1; j < count; j++) {
      out.push({ id: `#dom-${player}-${i}-${j}`, answer: getDominanceRelation(m.payoffs, m.rows, m.cols, player, i, j) });
    }
  }
  return out;
}

test('all right, one wrong, incomplete; scoring and reset', async () => {
  const { page, errors, close } = await site.openPage('game-theory/#dominance', { mathjax: false });
  await page.waitForSelector('.pairs select');

  await page.click('.dom-submit');
  assert.equal(await page.locator('.input-error').innerText(), 'Choose a relation for every pair.');
  assert.equal(await scoreText(page), 'No score');

  let pairs = await answers(page);
  assert.equal(await page.locator('.pairs select').count(), pairs.length);
  for (const p of pairs) await page.selectOption(p.id, p.answer);
  await page.click('.dom-submit');
  assert.equal(await page.locator('.feedback-title').innerText(), 'Correct');
  await page.click('.feedback-next');

  // One pair wrong: no point, and that menu shows the right answer in red.
  pairs = await answers(page);
  for (const [k, p] of pairs.entries()) {
    await page.selectOption(p.id, k === 0 ? (p.answer === 'none' ? 'A-weak' : 'none') : p.answer);
  }
  await page.click('.dom-submit');
  assert.equal(await page.locator('.feedback-title').innerText(), 'Not quite');
  assert.match(await page.locator('.feedback-message').innerText(), new RegExp(`You got ${pairs.length - 1}/${pairs.length}`));
  assert.equal(await page.inputValue(pairs[0].id), pairs[0].answer);
  assert.match(await page.locator(pairs[0].id).getAttribute('class'), /is-wrong/);

  await checkScoreSavedAndReset(page, '1 / 2 points');
  assert.deepEqual(errors, []);
  await close();
});

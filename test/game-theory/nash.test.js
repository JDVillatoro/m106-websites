// Nash Equilibria mode (game-theory/modes/nash.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateNashEquilibria } from '../../game-theory/lib/game.js';
import { useBrowser, scoreText, checkScoreSavedAndReset } from '../helpers/browser.js';

const site = useBrowser();

/** Read the matrix on screen and work out its pure Nash equilibria. */
async function equilibriaOnScreen(page) {
  const cells = await page.locator('.mode-panel:not([hidden]) .matrix-cell').evaluateAll(tds =>
    tds.map(td => ({ key: td.dataset.key, values: [...td.querySelectorAll('.payoff')].map(s => Number(s.textContent)) })));
  const payoffs = Object.fromEntries(cells.map(c => [c.key, { p1: c.values[0], p2: c.values[1] }]));
  const rows = Math.max(...cells.map(c => Number(c.key.split('-')[0]))) + 1;
  const cols = Math.max(...cells.map(c => Number(c.key.split('-')[1]))) + 1;
  return { keys: cells.map(c => c.key), equilibria: calculateNashEquilibria(payoffs, rows, cols) };
}

const cell = (page, key) => page.locator(`.mode-panel:not([hidden]) .matrix-cell[data-key="${key}"]`);

test('select the equilibria, feedback, score', async () => {
  const { page, errors, close } = await site.openPage('game-theory/#nash');
  await page.waitForSelector('.matrix-cell');

  // Right answer: click exactly the equilibria (none: submit with nothing selected).
  let { equilibria } = await equilibriaOnScreen(page);
  for (const key of equilibria) await cell(page, key).click();
  await page.click('.nash-submit');
  assert.equal(await page.locator('.feedback-title').innerText(), 'Correct');
  assert.equal(await scoreText(page), '1 / 1 points');

  // Wrong answer: select every cell that isn't an equilibrium, plus none of
  // the equilibria. Missed ones get outlined, wrong ones crossed out.
  await page.click('.feedback-next');
  assert.ok(await page.locator('.feedback').isHidden());
  let keys;
  ({ keys, equilibria } = await equilibriaOnScreen(page));
  const wrong = keys.filter(k => !equilibria.has(k));
  for (const key of wrong) await cell(page, key).click();
  await page.click('.nash-submit');
  assert.equal(await page.locator('.feedback-title').innerText(), 'Not quite');
  for (const key of equilibria) assert.match(await cell(page, key).getAttribute('class'), /is-missed/);
  for (const key of wrong) assert.match(await cell(page, key).getAttribute('class'), /is-crossed/);

  // After answering, cells can't be changed.
  const first = cell(page, keys[0]);
  assert.equal(await first.getAttribute('aria-disabled'), 'true');
  const pressed = await first.getAttribute('aria-pressed');
  await first.click({ force: true });   // force: Playwright won't click aria-disabled cells
  assert.equal(await first.getAttribute('aria-pressed'), pressed);

  await checkScoreSavedAndReset(page, '1 / 2 points');
  assert.deepEqual(errors, []);
  await close();
});

test('cells can be chosen with the keyboard', async () => {
  const { page, errors, close } = await site.openPage('game-theory/#nash');
  await page.waitForSelector('.matrix-cell');
  const first = page.locator('.matrix-cell').first();
  await first.focus();
  await page.keyboard.press('Space');
  assert.equal(await first.getAttribute('aria-pressed'), 'true');
  await page.keyboard.press('Enter');
  assert.equal(await first.getAttribute('aria-pressed'), 'false');
  assert.match(await first.getAttribute('aria-label'), /^A and X: Player 1 gets -?\d+, Player 2 gets -?\d+$/);
  assert.deepEqual(errors, []);
  await close();
});

test('strategy labels are typeset by MathJax', async t => {
  const reachable = await fetch('https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-mml-chtml.js', { method: 'HEAD' })
    .then(r => r.ok, () => false);
  if (!reachable) return t.skip('MathJax CDN unreachable');

  const { page, errors, close } = await site.openPage('game-theory/#nash');
  await page.waitForSelector('.payoff-matrix thead mjx-container', { timeout: 15000 });
  // A new question replaces the matrix; its labels are typeset too.
  await page.click('.nash-submit');
  await page.click('.feedback-next');
  await page.waitForSelector('.payoff-matrix th.row-label mjx-container', { timeout: 15000 });
  assert.equal(await page.locator('.payoff-matrix th:has-text("\\(")').count(), 0);
  assert.deepEqual(errors, []);
  await close();
});

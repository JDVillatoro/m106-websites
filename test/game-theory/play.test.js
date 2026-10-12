// Play mode (game-theory/modes/play.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { opponentChoice } from '../../game-theory/modes/play.js';
import { useBrowser } from '../helpers/browser.js';
import { matrixOnScreen } from '../helpers/matrix-on-screen.js';

test('opponent: the best average column, or sometimes random', () => {
  // Column 1 is better for player 2 on average.
  const game = { rows: 2, cols: 2, payoffs: { '0-0': { p2: 0 }, '0-1': { p2: 3 }, '1-0': { p2: 1 }, '1-1': { p2: 1 } } };
  const sequence = values => { let k = 0; return () => values[k++]; };
  assert.equal(opponentChoice(game, sequence([0.9, 0.5])), 1);    // not random: best column
  assert.equal(opponentChoice(game, sequence([0.1, 0.2])), 0);    // random: floor(0.2 · 2)
});

const site = useBrowser();

test("starts with the Prisoner's Dilemma; playing rounds, history, clearing", async () => {
  const { page, errors, close } = await site.openPage('game-theory/', { mathjax: false });
  await page.waitForSelector('.strategy-btn');
  assert.deepEqual(await page.locator('.strategy-btn').allInnerTexts(), ['\\(\\text{Loyal}\\)', '\\(\\text{Betray}\\)']);
  assert.equal(await page.locator('.mode-panel:not([hidden]) .scoreboard').count(), 0);
  const m = await matrixOnScreen(page);

  let you = 0, opp = 0;
  for (let round = 1; round <= 3; round++) {
    await page.click('.strategy-btn[data-index="1"]');
    const played = await page.locator('.matrix-cell.is-highlighted').getAttribute('data-key');
    assert.match(played, /^1-[01]$/);
    you += m.payoffs[played].p1; opp += m.payoffs[played].p2;
    assert.equal(await page.locator('.your-score').innerText(), String(you));
    assert.equal(await page.locator('.opp-score').innerText(), String(opp));
    assert.equal(await page.locator('.history-item').count(), round);
    assert.equal(await page.locator('.matrix-cell.is-highlighted').count(), 1);
  }
  assert.match(await page.locator('.history-item').first().innerText(), /^Round 3:/);

  await page.click('.clear-history');
  assert.equal(await page.locator('.history-item').count(), 0);
  assert.equal(await page.locator('.your-score').innerText(), '0');
  assert.equal(await page.locator('.result-text').innerText(), 'Choose a strategy to start playing!');
  assert.deepEqual(errors, []);
  await close();
});

test('editing: payoffs, names, size; bad payoffs rejected; presets', async () => {
  const { page, errors, close } = await site.openPage('game-theory/#play', { mathjax: false });
  await page.waitForSelector('.strategy-btn');
  await page.click('.edit-btn');
  assert.ok(await page.locator('.strategy-btn').first().isDisabled());

  // A payoff that isn't a number: stays in editing with a message.
  await page.fill('.payoff-input[data-key="0-0"][data-player="p1"]', 'lots');
  await page.click('.edit-btn');
  assert.equal(await page.locator('.input-error').innerText(), 'Every payoff must be a number.');
  assert.equal(await page.locator('.payoff-input.is-invalid').count(), 1);

  await page.fill('.payoff-input[data-key="0-0"][data-player="p1"]', '7');
  await page.fill('.strategy-name-input[data-player="1"][data-index="0"]', '\\(\\text{Up}\\)');
  await page.fill('.strategy-name-input[data-player="2"][data-index="1"]', '');
  await page.click('.edit-btn');
  assert.equal((await matrixOnScreen(page)).payoffs['0-0'].p1, 7);
  assert.equal(await page.locator('.strategy-btn').first().innerText(), '\\(\\text{Up}\\)');
  // An empty name goes back to the default.
  assert.equal(await page.locator('.payoff-matrix thead th').nth(1).innerText(), '\\(Y\\)');

  // New size: all zeros, still editing; values typed now are kept (the old site lost them).
  await page.click('.edit-btn');
  await page.fill('#play-rows', '3');
  await page.fill('#play-cols', '4');
  await page.click('.size-btn');
  assert.equal(await page.locator('.matrix-cell').count(), 12);
  await page.fill('.payoff-input[data-key="2-3"][data-player="p2"]', '5');
  await page.click('.edit-btn');
  const m = await matrixOnScreen(page);
  assert.equal(m.payoffs['2-3'].p2, 5);
  assert.equal(m.payoffs['0-0'].p1, 0);
  assert.equal(await page.locator('.strategy-btn').count(), 3);

  await page.click('.edit-btn');
  await page.fill('#play-rows', '9');
  await page.click('.size-btn');
  assert.equal(await page.locator('.input-error').innerText(), 'Use 2 to 5 strategies for each player.');

  await page.click('[data-preset="rps"]');
  assert.equal(await page.locator('.matrix-cell').count(), 9);
  assert.equal(await page.locator('.payoff-input').count(), 0);
  assert.equal(await page.locator('.strategy-btn').nth(2).innerText(), '\\(\\text{Scissors}\\)');
  assert.deepEqual(errors, []);
  await close();
});

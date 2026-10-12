// Degree Sequences mode (graph-theory/modes/degree.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDegreeSequence } from '../../graph-theory/modes/degree.js';
import {
  useBrowser, scoreText, checkScoreSavedAndReset, describedGraph, graphPlacement, assertGraphFits,
} from '../helpers/browser.js';

test('reading typed degree sequences', () => {
  assert.deepEqual(parseDegreeSequence('{3,1,2,2}'), [1, 2, 2, 3]);
  assert.deepEqual(parseDegreeSequence(' 2, 2 ,2 '), [2, 2, 2]);
  assert.deepEqual(parseDegreeSequence('{ 4 }'), [4]);
  for (const bad of ['', '{}', '1,,2', '1.5,2', '2a,1', 'one,two', '{1,2', '-1,2']) {
    assert.equal(parseDegreeSequence(bad), null, `"${bad}" should be rejected`);
  }
});

const site = useBrowser();

/** The correct answer for the graph on screen, from its screen-reader description. */
async function correctAnswer(page) {
  const { degree } = await describedGraph(page);
  return `{${Object.values(degree).sort((a, b) => a - b).join(',')}}`;
}

test('answer, feedback, score', async () => {
  const { page, errors, close } = await site.openPage('graph-theory/#degree');
  await page.waitForSelector('.graph-viewport canvas');

  // Badly formatted: a message, nothing scored.
  await page.fill('#degree-answer', 'two, three');
  await page.press('#degree-answer', 'Enter');
  assert.match(await page.locator('.input-error').innerText(), /whole numbers/);
  assert.equal(await scoreText(page), 'Questions: 0 Points: 0 Score: 0%');

  // Correct, typed in a different order: Enter submits.
  const answer = await correctAnswer(page);
  const reversed = answer.slice(1, -1).split(',').reverse().join(', ');
  await page.fill('#degree-answer', reversed);
  await page.press('#degree-answer', 'Enter');
  assert.equal(await page.locator('.feedback-title').innerText(), 'Correct');
  assert.equal(await page.locator('.input-error').innerText(), '');
  assert.ok(await page.locator('#degree-answer').isDisabled());
  assert.equal(await scoreText(page), 'Questions: 1 Points: 1 Score: 100%');

  // Wrong: the feedback shows the right answer.
  await page.click('.feedback-next');
  assert.ok(await page.locator('.feedback').isHidden());
  assert.equal(await page.inputValue('#degree-answer'), '');
  const next = await correctAnswer(page);
  await page.fill('#degree-answer', '{99}');
  await page.click('.degree-submit');
  assert.equal(await page.locator('.feedback-title').innerText(), 'Incorrect');
  assert.equal(await page.locator('.feedback-message').innerText(), `The correct degree sequence was ${next}.`);

  await checkScoreSavedAndReset(page, 'Questions: 2 Points: 1 Score: 50%');
  assert.deepEqual(errors, []);
  await close();
});

test('graph is drawn inside its area, also after resizing', async () => {
  const { page, errors, close } = await site.openPage('graph-theory/#degree');
  await page.waitForSelector('.graph-viewport canvas');
  await page.waitForTimeout(300);
  assertGraphFits(await graphPlacement(page));

  await page.setViewportSize({ width: 600, height: 900 });
  await page.waitForTimeout(300);
  assertGraphFits(await graphPlacement(page));
  assert.deepEqual(errors, []);
  await close();
});

test('zoom buttons, and switching tabs keeps the graph', async () => {
  const { page, errors, close } = await site.openPage('graph-theory/#degree');
  await page.waitForSelector('.graph-viewport canvas');
  const description = (await describedGraph(page)).text;
  const box = () => page.locator('.graph-viewport').boundingBox();
  const before = await box();
  await page.click('.zoom-in');
  await page.click('.zoom-out');

  await page.click('.mode-tab >> text=About');
  await page.click('.mode-tab >> text=Degree Sequences');
  await page.waitForSelector('.mode-panel:not([hidden]) .graph-viewport');
  const after = await box();
  assert.equal(Math.round(after.width), Math.round(before.width));
  assert.ok(after.height > 300);
  assert.equal((await describedGraph(page)).text, description);
  assert.deepEqual(errors, []);
  await close();
});

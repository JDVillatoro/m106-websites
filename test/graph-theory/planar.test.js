// Planar Graphs mode (graph-theory/modes/planar.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePlanarPuzzle } from '../../graph-theory/modes/planar.js';
import { isConnected } from '../../graph-theory/lib/graph.js';
import { useBrowser, scoreText, checkScoreSavedAndReset } from '../helpers/browser.js';
import { graphOnScreen, containsK5, containsK33 } from '../helpers/graph-on-screen.js';

const onScreenShape = p => ({
  names: p.names,
  edges: p.edges.map(e => ({ from: p.names[+e.source.slice(1)], to: p.names[+e.target.slice(1)] })),
});

test('puzzles: planar ones have no K5/K3,3; others contain the one they name', () => {
  for (let i = 0; i < 200; i++) {
    const p = generatePlanarPuzzle();
    const g = onScreenShape(p);
    assert.equal(isConnected(p), true);
    if (p.isPlanar) {
      assert.equal(containsK5(g) || containsK33(g), false);
      assert.ok(p.edges.length <= 3 * p.n - 6);
    } else {
      assert.equal(p.obstruction === 'K5' ? containsK5(g) : containsK33(g), true);
    }
  }
});

const site = useBrowser();

/** What the graph on screen is: { planar, obstruction, v, e, f }. */
async function analyse(page) {
  const g = await graphOnScreen(page);
  const k5 = containsK5(g), k33 = containsK33(g);
  const v = g.names.length, e = g.edges.length;
  return { planar: !k5 && !k33, obstruction: k5 ? 'K5' : 'K3,3', v, e, f: 2 - v + e };
}

test('both kinds of part 2, scoring, reset', async () => {
  const { page, errors, close } = await site.openPage('graph-theory/#planar');
  await page.waitForSelector('.graph-viewport canvas');
  const seen = new Set();
  let questions = 0;
  while (seen.size < 2 && questions < 30) {
    const a = await analyse(page);
    await page.click(`.part1 .choice-btn[data-answer="${a.planar ? 'yes' : 'no'}"]`);
    questions++;
    if (a.planar) {
      seen.add('counts');
      await page.fill('#planar-v', String(a.v));
      await page.fill('#planar-e', String(a.e));
      await page.fill('#planar-f', String(a.f));
      await page.press('#planar-f', 'Enter');
    } else {
      seen.add('why');
      await page.click(`.part2-why .choice-btn[data-answer="${a.obstruction}"]`);
    }
    assert.equal(await page.locator('.feedback-title').innerText(), 'Correct',
      await page.locator('.feedback-message').innerText());
    assert.equal(await scoreText(page), `Questions: ${questions} Points: ${questions} Score: 100%`);
    await page.click('.feedback-next');
  }
  assert.equal(seen.size, 2);
  await checkScoreSavedAndReset(page, await scoreText(page));
  assert.deepEqual(errors, []);
  await close();
});

test('wrong answers and missing numbers', async () => {
  const { page, errors, close } = await site.openPage('graph-theory/#planar');
  await page.waitForSelector('.graph-viewport canvas');
  const seen = new Set();
  for (let i = 0; i < 30 && seen.size < 3; i++) {
    const a = await analyse(page);
    if (!seen.has('part1')) {
      seen.add('part1');
      await page.click(`.part1 .choice-btn[data-answer="${a.planar ? 'no' : 'yes'}"]`);
      assert.equal(await page.locator('.feedback-message').innerText(),
        `Actually this graph is ${a.planar ? 'planar' : 'not planar'}.`);
      assert.equal(await page.locator('.mode-panel:not([hidden]) [class*="part2"]:not([hidden])').count(), 0);
    } else if (a.planar) {
      await page.click('.part1 .choice-btn[data-answer="yes"]');
      await page.fill('#planar-v', String(a.v));
      await page.press('#planar-v', 'Enter');
      assert.equal(await page.locator('.part2-counts .input-error').innerText(), 'Fill in all three numbers.');
      await page.fill('#planar-e', String(a.e));
      await page.fill('#planar-f', String(a.f + 1));
      await page.press('#planar-f', 'Enter');
      assert.equal(await page.locator('.feedback-message').innerText(),
        `The graph has ${a.v} vertices, ${a.e} edges, and ${a.f} faces.`);
      seen.add('counts');
    } else {
      await page.click('.part1 .choice-btn[data-answer="no"]');
      await page.click(`.part2-why .choice-btn[data-answer="${a.obstruction === 'K5' ? 'K3,3' : 'K5'}"]`);
      assert.equal(await page.locator('.feedback-message').innerText(), `This graph contains a ${a.obstruction} subgraph.`);
      seen.add('why');
    }
    assert.equal(await page.locator('.feedback-title').innerText(), 'Incorrect');
    await page.click('.feedback-next');
  }
  assert.equal(seen.size, 3);
  assert.deepEqual(errors, []);
  await close();
});

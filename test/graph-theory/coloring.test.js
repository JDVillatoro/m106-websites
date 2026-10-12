// Graph Coloring mode (graph-theory/modes/coloring.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateGraphColoringPuzzle, COLORING_PUZZLE_CONFIG } from '../../graph-theory/modes/coloring.js';
import { useBrowser, scoreText, checkScoreSavedAndReset } from '../helpers/browser.js';
import { graphOnScreen } from '../helpers/graph-on-screen.js';

const neighbors = g => {
  const adj = Object.fromEntries(g.names.map(n => [n, new Set()]));
  for (const { from, to } of g.edges) { adj[from].add(to); adj[to].add(from); }
  return adj;
};

/** A proper coloring with at most k colors (indices), by backtracking; null if none. */
function colorWith(g, k) {
  const adj = neighbors(g);
  const color = {};
  const go = i => {
    if (i === g.names.length) return true;
    const v = g.names[i];
    for (let c = 0; c < k; c++) {
      if ([...adj[v]].some(w => color[w] === c)) continue;
      color[v] = c;
      if (go(i + 1)) return true;
      delete color[v];
    }
    return false;
  };
  return go(0) ? color : null;
}

/** Greedy coloring in name order: each vertex gets the first color its colored neighbors don't use. */
function greedy(g) {
  const adj = neighbors(g);
  const color = {};
  for (const v of g.names) {
    let c = 0;
    while ([...adj[v]].some(w => color[w] === c)) c++;
    color[v] = c;
  }
  return color;
}

const chromatic = g => { for (let k = 1; ; k++) if (colorWith(g, k)) return k; };

test('puzzles: chromatic number at most 5; the color limit follows the spec', () => {
  for (let i = 0; i < 200; i++) {
    const p = generateGraphColoringPuzzle();
    const g = { names: p.names, edges: p.edges.map(e => ({ from: p.names[+e.source.slice(1)], to: p.names[+e.target.slice(1)] })) };
    const m = chromatic(g);
    assert.equal(p.minColors, m);
    assert.ok(m <= COLORING_PUZZLE_CONFIG.generationMaxChromatic);
    const expected = Math.min(COLORING_PUZZLE_CONFIG.promptMaxColors, m + 1 === p.n ? m : m + 1);
    assert.equal(p.maxColorsAllowed, expected);
  }
});

const site = useBrowser();
const FREE = ['Red', 'Green', 'Blue', 'Yellow', 'Purple', 'Orange'];
const GREEDY = ['A', 'B', 'C', 'D', 'E', 'F'];

test('both cases: colors show on the graph, scoring, reset', async () => {
  const { page, errors, close } = await site.openPage('graph-theory/#coloring');
  await page.waitForSelector('.graph-viewport canvas');
  const seen = new Set();
  let questions = 0;
  while (seen.size < 2 && questions < 20) {
    const g = await graphOnScreen(page);
    const title = await page.locator('.coloring-title').innerText();
    const isGreedy = /greedy/.test(title);
    seen.add(isGreedy ? 'greedy' : 'free');
    const colors = isGreedy ? greedy(g) : colorWith(g, Number(title.match(/at most (\d+)/)[1]));
    for (const [i, name] of g.names.entries()) {
      await page.selectOption(`#coloring-${i}`, { label: (isGreedy ? GREEDY : FREE)[colors[name]] });
    }
    // The graph shows the choice: "1: R" or "1: A".
    const labels = await graphOnScreen(page);
    assert.match(labels.names[0], /^\d+: [A-Z]$/);

    await page.click('.coloring-form [type="submit"]');
    questions++;
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

test('missing colors, then a conflict', async () => {
  const { page, errors, close } = await site.openPage('graph-theory/#coloring');
  await page.waitForSelector('.graph-viewport canvas');
  for (let i = 0; i < 20; i++) {
    if (/greedy/.test(await page.locator('.coloring-title').innerText())) { await page.click('.reset-btn'); continue; }
    await page.click('.coloring-form [type="submit"]');
    assert.equal(await page.locator('.coloring-form .input-error').innerText(), 'Choose a color for every vertex.');
    assert.equal(await page.locator('select.is-invalid').count(), await page.locator('.color-rows select').count());
    assert.equal(await scoreText(page), 'Questions: 0 Points: 0 Score: 0%');

    // Everything red: adjacent vertices clash.
    const count = await page.locator('.color-rows select').count();
    for (let k = 0; k < count; k++) await page.selectOption(`#coloring-${k}`, { label: 'Red' });
    await page.click('.coloring-form [type="submit"]');
    assert.equal(await page.locator('.feedback-title').innerText(), 'Not quite');
    assert.match(await page.locator('.feedback-message').innerText(), /are both colored Red and are connected by an edge/);
    assert.ok(await page.locator('#coloring-0').isDisabled());
    assert.deepEqual(errors, []);
    await close();
    return;
  }
  assert.fail('no freeform question came up');
});

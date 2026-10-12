// Applications mode (graph-theory/modes/applications.js, puzzles from lib/graph.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateApplicationsPuzzle } from '../../graph-theory/lib/graph.js';
import { matchesShownDistances } from '../../graph-theory/modes/applications.js';
import { useBrowser, scoreText, checkScoreSavedAndReset } from '../helpers/browser.js';

/** Fewest colors for `n` items with conflicts `clash(a, b)`, and one such coloring. */
function optimalColoring(n, clash) {
  for (let k = 1; k <= n; k++) {
    const color = [];
    const go = i => {
      if (i === n) return true;
      for (let c = 0; c < k; c++) {
        if (color.some((cj, j) => cj === c && clash(i, j))) continue;
        color[i] = c;
        if (go(i + 1)) return true;
        color.length = i;
      }
      return false;
    };
    if (go(0)) return { k, color };
  }
}

test('puzzles: minResources is the true minimum', () => {
  for (let i = 0; i < 200; i++) {
    const p = generateApplicationsPuzzle();
    const edges = new Set(p.edges.map(e => [e.source, e.target].sort().join()));
    const { k } = optimalColoring(p.n, (a, b) => edges.has([`v${a}`, `v${b}`].sort().join()));
    assert.equal(p.minResources, k);
  }
});

test('matchesShownDistances spots rounding that changes the answer', () => {
  const p = {
    type: 'interference', n: 2, thresholdMiles: 3.42,
    distanceMiles: [[0, 3.42], [3.42, 0]],
    edges: [],   // exact distance just over the threshold: no conflict
  };
  assert.equal(matchesShownDistances(p), false);
  assert.equal(matchesShownDistances({ ...p, edges: [{ source: 'v0', target: 'v1' }] }), true);
});

const site = useBrowser();

/** Work out the conflicts from what the page shows. */
async function conflictsOnScreen(page) {
  const title = await page.locator('.app-title').innerText();
  if (/schedule/.test(title)) {
    const members = await page.locator('.committee-members').allInnerTexts();
    const sets = members.map(m => m.split(', '));
    return { kind: 'scheduling', n: sets.length, clash: (a, b) => sets[a].some(x => sets[b].includes(x)) };
  }
  const d = Number((await page.locator('.app-details').innerText()).match(/within ([\d.]+) miles/)[1]);
  const rows = await page.locator('.distance-table tbody tr').evaluateAll(trs =>
    trs.map(tr => [...tr.querySelectorAll('td')].map(td => Number(td.textContent))));
  return { kind: 'interference', n: rows.length, clash: (a, b) => rows[a][b] <= d };
}

test('both puzzles: optimal, one too many, conflict; scoring and reset', async () => {
  const { page, errors, close } = await site.openPage('graph-theory/#applications');
  await page.waitForSelector('.assign-rows select');
  const seen = new Set();
  let questions = 0, points = 0;
  while (seen.size < 2 && questions < 20) {
    const c = await conflictsOnScreen(page);
    seen.add(c.kind);
    const { color } = optimalColoring(c.n, c.clash);
    for (let i = 0; i < c.n; i++) await page.selectOption(`#app-${i}`, { index: color[i] + 1 });
    await page.click('.assign-form [type="submit"]');
    questions++; points++;
    assert.equal(await page.locator('.feedback-title').innerText(), 'Correct',
      await page.locator('.feedback-message').innerText());
    assert.match(await page.locator('.feedback-message').innerText(), /^Great job!/);
    await page.click('.feedback-next');
  }
  assert.equal(seen.size, 2);

  // One more slot than needed: valid, not optimal, half a point.
  let c = await conflictsOnScreen(page);
  let { k, color } = optimalColoring(c.n, c.clash);
  const optionCount = await page.locator('#app-0 option').count() - 1;
  // Move an item that shares its slot with another to a new, unused slot.
  // (Moving an item that's alone in its slot would still be optimal.)
  const mover = color.findIndex((ci, i) => color.some((cj, j) => j !== i && cj === ci));
  if (k < optionCount && mover !== -1) {
    for (let i = 0; i < c.n; i++) await page.selectOption(`#app-${i}`, { index: (i === mover ? k : color[i]) + 1 });
    await page.click('.assign-form [type="submit"]');
    questions++; points += 0.5;
    assert.equal(await page.locator('.feedback-title').innerText(), 'Not optimal');
    assert.match(await page.locator('.feedback-message').innerText(), /you can do better/);
    await page.click('.feedback-next');
  }

  // Everything in the first slot: a conflict.
  c = await conflictsOnScreen(page);
  for (let i = 0; i < c.n; i++) await page.selectOption(`#app-${i}`, { index: 1 });
  await page.click('.assign-form [type="submit"]');
  questions++;
  assert.equal(await page.locator('.feedback-title').innerText(), 'Incorrect');
  assert.match(await page.locator('.feedback-message').innerText(), /doesn't work because/);
  assert.equal(await page.locator('.assign-rows select.is-invalid').count(), 2);

  const pct = Math.round(points / questions * 100);
  assert.equal(await scoreText(page), `Questions: ${questions} Points: ${points} Score: ${pct}%`);
  await checkScoreSavedAndReset(page, await scoreText(page));
  assert.deepEqual(errors, []);
  await close();
});

test('missing choices', async () => {
  const { page, errors, close } = await site.openPage('graph-theory/#applications');
  await page.waitForSelector('.assign-rows select');
  await page.selectOption('#app-0', { index: 1 });
  await page.click('.assign-form [type="submit"]');
  assert.equal(await page.locator('.assign-form .input-error').innerText(), 'Make a choice for every row.');
  assert.ok(await page.locator('.feedback').isHidden());
  assert.equal(await scoreText(page), 'Questions: 0 Points: 0 Score: 0%');
  assert.deepEqual(errors, []);
  await close();
});

// Browser tests for the parts every page shares: hub, header, topic pages,
// error handling, phone width, and the old sites.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useBrowser, expectMode, expectModeList } from './helpers/browser.js';

const site = useBrowser();

test('hub lists the topics and links to them; header links', async () => {
  const { page, errors, close } = await site.openPage('');
  assert.deepEqual(await page.locator('.topic-card h2').allInnerTexts(), ['Graph Theory', 'Game Theory']);
  assert.deepEqual(await page.locator('.topic-card-count').allInnerTexts(), ['8 modes', '6 modes']);

  await page.click('.topic-card h2 >> text=Game Theory');
  await expectModeList(page);
  assert.equal(new URL(page.url()).pathname, '/m106-websites/game-theory/');
  assert.equal(await page.locator('.site-topics a[aria-current="page"]').innerText(), 'Game Theory');

  await page.click('.site-topics a >> text=Graph Theory');
  await expectModeList(page);
  assert.equal(new URL(page.url()).pathname, '/m106-websites/graph-theory/');

  await page.click('.topic-home .back-link');
  await page.waitForSelector('.topic-card');
  assert.equal(new URL(page.url()).pathname, '/m106-websites/');
  assert.deepEqual(errors, []);
  await close();
});

test('topic page: mode list, modes, previous/next, URL hash and Back', async () => {
  const { page, errors, close } = await site.openPage('graph-theory/');
  await expectModeList(page);
  assert.equal(await page.title(), 'Graph Theory – M106');
  assert.deepEqual(await page.locator('.mode-card h2').allInnerTexts(), [
    'Make a Graph', 'Degree Sequences', 'Eulerian Graphs', 'Isomorphism', 'Planar Graphs',
    'Graph Coloring', 'Applications', 'Hamiltonian Graphs',
  ]);
  assert.deepEqual(await page.locator('.mode-card-score').allInnerTexts(), ['Tool', ...Array(7).fill('No score')]);
  assert.equal(await page.locator('.mode-card-description').count(), 8);

  // A card opens its mode, with focus on its heading.
  await page.click('.mode-card h2 >> text=Degree Sequences');
  await expectMode(page, 'Degree Sequences');
  assert.equal(new URL(page.url()).hash, '#degree');
  assert.equal(await page.title(), 'Degree Sequences – Graph Theory – M106');
  assert.equal(await page.locator('.mode-position').innerText(), 'GRAPH THEORY · MODE 2 OF 8');
  assert.equal(await page.locator('.breadcrumb-current').innerText(), 'Degree Sequences');
  assert.equal(await page.locator('.mode-nav a[aria-current="page"]').innerText(), 'Degree Sequences');
  assert.equal(await page.evaluate(() => document.activeElement.className), 'mode-title');
  assert.match(await page.locator('.pager-prev').innerText(), /Previous\s+← Make a Graph/);
  assert.match(await page.locator('.pager-next').innerText(), /Next\s+Eulerian Graphs →/);
  await page.waitForSelector('.mode-panel:not([hidden]) .graph-viewport canvas');

  await page.click('.pager-next');
  await expectMode(page, 'Eulerian Graphs');
  await page.click('.mode-nav a >> text=Make a Graph');
  await expectMode(page, 'Make a Graph');
  assert.equal(await page.locator('.pager-prev').count(), 0);

  await page.goBack();
  await expectMode(page, 'Eulerian Graphs');
  await page.goBack();
  await expectMode(page, 'Degree Sequences');
  await page.goBack();
  await expectModeList(page);
  await page.goForward();
  await expectMode(page, 'Degree Sequences');
  // Each mode's panel is built once and kept; only one is visible.
  assert.equal(await page.locator('.mode-panel').count(), 3);
  assert.equal(await page.locator('.mode-panel:not([hidden])').count(), 1);

  // The breadcrumb goes back to the list, which shows saved scores.
  await page.evaluate(() => localStorage.setItem('m106:graph-theory:degree:score', '{"questions":4,"points":2.5}'));
  await page.click('.breadcrumb a >> text=Graph Theory');
  await expectModeList(page);
  assert.equal(await page.locator('.mode-card-score').nth(1).innerText(), '2.5 / 4 points');
  assert.equal(await page.evaluate(() => document.activeElement.tagName), 'H1');

  // Fresh loads: a mode's link opens it; an unknown one shows the list.
  await page.goto(site.url + 'graph-theory/#eulerian');
  await expectMode(page, 'Eulerian Graphs');
  await page.goto(site.url + 'graph-theory/#no-such-mode');
  await expectModeList(page);
  assert.deepEqual(errors, []);
  await close();
});

test('game theory modes', async () => {
  const { page, errors, close } = await site.openPage('game-theory/');
  await expectModeList(page);
  assert.deepEqual(await page.locator('.mode-card h2').allInnerTexts(), [
    'Play', 'Best Response', 'Dominance Relations', 'Nash Equilibria', 'Expected Payoff', 'Indifference',
  ]);
  assert.deepEqual(await page.locator('.mode-card-score').allInnerTexts(), ['Tool', ...Array(5).fill('No score')]);
  await page.goto(site.url + 'game-theory/#indifference');
  await expectMode(page, 'Indifference');
  assert.equal(await page.locator('.pager-next').count(), 0);
  assert.equal(await page.locator('.scoreboard:not([hidden]) .scoreboard-value').innerText(), 'No score');
  assert.deepEqual(errors, []);
  await close();
});

test('phones: a back link instead of the breadcrumb and mode list', async () => {
  const { page, errors, close } = await site.openPage('graph-theory/#degree', { width: 390 });
  await expectMode(page, 'Degree Sequences');
  assert.ok(await page.locator('.breadcrumb').isHidden());
  assert.ok(await page.locator('.mode-nav').isHidden());
  // The score box is below the mode.
  const mode = await page.locator('.mode-main').boundingBox();
  const score = await page.locator('.scoreboard:not([hidden])').boundingBox();
  assert.ok(score.y >= mode.y + mode.height);

  await page.click('.mode-back-link');
  await expectModeList(page);
  assert.deepEqual(errors, []);
  await close();
});

test('a mode that fails to load does not break the others', async () => {
  const context = await site.browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  await page.route('**/modes/degree.js', route => route.abort());
  await page.goto(site.url + 'graph-theory/#degree');
  await page.waitForSelector('.mode-error');
  assert.match(await page.locator('.mode-error').innerText(), /didn't load/);

  await page.click('.mode-nav a >> text=Make a Graph');
  await page.waitForSelector('.mode-panel:not([hidden]) .graph-viewport canvas');
  await context.close();
});

test('pages fit a phone screen', async () => {
  const pages = [
    '', 'game-theory/', 'graph-theory/',
    ...['play', 'best-response', 'dominance', 'nash', 'expected-payoff', 'indifference'].map(m => `game-theory/#${m}`),
    ...['make', 'degree', 'eulerian', 'iso', 'planar', 'coloring', 'applications', 'hamiltonian'].map(m => `graph-theory/#${m}`),
  ];
  for (const path of pages) {
    const { page, errors, close } = await site.openPage(path, { width: 375, height: 800 });
    await page.waitForSelector('.topic-card, .topic-home:not([hidden]) .mode-card, .mode-panel:not([hidden]) .mode-body > *');
    const tooWide = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(tooWide, false, `${path || 'hub'} is wider than the screen`);
    assert.deepEqual(errors, [], path);
    await close();
  }
});

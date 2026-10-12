// Browser tests for the parts every page shares: hub, topic pages, tabs,
// error handling, phone width, and the old sites.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useBrowser, expectTab } from './helpers/browser.js';

const site = useBrowser();

test('hub lists the topics and links to them', async () => {
  const { page, errors, close } = await site.openPage('');
  assert.deepEqual(await page.locator('.topic-card h2').allInnerTexts(), ['Graph Theory', 'Game Theory']);

  await page.click('.topic-card h2 >> text=Game Theory');
  await page.waitForSelector('.mode-tab');
  assert.equal(new URL(page.url()).pathname, '/m106-websites/game-theory/');

  await page.click('.back-link');
  await page.waitForSelector('.topic-card');
  assert.equal(new URL(page.url()).pathname, '/m106-websites/');
  assert.deepEqual(errors, []);
  await close();
});

test('topic page: tabs, URL hash and Back button', async () => {
  const { page, errors, close } = await site.openPage('graph-theory/');
  await page.waitForSelector('.mode-tab');
  assert.deepEqual(await page.locator('.mode-tab').allInnerTexts(), [
    'Make a Graph', 'Degree Sequences', 'Eulerian Graphs', 'Isomorphism', 'Planar Graphs',
    'Graph Coloring', 'Applications', 'Hamiltonian Graphs',
  ]);
  await expectTab(page, 'Make a Graph');

  await page.click('.mode-tab >> text=Degree Sequences');
  await expectTab(page, 'Degree Sequences');
  await page.waitForSelector('.mode-panel:not([hidden]) .graph-viewport canvas');
  assert.equal(new URL(page.url()).hash, '#degree');
  assert.equal(await page.title(), 'Degree Sequences – Graph Theory – M106');

  await page.goBack();
  await expectTab(page, 'Make a Graph');
  await page.goForward();
  await expectTab(page, 'Degree Sequences');
  // Each mode's panel is built once and kept; only one is visible.
  assert.equal(await page.locator('.mode-panel').count(), 2);
  assert.equal(await page.locator('.mode-panel:not([hidden])').count(), 1);

  await page.goto(site.url + 'graph-theory/#no-such-mode');
  await expectTab(page, 'Make a Graph');
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

  await page.click('.mode-tab >> text=Make a Graph');
  await page.waitForSelector('.mode-panel:not([hidden]) .graph-viewport canvas');
  await context.close();
});

test('pages fit a phone screen', async () => {
  const pages = [
    '', 'game-theory/', 'game-theory/#nash',
    ...['make', 'degree', 'eulerian', 'iso', 'planar', 'coloring', 'applications', 'hamiltonian'].map(m => `graph-theory/#${m}`),
  ];
  for (const path of pages) {
    const { page, errors, close } = await site.openPage(path, { width: 375, height: 800 });
    await page.waitForSelector('.topic-card, .mode-panel:not([hidden]) .info');
    const tooWide = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(tooWide, false, `${path || 'hub'} is wider than the screen`);
    assert.deepEqual(errors, [], path);
    await close();
  }
});

test('old sites still load', async () => {
  // Their console isn't checked: the old graph theory site loads Cytoscape
  // from unpkg, which may be unreachable.
  for (const [path, title] of [['legacy/graph-theory/', 'M106: Graph Theory'], ['legacy/game-theory/', 'Game Theory']]) {
    const { page, close } = await site.openPage(path);
    assert.equal(await page.locator('h1').innerText(), title);
    await close();
  }
});

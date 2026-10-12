// Make a Graph mode (graph-theory/modes/make.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useBrowser } from '../helpers/browser.js';
import { graphOnScreen } from '../helpers/graph-on-screen.js';

const site = useBrowser();

test('opens with a random graph, not scored', async () => {
  const { page, errors, close } = await site.openPage('graph-theory/#make');
  await page.waitForSelector('.graph-viewport canvas');
  const g = await graphOnScreen(page);
  assert.equal(g.names.length, 5);
  assert.equal(await page.locator('.scoreboard:not([hidden])').count(), 0);
  assert.deepEqual(errors, []);
  await close();
});

test('edit: rename, set vertex count, add and remove edges, directed', async () => {
  const { page, errors, close } = await site.openPage('graph-theory/#make');
  await page.waitForSelector('.graph-viewport canvas');
  await page.click('.edit-btn');
  assert.ok(await page.locator('.editor').isVisible());
  assert.ok(await page.locator('.download-btn').isHidden());

  // Three vertices, no edges, then rename one.
  await page.fill('.vertex-count', '3');
  await page.click('.set-vertices-btn');
  assert.equal(await page.locator('.vertex-name').count(), 3);
  while (await page.locator('.edge-remove').count()) await page.locator('.edge-remove').first().click();
  await page.fill('#make-vertex-0', 'Home');
  // The edge menus pick up the new name.
  await page.click('.edge-add');
  assert.match(await page.locator('.edge-source option[value="v0"]').innerText(), /1\. Home/);

  // Edges Home–B (label 4) and B–C (label 7); one half-filled row is ignored.
  await page.selectOption('.edge-row:nth-of-type(2) .edge-source', 'v0');
  await page.selectOption('.edge-row:nth-of-type(2) .edge-target', 'v1');
  await page.fill('.edge-row:nth-of-type(2) .edge-label', '4');
  await page.click('.edge-add');
  await page.selectOption('.edge-row:nth-of-type(3) .edge-source', 'v1');
  await page.selectOption('.edge-row:nth-of-type(3) .edge-target', 'v2');
  await page.fill('.edge-row:nth-of-type(3) .edge-label', '7');
  await page.click('.edge-add');
  await page.selectOption('.edge-row:nth-of-type(4) .edge-source', 'v2');
  await page.check('.directed-input');
  await page.click('.done-btn');

  assert.ok(await page.locator('.editor').isHidden());
  const g = await graphOnScreen(page);
  assert.deepEqual(g.names, ['Home', 'B', 'C']);
  assert.equal(g.directed, true);
  assert.deepEqual(g.edges.map(e => `${e.from}>${e.to}:${e.label}`), ['Home>B:4', 'B>C:7']);

  // Cancel throws edits away.
  await page.click('.edit-btn');
  await page.fill('#make-vertex-1', 'Changed');
  await page.click('.cancel-btn');
  assert.deepEqual((await graphOnScreen(page)).names, ['Home', 'B', 'C']);
  assert.deepEqual(errors, []);
  await close();
});

test('randomize by type', async () => {
  const { page, errors, close } = await site.openPage('graph-theory/#make');
  await page.waitForSelector('.graph-viewport canvas');
  await page.click('.edit-btn');
  await page.fill('.vertex-count', '6');
  await page.selectOption('.random-type', 'eulerian_digraph');
  await page.click('.randomize-btn');
  const g = await graphOnScreen(page);
  assert.equal(g.names.length, 6);
  assert.equal(g.directed, true);
  // The editor shows the new graph.
  assert.equal(await page.locator('.vertex-name').count(), 6);
  assert.equal(await page.locator('.edge-row').count(), g.edges.length);
  assert.ok(await page.locator('.directed-input').isChecked());
  assert.deepEqual(errors, []);
  await close();
});

test('alt text and download', async () => {
  const { page, errors, close, context } = await site.openPage('graph-theory/#make');
  await page.waitForSelector('.graph-viewport canvas');
  await page.click('.alt-text-btn');
  const text = await page.inputValue('.alt-text-output');
  assert.match(text, /^A (directed )?graph with 5 vertices/);
  assert.equal(text, await page.locator('.graph-view .sr-only').innerText());

  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.click('.copy-btn');
  await page.waitForSelector('.copy-btn:text-is("Copied!")');   // copying is asynchronous
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), text);

  const [download] = await Promise.all([page.waitForEvent('download'), page.click('.download-btn')]);
  assert.equal(download.suggestedFilename(), 'graph.svg');
  const chunks = [];
  for await (const chunk of await download.createReadStream()) chunks.push(chunk);
  assert.match(Buffer.concat(chunks).toString(), /<svg/);

  await page.click('.alt-text-btn');
  assert.ok(await page.locator('.alt-text-panel').isHidden());
  assert.deepEqual(errors, []);
  await close();
});

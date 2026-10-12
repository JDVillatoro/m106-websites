// Shared setup for browser tests: a test server, headless Chromium, and
// helpers for opening and checking pages.
//
// Needs Chromium for Playwright: `npx playwright install --with-deps chromium`
// (the dev container does this when it's built).
//
// Usage in a test file:
//   const site = useBrowser();
//   test('...', async () => {
//     const { page, errors, close } = await site.openPage('graph-theory/#degree');
//     ...
//     assert.deepEqual(errors, []);
//     await close();
//   });

import { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from './static-server.js';

/** Start the server and browser for this test file; stop them at the end. */
export function useBrowser() {
  const site = {
    url: null,
    browser: null,

    /**
     * Open `path` (relative to the site root) in a fresh browser context, so
     * localStorage starts empty. `mathjax: false` blocks MathJax. `errors` collects errors from the site's own
     * files; errors from outside (such as a CDN being unreachable) are ignored.
     */
    async openPage(path, { width = 1000, height = 900, mathjax = true } = {}) {
      const context = await site.browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();
      // Without MathJax, labels stay as TeX text ("\\(A\\)"), which tests can read.
      if (!mathjax) await page.route('**/mathjax@*/**', route => route.abort());
      page.setDefaultTimeout(10000);   // generous: several browsers may run at once
      const errors = [];
      page.on('console', m => {
        if (m.type() === 'error' && (m.location().url ?? '').startsWith(site.url)) errors.push(m.text());
      });
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(site.url + path);
      return { page, errors, context, close: () => context.close() };
    },
  };

  let server;
  before(async () => {
    server = await startServer();
    site.url = server.url;
    site.browser = await chromium.launch();
  });
  after(async () => {
    await site.browser?.close();
    await server?.close();
  });

  return site;
}

/** Wait until the mode named `title` is the open one (hash changes are handled asynchronously). */
export function expectMode(page, title) {
  return page.waitForSelector(`.mode-view:not([hidden]) .mode-title:text-is("${title}")`);
}

/** Wait until the topic page shows its list of modes. */
export function expectModeList(page) {
  return page.waitForSelector('.topic-home:not([hidden]) .mode-card');
}

/** The open mode's score as one line, e.g. '1 / 2 points' or 'No score'. */
export async function scoreText(page) {
  return (await page.locator('.scoreboard:not([hidden]) .scoreboard-value').innerText()).replace(/\s+/g, ' ').trim();
}

/** Check a scored mode's score survives a reload and that Reset clears it. */
export async function checkScoreSavedAndReset(page, expected) {
  assert.equal(await scoreText(page), expected);
  await page.reload();
  await page.waitForSelector('.scoreboard:not([hidden]) .scoreboard-value');
  assert.equal(await scoreText(page), expected);
  await page.click('.scoreboard:not([hidden]) .reset-btn');
  assert.equal(await scoreText(page), 'No score');
  assert.ok(await page.locator('.mode-panel:not([hidden]) .feedback').isHidden());
}

/**
 * Where the drawn graph sits in the visible graph area, as fractions of the
 * area's size. Uses Cytoscape's registry on its container element (vendor/
 * pins the version).
 */
export function graphPlacement(page) {
  return page.evaluate(() => {
    const el = document.querySelector('.mode-panel:not([hidden]) .graph-viewport');
    const bb = el._cyreg.cy.elements().renderedBoundingBox();
    const w = el.clientWidth, h = el.clientHeight;
    return { left: bb.x1 / w, right: bb.x2 / w, top: bb.y1 / h, bottom: bb.y2 / h };
  });
}

/** The graph is fully inside its area and fills a good part of it. */
export function assertGraphFits({ left, right, top, bottom }) {
  const placement = JSON.stringify({ left, right, top, bottom });
  assert.ok(left >= -0.01 && top >= -0.01 && right <= 1.01 && bottom <= 1.01, `graph sticks out: ${placement}`);
  assert.ok(right - left > 0.5 || bottom - top > 0.5, `graph is too small: ${placement}`);
}

/**
 * Read the visible graph from its screen-reader description: vertex names and
 * each vertex's degree (a loop counts 2).
 */
export async function describedGraph(page) {
  const text = await page.locator('.mode-panel:not([hidden]) .graph-view .sr-only').innerText();
  const names = [...text.matchAll(/Vertex \d+ labeled (\w+)\./g)].map(m => m[1]);
  const degree = Object.fromEntries(names.map(n => [n, 0]));
  for (const [, a, b] of text.matchAll(/An edge between (\w+) and (\w+)\./g)) { degree[a]++; degree[b]++; }
  for (const [, a] of text.matchAll(/A loop on vertex (\w+)\./g)) degree[a] += 2;
  return { text, names, degree };
}

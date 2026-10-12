// Every page of the site, for checks that run on all of them (accessibility
// test, screenshot script). Read from topics.js and each topic's modes.js, so
// a new topic or mode is included without changing this file.

import topics from '../../topics.js';

/**
 * [{ name, path }]: the hub, each topic page without a hash, and every mode.
 * `path` is relative to the site root; `name` is usable as a file name.
 */
export async function sitePages() {
  const pages = [{ name: 'hub', path: '' }];
  for (const topic of topics) {
    const { default: modes } = await import(`../../${topic.id}/modes.js`);
    pages.push({ name: topic.id, path: `${topic.id}/` });
    for (const mode of modes) pages.push({ name: `${topic.id}-${mode.id}`, path: `${topic.id}/#${mode.id}` });
  }
  return pages;
}

/**
 * Wait until a page from sitePages() has drawn its content: the hub's topic
 * cards, or the open mode (its intro, and its graph if it has one). Then give
 * MathJax (loaded from a CDN) a moment, without failing if it never loads.
 */
export async function waitForPage(page) {
  await page.waitForSelector('.topic-card, .mode-panel:not([hidden]) .info, .mode-panel:not([hidden]) .mode-error');
  const graph = page.locator('.mode-panel:not([hidden]) .graph-viewport');
  if (await graph.count()) await page.waitForSelector('.mode-panel:not([hidden]) .graph-viewport canvas');
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
}

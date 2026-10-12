// Automated accessibility checks (axe-core, WCAG 2.2 A and AA rules) on every
// page of the site, at desktop and phone width, as each page first opens.
//
// EXPECTED lists known failures (none now). The test fails on any other
// failure, and also when an expected one no longer happens, so that fixing
// something means removing it from the list.
//
// axe finds only some problems (contrast, names, labels, structure); it
// doesn't replace trying a page with the keyboard and a screen reader.

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { useBrowser } from './helpers/browser.js';
import { sitePages, waitForPage } from './helpers/pages.js';

const AXE_PATH = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const RULES = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const WIDTHS = [1280, 390];

/**
 * Known failures: axe rule id, the pages it fails on (names from sitePages(),
 * or 'any' for failures all over the site, which must happen on at least one
 * page), and why. `mathJax: true`: only happens once MathJax has loaded from
 * its CDN, so it isn't required when it didn't load. `sometimes: true`: only
 * happens for some of a mode's random questions, so it isn't required.
 */
const EXPECTED = [
  // Empty: every page passes. Add an entry only with a reason, and fix it soon.
];

const site = useBrowser();
const seen = new Map();   // rule id -> Set of page names it failed on
const mathJaxPages = new Set();   // pages where MathJax loaded

test('accessibility: every page, desktop and phone', { concurrency: 4 }, async t => {
  const pages = await sitePages();
  await Promise.all(pages.flatMap(({ name, path }) => WIDTHS.map(width =>
    t.test(`${name} at ${width}px`, async () => {
      const { page, close } = await site.openPage(path, { width });
      try {
        await waitForPage(page);
        if (await page.evaluate(() => Boolean(window.MathJax?.startup))) mathJaxPages.add(name);
        await page.addScriptTag({ path: AXE_PATH });
        const { violations } = await page.evaluate(
          rules => window.axe.run(document, { runOnly: { type: 'tag', values: rules } }), RULES);

        for (const v of violations) {
          if (!seen.has(v.id)) seen.set(v.id, new Set());
          seen.get(v.id).add(name);
        }
        const unexpected = violations.filter(v => !EXPECTED.some(e =>
          e.rule === v.id && (e.pages === 'any' || e.pages.includes(name))));
        assert.deepEqual(unexpected.map(describe), [], `new accessibility failures on ${path || 'the hub'} at ${width}px`);
      } finally {
        await close();
      }
    }))));
});

after(() => {
  // Runs once every page has been checked; a failure here fails the file.
  const fixed = [];
  for (const e of EXPECTED.filter(e => !e.sometimes)) {
    const failedOn = seen.get(e.rule) ?? new Set();
    if (e.pages === 'any') {
      if (failedOn.size === 0) fixed.push(`${e.rule} (all pages)`);
      continue;
    }
    for (const name of e.pages) {
      if (e.mathJax && !mathJaxPages.has(name)) continue;
      if (!failedOn.has(name)) fixed.push(`${e.rule} on ${name}`);
    }
  }
  assert.deepEqual(fixed, [], 'these expected failures no longer happen: remove them from EXPECTED in test/accessibility.test.js');
});

/** One axe failure as readable text: rule, what it means, and up to three elements. */
function describe(v) {
  const where = v.nodes.slice(0, 3).map(n => `  ${n.target.join(' ')}: ${n.failureSummary.replace(/\s+/g, ' ')}`);
  if (v.nodes.length > 3) where.push(`  …and ${v.nodes.length - 3} more`);
  return [`${v.id}: ${v.help}`, ...where].join('\n');
}

// Screenshots of every page (hub, topic pages, every mode) at desktop and
// phone width, for comparing the look before and after a change. Not part of
// `npm test`.
//
//   node test/screenshots.js before     # writes screenshots/before/*.png
//   ...change things...
//   node test/screenshots.js after      # writes screenshots/after/*.png
//
// The folder name defaults to "current". screenshots/ is gitignored.
// Only the given pages: node test/screenshots.js after hub graph-theory-degree

import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { startServer } from './helpers/static-server.js';
import { sitePages, waitForPage } from './helpers/pages.js';

const WIDTHS = [1280, 390];
const [label = 'current', ...only] = process.argv.slice(2);
const outDir = path.resolve(import.meta.dirname, '..', 'screenshots', label);

const pages = (await sitePages()).filter(p => only.length === 0 || only.includes(p.name));
if (pages.length === 0) {
  console.error(`No pages named ${only.join(', ')}. Names: ${(await sitePages()).map(p => p.name).join(', ')}`);
  process.exit(1);
}

await fs.mkdir(outDir, { recursive: true });
const server = await startServer();
const browser = await chromium.launch();
try {
  for (const { name, path: pagePath } of pages) {
    for (const width of WIDTHS) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      page.on('pageerror', e => console.error(`${name} (${width}): ${e.message}`));
      await page.goto(server.url + pagePath);
      await waitForPage(page);
      const file = path.join(outDir, `${name}-${width}.png`);
      await page.screenshot({ path: file, fullPage: true });
      await context.close();
    }
    console.log(name);
  }
  console.log(`Saved ${pages.length * WIDTHS.length} screenshots in ${path.relative(process.cwd(), outDir) || '.'}`);
} finally {
  await browser.close();
  await server.close();
}

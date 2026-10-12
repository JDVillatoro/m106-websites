// Stylesheets other than shared/css/tokens.css use the tokens for colors and
// fonts: no hex colors, color functions (rgb(), hsl(), …), color names or font
// names. Keeps the look in one file and the same on every page.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const SKIP_DIRS = new Set(['.git', 'node_modules', 'vendor', 'screenshots']);
const TOKENS = 'shared/css/tokens.css';

/**
 * Raw values allowed for now: [file, the value as written]. Each must still
 * be in the file, so fixing one means removing it here.
 */
const EXCEPTIONS = [
  // Colored shadows from the old look; redesign pass 2 removes them.
  ['shared/css/components.css', 'rgba(102, 126, 234, 0.3)'],
  ['shared/css/components.css', 'rgba(102, 126, 234, 0.25)'],
  ['shared/css/components.css', 'rgba(118, 75, 162, 0.35)'],
];

// CSS color keywords. `transparent`, `currentColor` and `inherit` are fine.
const COLOR_NAMES = new Set(`aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond
  blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan
  darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen
  darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey
  darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite
  forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink
  indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral
  lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen
  lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta
  maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue
  mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin
  navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen
  paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red
  rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue
  slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white
  whitesmoke yellow yellowgreen`.split(/\s+/));
const COLOR_FUNCTION = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\([^()]*(?:\([^()]*\)[^()]*)*\)/gi;
const HEX = /#[0-9a-f]{3,8}\b/gi;
const GENERIC_FONTS = /["']|\b(?:serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-\w+)\b/i;

async function cssFiles(dir = REPO_ROOT) {
  const files = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) files.push(...await cssFiles(path.join(dir, entry.name)));
    } else if (entry.name.endsWith('.css')) {
      files.push(path.relative(REPO_ROOT, path.join(dir, entry.name)).split(path.sep).join('/'));
    }
  }
  return files;
}

/** [property, value] for every declaration in `css` (comments removed). */
function declarations(css) {
  const blocks = css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/\{([^{}]*)\}/g);
  return [...blocks].flatMap(([, body]) => body.split(';')
    .map(d => d.match(/^\s*([\w-]+)\s*:\s*([\s\S]*?)\s*$/))
    .filter(Boolean)
    .map(([, prop, value]) => [prop.toLowerCase(), value]));
}

/** The raw colors and font names in one declaration. */
function rawValues(prop, value) {
  const found = [...value.match(COLOR_FUNCTION) ?? [], ...value.match(HEX) ?? []];
  const words = value.replace(COLOR_FUNCTION, '').replace(/var\([^)]*\)/g, '').match(/[a-z-]+/gi) ?? [];
  found.push(...words.filter(w => COLOR_NAMES.has(w.toLowerCase())));
  if (prop === 'font-family' && !/^(?:var\(--[\w-]+\)|inherit)$/.test(value)) found.push(value);
  if (prop === 'font' && GENERIC_FONTS.test(value)) found.push(value);
  return found;
}

test('stylesheets use tokens for colors and fonts', async () => {
  const files = (await cssFiles()).filter(f => f !== TOKENS);
  assert.ok(files.includes('shared/css/base.css'), 'found the stylesheets');

  const problems = [];
  const unusedExceptions = new Set(EXCEPTIONS.map(e => e.join(': ')));
  for (const file of files) {
    const css = await fs.readFile(path.join(REPO_ROOT, file), 'utf8');
    for (const [prop, value] of declarations(css)) {
      for (const raw of rawValues(prop, value)) {
        const key = `${file}: ${raw}`;
        if (EXCEPTIONS.some(e => e.join(': ') === key)) unusedExceptions.delete(key);
        else problems.push(`${key} (in ${prop}): use a token from ${TOKENS}`);
      }
    }
  }
  assert.deepEqual(problems, []);
  assert.deepEqual([...unusedExceptions], [], 'no longer in the file: remove from EXCEPTIONS in test/css.test.js');
});

test('the check finds raw colors and fonts', () => {
  const css = `
    /* #fff in a comment is fine */
    a:hover, #add { color: var(--color-text); background: transparent; white-space: nowrap; }
    @media (max-width: 600px) { .x { border: 1px solid #fff; box-shadow: 0 0 4px rgba(0, 0, 0, var(--a)); } }
    .y { color: White; font-family: Georgia, serif; font: 600 1rem/1.5 var(--font-body); }
    .z { font-family: var(--font-heading); font: inherit; outline-color: color-mix(in srgb, red 50%, blue); }`;
  assert.deepEqual(declarations(css).flatMap(([p, v]) => rawValues(p, v)), [
    '#fff', 'rgba(0, 0, 0, var(--a))', 'White', 'Georgia, serif', 'color-mix(in srgb, red 50%, blue)',
  ]);
});

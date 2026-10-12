# Adding modes and topics

How the site is put together, and how to add to it. For how it got this way,
see [merge-history.md](merge-history.md).

The site is a **hub** page linking to **topics** (graph theory, game theory).
Each topic page has tabs for its **modes**. A mode is anything that runs in a
topic page; an **exercise** is a mode that keeps score.

## Rules

- **No build step.** Plain HTML, CSS and JavaScript, using native ES modules
  (`import`/`export`). What's in the repo is what GitHub Pages serves.
- **Relative paths only** (`./`, `../`) in links, imports and stylesheets.
  The site lives at `https://jdvillatoro.github.io/m106-websites/`, so a path
  starting with `/` breaks there. The tests catch this.
- **Math in `lib/`, puzzles in modes.** `lib/graph/` and `lib/game.js` hold
  math any mode can use, with no page code, so Node can test them. What
  kinds of questions a mode asks, difficulty, wording and scoring belong in the
  mode's file. Some duplication between modes is fine if it keeps them
  independent. `lib/graph/` has one file per subject (`core.js`,
  `generate.js`, `eulerian.js`, `planar.js`, `coloring.js`, `iso.js`); modes
  import from the file they need, and never names starting with `_`.
- **Graph functions take a whole graph object**
  (`{ n, names, directed, edgeLabel, edges }`, described at the top of
  `lib/graph/core.js`), not pieces like `edges, n`.
- **User-facing text** goes in one `COPY` object at the top of each mode file.
- Code that doesn't fit, where the fix isn't obvious, gets a
  `TODO(refactor):` comment: `git grep 'TODO(refactor)'`.

## Layout

```
index.html, topics.js         hub page and its list of topics
shared/
  css/tokens.css              every color, font and size, as CSS variables
  css/base.css                page layout, headings, form controls
  css/components.css          tabs, buttons, feedback, scoreboard, forms
  js/topic-shell.js           builds a topic page from its modes.js
  js/ui.js                    feedback block, choice buttons, small helpers
  js/score.js, storage.js     scoring; saving in the browser
  js/math.js                  MathJax typesetting; fractions
<topic>/
  index.html                  links the CSS, starts the shell
  modes.js                    the topic's modes, in tab order
  lib/                        the topic's math, and its drawing code
  modes/<name>.js             one file per mode (+ .css, + .md spec if any)
vendor/                       Cytoscape and its SVG plugin; fonts/
test/                         npm test; see "Testing"
docs/                         this file and the merge history
```

## A topic page

`<topic>/index.html` links the stylesheets and starts the shell:

```html
<link rel="stylesheet" href="../shared/css/tokens.css">
<link rel="stylesheet" href="../shared/css/base.css">
<link rel="stylesheet" href="../shared/css/components.css">
<link rel="stylesheet" href="lib/graph-view.css">   <!-- topic-wide styles, if any -->
...
<div class="page" id="app"></div>
<script type="module">
  import { startTopic } from '../shared/js/topic-shell.js';
  import modes from './modes.js';
  startTopic({ id: 'graph-theory', title: 'Graph Theory', modes });
</script>
```

`modes.js` lists the modes in tab order (the first opens by default). Titles
are given here so the tabs can be drawn before any mode is loaded:

```js
export default [
  { id: 'make',   title: 'Make a Graph',     load: () => import('./modes/make.js') },
  { id: 'degree', title: 'Degree Sequences', load: () => import('./modes/degree.js') },
];
```

The shell (`shared/js/topic-shell.js`) draws the header and tabs, keeps the
open mode in the URL (`graph-theory/#degree`, so Back works and modes can be
linked to), loads each mode the first time its tab is opened and then keeps
it, adds the scoreboard and Reset button for exercises, and shows an error in
a mode's panel if it fails to load, without breaking the others.

## A mode

A mode file's default export:

```js
export default {
  scored: true,           // an exercise: the shell adds a scoreboard and Reset

  // Once, the first time the tab is opened. `root` is an empty element.
  mount(root, ctx) { ... },

  // Each time the tab is shown again (optional).
  show() { ... },

  // When Reset is pressed (exercises; optional). The shell has already
  // cleared the score; start a new question.
  reset() { ... },
};
```

`ctx` holds:

- `ctx.score` (exercises): `record(points)` counts one question and adds
  `points` (0 to 1); `addPoints(points)` adds to the current question, for
  questions in parts (Part 1 worth 0.5 with `record(0.5)`, Part 2 with
  `addPoints(0.5)`). The shell saves the score and redraws the scoreboard.
- `ctx.storage`: `get(name, fallback)`, `set(name, value)`, `remove(name)`
  for anything else to keep in the browser, under the mode's own name.

Load mode-only CSS from `mount` with
`loadStylesheet(new URL('./name.css', import.meta.url))`, not at the top of the
file: the file must also import in Node, for tests. A mode can also export
functions that don't touch the page (`parseDegreeSequence` in
`modes/degree.js`, `generatePlanarPuzzle` in `modes/planar.js`), so they can be
unit tested.

### The usual exercise

Most exercises follow the same pattern: a prompt (graph or matrix), one or
two parts, then a feedback block with "Next question". `shared/js/ui.js` has
the pieces:

- `feedbackHtml()` in the template, then `showFeedback(el, { correct,
  messageHtml })` and `hideFeedback(el)`. With `feedbackHtml({ retryLabel })`
  and `showFeedback(..., { canRetry: true })` it also offers "try again"
  (Hamiltonian uses this). The block shows an icon and its title ("Correct"
  or "Not quite", or `title`) in green or red.
- Buttons are outlined; give the main action (Submit) `.primary-btn` to
  fill it. Don't color buttons green or red: those mean only right and
  wrong answers, always with an icon or words as well.
- `.choice-row` with `.choice-btn` buttons; `lockChoices(row, chosen,
  correct)` after an answer, `resetChoices(row)` for the next question.
- Forms: `.answer-row` for label + input + button, and
  `<p class="input-error" role="alert">` for badly formatted or incomplete
  answers. Those aren't scored; mark the fields with `is-invalid`.
- `escapeHtml(text)` for anything put into HTML that isn't fixed text.

A small example to start from (`modes/degree.js` is the full version):

```js
import { feedbackHtml, showFeedback, hideFeedback, escapeHtml } from '../../shared/js/ui.js';

const COPY = {
  info: 'What is 2 + 2?',
  submit: 'Submit',
  empty: 'Type a number first.',
  wrong: n => `The answer is ${n}.`,
};

let root, score;
const $ = selector => root.querySelector(selector);

function newQuestion() {
  $('.answer').value = '';
  $('.answer').disabled = false;
  $('.input-error').textContent = '';
  hideFeedback($('.feedback'));
}

function submit() {
  const value = $('.answer').value.trim();
  if (value === '') return void ($('.input-error').textContent = COPY.empty);
  const correct = Number(value) === 4;
  score.record(correct ? 1 : 0);
  $('.answer').disabled = true;
  showFeedback($('.feedback'), { correct, messageHtml: correct ? '' : escapeHtml(COPY.wrong(4)) });
}

export default {
  scored: true,
  mount(el, ctx) {
    root = el;
    score = ctx.score;
    root.innerHTML = `
      <div class="info"><p>${COPY.info}</p></div>
      <form class="section quiz-form">
        <div class="answer-row">
          <input type="text" class="answer" aria-label="Answer">
          <button type="submit" class="primary-btn">${COPY.submit}</button>
        </div>
        <p class="input-error" role="alert"></p>
      </form>
      ${feedbackHtml()}`;
    $('.quiz-form').addEventListener('submit', event => {
      event.preventDefault();
      if (!$('.answer').disabled) submit();
    });
    $('.feedback-next').addEventListener('click', newQuestion);
    newQuestion();
  },
  reset() { newQuestion(); },
};
```

### Drawing graphs (graph theory)

`createGraphView(element, options)` from `graph-theory/lib/render.js` builds
a graph area, its screen-reader description and zoom buttons, and returns:

- `draw(graph)`: force-directed layout; `drawCircle(graph, order)`: on a circle;
- `setEdgeLabels(graph)`: show or change edge labels without moving vertices;
- `describe(graph)`: update the screen-reader text only;
- `refresh()`: fit the graph again (size changes are handled automatically);
- `cy`: the Cytoscape instance, for anything else (colors, highlights).

Options: `label` (accessible name), `zoomButtons`, `compact` (shorter area,
for two graphs on a page). The topic page links `lib/graph-view.css` in its
`<head>`: Cytoscape measures the area as soon as it's built.

### Drawing payoff matrices (game theory)

`renderPayoffMatrix(element, { rows, cols, payoffs })` from
`game-theory/lib/matrix-view.js` draws a matrix and returns its cells by
`"row-col"` key, for marking them (`is-selected`, `is-correct`, `is-missed`,
`is-crossed`, `is-answer`, `is-highlighted`, styled in `lib/matrix-view.css`
with icons, outlines or crossing out as well as color). Options:
`onCellClick` (cells become clickable and keyboard-usable), `rowLabels`,
`colLabels`, `playerLabels`, `editable` (text boxes, as in Play).

Strategy labels are TeX (`strategyLabel(index, player, count)` gives A, B, C
/ X, Y, Z). The matrix typesets its own; for other TeX on the page call
`clearMath(elements)` before replacing it and `typeset(elements)` after, from
`shared/js/math.js`.

## Scoring

Every exercise shows **Questions**, **Points** (fractions allowed) and
**Score** (points ÷ questions). Scores are saved in the browser under
`m106:<topic>:<mode>:score`, so a reload keeps them and Reset clears them.

## Styling

- Colors, fonts and sizes come only from the variables in
  `shared/css/tokens.css`. A redesign should mostly mean editing that file.
- Shared class names say what something is (`.choice-btn`, `.feedback`,
  `.scoreboard`, `.section`, `.info`, `.hint`), not which mode uses it.
- Styles for one mode go in `modes/<name>.css`, loaded by the mode. Styles a
  topic needs before any mode draws (sizes of graph areas, matrices) go in
  `<topic>/lib/` and are linked from the topic's `index.html`.
- Check pages at phone width (375 pixels): nothing should scroll sideways.

## Testing

`npm test` runs everything in `test/` (Node's test runner; browser tests use
Playwright with headless Chromium, which the dev container installs).

- `test/graph-theory/graph/<file>.test.js` (one per `lib/graph/` file; small
  graphs in `test/helpers/small-graphs.js`) and `test/game-theory/game.test.js`:
  the `lib/` math, with small examples checked by hand and many runs of the
  random generators.
- `test/<topic>/<mode>.test.js`: one per mode. Unit tests for what the mode
  exports, then browser tests: answer right, answer wrong, bad input, and
  `checkScoreSavedAndReset`. Tests work out the right answer from what's on
  the page (`test/helpers/graph-on-screen.js`, `matrix-on-screen.js`), using
  solvers written independently of the site's code.
- `test/site.test.js`: hub, tabs, Back button, error handling, phone width.
- `test/accessibility.test.js`: axe-core's WCAG 2.2 A/AA checks on every
  page (from `topics.js` and each `modes.js`, so new modes are included), at
  desktop and phone width. Its `EXPECTED` list holds the failures the site
  has now; a new failure, or an expected one that's gone, fails the test.
- `test/css.test.js`: stylesheets other than `tokens.css` have no raw colors
  or font names.

Browser tests serve the repo under `/m106-websites/` like GitHub Pages
(`test/helpers/static-server.js`) and fail on any console error from the
site's own files. Game theory tests use `openPage(path, { mathjax: false })`
so labels stay as readable TeX. The tests have missed layout problems before,
so also look at changed pages, at desktop and phone width:
`node test/screenshots.js before` (and `after`, once changed) saves every
page at 1280 and 390 pixels wide in `screenshots/<name>/` (gitignored); add
page names (`hub`, `graph-theory`, `graph-theory-degree`) to save only those.

## Outside libraries

- **Cytoscape** 3.26.0 and its SVG export plugin, copied into `vendor/` and
  loaded with plain `<script>` tags by the graph theory page.
- **MathJax** 3.2.2 from the jsDelivr CDN, loaded by the game theory page.
  Without it the site still works; labels show as TeX.
- **Fonts:** Source Sans 3 (400, 600, 700) and Gelasio (600), SIL Open Font
  License, Latin subset `woff2` files from Fontsource (`@fontsource/source-sans-3`
  5.3.1, `@fontsource/gelasio` 5.3.0) in `vendor/fonts/` with their licenses.
  `shared/css/tokens.css` declares them (`@font-face`).

## Checklists

**A new mode:**

1. Write `<topic>/modes/<name>.js` (and `.css`, and an `.md` spec if useful).
2. Add a line to `<topic>/modes.js`.
3. Put new math in `<topic>/lib/`, with unit tests.
4. Add `test/<topic>/<name>.test.js`, and the mode to the phone-width list
   in `test/site.test.js` (and the tab list there).
5. `npm test`; look at the mode at desktop and phone width.

**A new topic:**

1. Make `<topic>/index.html` (copy one), `modes.js`, `lib/`, `modes/`.
2. Add it to `topics.js`.
3. Add its tests, and its pages to `test/site.test.js`.

# Plan: merge the two sites into one

Status: steps 1–3 done on 2026-10-12. Turning on GitHub Pages (end of
step 1) is still to do.

The old sites are in `legacy/graph-theory/` and `legacy/game-theory/`,
unchanged, until the migration is done. This plan then replaces
`legacy/graph-theory/ADDING_MODES.md` and
`legacy/graph-theory/notes/WORK_SESSION_HANDOFF_2026-03-10.md`, which describe
how the old graph theory site works.

## Goal

One website, published on GitHub Pages:

- a **hub** page that links to each topic (graph theory, game theory, more
  later);
- a **topic page** for each topic, with tabs for its **modes**;
- one design, shared by every page.

Adding a topic or a mode should be quick and shouldn't involve editing shared
code.

## Decisions

| Question | Decision |
|---|---|
| Build step? | None. Plain HTML/CSS/JS, as now. |
| How do scripts share code? | Native ES modules (`<script type="module">`, `import`/`export`). This replaces the shared global scope and the dependence on script order. |
| Hosting | GitHub Pages, from `main`, repo root. The site will be at `https://jdvillatoro.github.io/m106-websites/`. |
| Links and imports | Always relative (`./`, `../`). Never start a path with `/`, because the site lives under `/m106-websites/`. |
| What is a mode? | Anything that runs inside a topic page. An **exercise** is a mode that keeps score. "Make a graph" and game theory's "Play" are modes that don't keep score. |
| Scores | Every exercise saves its score in the browser (`localStorage`), in both topics. Moving to the new address starts everyone at zero anyway. |
| Visual design | Keep the current look for now, restructured so it can be replaced easily. A redesign is a TODO for after the migration. |

## Target layout

```
index.html                    hub page
topics.js                     list of topics shown on the hub
.nojekyll                     tells GitHub Pages to serve files as they are
shared/
  css/tokens.css              colors, fonts, spacing as CSS variables
  css/base.css                reset, page layout, header
  css/components.css          tabs, buttons, feedback, scoreboard, cards
  js/topic-shell.js           builds a topic page from its list of modes
  js/score.js                 scoring
  js/storage.js               saving data in the browser
  js/ui.js                    feedback panel, choice buttons, DOM helpers
  js/math.js                  MathJax rendering, fraction parsing
vendor/
  cytoscape.min.js            pinned copy instead of loading from unpkg
  cytoscape-svg.js
graph-theory/
  index.html                  thin page: loads the shell with modes.js
  modes.js                    list of graph theory modes
  lib/graph.js                graph math (today's graph.js)
  lib/graph.md                docs for lib/graph.js (npm run graph-docs
                              refreshes it with lib/update-graph-md-refs.js)
  lib/render.js               Cytoscape drawing (createGraphView)
  lib/graph-view.css          styles for the graph areas render.js builds
  modes/make.js
  modes/degree.js
  modes/eulerian.js           + eulerian.md (mode specs stay with their modes)
  ...
game-theory/
  index.html
  modes.js
  lib/game.js                 game math (today's gameTheoryUtils.js)
  lib/matrix-view.js          payoff matrix drawing (renderPayoffMatrix)
  lib/matrix-view.css         its styles
  modes/play.js
  modes/best-response.js
  modes/dominance.js
  modes/nash.js
  modes/expected-payoff.js
  modes/indifference.js
test/                         run everything with: npm test
  site.test.js                hub, tabs, errors, phone width (browser)
  graph-theory/graph.test.js  lib/graph.js (Node)
  graph-theory/degree.test.js one file per mode (browser, plus Node tests
  ...                         for anything the mode exports)
  game-theory/...             same for game theory
  helpers/                    test server (repo under /m106-websites/) and
                              browser helpers
package.json                  test tools only (Playwright); not used by the site
legacy/                       the old sites, deleted in step 6
```

The math files (`lib/graph.js`, `lib/game.js`) have no DOM code, so they can be
tested in Node. Drawing code (`lib/render.js`, `lib/matrix-view.js`) is kept
separate from them.

## How a topic page works

A topic's `index.html` holds almost nothing:

```html
<link rel="stylesheet" href="../shared/css/tokens.css">
<link rel="stylesheet" href="../shared/css/base.css">
<link rel="stylesheet" href="../shared/css/components.css">
...
<main id="app"></main>
<script type="module">
  import { startTopic } from '../shared/js/topic-shell.js';
  import modes from './modes.js';
  startTopic({ id: 'graph-theory', title: 'Graph Theory', modes });
</script>
```

`modes.js` lists the modes in tab order. It gives each mode's title up front,
so the tabs can be drawn without loading every mode:

```js
export default [
  { id: 'make',     title: 'Make a Graph',   load: () => import('./modes/make.js') },
  { id: 'eulerian', title: 'Eulerian Graphs', load: () => import('./modes/eulerian.js') },
  // ...
];
```

The shell (`shared/js/topic-shell.js`) handles:

- the page header, with a link back to the hub;
- the mode tabs;
- the URL hash: `graph-theory/#eulerian` opens that mode, and the browser's
  Back button moves between modes;
- loading a mode the first time its tab is opened, then keeping it in memory
  so its state is kept when switching tabs;
- the scoreboard and Reset button, for exercises only;
- showing an error message in a mode's panel if that mode fails to load,
  without breaking the other modes.

## How a mode works

A mode is one file whose default export looks like this:

```js
import { someGraphFunction } from '../lib/graph.js';
import { showFeedback } from '../../shared/js/ui.js';

export default {
  scored: true,                 // false or left out: no scoreboard

  // Called once, the first time the mode is opened.
  // `root` is an empty element; the mode builds its own HTML inside it.
  mount(root, ctx) { ... },

  // Called each time the mode's tab is shown again (optional), e.g. to
  // restart a timer. Graph areas from createGraphView re-fit by themselves.
  show() { ... },

  // Called when the user presses Reset (optional; exercises only).
  // The shell clears the score itself; the mode starts a new question.
  reset() { ... },
};
```

`ctx` gives the mode what the shell provides:

- `ctx.score`, for exercises:
  - `ctx.score.record(points)` counts one question and adds `points`
    (between 0 and 1);
  - `ctx.score.addPoints(points)` adds points to the current question without
    counting another one, for questions in several parts (for example
    0.5 + 0.5);
  - the shell redraws the scoreboard and saves the score.
- `ctx.storage`, for anything else the mode wants to save, stored under the
  mode's own name.

Each mode keeps its user-facing text in one object at the top of the file
(`const COPY = { ... }`), as the graph theory modes already do.

A mode may also export named functions that don't touch the page, such as
`parseDegreeSequence` in `modes/degree.js`, so they can be unit tested.

### Drawing graphs

A graph mode calls `createGraphView(element)` from `lib/render.js`. It builds
the graph area, a screen-reader description and zoom buttons inside the
element, and returns:

- `draw(graph)`: draw with a force-directed layout;
- `drawCircle(graph, vertexOrder)`: vertices on a circle;
- `refresh()`: fit the graph to its area again, undoing the user's zoom
  (changes in the area's size are handled automatically);
- `cy`: the Cytoscape instance, for anything more specific (coloring
  vertices, highlighting edges).

This replaces the old `getCy(mode)` and its table of element ids. The page
must link `lib/graph-view.css` in its `<head>`: Cytoscape measures the graph
area as soon as it's built, so its size must already be styled.
`graph-theory/modes/degree.js` is a small example.

### Drawing payoff matrices

A game mode calls `renderPayoffMatrix(element, { rows, cols, payoffs })` from
`lib/matrix-view.js`. It returns the payoff cells by `"row-col"` key, so the
mode can mark them. With `onCellClick`, cells can be chosen by mouse or
keyboard. Labels default to A, B, C / X, Y, Z (`strategyLabel`) and are TeX,
typeset by MathJax through `shared/js/math.js`. Cell markings shared between
modes (`is-selected`, `is-missed`, `is-crossed`) are in `lib/matrix-view.css`.
`game-theory/modes/nash.js` is the example.
### Adding a mode

1. Write `<topic>/modes/<name>.js`.
2. Add one line to `<topic>/modes.js`.
3. If it needs new math, add it to `<topic>/lib/` with a test.

### Adding a topic

1. Make a folder with `index.html`, `modes.js`, `lib/` and `modes/`.
2. Add one entry to `topics.js`.

## Scoring

The same everywhere: **Questions**, **Points** (fractions allowed) and
**Score** (points ÷ questions, as a percent). Game theory's
"Correct / Incorrect" display changes to this.

Scores are saved under `m106:<topic>:<mode>:score`.

## Styling

- `tokens.css` holds every color, font and spacing value as a CSS variable.
  Other files use only the variables. A later redesign should mostly mean
  editing this file.
- Shared class names describe what an element is, not which mode it belongs
  to: `.choice-btn` (not `.eulerian-choice-btn`), `.feedback` (not
  `.training-feedback`), `.scoreboard` (not `.ep-stats`, `.nash-stats`, ...).
- CSS used by only one mode goes in a file next to that mode
  (`modes/coloring.css`), which the mode loads itself.

## Testing

`npm test` runs everything in `test/`:

- unit tests for the math in `lib/graph.js` and `lib/game.js`, using small
  examples checked by hand, plus repeated runs of the random generators;
- browser tests that serve the repo the way GitHub Pages does (under
  `/m106-websites/`, so a link starting with `/` fails) and click through the
  pages in headless Chromium, failing on any console error from the site's
  own files.

Each ported mode gets its own test file in `test/<topic>/`: answer right,
answer wrong, check the feedback, and `checkScoreSavedAndReset`. The tests
work out the right answer from the page itself (the graph's screen-reader
description, the payoffs in the matrix) using the `lib/` functions. New math
in `lib/` gets unit tests.

## Outside libraries

- **Cytoscape** 3.26.0 and its SVG export plugin are in `vendor/`, loaded with
  plain `<script>` tags on the graph theory page (they aren't ES modules). The
  plugin was copied from the old site; its version isn't recorded.
- **MathJax** 3.2.2 is loaded from the jsDelivr CDN by the game theory page
  (it's large and loads its own pieces, so it isn't copied into `vendor/`).
  Pages still work without it; strategy labels then show as TeX.

## Migration steps

The old sites stay in `legacy/` until step 6, so there's always a working
site. Until then, the hub links to them as "Old version", and each topic has
a placeholder "About" mode that links there too.

1. **Skeleton.** *Done, except turning on GitHub Pages.* Hub page,
   `topics.js`, shared CSS (current look, moved into tokens and generic class
   names), `topic-shell.js`, `score.js`, `ui.js`, `.nojekyll`. Two topic pages
   with placeholder modes. Turn on GitHub Pages and check the published site
   works.
2. **Libraries.** *Done.* Copy `graph.js` and `gameTheoryUtils.js` from
   `legacy/` into `lib/` and turn them into ES modules. (Copy, not move: the
   old sites still need theirs.) Add basic Node tests and the browser test.
   Move Cytoscape drawing out of `script.js` into `graph-theory/lib/render.js`.
   Update `update-graph-md-refs.js` for the new paths.
3. **First two modes.** *Done.* Port one graph mode (degree) and one game mode
   (Nash). These test the mode format against both kinds of page; adjust the
   shell if they show problems. Delete the sample exercise
   (`graph-theory/modes/sample.js`).
   Differences from the old modes, on purpose:
   - Both: scored as Questions / Points / Score; "Next question" instead
     of "Try Again" (it always gave a new question); feedback text rewritten
     where it was wrong or unclear.
   - Degree: badly formatted answers get a message instead of a brief red
     outline, and only whole numbers are accepted (`1.5` and `2a` used to
     count as 1 and 2). Enter submits.
   - Nash: "equilibria" instead of "equilibriums"; cells are locked after
     submitting (they could still be toggled) and can be chosen with the
     keyboard.
4. **Remaining graph theory modes**, one at a time: make, eulerian, iso,
   planar, coloring, applications, hamiltonian. Check each in the browser.
   Remove hidden links between modes as they come up (for example,
   `updateGraphAria` in `script.js` calls the make mode's
   `refreshAltTextPanel`; `render.js` no longer does, so the make mode must
   update its own alt-text panel).
5. **Remaining game theory modes**, one at a time: play, best response,
   dominance, expected payoff, indifference. This means splitting the
   2,261-line `script.js`. Matrix drawing that several modes share goes to
   `lib/matrix-view.js`; where modes differ, the code stays in the mode.
6. **Clean up.** Delete `legacy/`, the placeholder modes and the
   `legacyHref` entries in `topics.js`. Write `ADDING_MODES.md` for the new
   setup (based on the "How a mode works" section above). Update `README.md`
   and `CLAUDE.md`. Retire the old handoff notes.

After each step: run `npm test`, then open every page that changed and try
each mode that changed.

## Not part of this migration

- **Visual redesign.** TODO for after the migration. The tokens and generic
  class names from step 1 are there to make it easy.
- **Finishing the `graph.js` cleanup** described in the old handoff notes
  (moving the Applications mode's code out of `graph.js`). Do it as separate
  work, before or after, so it doesn't get mixed up with moving files around.
  Code moved during the migration keeps its current behavior.

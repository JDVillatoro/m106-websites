# M106 websites

Interactive practice website for M106: plain HTML/CSS/JavaScript with native
ES modules, no build step, no framework, published with GitHub Pages from
`main` at https://jdvillatoro.github.io/m106-websites/. A hub page links to
topics (graph theory, game theory); each topic page has tabs for its modes.

Read `docs/adding-modes.md` before changing or adding a mode: it describes
the mode format, the shared helpers and the tests.
`docs/merge-history.md` records how the two original sites were merged, what
changed on purpose, and what's still to do.

## Layout

- `index.html` + `topics.js`: hub page.
- `shared/`: CSS (`tokens.css` holds every color and size) and JS used by
  every page; `shared/js/topic-shell.js` builds a topic page from its
  `modes.js`.
- `graph-theory/`, `game-theory/`: topic pages. Each has `index.html`,
  `modes.js` (one line per mode), `modes/` (one file per mode, plus its CSS
  and spec `.md` if any) and `lib/` (the topic's math, plus drawing code).
  `lib/graph.js` is being cleaned up: see `docs/graph_cleanup_plan.md`.
- `vendor/`: pinned copies of Cytoscape and its SVG plugin.
- `test/`: `npm test` runs Node unit tests and Playwright browser tests (the
  site served under `/m106-websites/`, as on GitHub Pages): `site.test.js`
  for shared behavior, `test/<topic>/<mode>.test.js` per mode, helpers in
  `test/helpers/`. `package.json` exists only for this.
- `.devcontainer/`: serves the repo root at http://localhost:8080/ with
  Python's built-in web server; log in `/tmp/server.log` (shown by
  `.vscode/tasks.json`). Has Node and the Claude Code extension; installs
  the test tools and headless Chromium when the container is created.

## Conventions

- Links and imports are relative (`./`, `../`), never starting with `/`: on
  GitHub Pages the site lives under `/m106-websites/`.
- `lib/graph.js` and `lib/game.js` are math only (no page code); puzzle
  design, wording and scoring belong in the mode's file.
- Code that doesn't fit, where the fix isn't obvious, gets a
  `TODO(refactor):` comment instead of a guess. Find them with
  `git grep 'TODO(refactor)'`.
- While working, run only the tests a change can affect (modes import only
  their topic's `lib/` and `shared/`, never each other):
  - one mode: `node --test test/<topic>/<mode>.test.js`
  - a topic's `lib/`: `node --test "test/<topic>/**/*.test.js"`
  - `shared/`, `index.html`, `topics.js`, a `modes.js`: `npm test`
  - add `test/site.test.js` if a change could affect tabs or layout.
  Run the full `npm test` before saying work is done: pushing to `main`
  publishes. Look at changed pages too (screenshots, desktop and phone
  width): tests have missed layout bugs before.
- Line endings are LF (`.gitattributes`).

## History

Imported on 2026-10-11 with `git subtree` from two IU GitHub repos
(`github.iu.edu/jvillato/M106-Graph-Theory` and `M106-Game-Theory`), which
are no longer used and must not be pushed to. During the import the
Hamiltonian mode, staged but never committed in a Windows copy, was committed
on top of upstream's refactor ("Add Hamiltonian graphs mode"). The two sites
were merged into one on 2026-10-11/12 (`docs/merge-history.md`); the old code
is only in git history, in `legacy/` from commit `12be43f` until the last
step of the merge. Comments saying "Ported from legacy/…" refer to those
files. Old commits have files at the top level: use `git log --follow <path>`.

# M106 websites

Interactive practice website for M106: plain HTML/CSS/JavaScript, no build
step, no framework, published with GitHub Pages. Two old sites are being
merged into one; `PLAN.md` has the plan, the target layout and the mode
format, and says which step is done.

## Layout

- `index.html` + `topics.js`: hub page listing the topics.
- `shared/`: CSS (`tokens.css` holds every color and size) and JS used by
  every page; `shared/js/topic-shell.js` builds a topic page from its
  `modes.js`.
- `graph-theory/`, `game-theory/`: new topic pages. Each has `index.html`,
  `modes.js` (one line per mode), `modes/` (one file per mode) and `lib/`
  (the topic's math, plus drawing code). `graph-theory/lib/graph.md`
  documents `lib/graph.js`; refresh it with `npm run graph-docs`.
- `vendor/`: pinned copies of Cytoscape and its SVG plugin.
- `test/`: `npm test` runs Node unit tests for the `lib/` math and
  Playwright browser tests (site served under `/m106-websites/`, as on
  GitHub Pages): `site.test.js` for shared behavior, `test/<topic>/<mode>.test.js`
  per mode, helpers in `test/helpers/`. `package.json` exists only for this.
- `legacy/`: the two old sites, unchanged, until their modes are moved
  (PLAN.md step 6). `legacy/graph-theory/` has its own docs
  (`notes/WORK_SESSION_HANDOFF_2026-03-10.md`, `ADDING_MODES.md`).
- `.devcontainer/`: serves the repo root at http://localhost:8080/ with
  Python's built-in web server; log in `/tmp/server.log` (shown by
  `.vscode/tasks.json`). Has Node and the Claude Code extension; installs
  the test tools and headless Chromium when the container is created.

## Conventions

- New code uses native ES modules (`import`/`export`). The old sites in
  `legacy/` use one global scope and load in `index.html` order.
- Links and imports are relative (`./`, `../`), never starting with `/`: on
  GitHub Pages the site lives under `/m106-websites/`.
- Code that doesn't fit the planned structure, where the fix isn't obvious,
  gets a `TODO(refactor):` comment instead of a guess. Find them with
  `git grep 'TODO(refactor)'`.
- Run `npm test` after changes, and look at changed pages too (screenshots):
  tests have missed layout bugs before. A ported mode gets its own test file;
  new math in `lib/` gets unit tests.
- Line endings are LF (`.gitattributes`).

## History

Imported on 2026-10-11 with `git subtree` from two IU GitHub repos
(`github.iu.edu/jvillato/M106-Graph-Theory` and `M106-Game-Theory`), which
are no longer used and must not be pushed to. Old commits have files at the
top level, and the old sites have since moved into `legacy/`: use
`git log --follow <path>`. During the import the Hamiltonian
mode, staged but never committed in a Windows copy, was committed on top of
upstream's refactor ("Add Hamiltonian graphs mode").

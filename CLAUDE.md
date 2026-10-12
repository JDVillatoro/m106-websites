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
  `modes.js` (one line per mode) and `modes/` (one file per mode).
- `legacy/`: the two old sites, unchanged, until their modes are moved
  (PLAN.md step 6). `legacy/graph-theory/` has its own docs
  (`notes/WORK_SESSION_HANDOFF_2026-03-10.md`, `ADDING_MODES.md`); its
  `graph.md` documents `graph.js` and is refreshed with
  `node update-graph-md-refs.js` run from that folder.
- `.devcontainer/`: serves the repo root at http://localhost:8080/ with
  Python's built-in web server; log in `/tmp/server.log` (shown by
  `.vscode/tasks.json`). Has Node and the Claude Code extension.

## Conventions

- New code uses native ES modules (`import`/`export`). The old sites in
  `legacy/` use one global scope and load in `index.html` order.
- Links and imports are relative (`./`, `../`), never starting with `/`: on
  GitHub Pages the site lives under `/m106-websites/`.
- Code that doesn't fit the planned structure, where the fix isn't obvious,
  gets a `TODO(refactor):` comment instead of a guess. Find them with
  `git grep 'TODO(refactor)'`.
- Line endings are LF (`.gitattributes`).

## History

Imported on 2026-10-11 with `git subtree` from two IU GitHub repos
(`github.iu.edu/jvillato/M106-Graph-Theory` and `M106-Game-Theory`), which
are no longer used and must not be pushed to. Old commits have files at the
top level, and the old sites have since moved into `legacy/`: use
`git log --follow <path>`. During the import the Hamiltonian
mode, staged but never committed in a Windows copy, was committed on top of
upstream's refactor ("Add Hamiltonian graphs mode").

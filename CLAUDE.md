# M106 websites

Interactive practice websites for M106: plain HTML/CSS/JavaScript, no build
step, no framework. Two sites for now; the goal is a big refactor into a
single website (not started yet).

## Layout

- `graph-theory/`: graph theory practice app with one file per mode
  (`*-mode.js`, plus a `*-mode.md` spec for most modes). `graph.js` is the
  shared graph code. Start with `notes/WORK_SESSION_HANDOFF_2026-03-10.md`
  (architecture and the in-progress refactor) and `ADDING_MODES.md`.
  `graph.md` documents `graph.js`; refresh it with
  `node update-graph-md-refs.js` run from `graph-theory/`.
- `game-theory/`: game theory practice app (`index.html`, `script.js`,
  `gameTheoryUtils.js`, `style.css`).
- `.devcontainer/`: serves the repo root at http://localhost:8080/ with
  Python's built-in web server; log in `/tmp/server.log` (shown by
  `.vscode/tasks.json`). Has Node and the Claude Code extension.

## Conventions

- Scripts share one global scope and load in `index.html` order; there are no
  modules.
- Code that doesn't fit the planned structure, where the fix isn't obvious,
  gets a `TODO(refactor):` comment instead of a guess. Find them with
  `git grep 'TODO(refactor)'`.
- Line endings are LF (`.gitattributes`).

## History

Imported on 2026-10-11 with `git subtree` from two IU GitHub repos
(`github.iu.edu/jvillato/M106-Graph-Theory` and `M106-Game-Theory`), which
are no longer used and must not be pushed to. Old commits have files at the
top level: use `git log --follow <path>`. During the import the Hamiltonian
mode, staged but never committed in a Windows copy, was committed on top of
upstream's refactor ("Add Hamiltonian graphs mode").

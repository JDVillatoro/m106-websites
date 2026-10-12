# Merging the two sites (October 2026)

Until October 2026 there were two separate sites, graph theory and game
theory, each in its own IU GitHub repo. They were imported here with
`git subtree` and merged into one site in six steps, finished on 2026-10-12.
This is the record of what was decided and changed. For how the site works
now, see [adding-modes.md](adding-modes.md).

The old code is in git history: in `graph-theory/` and `game-theory/` until
commit `12be43f` (step 1) moved it to `legacy/`, where it stayed until step 6
deleted it. File headers that say "Ported from legacy/…" refer to those files.
Commits from before the import have the files at the top level:
`git log --follow <path>` finds them.

## Decisions

| Question | Decision |
|---|---|
| Build step? | None: plain HTML/CSS/JS, as before. |
| Sharing code | Native ES modules, replacing the old shared global scope and its dependence on script order. |
| Hosting | GitHub Pages from `main`: `https://jdvillatoro.github.io/m106-websites/`. |
| Paths | Always relative, since the site lives under `/m106-websites/`. |
| Modes | Anything in a topic page is a mode; an exercise is a mode that keeps score. Make a Graph and Play are modes without scores. |
| Scores | Saved in the browser for every exercise (game theory didn't save before). |
| Look | The old look, rebuilt on design tokens so it can be redesigned later. |

## Steps

1. **Skeleton:** hub, shared CSS (old look, as tokens and generic class
   names), the topic shell, scoring and saving, two topic pages with
   placeholder modes. The old sites moved to `legacy/`, unchanged, and the
   hub linked to them as "Old version" until step 6.
2. **Libraries:** `graph.js` and `gameTheoryUtils.js` became ES modules in
   `lib/` (functions unchanged), Cytoscape drawing moved to
   `graph-theory/lib/render.js`, Cytoscape copied into `vendor/`, and the
   tests and `package.json` were added.
3. **First two modes:** Degree Sequences and Nash Equilibria.
4. **The other graph theory modes**, each with its spec moved next to it.
5. **The other game theory modes.**
6. **Clean up:** deleted `legacy/` and the "Old version" links; replaced the
   old `ADDING_MODES.md` and handoff notes with [adding-modes.md](adding-modes.md).
   The graph theory repo's MIT license moved to the repo root, so it now
   covers the whole site.

## Bugs in the old sites, fixed

- **Planar:** Part 2 (counting vertices, edges, faces) never submitted; it
  checked a `planarCounts` field an earlier refactor had removed.
- **Hamiltonian:** about 1 nearest-neighbor puzzle in 5 started at vertex A
  and lost it ("Start at vertex undefined"), so no answer was accepted
  (`||` instead of `??` in `generateHamiltonianPuzzle`).
- **Hamiltonian:** after a wrong cycle, only Reset moved on; now there are
  "Let me try again" and "Next question", as the spec says.
- **Applications:** about 1 interference puzzle in 150 showed rounded
  distances that contradicted its own answer; those are now skipped.
- **Indifference:** the answer shown was wrong about 1 time in 14 (7/13 as
  "6/11"), and answers within 0.02 were accepted (2/7 for 5/17). Both are
  now exact; the answers are fractions with denominators up to 20.
- **Play:** payoffs typed in after "Update Dimensions" were thrown away;
  payoffs that weren't numbers were played as 0; strategies with the same
  name clashed.
- **Isomorphism:** the reason "Different number of triangles/squares" only
  checked triangles; it now says "triangles".

## Deliberate changes

- **Everywhere:** scores show Questions / Points / Score; "Next question"
  instead of "Try Again" (it always gave a new question); empty or badly
  formatted answers get a message and aren't scored; Part 1 stays on screen
  after answering, with the choice colored; one feedback block per mode;
  smaller tabs on narrow screens; strategy labels typeset everywhere.
- **Degree:** only whole numbers are accepted (`1.5` used to count as 1);
  Enter submits.
- **Nash:** "equilibria" instead of "equilibriums"; cells lock after
  submitting and can be chosen with the keyboard.
- **Hamiltonian:** the non-Hamiltonian reason can't be retried (retrying let
  students try all three for full points); revealing weights no longer moves
  the vertices.
- **Eulerian:** naming a vertex that doesn't exist when Eulerizing gets a
  message instead of starting a new question.
- **Make a Graph:** the "MCS Graph" randomize option (which did nothing
  different) is gone; new vertices get letters instead of blank names.
- **Best Response:** the right cells stay highlighted after a wrong answer.
- **Dominance:** every pair must be answered; still scored all or nothing.
- **Play:** "Update dimensions" keeps the editor open; only the last outcome
  stays highlighted.

## Still to do

- **Visual redesign.** The look is still the old one. Colors, fonts and
  sizes are all in `shared/css/tokens.css`, which is where to start.
- **Isomorphism:** a "different number of squares" reason (TODO in
  `graph-theory/modes/iso.js`).
- Possible: partial credit in Dominance (per pair) instead of all or nothing.

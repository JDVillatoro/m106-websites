# graph.js cleanup plan

`graph-theory/lib/graph.js` is about 3,100 lines: shared graph math mixed
with puzzle code for several modes. The goal is small files of graph math
only, with puzzle design, wording and scoring in the modes (the rule in
[adding-modes.md](adding-modes.md)), so that a task on one mode doesn't need
the whole file.

This file replaces `lib/graph.md`, a generated list of every function with
the line numbers where it was used. It went stale with every edit and
`git grep <name>` gives the same answer, so it was removed together with its
generator (`lib/update-graph-md-refs.js`, `npm run graph-docs`). The notes
below started as the TODO list at the top of that file.

Delete this file when the last pass is done.

## How to work

- One pass per session and per commit. Joel reviews and commits; don't
  commit.
- Move code without changing it first; change behavior in a separate step,
  so a failing test points at one thing.
- Tests while working: `node --test "test/graph-theory/**/*.test.js"`, plus
  `test/site.test.js`. Full `npm test` at the end of each pass.
- When code moves to a mode, its unit tests move to that mode's test file
  and import from the mode (as `parseDegreeSequence` in `modes/degree.js`).
- Tick items off here as they're done, and note anything decided on the way.

## Pass 1: dead code and small fixes

- [ ] Remove `graphToCSV`: nothing uses it.
- [ ] Check every export for users outside `graph.js`
      (`git grep -w <name> -- graph-theory test`). Remove unused ones, or
      make them private if only `graph.js` uses them. Candidates:
      `vertexIds`, `generateConnectedMultigraph`, `isMultiGraph`,
      `componentCount`, `graphInvariants` (the last three are only used in
      `graph.js` and tests).
- [ ] `bfsCount` (inside `isStronglyConnected`): explain it in its comment,
      or replace it with `reachableCount`, which already accepts an
      adjacency list.
- [ ] `_simpleGraph` vs `generateSimpleGraph`: the second only wraps the
      first in a graph object. Say so in the comments, and describe how
      `_simpleGraph` builds a graph (random spanning tree, then random extra
      edges?).
- [ ] `_randomSpanningTree`: say in its comment how the tree is chosen.
- [ ] `_toEdges`: explain it turns index pairs into `Edge` objects.

## Pass 2: move mode code into the modes

- [ ] **Applications** (section "Applications puzzle helpers":
      `generateApplicationsPuzzle`, `validateApplicationsAssignment`, the
      `APPLICATIONS_*` names and their helpers) → `modes/applications.js`.
      Has a `TODO(refactor)` at the top of `graph.js`.
- [ ] **Hamiltonian**: `generateHamiltonianPuzzle`, the
      `validateHamiltonianCycle*` functions, `_parseHamCycleInput`,
      `_makeHamiltonian*`, `_simulateNN`/`_simulateSE` →
      `modes/hamiltonian.js`. Cut vertices, leaves and bipartite parts stay
      in `lib/` (see pass 3). Has a `TODO(refactor)`.
- [ ] **Isomorphism**: `generateIsoPuzzle`, `ISO_PUZZLE_N_RANGE`,
      `_neitherByReason`, `_swapToChangeTriangles`, `_isoBaseGraph` →
      `modes/iso.js`. Invariants (`countTriangles`, `componentCount`,
      `graphInvariants`), `applyPermutation` and
      `verifyIsomorphismWitness` stay. Decide where `checkNeitherReason`
      goes (it checks a student's reason, so probably the mode).
- [ ] **Planar, coloring, Eulerian**: look at what's puzzle tuning rather than
      math (e.g. the `planarExtraEdgeFactor*` arguments of
      `generatePlanarGraph`). Move only what's clearly mode design; graph
      generators that take plain parameters can stay.
- [ ] `graphToDescription` builds the screen-reader text and the Make a
      Graph text box: page text, not math. Move it next to its users
      (`lib/render.js`, `modes/make.js`), or leave it and say why.

## Pass 3: whole graph objects everywhere

Exported functions take a graph object (`{ n, names, directed, edgeLabel,
edges }`), not `edges, n`.

- [ ] Hamiltonian helpers `_hamCutVertices`, `_hamLeafVertices`,
      `_hamBipartiteParts` take `(edges, n)`: make them `cutVertices(graph)`,
      `leafVertices(graph)`, `bipartiteParts(graph)`.
- [ ] Coloring helpers `_dedupeIndexEdges`, `_buildAdjFromIndexEdges`,
      `_isColorableWithK` work on index pairs; `_buildAdjFromIndexEdges`
      looks like a copy of `buildAdjList`. Reuse what exists.
- [ ] Private helpers inside one generator may keep index pairs if that's
      simpler; the rule is about what's exported.

## Pass 4: split into files

- [ ] Split what's left into `lib/graph/` by subject, for example `core.js`
      (vertices, degrees, adjacency, connectivity), `generate.js`,
      `eulerian.js`, `planar.js`, `coloring.js`, `iso.js`,
      `hamiltonian.js`. Aim for files a few hundred lines long.
- [ ] Modes import from the file they need. No `index.js` re-exporting
      everything: it would hide which mode uses what.
- [ ] Split `test/graph-theory/graph.test.js` the same way.
- [ ] The graph object description at the top of `graph.js` goes to the top
      of `core.js`.
- [ ] Update `CLAUDE.md` and `docs/adding-modes.md` (paths, the "Graph
      functions take a whole graph object" rule), remove the `TODO(refactor)`
      notes this resolves, and delete this file.

## Already done

- `makeLabels` goes on past H: A–Z, then AA–ZZ, then numbers above 702.
- `reachableCount` takes a start vertex (`reachableCount(graph, start = 0)`).
- Most of the switch to whole graph objects happened during the merge; the
  Hamiltonian section and coloring helpers are what's left (pass 3).

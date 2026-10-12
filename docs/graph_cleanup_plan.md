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
- The report at the end of a pass says whether any mode's logic or design
  could have changed (what puzzles it makes, how it checks or scores
  answers, what students see), naming each mode and how. If nothing
  could have changed, say so and why (e.g. only comments, or unused code).
  Point out changes that tests don't cover.

## Pass 1: dead code and small fixes

- [x] Remove `graphToCSV`: nothing uses it.
- [x] Check every export for users outside `graph.js`
      (`git grep -w <name> -- graph-theory test`). Removed `vertexIds`
      (unused). Made private, since only `graph.js` uses them:
      `_buildAdjList`, `_reachableCount`, `_generateConnectedMultigraph`,
      `_computeGreedyColoring`.
      Decided: exports used only by `graph.js` and its unit tests stay
      exported (`getDegrees`, `isMultiGraph`, `countTriangles`,
      `componentCount`, `graphInvariants`, `applyPermutation`): they're
      general graph math and the tests check them directly. The
      `APPLICATIONS_*` constants and `ISO_PUZZLE_N_RANGE` are also used only
      in `graph.js`; left as they are, since pass 2 moves them to their modes.
- [x] `bfsCount` (inside `isStronglyConnected`): replaced with
      `_reachableCount` on the forward and reversed adjacency lists (now
      Sets). The adjacency-list form of `_reachableCount` was called
      "legacy" but had no other user; its comment now says what it's for.
- [x] `_simpleGraph` vs `generateSimpleGraph`: comments say the second wraps
      the first. `_simpleGraph` starts from a random spanning tree
      (`_minimalConnectedGraph`: shuffle K_n's edges, remove each one unless
      that disconnects the graph), then adds random edges.
- [x] `_randomSpanningTree`: nothing called it (the spanning tree comes from
      `_minimalConnectedGraph`), so it was removed.
- [x] `_toEdges`: explained.

## Pass 2: move mode code into the modes

Moved code is unchanged except where it called `graph.js`'s private helpers
(`_randInt`, `_edgeKey`, `_toEdges`, `_makeNumberNames`, `_simpleGraph`).
Following `modes/coloring.js`, each mode has small local copies of those
instead (some duplication between modes is allowed); `_simpleGraph` became
calls to `generateSimpleGraph`, which wraps it. Each mode's header comment
says what was moved.

- [x] **Applications** (`generateApplicationsPuzzle`,
      `validateApplicationsAssignment`, the `APPLICATIONS_*` names and their
      helpers) → `modes/applications.js`. The `APPLICATIONS_*` constants are
      no longer exported (nothing else uses them). Its `TODO(refactor)` is gone.
- [x] **Hamiltonian**: `generateHamiltonianPuzzle`, the
      `validateHamiltonianCycle*` functions, `_parseHamCycleInput`,
      `_makeHamiltonian*`, `_hamMake*`, `_simulateNN`/`_simulateSE`,
      `_extractCycleOrder` → `modes/hamiltonian.js`. The mode needs the cut
      vertex, leaf and bipartite helpers, so they're now exported as
      `cutVertices`, `leafVertices`, `bipartiteParts`, still taking
      `(edges, n)` (pass 3), with unit tests in `graph.test.js`. A narrower
      `TODO(refactor)` above them replaces the old one.
- [x] **Isomorphism**: `generateIsoPuzzle`, `ISO_PUZZLE_N_RANGE` (no longer
      exported), `_neitherByReason`, `_swapToChangeTriangles`,
      `_isoBaseGraph`, `_randomSpanningTreePairs`, `_graphsEqual` →
      `modes/iso.js`. Decided: `checkNeitherReason` goes to the mode too: it
      checks a student's answer, and the reason codes are defined there
      (`ISO_REASON_LABELS`). Its test moved to `iso.test.js`. Invariants,
      `applyPermutation` and `verifyIsomorphismWitness` stay.
- [x] **Planar, coloring, Eulerian**: nothing moved. The generators take
      plain parameters that the modes set (`PLANAR_MODE_CONFIG`,
      `COLORING_PUZZLE_CONFIG`), and the coloring checks
      (`validateGraphColoring`, `validateGreedyColoring`) are general
      algorithms, not wording. One leftover: `generateNonPlanarGraph` builds
      its planar base with `generatePlanarGraph(n, 1.14, 1.55)`, the same
      numbers as `PLANAR_MODE_CONFIG`, written into `graph.js`. Making them a
      parameter would change the function's signature; left for pass 3.
- [x] `graphToDescription` → `lib/render.js` (it's page text, and
      `createGraphView` is its main user); `modes/make.js` imports it from
      there. Its test is in the new `test/graph-theory/render.test.js`.

## Pass 3: whole graph objects everywhere

Exported functions take a graph object (`{ n, names, directed, edgeLabel,
edges }`), not `edges, n`.

- [x] `cutVertices`, `leafVertices`, `bipartiteParts` take a graph. The
      Hamiltonian mode builds the graph object once and returns it spread
      into the puzzle. Their `TODO(refactor)` is gone.
- [x] `generateNonPlanarGraph(n, type, nonPlanarExtraEdgeSlackMax,
      planarExtraEdgeFactorMin, planarExtraEdgeFactorMax)`: the planar base's
      factors are now parameters (no defaults, so the numbers live only in
      `PLANAR_MODE_CONFIG`), passed in by `modes/planar.js`.
- [x] Coloring helpers: `_dedupeIndexEdges` and `_buildAdjFromIndexEdges`
      removed; `chromaticNumber` builds its adjacency with `_buildAdjList`
      (which also drops self-loops and repeated edges) and passes it to
      `_isColorableWithK(adj, k)`. Its self-loop check was dead (loops were
      already dropped), so it went too.
- [x] Checked the other exports: every one that takes an existing graph
      takes a graph object; the generators take `n` and parameters and
      return one.

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
- `_reachableCount` takes a start vertex (`_reachableCount(graph, start = 0)`).
- Most of the switch to whole graph objects happened during the merge; pass 3
  finished it.

# graph.js Function Inventory

First generated on 2026-03-10 from graph.js. The Signature, Purpose and Usage lines are refreshed by `npm run graph-docs` (`lib/update-graph-md-refs.js`); usage locations are relative to `graph-theory/`.

Each entry includes signature, intended purpose, and where the function name appears in this codebase.

TODO: The original idea behind the graph.js file was that it was supposed to contain mathematical utilities, not mode specific code. It should really just contain functions that are general mathematically useful operations/algorithms/etc involving graphs. At the moment we have too much cross contamination between mode logic and graph logic. Some of this is mixed up in single functions which contain parts which are arguably mathematic and other parts which are just mode specific things. We probably need to extract the purely mathematical/algorithmic elements from the puzzle generating functions and related things and move those into the mode specific .js files.

TODO: I think it would be better if we pass the entire graph object for functions that operate on graphs instead of trying to keep track of the minimal data needed. It will make it easier to parse what kinds of objects the functions are intended to operate on. This would affect a lot of different functions. Many of them take inputs of the form edges,n. where I would prefer having the signature be like myFunction(graph,extra_arg1,...,extra_argn).

TODO: makeLabels probably can use letters beyond H, we should probably extend this to use more letters before switching to numbers.

TODO: reachableCount should be refacted to take a graph and a start vertex as an input rather than just silently using zero as the start vertex. It will make it more reusable for other applications and is more conceptually correct.

TODO: Not totally sure what bfsCount does or what its for. We should probably add documentation and a better description.

TODO: Graph to description is probably not really a mathematical graph utility but a general UI utility. This means it should probably be in script.js instead.

TODO: What is graphToCSV actually for? Should investigate if this is used anywhere or if it can be discarded.

TODO: Random spanning tree should probably explain the implementation approach in the JSDoc summary.

TODO: Expand the description about the way simpleGraph works.

TODO: Where is toEdges used? Is this something that works on graphs? Seems like book-keeping but I don't remember where it is used.

TODO: _simpleGraph and generateSimpleGraph seem pretty similar. They may use different strategies. Maybe they should be renamed and have documentation that makes it clear the differences in how they were. There are a lot of potential ways to construct a simple graph.




## Functions

### vertexId
- Signature: `vertexId(i)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:53 (defined)`, `lib/graph.js:106 (inside vertexIds)`, `lib/graph.js:515 (inside _toEdges)`, `lib/graph.js:651 (inside generateEulerianMultigraph)`, `lib/graph.js:699 (inside generateMSCDigraph)`, `lib/graph.js:731 (inside _eulerizeDigraph)`, `lib/graph.js:787 (inside generateEulerianDigraph)`, `lib/graph.js:850 (inside generateRandomGraph)`, `lib/graph.js:1343 (inside validateGraphColoring)`, `lib/graph.js:1391 (inside computeGreedyColoring)`, `lib/graph.js:1444 (inside validateGreedyColoring)`, `lib/graph.js:1681 (inside _generateSchedulingApplicationsPuzzle)`, `lib/graph.js:1865 (inside _generateInterferenceApplicationsPuzzle)`, `lib/graph.js:1910 (inside validateApplicationsAssignment)`, `lib/graph.js:2051 (inside applyPermutation)`, `lib/graph.js:2166 (inside _swapToChangeTriangles)`, `lib/graph.js:2224 (inside _neitherByReason)`, `lib/graph.js:2673 (inside _makeHamiltonianNN)`, `lib/graph.js:2751 (inside _makeHamiltonianSE)`, `lib/render.js:171 (inside createGraphView)`, `lib/render.js:201 (inside replaceElements)`, `modes/degree.js:46 (inside newGraph)`

### vertexIndex
- Signature: `vertexIndex(id)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:62 (defined)`, `lib/graph.js:74 (inside vertexLabel)`, `lib/graph.js:145 (inside getDegrees)`, `lib/graph.js:184 (inside getDirectedDegrees)`, `lib/graph.js:206 (inside buildAdjList)`, `lib/graph.js:244 (inside reachableCount)`, `lib/graph.js:286 (inside isStronglyConnected)`, `lib/graph.js:374 (inside graphToDescription)`, `lib/graph.js:633 (inside generateEulerianMultigraph)`, `lib/graph.js:901 (inside minEulerizeEdges)`, `lib/graph.js:1198 (inside generateNonPlanarGraph)`, `lib/graph.js:1306 (inside chromaticNumber)`, `lib/graph.js:1355 (inside validateGraphColoring)`, `lib/graph.js:1398 (inside computeGreedyColoring)`, `lib/graph.js:1464 (inside validateGreedyColoring)`, `lib/graph.js:1673 (inside _generateSchedulingApplicationsPuzzle)`, `lib/graph.js:1966 (inside countTriangles)`, `lib/graph.js:1987 (inside componentCount)`, `lib/graph.js:2051 (inside applyPermutation)`, `lib/graph.js:2144 (inside _swapToChangeTriangles)`, `lib/graph.js:2379 (inside _hamCutVertices)`

### vertexLabel
- Signature: `vertexLabel(id, names)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:73 (defined)`, `lib/graph.js:371 (inside graphToDescription)`, `lib/graph.js:2079 (inside verifyIsomorphismWitness)`, `lib/graph.js:2278 (inside _graphsEqual)`, `lib/graph.js:2979 (inside validateHamiltonianCycleFreeform)`, `lib/graph.js:3030 (inside validateHamiltonianCycleNN)`, `lib/graph.js:3111 (inside validateHamiltonianCycleSE)`

### makeLabels
- Signature: `makeLabels(n)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:85 (defined)`, `lib/graph.js:536 (inside generateSimpleGraph)`, `lib/graph.js:585 (inside generateConnectedMultigraph)`, `lib/graph.js:607 (inside generateEulerianSimpleGraph)`, `lib/graph.js:656 (inside generateEulerianMultigraph)`, `lib/graph.js:712 (inside generateMSCDigraph)`, `lib/graph.js:814 (inside generateEulerianDigraph)`, `lib/graph.js:872 (inside generateRandomGraph)`, `lib/graph.js:1151 (inside generatePlanarGraph)`, `lib/graph.js:1231 (inside generateNonPlanarGraph)`, `lib/graph.js:2110 (inside _isoBaseGraph)`, `lib/graph.js:2227 (inside _neitherByReason)`, `lib/graph.js:2671 (inside _makeHamiltonianNN)`, `lib/graph.js:2749 (inside _makeHamiltonianSE)`, `lib/graph.js:2805 (inside _makeHamiltonianFreeform)`, `lib/graph.js:2848 (inside generateHamiltonianPuzzle)`

### vertexIds
- Signature: `vertexIds(n)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:105 (defined)`

### shuffle
- Signature: `shuffle(arr)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:121 (defined)`, `lib/graph.js:431 (inside _randomSpanningTree)`, `lib/graph.js:452 (inside _minimalConnectedGraph)`, `lib/graph.js:504 (inside _simpleGraph)`, `lib/graph.js:561 (inside generateConnectedMultigraph)`, `lib/graph.js:604 (inside generateEulerianSimpleGraph)`, `lib/graph.js:635 (inside generateEulerianMultigraph)`, `lib/graph.js:670 (inside backtrack)`, `lib/graph.js:703 (inside generateMSCDigraph)`, `lib/graph.js:736 (inside _eulerizeDigraph)`, `lib/graph.js:844 (inside generateRandomGraph)`, `lib/graph.js:1159 (inside _injectK5)`, `lib/graph.js:1170 (inside _injectK33)`, `lib/graph.js:1217 (inside generateNonPlanarGraph)`, `lib/graph.js:1522 (inside _pickUniqueNames)`, `lib/graph.js:1533 (inside _makeBipartiteApplicationsGraph)`, `lib/graph.js:1578 (inside _makeK5ApplicationsGraph)`, `lib/graph.js:1657 (inside _generateSchedulingApplicationsPuzzle)`, `lib/graph.js:2123 (inside _randomSpanningTreePairs)`, `lib/graph.js:2324 (inside generateIsoPuzzle)`, `lib/graph.js:2583 (inside _hamMakeBipartiteUnequal)`, `lib/graph.js:2632 (inside _makeHamiltonianNN)`, `lib/graph.js:2699 (inside _makeHamiltonianSE)`, `lib/graph.js:2785 (inside _makeHamiltonianFreeform)`

### getDegrees
- Signature: `getDegrees(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:140 (defined)`, `lib/graph.js:160 (inside getOddVertices)`, `lib/graph.js:170 (inside degreeSequence)`, `lib/graph.js:2408 (inside _hamLeafVertices)`

### getOddVertices
- Signature: `getOddVertices(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:159 (defined)`, `lib/graph.js:604 (inside generateEulerianSimpleGraph)`, `lib/graph.js:635 (inside generateEulerianMultigraph)`, `lib/graph.js:894 (inside minEulerizeEdges)`

### degreeSequence
- Signature: `degreeSequence(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:169 (defined)`, `lib/graph.js:2011 (inside graphInvariants)`, `lib/graph.js:2203 (inside _neitherByReason)`, `modes/degree.js:63 (inside newQuestion)`

### getDirectedDegrees
- Signature: `getDirectedDegrees(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:178 (defined)`, `lib/graph.js:723 (inside _eulerizeDigraph)`, `lib/graph.js:958 (inside getMismatchedVertices)`

### buildAdjList
- Signature: `buildAdjList(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:201 (defined)`, `lib/graph.js:239 (inside reachableCount)`, `lib/graph.js:2420 (inside _hamBipartiteParts)`

### reachableCount
- Signature: `reachableCount(graphOrAdj, startVertex = 0)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:228 (defined)`, `lib/graph.js:268 (inside isConnected)`

### isConnected
- Signature: `isConnected(graph, startVertex = 0)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:265 (defined)`

### isStronglyConnected
- Signature: `isStronglyConnected(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:277 (defined)`, `lib/graph.js:707 (inside generateMSCDigraph)`

### bfsCount
- Signature: `bfsCount(adj)`
- Purpose: BFS reachability count from vertex 0 over a directed adjacency list. Used by isStronglyConnected on both forward and reverse graphs.
- Usage: `lib/graph.js:298 (defined)`, `lib/graph.js:311 (inside isStronglyConnected)`

### isMultiGraph
- Signature: `isMultiGraph(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:325 (defined)`

### graphToDescription
- Signature: `graphToDescription(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:350 (defined)`, `lib/render.js:146 (inside describe)`

### graphToCSV
- Signature: `graphToCSV(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:408 (defined)`

### _randomSpanningTree
- Signature: `_randomSpanningTree(n)`
- Purpose: Generate a random spanning tree on n vertices (as index pairs). Implementation: shuffle vertices and connect consecutive vertices in that random order (a random Hamiltonian path).
- Usage: `lib/graph.js:430 (defined)`

### _minimalConnectedGraph
- Signature: `_minimalConnectedGraph(n)`
- Purpose: Generate a minimal connected simple graph on n vertices. Starts from K_n and greedily removes edges while maintaining connectivity.
- Usage: `lib/graph.js:446 (defined)`, `lib/graph.js:496 (inside _simpleGraph)`

### _indexEdgesConnected
- Signature: `_indexEdgesConnected(indexEdges, n)`
- Purpose: Connectivity check on index-pair edges. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:457 (inside _minimalConnectedGraph)`, `lib/graph.js:463 (defined)`, `lib/graph.js:1141 (inside generatePlanarGraph)`, `lib/graph.js:1223 (inside generateNonPlanarGraph)`

### _simpleGraph
- Signature: `_simpleGraph(n, targetEdges)`
- Purpose: Generate a random connected simple graph with approximately targetEdges edges. Strategy: 1) Build a minimal connected simple graph (spanning tree backbone).
- Usage: `lib/graph.js:486 (defined)`, `lib/graph.js:539 (inside generateSimpleGraph)`, `lib/graph.js:565 (inside generateConnectedMultigraph)`, `lib/graph.js:602 (inside generateEulerianSimpleGraph)`, `lib/graph.js:2113 (inside _isoBaseGraph)`, `lib/graph.js:2555 (inside _hamMakeCutVertex)`, `lib/graph.js:2567 (inside _hamMakeLeaf)`

### _toEdges
- Signature: `_toEdges(indexEdges, extraProps = {})`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:513 (defined)`, `lib/graph.js:539 (inside generateSimpleGraph)`, `lib/graph.js:588 (inside generateConnectedMultigraph)`, `lib/graph.js:604 (inside generateEulerianSimpleGraph)`, `lib/graph.js:1154 (inside generatePlanarGraph)`, `lib/graph.js:1234 (inside generateNonPlanarGraph)`, `lib/graph.js:1562 (inside _makeBipartiteApplicationsGraph)`, `lib/graph.js:1606 (inside _makeK5ApplicationsGraph)`, `lib/graph.js:1781 (inside _buildInterferenceGraphFromDistance)`, `lib/graph.js:2113 (inside _isoBaseGraph)`, `lib/graph.js:2808 (inside _makeHamiltonianFreeform)`, `lib/graph.js:2849 (inside generateHamiltonianPuzzle)`

### generateSimpleGraph
- Signature: `generateSimpleGraph(n, targetEdges)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:533 (defined)`, `lib/graph.js:622 (inside generateEulerianSimpleGraph)`, `modes/degree.js:41 (inside newGraph)`

### generateConnectedMultigraph
- Signature: `generateConnectedMultigraph(n, targetEdges, options = {})`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:550 (defined)`, `lib/graph.js:632 (inside generateEulerianMultigraph)`

---

### generateEulerianSimpleGraph
- Signature: `generateEulerianSimpleGraph(n, targetEdges, maxRerolls = 30)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:600 (defined)`

### generateEulerianMultigraph
- Signature: `generateEulerianMultigraph(n, targetEdges)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:631 (defined)`

### _findSimplePairing
- Signature: `_findSimplePairing(odds, edgeSet)`
- Purpose: Pairing helper used by Eulerian simple graph generator. Finds a perfect matching on `odds` using only edges absent from edgeSet.
- Usage: `lib/graph.js:611 (inside generateEulerianSimpleGraph)`, `lib/graph.js:666 (defined)`

### backtrack
- Signature: `backtrack(remaining)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:667 (defined)`, `lib/graph.js:674 (inside backtrack)`, `lib/graph.js:680 (inside _findSimplePairing)`

### generateMSCDigraph
- Signature: `generateMSCDigraph(n)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:695 (defined)`, `lib/graph.js:776 (inside generateEulerianDigraph)`

### _eulerizeDigraph
- Signature: `_eulerizeDigraph(edges, n)`
- Purpose: Balance a directed graph so every vertex has in-degree == out-degree. Mutates and returns the edges array.
- Usage: `lib/graph.js:722 (defined)`, `lib/graph.js:817 (inside generateEulerianDigraph)`

### generateEulerianDigraph
- Signature: `generateEulerianDigraph(n, targetEdges)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:768 (defined)`

### generateRandomGraph
- Signature: `generateRandomGraph(n, numComponents = 1)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:828 (defined)`

### _puzzleComplexityOk
- Signature: `_puzzleComplexityOk(edges, n, directed)`
- Purpose: Return true when `edges` satisfies both puzzle complexity heuristics. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:894 (defined)`, `graph.js:939 (inside _makeEulerianDigraph)`, `graph.js:948 (inside _makeNonEulerianDigraph)`, `graph.js:964 (inside _makeEulerianSimple)`, `graph.js:973 (inside _makeNonEulerianSimple)`, `graph.js:994 (inside _makeEulerianMulti)`, `graph.js:1003 (inside _makeNonEulerianMulti)`

### _puzzleEdgeTarget
- Signature: `_puzzleEdgeTarget(n)`
- Purpose: Pick a random target edge count appropriate for an undirected puzzle graph on n vertices. Stays well below the density that would fail the heuristics.
- Usage: `graph.js:927 (defined)`, `graph.js:963 (inside _makeEulerianSimple)`, `graph.js:972 (inside _makeNonEulerianSimple)`, `graph.js:993 (inside _makeEulerianMulti)`, `graph.js:1002 (inside _makeNonEulerianMulti)`

### _makeEulerianDigraph
- Signature: `_makeEulerianDigraph(n)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:936 (defined)`, `graph.js:957 (inside _makeNonEulerianDigraph)`

### _makeNonEulerianDigraph
- Signature: `_makeNonEulerianDigraph(n)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:945 (defined)`

### _makeEulerianSimple
- Signature: `_makeEulerianSimple(n)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:961 (defined)`, `graph.js:987 (inside _makeNonEulerianSimple)`

### _makeNonEulerianSimple
- Signature: `_makeNonEulerianSimple(n)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:970 (defined)`

### _makeEulerianMulti
- Signature: `_makeEulerianMulti(n)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:991 (defined)`, `graph.js:1017 (inside _makeNonEulerianMulti)`

### _makeNonEulerianMulti
- Signature: `_makeNonEulerianMulti(n)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:1000 (defined)`

### generateEulerianGraphPuzzle
- Signature: `generateEulerianGraphPuzzle()`
- Purpose: Generate a random Eulerian graph puzzle. Returns a graph object extended with: isEulerian {boolean} — ground-truth answer isMulti {boolean} — true when edge labels are edge-names (for circuit input format)
- Usage: `eulerian-mode.js:128 (inside startEulerianTrial)`, `graph.js:1029 (defined)`

### validateEulerianCircuitSimple
- Signature: `validateEulerianCircuitSimple(circuit, graph, requireCircuit)`
- Purpose: Check whether a sequence of vertex display-names forms a valid Eulerian circuit in a simple undirected graph. This is used in graph analysis and generation flows throughout the project.
- Usage: `eulerian-mode.js:452 (inside bindEulerianControls)`, `graph.js:1070 (defined)`

### validateEulerianCircuitMulti
- Signature: `validateEulerianCircuitMulti(input, graph, requireCircuit)`
- Purpose: Check whether an alternating vertex/edge-label string is a valid Eulerian circuit in a multigraph, e.g. "AaBbCcA".
- Usage: `eulerian-mode.js:445 (inside bindEulerianControls)`, `graph.js:1097 (defined)`

### validateEulerianCircuitDigraph
- Signature: `validateEulerianCircuitDigraph(circuit, graph)`
- Purpose: Check whether a sequence of vertex display-names is a valid Eulerian circuit in a directed graph. This is used in graph analysis and generation flows throughout the project.
- Usage: `eulerian-mode.js:448 (inside bindEulerianControls)`, `graph.js:1130 (defined)`

### validateEulerization
- Signature: `validateEulerization(graph, addedEdges)`
- Purpose: Validate whether adding a set of edges to a graph makes it Eulerian. Added edges must duplicate existing edges (no new vertex relationships).
- Usage: `eulerian-mode.js:273 (inside bindEulerianControls)`, `graph.js:1173 (defined)`

### minEulerizeEdges
- Signature: `minEulerizeEdges(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:893 (defined)`

### bfsDist
- Signature: `bfsDist(start)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:906 (defined)`, `lib/graph.js:921 (inside minEulerizeEdges)`

### getMismatchedVertices
- Signature: `getMismatchedVertices(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:957 (defined)`

### _randInt
- Signature: `_randInt(min, max)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:967 (defined)`, `lib/graph.js:1053 (inside _generateConnectedPlanarIndexEdges)`, `lib/graph.js:1145 (inside generatePlanarGraph)`, `lib/graph.js:1216 (inside generateNonPlanarGraph)`, `lib/graph.js:1532 (inside _makeBipartiteApplicationsGraph)`, `lib/graph.js:1597 (inside _makeK5ApplicationsGraph)`, `lib/graph.js:1612 (inside _generateSchedulingBaseGraph)`, `lib/graph.js:1814 (inside _generateInterferenceApplicationsPuzzle)`

### _edgeKey
- Signature: `_edgeKey(a, b)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:971 (defined)`, `lib/graph.js:1060 (inside _generateConnectedPlanarIndexEdges)`, `lib/graph.js:1204 (inside generateNonPlanarGraph)`, `lib/graph.js:1251 (inside _dedupeIndexEdges)`, `lib/graph.js:1540 (inside _makeBipartiteApplicationsGraph)`, `lib/graph.js:1585 (inside _makeK5ApplicationsGraph)`

### _isColinear
- Signature: `_isColinear(a, b, c, eps = 1e-6)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:975 (defined)`, `lib/graph.js:1007 (inside _generateNonColinearPoints)`

### _generateNonColinearPoints
- Signature: `_generateNonColinearPoints(n, maxAttempts = 120)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:980 (defined)`, `lib/graph.js:1050 (inside _generateConnectedPlanarIndexEdges)`

### _ccw
- Signature: `_ccw(a, b, c)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1031 (defined)`, `lib/graph.js:1036 (inside _segmentsIntersect)`

### _segmentsIntersect
- Signature: `_segmentsIntersect(p1, p2, p3, p4)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1035 (defined)`, `lib/graph.js:1042 (inside _wouldCrossAny)`

### _wouldCrossAny
- Signature: `_wouldCrossAny(a, b, indexEdges, pos)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1039 (defined)`, `lib/graph.js:1072 (inside _generateConnectedPlanarIndexEdges)`

### _generateConnectedPlanarIndexEdges
- Signature: `_generateConnectedPlanarIndexEdges(n, targetEdges)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1047 (defined)`, `lib/graph.js:1135 (inside generatePlanarGraph)`

### _makePlanarPuzzleGraph
- Signature: `_makePlanarPuzzleGraph(n)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:1084 (defined)`, `graph.js:1142 (inside _makeNonPlanarPuzzleGraph)`, `graph.js:1201 (inside generatePlanarGraphPuzzle)`, `graph.js:1328 (inside _makePlanarColoringGraph)`

### _injectK5
- Signature: `_injectK5(indexEdges, n)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1158 (defined)`, `lib/graph.js:1202 (inside generateNonPlanarGraph)`

### _injectK33
- Signature: `_injectK33(indexEdges, n)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1169 (defined)`, `lib/graph.js:1202 (inside generateNonPlanarGraph)`

### _makeNonPlanarPuzzleGraph
- Signature: `_makeNonPlanarPuzzleGraph(n)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:1141 (defined)`, `graph.js:1201 (inside generatePlanarGraphPuzzle)`

### generatePlanarGraphPuzzle
- Signature: `generatePlanarGraphPuzzle()`
- Purpose: Generate a random planar-classification puzzle graph. Returns a graph object extended with: isPlanar {boolean} planarCounts {{vertices:number,edges:number,faces:number}|null} obstruction {'K5'|'K3,3'|null}
- Usage: `graph.js:1198 (defined)`, `planar-mode.js:74 (inside startPlanarTrial)`

### _makeNumberNames
- Signature: `_makeNumberNames(n)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1243 (defined)`, `lib/graph.js:1338 (inside validateGraphColoring)`, `lib/graph.js:1441 (inside validateGreedyColoring)`, `lib/graph.js:1559 (inside _makeBipartiteApplicationsGraph)`, `lib/graph.js:1570 (inside _makePlanarApplicationsGraph)`, `lib/graph.js:1603 (inside _makeK5ApplicationsGraph)`

### _dedupeIndexEdges
- Signature: `_dedupeIndexEdges(indexEdges)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1247 (defined)`, `lib/graph.js:1305 (inside chromaticNumber)`

### _buildAdjFromIndexEdges
- Signature: `_buildAdjFromIndexEdges(indexEdges, n)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1259 (defined)`, `lib/graph.js:1271 (inside _isColorableWithK)`

### _isColorableWithK
- Signature: `_isColorableWithK(indexEdges, n, k)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1269 (defined)`, `lib/graph.js:1310 (inside chromaticNumber)`

### dfs
- Signature: `dfs(pos)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:1281 (defined)`, `lib/graph.js:1293 (inside dfs)`, `lib/graph.js:1299 (inside _isColorableWithK)`

### chromaticNumber
- Signature: `chromaticNumber(graph, maxColors = 6)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:1302 (defined)`, `lib/graph.js:1624 (inside _generateSchedulingBaseGraph)`, `lib/graph.js:1848 (inside _generateInterferenceApplicationsPuzzle)`

### _makeBipartiteColoringGraph
- Signature: `_makeBipartiteColoringGraph(n)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:1315 (defined)`, `graph.js:1414 (inside generateGraphColoringPuzzle)`

### _makePlanarColoringGraph
- Signature: `_makePlanarColoringGraph(n)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:1351 (defined)`, `graph.js:1416 (inside generateGraphColoringPuzzle)`

### _makeK5ColoringGraph
- Signature: `_makeK5ColoringGraph(n)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:1363 (defined)`, `graph.js:1418 (inside generateGraphColoringPuzzle)`

### generateGraphColoringPuzzle
- Signature: `generateGraphColoringPuzzle()`
- Purpose: Generate a random graph-coloring puzzle. Returns a graph object extended with: minColors {number} exact chromatic number (<= 5) maxColorsAllowed {number} flavor {'bipartite'|'planar'|'k5'}
- Usage: `graph-coloring-mode.js:214 (inside startColoringTrial)`, `graph.js:1407 (defined)`, `graph.js:1640 (inside _generateSchedulingApplicationsPuzzle)`

### validateGraphColoring
- Signature: `validateGraphColoring(graph, colorByVertexId, minColors)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:1334 (defined)`

### computeGreedyColoring
- Signature: `computeGreedyColoring(graph, vertexOrderIds, colorOrder)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:1385 (defined)`, `lib/graph.js:1452 (inside validateGreedyColoring)`

### validateGreedyColoring
- Signature: `validateGreedyColoring(graph, vertexOrderIds, userColorByVertexId, colorOrder)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:1439 (defined)`

### _pickUniqueNames
- Signature: `_pickUniqueNames(pool, count, fallbackPrefix)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1521 (defined)`, `lib/graph.js:1654 (inside _generateSchedulingApplicationsPuzzle)`, `lib/graph.js:1842 (inside _generateInterferenceApplicationsPuzzle)`

### _generateSchedulingApplicationsPuzzle
- Signature: `_generateSchedulingApplicationsPuzzle()`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1652 (defined)`, `lib/graph.js:1869 (inside _generateInterferenceApplicationsPuzzle)`, `lib/graph.js:1888 (inside generateApplicationsPuzzle)`

### takeMemberName
- Signature: `takeMemberName()`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:1660 (defined)`, `lib/graph.js:1668 (inside _generateSchedulingApplicationsPuzzle)`

### _distance
- Signature: `_distance(a, b)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1699 (defined)`, `lib/graph.js:1713 (inside _generateSeparatedPoints)`, `lib/graph.js:1725 (inside _pairwiseDistances)`

### _generateSeparatedPoints
- Signature: `_generateSeparatedPoints(n, minSep, maxTries = 4000)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1705 (defined)`, `lib/graph.js:1815 (inside _generateInterferenceApplicationsPuzzle)`

### _pairwiseDistances
- Signature: `_pairwiseDistances(points)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1720 (defined)`, `lib/graph.js:1818 (inside _generateInterferenceApplicationsPuzzle)`

### _mstBottleneckDistance
- Signature: `_mstBottleneckDistance(dist)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1733 (defined)`, `lib/graph.js:1829 (inside _generateInterferenceApplicationsPuzzle)`

### _buildInterferenceGraphFromDistance
- Signature: `_buildInterferenceGraphFromDistance(dist, threshold)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1773 (defined)`, `lib/graph.js:1839 (inside _generateInterferenceApplicationsPuzzle)`

### _generateInterferenceApplicationsPuzzle
- Signature: `_generateInterferenceApplicationsPuzzle()`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1812 (defined)`, `lib/graph.js:1889 (inside generateApplicationsPuzzle)`

### generateApplicationsPuzzle
- Signature: `generateApplicationsPuzzle()`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:1886 (defined)`

### _sharedMembersForEdge
- Signature: `_sharedMembersForEdge(puzzle, sourceId, targetId)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1892 (defined)`, `lib/graph.js:1921 (inside validateApplicationsAssignment)`

### validateApplicationsAssignment
- Signature: `validateApplicationsAssignment(puzzle, assignmentByVertexId)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:1903 (defined)`

### countTriangles
- Signature: `countTriangles(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:1961 (defined)`, `lib/graph.js:2013 (inside graphInvariants)`, `lib/graph.js:2140 (inside _swapToChangeTriangles)`, `lib/graph.js:2256 (inside _neitherByReason)`

### componentCount
- Signature: `componentCount(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:1981 (defined)`, `lib/graph.js:2012 (inside graphInvariants)`, `lib/graph.js:2228 (inside _neitherByReason)`

### graphInvariants
- Signature: `graphInvariants(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:2007 (defined)`, `lib/graph.js:2026 (inside checkNeitherReason)`, `lib/graph.js:2246 (inside _neitherByReason)`

### checkNeitherReason
- Signature: `checkNeitherReason(g1, g2, reason)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:2025 (defined)`

### applyPermutation
- Signature: `applyPermutation(graph, sigma)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:2049 (defined)`, `lib/graph.js:2326 (inside generateIsoPuzzle)`

### verifyIsomorphismWitness
- Signature: `verifyIsomorphismWitness(g1, g2, nameMap)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:2065 (defined)`

### _isoBaseGraph
- Signature: `_isoBaseGraph(n)`
- Purpose: Generate a random connected undirected simple graph suitable for iso puzzles. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:2104 (defined)`, `lib/graph.js:2186 (inside _neitherByReason)`, `lib/graph.js:2310 (inside generateIsoPuzzle)`

### _randomSpanningTreePairs
- Signature: `_randomSpanningTreePairs(n)`
- Purpose: Random spanning tree returned as index pairs [[a,b], …]. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:2122 (defined)`, `lib/graph.js:2223 (inside _neitherByReason)`

### _swapToChangeTriangles
- Signature: `_swapToChangeTriangles(graph, maxSwaps = 80)`
- Purpose: Attempt up to maxSwaps random 2-opt degree-preserving swaps until the triangle count of the graph changes. Returns the modified graph, or null if no triangle-changing swap was found.
- Usage: `lib/graph.js:2139 (defined)`, `lib/graph.js:2236 (inside _neitherByReason)`

### _neitherByReason
- Signature: `_neitherByReason(reason, n, nMin, nMax)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:2180 (defined)`, `lib/graph.js:2342 (inside generateIsoPuzzle)`

### _graphsEqual
- Signature: `_graphsEqual(ga, gb)`
- Purpose: Return true when two undirected simple graphs have identical edge sets (same n and same set of sorted label pairs). It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:2275 (defined)`, `lib/graph.js:2327 (inside generateIsoPuzzle)`

### generateIsoPuzzle
- Signature: `generateIsoPuzzle()`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:2303 (defined)`

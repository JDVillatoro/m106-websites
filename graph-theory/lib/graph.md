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
- Usage: `lib/graph.js:56 (defined)`, `lib/graph.js:109 (inside vertexIds)`, `lib/graph.js:518 (inside _toEdges)`, `lib/graph.js:654 (inside generateEulerianMultigraph)`, `lib/graph.js:702 (inside generateMSCDigraph)`, `lib/graph.js:734 (inside _eulerizeDigraph)`, `lib/graph.js:790 (inside generateEulerianDigraph)`, `lib/graph.js:853 (inside generateRandomGraph)`, `lib/graph.js:1346 (inside validateGraphColoring)`, `lib/graph.js:1394 (inside computeGreedyColoring)`, `lib/graph.js:1447 (inside validateGreedyColoring)`, `lib/graph.js:1684 (inside _generateSchedulingApplicationsPuzzle)`, `lib/graph.js:1868 (inside _generateInterferenceApplicationsPuzzle)`, `lib/graph.js:1913 (inside validateApplicationsAssignment)`, `lib/graph.js:2054 (inside applyPermutation)`, `lib/graph.js:2169 (inside _swapToChangeTriangles)`, `lib/graph.js:2227 (inside _neitherByReason)`, `lib/graph.js:2675 (inside _makeHamiltonianNN)`, `lib/graph.js:2753 (inside _makeHamiltonianSE)`, `lib/render.js:173 (inside createGraphView)`, `lib/render.js:219 (inside replaceElements)`, `modes/applications.js:71 (inside matchesShownDistances)`, `modes/applications.js:123 (inside newQuestion)`, `modes/coloring.js:15 (top-level)`, `modes/coloring.js:165 (inside getGreedyVertexOrder)`, `modes/coloring.js:201 (inside colorGraph)`, `modes/coloring.js:225 (inside newQuestion)`, `modes/degree.js:46 (inside newGraph)`, `modes/make.js:75 (inside openEditor)`, `modes/make.js:96 (inside renderEdges)`, `modes/make.js:121 (inside setVertexCount)`

### vertexIndex
- Signature: `vertexIndex(id)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:65 (defined)`, `lib/graph.js:77 (inside vertexLabel)`, `lib/graph.js:148 (inside getDegrees)`, `lib/graph.js:187 (inside getDirectedDegrees)`, `lib/graph.js:209 (inside buildAdjList)`, `lib/graph.js:247 (inside reachableCount)`, `lib/graph.js:289 (inside isStronglyConnected)`, `lib/graph.js:377 (inside graphToDescription)`, `lib/graph.js:636 (inside generateEulerianMultigraph)`, `lib/graph.js:904 (inside minEulerizeEdges)`, `lib/graph.js:1201 (inside generateNonPlanarGraph)`, `lib/graph.js:1309 (inside chromaticNumber)`, `lib/graph.js:1358 (inside validateGraphColoring)`, `lib/graph.js:1401 (inside computeGreedyColoring)`, `lib/graph.js:1467 (inside validateGreedyColoring)`, `lib/graph.js:1676 (inside _generateSchedulingApplicationsPuzzle)`, `lib/graph.js:1969 (inside countTriangles)`, `lib/graph.js:1990 (inside componentCount)`, `lib/graph.js:2054 (inside applyPermutation)`, `lib/graph.js:2147 (inside _swapToChangeTriangles)`, `lib/graph.js:2381 (inside _hamCutVertices)`, `modes/eulerian.js:44 (inside _puzzleComplexityOk)`

### vertexLabel
- Signature: `vertexLabel(id, names)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:76 (defined)`, `lib/graph.js:374 (inside graphToDescription)`, `lib/graph.js:2082 (inside verifyIsomorphismWitness)`, `lib/graph.js:2281 (inside _graphsEqual)`, `lib/graph.js:2982 (inside validateHamiltonianCycleFreeform)`, `lib/graph.js:3033 (inside validateHamiltonianCycleNN)`, `lib/graph.js:3114 (inside validateHamiltonianCycleSE)`, `modes/eulerian.js:205 (inside validateEulerianCircuitSimple)`, `modes/eulerian.js:244 (inside validateEulerianCircuitMulti)`, `modes/eulerian.js:265 (inside validateEulerianCircuitDigraph)`, `modes/eulerian.js:290 (inside validateEulerization)`

### makeLabels
- Signature: `makeLabels(n)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:88 (defined)`, `lib/graph.js:539 (inside generateSimpleGraph)`, `lib/graph.js:588 (inside generateConnectedMultigraph)`, `lib/graph.js:610 (inside generateEulerianSimpleGraph)`, `lib/graph.js:659 (inside generateEulerianMultigraph)`, `lib/graph.js:715 (inside generateMSCDigraph)`, `lib/graph.js:817 (inside generateEulerianDigraph)`, `lib/graph.js:875 (inside generateRandomGraph)`, `lib/graph.js:1154 (inside generatePlanarGraph)`, `lib/graph.js:1234 (inside generateNonPlanarGraph)`, `lib/graph.js:2113 (inside _isoBaseGraph)`, `lib/graph.js:2230 (inside _neitherByReason)`, `lib/graph.js:2673 (inside _makeHamiltonianNN)`, `lib/graph.js:2751 (inside _makeHamiltonianSE)`, `lib/graph.js:2807 (inside _makeHamiltonianFreeform)`, `lib/graph.js:2850 (inside generateHamiltonianPuzzle)`, `modes/make.js:119 (inside setVertexCount)`

### vertexIds
- Signature: `vertexIds(n)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:108 (defined)`

### shuffle
- Signature: `shuffle(arr)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:124 (defined)`, `lib/graph.js:434 (inside _randomSpanningTree)`, `lib/graph.js:455 (inside _minimalConnectedGraph)`, `lib/graph.js:507 (inside _simpleGraph)`, `lib/graph.js:564 (inside generateConnectedMultigraph)`, `lib/graph.js:607 (inside generateEulerianSimpleGraph)`, `lib/graph.js:638 (inside generateEulerianMultigraph)`, `lib/graph.js:673 (inside backtrack)`, `lib/graph.js:706 (inside generateMSCDigraph)`, `lib/graph.js:739 (inside _eulerizeDigraph)`, `lib/graph.js:847 (inside generateRandomGraph)`, `lib/graph.js:1162 (inside _injectK5)`, `lib/graph.js:1173 (inside _injectK33)`, `lib/graph.js:1220 (inside generateNonPlanarGraph)`, `lib/graph.js:1525 (inside _pickUniqueNames)`, `lib/graph.js:1536 (inside _makeBipartiteApplicationsGraph)`, `lib/graph.js:1581 (inside _makeK5ApplicationsGraph)`, `lib/graph.js:1660 (inside _generateSchedulingApplicationsPuzzle)`, `lib/graph.js:2126 (inside _randomSpanningTreePairs)`, `lib/graph.js:2327 (inside generateIsoPuzzle)`, `lib/graph.js:2585 (inside _hamMakeBipartiteUnequal)`, `lib/graph.js:2634 (inside _makeHamiltonianNN)`, `lib/graph.js:2701 (inside _makeHamiltonianSE)`, `lib/graph.js:2787 (inside _makeHamiltonianFreeform)`, `modes/coloring.js:46 (inside _makeBipartiteColoringPuzzleGraph)`, `modes/coloring.js:93 (inside _makeK5ColoringPuzzleGraph)`, `modes/eulerian.js:90 (inside _makeNonEulerianDigraph)`, `modes/eulerian.js:118 (inside _makeNonEulerianSimple)`, `modes/eulerian.js:148 (inside _makeNonEulerianMulti)`, `modes/iso.js:58 (inside newQuestion)`, `modes/planar.js:65 (inside draw)`

### getDegrees
- Signature: `getDegrees(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:143 (defined)`, `lib/graph.js:163 (inside getOddVertices)`, `lib/graph.js:173 (inside degreeSequence)`, `lib/graph.js:2410 (inside _hamLeafVertices)`

### getOddVertices
- Signature: `getOddVertices(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:162 (defined)`, `lib/graph.js:607 (inside generateEulerianSimpleGraph)`, `lib/graph.js:638 (inside generateEulerianMultigraph)`, `lib/graph.js:897 (inside minEulerizeEdges)`, `modes/eulerian.js:121 (inside _makeNonEulerianSimple)`, `modes/eulerian.js:151 (inside _makeNonEulerianMulti)`, `modes/eulerian.js:186 (inside generateEulerianGraphPuzzle)`, `modes/eulerian.js:467 (inside submitCircuit)`

### degreeSequence
- Signature: `degreeSequence(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:172 (defined)`, `lib/graph.js:2014 (inside graphInvariants)`, `lib/graph.js:2206 (inside _neitherByReason)`, `modes/degree.js:63 (inside newQuestion)`

### getDirectedDegrees
- Signature: `getDirectedDegrees(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:181 (defined)`, `lib/graph.js:726 (inside _eulerizeDigraph)`, `lib/graph.js:961 (inside getMismatchedVertices)`, `modes/eulerian.js:182 (inside generateEulerianGraphPuzzle)`

### buildAdjList
- Signature: `buildAdjList(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:204 (defined)`, `lib/graph.js:242 (inside reachableCount)`, `lib/graph.js:2422 (inside _hamBipartiteParts)`

### reachableCount
- Signature: `reachableCount(graphOrAdj, startVertex = 0)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:231 (defined)`, `lib/graph.js:271 (inside isConnected)`

### isConnected
- Signature: `isConnected(graph, startVertex = 0)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:268 (defined)`, `modes/eulerian.js:121 (inside _makeNonEulerianSimple)`, `modes/eulerian.js:151 (inside _makeNonEulerianMulti)`, `modes/eulerian.js:186 (inside generateEulerianGraphPuzzle)`

### isStronglyConnected
- Signature: `isStronglyConnected(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:280 (defined)`, `lib/graph.js:710 (inside generateMSCDigraph)`, `modes/eulerian.js:93 (inside _makeNonEulerianDigraph)`, `modes/eulerian.js:184 (inside generateEulerianGraphPuzzle)`

### bfsCount
- Signature: `bfsCount(adj)`
- Purpose: BFS reachability count from vertex 0 over a directed adjacency list. Used by isStronglyConnected on both forward and reverse graphs.
- Usage: `lib/graph.js:301 (defined)`, `lib/graph.js:314 (inside isStronglyConnected)`

### isMultiGraph
- Signature: `isMultiGraph(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:328 (defined)`

### graphToDescription
- Signature: `graphToDescription(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:353 (defined)`, `lib/render.js:148 (inside describe)`, `modes/make.js:60 (inside fillAltText)`

### graphToCSV
- Signature: `graphToCSV(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:411 (defined)`

### _randomSpanningTree
- Signature: `_randomSpanningTree(n)`
- Purpose: Generate a random spanning tree on n vertices (as index pairs). Implementation: shuffle vertices and connect consecutive vertices in that random order (a random Hamiltonian path).
- Usage: `lib/graph.js:433 (defined)`

### _minimalConnectedGraph
- Signature: `_minimalConnectedGraph(n)`
- Purpose: Generate a minimal connected simple graph on n vertices. Starts from K_n and greedily removes edges while maintaining connectivity.
- Usage: `lib/graph.js:449 (defined)`, `lib/graph.js:499 (inside _simpleGraph)`

### _indexEdgesConnected
- Signature: `_indexEdgesConnected(indexEdges, n)`
- Purpose: Connectivity check on index-pair edges. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:460 (inside _minimalConnectedGraph)`, `lib/graph.js:466 (defined)`, `lib/graph.js:1144 (inside generatePlanarGraph)`, `lib/graph.js:1226 (inside generateNonPlanarGraph)`

### _simpleGraph
- Signature: `_simpleGraph(n, targetEdges)`
- Purpose: Generate a random connected simple graph with approximately targetEdges edges. Strategy: 1) Build a minimal connected simple graph (spanning tree backbone).
- Usage: `lib/graph.js:489 (defined)`, `lib/graph.js:542 (inside generateSimpleGraph)`, `lib/graph.js:568 (inside generateConnectedMultigraph)`, `lib/graph.js:605 (inside generateEulerianSimpleGraph)`, `lib/graph.js:2116 (inside _isoBaseGraph)`, `lib/graph.js:2557 (inside _hamMakeCutVertex)`, `lib/graph.js:2569 (inside _hamMakeLeaf)`

### _toEdges
- Signature: `_toEdges(indexEdges, extraProps = {})`
- Purpose: Convert index-pair edges to "vN" edge objects. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:516 (defined)`, `lib/graph.js:542 (inside generateSimpleGraph)`, `lib/graph.js:591 (inside generateConnectedMultigraph)`, `lib/graph.js:607 (inside generateEulerianSimpleGraph)`, `lib/graph.js:1157 (inside generatePlanarGraph)`, `lib/graph.js:1237 (inside generateNonPlanarGraph)`, `lib/graph.js:1565 (inside _makeBipartiteApplicationsGraph)`, `lib/graph.js:1609 (inside _makeK5ApplicationsGraph)`, `lib/graph.js:1784 (inside _buildInterferenceGraphFromDistance)`, `lib/graph.js:2116 (inside _isoBaseGraph)`, `lib/graph.js:2810 (inside _makeHamiltonianFreeform)`, `lib/graph.js:2851 (inside generateHamiltonianPuzzle)`

### generateSimpleGraph
- Signature: `generateSimpleGraph(n, targetEdges)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:536 (defined)`, `lib/graph.js:625 (inside generateEulerianSimpleGraph)`, `modes/degree.js:41 (inside newGraph)`

### generateConnectedMultigraph
- Signature: `generateConnectedMultigraph(n, targetEdges, options = {})`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:553 (defined)`, `lib/graph.js:635 (inside generateEulerianMultigraph)`

---

### generateEulerianSimpleGraph
- Signature: `generateEulerianSimpleGraph(n, targetEdges, maxRerolls = 30)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:603 (defined)`, `modes/eulerian.js:104 (inside _makeEulerianSimple)`, `modes/eulerian.js:113 (inside _makeNonEulerianSimple)`

### generateEulerianMultigraph
- Signature: `generateEulerianMultigraph(n, targetEdges)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:634 (defined)`, `modes/eulerian.js:134 (inside _makeEulerianMulti)`, `modes/eulerian.js:143 (inside _makeNonEulerianMulti)`

### _findSimplePairing
- Signature: `_findSimplePairing(odds, edgeSet)`
- Purpose: Pairing helper used by Eulerian simple graph generator. Finds a perfect matching on `odds` using only edges absent from edgeSet.
- Usage: `lib/graph.js:614 (inside generateEulerianSimpleGraph)`, `lib/graph.js:669 (defined)`

### backtrack
- Signature: `backtrack(remaining)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:670 (defined)`, `lib/graph.js:677 (inside backtrack)`, `lib/graph.js:683 (inside _findSimplePairing)`

### generateMSCDigraph
- Signature: `generateMSCDigraph(n)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:698 (defined)`, `lib/graph.js:779 (inside generateEulerianDigraph)`

### _eulerizeDigraph
- Signature: `_eulerizeDigraph(edges, n)`
- Purpose: Balance a directed graph so every vertex has in-degree == out-degree. Mutates and returns the edges array.
- Usage: `lib/graph.js:725 (defined)`, `lib/graph.js:820 (inside generateEulerianDigraph)`

### generateEulerianDigraph
- Signature: `generateEulerianDigraph(n, targetEdges)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:771 (defined)`, `modes/eulerian.js:79 (inside _makeEulerianDigraph)`, `modes/eulerian.js:88 (inside _makeNonEulerianDigraph)`

### generateRandomGraph
- Signature: `generateRandomGraph(n, numComponents = 1)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:831 (defined)`, `modes/make.js:271 (top-level)`

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
- Usage: `lib/graph.js:896 (defined)`, `modes/eulerian.js:501 (inside submitEulerize)`

### bfsDist
- Signature: `bfsDist(start)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:909 (defined)`, `lib/graph.js:924 (inside minEulerizeEdges)`

### getMismatchedVertices
- Signature: `getMismatchedVertices(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:960 (defined)`, `modes/eulerian.js:481 (inside submitIdentify)`

### _randInt
- Signature: `_randInt(min, max)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:970 (defined)`, `lib/graph.js:1056 (inside _generateConnectedPlanarIndexEdges)`, `lib/graph.js:1148 (inside generatePlanarGraph)`, `lib/graph.js:1219 (inside generateNonPlanarGraph)`, `lib/graph.js:1535 (inside _makeBipartiteApplicationsGraph)`, `lib/graph.js:1600 (inside _makeK5ApplicationsGraph)`, `lib/graph.js:1615 (inside _generateSchedulingBaseGraph)`, `lib/graph.js:1817 (inside _generateInterferenceApplicationsPuzzle)`

### _edgeKey
- Signature: `_edgeKey(a, b)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:974 (defined)`, `lib/graph.js:1063 (inside _generateConnectedPlanarIndexEdges)`, `lib/graph.js:1207 (inside generateNonPlanarGraph)`, `lib/graph.js:1254 (inside _dedupeIndexEdges)`, `lib/graph.js:1543 (inside _makeBipartiteApplicationsGraph)`, `lib/graph.js:1588 (inside _makeK5ApplicationsGraph)`

### _isColinear
- Signature: `_isColinear(a, b, c, eps = 1e-6)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:978 (defined)`, `lib/graph.js:1010 (inside _generateNonColinearPoints)`

### _generateNonColinearPoints
- Signature: `_generateNonColinearPoints(n, maxAttempts = 120)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:983 (defined)`, `lib/graph.js:1053 (inside _generateConnectedPlanarIndexEdges)`

### _ccw
- Signature: `_ccw(a, b, c)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1034 (defined)`, `lib/graph.js:1039 (inside _segmentsIntersect)`

### _segmentsIntersect
- Signature: `_segmentsIntersect(p1, p2, p3, p4)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1038 (defined)`, `lib/graph.js:1045 (inside _wouldCrossAny)`

### _wouldCrossAny
- Signature: `_wouldCrossAny(a, b, indexEdges, pos)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1042 (defined)`, `lib/graph.js:1075 (inside _generateConnectedPlanarIndexEdges)`

### _generateConnectedPlanarIndexEdges
- Signature: `_generateConnectedPlanarIndexEdges(n, targetEdges)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1050 (defined)`, `lib/graph.js:1138 (inside generatePlanarGraph)`

### _makePlanarPuzzleGraph
- Signature: `_makePlanarPuzzleGraph(n)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:1084 (defined)`, `graph.js:1142 (inside _makeNonPlanarPuzzleGraph)`, `graph.js:1201 (inside generatePlanarGraphPuzzle)`, `graph.js:1328 (inside _makePlanarColoringGraph)`

### _injectK5
- Signature: `_injectK5(indexEdges, n)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1161 (defined)`, `lib/graph.js:1205 (inside generateNonPlanarGraph)`

### _injectK33
- Signature: `_injectK33(indexEdges, n)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1172 (defined)`, `lib/graph.js:1205 (inside generateNonPlanarGraph)`

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
- Usage: `lib/graph.js:1246 (defined)`, `lib/graph.js:1341 (inside validateGraphColoring)`, `lib/graph.js:1444 (inside validateGreedyColoring)`, `lib/graph.js:1562 (inside _makeBipartiteApplicationsGraph)`, `lib/graph.js:1573 (inside _makePlanarApplicationsGraph)`, `lib/graph.js:1606 (inside _makeK5ApplicationsGraph)`

### _dedupeIndexEdges
- Signature: `_dedupeIndexEdges(indexEdges)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1250 (defined)`, `lib/graph.js:1308 (inside chromaticNumber)`

### _buildAdjFromIndexEdges
- Signature: `_buildAdjFromIndexEdges(indexEdges, n)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1262 (defined)`, `lib/graph.js:1274 (inside _isColorableWithK)`

### _isColorableWithK
- Signature: `_isColorableWithK(indexEdges, n, k)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1272 (defined)`, `lib/graph.js:1313 (inside chromaticNumber)`

### dfs
- Signature: `dfs(pos)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:1284 (defined)`, `lib/graph.js:1296 (inside dfs)`, `lib/graph.js:1302 (inside _isColorableWithK)`

### chromaticNumber
- Signature: `chromaticNumber(graph, maxColors = 6)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:1305 (defined)`, `lib/graph.js:1627 (inside _generateSchedulingBaseGraph)`, `lib/graph.js:1851 (inside _generateInterferenceApplicationsPuzzle)`, `modes/coloring.js:140 (inside generateGraphColoringPuzzle)`

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
- Usage: `lib/graph.js:1337 (defined)`, `modes/coloring.js:256 (inside submit)`

### computeGreedyColoring
- Signature: `computeGreedyColoring(graph, vertexOrderIds, colorOrder)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:1388 (defined)`, `lib/graph.js:1455 (inside validateGreedyColoring)`

### validateGreedyColoring
- Signature: `validateGreedyColoring(graph, vertexOrderIds, userColorByVertexId, colorOrder)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:1442 (defined)`, `modes/coloring.js:249 (inside submit)`

### _pickUniqueNames
- Signature: `_pickUniqueNames(pool, count, fallbackPrefix)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1524 (defined)`, `lib/graph.js:1657 (inside _generateSchedulingApplicationsPuzzle)`, `lib/graph.js:1845 (inside _generateInterferenceApplicationsPuzzle)`

### _generateSchedulingApplicationsPuzzle
- Signature: `_generateSchedulingApplicationsPuzzle()`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1655 (defined)`, `lib/graph.js:1872 (inside _generateInterferenceApplicationsPuzzle)`, `lib/graph.js:1891 (inside generateApplicationsPuzzle)`

### takeMemberName
- Signature: `takeMemberName()`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:1663 (defined)`, `lib/graph.js:1671 (inside _generateSchedulingApplicationsPuzzle)`

### _distance
- Signature: `_distance(a, b)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1702 (defined)`, `lib/graph.js:1716 (inside _generateSeparatedPoints)`, `lib/graph.js:1728 (inside _pairwiseDistances)`

### _generateSeparatedPoints
- Signature: `_generateSeparatedPoints(n, minSep, maxTries = 4000)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1708 (defined)`, `lib/graph.js:1818 (inside _generateInterferenceApplicationsPuzzle)`

### _pairwiseDistances
- Signature: `_pairwiseDistances(points)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1723 (defined)`, `lib/graph.js:1821 (inside _generateInterferenceApplicationsPuzzle)`

### _mstBottleneckDistance
- Signature: `_mstBottleneckDistance(dist)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1736 (defined)`, `lib/graph.js:1832 (inside _generateInterferenceApplicationsPuzzle)`

### _buildInterferenceGraphFromDistance
- Signature: `_buildInterferenceGraphFromDistance(dist, threshold)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1776 (defined)`, `lib/graph.js:1842 (inside _generateInterferenceApplicationsPuzzle)`

### _generateInterferenceApplicationsPuzzle
- Signature: `_generateInterferenceApplicationsPuzzle()`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1815 (defined)`, `lib/graph.js:1892 (inside generateApplicationsPuzzle)`

### generateApplicationsPuzzle
- Signature: `generateApplicationsPuzzle()`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:1889 (defined)`, `modes/applications.js:79 (inside newPuzzle)`

### _sharedMembersForEdge
- Signature: `_sharedMembersForEdge(puzzle, sourceId, targetId)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1895 (defined)`, `lib/graph.js:1924 (inside validateApplicationsAssignment)`

### validateApplicationsAssignment
- Signature: `validateApplicationsAssignment(puzzle, assignmentByVertexId)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:1906 (defined)`, `modes/applications.js:143 (inside submit)`

### countTriangles
- Signature: `countTriangles(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:1964 (defined)`, `lib/graph.js:2016 (inside graphInvariants)`, `lib/graph.js:2143 (inside _swapToChangeTriangles)`, `lib/graph.js:2259 (inside _neitherByReason)`

### componentCount
- Signature: `componentCount(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:1984 (defined)`, `lib/graph.js:2015 (inside graphInvariants)`, `lib/graph.js:2231 (inside _neitherByReason)`

### graphInvariants
- Signature: `graphInvariants(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:2010 (defined)`, `lib/graph.js:2029 (inside checkNeitherReason)`, `lib/graph.js:2249 (inside _neitherByReason)`

### checkNeitherReason
- Signature: `checkNeitherReason(g1, g2, reason)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:2028 (defined)`, `modes/iso.js:105 (inside submitReason)`

### applyPermutation
- Signature: `applyPermutation(graph, sigma)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:2052 (defined)`, `lib/graph.js:2329 (inside generateIsoPuzzle)`

### verifyIsomorphismWitness
- Signature: `verifyIsomorphismWitness(g1, g2, nameMap)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:2068 (defined)`, `modes/iso.js:121 (inside submitMapping)`

### _isoBaseGraph
- Signature: `_isoBaseGraph(n)`
- Purpose: Generate a random connected undirected simple graph suitable for iso puzzles. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:2107 (defined)`, `lib/graph.js:2189 (inside _neitherByReason)`, `lib/graph.js:2313 (inside generateIsoPuzzle)`

### _randomSpanningTreePairs
- Signature: `_randomSpanningTreePairs(n)`
- Purpose: Random spanning tree returned as index pairs [[a,b], …]. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:2125 (defined)`, `lib/graph.js:2226 (inside _neitherByReason)`

### _swapToChangeTriangles
- Signature: `_swapToChangeTriangles(graph, maxSwaps = 80)`
- Purpose: Attempt up to maxSwaps random 2-opt degree-preserving swaps until the triangle count of the graph changes. Returns the modified graph, or null if no triangle-changing swap was found.
- Usage: `lib/graph.js:2142 (defined)`, `lib/graph.js:2239 (inside _neitherByReason)`

### _neitherByReason
- Signature: `_neitherByReason(reason, n, nMin, nMax)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:2183 (defined)`, `lib/graph.js:2345 (inside generateIsoPuzzle)`

### _graphsEqual
- Signature: `_graphsEqual(ga, gb)`
- Purpose: Return true when two undirected simple graphs have identical edge sets (same n and same set of sorted label pairs). It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:2278 (defined)`, `lib/graph.js:2330 (inside generateIsoPuzzle)`

### generateIsoPuzzle
- Signature: `generateIsoPuzzle()`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:2306 (defined)`, `modes/iso.js:56 (inside newQuestion)`

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
- Usage: `lib/graph.js:52 (defined)`, `lib/graph.js:105 (inside vertexIds)`, `lib/graph.js:514 (inside _toEdges)`, `lib/graph.js:650 (inside generateEulerianMultigraph)`, `lib/graph.js:698 (inside generateMSCDigraph)`, `lib/graph.js:730 (inside _eulerizeDigraph)`, `lib/graph.js:786 (inside generateEulerianDigraph)`, `lib/graph.js:849 (inside generateRandomGraph)`, `lib/graph.js:1342 (inside validateGraphColoring)`, `lib/graph.js:1390 (inside computeGreedyColoring)`, `lib/graph.js:1443 (inside validateGreedyColoring)`, `lib/graph.js:1680 (inside _generateSchedulingApplicationsPuzzle)`, `lib/graph.js:1864 (inside _generateInterferenceApplicationsPuzzle)`, `lib/graph.js:1909 (inside validateApplicationsAssignment)`, `lib/graph.js:2050 (inside applyPermutation)`, `lib/graph.js:2165 (inside _swapToChangeTriangles)`, `lib/graph.js:2223 (inside _neitherByReason)`, `lib/graph.js:2672 (inside _makeHamiltonianNN)`, `lib/graph.js:2750 (inside _makeHamiltonianSE)`, `lib/render.js:173 (inside createGraphView)`, `lib/render.js:219 (inside replaceElements)`, `modes/applications.js:71 (inside matchesShownDistances)`, `modes/applications.js:123 (inside newQuestion)`, `modes/coloring.js:15 (top-level)`, `modes/coloring.js:165 (inside getGreedyVertexOrder)`, `modes/coloring.js:201 (inside colorGraph)`, `modes/coloring.js:225 (inside newQuestion)`, `modes/degree.js:46 (inside newGraph)`, `modes/make.js:75 (inside openEditor)`, `modes/make.js:96 (inside renderEdges)`, `modes/make.js:121 (inside setVertexCount)`

### vertexIndex
- Signature: `vertexIndex(id)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:61 (defined)`, `lib/graph.js:73 (inside vertexLabel)`, `lib/graph.js:144 (inside getDegrees)`, `lib/graph.js:183 (inside getDirectedDegrees)`, `lib/graph.js:205 (inside buildAdjList)`, `lib/graph.js:243 (inside reachableCount)`, `lib/graph.js:285 (inside isStronglyConnected)`, `lib/graph.js:373 (inside graphToDescription)`, `lib/graph.js:632 (inside generateEulerianMultigraph)`, `lib/graph.js:900 (inside minEulerizeEdges)`, `lib/graph.js:1197 (inside generateNonPlanarGraph)`, `lib/graph.js:1305 (inside chromaticNumber)`, `lib/graph.js:1354 (inside validateGraphColoring)`, `lib/graph.js:1397 (inside computeGreedyColoring)`, `lib/graph.js:1463 (inside validateGreedyColoring)`, `lib/graph.js:1672 (inside _generateSchedulingApplicationsPuzzle)`, `lib/graph.js:1965 (inside countTriangles)`, `lib/graph.js:1986 (inside componentCount)`, `lib/graph.js:2050 (inside applyPermutation)`, `lib/graph.js:2143 (inside _swapToChangeTriangles)`, `lib/graph.js:2378 (inside _hamCutVertices)`, `modes/eulerian.js:44 (inside _puzzleComplexityOk)`

### vertexLabel
- Signature: `vertexLabel(id, names)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:72 (defined)`, `lib/graph.js:370 (inside graphToDescription)`, `lib/graph.js:2078 (inside verifyIsomorphismWitness)`, `lib/graph.js:2277 (inside _graphsEqual)`, `lib/graph.js:2979 (inside validateHamiltonianCycleFreeform)`, `lib/graph.js:3030 (inside validateHamiltonianCycleNN)`, `lib/graph.js:3111 (inside validateHamiltonianCycleSE)`, `modes/eulerian.js:205 (inside validateEulerianCircuitSimple)`, `modes/eulerian.js:244 (inside validateEulerianCircuitMulti)`, `modes/eulerian.js:265 (inside validateEulerianCircuitDigraph)`, `modes/eulerian.js:290 (inside validateEulerization)`

### makeLabels
- Signature: `makeLabels(n)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:84 (defined)`, `lib/graph.js:535 (inside generateSimpleGraph)`, `lib/graph.js:584 (inside generateConnectedMultigraph)`, `lib/graph.js:606 (inside generateEulerianSimpleGraph)`, `lib/graph.js:655 (inside generateEulerianMultigraph)`, `lib/graph.js:711 (inside generateMSCDigraph)`, `lib/graph.js:813 (inside generateEulerianDigraph)`, `lib/graph.js:871 (inside generateRandomGraph)`, `lib/graph.js:1150 (inside generatePlanarGraph)`, `lib/graph.js:1230 (inside generateNonPlanarGraph)`, `lib/graph.js:2109 (inside _isoBaseGraph)`, `lib/graph.js:2226 (inside _neitherByReason)`, `lib/graph.js:2670 (inside _makeHamiltonianNN)`, `lib/graph.js:2748 (inside _makeHamiltonianSE)`, `lib/graph.js:2804 (inside _makeHamiltonianFreeform)`, `lib/graph.js:2847 (inside generateHamiltonianPuzzle)`, `modes/make.js:119 (inside setVertexCount)`

### vertexIds
- Signature: `vertexIds(n)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:104 (defined)`

### shuffle
- Signature: `shuffle(arr)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:120 (defined)`, `lib/graph.js:430 (inside _randomSpanningTree)`, `lib/graph.js:451 (inside _minimalConnectedGraph)`, `lib/graph.js:503 (inside _simpleGraph)`, `lib/graph.js:560 (inside generateConnectedMultigraph)`, `lib/graph.js:603 (inside generateEulerianSimpleGraph)`, `lib/graph.js:634 (inside generateEulerianMultigraph)`, `lib/graph.js:669 (inside backtrack)`, `lib/graph.js:702 (inside generateMSCDigraph)`, `lib/graph.js:735 (inside _eulerizeDigraph)`, `lib/graph.js:843 (inside generateRandomGraph)`, `lib/graph.js:1158 (inside _injectK5)`, `lib/graph.js:1169 (inside _injectK33)`, `lib/graph.js:1216 (inside generateNonPlanarGraph)`, `lib/graph.js:1521 (inside _pickUniqueNames)`, `lib/graph.js:1532 (inside _makeBipartiteApplicationsGraph)`, `lib/graph.js:1577 (inside _makeK5ApplicationsGraph)`, `lib/graph.js:1656 (inside _generateSchedulingApplicationsPuzzle)`, `lib/graph.js:2122 (inside _randomSpanningTreePairs)`, `lib/graph.js:2323 (inside generateIsoPuzzle)`, `lib/graph.js:2582 (inside _hamMakeBipartiteUnequal)`, `lib/graph.js:2631 (inside _makeHamiltonianNN)`, `lib/graph.js:2698 (inside _makeHamiltonianSE)`, `lib/graph.js:2784 (inside _makeHamiltonianFreeform)`, `modes/coloring.js:46 (inside _makeBipartiteColoringPuzzleGraph)`, `modes/coloring.js:93 (inside _makeK5ColoringPuzzleGraph)`, `modes/eulerian.js:90 (inside _makeNonEulerianDigraph)`, `modes/eulerian.js:118 (inside _makeNonEulerianSimple)`, `modes/eulerian.js:148 (inside _makeNonEulerianMulti)`, `modes/iso.js:57 (inside newQuestion)`, `modes/planar.js:65 (inside draw)`

### getDegrees
- Signature: `getDegrees(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:139 (defined)`, `lib/graph.js:159 (inside getOddVertices)`, `lib/graph.js:169 (inside degreeSequence)`, `lib/graph.js:2407 (inside _hamLeafVertices)`

### getOddVertices
- Signature: `getOddVertices(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:158 (defined)`, `lib/graph.js:603 (inside generateEulerianSimpleGraph)`, `lib/graph.js:634 (inside generateEulerianMultigraph)`, `lib/graph.js:893 (inside minEulerizeEdges)`, `modes/eulerian.js:121 (inside _makeNonEulerianSimple)`, `modes/eulerian.js:151 (inside _makeNonEulerianMulti)`, `modes/eulerian.js:186 (inside generateEulerianGraphPuzzle)`, `modes/eulerian.js:467 (inside submitCircuit)`

### degreeSequence
- Signature: `degreeSequence(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:168 (defined)`, `lib/graph.js:2010 (inside graphInvariants)`, `lib/graph.js:2202 (inside _neitherByReason)`, `modes/degree.js:63 (inside newQuestion)`

### getDirectedDegrees
- Signature: `getDirectedDegrees(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:177 (defined)`, `lib/graph.js:722 (inside _eulerizeDigraph)`, `lib/graph.js:957 (inside getMismatchedVertices)`, `modes/eulerian.js:182 (inside generateEulerianGraphPuzzle)`

### buildAdjList
- Signature: `buildAdjList(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:200 (defined)`, `lib/graph.js:238 (inside reachableCount)`, `lib/graph.js:2419 (inside _hamBipartiteParts)`

### reachableCount
- Signature: `reachableCount(graphOrAdj, startVertex = 0)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:227 (defined)`, `lib/graph.js:267 (inside isConnected)`

### isConnected
- Signature: `isConnected(graph, startVertex = 0)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:264 (defined)`, `modes/eulerian.js:121 (inside _makeNonEulerianSimple)`, `modes/eulerian.js:151 (inside _makeNonEulerianMulti)`, `modes/eulerian.js:186 (inside generateEulerianGraphPuzzle)`

### isStronglyConnected
- Signature: `isStronglyConnected(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:276 (defined)`, `lib/graph.js:706 (inside generateMSCDigraph)`, `modes/eulerian.js:93 (inside _makeNonEulerianDigraph)`, `modes/eulerian.js:184 (inside generateEulerianGraphPuzzle)`

### bfsCount
- Signature: `bfsCount(adj)`
- Purpose: BFS reachability count from vertex 0 over a directed adjacency list. Used by isStronglyConnected on both forward and reverse graphs.
- Usage: `lib/graph.js:297 (defined)`, `lib/graph.js:310 (inside isStronglyConnected)`

### isMultiGraph
- Signature: `isMultiGraph(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:324 (defined)`

### graphToDescription
- Signature: `graphToDescription(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:349 (defined)`, `lib/render.js:148 (inside describe)`, `modes/make.js:60 (inside fillAltText)`

### graphToCSV
- Signature: `graphToCSV(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:407 (defined)`

### _randomSpanningTree
- Signature: `_randomSpanningTree(n)`
- Purpose: Generate a random spanning tree on n vertices (as index pairs). Implementation: shuffle vertices and connect consecutive vertices in that random order (a random Hamiltonian path).
- Usage: `lib/graph.js:429 (defined)`

### _minimalConnectedGraph
- Signature: `_minimalConnectedGraph(n)`
- Purpose: Generate a minimal connected simple graph on n vertices. Starts from K_n and greedily removes edges while maintaining connectivity.
- Usage: `lib/graph.js:445 (defined)`, `lib/graph.js:495 (inside _simpleGraph)`

### _indexEdgesConnected
- Signature: `_indexEdgesConnected(indexEdges, n)`
- Purpose: Connectivity check on index-pair edges. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:456 (inside _minimalConnectedGraph)`, `lib/graph.js:462 (defined)`, `lib/graph.js:1140 (inside generatePlanarGraph)`, `lib/graph.js:1222 (inside generateNonPlanarGraph)`

### _simpleGraph
- Signature: `_simpleGraph(n, targetEdges)`
- Purpose: Generate a random connected simple graph with approximately targetEdges edges. Strategy: 1) Build a minimal connected simple graph (spanning tree backbone).
- Usage: `lib/graph.js:485 (defined)`, `lib/graph.js:538 (inside generateSimpleGraph)`, `lib/graph.js:564 (inside generateConnectedMultigraph)`, `lib/graph.js:601 (inside generateEulerianSimpleGraph)`, `lib/graph.js:2112 (inside _isoBaseGraph)`, `lib/graph.js:2554 (inside _hamMakeCutVertex)`, `lib/graph.js:2566 (inside _hamMakeLeaf)`

### _toEdges
- Signature: `_toEdges(indexEdges, extraProps = {})`
- Purpose: Convert index-pair edges to "vN" edge objects. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:512 (defined)`, `lib/graph.js:538 (inside generateSimpleGraph)`, `lib/graph.js:587 (inside generateConnectedMultigraph)`, `lib/graph.js:603 (inside generateEulerianSimpleGraph)`, `lib/graph.js:1153 (inside generatePlanarGraph)`, `lib/graph.js:1233 (inside generateNonPlanarGraph)`, `lib/graph.js:1561 (inside _makeBipartiteApplicationsGraph)`, `lib/graph.js:1605 (inside _makeK5ApplicationsGraph)`, `lib/graph.js:1780 (inside _buildInterferenceGraphFromDistance)`, `lib/graph.js:2112 (inside _isoBaseGraph)`, `lib/graph.js:2807 (inside _makeHamiltonianFreeform)`, `lib/graph.js:2848 (inside generateHamiltonianPuzzle)`

### generateSimpleGraph
- Signature: `generateSimpleGraph(n, targetEdges)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:532 (defined)`, `lib/graph.js:621 (inside generateEulerianSimpleGraph)`, `modes/degree.js:41 (inside newGraph)`

### generateConnectedMultigraph
- Signature: `generateConnectedMultigraph(n, targetEdges, options = {})`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:549 (defined)`, `lib/graph.js:631 (inside generateEulerianMultigraph)`

---

### generateEulerianSimpleGraph
- Signature: `generateEulerianSimpleGraph(n, targetEdges, maxRerolls = 30)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:599 (defined)`, `modes/eulerian.js:104 (inside _makeEulerianSimple)`, `modes/eulerian.js:113 (inside _makeNonEulerianSimple)`

### generateEulerianMultigraph
- Signature: `generateEulerianMultigraph(n, targetEdges)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:630 (defined)`, `modes/eulerian.js:134 (inside _makeEulerianMulti)`, `modes/eulerian.js:143 (inside _makeNonEulerianMulti)`

### _findSimplePairing
- Signature: `_findSimplePairing(odds, edgeSet)`
- Purpose: Pairing helper used by Eulerian simple graph generator. Finds a perfect matching on `odds` using only edges absent from edgeSet.
- Usage: `lib/graph.js:610 (inside generateEulerianSimpleGraph)`, `lib/graph.js:665 (defined)`

### backtrack
- Signature: `backtrack(remaining)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:666 (defined)`, `lib/graph.js:673 (inside backtrack)`, `lib/graph.js:679 (inside _findSimplePairing)`

### generateMSCDigraph
- Signature: `generateMSCDigraph(n)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:694 (defined)`, `lib/graph.js:775 (inside generateEulerianDigraph)`

### _eulerizeDigraph
- Signature: `_eulerizeDigraph(edges, n)`
- Purpose: Balance a directed graph so every vertex has in-degree == out-degree. Mutates and returns the edges array.
- Usage: `lib/graph.js:721 (defined)`, `lib/graph.js:816 (inside generateEulerianDigraph)`

### generateEulerianDigraph
- Signature: `generateEulerianDigraph(n, targetEdges)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:767 (defined)`, `modes/eulerian.js:79 (inside _makeEulerianDigraph)`, `modes/eulerian.js:88 (inside _makeNonEulerianDigraph)`

### generateRandomGraph
- Signature: `generateRandomGraph(n, numComponents = 1)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:827 (defined)`, `modes/make.js:271 (top-level)`

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
- Usage: `lib/graph.js:892 (defined)`, `modes/eulerian.js:501 (inside submitEulerize)`

### bfsDist
- Signature: `bfsDist(start)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:905 (defined)`, `lib/graph.js:920 (inside minEulerizeEdges)`

### getMismatchedVertices
- Signature: `getMismatchedVertices(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:956 (defined)`, `modes/eulerian.js:481 (inside submitIdentify)`

### _randInt
- Signature: `_randInt(min, max)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:966 (defined)`, `lib/graph.js:1052 (inside _generateConnectedPlanarIndexEdges)`, `lib/graph.js:1144 (inside generatePlanarGraph)`, `lib/graph.js:1215 (inside generateNonPlanarGraph)`, `lib/graph.js:1531 (inside _makeBipartiteApplicationsGraph)`, `lib/graph.js:1596 (inside _makeK5ApplicationsGraph)`, `lib/graph.js:1611 (inside _generateSchedulingBaseGraph)`, `lib/graph.js:1813 (inside _generateInterferenceApplicationsPuzzle)`

### _edgeKey
- Signature: `_edgeKey(a, b)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:970 (defined)`, `lib/graph.js:1059 (inside _generateConnectedPlanarIndexEdges)`, `lib/graph.js:1203 (inside generateNonPlanarGraph)`, `lib/graph.js:1250 (inside _dedupeIndexEdges)`, `lib/graph.js:1539 (inside _makeBipartiteApplicationsGraph)`, `lib/graph.js:1584 (inside _makeK5ApplicationsGraph)`

### _isColinear
- Signature: `_isColinear(a, b, c, eps = 1e-6)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:974 (defined)`, `lib/graph.js:1006 (inside _generateNonColinearPoints)`

### _generateNonColinearPoints
- Signature: `_generateNonColinearPoints(n, maxAttempts = 120)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:979 (defined)`, `lib/graph.js:1049 (inside _generateConnectedPlanarIndexEdges)`

### _ccw
- Signature: `_ccw(a, b, c)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1030 (defined)`, `lib/graph.js:1035 (inside _segmentsIntersect)`

### _segmentsIntersect
- Signature: `_segmentsIntersect(p1, p2, p3, p4)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1034 (defined)`, `lib/graph.js:1041 (inside _wouldCrossAny)`

### _wouldCrossAny
- Signature: `_wouldCrossAny(a, b, indexEdges, pos)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1038 (defined)`, `lib/graph.js:1071 (inside _generateConnectedPlanarIndexEdges)`

### _generateConnectedPlanarIndexEdges
- Signature: `_generateConnectedPlanarIndexEdges(n, targetEdges)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1046 (defined)`, `lib/graph.js:1134 (inside generatePlanarGraph)`

### _makePlanarPuzzleGraph
- Signature: `_makePlanarPuzzleGraph(n)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:1084 (defined)`, `graph.js:1142 (inside _makeNonPlanarPuzzleGraph)`, `graph.js:1201 (inside generatePlanarGraphPuzzle)`, `graph.js:1328 (inside _makePlanarColoringGraph)`

### _injectK5
- Signature: `_injectK5(indexEdges, n)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1157 (defined)`, `lib/graph.js:1201 (inside generateNonPlanarGraph)`

### _injectK33
- Signature: `_injectK33(indexEdges, n)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1168 (defined)`, `lib/graph.js:1201 (inside generateNonPlanarGraph)`

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
- Usage: `lib/graph.js:1242 (defined)`, `lib/graph.js:1337 (inside validateGraphColoring)`, `lib/graph.js:1440 (inside validateGreedyColoring)`, `lib/graph.js:1558 (inside _makeBipartiteApplicationsGraph)`, `lib/graph.js:1569 (inside _makePlanarApplicationsGraph)`, `lib/graph.js:1602 (inside _makeK5ApplicationsGraph)`

### _dedupeIndexEdges
- Signature: `_dedupeIndexEdges(indexEdges)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1246 (defined)`, `lib/graph.js:1304 (inside chromaticNumber)`

### _buildAdjFromIndexEdges
- Signature: `_buildAdjFromIndexEdges(indexEdges, n)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1258 (defined)`, `lib/graph.js:1270 (inside _isColorableWithK)`

### _isColorableWithK
- Signature: `_isColorableWithK(indexEdges, n, k)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1268 (defined)`, `lib/graph.js:1309 (inside chromaticNumber)`

### dfs
- Signature: `dfs(pos)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:1280 (defined)`, `lib/graph.js:1292 (inside dfs)`, `lib/graph.js:1298 (inside _isColorableWithK)`

### chromaticNumber
- Signature: `chromaticNumber(graph, maxColors = 6)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:1301 (defined)`, `lib/graph.js:1623 (inside _generateSchedulingBaseGraph)`, `lib/graph.js:1847 (inside _generateInterferenceApplicationsPuzzle)`, `modes/coloring.js:140 (inside generateGraphColoringPuzzle)`

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
- Usage: `lib/graph.js:1333 (defined)`, `modes/coloring.js:256 (inside submit)`

### computeGreedyColoring
- Signature: `computeGreedyColoring(graph, vertexOrderIds, colorOrder)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:1384 (defined)`, `lib/graph.js:1451 (inside validateGreedyColoring)`

### validateGreedyColoring
- Signature: `validateGreedyColoring(graph, vertexOrderIds, userColorByVertexId, colorOrder)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:1438 (defined)`, `modes/coloring.js:249 (inside submit)`

### _pickUniqueNames
- Signature: `_pickUniqueNames(pool, count, fallbackPrefix)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1520 (defined)`, `lib/graph.js:1653 (inside _generateSchedulingApplicationsPuzzle)`, `lib/graph.js:1841 (inside _generateInterferenceApplicationsPuzzle)`

### _generateSchedulingApplicationsPuzzle
- Signature: `_generateSchedulingApplicationsPuzzle()`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1651 (defined)`, `lib/graph.js:1868 (inside _generateInterferenceApplicationsPuzzle)`, `lib/graph.js:1887 (inside generateApplicationsPuzzle)`

### takeMemberName
- Signature: `takeMemberName()`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:1659 (defined)`, `lib/graph.js:1667 (inside _generateSchedulingApplicationsPuzzle)`

### _distance
- Signature: `_distance(a, b)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1698 (defined)`, `lib/graph.js:1712 (inside _generateSeparatedPoints)`, `lib/graph.js:1724 (inside _pairwiseDistances)`

### _generateSeparatedPoints
- Signature: `_generateSeparatedPoints(n, minSep, maxTries = 4000)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1704 (defined)`, `lib/graph.js:1814 (inside _generateInterferenceApplicationsPuzzle)`

### _pairwiseDistances
- Signature: `_pairwiseDistances(points)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1719 (defined)`, `lib/graph.js:1817 (inside _generateInterferenceApplicationsPuzzle)`

### _mstBottleneckDistance
- Signature: `_mstBottleneckDistance(dist)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1732 (defined)`, `lib/graph.js:1828 (inside _generateInterferenceApplicationsPuzzle)`

### _buildInterferenceGraphFromDistance
- Signature: `_buildInterferenceGraphFromDistance(dist, threshold)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1772 (defined)`, `lib/graph.js:1838 (inside _generateInterferenceApplicationsPuzzle)`

### _generateInterferenceApplicationsPuzzle
- Signature: `_generateInterferenceApplicationsPuzzle()`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1811 (defined)`, `lib/graph.js:1888 (inside generateApplicationsPuzzle)`

### generateApplicationsPuzzle
- Signature: `generateApplicationsPuzzle()`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:1885 (defined)`, `modes/applications.js:79 (inside newPuzzle)`

### _sharedMembersForEdge
- Signature: `_sharedMembersForEdge(puzzle, sourceId, targetId)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:1891 (defined)`, `lib/graph.js:1920 (inside validateApplicationsAssignment)`

### validateApplicationsAssignment
- Signature: `validateApplicationsAssignment(puzzle, assignmentByVertexId)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:1902 (defined)`, `modes/applications.js:143 (inside submit)`

### countTriangles
- Signature: `countTriangles(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:1960 (defined)`, `lib/graph.js:2012 (inside graphInvariants)`, `lib/graph.js:2139 (inside _swapToChangeTriangles)`, `lib/graph.js:2255 (inside _neitherByReason)`

### componentCount
- Signature: `componentCount(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:1980 (defined)`, `lib/graph.js:2011 (inside graphInvariants)`, `lib/graph.js:2227 (inside _neitherByReason)`

### graphInvariants
- Signature: `graphInvariants(graph)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:2006 (defined)`, `lib/graph.js:2025 (inside checkNeitherReason)`, `lib/graph.js:2245 (inside _neitherByReason)`

### checkNeitherReason
- Signature: `checkNeitherReason(g1, g2, reason)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:2024 (defined)`, `modes/iso.js:104 (inside submitReason)`

### applyPermutation
- Signature: `applyPermutation(graph, sigma)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:2048 (defined)`, `lib/graph.js:2325 (inside generateIsoPuzzle)`

### verifyIsomorphismWitness
- Signature: `verifyIsomorphismWitness(g1, g2, nameMap)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:2064 (defined)`, `modes/iso.js:120 (inside submitMapping)`

### _isoBaseGraph
- Signature: `_isoBaseGraph(n)`
- Purpose: Generate a random connected undirected simple graph suitable for iso puzzles. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:2103 (defined)`, `lib/graph.js:2185 (inside _neitherByReason)`, `lib/graph.js:2309 (inside generateIsoPuzzle)`

### _randomSpanningTreePairs
- Signature: `_randomSpanningTreePairs(n)`
- Purpose: Random spanning tree returned as index pairs [[a,b], …]. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:2121 (defined)`, `lib/graph.js:2222 (inside _neitherByReason)`

### _swapToChangeTriangles
- Signature: `_swapToChangeTriangles(graph, maxSwaps = 80)`
- Purpose: Attempt up to maxSwaps random 2-opt degree-preserving swaps until the triangle count of the graph changes. Returns the modified graph, or null if no triangle-changing swap was found.
- Usage: `lib/graph.js:2138 (defined)`, `lib/graph.js:2235 (inside _neitherByReason)`

### _neitherByReason
- Signature: `_neitherByReason(reason, n, nMin, nMax)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:2179 (defined)`, `lib/graph.js:2341 (inside generateIsoPuzzle)`

### _graphsEqual
- Signature: `_graphsEqual(ga, gb)`
- Purpose: Return true when two undirected simple graphs have identical edge sets (same n and same set of sorted label pairs). It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `lib/graph.js:2274 (defined)`, `lib/graph.js:2326 (inside generateIsoPuzzle)`

### generateIsoPuzzle
- Signature: `generateIsoPuzzle()`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `lib/graph.js:2302 (defined)`, `modes/iso.js:55 (inside newQuestion)`

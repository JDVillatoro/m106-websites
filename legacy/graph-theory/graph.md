# graph.js Function Inventory

Generated on 2026-03-10 from graph.js.

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
- Purpose: Return the "vN" id for vertex index i. This is used in graph analysis and generation flows throughout the project.
- Usage: `applications-mode.js:107 (inside highlightApplicationsMissingSelections)`, `applications-mode.js:229 (inside renderApplicationsAssignments)`, `degree-mode.js:126 (inside startDegreeSequence)`, `graph-coloring-mode.js:172 (inside getGreedyVertexOrder)`, `graph-coloring-mode.js:218 (inside getIncompleteVertexIds)`, `graph-coloring-mode.js:245 (inside renderColoringAssignments)`, `graph-coloring-mode.js:290 (inside applyColoringSelectionToGraph)`, `graph-coloring-mode.js:419 (inside bindColoringControls)`, `graph.js:43 (defined)`, `graph.js:96 (inside vertexIds)`, `graph.js:505 (inside _toEdges)`, `graph.js:641 (inside generateEulerianMultigraph)`, `graph.js:689 (inside generateMSCDigraph)`, `graph.js:721 (inside _eulerizeDigraph)`, `graph.js:777 (inside generateEulerianDigraph)`, `graph.js:840 (inside generateRandomGraph)`, `graph.js:1333 (inside validateGraphColoring)`, `graph.js:1381 (inside computeGreedyColoring)`, `graph.js:1434 (inside validateGreedyColoring)`, `graph.js:1653 (inside _generateSchedulingApplicationsPuzzle)`, `graph.js:1809 (inside _generateInterferenceApplicationsPuzzle)`, `graph.js:1854 (inside validateApplicationsAssignment)`, `graph.js:1995 (inside applyPermutation)`, `graph.js:2110 (inside _swapToChangeTriangles)`, `graph.js:2168 (inside _neitherByReason)`, `make-mode.js:67 (inside generateAndRenderRandom)`, `make-mode.js:106 (top-level)`, `make-mode.js:137 (inside applyGraphAction)`, `make-mode.js:301 (inside createVertexInputs)`, `make-mode.js:324 (inside renameVertex)`, `make-mode.js:341 (inside renderEdgeList)`, `script.js:123 (inside draw_graph)`, `script.js:172 (inside drawGraphCircle)`

### vertexIndex
- Signature: `vertexIndex(id)`
- Purpose: Parse the index from a "vN" id string. This is used in graph analysis and generation flows throughout the project.
- Usage: `applications-mode.js:95 (inside highlightApplicationsConflictChoices)`, `eulerian-mode.js:30 (inside _puzzleComplexityOk)`, `graph-coloring-mode.js:227 (inside highlightIncompleteDropdowns)`, `graph.js:52 (defined)`, `graph.js:64 (inside vertexLabel)`, `graph.js:135 (inside getDegrees)`, `graph.js:174 (inside getDirectedDegrees)`, `graph.js:196 (inside buildAdjList)`, `graph.js:234 (inside reachableCount)`, `graph.js:276 (inside isStronglyConnected)`, `graph.js:364 (inside graphToDescription)`, `graph.js:623 (inside generateEulerianMultigraph)`, `graph.js:891 (inside minEulerizeEdges)`, `graph.js:1188 (inside generateNonPlanarGraph)`, `graph.js:1296 (inside chromaticNumber)`, `graph.js:1345 (inside validateGraphColoring)`, `graph.js:1388 (inside computeGreedyColoring)`, `graph.js:1454 (inside validateGreedyColoring)`, `graph.js:1645 (inside _generateSchedulingApplicationsPuzzle)`, `graph.js:1910 (inside countTriangles)`, `graph.js:1931 (inside componentCount)`, `graph.js:1995 (inside applyPermutation)`, `graph.js:2088 (inside _swapToChangeTriangles)`

### vertexLabel
- Signature: `vertexLabel(id, names)`
- Purpose: Resolve a vertex id to its display label given a names array. Falls back to the id itself when names is absent or the slot is empty.
- Usage: `eulerian-mode.js:191 (inside validateEulerianCircuitSimple)`, `eulerian-mode.js:230 (inside validateEulerianCircuitMulti)`, `eulerian-mode.js:251 (inside validateEulerianCircuitDigraph)`, `eulerian-mode.js:276 (inside validateEulerization)`, `graph.js:63 (defined)`, `graph.js:361 (inside graphToDescription)`, `graph.js:2023 (inside verifyIsomorphismWitness)`, `graph.js:2222 (inside _graphsEqual)`

### makeLabels
- Signature: `makeLabels(n)`
- Purpose: Generate default vertex labels. Uses alphabetic labels first (A..Z, AA..AZ, BA.., ...), then falls back to numeric labels only if n is very large.
- Usage: `graph.js:75 (defined)`, `graph.js:526 (inside generateSimpleGraph)`, `graph.js:575 (inside generateConnectedMultigraph)`, `graph.js:597 (inside generateEulerianSimpleGraph)`, `graph.js:646 (inside generateEulerianMultigraph)`, `graph.js:702 (inside generateMSCDigraph)`, `graph.js:804 (inside generateEulerianDigraph)`, `graph.js:862 (inside generateRandomGraph)`, `graph.js:1141 (inside generatePlanarGraph)`, `graph.js:1221 (inside generateNonPlanarGraph)`, `graph.js:2054 (inside _isoBaseGraph)`, `graph.js:2171 (inside _neitherByReason)`

### vertexIds
- Signature: `vertexIds(n)`
- Purpose: Build an array of all vertex ids for a graph of size n. This is used in graph analysis and generation flows throughout the project.
- Usage: `graph.js:95 (defined)`

### shuffle
- Signature: `shuffle(arr)`
- Purpose: In-place Fisher-Yates shuffle. Produces a uniformly random permutation of the input array.
- Usage: `eulerian-mode.js:76 (inside _makeNonEulerianDigraph)`, `eulerian-mode.js:104 (inside _makeNonEulerianSimple)`, `eulerian-mode.js:134 (inside _makeNonEulerianMulti)`, `graph-coloring-mode.js:53 (inside _makeBipartiteColoringPuzzleGraph)`, `graph-coloring-mode.js:100 (inside _makeK5ColoringPuzzleGraph)`, `graph.js:111 (defined)`, `graph.js:421 (inside _randomSpanningTree)`, `graph.js:442 (inside _minimalConnectedGraph)`, `graph.js:494 (inside _simpleGraph)`, `graph.js:551 (inside generateConnectedMultigraph)`, `graph.js:594 (inside generateEulerianSimpleGraph)`, `graph.js:625 (inside generateEulerianMultigraph)`, `graph.js:660 (inside backtrack)`, `graph.js:693 (inside generateMSCDigraph)`, `graph.js:726 (inside _eulerizeDigraph)`, `graph.js:834 (inside generateRandomGraph)`, `graph.js:1149 (inside _injectK5)`, `graph.js:1160 (inside _injectK33)`, `graph.js:1207 (inside generateNonPlanarGraph)`, `graph.js:1512 (inside _pickUniqueNames)`, `graph.js:1523 (inside _makeBipartiteApplicationsGraph)`, `graph.js:1568 (inside _makeK5ApplicationsGraph)`, `graph.js:1629 (inside _generateSchedulingApplicationsPuzzle)`, `graph.js:2067 (inside _randomSpanningTreePairs)`, `graph.js:2268 (inside generateIsoPuzzle)`, `iso-mode.js:58 (inside startIsoTrial)`, `planar-mode.js:112 (inside startPlanarTrial)`, `script.js:312 (inside setMode)`

### getDegrees
- Signature: `getDegrees(graph)`
- Purpose: Compute the degree of every vertex in an undirected graph. Self-loops contribute 2 to their vertex's degree (standard convention).
- Usage: `graph.js:130 (defined)`, `graph.js:150 (inside getOddVertices)`, `graph.js:160 (inside degreeSequence)`

### getOddVertices
- Signature: `getOddVertices(graph)`
- Purpose: Return the indices of vertices with odd degree. By the handshaking lemma this list always has even length.
- Usage: `eulerian-mode.js:107 (inside _makeNonEulerianSimple)`, `eulerian-mode.js:137 (inside _makeNonEulerianMulti)`, `eulerian-mode.js:172 (inside generateEulerianGraphPuzzle)`, `eulerian-mode.js:475 (inside startEulerianTrial)`, `eulerian-mode.js:553 (inside bindEulerianControls)`, `graph.js:149 (defined)`, `graph.js:594 (inside generateEulerianSimpleGraph)`, `graph.js:625 (inside generateEulerianMultigraph)`, `graph.js:884 (inside minEulerizeEdges)`

### degreeSequence
- Signature: `degreeSequence(graph)`
- Purpose: Return the degree sequence (sorted non-decreasing) for a graph of n vertices. This is used in graph analysis and generation flows throughout the project.
- Usage: `degree-mode.js:138 (inside startDegreeSequence)`, `graph.js:159 (defined)`, `graph.js:1955 (inside graphInvariants)`, `graph.js:2147 (inside _neitherByReason)`

### getDirectedDegrees
- Signature: `getDirectedDegrees(graph)`
- Purpose: Compute in-degree and out-degree for every vertex in a directed graph. This is used in graph analysis and generation flows throughout the project.
- Usage: `eulerian-mode.js:168 (inside generateEulerianGraphPuzzle)`, `graph.js:168 (defined)`, `graph.js:713 (inside _eulerizeDigraph)`, `graph.js:948 (inside getMismatchedVertices)`

### buildAdjList
- Signature: `buildAdjList(graph)`
- Purpose: Build an undirected adjacency list (as Sets of indices) for n vertices. Self-loops are ignored for connectivity purposes.
- Usage: `graph.js:191 (defined)`, `graph.js:229 (inside reachableCount)`

### reachableCount
- Signature: `reachableCount(graphOrAdj, startVertex = 0)`
- Purpose: Count vertices reachable from a start vertex using BFS. This is used in graph analysis and generation flows throughout the project.
- Usage: `graph.js:218 (defined)`, `graph.js:258 (inside isConnected)`

### isConnected
- Signature: `isConnected(graph, startVertex = 0)`
- Purpose: Test undirected connectivity for a graph of n vertices. This is used in graph analysis and generation flows throughout the project.
- Usage: `eulerian-mode.js:107 (inside _makeNonEulerianSimple)`, `eulerian-mode.js:137 (inside _makeNonEulerianMulti)`, `eulerian-mode.js:172 (inside generateEulerianGraphPuzzle)`, `graph.js:255 (defined)`

### isStronglyConnected
- Signature: `isStronglyConnected(graph)`
- Purpose: Test strong connectivity for a directed graph of n vertices. Uses two BFS passes (forward and reversed adjacency).
- Usage: `eulerian-mode.js:79 (inside _makeNonEulerianDigraph)`, `eulerian-mode.js:170 (inside generateEulerianGraphPuzzle)`, `graph.js:267 (defined)`, `graph.js:697 (inside generateMSCDigraph)`

### bfsCount
- Signature: `bfsCount(adj)`
- Purpose: BFS reachability count from vertex 0 over a directed adjacency list. Used by isStronglyConnected on both forward and reverse graphs.
- Usage: `graph.js:288 (defined)`, `graph.js:301 (inside isStronglyConnected)`

### isMultiGraph
- Signature: `isMultiGraph(graph)`
- Purpose: Test whether the edge list contains any parallel edges. For directed graphs, u→v and v→u are considered distinct.
- Usage: `graph.js:315 (defined)`

### graphToDescription
- Signature: `graphToDescription(graph)`
- Purpose: Convert a graph object to a plain-English description suitable for screen readers and alt-text output. This is used in graph analysis and generation flows throughout the project.
- Usage: `graph.js:340 (defined)`, `make-mode.js:216 (top-level)`, `make-mode.js:237 (inside refreshAltTextPanel)`, `script.js:210 (inside updateGraphAria)`

### graphToCSV
- Signature: `graphToCSV(graph)`
- Purpose: Serialize a graph's edge list to CSV. This is used in graph analysis and generation flows throughout the project.
- Usage: `graph.js:398 (defined)`

### _randomSpanningTree
- Signature: `_randomSpanningTree(n)`
- Purpose: Generate a random spanning tree on n vertices (as index pairs). Implementation: shuffle vertices and connect consecutive vertices in that random order (a random Hamiltonian path).
- Usage: `graph.js:420 (defined)`

### _minimalConnectedGraph
- Signature: `_minimalConnectedGraph(n)`
- Purpose: Generate a minimal connected simple graph on n vertices. Starts from K_n and greedily removes edges while maintaining connectivity.
- Usage: `graph.js:436 (defined)`, `graph.js:486 (inside _simpleGraph)`

### _indexEdgesConnected
- Signature: `_indexEdgesConnected(indexEdges, n)`
- Purpose: Connectivity check on index-pair edges. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:447 (inside _minimalConnectedGraph)`, `graph.js:453 (defined)`, `graph.js:1131 (inside generatePlanarGraph)`, `graph.js:1213 (inside generateNonPlanarGraph)`

### _simpleGraph
- Signature: `_simpleGraph(n, targetEdges)`
- Purpose: Generate a random connected simple graph with approximately targetEdges edges. Strategy: 1) Build a minimal connected simple graph (spanning tree backbone).
- Usage: `graph.js:476 (defined)`, `graph.js:529 (inside generateSimpleGraph)`, `graph.js:555 (inside generateConnectedMultigraph)`, `graph.js:592 (inside generateEulerianSimpleGraph)`, `graph.js:2057 (inside _isoBaseGraph)`

### _toEdges
- Signature: `_toEdges(indexEdges, extraProps = {})`
- Purpose: Convert index-pair edges to "vN" edge objects. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph-coloring-mode.js:82 (inside _makeBipartiteColoringPuzzleGraph)`, `graph-coloring-mode.js:128 (inside _makeK5ColoringPuzzleGraph)`, `graph.js:503 (defined)`, `graph.js:529 (inside generateSimpleGraph)`, `graph.js:578 (inside generateConnectedMultigraph)`, `graph.js:594 (inside generateEulerianSimpleGraph)`, `graph.js:1144 (inside generatePlanarGraph)`, `graph.js:1224 (inside generateNonPlanarGraph)`, `graph.js:1552 (inside _makeBipartiteApplicationsGraph)`, `graph.js:1596 (inside _makeK5ApplicationsGraph)`, `graph.js:1753 (inside _buildInterferenceGraphFromDistance)`, `graph.js:2057 (inside _isoBaseGraph)`

### generateSimpleGraph
- Signature: `generateSimpleGraph(n, targetEdges)`
- Purpose: Generate a random simple undirected graph. This is used in graph analysis and generation flows throughout the project.
- Usage: `ADDING_MODES.md:222 (inside startFizzyTrial)`, `degree-mode.js:117 (inside startDegreeSequence)`, `graph.js:523 (defined)`, `graph.js:612 (inside generateEulerianSimpleGraph)`, `make-mode.js:43 (inside generateAndRenderRandom)`

### generateConnectedMultigraph
- Signature: `generateConnectedMultigraph(n, targetEdges, options = {})`
- Purpose: Generate a random connected multigraph (may include parallel edges and loops). This is used in graph analysis and generation flows throughout the project.
- Usage: `graph.js:540 (defined)`, `graph.js:622 (inside generateEulerianMultigraph)`

---

### generateEulerianSimpleGraph
- Signature: `generateEulerianSimpleGraph(n, targetEdges, maxRerolls = 30)`
- Purpose: Generate a random Eulerian simple graph (all vertices even-degree). Rerolls up to maxRerolls times if simple pairing is impossible.
- Usage: `eulerian-mode.js:90 (inside _makeEulerianSimple)`, `eulerian-mode.js:99 (inside _makeNonEulerianSimple)`, `graph.js:590 (defined)`, `make-mode.js:45 (inside generateAndRenderRandom)`

### generateEulerianMultigraph
- Signature: `generateEulerianMultigraph(n, targetEdges)`
- Purpose: Generate a random Eulerian multigraph (no loops). This is used in graph analysis and generation flows throughout the project.
- Usage: `eulerian-mode.js:120 (inside _makeEulerianMulti)`, `eulerian-mode.js:129 (inside _makeNonEulerianMulti)`, `graph.js:621 (defined)`, `make-mode.js:47 (inside generateAndRenderRandom)`

### _findSimplePairing
- Signature: `_findSimplePairing(odds, edgeSet)`
- Purpose: Pairing helper used by Eulerian simple graph generator. Finds a perfect matching on `odds` using only edges absent from edgeSet.
- Usage: `graph.js:601 (inside generateEulerianSimpleGraph)`, `graph.js:656 (defined)`

### backtrack
- Signature: `backtrack(remaining)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:657 (defined)`, `graph.js:664 (inside backtrack)`, `graph.js:670 (inside _findSimplePairing)`

### generateMSCDigraph
- Signature: `generateMSCDigraph(n)`
- Purpose: Generate a minimal strongly-connected directed graph on n vertices. Starts from the complete digraph and removes edges while preserving strong connectivity.
- Usage: `graph.js:685 (defined)`, `graph.js:766 (inside generateEulerianDigraph)`, `make-mode.js:39 (inside generateAndRenderRandom)`

### _eulerizeDigraph
- Signature: `_eulerizeDigraph(edges, n)`
- Purpose: Balance a directed graph so every vertex has in-degree == out-degree. Mutates and returns the edges array.
- Usage: `graph.js:712 (defined)`, `graph.js:807 (inside generateEulerianDigraph)`

### generateEulerianDigraph
- Signature: `generateEulerianDigraph(n, targetEdges)`
- Purpose: Generate a random Eulerian directed graph (in-deg == out-deg everywhere). This is used in graph analysis and generation flows throughout the project.
- Usage: `eulerian-mode.js:65 (inside _makeEulerianDigraph)`, `eulerian-mode.js:74 (inside _makeNonEulerianDigraph)`, `graph.js:758 (defined)`, `make-mode.js:41 (inside generateAndRenderRandom)`

### generateRandomGraph
- Signature: `generateRandomGraph(n, numComponents = 1)`
- Purpose: Generate a random undirected or directed graph (for the graph editor/make mode). The graph type (directed, weighted) is chosen randomly.
- Usage: `graph.js:818 (defined)`, `make-mode.js:49 (inside generateAndRenderRandom)`

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
- Purpose: Minimum number of edges needed to Eulerize a connected undirected graph, where added edges must duplicate existing edges (Chinese Postman approach). Algorithm: 1.
- Usage: `eulerian-mode.js:615 (inside bindEulerianControls)`, `graph.js:883 (defined)`

### bfsDist
- Signature: `bfsDist(start)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `graph.js:896 (defined)`, `graph.js:911 (inside minEulerizeEdges)`

### getMismatchedVertices
- Signature: `getMismatchedVertices(graph)`
- Purpose: Return the display-names of vertices where in-degree ≠ out-degree. These are the vertices "responsible" for a directed graph not being Eulerian.
- Usage: `eulerian-mode.js:701 (inside bindEulerianControls)`, `graph.js:947 (defined)`

### _randInt
- Signature: `_randInt(min, max)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `applications-mode.js:120 (inside applicationsOrgName)`, `graph-coloring-mode.js:52 (inside _makeBipartiteColoringPuzzleGraph)`, `graph-coloring-mode.js:119 (inside _makeK5ColoringPuzzleGraph)`, `graph-coloring-mode.js:135 (inside generateGraphColoringPuzzle)`, `graph.js:957 (defined)`, `graph.js:1043 (inside _generateConnectedPlanarIndexEdges)`, `graph.js:1135 (inside generatePlanarGraph)`, `graph.js:1206 (inside generateNonPlanarGraph)`, `graph.js:1522 (inside _makeBipartiteApplicationsGraph)`, `graph.js:1587 (inside _makeK5ApplicationsGraph)`, `graph.js:1602 (inside _generateSchedulingBaseGraph)`, `graph.js:1758 (inside _generateInterferenceApplicationsPuzzle)`

### _edgeKey
- Signature: `_edgeKey(a, b)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph-coloring-mode.js:60 (inside _makeBipartiteColoringPuzzleGraph)`, `graph-coloring-mode.js:107 (inside _makeK5ColoringPuzzleGraph)`, `graph.js:961 (defined)`, `graph.js:1050 (inside _generateConnectedPlanarIndexEdges)`, `graph.js:1194 (inside generateNonPlanarGraph)`, `graph.js:1241 (inside _dedupeIndexEdges)`, `graph.js:1530 (inside _makeBipartiteApplicationsGraph)`, `graph.js:1575 (inside _makeK5ApplicationsGraph)`

### _isColinear
- Signature: `_isColinear(a, b, c, eps = 1e-6)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:965 (defined)`, `graph.js:997 (inside _generateNonColinearPoints)`

### _generateNonColinearPoints
- Signature: `_generateNonColinearPoints(n, maxAttempts = 120)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:970 (defined)`, `graph.js:1040 (inside _generateConnectedPlanarIndexEdges)`

### _ccw
- Signature: `_ccw(a, b, c)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:1021 (defined)`, `graph.js:1026 (inside _segmentsIntersect)`

### _segmentsIntersect
- Signature: `_segmentsIntersect(p1, p2, p3, p4)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:1025 (defined)`, `graph.js:1032 (inside _wouldCrossAny)`

### _wouldCrossAny
- Signature: `_wouldCrossAny(a, b, indexEdges, pos)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:1029 (defined)`, `graph.js:1062 (inside _generateConnectedPlanarIndexEdges)`

### _generateConnectedPlanarIndexEdges
- Signature: `_generateConnectedPlanarIndexEdges(n, targetEdges)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:1037 (defined)`, `graph.js:1125 (inside generatePlanarGraph)`

### _makePlanarPuzzleGraph
- Signature: `_makePlanarPuzzleGraph(n)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:1084 (defined)`, `graph.js:1142 (inside _makeNonPlanarPuzzleGraph)`, `graph.js:1201 (inside generatePlanarGraphPuzzle)`, `graph.js:1328 (inside _makePlanarColoringGraph)`

### _injectK5
- Signature: `_injectK5(indexEdges, n)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:1148 (defined)`, `graph.js:1192 (inside generateNonPlanarGraph)`

### _injectK33
- Signature: `_injectK33(indexEdges, n)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:1159 (defined)`, `graph.js:1192 (inside generateNonPlanarGraph)`

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
- Usage: `graph.js:1233 (defined)`, `graph.js:1328 (inside validateGraphColoring)`, `graph.js:1431 (inside validateGreedyColoring)`, `graph.js:1549 (inside _makeBipartiteApplicationsGraph)`, `graph.js:1560 (inside _makePlanarApplicationsGraph)`, `graph.js:1593 (inside _makeK5ApplicationsGraph)`

### _dedupeIndexEdges
- Signature: `_dedupeIndexEdges(indexEdges)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:1237 (defined)`, `graph.js:1295 (inside chromaticNumber)`

### _buildAdjFromIndexEdges
- Signature: `_buildAdjFromIndexEdges(indexEdges, n)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:1249 (defined)`, `graph.js:1261 (inside _isColorableWithK)`

### _isColorableWithK
- Signature: `_isColorableWithK(indexEdges, n, k)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:1259 (defined)`, `graph.js:1300 (inside chromaticNumber)`

### dfs
- Signature: `dfs(pos)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `graph.js:1271 (defined)`, `graph.js:1283 (inside dfs)`, `graph.js:1289 (inside _isColorableWithK)`

### chromaticNumber
- Signature: `chromaticNumber(graph, maxColors = 6)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `graph-coloring-mode.js:147 (inside generateGraphColoringPuzzle)`, `graph.js:1292 (defined)`, `graph.js:1614 (inside _generateSchedulingBaseGraph)`, `graph.js:1792 (inside _generateInterferenceApplicationsPuzzle)`

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
- Purpose: Validate a full vertex coloring for an undirected graph. ok: boolean, reason?: 'incomplete'|'conflict', v1?: string, v2?: string, color?: string, usedColors?: number, isMinimal?: boolean, }}
- Usage: `graph-coloring-mode.js:424 (inside bindColoringControls)`, `graph.js:1324 (defined)`

### computeGreedyColoring
- Signature: `computeGreedyColoring(graph, vertexOrderIds, colorOrder)`
- Purpose: Compute the deterministic greedy-color assignment for a given vertex order. For each vertex in order, assign the first available color not used by already-colored neighbors.
- Usage: `graph.js:1375 (defined)`, `graph.js:1442 (inside validateGreedyColoring)`

### validateGreedyColoring
- Signature: `validateGreedyColoring(graph, vertexOrderIds, userColorByVertexId, colorOrder)`
- Purpose: Validate a user coloring against the greedy-coloring algorithm, reporting the first vertex (in the specified order) where the color differs from the required greedy choice. ok: boolean, reason?: 'incomplete'|'incorrect', vertexId?: string, vertexLabel?: string, expected?: string, got?: string, }}
- Usage: `graph-coloring-mode.js:415 (inside bindColoringControls)`, `graph.js:1429 (defined)`

### _pickUniqueNames
- Signature: `_pickUniqueNames(pool, count, fallbackPrefix)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:1511 (defined)`, `graph.js:1626 (inside _generateSchedulingApplicationsPuzzle)`, `graph.js:1786 (inside _generateInterferenceApplicationsPuzzle)`

### _generateSchedulingApplicationsPuzzle
- Signature: `_generateSchedulingApplicationsPuzzle()`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:1624 (defined)`, `graph.js:1813 (inside _generateInterferenceApplicationsPuzzle)`, `graph.js:1832 (inside generateApplicationsPuzzle)`

### takeMemberName
- Signature: `takeMemberName()`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `graph.js:1632 (defined)`, `graph.js:1640 (inside _generateSchedulingApplicationsPuzzle)`

### _distance
- Signature: `_distance(a, b)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:1671 (defined)`, `graph.js:1685 (inside _generateSeparatedPoints)`, `graph.js:1697 (inside _pairwiseDistances)`

### _generateSeparatedPoints
- Signature: `_generateSeparatedPoints(n, minSep, maxTries = 4000)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:1677 (defined)`, `graph.js:1759 (inside _generateInterferenceApplicationsPuzzle)`

### _pairwiseDistances
- Signature: `_pairwiseDistances(points)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:1692 (defined)`, `graph.js:1762 (inside _generateInterferenceApplicationsPuzzle)`

### _mstBottleneckDistance
- Signature: `_mstBottleneckDistance(dist)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:1705 (defined)`, `graph.js:1773 (inside _generateInterferenceApplicationsPuzzle)`

### _buildInterferenceGraphFromDistance
- Signature: `_buildInterferenceGraphFromDistance(dist, threshold)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:1745 (defined)`, `graph.js:1783 (inside _generateInterferenceApplicationsPuzzle)`

### _generateInterferenceApplicationsPuzzle
- Signature: `_generateInterferenceApplicationsPuzzle()`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:1756 (defined)`, `graph.js:1833 (inside generateApplicationsPuzzle)`

### generateApplicationsPuzzle
- Signature: `generateApplicationsPuzzle()`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `applications-mode.js:322 (inside startApplicationsTrial)`, `graph.js:1830 (defined)`

### _sharedMembersForEdge
- Signature: `_sharedMembersForEdge(puzzle, sourceId, targetId)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:1836 (defined)`, `graph.js:1865 (inside validateApplicationsAssignment)`

### validateApplicationsAssignment
- Signature: `validateApplicationsAssignment(puzzle, assignmentByVertexId)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. This is used in graph analysis and generation flows throughout the project.
- Usage: `applications-mode.js:390 (inside bindApplicationsControls)`, `graph.js:1847 (defined)`

### countTriangles
- Signature: `countTriangles(graph)`
- Purpose: Count undirected triangles (unordered triples of mutually adjacent vertices). This is used in graph analysis and generation flows throughout the project.
- Usage: `graph.js:1905 (defined)`, `graph.js:1957 (inside graphInvariants)`, `graph.js:2084 (inside _swapToChangeTriangles)`, `graph.js:2200 (inside _neitherByReason)`

### componentCount
- Signature: `componentCount(graph)`
- Purpose: Count connected components (undirected BFS over all vertices). This is used in graph analysis and generation flows throughout the project.
- Usage: `graph.js:1925 (defined)`, `graph.js:1956 (inside graphInvariants)`, `graph.js:2172 (inside _neitherByReason)`

### graphInvariants
- Signature: `graphInvariants(graph)`
- Purpose: Collect the five quick structural invariants used to discriminate isomorphism. This is used in graph analysis and generation flows throughout the project.
- Usage: `graph.js:1951 (defined)`, `graph.js:1970 (inside checkNeitherReason)`, `graph.js:2190 (inside _neitherByReason)`

### checkNeitherReason
- Signature: `checkNeitherReason(g1, g2, reason)`
- Purpose: Check whether a user-supplied reason for non-isomorphism is actually true for the given pair of graphs. This is used in graph analysis and generation flows throughout the project.
- Usage: `graph.js:1969 (defined)`, `iso-mode.js:271 (inside bindIsoControls)`

### applyPermutation
- Signature: `applyPermutation(graph, sigma)`
- Purpose: Return a new graph with the same names but edges re-wired by permutation sigma. sigma[i] = j means vertex index i in g1 maps to vertex index j in g2.
- Usage: `graph.js:1993 (defined)`, `graph.js:2270 (inside generateIsoPuzzle)`

### verifyIsomorphismWitness
- Signature: `verifyIsomorphismWitness(g1, g2, nameMap)`
- Purpose: Verify a student-supplied isomorphism witness for two undirected simple graphs. This is used in graph analysis and generation flows throughout the project.
- Usage: `graph.js:2009 (defined)`, `iso-mode.js:348 (inside bindIsoControls)`

### _isoBaseGraph
- Signature: `_isoBaseGraph(n)`
- Purpose: Generate a random connected undirected simple graph suitable for iso puzzles. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:2048 (defined)`, `graph.js:2130 (inside _neitherByReason)`, `graph.js:2254 (inside generateIsoPuzzle)`

### _randomSpanningTreePairs
- Signature: `_randomSpanningTreePairs(n)`
- Purpose: Random spanning tree returned as index pairs [[a,b], …]. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:2066 (defined)`, `graph.js:2167 (inside _neitherByReason)`

### _swapToChangeTriangles
- Signature: `_swapToChangeTriangles(graph, maxSwaps = 80)`
- Purpose: Attempt up to maxSwaps random 2-opt degree-preserving swaps until the triangle count of the graph changes. Returns the modified graph, or null if no triangle-changing swap was found.
- Usage: `graph.js:2083 (defined)`, `graph.js:2180 (inside _neitherByReason)`

### _neitherByReason
- Signature: `_neitherByReason(reason, n, nMin, nMax)`
- Purpose: Local helper / implementation function used by nearby graph algorithms. It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:2124 (defined)`, `graph.js:2286 (inside generateIsoPuzzle)`

### _graphsEqual
- Signature: `_graphsEqual(ga, gb)`
- Purpose: Return true when two undirected simple graphs have identical edge sets (same n and same set of sorted label pairs). It is primarily an internal helper rather than a user-facing API entry point.
- Usage: `graph.js:2219 (defined)`, `graph.js:2271 (inside generateIsoPuzzle)`

### generateIsoPuzzle
- Signature: `generateIsoPuzzle()`
- Purpose: Generate a random isomorphism puzzle consisting of two undirected simple graphs. Returns an object extended with: scenario 'equal' | 'isomorphic' | 'neither' witness { [g1Label]: g2Label } (only for 'isomorphic') reason string (only for 'neither')
- Usage: `graph.js:2247 (defined)`, `iso-mode.js:52 (inside startIsoTrial)`

// Hamiltonian Graphs: is the graph Hamiltonian? If it is, find a Hamiltonian
// cycle (freely, by nearest neighbor, or by sorted edges); if not, say why.
// Ported from legacy/graph-theory/hamiltonian-mode.js; spec in hamiltonian.md.
// Puzzle generation and checking (from _simulateNN to
// validateHamiltonianCycleSE) were moved here unchanged from lib/graph.js,
// except that they use the local helpers below instead of graph.js's private
// ones. Cut vertices, leaves and bipartite parts are graph math and stay there.

import {
  shuffle, makeLabels, vertexId, vertexIndex, vertexLabel, generateSimpleGraph,
  cutVertices, leafVertices, bipartiteParts,
} from '../lib/graph.js';
import { createGraphView } from '../lib/render.js';
import {
  escapeHtml, feedbackHtml, showFeedback, hideFeedback, lockChoices, resetChoices,
} from '../../shared/js/ui.js';

const toEdges = indexEdges => indexEdges.map(({ s, t }) => ({ source: vertexId(s), target: vertexId(t), label: null }));
/** A random connected simple graph on n vertices, as index pairs ({ s: 0, t: 2 }). */
const simpleIndexEdges = n => generateSimpleGraph(n).edges.map(e => ({ s: vertexIndex(e.source), t: vertexIndex(e.target) }));

const strong = text => `<strong>${escapeHtml(text)}</strong>`;

const COPY = {
  info: 'Can you tell if this graph is Hamiltonian? If so, find a Hamiltonian cycle!',
  promptTitle: 'Here is a graph...',
  promptSubtitle: "Can you tell if it's a Hamiltonian graph?",
  hint: 'Hint: try clicking and dragging the vertices to get a better look.',
  part1Title: 'Part 1 — Is this graph Hamiltonian?',
  yes: 'Hamiltonian',
  no: 'Not Hamiltonian',
  part1Wrong: isHamiltonian => `Actually, this graph is ${isHamiltonian ? '' : 'not '}Hamiltonian.`,

  cycleLead: "That's right, the graph is Hamiltonian!",
  instructions: {
    freeform: () => 'Specify a Hamiltonian cycle by listing the vertices in order (e.g. <em>A B C D</em> or <em>ABCDA</em>).',
    nearest_neighbor: start => `Find a Hamiltonian cycle using the nearest neighbor strategy. Start at vertex ${strong(start)} and use the displayed weights to determine the nearest neighbor at each step.`,
    sorted_edge: () => 'Find a Hamiltonian cycle using the sorted edge strategy. Use the displayed weights to determine the order in which to consider the edges.',
  },
  cycleLabel: 'Hamiltonian cycle',
  cyclePlaceholder: 'e.g. A B C D or ABCDA',
  cycleEmpty: 'Type the cycle first.',
  cycleCorrect: {
    freeform: 'That is a valid Hamiltonian cycle.',
    nearest_neighbor: "That's the cycle the nearest neighbor strategy finds.",
    sorted_edge: "That's the cycle the sorted edge strategy finds.",
  },
  cycleWrong: result => {
    switch (result.reason) {
      case 'not_a_valid_path': return "That's not a valid path.";
      case 'missing_vertex': return `It doesn't visit vertex ${strong(result.detail)}.`;
      case 'repeated_vertex': return `It visits vertex ${strong(result.detail)} more than once.`;
      case 'no_edge': return `There is no edge between ${strong(result.detail)}.`;
      case 'wrong_start': return `It doesn't start at the correct vertex (${strong(result.detail)}).`;
      case 'incomplete_cycle': return "You didn't complete the cycle.";
      case 'wrong_nn_step': return `Incorrect step: <em>${escapeHtml(result.detail)}</em>.`;
      case 'cant_close_cycle': return 'The last vertex cannot connect back to the start.';
      case 'wrong_edge_missing': return `The sorted edge strategy should have included edge ${strong(result.detail)}.`;
      case 'wrong_edge_extra': return `The sorted edge strategy does not include edge ${strong(result.detail)}.`;
      default: return "That's not the right Hamiltonian cycle.";
    }
  },
  retry: 'Let me try again',
  next: 'Next question',

  whyLead: "That's right, the graph is not Hamiltonian!",
  whyTitle: 'Part 2 — Can you tell why?',
  reasons: {
    leaf: 'It contains a leaf',
    cut_vertex: 'It contains a cut vertex',
    bipartite_unequal: 'It is bipartite with non-equal partition sizes',
  },
  reasonExplained: {
    leaf: 'A Hamiltonian cycle requires every vertex to have degree ≥ 2, but this graph has a leaf (a vertex of degree 1).',
    cut_vertex: 'A Hamiltonian cycle cannot pass through a cut vertex in a way that traverses all components.',
    bipartite_unequal: 'A Hamiltonian cycle in a bipartite graph must alternate between the two parts, so the parts must be equal in size.',
  },
  alsoLeaf: ' This graph also has a leaf (a vertex of degree 1).',
  reasonWrong: reasons => `The graph is not Hamiltonian because: ${reasons.map(r => COPY.reasons[r].replace(/^It/, 'it')).join(', ')}.`,
  submit: 'Submit',
};

const VALIDATORS = {
  freeform: validateHamiltonianCycleFreeform,
  nearest_neighbor: validateHamiltonianCycleNN,
  sorted_edge: validateHamiltonianCycleSE,
};

// ---- Puzzle generation and checking ---------------------------------------

// ---------------------------------------------------------------------------
// Simulation helpers (index-based)
// ---------------------------------------------------------------------------

/**
 * Simulate the Nearest Neighbor algorithm on an undirected weighted graph.
 * @param {Array<{s:number,t:number}>} indexEdges
 * @param {number[]} weights  parallel to indexEdges
 * @param {number} startIdx
 * @param {number} n
 * @returns {number[]|null}  tour of length n, or null if stuck
 */
function _simulateNN(indexEdges, weights, startIdx, n) {
    const visited = new Array(n).fill(false);
    let current = startIdx;
    visited[current] = true;
    const tour = [current];
    for (let step = 0; step < n - 1; step++) {
        let bestNeighbor = -1;
        let bestWeight = Infinity;
        for (let i = 0; i < indexEdges.length; i++) {
            const { s, t } = indexEdges[i];
            const w = weights[i];
            let neighbor = -1;
            if (s === current && !visited[t]) neighbor = t;
            else if (t === current && !visited[s]) neighbor = s;
            if (neighbor === -1) continue;
            if (w < bestWeight || (w === bestWeight && neighbor < bestNeighbor)) {
                bestWeight = w;
                bestNeighbor = neighbor;
            }
        }
        if (bestNeighbor === -1) return null;
        visited[bestNeighbor] = true;
        tour.push(bestNeighbor);
        current = bestNeighbor;
    }
    return tour;
}

/**
 * Simulate the Sorted Edge algorithm on an undirected weighted graph.
 * Returns selected {s,t} pairs forming the Hamiltonian cycle, or null if failed.
 * @param {Array<{s:number,t:number}>} indexEdges
 * @param {number[]} weights
 * @param {number} n
 * @returns {Array<{s:number,t:number}>|null}
 */
function _simulateSE(indexEdges, weights, n) {
    const sorted = indexEdges.map((e, i) => ({ s: e.s, t: e.t, w: weights[i], i }))
        .sort((a, b) => a.w - b.w || a.i - b.i);
    const degree = new Array(n).fill(0);
    // Union-Find for cycle detection
    const parent = Array.from({ length: n }, (_, i) => i);
    function find(x) { return parent[x] === x ? x : (parent[x] = find(parent[x])); }
    const selected = [];
    for (const { s, t } of sorted) {
        if (degree[s] >= 2 || degree[t] >= 2) continue;
        if (find(s) === find(t) && selected.length < n - 1) continue;
        selected.push({ s, t });
        degree[s]++;
        degree[t]++;
        const fs = find(s), ft = find(t);
        if (fs !== ft) parent[fs] = ft;
        if (selected.length === n) break;
    }
    if (selected.length < n) return null;
    return selected;
}

/**
 * Extract a Hamiltonian cycle as an ordered vertex array from a set of cycle edges.
 * @param {Array<{s:number,t:number}>} cycleEdges  exactly n edges forming one cycle
 * @param {number} n
 * @param {number} [startVertex=0]
 * @returns {number[]|null}  ordered vertices (length n), or null if not a cycle
 */
function _extractCycleOrder(cycleEdges, n, startVertex = 0) {
    const adj = Array.from({ length: n }, () => []);
    for (const { s, t } of cycleEdges) { adj[s].push(t); adj[t].push(s); }
    const visited = new Array(n).fill(false);
    const tour = [startVertex];
    visited[startVertex] = true;
    let current = startVertex;
    for (let step = 0; step < n - 1; step++) {
        const next = adj[current].find(v => !visited[v]);
        if (next === undefined) return null;
        visited[next] = true;
        tour.push(next);
        current = next;
    }
    // Verify closes back to start
    if (!adj[current].includes(startVertex)) return null;
    return tour;
}

// ---------------------------------------------------------------------------
// Non-Hamiltonian graph generators
// ---------------------------------------------------------------------------

/**
 * Generate a graph that has a cut vertex by joining two sub-graphs at one vertex.
 * @param {number} n  total vertices, must be ≥ 4
 * @returns {Array<{s:number,t:number}>}  index-pair edges
 */
function _hamMakeCutVertex(n) {
    // Split n vertices: G1 on [0..k], G2 on [k..n-1], shared vertex = k
    const k = Math.max(1, Math.min(n - 2, Math.floor(Math.random() * (n - 2)) + 1));
    const g1Size = k + 1;    // vertices 0..k
    const g2Size = n - k;    // vertices k..n-1
    const edges = [];
    for (const e of simpleIndexEdges(g1Size)) edges.push({ s: e.s, t: e.t });
    for (const e of simpleIndexEdges(g2Size)) edges.push({ s: e.s + k, t: e.t + k });
    return edges;
}

/**
 * Generate a graph with at least one leaf vertex.
 * @param {number} n  total vertices, must be ≥ 3
 * @returns {Array<{s:number,t:number}>}  index-pair edges
 */
function _hamMakeLeaf(n) {
    // Generate connected base on n-1 vertices, then attach a leaf at n-1
    const base = simpleIndexEdges(n - 1);
    const target = Math.floor(Math.random() * (n - 1));
    return [...base, { s: n - 1, t: target }];
}

/**
 * Generate a bipartite graph with unequal partition sizes (connected).
 * @param {number} n  total vertices, must be ≥ 3
 * @returns {Array<{s:number,t:number}>}  index-pair edges
 */
function _hamMakeBipartiteUnequal(n) {
    // Ensure unequal parts: p1 < p2
    const maxP1 = Math.floor((n - 1) / 2);
    const p1 = Math.max(1, Math.floor(Math.random() * maxP1) + 1);
    const p2 = n - p1;

    const part1 = shuffle(Array.from({ length: p1 }, (_, i) => i));
    const part2 = shuffle(Array.from({ length: p2 }, (_, i) => p1 + i));

    const edges = [];
    const edgeSet = new Set();
    const addEdge = (u, v) => {
        const key = `${Math.min(u, v)}-${Math.max(u, v)}`;
        if (!edgeSet.has(key)) { edgeSet.add(key); edges.push({ s: u, t: v }); }
    };

    // Spanning tree: connect each part1 vertex to a random part2 vertex and vice versa
    addEdge(part1[0], part2[0]);
    for (let i = 1; i < p1; i++) addEdge(part1[i], part2[Math.floor(Math.random() * p2)]);
    for (let i = 1; i < p2; i++) addEdge(part2[i], part1[Math.floor(Math.random() * p1)]);

    // Add extra bipartite edges for density
    const target = Math.min(p1 * p2, Math.floor(n * 1.4) + 1);
    const candidates = [];
    for (const u of part1) for (const v of part2) {
        const key = `${Math.min(u, v)}-${Math.max(u, v)}`;
        if (!edgeSet.has(key)) candidates.push({ s: u, t: v });
    }
    shuffle(candidates);
    for (const { s, t } of candidates) {
        if (edges.length >= target) break;
        addEdge(s, t);
    }
    return edges;
}

// ---------------------------------------------------------------------------
// Hamiltonian graph generators
// ---------------------------------------------------------------------------

const _HAM_EDGE_CAP_LO = 0.4;   // fraction of max edges (lower bound for target)
const _HAM_EDGE_CAP_HI = 0.75;  // fraction of max edges (upper bound for target)

/**
 * Generate a Hamiltonian graph solvable by the Nearest Neighbor strategy.
 * Returns extended graph object with hamiltonianCycle and startVertex.
 * @param {number} n
 * @returns {object|null}
 */
function _makeHamiltonianNN(n) {
    const maxEdges = (n * (n - 1)) / 2;
    const edgeCap = Math.floor(_HAM_EDGE_CAP_LO * maxEdges) +
        Math.floor(Math.random() * (_HAM_EDGE_CAP_HI - _HAM_EDGE_CAP_LO) * maxEdges) + 1;

    for (let attempt = 0; attempt < 30; attempt++) {
        const perm = shuffle(Array.from({ length: n }, (_, i) => i));
        const startIdx = perm[0];
        const targetTour = perm;

        // Cycle edges in NN visitation order, closing edge last
        const cycleEdges = perm.map((v, i) => ({ s: v, t: perm[(i + 1) % n] }));
        // Initial ordering: NN steps in order 0..n-2, then closing edge
        let ordering = cycleEdges.slice();

        // Collect all possible non-cycle edges
        const edgeSet = new Set(cycleEdges.map(({ s, t }) => `${Math.min(s, t)}-${Math.max(s, t)}`));
        const candidates = [];
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
            if (!edgeSet.has(`${i}-${j}`)) candidates.push({ s: i, t: j });
        }
        shuffle(candidates);

        for (const cand of candidates) {
            if (ordering.length >= edgeCap) break;
            const validPos = [];
            for (let pos = 0; pos <= ordering.length; pos++) {
                const testOrd = [...ordering.slice(0, pos), cand, ...ordering.slice(pos)];
                const wts = testOrd.map((_, k) => k + 1);
                const tour = _simulateNN(testOrd, wts, startIdx, n);
                if (tour && tour.every((v, k) => v === targetTour[k])) validPos.push(pos);
            }
            if (validPos.length > 0) {
                const pos = validPos[Math.floor(Math.random() * validPos.length)];
                ordering.splice(pos, 0, cand);
                edgeSet.add(`${Math.min(cand.s, cand.t)}-${Math.max(cand.s, cand.t)}`);
            }
        }

        // Final verification
        const weights = ordering.map((_, k) => k + 1);
        const tour = _simulateNN(ordering, weights, startIdx, n);
        if (!tour || !tour.every((v, k) => v === targetTour[k])) continue;

        // Build graph with weighted edges
        const names = makeLabels(n);
        const edges = ordering.map((e, k) => ({
            source: vertexId(e.s),
            target: vertexId(e.t),
            label: String(k + 1),
        }));
        return {
            n, names, directed: false, edgeLabel: 'weight', edges,
            hamiltonianCycle: perm,
            startVertex: startIdx,
            strategy: 'nearest_neighbor',
        };
    }
    return null;
}

/**
 * Generate a Hamiltonian graph solvable by the Sorted Edge strategy.
 * Returns extended graph object with hamiltonianCycle and sortedEdgeResult.
 * @param {number} n
 * @returns {object|null}
 */
function _makeHamiltonianSE(n) {
    const maxEdges = (n * (n - 1)) / 2;
    const edgeCap = Math.floor(_HAM_EDGE_CAP_LO * maxEdges) +
        Math.floor(Math.random() * (_HAM_EDGE_CAP_HI - _HAM_EDGE_CAP_LO) * maxEdges) + 1;

    for (let attempt = 0; attempt < 30; attempt++) {
        const perm = shuffle(Array.from({ length: n }, (_, i) => i));
        const cycleEdgesSet = new Set(perm.map((v, i) => {
            const a = v, b = perm[(i + 1) % n];
            return `${Math.min(a, b)}-${Math.max(a, b)}`;
        }));
        const cycleEdges = perm.map((v, i) => ({ s: v, t: perm[(i + 1) % n] }));

        // Initial ordering of cycle edges: random (Sorted Edge doesn't depend on initial ordering)
        let ordering = shuffle(cycleEdges.slice());

        // Verify SE produces the target cycle with just the cycle edges
        const initWeights = ordering.map((_, k) => k + 1);
        const initResult = _simulateSE(ordering, initWeights, n);
        if (!initResult || initResult.length !== n) continue;
        const initKeys = new Set(initResult.map(e => `${Math.min(e.s, e.t)}-${Math.max(e.s, e.t)}`));
        if (initKeys.size !== cycleEdgesSet.size || ![...cycleEdgesSet].every(k => initKeys.has(k))) continue;

        // Add extra edges
        const edgeSet = new Set(cycleEdges.map(({ s, t }) => `${Math.min(s, t)}-${Math.max(s, t)}`));
        const candidates = [];
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
            if (!edgeSet.has(`${i}-${j}`)) candidates.push({ s: i, t: j });
        }
        shuffle(candidates);

        for (const cand of candidates) {
            if (ordering.length >= edgeCap) break;
            const validPos = [];
            for (let pos = 0; pos <= ordering.length; pos++) {
                const testOrd = [...ordering.slice(0, pos), cand, ...ordering.slice(pos)];
                const wts = testOrd.map((_, k) => k + 1);
                const result = _simulateSE(testOrd, wts, n);
                if (!result || result.length !== n) continue;
                const keys = new Set(result.map(e => `${Math.min(e.s, e.t)}-${Math.max(e.s, e.t)}`));
                if (keys.size === cycleEdgesSet.size && [...cycleEdgesSet].every(k => keys.has(k))) validPos.push(pos);
            }
            if (validPos.length > 0) {
                const pos = validPos[Math.floor(Math.random() * validPos.length)];
                ordering.splice(pos, 0, cand);
                edgeSet.add(`${Math.min(cand.s, cand.t)}-${Math.max(cand.s, cand.t)}`);
            }
        }

        // Final verification
        const weights = ordering.map((_, k) => k + 1);
        const seResult = _simulateSE(ordering, weights, n);
        if (!seResult || seResult.length !== n) continue;
        const finalKeys = new Set(seResult.map(e => `${Math.min(e.s, e.t)}-${Math.max(e.s, e.t)}`));
        if (![...cycleEdgesSet].every(k => finalKeys.has(k))) continue;

        const names = makeLabels(n);
        const edges = ordering.map((e, k) => ({
            source: vertexId(e.s),
            target: vertexId(e.t),
            label: String(k + 1),
        }));

        // Compute default cycle order for SE (from startVertex 0)
        const startPerm = _extractCycleOrder(seResult, n, 0) || perm;
        return {
            n, names, directed: false, edgeLabel: 'weight', edges,
            hamiltonianCycle: startPerm,
            sortedEdgeCycleKeys: cycleEdgesSet,
            strategy: 'sorted_edge',
        };
    }
    return null;
}

/**
 * Generate a Hamiltonian graph for freeform strategy (no weights needed).
 * @param {number} n
 * @returns {object}
 */
function _makeHamiltonianFreeform(n) {
    // Reuse sorted edge logic but strip weights
    const g = _makeHamiltonianSE(n);
    if (g) {
        const edges = g.edges.map(e => ({ ...e, label: null }));
        return {
            n: g.n, names: g.names, directed: false, edgeLabel: null, edges,
            hamiltonianCycle: g.hamiltonianCycle,
            strategy: 'freeform',
        };
    }
    // Fallback: start with cycle and add random edges
    const perm = shuffle(Array.from({ length: n }, (_, i) => i));
    const edgeSet = new Set();
    const indexEdges = [];
    for (let i = 0; i < n; i++) {
        const s = perm[i], t = perm[(i + 1) % n];
        edgeSet.add(`${Math.min(s, t)}-${Math.max(s, t)}`);
        indexEdges.push({ s, t });
    }
    const extra = Math.floor(n * 0.4);
    let guard = 0;
    while (indexEdges.length < n + extra && guard < 200) {
        guard++;
        const i = Math.floor(Math.random() * n);
        const j = Math.floor(Math.random() * n);
        if (i === j) continue;
        const key = `${Math.min(i, j)}-${Math.max(i, j)}`;
        if (!edgeSet.has(key)) { edgeSet.add(key); indexEdges.push({ s: i, t: j }); }
    }
    return {
        n,
        names: makeLabels(n),
        directed: false,
        edgeLabel: null,
        edges: toEdges(indexEdges),
        hamiltonianCycle: perm,
        strategy: 'freeform',
    };
}

// ---------------------------------------------------------------------------
// Main Hamiltonian puzzle generator
// ---------------------------------------------------------------------------

/**
 * Generate a random Hamiltonian graph puzzle.
 *
 * Returns a puzzle object with properties:
 *   n, names, directed, edgeLabel, edges  — the graph
 *   isHamiltonian {boolean}
 *   strategy {'freeform'|'nearest_neighbor'|'sorted_edge'|null}
 *   hamiltonianCycle {number[]}   vertex index order (for Hamiltonian graphs)
 *   startVertex {number|null}     for nearest_neighbor strategy
 *   sortedEdgeCycleKeys {Set<string>|null}  edge key set for sorted_edge validation
 *   nonHamiltonianReasons {string[]}  subset of ['leaf','cut_vertex','bipartite_unequal']
 *   showWeights {boolean}
 *
 * @returns {object}
 */
export function generateHamiltonianPuzzle() {
    const n = Math.floor(Math.random() * 5) + 4;  // 4–8 vertices
    const isHamiltonian = Math.random() > 0.25;

    if (!isHamiltonian) {
        const nonHamType = Math.floor(Math.random() * 3); // 0=cut_vertex, 1=leaf, 2=bipartite
        let indexEdges;
        if (nonHamType === 0) {
            indexEdges = _hamMakeCutVertex(n);
        } else if (nonHamType === 1) {
            indexEdges = _hamMakeLeaf(n);
        } else {
            indexEdges = _hamMakeBipartiteUnequal(n);
        }

        const names = makeLabels(n);
        const edges = toEdges(indexEdges);

        // Compute valid reasons for this specific graph
        const leaves = leafVertices(edges, n);
        const cutVerts = cutVertices(edges, n);
        const bipParts = bipartiteParts(edges, n);

        const reasons = [];
        if (leaves.length > 0) reasons.push('leaf');
        if (cutVerts.length > 0) reasons.push('cut_vertex');
        if (bipParts && bipParts[0].length !== bipParts[1].length) reasons.push('bipartite_unequal');

        // If no reason detected (should be rare), force one
        if (reasons.length === 0) reasons.push('cut_vertex');

        return {
            n, names, directed: false, edgeLabel: null, edges,
            isHamiltonian: false,
            strategy: null,
            hamiltonianCycle: null,
            startVertex: null,
            sortedEdgeCycleKeys: null,
            nonHamiltonianReasons: reasons,
            showWeights: false,
        };
    }

    // Hamiltonian case: pick strategy
    const strategies = ['freeform', 'nearest_neighbor', 'sorted_edge'];
    let strategy = strategies[Math.floor(Math.random() * 3)];

    let g = null;
    if (strategy === 'nearest_neighbor') {
        for (let t = 0; t < 5 && !g; t++) g = _makeHamiltonianNN(n);
        if (!g) strategy = 'freeform';  // fallback: downgrade strategy
    } else if (strategy === 'sorted_edge') {
        for (let t = 0; t < 5 && !g; t++) g = _makeHamiltonianSE(n);
        if (!g) strategy = 'freeform';  // fallback: downgrade strategy
    }
    if (!g) g = _makeHamiltonianFreeform(n);

    return {
        ...g,
        isHamiltonian: true,
        strategy,
        nonHamiltonianReasons: [],
        // ?? not ||: start vertex 0 (A) is valid. The old site lost it ("Start at vertex undefined").
        startVertex: g.startVertex ?? null,
        sortedEdgeCycleKeys: g.sortedEdgeCycleKeys || null,
        showWeights: strategy === 'nearest_neighbor' || strategy === 'sorted_edge',
    };
}

// ---------------------------------------------------------------------------
// Hamiltonian cycle validation
// ---------------------------------------------------------------------------

/**
 * Parse a Hamiltonian cycle input string into an array of vertex display-names.
 * Accepts "ABCDA", "A,B,C,D,A", "A B C D A", etc.
 * Strips trailing repeat of starting vertex for uniform processing.
 * Returns array of unique labels (length n), or null if unparseable.
 * @param {string} input
 * @param {string[]} names  valid vertex display-names
 * @returns {string[]|null}
 */
function _parseHamCycleInput(input, names) {
    if (!input || !input.trim()) return null;
    const upper = input.trim().toUpperCase(); // Normalize
    // Try multi-char names first (comma/space separated)
    let tokens;
    if (upper.includes(',')) {
        tokens = upper.split(',').map(s => s.trim()).filter(Boolean);
    } else if (upper.includes(' ')) {
        tokens = upper.split(/\s+/).map(s => s.trim()).filter(Boolean);
    } else {
        // Single-char names: each character is a vertex
        tokens = upper.split('');
    }
    // Strip trailing repeat
    if (tokens.length > 1 && tokens[0] === tokens[tokens.length - 1]) {
        tokens = tokens.slice(0, -1);
    }
    if (tokens.length === 0) return null;
    // Validate all tokens are known vertex names
    for (const tok of tokens) {
        if (!names.includes(tok)) return null;
    }
    return tokens;
}

/**
 * Validate a freeform Hamiltonian cycle input against a graph.
 * Returns { valid, reason, detail } where reason is a user-facing error string.
 * @param {string} input
 * @param {object} graph  {n, names, edges}
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateHamiltonianCycleFreeform(input, graph) {
    const { n, names, edges } = graph;
    const tokens = _parseHamCycleInput(input, names);
    if (!tokens) return { valid: false, reason: 'not_a_valid_path' };

    // Must visit exactly n vertices
    if (tokens.length !== n) {
        if (tokens.length < n) {
            // Find first missing vertex
            const missing = names.find(nm => !tokens.includes(nm));
            return { valid: false, reason: 'missing_vertex', detail: missing };
        }
        // Find first vertex visited more than once
        const seen = new Set();
        for (const tok of tokens) {
            if (seen.has(tok)) return { valid: false, reason: 'repeated_vertex', detail: tok };
            seen.add(tok);
        }
        return { valid: false, reason: 'not_a_valid_path' };
    }

    // Check all vertices visited
    const seen = new Set(tokens);
    if (seen.size !== n) {
        const dup = tokens.find((t, i) => tokens.indexOf(t) !== i);
        return { valid: false, reason: 'repeated_vertex', detail: dup };
    }
    for (const nm of names) {
        if (!seen.has(nm)) return { valid: false, reason: 'missing_vertex', detail: nm };
    }

    // Build adjacency for quick lookup
    const adjSet = new Set(edges.map(e => {
        const a = vertexLabel(e.source, names), b = vertexLabel(e.target, names);
        return `${[a, b].sort().join('--')}`;
    }));
    const hasEdge = (u, v) => adjSet.has(`${[u, v].sort().join('--')}`);

    // Check each consecutive pair + closing edge
    const cycle = [...tokens, tokens[0]];
    for (let i = 0; i < n; i++) {
        if (!hasEdge(cycle[i], cycle[i + 1])) {
            return { valid: false, reason: 'no_edge', detail: `${cycle[i]}–${cycle[i + 1]}` };
        }
    }

    return { valid: true };
}

/**
 * Validate a Nearest Neighbor Hamiltonian cycle input.
 * @param {string} input
 * @param {object} puzzle  {n, names, edges, hamiltonianCycle, startVertex}
 * @returns {{ valid: boolean, reason?: string, detail?: string }}
 */
export function validateHamiltonianCycleNN(input, puzzle) {
    const { n, names, edges, hamiltonianCycle, startVertex } = puzzle;
    const tokens = _parseHamCycleInput(input, names);
    if (!tokens) return { valid: false, reason: 'not_a_valid_path' };

    const startName = names[startVertex];
    if (tokens[0] !== startName) {
        return { valid: false, reason: 'wrong_start', detail: startName };
    }

    if (tokens.length !== n) {
        if (tokens.length < n) {
            return { valid: false, reason: 'incomplete_cycle' };
        }
        const dup = tokens.find((t, i) => tokens.indexOf(t) !== i);
        if (dup) return { valid: false, reason: 'repeated_vertex', detail: dup };
        return { valid: false, reason: 'not_a_valid_path' };
    }

    // Check all vertices present
    const seen = new Set(tokens);
    if (seen.size !== n) {
        const dup = tokens.find((t, i) => tokens.indexOf(t) !== i);
        return { valid: false, reason: 'repeated_vertex', detail: dup };
    }

    // Build edge weight lookup
    const edgeWeightMap = new Map();
    for (const e of edges) {
        const a = vertexLabel(e.source, names), b = vertexLabel(e.target, names);
        const key = `${[a, b].sort().join('--')}`;
        const w = parseFloat(e.label);
        if (!isNaN(w)) edgeWeightMap.set(key, w);
    }
    const getWeight = (u, v) => edgeWeightMap.get(`${[u, v].sort().join('--')}`) ?? Infinity;

    // Build adjacency list
    const adjMap = new Map(names.map(nm => [nm, []]));
    for (const e of edges) {
        const a = vertexLabel(e.source, names), b = vertexLabel(e.target, names);
        adjMap.get(a).push(b);
        adjMap.get(b).push(a);
    }

    // NN simulation
    const visitedSet = new Set([tokens[0]]);
    for (let step = 0; step < n - 1; step++) {
        const cur = tokens[step];
        const next = tokens[step + 1];
        const curW = getWeight(cur, next);

        // Check edge exists first
        if (curW === Infinity) {
            return { valid: false, reason: 'no_edge', detail: `${cur}–${next}` };
        }

        // Find actual nearest unvisited neighbor and verify user chose correctly
        let bestNb = null, bestW = Infinity;
        for (const nb of (adjMap.get(cur) || [])) {
            if (visitedSet.has(nb)) continue;
            const w = getWeight(cur, nb);
            if (w < bestW) { bestW = w; bestNb = nb; }
        }
        if (bestNb !== null && bestNb !== next) {
            return { valid: false, reason: 'wrong_nn_step', detail: `at step ${step + 1}, the nearest neighbor is ${bestNb} but you went to ${next}` };
        }
        visitedSet.add(next);
    }

    // Check closing edge exists
    const last = tokens[n - 1];
    const adjSet = new Set(edges.map(e => {
        const a = vertexLabel(e.source, names), b = vertexLabel(e.target, names);
        return `${[a, b].sort().join('--')}`;
    }));
    if (!adjSet.has(`${[last, tokens[0]].sort().join('--')}`)) {
        return { valid: false, reason: 'cant_close_cycle' };
    }

    return { valid: true };
}

/**
 * Validate a Sorted Edge Hamiltonian cycle input.
 * @param {string} input
 * @param {object} puzzle  {n, names, edges, sortedEdgeCycleKeys}
 * @returns {{ valid: boolean, reason?: string, detail?: string }}
 */
export function validateHamiltonianCycleSE(input, puzzle) {
    const { n, names, edges, sortedEdgeCycleKeys } = puzzle;
    const tokens = _parseHamCycleInput(input, names);
    if (!tokens) return { valid: false, reason: 'not_a_valid_path' };

    if (tokens.length !== n) {
        if (tokens.length < n) {
            const missing = names.find(nm => !tokens.includes(nm));
            return { valid: false, reason: 'missing_vertex', detail: missing };
        }
        return { valid: false, reason: 'not_a_valid_path' };
    }

    // Check no repeated vertices
    const seen = new Set(tokens);
    if (seen.size !== n) {
        const dup = tokens.find((t, i) => tokens.indexOf(t) !== i);
        return { valid: false, reason: 'repeated_vertex', detail: dup };
    }

    // Build adjacency set for validity check
    const adjSet = new Set(edges.map(e => {
        const a = vertexLabel(e.source, names), b = vertexLabel(e.target, names);
        return `${[a, b].sort().join('--')}`;
    }));
    const hasEdge = (u, v) => adjSet.has(`${[u, v].sort().join('--')}`);
    const nameToIdx = new Map(names.map((nm, i) => [nm, i]));

    // Extract the edges the user chose and compare to sortedEdgeCycleKeys
    const userEdgeKeys = new Set();
    for (let i = 0; i < n; i++) {
        const u = tokens[i], v = tokens[(i + 1) % n];
        if (!hasEdge(u, v)) return { valid: false, reason: 'no_edge', detail: `${u}–${v}` };
        const ui = nameToIdx.get(u), vi = nameToIdx.get(v);
        userEdgeKeys.add(`${Math.min(ui, vi)}-${Math.max(ui, vi)}`);
    }

    if (!sortedEdgeCycleKeys) return { valid: true }; // no reference, accept any valid cycle

    // Check edge sets match
    const missing = [...sortedEdgeCycleKeys].find(k => !userEdgeKeys.has(k));
    const extra = [...userEdgeKeys].find(k => !sortedEdgeCycleKeys.has(k));
    if (missing) {
        // Convert key to display names
        const [si, ti] = missing.split('-').map(Number);
        return { valid: false, reason: 'wrong_edge_missing', detail: `${names[si]}–${names[ti]}` };
    }
    if (extra) {
        const [si, ti] = extra.split('-').map(Number);
        return { valid: false, reason: 'wrong_edge_extra', detail: `${names[si]}–${names[ti]}` };
    }

    return { valid: true };
}

let root, score, view, puzzle, part2Scored;
const $ = selector => root.querySelector(selector);

/** The puzzle with weights removed, for drawing before part 1 is answered. */
const withoutWeights = p => ({ ...p, edgeLabel: null, edges: p.edges.map(e => ({ ...e, label: null })) });

function newQuestion() {
  puzzle = generateHamiltonianPuzzle();
  part2Scored = false;
  view.draw(withoutWeights(puzzle));

  resetChoices($('.part1'));
  resetChoices($('.part2-why'));
  $('.part2-cycle').hidden = true;
  $('.part2-why').hidden = true;
  $('.cycle-input').value = '';
  $('.cycle-input').disabled = false;
  $('.part2-cycle [type="submit"]').disabled = false;
  $('.part2-cycle .input-error').textContent = '';
  hideFeedback($('.feedback'));
}

function finish(correct, messageHtml, canRetry = false) {
  showFeedback($('.feedback'), { correct, messageHtml, canRetry });
  (canRetry ? $('.feedback-retry') : $('.feedback-next')).focus();
}

function answerPart1(btn) {
  const correct = (btn.dataset.answer === 'yes') === puzzle.isHamiltonian;
  lockChoices($('.part1'), btn, correct);
  score.record(correct ? 0.5 : 0);
  if (!correct) return finish(false, escapeHtml(COPY.part1Wrong(puzzle.isHamiltonian)));

  if (!puzzle.isHamiltonian) {
    $('.part2-why').hidden = false;
    $('.part2-why .choice-btn').focus();
    return;
  }
  if (puzzle.showWeights) view.setEdgeLabels(puzzle);
  $('.cycle-instructions').innerHTML = COPY.instructions[puzzle.strategy](puzzle.names[puzzle.startVertex]);
  $('.part2-cycle').hidden = false;
  $('.cycle-input').focus();
}

function submitCycle() {
  const input = $('.cycle-input');
  if (!/[A-Za-z]/.test(input.value)) {
    $('.part2-cycle .input-error').textContent = COPY.cycleEmpty;
    return;
  }
  $('.part2-cycle .input-error').textContent = '';
  const result = VALIDATORS[puzzle.strategy](input.value.trim(), puzzle);
  input.disabled = true;
  $('.part2-cycle [type="submit"]').disabled = true;
  if (result.valid) {
    // Points for part 2 once, even after retries.
    if (!part2Scored) score.addPoints(0.5);
    part2Scored = true;
    finish(true, escapeHtml(COPY.cycleCorrect[puzzle.strategy]));
  } else {
    finish(false, COPY.cycleWrong(result), true);
  }
}

function retry() {
  hideFeedback($('.feedback'));
  $('.cycle-input').disabled = false;
  $('.part2-cycle [type="submit"]').disabled = false;
  $('.cycle-input').focus();
}

function answerWhy(btn) {
  const reason = btn.dataset.answer;
  const reasons = puzzle.nonHamiltonianReasons;
  const correct = reasons.includes(reason);
  lockChoices($('.part2-why'), btn, correct);
  if (correct) {
    score.addPoints(0.5);
    const also = reason !== 'leaf' && reasons.includes('leaf') ? COPY.alsoLeaf : '';
    finish(true, escapeHtml(COPY.reasonExplained[reason] + also));
  } else {
    finish(false, escapeHtml(COPY.reasonWrong(reasons)));
  }
}

export default {
  scored: true,

  mount(el, ctx) {
    root = el;
    score = ctx.score;
    root.innerHTML = `
      <div class="info"><p>${COPY.info}</p></div>
      <div class="section">
        <h2>${COPY.promptTitle}</h2>
        <p class="subtitle">${COPY.promptSubtitle}</p>
        <div class="graph-slot"></div>
        <p class="hint">${COPY.hint}</p>
      </div>

      <div class="section part1">
        <h2>${COPY.part1Title}</h2>
        <div class="choice-row">
          <button type="button" class="choice-btn" data-answer="yes">${COPY.yes}</button>
          <button type="button" class="choice-btn" data-answer="no">${COPY.no}</button>
        </div>
      </div>

      <form class="section part2-cycle" hidden>
        <h2>${COPY.cycleLead}</h2>
        <p class="subtitle cycle-instructions"></p>
        <div class="answer-row">
          <label for="ham-cycle" class="sr-only">${COPY.cycleLabel}</label>
          <input type="text" id="ham-cycle" class="cycle-input" autocomplete="off" placeholder="${COPY.cyclePlaceholder}">
          <button type="submit" class="primary-btn">${COPY.submit}</button>
        </div>
        <p class="input-error" role="alert"></p>
      </form>

      <div class="section part2-why" hidden>
        <h2>${COPY.whyLead}</h2>
        <p class="subtitle">${COPY.whyTitle}</p>
        <div class="choice-row">
          ${Object.entries(COPY.reasons).map(([key, label]) =>
            `<button type="button" class="choice-btn" data-answer="${key}">${label}</button>`).join('')}
        </div>
      </div>

      ${feedbackHtml({ retryLabel: COPY.retry, nextLabel: COPY.next })}`;

    view = createGraphView($('.graph-slot'));
    root.querySelectorAll('.part1 .choice-btn').forEach(btn => btn.addEventListener('click', () => answerPart1(btn)));
    root.querySelectorAll('.part2-why .choice-btn').forEach(btn => btn.addEventListener('click', () => answerWhy(btn)));
    $('.part2-cycle').addEventListener('submit', event => {
      event.preventDefault();
      if (!$('.part2-cycle [type="submit"]').disabled) submitCycle();
    });
    $('.feedback-retry').addEventListener('click', retry);
    $('.feedback-next').addEventListener('click', newQuestion);
    newQuestion();
  },

  reset() {
    newQuestion();
  },
};

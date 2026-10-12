// Eulerian Graphs: is the graph Eulerian? Part 2 depends on the answer:
// find an Eulerian circuit, pick the unbalanced vertices of a directed graph,
// or Eulerize an undirected graph by duplicating edges.
// Ported from legacy/graph-theory/eulerian-mode.js; spec in eulerian.md.
// Puzzle generation and answer checking (up to validateEulerization) are
// copied unchanged.

import {
  vertexIndex, vertexLabel, shuffle,
  isConnected, isStronglyConnected, getOddVertices, getDirectedDegrees,
} from '../lib/graph/core.js';
import {
  generateEulerianDigraph, generateEulerianSimpleGraph, generateEulerianMultigraph,
  getMismatchedVertices, minEulerizeEdges,
} from '../lib/graph/eulerian.js';
import { createGraphView } from '../lib/render.js';
import {
  escapeHtml, feedbackHtml, showFeedback, hideFeedback, lockChoices, resetChoices, loadStylesheet,
} from '../../shared/js/ui.js';

// ---- Complexity heuristics ------------------------------------------------
// Applied to every puzzle graph to keep it legible regardless of vertex count.
//
//   1. Max degree of any vertex <= EULER_PUZZLE_MAX_DEG
//   2. For every vertex v, mean degree of closed neighbourhood
//      {v} U neighbors(v) <= EULER_PUZZLE_MAX_NBR_MEAN
//
// For directed graphs "degree" = in-degree + out-degree; "neighbour" means
// adjacent in either direction.

const EULER_PUZZLE_MAX_DEG = 5;
const EULER_PUZZLE_MAX_NBR_MEAN = 3.5;

/**
 * Return true when `edges` satisfies both puzzle complexity heuristics.
 * @param {Edge[]} edges
 * @param {number} n
 * @param {boolean} directed
 * @returns {boolean}
 */
function _puzzleComplexityOk(edges, n, directed) {
    const deg = new Array(n).fill(0);
    const adj = Array.from({ length: n }, () => new Set());

    for (const { source, target } of edges) {
        const s = vertexIndex(source);
        const t = vertexIndex(target);
        if (s === t) {
            if (!directed) deg[s] += 2;
            continue;
        }
        deg[s]++;
        deg[t]++;
        adj[s].add(t);
        adj[t].add(s);
    }

    for (let v = 0; v < n; v++) {
        if (deg[v] > EULER_PUZZLE_MAX_DEG) return false;
        const closed = [v, ...adj[v]];
        const mean = closed.reduce((sum, u) => sum + deg[u], 0) / closed.length;
        if (mean > EULER_PUZZLE_MAX_NBR_MEAN) return false;
    }
    return true;
}

/**
 * Pick a random target edge count appropriate for an undirected puzzle graph.
 * @param {number} n
 * @returns {number}
 */
function _puzzleEdgeTarget(n) {
    const lo = n;
    const hi = Math.min(Math.floor(1.8 * n), (n * (n - 1)) / 2);
    return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

/** @returns {object} graph */
function _makeEulerianDigraph(n) {
    for (let attempt = 0; attempt < 20; attempt++) {
        const g = generateEulerianDigraph(n);
        if (_puzzleComplexityOk(g.edges, n, true)) return g;
    }
    return generateEulerianDigraph(n);
}

/** @returns {object} graph */
function _makeNonEulerianDigraph(n) {
    for (let attempt = 0; attempt < 20; attempt++) {
        const g = generateEulerianDigraph(n);
        if (!_puzzleComplexityOk(g.edges, n, true)) continue;
        const candidates = shuffle(g.edges.slice());
        for (const cand of candidates) {
            const trial = g.edges.filter(e => e !== cand);
            if (isStronglyConnected({ ...g, edges: trial })) {
                return { ...g, edges: trial };
            }
        }
    }
    return _makeEulerianDigraph(n);
}

/** @returns {object} graph */
function _makeEulerianSimple(n) {
    for (let attempt = 0; attempt < 25; attempt++) {
        const g = generateEulerianSimpleGraph(n, _puzzleEdgeTarget(n));
        if (_puzzleComplexityOk(g.edges, n, false)) return g;
    }
    return generateEulerianSimpleGraph(n, n);
}

/** @returns {object} graph */
function _makeNonEulerianSimple(n) {
    for (let attempt = 0; attempt < 25; attempt++) {
        const g = generateEulerianSimpleGraph(n, _puzzleEdgeTarget(n));
        if (!_puzzleComplexityOk(g.edges, n, false)) continue;
        let edges = g.edges.slice();
        const numDelete = Math.random() < 0.5 ? 1 : 2;
        let deleted = 0;
        for (const cand of shuffle(edges.slice())) {
            if (deleted >= numDelete) break;
            const trial = edges.filter(e => e !== cand);
            if (isConnected({ ...g, edges: trial }) && getOddVertices({ ...g, edges: trial }).length > 0) {
                edges = trial;
                deleted++;
            }
        }
        if (deleted > 0) return { ...g, edges };
    }
    return _makeEulerianSimple(n);
}

/** @returns {object} graph */
function _makeEulerianMulti(n) {
    for (let attempt = 0; attempt < 25; attempt++) {
        const g = generateEulerianMultigraph(n, _puzzleEdgeTarget(n));
        if (_puzzleComplexityOk(g.edges, n, false)) return g;
    }
    return generateEulerianMultigraph(n, n);
}

/** @returns {object} graph */
function _makeNonEulerianMulti(n) {
    for (let attempt = 0; attempt < 25; attempt++) {
        const g = generateEulerianMultigraph(n, _puzzleEdgeTarget(n));
        if (!_puzzleComplexityOk(g.edges, n, false)) continue;
        let edges = g.edges.slice();
        const numDelete = Math.random() < 0.5 ? 1 : 2;
        let deleted = 0;
        for (const cand of shuffle(edges.slice())) {
            if (deleted >= numDelete) break;
            const trial = edges.filter(e => e !== cand);
            if (isConnected({ ...g, edges: trial }) && getOddVertices({ ...g, edges: trial }).length > 0) {
                edges = trial;
                deleted++;
            }
        }
        if (deleted > 0) return { ...g, edges };
    }
    return _makeEulerianMulti(n);
}

/**
 * Generate a random Eulerian graph puzzle.
 * @returns {object}
 */
export function generateEulerianGraphPuzzle() {
    const n = Math.floor(Math.random() * 6) + 4;
    const scenario = Math.floor(Math.random() * 6);

    const makers = [
        _makeEulerianDigraph,
        _makeNonEulerianDigraph,
        _makeEulerianSimple,
        _makeNonEulerianSimple,
        _makeEulerianMulti,
        _makeNonEulerianMulti,
    ];
    const graph = makers[scenario](n);
    const isMulti = graph.edgeLabel === 'name';

    let isEulerian;
    if (graph.directed) {
        const { inDeg, outDeg } = getDirectedDegrees(graph);
        const balanced = inDeg.every((d, i) => d === outDeg[i]);
        isEulerian = balanced && isStronglyConnected(graph);
    } else {
        isEulerian = isConnected(graph) && getOddVertices(graph).length === 0;
    }

    return { ...graph, isEulerian, isMulti };
}

/**
 * Check whether a sequence of vertex display-names forms a valid Eulerian
 * circuit in a simple undirected graph.
 * @param {string[]} circuit
 * @param {object} graph
 * @param {boolean} requireCircuit
 * @returns {boolean}
 */
export function validateEulerianCircuitSimple(circuit, graph, requireCircuit) {
    if (circuit.length < 2) return false;
    if (requireCircuit && circuit[0] !== circuit[circuit.length - 1]) return false;

    const pool = graph.edges.map(e => ({
        a: vertexLabel(e.source, graph.names),
        b: vertexLabel(e.target, graph.names),
        used: false,
    }));

    for (let step = 0; step < circuit.length - 1; step++) {
        const u = circuit[step], v = circuit[step + 1];
        const ei = pool.findIndex(e => !e.used && ((e.a === u && e.b === v) || (e.a === v && e.b === u)));
        if (ei === -1) return false;
        pool[ei].used = true;
    }
    return pool.every(e => e.used);
}

/**
 * Check whether an alternating vertex/edge-label string is a valid Eulerian
 * circuit in a multigraph, e.g. "AaBbCcA".
 * @param {string} input
 * @param {object} graph
 * @param {boolean} requireCircuit
 * @returns {boolean}
 */
export function validateEulerianCircuitMulti(input, graph, requireCircuit) {
    const tokens = input.match(/[A-Z]|[a-z]/g);
    if (!tokens || tokens.length < 3) return false;
    for (let i = 0; i < tokens.length; i++) {
        if (i % 2 === 0 && !/[A-Z]/.test(tokens[i])) return false;
        if (i % 2 === 1 && !/[a-z]/.test(tokens[i])) return false;
    }
    if (tokens.length % 2 === 0) return false;
    if (requireCircuit && tokens[0] !== tokens[tokens.length - 1]) return false;

    const edgeUsed = new Array(graph.edges.length).fill(false);

    for (let i = 0; i < tokens.length - 2; i += 2) {
        const u = tokens[i], edgeLbl = tokens[i + 1], v = tokens[i + 2];
        const ei = graph.edges.findIndex((e, idx) =>
            !edgeUsed[idx] &&
            e.label === edgeLbl &&
            ((vertexLabel(e.source, graph.names) === u && vertexLabel(e.target, graph.names) === v) ||
             (vertexLabel(e.source, graph.names) === v && vertexLabel(e.target, graph.names) === u))
        );
        if (ei === -1) return false;
        edgeUsed[ei] = true;
    }
    return edgeUsed.every(Boolean);
}

/**
 * Check whether a sequence of vertex display-names is a valid Eulerian circuit
 * in a directed graph.
 * @param {string[]} circuit
 * @param {object} graph
 * @returns {boolean}
 */
export function validateEulerianCircuitDigraph(circuit, graph) {
    if (circuit.length < 2) return false;
    if (circuit[0] !== circuit[circuit.length - 1]) return false;

    const pool = graph.edges.map(e => ({
        a: vertexLabel(e.source, graph.names),
        b: vertexLabel(e.target, graph.names),
        used: false,
    }));

    for (let step = 0; step < circuit.length - 1; step++) {
        const u = circuit[step], v = circuit[step + 1];
        const ei = pool.findIndex(e => !e.used && e.a === u && e.b === v);
        if (ei === -1) return false;
        pool[ei].used = true;
    }
    return pool.every(e => e.used);
}

/**
 * Validate whether adding a set of edges to a graph makes it Eulerian.
 * Added edges must duplicate existing edges (no new vertex relationships).
 * @param {object} graph
 * @param {Array<{from: string, to: string}>} addedEdges
 * @returns {{ ok: boolean, reason?: string, bad?: string[], oddVertices?: string[] }}
 */
export function validateEulerization(graph, addedEdges) {
    const { names, directed, edges: origEdges } = graph;

    const origSet = new Set(origEdges.map(e => {
        const a = vertexLabel(e.source, names), b = vertexLabel(e.target, names);
        if (a === b) return null;
        return directed ? `${a}->${b}` : [a, b].sort().join('--');
    }).filter(Boolean));

    const combined = origEdges
        .map(e => ({ s: vertexLabel(e.source, names), t: vertexLabel(e.target, names) }))
        .filter(e => e.s !== e.t);

    const invalidVertices = [];
    const nonDuplicates = [];

    for (const ae of addedEdges) {
        if (!ae.from || !ae.to) continue;
        const from = ae.from.trim().toUpperCase();
        const to = ae.to.trim().toUpperCase();

        if (!names.includes(from) || !names.includes(to)) {
            invalidVertices.push(`${from}–${to}`);
            continue;
        }
        if (from === to) continue;

        const key = directed ? `${from}->${to}` : [from, to].sort().join('--');
        if (!origSet.has(key)) {
            nonDuplicates.push(directed ? `${from}→${to}` : `${from}–${to}`);
            continue;
        }
        combined.push({ s: from, t: to });
    }

    if (invalidVertices.length > 0) {
        return { ok: false, reason: 'invalid_vertices', bad: invalidVertices };
    }
    if (nonDuplicates.length > 0) {
        return { ok: false, reason: 'not_duplicate', bad: nonDuplicates };
    }

    if (directed) {
        const inDeg = Object.fromEntries(names.map(nm => [nm, 0]));
        const outDeg = Object.fromEntries(names.map(nm => [nm, 0]));
        for (const { s, t } of combined) { outDeg[s]++; inDeg[t]++; }
        const oddVertices = names.filter(nm => inDeg[nm] !== outDeg[nm]);
        if (oddVertices.length > 0) return { ok: false, reason: 'not_eulerian', oddVertices };
    } else {
        const deg = Object.fromEntries(names.map(nm => [nm, 0]));
        for (const { s, t } of combined) { deg[s]++; deg[t]++; }
        const oddVertices = names.filter(nm => deg[nm] % 2 !== 0);
        if (oddVertices.length > 0) return { ok: false, reason: 'not_eulerian', oddVertices };
    }

    return { ok: true };
}


// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

const COPY = {
  promptTitle: 'Here is a graph...',
  promptSubtitle: 'Is it Eulerian?',
  hint: 'Hint: you can click and drag vertices to get a better look.',
  part1Title: 'Part 1 — Is this graph Eulerian?',
  yes: 'Eulerian',
  no: 'Not Eulerian',
  part1Wrong: puzzle => {
    if (puzzle.isEulerian) {
      return puzzle.directed
        ? 'This graph is actually Eulerian — every vertex has equal in-degree and out-degree, and the graph is strongly connected.'
        : 'This graph is actually Eulerian — every vertex has even degree (and the graph is connected).';
    }
    return puzzle.directed
      ? 'This graph is actually not Eulerian — it has one or more vertices where in-degree ≠ out-degree (or is not strongly connected).'
      : 'This graph is actually not Eulerian — it has one or more vertices with odd degree (or is not connected).';
  },

  circuitTitle: 'Part 2 — Find an Eulerian circuit',
  circuitHint: puzzle => puzzle.isMulti
    ? 'Enter alternating vertices and edge labels, e.g. AaBbCcA.'
    : `Enter the vertices of an Eulerian circuit in order, e.g. ${puzzle.directed ? 'ABCDA' : 'ABCA'}.`,
  circuitLabel: 'Circuit',
  circuitEmpty: 'Type the circuit first.',
  circuitCorrect: 'That is a valid Eulerian circuit.',
  circuitWrong: puzzle => 'That is not a valid Eulerian circuit.' + (puzzle.isMulti
    ? ' Remember: use alternating capital letters (vertices) and lowercase letters (edge labels), e.g. AaBbCA.'
    : puzzle.directed
      ? ' Remember: it must be a circuit (start = end) and follow edge directions.'
      : ' Make sure you use every edge exactly once.'),

  identifyTitle: 'Part 2 — Identify the problem vertices',
  identifyHint: 'Select every vertex whose in-degree and out-degree are not equal.',
  identifyCorrect: correct => correct.length === 1
    ? `Vertex ${correct[0]} has mismatched in/out degree.`
    : `Vertices ${correct.join(', ')} each have mismatched in/out degree.`,
  identifyWrong: (missing, extra) => {
    if (missing.length && extra.length) return `You missed ${missing.join(', ')} and incorrectly selected ${extra.join(', ')}.`;
    if (missing.length) return `You missed ${missing.join(', ')}.`;
    return `${extra.join(', ')} ${extra.length === 1 ? 'does' : 'do'} not have a degree mismatch.`;
  },

  eulerizeTitle: 'Part 2 — Eulerize the graph',
  eulerizeHint: 'Add edges to make the graph Eulerian. Specify each edge you want to add below.',
  addEdge: '+ Add edge',
  removeEdge: 'Remove',
  from: 'From:',
  to: 'To:',
  badVertices: bad => `These edges use vertex names that aren't in this graph: ${bad.join(', ')}. Check your spelling.`,
  eulerizeCorrect: (used, min) => 'The added edges make every vertex even-degree — the graph is now Eulerian.'
    + (used === min
      ? ' That uses the minimum number of edges needed!'
      : ` Note: a minimum Eulerization only requires ${min} edge${min !== 1 ? 's' : ''} (you used ${used}).`),
  notDuplicate: (bad, directed) => `These edges you added don't duplicate any existing edge: ${bad.join(', ')}.`
    + (directed
      ? ' You can only duplicate an existing directed edge in the same direction.'
      : ' You can only duplicate edges that already exist in the graph.'),
  stillNotEulerian: (odd, directed) => 'Your added edges are valid duplicates, but the graph is still not Eulerian. '
    + `${directed ? 'Vertices where in-degree ≠ out-degree' : 'Vertices with odd degree'} after your additions: ${odd.join(', ')}.`,

  submit: 'Submit',
};

let root, score, view, puzzle, addedEdges;
const $ = selector => root.querySelector(selector);

function newQuestion() {
  puzzle = generateEulerianGraphPuzzle();
  view.draw(puzzle);

  resetChoices($('.part1'));
  for (const part of ['.part2-circuit', '.part2-identify', '.part2-eulerize']) $(part).hidden = true;
  root.querySelectorAll('.part2 input, .part2 button').forEach(el => { el.disabled = false; });
  root.querySelectorAll('.input-error').forEach(el => { el.textContent = ''; });
  $('.circuit-input').value = '';
  $('.circuit-hint').textContent = COPY.circuitHint(puzzle);
  addedEdges = [{ from: '', to: '' }];
  renderEdgeRows();
  hideFeedback($('.feedback'));
}

/** Disable a finished part 2 and show the result. */
function finish(part, correct, message) {
  root.querySelectorAll(`${part} input, ${part} button`).forEach(el => { el.disabled = true; });
  showFeedback($('.feedback'), { correct, messageHtml: escapeHtml(message) });
  $('.feedback-next').focus();
}

function answerPart1(btn) {
  const correct = (btn.dataset.answer === 'yes') === puzzle.isEulerian;
  lockChoices($('.part1'), btn, correct);
  score.record(correct ? 0.5 : 0);
  if (!correct) {
    showFeedback($('.feedback'), { correct: false, messageHtml: escapeHtml(COPY.part1Wrong(puzzle)) });
    $('.feedback-next').focus();
    return;
  }

  let part;
  if (puzzle.isEulerian) part = '.part2-circuit';
  else if (puzzle.directed) {
    part = '.part2-identify';
    $('.vertex-options').innerHTML = puzzle.names.map(name => `
      <label><input type="checkbox" value="${escapeHtml(name)}"> ${escapeHtml(name)}</label>`).join('');
  } else part = '.part2-eulerize';
  $(part).hidden = false;
  $(part).querySelector('input, button').focus();
}

function submitCircuit() {
  const raw = $('.circuit-input').value.trim();
  if (!/[A-Za-z]/.test(raw)) {
    $('.part2-circuit .input-error').textContent = COPY.circuitEmpty;
    return;
  }
  let valid;
  if (puzzle.isMulti) {
    valid = validateEulerianCircuitMulti(raw, puzzle, getOddVertices(puzzle).length === 0);
  } else {
    const circuit = raw.toUpperCase().split('').filter(c => /[A-Z]/.test(c));
    valid = puzzle.directed
      ? validateEulerianCircuitDigraph(circuit, puzzle)
      : validateEulerianCircuitSimple(circuit, puzzle, getOddVertices(puzzle).length === 0);
  }
  if (valid) score.addPoints(0.5);
  $('.part2-circuit .input-error').textContent = '';
  finish('.part2-circuit', valid, valid ? COPY.circuitCorrect : COPY.circuitWrong(puzzle));
}

function submitIdentify() {
  const checked = [...root.querySelectorAll('.vertex-options input:checked')].map(cb => cb.value);
  const correct = getMismatchedVertices(puzzle);
  const missing = correct.filter(v => !checked.includes(v));
  const extra = checked.filter(v => !correct.includes(v));
  const ok = missing.length === 0 && extra.length === 0;
  if (ok) score.addPoints(0.5);
  finish('.part2-identify', ok, ok ? COPY.identifyCorrect(correct) : COPY.identifyWrong(missing, extra));
}

function submitEulerize() {
  const result = validateEulerization(puzzle, addedEdges);
  const error = $('.part2-eulerize .input-error');
  if (result.reason === 'invalid_vertices') {
    // Not an answer yet: let them fix the names.
    error.textContent = COPY.badVertices(result.bad);
    return;
  }
  error.textContent = '';
  if (result.ok) {
    score.addPoints(0.5);
    const used = addedEdges.filter(e => e.from && e.to).length;
    finish('.part2-eulerize', true, COPY.eulerizeCorrect(used, minEulerizeEdges(puzzle)));
  } else if (result.reason === 'not_duplicate') {
    finish('.part2-eulerize', false, COPY.notDuplicate(result.bad, puzzle.directed));
  } else {
    finish('.part2-eulerize', false, COPY.stillNotEulerian(result.oddVertices, puzzle.directed));
  }
}

function renderEdgeRows() {
  const list = $('.edge-rows');
  list.innerHTML = addedEdges.map((edge, i) => `
    <div class="edge-input-row" data-index="${i}">
      <span class="edge-number">${i + 1}.</span>
      <label>${COPY.from} <input type="text" maxlength="1" class="edge-from" value="${escapeHtml(edge.from)}"
        placeholder="A" aria-label="Edge ${i + 1} from"></label>
      <label>${COPY.to} <input type="text" maxlength="1" class="edge-to" value="${escapeHtml(edge.to)}"
        placeholder="B" aria-label="Edge ${i + 1} to"></label>
      <button type="button" class="small-btn danger-btn edge-remove">${COPY.removeEdge}</button>
    </div>`).join('');
}

export default {
  scored: true,

  mount(el, ctx) {
    root = el;
    score = ctx.score;
    loadStylesheet(new URL('./eulerian.css', import.meta.url));
    root.innerHTML = `
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

      <form class="section part2 part2-circuit" hidden>
        <h2>${COPY.circuitTitle}</h2>
        <p class="subtitle circuit-hint"></p>
        <div class="answer-row">
          <label for="eulerian-circuit" class="sr-only">${COPY.circuitLabel}</label>
          <input type="text" id="eulerian-circuit" class="circuit-input" autocomplete="off" placeholder="e.g. ABCA">
          <button type="submit" class="primary-btn">${COPY.submit}</button>
        </div>
        <p class="input-error" role="alert"></p>
      </form>

      <form class="section part2 part2-identify" hidden>
        <h2>${COPY.identifyTitle}</h2>
        <p class="subtitle">${COPY.identifyHint}</p>
        <fieldset class="option-list vertex-options"><legend class="sr-only">${COPY.identifyHint}</legend></fieldset>
        <button type="submit" class="primary-btn">${COPY.submit}</button>
      </form>

      <form class="section part2 part2-eulerize" hidden>
        <h2>${COPY.eulerizeTitle}</h2>
        <p class="subtitle">${COPY.eulerizeHint}</p>
        <div class="edge-rows"></div>
        <div class="button-row">
          <button type="button" class="add-btn edge-add">${COPY.addEdge}</button>
          <button type="submit" class="primary-btn">${COPY.submit}</button>
        </div>
        <p class="input-error" role="alert"></p>
      </form>

      ${feedbackHtml()}`;

    view = createGraphView($('.graph-slot'));
    root.querySelectorAll('.part1 .choice-btn').forEach(btn => btn.addEventListener('click', () => answerPart1(btn)));

    const onSubmit = (selector, handler) => $(selector).addEventListener('submit', event => {
      event.preventDefault();
      if (!$(selector).querySelector('[type="submit"]').disabled) handler();
    });
    onSubmit('.part2-circuit', submitCircuit);
    onSubmit('.part2-identify', submitIdentify);
    onSubmit('.part2-eulerize', submitEulerize);

    // Eulerize rows: typing, removing, adding.
    $('.edge-rows').addEventListener('input', event => {
      const row = event.target.closest('.edge-input-row');
      if (!row) return;
      event.target.value = event.target.value.toUpperCase().trim();
      addedEdges[row.dataset.index][event.target.classList.contains('edge-from') ? 'from' : 'to'] = event.target.value;
    });
    $('.edge-rows').addEventListener('click', event => {
      if (!event.target.classList.contains('edge-remove')) return;
      addedEdges.splice(Number(event.target.closest('.edge-input-row').dataset.index), 1);
      renderEdgeRows();
    });
    $('.edge-add').addEventListener('click', () => {
      addedEdges.push({ from: '', to: '' });
      renderEdgeRows();
      root.querySelector('.edge-input-row:last-child .edge-from').focus();
    });

    $('.feedback-next').addEventListener('click', newQuestion);
    newQuestion();
  },

  reset() {
    newQuestion();
  },
};

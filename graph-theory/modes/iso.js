// Isomorphism: are two graphs equal, isomorphic, or neither? If isomorphic,
// give the isomorphism; if neither, give a reason.
// Ported from legacy/graph-theory/iso-mode.js. Puzzle generation and the
// reason check (from ISO_PUZZLE_N_RANGE to generateIsoPuzzle) were moved here
// unchanged from lib/graph.js, except that _isoBaseGraph calls
// generateSimpleGraph instead of graph.js's private helpers. The invariants and
// the witness check (verifyIsomorphismWitness) are graph math and stay there.

import {
  shuffle, makeLabels, vertexId, vertexIndex, vertexLabel, degreeSequence, generateSimpleGraph,
  countTriangles, componentCount, graphInvariants, applyPermutation, verifyIsomorphismWitness,
} from '../lib/graph.js';
import { createGraphView } from '../lib/render.js';
import {
  escapeHtml, feedbackHtml, showFeedback, hideFeedback, lockChoices, resetChoices, loadStylesheet,
} from '../../shared/js/ui.js';

/** Reasons two graphs aren't isomorphic, in display order. */
export const ISO_REASON_LABELS = {
  diff_vertices: 'Different number of vertices',
  diff_edges: 'Different number of edges',
  diff_degree_seq: 'Different degree sequences',
  diff_components: 'Different number of connected components',
  diff_triangles: 'Different number of triangles',
  // TODO: add a "different number of squares" reason (needs a square count in
  // lib/graph.js, a checkNeitherReason case, and a generator in _neitherByReason
  // below).
};

const COPY = {
  info: 'Are these two graphs equal, isomorphic, or neither?',
  promptTitle: 'Here are two graphs...',
  promptSubtitle: 'Compare their structure and relationships.',
  graph: k => `Graph ${k}`,
  hint: 'Hint: you can click and drag vertices to get a better look. Try rearranging them to get them to match up. Only click isomorphic if they are not also equal.',
  part1Title: 'Part 1 — How are these graphs related?',
  choices: { equal: 'Equal', isomorphic: 'Isomorphic', neither: 'Neither' },
  equalCorrect: 'These two graphs are equal.',
  part1Wrong: scenario => `These graphs are actually ${{
    equal: 'equal (they have the same labels and relationships)',
    isomorphic: 'isomorphic (there is a way of relabeling that makes them equal)',
    neither: 'neither equal nor isomorphic',
  }[scenario]}.`,
  reasonTitle: 'Part 2 — Why are they not isomorphic?',
  reasonSubtitle: 'Select the best reason.',
  reasonMissing: 'Pick a reason before submitting.',
  reasonCorrect: label => `${label} — that property differs between the two graphs.`,
  reasonWrong: label => `That property is actually the same in both graphs. A valid reason is: <strong>${escapeHtml(label)}</strong>.`,
  mappingTitle: 'Part 2 — Specify the isomorphism',
  mappingSubtitle: 'For each vertex in Graph 1, select the corresponding vertex in Graph 2.',
  mappingMissing: 'Pick a vertex in Graph 2 for every vertex in Graph 1.',
  mappingCorrect: map => `The mapping ${map} is a valid isomorphism.`,
  mappingWrong: map => `That correspondence does not preserve all relationships. A correct answer could be: <strong>${escapeHtml(map)}</strong>.`,
  submit: 'Submit',
};

// ---- Puzzle generation and checking ---------------------------------------

/** Vertex-count range for isomorphism puzzles.  Change [min, max] to tune difficulty. */
const ISO_PUZZLE_N_RANGE = [4, 6];

/**
 * Check whether a user-supplied reason for non-isomorphism is actually true
 * for the given pair of graphs.
 * @param {object} g1
 * @param {object} g2
 * @param {string} reason
 * @returns {boolean}
 */
export function checkNeitherReason(g1, g2, reason) {
    const i1 = graphInvariants(g1);
    const i2 = graphInvariants(g2);
    switch (reason) {
        case 'diff_vertices':   return i1.n          !== i2.n;
        case 'diff_edges':      return i1.edgeCount  !== i2.edgeCount;
        case 'diff_degree_seq': return i1.degSeq     !== i2.degSeq;
        case 'diff_components': return i1.components !== i2.components;
        case 'diff_triangles':  return i1.triangles  !== i2.triangles;
    }
    return false;
}

// ---------------------------------------------------------------------------
// Internal helpers for puzzle generation
// ---------------------------------------------------------------------------

/**
 * Generate a random connected undirected simple graph suitable for iso puzzles.
 * @param {number} n
 * @returns {object}
 */
function _isoBaseGraph(n) {
    const minE = n - 1;
    const maxE = Math.min(Math.floor(n * 1.5), (n * (n - 1)) / 2);
    const target = Math.floor(Math.random() * (maxE - minE + 1)) + minE;
    return generateSimpleGraph(n, target);
}

/**
 * Random spanning tree returned as index pairs [[a,b], …].
 * @param {number} n
 * @returns {Array<[number,number]>}
 */
function _randomSpanningTreePairs(n) {
    const order = shuffle(Array.from({ length: n }, (_, i) => i));
    return order.slice(1).map((v, i) => [order[i], v]);
}

/**
 * Attempt up to maxSwaps random 2-opt degree-preserving swaps until the
 * triangle count of the graph changes.  Returns the modified graph, or null
 * if no triangle-changing swap was found.
 *
 * A 2-opt swap: pick two edges (a−b) and (c−d) with all 4 endpoints distinct
 * and neither a−c nor b−d already present; replace with a−c and b−d.
 * This is degree-preserving by construction.
 * @param {object} graph
 * @param {number} [maxSwaps=80]
 * @returns {object|null}
 */
function _swapToChangeTriangles(graph, maxSwaps = 80) {
    const origTri = countTriangles(graph);
    let edges = graph.edges.map(e => ({ ...e }));

    for (let attempt = 0; attempt < maxSwaps; attempt++) {
        const simples = edges.filter(e => vertexIndex(e.source) !== vertexIndex(e.target));
        if (simples.length < 2) break;

        const i = Math.floor(Math.random() * simples.length);
        let   j = Math.floor(Math.random() * (simples.length - 1));
        if (j >= i) j++;

        const ea = simples[i], eb = simples[j];
        const a = vertexIndex(ea.source), b = vertexIndex(ea.target);
        const c = vertexIndex(eb.source), d = vertexIndex(eb.target);
        if (new Set([a, b, c, d]).size < 4) continue;

        const edgeSet = new Set(edges.map(e => {
            const s = vertexIndex(e.source), t = vertexIndex(e.target);
            return `${Math.min(s, t)}-${Math.max(s, t)}`;
        }));
        const k1 = `${Math.min(a, c)}-${Math.max(a, c)}`;
        const k2 = `${Math.min(b, d)}-${Math.max(b, d)}`;
        if (edgeSet.has(k1) || edgeSet.has(k2)) continue;

        // Tentatively apply the swap
        const trial = edges.map(e =>
            e === ea ? { ...e, source: vertexId(a), target: vertexId(c) } :
            e === eb ? { ...e, source: vertexId(b), target: vertexId(d) } : e
        );
        const newTri = countTriangles({ ...graph, edges: trial });
        if (newTri !== origTri) return { ...graph, edges: trial };
        edges = trial; // continue walking from new state
    }
    return null;
}

// ---------------------------------------------------------------------------
// Neither-reason sub-generators
// ---------------------------------------------------------------------------

function _neitherByReason(reason, n, nMin, nMax) {
    switch (reason) {

        case 'diff_vertices': {
            const n1 = Math.floor(Math.random() * (nMax - nMin)) + nMin;
            const n2 = n1 < nMax ? n1 + 1 : n1 - 1;
            return { g1: _isoBaseGraph(n1), g2: _isoBaseGraph(n2) };
        }

        case 'diff_edges': {
            for (let attempt = 0; attempt < 40; attempt++) {
                const g1 = _isoBaseGraph(n);
                const g2 = _isoBaseGraph(n);
                if (g1.edges.length !== g2.edges.length) return { g1, g2 };
            }
            return null;
        }

        case 'diff_degree_seq': {
            // Prefer pairs with the same edge count for a cleaner puzzle
            for (let attempt = 0; attempt < 50; attempt++) {
                const g1 = _isoBaseGraph(n);
                const g2 = _isoBaseGraph(n);
                const d1 = degreeSequence(g1).join(',');
                const d2 = degreeSequence(g2).join(',');
                if (g1.edges.length === g2.edges.length && d1 !== d2) return { g1, g2 };
            }
            // Fallback: any different degree sequence
            for (let attempt = 0; attempt < 30; attempt++) {
                const g1 = _isoBaseGraph(n);
                const g2 = _isoBaseGraph(n);
                const d1 = degreeSequence(g1).join(',');
                const d2 = degreeSequence(g2).join(',');
                if (d1 !== d2) return { g1, g2 };
            }
            return null;
        }

        case 'diff_components': {
            if (n < 4) return null;
            // g1 is connected; g2 is deliberately disconnected (two components)
            const g1    = _isoBaseGraph(n);
            const split = Math.max(2, Math.floor(n / 2));
            const e1 = _randomSpanningTreePairs(split).map(([a, b]) =>
                ({ source: vertexId(a), target: vertexId(b), label: null }));
            const e2 = _randomSpanningTreePairs(n - split).map(([a, b]) =>
                ({ source: vertexId(a + split), target: vertexId(b + split), label: null }));
            const g2 = { n, names: makeLabels(n), directed: false, edgeLabel: null, edges: [...e1, ...e2] };
            if (componentCount(g2) > 1) return { g1, g2 };
            return null;
        }

        case 'diff_triangles': {
            // Strategy A: 2-opt swap that changes triangles while preserving degree sequence
            for (let attempt = 0; attempt < 20; attempt++) {
                const g1      = _isoBaseGraph(n);
                const swapped = _swapToChangeTriangles(g1);
                if (!swapped) continue;
                const d1 = degreeSequence(g1).join(',');
                const d2 = degreeSequence(swapped).join(',');
                if (d1 === d2) return { g1, g2: swapped };
            }
            // Strategy B: two independent graphs, same n/|E|/degSeq, different triangles
            for (let attempt = 0; attempt < 40; attempt++) {
                const g1 = _isoBaseGraph(n);
                const g2 = _isoBaseGraph(n);
                const i1 = graphInvariants(g1);
                const i2 = graphInvariants(g2);
                if (i1.edgeCount === i2.edgeCount &&
                    i1.degSeq    === i2.degSeq    &&
                    i1.triangles !== i2.triangles) return { g1, g2 };
            }
            // Strategy C: just different triangle counts (any degree sequences)
            for (let attempt = 0; attempt < 40; attempt++) {
                const g1 = _isoBaseGraph(n);
                const g2 = _isoBaseGraph(n);
                if (countTriangles(g1) !== countTriangles(g2)) return { g1, g2 };
            }
            return null;
        }
    }
    return null;
}

// ---------------------------------------------------------------------------
// Public puzzle factory
// ---------------------------------------------------------------------------

/**
 * Return true when two undirected simple graphs have identical edge sets
 * (same n and same set of sorted label pairs).
 * @param {object} ga
 * @param {object} gb
 * @returns {boolean}
 */
function _graphsEqual(ga, gb) {
    if (ga.n !== gb.n || ga.edges.length !== gb.edges.length) return false;
    const key = e => {
        const s = vertexLabel(e.source, ga.names);
        const t = vertexLabel(e.target, ga.names);
        return [s, t].sort().join('--');
    };
    const setA = new Set(ga.edges.map(key));
    const setB = new Set(gb.edges.map(e => {
        const s = vertexLabel(e.source, gb.names);
        const t = vertexLabel(e.target, gb.names);
        return [s, t].sort().join('--');
    }));
    if (setA.size !== setB.size) return false;
    for (const k of setA) if (!setB.has(k)) return false;
    return true;
}

/**
 * Generate a random isomorphism puzzle consisting of two undirected simple graphs.
 *
 * Returns an object extended with:
 *   scenario   'equal' | 'isomorphic' | 'neither'
 *   witness    { [g1Label]: g2Label }   (only for 'isomorphic')
 *   reason     string                  (only for 'neither')
 *
 * @returns {{ g1: object, g2: object, scenario: string, witness?: object, reason?: string }}
 */
export function generateIsoPuzzle() {
    const [nMin, nMax] = ISO_PUZZLE_N_RANGE;
    const n    = Math.floor(Math.random() * (nMax - nMin + 1)) + nMin;
    const roll = Math.random();

    // ── Equal (⅓) ─────────────────────────────────────────────────────────────
    if (roll < 1 / 3) {
        const g = _isoBaseGraph(n);
        return { g1: g, g2: g, scenario: 'equal' };
    }

    // ── Isomorphic (⅓) ────────────────────────────────────────────────────────
    if (roll < 2 / 3) {
        // Outer loop: try different base graphs.
        // Inner loop: try many permutations of the same base graph before giving up.
        // This handles highly-symmetric graphs (K_n, cycles, etc.) where most or
        // all permutations are automorphisms.
        for (let baseAttempt = 0; baseAttempt < 10; baseAttempt++) {
            const g1    = _isoBaseGraph(n);
            const perms = Array.from({ length: n }, (_, i) => i);
            for (let permAttempt = 0; permAttempt < 20; permAttempt++) {
                const sigma = shuffle(perms.slice());
                if (sigma.every((v, i) => v === i)) continue;          // identity
                const g2 = applyPermutation(g1, sigma);
                if (_graphsEqual(g1, g2)) continue;                    // automorphism
                const witness = {};
                for (let i = 0; i < n; i++) witness[g1.names[i]] = g1.names[sigma[i]];
                return { g1, g2, scenario: 'isomorphic', witness };
            }
            // All permutations of this graph were automorphisms — try a new base graph.
        }
        // Every candidate base graph was fully symmetric.  Fall through to 'neither'
        // rather than quietly returning 'equal', so the scenario distribution stays fair.
    }

    // ── Neither (⅓) — pick one of 5 sub-reasons ──────────────────────────────
    const reasons = shuffle(['diff_vertices', 'diff_edges', 'diff_degree_seq',
                             'diff_components', 'diff_triangles']);
    for (const reason of reasons) {
        const result = _neitherByReason(reason, n, nMin, nMax);
        if (result) return { ...result, scenario: 'neither', reason };
    }

    // Ultimate fallback
    const g1 = _isoBaseGraph(n);
    const g2 = _isoBaseGraph(n + (n < nMax ? 1 : -1));
    return { g1, g2, scenario: 'neither', reason: 'diff_vertices' };
}

const mapText = map => Object.entries(map).map(([a, b]) => `${a}→${b}`).join(', ');

let root, score, views, puzzle;
const $ = selector => root.querySelector(selector);

function newQuestion() {
  puzzle = generateIsoPuzzle();
  [puzzle.g1, puzzle.g2].forEach((g, k) => {
    views[k].drawCircle(g, shuffle(Array.from({ length: g.n }, (_, i) => i)), { announce: k === 0 });
  });

  resetChoices($('.part1'));
  $('.part2-reason').hidden = true;
  $('.part2-mapping').hidden = true;
  $('.reason-options').innerHTML = Object.entries(ISO_REASON_LABELS).map(([value, label]) => `
    <label><input type="radio" name="iso-reason" value="${value}"> ${label}</label>`).join('');
  $('.mapping-rows').innerHTML = puzzle.g1.names.map((name, i) => `
    <div class="mapping-row">
      <label for="iso-map-${i}">${escapeHtml(name)} →</label>
      <select id="iso-map-${i}" data-from="${escapeHtml(name)}">
        <option value="">—</option>
        ${puzzle.g2.names.map(n2 => `<option value="${escapeHtml(n2)}">${escapeHtml(n2)}</option>`).join('')}
      </select>
    </div>`).join('');
  root.querySelectorAll('.part2-reason button, .part2-mapping button').forEach(b => { b.disabled = false; });
  root.querySelectorAll('.input-error').forEach(el => { el.textContent = ''; });
  hideFeedback($('.feedback'));
}

function finish(part, correct, messageHtml) {
  root.querySelectorAll(`${part} input, ${part} select, ${part} button`).forEach(el => { el.disabled = true; });
  showFeedback($('.feedback'), { correct, messageHtml });
  $('.feedback-next').focus();
}

function answerPart1(btn) {
  const answer = btn.dataset.answer;
  const correct = answer === puzzle.scenario;
  lockChoices($('.part1'), btn, correct);
  // Equal has no part 2, so a right answer is worth the whole point.
  score.record(correct ? (puzzle.scenario === 'equal' ? 1 : 0.5) : 0);
  if (!correct) return finish('.part1', false, escapeHtml(COPY.part1Wrong(puzzle.scenario)));
  if (puzzle.scenario === 'equal') return finish('.part1', true, escapeHtml(COPY.equalCorrect));
  const part = puzzle.scenario === 'neither' ? '.part2-reason' : '.part2-mapping';
  $(part).hidden = false;
  $(part).querySelector('input, select').focus();
}

function submitReason() {
  const checked = root.querySelector('input[name="iso-reason"]:checked');
  if (!checked) {
    $('.part2-reason .input-error').textContent = COPY.reasonMissing;
    return;
  }
  $('.part2-reason .input-error').textContent = '';
  const valid = checkNeitherReason(puzzle.g1, puzzle.g2, checked.value);
  if (valid) score.addPoints(0.5);
  finish('.part2-reason', valid, valid
    ? escapeHtml(COPY.reasonCorrect(ISO_REASON_LABELS[checked.value]))
    : COPY.reasonWrong(ISO_REASON_LABELS[puzzle.reason] ?? puzzle.reason));
}

function submitMapping() {
  const selects = [...root.querySelectorAll('.mapping-rows select')];
  selects.forEach(s => s.classList.toggle('is-invalid', !s.value));
  if (selects.some(s => !s.value)) {
    $('.part2-mapping .input-error').textContent = COPY.mappingMissing;
    return;
  }
  $('.part2-mapping .input-error').textContent = '';
  const map = Object.fromEntries(selects.map(s => [s.dataset.from, s.value]));
  const valid = verifyIsomorphismWitness(puzzle.g1, puzzle.g2, map);
  if (valid) score.addPoints(0.5);
  finish('.part2-mapping', valid, valid
    ? escapeHtml(COPY.mappingCorrect(mapText(map)))
    : COPY.mappingWrong(mapText(puzzle.witness)));
}

export default {
  scored: true,

  mount(el, ctx) {
    root = el;
    score = ctx.score;
    loadStylesheet(new URL('./iso.css', import.meta.url));
    root.innerHTML = `
      <div class="info"><p>${COPY.info}</p></div>
      <div class="section">
        <h2>${COPY.promptTitle}</h2>
        <p class="subtitle">${COPY.promptSubtitle}</p>
        <h3 class="graph-label">${COPY.graph(1)}</h3>
        <div class="graph-slot-1"></div>
        <h3 class="graph-label">${COPY.graph(2)}</h3>
        <div class="graph-slot-2"></div>
        <p class="hint">${COPY.hint}</p>
      </div>

      <div class="section part1">
        <h2>${COPY.part1Title}</h2>
        <div class="choice-row">
          ${Object.entries(COPY.choices).map(([value, label]) =>
            `<button type="button" class="choice-btn" data-answer="${value}">${label}</button>`).join('')}
        </div>
      </div>

      <form class="section part2-reason" hidden>
        <h2>${COPY.reasonTitle}</h2>
        <p class="subtitle">${COPY.reasonSubtitle}</p>
        <fieldset class="option-list is-vertical reason-options"><legend class="sr-only">${COPY.reasonTitle}</legend></fieldset>
        <button type="submit" class="primary-btn">${COPY.submit}</button>
        <p class="input-error" role="alert"></p>
      </form>

      <form class="section part2-mapping" hidden>
        <h2>${COPY.mappingTitle}</h2>
        <p class="subtitle">${COPY.mappingSubtitle}</p>
        <div class="mapping-rows"></div>
        <button type="submit" class="primary-btn">${COPY.submit}</button>
        <p class="input-error" role="alert"></p>
      </form>

      ${feedbackHtml()}`;

    views = [1, 2].map(k => createGraphView($(`.graph-slot-${k}`), { label: `${COPY.graph(k)} diagram`, compact: true }));
    root.querySelectorAll('.part1 .choice-btn').forEach(btn => btn.addEventListener('click', () => answerPart1(btn)));
    for (const [selector, handler] of [['.part2-reason', submitReason], ['.part2-mapping', submitMapping]]) {
      $(selector).addEventListener('submit', event => {
        event.preventDefault();
        if (!$(selector).querySelector('[type="submit"]').disabled) handler();
      });
    }
    $('.mapping-rows').addEventListener('change', event => event.target.classList.remove('is-invalid'));
    $('.feedback-next').addEventListener('click', newQuestion);
    newQuestion();
  },

  reset() {
    newQuestion();
  },
};

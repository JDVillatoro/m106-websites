// Isomorphism: are two graphs equal, isomorphic, or neither? If isomorphic,
// give the isomorphism; if neither, give a reason.
// Ported from legacy/graph-theory/iso-mode.js. Puzzles and checks are in
// lib/graph.js (generateIsoPuzzle, checkNeitherReason, verifyIsomorphismWitness).

import { shuffle, generateIsoPuzzle, checkNeitherReason, verifyIsomorphismWitness } from '../lib/graph.js';
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
  // lib/graph.js, a checkNeitherReason case, and a generator in _neitherByReason).
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

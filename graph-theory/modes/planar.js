// Planar Graphs: is the graph planar? If it is, count its vertices, edges and
// faces; if not, say whether it contains K5 or K3,3.
// Ported from legacy/graph-theory/planar-mode.js; spec in planar.md.

import {
  shuffle, generatePlanarGraph, generateNonPlanarGraph, vertexCount, edgeCount, faceCount,
} from '../lib/graph.js';
import { createGraphView } from '../lib/render.js';
import {
  escapeHtml, feedbackHtml, showFeedback, hideFeedback, lockChoices, resetChoices,
} from '../../shared/js/ui.js';

/** Difficulty settings (see planar.md). */
export const PLANAR_MODE_CONFIG = {
  nMin: 6,
  nMax: 8,
  planarExtraEdgeFactorMin: 1.14,
  planarExtraEdgeFactorMax: 1.55,
  nonPlanarExtraEdgeSlackMax: 2,
};

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/** A random puzzle: a graph plus isPlanar and, if not planar, its obstruction. */
export function generatePlanarPuzzle() {
  const n = randInt(PLANAR_MODE_CONFIG.nMin, PLANAR_MODE_CONFIG.nMax);
  if (Math.random() < 0.5) {
    const graph = generatePlanarGraph(n, PLANAR_MODE_CONFIG.planarExtraEdgeFactorMin, PLANAR_MODE_CONFIG.planarExtraEdgeFactorMax);
    return { ...graph, isPlanar: true, obstruction: null };
  }
  const obstruction = (n >= 6 && Math.random() < 0.5) ? 'K3,3' : 'K5';
  const graph = generateNonPlanarGraph(
    n, obstruction, PLANAR_MODE_CONFIG.nonPlanarExtraEdgeSlackMax,
    PLANAR_MODE_CONFIG.planarExtraEdgeFactorMin, PLANAR_MODE_CONFIG.planarExtraEdgeFactorMax,
  );
  return { ...graph, isPlanar: false, obstruction };
}

const COPY = {
  info: 'Can you tell if this graph is planar?',
  promptTitle: 'Here is a graph...',
  promptSubtitle: "Can you tell if it's a planar graph?",
  hint: 'Hint: try clicking and dragging the vertices to see if you can untangle the graph.',
  part1Title: 'Part 1 — Is this graph planar?',
  yes: 'Planar',
  no: 'Not Planar',
  part1Wrong: puzzle => `Actually this graph is ${puzzle.isPlanar ? 'planar' : 'not planar'}.`,
  countsLead: "That's right, the graph is planar!",
  countsTitle: 'Part 2 — How many vertices, edges, and faces does this graph have?',
  vertices: 'Vertices:',
  edges: 'Edges:',
  faces: 'Faces:',
  countsMissing: 'Fill in all three numbers.',
  countsCorrect: "That's the correct number of vertices, edges, and faces.",
  countsWrong: (v, e, f) => `The graph has ${v} vertices, ${e} edges, and ${f} faces.`,
  whyLead: "That's right, the graph is not planar!",
  whyTitle: 'Part 2 — Can you tell why?',
  k5: 'It contains a K5 subgraph',
  k33: 'It contains a K3,3 subgraph',
  why: obstruction => `This graph contains a ${obstruction} subgraph.`,
  submit: 'Submit',
};

let root, score, view, puzzle;
const $ = selector => root.querySelector(selector);

function draw() {
  view.drawCircle(puzzle, shuffle(Array.from({ length: puzzle.n }, (_, i) => i)));
}

function newQuestion() {
  puzzle = generatePlanarPuzzle();
  draw();
  resetChoices($('.part1'));
  resetChoices($('.part2-why'));
  $('.part2-counts').hidden = true;
  $('.part2-why').hidden = true;
  root.querySelectorAll('.part2-counts input').forEach(input => { input.value = ''; input.disabled = false; });
  $('.part2-counts [type="submit"]').disabled = false;
  $('.part2-counts .input-error').textContent = '';
  hideFeedback($('.feedback'));
}

function finish(correct, message) {
  showFeedback($('.feedback'), { correct, messageHtml: escapeHtml(message) });
  $('.feedback-next').focus();
}

function answerPart1(btn) {
  const correct = (btn.dataset.answer === 'yes') === puzzle.isPlanar;
  lockChoices($('.part1'), btn, correct);
  score.record(correct ? 0.5 : 0);
  if (!correct) return finish(false, COPY.part1Wrong(puzzle));
  const part = puzzle.isPlanar ? '.part2-counts' : '.part2-why';
  $(part).hidden = false;
  $(part).querySelector('input, button').focus();
}

function submitCounts() {
  const inputs = ['.count-v', '.count-e', '.count-f'].map(s => $(s));
  if (inputs.some(input => input.value.trim() === '')) {
    $('.part2-counts .input-error').textContent = COPY.countsMissing;
    return;
  }
  $('.part2-counts .input-error').textContent = '';
  const [v, e, f] = inputs.map(input => Number(input.value));
  const expected = [vertexCount(puzzle), edgeCount(puzzle), faceCount(puzzle)];
  const correct = v === expected[0] && e === expected[1] && f === expected[2];
  if (correct) score.addPoints(0.5);
  root.querySelectorAll('.part2-counts input, .part2-counts button').forEach(el => { el.disabled = true; });
  finish(correct, correct ? COPY.countsCorrect : COPY.countsWrong(...expected));
}

function answerWhy(btn) {
  const correct = btn.dataset.answer === puzzle.obstruction;
  lockChoices($('.part2-why'), btn, correct);
  if (correct) score.addPoints(0.5);
  finish(correct, COPY.why(puzzle.obstruction));
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

      <form class="section part2-counts" hidden>
        <h2>${COPY.countsLead}</h2>
        <p class="subtitle">${COPY.countsTitle}</p>
        <div class="answer-row">
          <label for="planar-v">${COPY.vertices}</label>
          <input type="number" id="planar-v" class="count-v count-input" min="0">
          <label for="planar-e">${COPY.edges}</label>
          <input type="number" id="planar-e" class="count-e count-input" min="0">
          <label for="planar-f">${COPY.faces}</label>
          <input type="number" id="planar-f" class="count-f count-input" min="0">
          <button type="submit" class="primary-btn">${COPY.submit}</button>
        </div>
        <p class="input-error" role="alert"></p>
      </form>

      <div class="section part2-why" hidden>
        <h2>${COPY.whyLead}</h2>
        <p class="subtitle">${COPY.whyTitle}</p>
        <div class="choice-row">
          <button type="button" class="choice-btn" data-answer="K5">${COPY.k5}</button>
          <button type="button" class="choice-btn" data-answer="K3,3">${COPY.k33}</button>
        </div>
      </div>

      ${feedbackHtml()}`;

    view = createGraphView($('.graph-slot'));
    root.querySelectorAll('.part1 .choice-btn').forEach(btn => btn.addEventListener('click', () => answerPart1(btn)));
    root.querySelectorAll('.part2-why .choice-btn').forEach(btn => btn.addEventListener('click', () => answerWhy(btn)));
    $('.part2-counts').addEventListener('submit', event => {
      event.preventDefault();
      if (!$('.part2-counts [type="submit"]').disabled) submitCounts();
    });
    $('.feedback-next').addEventListener('click', newQuestion);
    newQuestion();
  },

  reset() {
    newQuestion();
  },
};

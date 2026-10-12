// Degree Sequences: read a graph and type its degree sequence.
// Ported from legacy/graph-theory/degree-mode.js.

import { degreeSequence, vertexId } from '../lib/graph/core.js';
import { generateSimpleGraph } from '../lib/graph/generate.js';
import { createGraphView } from '../lib/render.js';
import { escapeHtml, feedbackHtml, showFeedback, hideFeedback } from '../../shared/js/ui.js';

const COPY = {
  promptTitle: 'Here is a graph...',
  promptSubtitle: 'Can you determine the degree sequence?',
  hint: 'Hint: you can click and drag vertices to get a better look.',
  answerTitle: 'Input the degree sequence',
  answerLabel: 'Degree sequence =',
  answerPlaceholder: 'use curly brackets like {1,2,3,3,4}',
  submit: 'Submit answer',
  badFormat: 'Enter whole numbers separated by commas, like {1,2,3,3,4}.',
  correct: 'That is the degree sequence.',
  incorrect: expected => `The correct degree sequence was {${expected.join(',')}}.`,
};

/**
 * Read a typed degree sequence: whole numbers separated by commas, with or
 * without curly brackets, in any order. Returns the numbers sorted, or null
 * if the text isn't in that format.
 * @param {string} text
 * @returns {number[] | null}
 */
export function parseDegreeSequence(text) {
  let s = String(text ?? '').replace(/\s+/g, '');
  if (s.startsWith('{') && s.endsWith('}')) s = s.slice(1, -1);
  if (s === '') return null;
  const parts = s.split(',');
  if (!parts.every(p => /^\d+$/.test(p))) return null;
  return parts.map(Number).sort((a, b) => a - b);
}

/** A random graph on 3–7 vertices; half the time with a few loops or parallel edges. */
function newGraph() {
  const n = Math.floor(Math.random() * 5) + 3;
  const graph = generateSimpleGraph(n);
  if (Math.random() < 0.5) {
    const extra = Math.floor(Math.random() * 3) + 1;
    for (let k = 0; k < extra; k++) {
      if (Math.random() < 0.5) {
        const v = vertexId(Math.floor(Math.random() * n));
        graph.edges.push({ source: v, target: v, label: null });
      } else {
        const i = Math.floor(Math.random() * n);
        const j = (i + 1 + Math.floor(Math.random() * (n - 1))) % n;
        graph.edges.push({ source: vertexId(i), target: vertexId(j), label: null });
      }
    }
  }
  return graph;
}

let root, score, view, expected;
const $ = selector => root.querySelector(selector);

function newQuestion() {
  const graph = newGraph();
  expected = degreeSequence(graph);
  view.draw(graph);

  const input = $('.degree-answer');
  input.value = '';
  input.disabled = false;
  input.classList.remove('is-invalid');
  $('.input-error').textContent = '';
  $('.degree-submit').hidden = false;
  hideFeedback($('.feedback'));
}

function submit() {
  const input = $('.degree-answer');
  const got = parseDegreeSequence(input.value);
  if (got === null) {
    input.classList.add('is-invalid');
    $('.input-error').textContent = COPY.badFormat;
    input.focus();
    return;
  }

  input.classList.remove('is-invalid');
  $('.input-error').textContent = '';
  const correct = got.length === expected.length && got.every((d, i) => d === expected[i]);
  score.record(correct ? 1 : 0);

  input.disabled = true;
  $('.degree-submit').hidden = true;
  showFeedback($('.feedback'), {
    correct,
    messageHtml: escapeHtml(correct ? COPY.correct : COPY.incorrect(expected)),
  });
  $('.feedback-next').focus();
}

export default {
  scored: true,

  mount(el, ctx) {
    root = el;
    score = ctx.score;
    root.innerHTML = `
      <div class="section">
        <h2>${COPY.promptTitle}</h2>
        <p class="subtitle">${COPY.promptSubtitle}</p>
        <div class="graph-slot"></div>
        <p class="hint">${COPY.hint}</p>
      </div>
      <form class="section degree-form">
        <h2>${COPY.answerTitle}</h2>
        <div class="answer-row">
          <label for="degree-answer">${COPY.answerLabel}</label>
          <input type="text" id="degree-answer" class="degree-answer" autocomplete="off"
            placeholder="${escapeHtml(COPY.answerPlaceholder)}" aria-describedby="degree-error">
          <button type="submit" class="primary-btn degree-submit">${COPY.submit}</button>
        </div>
        <p class="input-error" id="degree-error" role="alert"></p>
      </form>
      ${feedbackHtml()}`;

    view = createGraphView($('.graph-slot'));
    $('.degree-form').addEventListener('submit', event => {
      event.preventDefault();
      if (!$('.degree-answer').disabled) submit();
    });
    $('.feedback-next').addEventListener('click', () => {
      newQuestion();
      $('.degree-answer').focus();
    });
    newQuestion();
  },

  reset() {
    newQuestion();
  },
};

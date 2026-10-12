// Best Response: one player's choice is given; pick all of the other player's
// best responses. Ported from the "training" section of legacy/game-theory/script.js.

import { generateRandomPayoffs, calculateBestResponses } from '../lib/game.js';
import { renderPayoffMatrix, strategyLabel } from '../lib/matrix-view.js';
import { typeset, clearMath, plainMath } from '../../shared/js/math.js';
import { escapeHtml, feedbackHtml, showFeedback, hideFeedback } from '../../shared/js/ui.js';

const playerName = p => `Player ${p}`;

const COPY = {
  matrixTitle: 'Payoff matrix',
  prompt: (fixed, label, response) =>
    `${playerName(fixed)} picks <strong>${escapeHtml(label)}</strong>. What are ${playerName(response)}'s best responses?`,
  answerTitle: response => `Select ${playerName(response)}'s best responses`,
  nothingSelected: 'Select at least one strategy before submitting.',
  submit: 'Submit answer',
  correct: 'Those are all the best responses.',
  incorrect: (response, labels) => `${playerName(response)}'s best ${labels.length === 1 ? 'response is' : 'responses are'} ${labels.join(', ')}. They're highlighted in the matrix.`,
};

/**
 * A random problem. 40% of the time we want more than one best response; if
 * the first matrix doesn't match that, we try once more (as the old site did).
 */
export function generateBestResponseProblem() {
  const rows = Math.floor(Math.random() * 2) + 2;
  const cols = Math.floor(Math.random() * 2) + 2;
  const wantMultiple = Math.random() < 0.4;
  const fixedPlayer = Math.random() < 0.5 ? 1 : 2;
  const pick = () => {
    const payoffs = generateRandomPayoffs(rows, cols);
    const fixedIndex = Math.floor(Math.random() * (fixedPlayer === 1 ? rows : cols));
    return { payoffs, fixedIndex, best: calculateBestResponses(payoffs, rows, cols, fixedPlayer, fixedIndex) };
  };
  let p = pick();
  if ((p.best.length > 1) !== wantMultiple) p = pick();
  return { rows, cols, fixedPlayer, responsePlayer: fixedPlayer === 1 ? 2 : 1, ...p };
}

let root, score, problem, cells, selected;
const $ = selector => root.querySelector(selector);
const labelOf = (index, player) => strategyLabel(index, player, player === 1 ? problem.rows : problem.cols);

function newQuestion() {
  problem = generateBestResponseProblem();
  selected = new Set();
  const { rows, cols, payoffs, fixedPlayer, fixedIndex, responsePlayer } = problem;
  cells = renderPayoffMatrix($('.matrix-slot'), { rows, cols, payoffs });

  clearMath([$('.prompt'), $('.response-buttons')]);
  $('.prompt').innerHTML = COPY.prompt(fixedPlayer, labelOf(fixedIndex, fixedPlayer), responsePlayer);
  $('.answer-title').textContent = COPY.answerTitle(responsePlayer);
  const count = responsePlayer === 1 ? rows : cols;
  $('.response-buttons').innerHTML = Array.from({ length: count }, (_, i) => `
    <button type="button" class="choice-btn" data-index="${i}" aria-pressed="false"
      aria-label="${escapeHtml(plainMath(labelOf(i, responsePlayer)))}">${escapeHtml(labelOf(i, responsePlayer))}</button>`).join('');
  typeset([$('.prompt'), $('.response-buttons')]);

  $('.br-submit').disabled = false;
  $('.input-error').textContent = '';
  hideFeedback($('.feedback'));
}

function toggle(btn) {
  if ($('.br-submit').disabled) return;
  const i = Number(btn.dataset.index);
  if (selected.has(i)) selected.delete(i); else selected.add(i);
  btn.classList.toggle('is-selected', selected.has(i));
  btn.setAttribute('aria-pressed', String(selected.has(i)));
  $('.input-error').textContent = '';
}

function submit() {
  if (selected.size === 0) {
    $('.input-error').textContent = COPY.nothingSelected;
    return;
  }
  const { best, responsePlayer, fixedIndex } = problem;
  const correct = selected.size === best.length && best.every(i => selected.has(i));
  score.record(correct ? 1 : 0);

  $('.br-submit').disabled = true;
  root.querySelectorAll('.response-buttons .choice-btn').forEach(btn => {
    btn.disabled = true;
    const i = Number(btn.dataset.index);
    if (selected.has(i)) btn.classList.add(best.includes(i) ? 'is-correct' : 'is-wrong');
  });

  let message = escapeHtml(COPY.correct);
  if (!correct) {
    for (const i of best) {
      cells.get(responsePlayer === 1 ? `${i}-${fixedIndex}` : `${fixedIndex}-${i}`).classList.add('is-answer');
    }
    message = escapeHtml(COPY.incorrect(responsePlayer, best.map(i => plainMath(labelOf(i, responsePlayer)))));
  }
  showFeedback($('.feedback'), { correct, messageHtml: message });
  $('.feedback-next').focus();
}

export default {
  scored: true,

  mount(el, ctx) {
    root = el;
    score = ctx.score;
    root.innerHTML = `
      <div class="question">
        <div class="section">
          <h2>${COPY.matrixTitle}</h2>
          <p class="subtitle prompt"></p>
          <div class="matrix-slot"></div>
        </div>
        <div class="section">
          <h2 class="answer-title"></h2>
          <div class="choice-row response-buttons"></div>
          <div class="button-row">
            <button type="button" class="primary-btn br-submit">${COPY.submit}</button>
          </div>
          <p class="input-error" role="alert"></p>
        </div>
      </div>
      ${feedbackHtml()}`;

    $('.response-buttons').addEventListener('click', event => {
      const btn = event.target.closest('.choice-btn');
      if (btn) toggle(btn);
    });
    $('.br-submit').addEventListener('click', submit);
    $('.feedback-next').addEventListener('click', newQuestion);
    newQuestion();
  },

  reset() {
    newQuestion();
  },
};

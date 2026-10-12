// Expected Payoff: one player uses a mixed strategy; find the other player's
// expected payoff for one of their pure strategies.
// Ported from the expected payoff section of legacy/game-theory/script.js.

import { generateRandomPayoffs, generateMixedStrategy, calculateExpectedValue } from '../lib/game.js';
import { renderPayoffMatrix, strategyLabel } from '../lib/matrix-view.js';
import { typeset, clearMath } from '../../shared/js/math.js';
import { escapeHtml, feedbackHtml, showFeedback, hideFeedback } from '../../shared/js/ui.js';

/** Answers within this of the exact value count as correct. */
export const EP_TOLERANCE = 0.01;

const COPY = {
  matrixTitle: 'Payoff matrix',
  prompt: 'Calculate the expected payoff.',
  questionTitle: 'Question',
  question: (mixed, mix, asked, label) =>
    `<strong>Player ${mixed}</strong> is using a mixed strategy: <strong>${mix}</strong>.<br><br>`
    + `What is <strong>Player ${asked}</strong>'s expected payoff if they play strategy <strong>${escapeHtml(label)}</strong>?`,
  answerLabel: 'Your answer:',
  placeholder: 'Enter expected payoff',
  notANumber: 'Enter a number.',
  submit: 'Submit answer',
  correct: value => `The expected payoff is ${value.toFixed(2)}.`,
  incorrect: value => `The correct expected payoff is ${value.toFixed(2)}.`,
};

export function generateExpectedPayoffProblem() {
  const rows = Math.floor(Math.random() * 2) + 2;
  const cols = Math.floor(Math.random() * 2) + 2;
  const payoffs = generateRandomPayoffs(rows, cols);
  const mixedPlayer = Math.random() < 0.5 ? 1 : 2;
  const askedPlayer = mixedPlayer === 1 ? 2 : 1;
  const mix = generateMixedStrategy(mixedPlayer === 1 ? rows : cols);
  const askedStrategy = Math.floor(Math.random() * (askedPlayer === 1 ? rows : cols));
  const answer = calculateExpectedValue(payoffs, rows, cols, askedPlayer, askedStrategy, mix);
  return { rows, cols, payoffs, mixedPlayer, askedPlayer, mix, askedStrategy, answer };
}

let root, score, problem;
const $ = selector => root.querySelector(selector);

function newQuestion() {
  problem = generateExpectedPayoffProblem();
  const { rows, cols, payoffs, mixedPlayer, askedPlayer, mix, askedStrategy } = problem;
  renderPayoffMatrix($('.matrix-slot'), { rows, cols, payoffs });
  const count = p => (p === 1 ? rows : cols);
  // Strategies played with probability 0 aren't listed, as before.
  const mixText = mix.map((prob, i) => (prob > 0
    ? `${Math.round(prob * 100)}% ${escapeHtml(strategyLabel(i, mixedPlayer, count(mixedPlayer)))}`
    : null)).filter(Boolean).join(', ');
  clearMath($('.question-text'));
  $('.question-text').innerHTML = COPY.question(mixedPlayer, mixText, askedPlayer,
    strategyLabel(askedStrategy, askedPlayer, count(askedPlayer)));
  typeset($('.question-text'));

  $('.ep-answer').value = '';
  $('.ep-answer').disabled = false;
  $('.ep-form [type="submit"]').disabled = false;
  $('.input-error').textContent = '';
  hideFeedback($('.feedback'));
}

function submit() {
  const input = $('.ep-answer');
  const value = input.value.trim() === '' ? NaN : Number(input.value);
  if (Number.isNaN(value)) {
    $('.input-error').textContent = COPY.notANumber;
    input.focus();
    return;
  }
  $('.input-error').textContent = '';
  const correct = Math.abs(value - problem.answer) < EP_TOLERANCE;
  score.record(correct ? 1 : 0);
  input.disabled = true;
  $('.ep-form [type="submit"]').disabled = true;
  showFeedback($('.feedback'), {
    correct,
    messageHtml: escapeHtml(correct ? COPY.correct(problem.answer) : COPY.incorrect(problem.answer)),
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
        <h2>${COPY.matrixTitle}</h2>
        <p class="subtitle">${COPY.prompt}</p>
        <div class="matrix-slot"></div>
      </div>
      <form class="section ep-form">
        <h2>${COPY.questionTitle}</h2>
        <p class="question-text"></p>
        <div class="answer-row">
          <label for="ep-answer">${COPY.answerLabel}</label>
          <input type="number" id="ep-answer" class="ep-answer" step="0.01" placeholder="${COPY.placeholder}">
          <button type="submit" class="primary-btn">${COPY.submit}</button>
        </div>
        <p class="input-error" role="alert"></p>
      </form>
      ${feedbackHtml()}`;
    $('.ep-form').addEventListener('submit', event => {
      event.preventDefault();
      if (!$('.ep-form [type="submit"]').disabled) submit();
    });
    $('.feedback-next').addEventListener('click', newQuestion);
    newQuestion();
  },

  reset() {
    newQuestion();
  },
};

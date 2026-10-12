// Indifference: in a 2x2 game with no pure Nash equilibrium, find the mixed
// strategy for one player that makes the other indifferent.
// Ported from the indifference section of legacy/game-theory/script.js.

import { generate2x2WithoutPureNash, calculateIndifferenceProbability } from '../lib/game.js';
import { renderPayoffMatrix, strategyLabel } from '../lib/matrix-view.js';
import { typeset, clearMath, parseFraction, decimalToFraction } from '../../shared/js/math.js';
import { escapeHtml, feedbackHtml, showFeedback, hideFeedback } from '../../shared/js/ui.js';

const COPY = {
  matrixTitle: 'Payoff matrix',
  prompt: 'Find the indifference strategy.',
  questionTitle: 'Question',
  question: (mixing, other) =>
    `Find the mixed strategy for <strong>Player ${mixing}</strong> that makes <strong>Player ${other}</strong> `
    + 'indifferent between their two strategies (i.e., both strategies give the same expected payoff).<br><br>'
    + 'Enter the probabilities as fractions (must sum to 1):',
  probability: label => `Probability for ${escapeHtml(label)}:`,
  placeholder: 'e.g., 1/2',
  notFractions: 'Enter both probabilities as fractions, e.g. 1/2.',
  badSum: sum => `The probabilities must sum to 1. Your sum is ${sum.toFixed(2)}.`,
  submit: 'Submit answer',
  answer: (f1, l1, f2, l2) => `The mixed strategy is ${f1} ${escapeHtml(l1)}, ${f2} ${escapeHtml(l2)}.`,
};

/** A 2x2 game without a pure Nash equilibrium, and which player mixes. */
export function generateIndifferenceProblem() {
  for (;;) {
    const payoffs = generate2x2WithoutPureNash();
    const mixingPlayer = Math.random() < 0.5 ? 1 : 2;
    const probability = calculateIndifferenceProbability(payoffs, mixingPlayer);
    if (probability !== null && probability >= 0 && probability <= 1) return { payoffs, mixingPlayer, probability };
  }
}

let root, score, problem;
const $ = selector => root.querySelector(selector);
const labels = () => [0, 1].map(i => strategyLabel(i, problem.mixingPlayer, 2));

function newQuestion() {
  problem = generateIndifferenceProblem();
  renderPayoffMatrix($('.matrix-slot'), { rows: 2, cols: 2, payoffs: problem.payoffs });
  const [l1, l2] = labels();
  const textParts = [$('.question-text'), $('.prob-label-1'), $('.prob-label-2')];
  clearMath(textParts);
  $('.question-text').innerHTML = COPY.question(problem.mixingPlayer, problem.mixingPlayer === 1 ? 2 : 1);
  $('.prob-label-1').innerHTML = COPY.probability(l1);
  $('.prob-label-2').innerHTML = COPY.probability(l2);
  typeset(textParts);

  root.querySelectorAll('.prob-input').forEach(input => { input.value = ''; input.disabled = false; });
  $('.indiff-form [type="submit"]').disabled = false;
  $('.input-error').textContent = '';
  hideFeedback($('.feedback'));
}

function submit() {
  const [p1, p2] = [...root.querySelectorAll('.prob-input')].map(input => parseFraction(input.value));
  const error = $('.input-error');
  if (p1 === null || p2 === null) {
    error.textContent = COPY.notFractions;
    return;
  }
  if (Math.abs(p1 + p2 - 1) > 1e-9) {
    error.textContent = COPY.badSum(p1 + p2);
    return;
  }
  error.textContent = '';
  // Exact: the answers are fractions with small denominators. (The old site
  // allowed an error of 0.02, so 2/7 was accepted for 5/17.)
  const correct = Math.abs(p1 - problem.probability) < 1e-9;
  score.record(correct ? 1 : 0);
  root.querySelectorAll('.prob-input').forEach(input => { input.disabled = true; });
  $('.indiff-form [type="submit"]').disabled = true;

  const [l1, l2] = labels();
  const feedback = $('.feedback');
  clearMath(feedback);
  showFeedback(feedback, {
    correct,
    messageHtml: COPY.answer(decimalToFraction(problem.probability), l1, decimalToFraction(1 - problem.probability), l2),
  });
  typeset(feedback);
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
      <form class="section indiff-form">
        <h2>${COPY.questionTitle}</h2>
        <p class="question-text"></p>
        <div class="answer-row">
          <label for="indiff-1" class="prob-label-1"></label>
          <input type="text" id="indiff-1" class="prob-input count-input" placeholder="${COPY.placeholder}" autocomplete="off">
        </div>
        <div class="answer-row">
          <label for="indiff-2" class="prob-label-2"></label>
          <input type="text" id="indiff-2" class="prob-input count-input" placeholder="${COPY.placeholder}" autocomplete="off">
        </div>
        <div class="button-row">
          <button type="submit" class="primary-btn">${COPY.submit}</button>
        </div>
        <p class="input-error" role="alert"></p>
      </form>
      ${feedbackHtml()}`;
    $('.indiff-form').addEventListener('submit', event => {
      event.preventDefault();
      if (!$('.indiff-form [type="submit"]').disabled) submit();
    });
    $('.feedback-next').addEventListener('click', newQuestion);
    newQuestion();
  },

  reset() {
    newQuestion();
  },
};

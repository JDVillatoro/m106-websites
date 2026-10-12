// Dominance: for every pair of a player's strategies, say which (if either)
// dominates the other, weakly or strictly. Scored all or nothing, as before.
// Ported from the dominance section of legacy/game-theory/script.js.

import { generateRandomPayoffs, hasStrictDominance, getDominanceRelation } from '../lib/game.js';
import { renderPayoffMatrix, strategyLabel } from '../lib/matrix-view.js';
import { typeset, clearMath, plainMath } from '../../shared/js/math.js';
import { escapeHtml, feedbackHtml, showFeedback, hideFeedback, loadStylesheet } from '../../shared/js/ui.js';

const COPY = {
  info: 'Identify dominance relations!',
  matrixTitle: 'Payoff matrix',
  prompt: 'Identify dominance relations for each strategy pair.',
  questionsTitle: 'Dominance relations',
  player: p => `Player ${p}`,
  versus: (a, b) => `${a} vs ${b}`,
  choose: 'Select a relation',
  options: (a, b) => [
    ['A-weak', `${a} weakly dominates ${b}`],
    ['A-strict', `${a} strictly dominates ${b}`],
    ['B-weak', `${b} weakly dominates ${a}`],
    ['B-strict', `${b} strictly dominates ${a}`],
    ['none', 'No dominance relation'],
  ],
  incomplete: 'Choose a relation for every pair.',
  submit: 'Submit answer',
  result: (right, total) => `You got ${right}/${total} (${Math.round(right / total * 100)}%). The correct relations are shown above.`,
  allRight: total => `All ${total} relations are right.`,
};

/** A random matrix; if it has no strict dominance, 40% of the time try once more (as before). */
export function generateDominanceProblem() {
  const rows = Math.floor(Math.random() * 2) + 2;
  const cols = Math.floor(Math.random() * 2) + 2;
  let payoffs = generateRandomPayoffs(rows, cols);
  if (!hasStrictDominance(payoffs, rows, cols) && Math.random() < 0.4) payoffs = generateRandomPayoffs(rows, cols);
  return { rows, cols, payoffs };
}

let root, score, problem;
const $ = selector => root.querySelector(selector);

function pairsHtml(player) {
  const { rows, cols, payoffs } = problem;
  const count = player === 1 ? rows : cols;
  let html = `<h3>${COPY.player(player)}</h3>`;
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      const a = strategyLabel(i, player, count), b = strategyLabel(j, player, count);
      const answer = getDominanceRelation(payoffs, rows, cols, player, i, j);
      const id = `dom-${player}-${i}-${j}`;
      html += `
        <div class="dominance-pair">
          <label for="${id}">${escapeHtml(COPY.versus(a, b))}</label>
          <select id="${id}" data-answer="${answer}">
            <option value="">${COPY.choose}</option>
            ${COPY.options(plainMath(a), plainMath(b)).map(([v, t]) => `<option value="${v}">${escapeHtml(t)}</option>`).join('')}
          </select>
        </div>`;
    }
  }
  return `<div class="dominance-group">${html}</div>`;
}

function newQuestion() {
  problem = generateDominanceProblem();
  renderPayoffMatrix($('.matrix-slot'), problem);
  clearMath($('.pairs'));
  $('.pairs').innerHTML = pairsHtml(1) + pairsHtml(2);
  typeset($('.pairs'));
  $('.dom-submit').disabled = false;
  $('.input-error').textContent = '';
  hideFeedback($('.feedback'));
}

function submit() {
  const selects = [...root.querySelectorAll('.pairs select')];
  selects.forEach(s => s.classList.toggle('is-invalid', !s.value));
  if (selects.some(s => !s.value)) {
    $('.input-error').textContent = COPY.incomplete;
    return;
  }
  $('.input-error').textContent = '';
  let right = 0;
  for (const s of selects) {
    const ok = s.value === s.dataset.answer;
    if (ok) right++;
    // Show the right answer in each menu: green if it was theirs, red if not.
    s.value = s.dataset.answer;
    s.classList.add(ok ? 'is-right' : 'is-wrong');
    s.disabled = true;
  }
  const correct = right === selects.length;
  score.record(correct ? 1 : 0);
  $('.dom-submit').disabled = true;
  showFeedback($('.feedback'), {
    correct,
    messageHtml: escapeHtml(correct ? COPY.allRight(selects.length) : COPY.result(right, selects.length)),
  });
  $('.feedback-next').focus();
}

export default {
  scored: true,

  mount(el, ctx) {
    root = el;
    score = ctx.score;
    loadStylesheet(new URL('./dominance.css', import.meta.url));
    root.innerHTML = `
      <div class="info"><p>${COPY.info}</p></div>
      <div class="section">
        <h2>${COPY.matrixTitle}</h2>
        <p class="subtitle">${COPY.prompt}</p>
        <div class="matrix-slot"></div>
      </div>
      <div class="section">
        <h2>${COPY.questionsTitle}</h2>
        <div class="pairs"></div>
        <div class="button-row">
          <button type="button" class="primary-btn dom-submit">${COPY.submit}</button>
        </div>
        <p class="input-error" role="alert"></p>
      </div>
      ${feedbackHtml()}`;
    $('.pairs').addEventListener('change', event => event.target.classList.remove('is-invalid'));
    $('.dom-submit').addEventListener('click', submit);
    $('.feedback-next').addEventListener('click', newQuestion);
    newQuestion();
  },

  reset() {
    newQuestion();
  },
};

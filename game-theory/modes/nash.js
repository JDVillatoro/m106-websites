// Nash Equilibria: click every pure Nash equilibrium in a payoff matrix.
// Ported from the Nash section of legacy/game-theory/script.js.

import { generateRandomPayoffs, calculateNashEquilibria } from '../lib/game.js';
import { renderPayoffMatrix } from '../lib/matrix-view.js';
import { feedbackHtml, showFeedback, hideFeedback } from '../../shared/js/ui.js';

const COPY = {
  info: 'Identify all pure Nash equilibria!',
  matrixTitle: 'Payoff matrix',
  instructions: 'Select all pure Nash equilibria by clicking the matching outcomes. If there are none, submit without selecting any.',
  submit: 'Submit answer',
  correct: 'You found every pure Nash equilibrium.',
  correctNone: 'There are no pure Nash equilibria in this game.',
  incorrectNone: 'There are no pure Nash equilibria in this game. The crossed-out cells are not equilibria.',
  incorrect: 'Cells outlined in red are equilibria you missed. Crossed-out cells are not equilibria.',
};

let root, score, problem, cells, selected, answered;
const $ = selector => root.querySelector(selector);

function newQuestion() {
  const rows = Math.floor(Math.random() * 2) + 2;
  const cols = Math.floor(Math.random() * 2) + 2;
  const payoffs = generateRandomPayoffs(rows, cols);
  problem = { rows, cols, payoffs, equilibria: calculateNashEquilibria(payoffs, rows, cols) };
  selected = new Set();
  answered = false;

  cells = renderPayoffMatrix($('.matrix-slot'), { rows, cols, payoffs, onCellClick: toggle });
  $('.nash-submit').hidden = false;
  hideFeedback($('.feedback'));
}

function toggle(key, cell) {
  if (answered) return;
  if (selected.has(key)) selected.delete(key);
  else selected.add(key);
  cell.classList.toggle('is-selected', selected.has(key));
  cell.setAttribute('aria-pressed', String(selected.has(key)));
}

function submit() {
  answered = true;
  const { equilibria } = problem;
  const correct = selected.size === equilibria.size && [...selected].every(key => equilibria.has(key));
  score.record(correct ? 1 : 0);

  for (const [key, cell] of cells) {
    cell.setAttribute('aria-disabled', 'true');
    if (correct) continue;
    if (equilibria.has(key) && !selected.has(key)) cell.classList.add('is-missed');
    if (!equilibria.has(key) && selected.has(key)) cell.classList.add('is-crossed');
  }

  let message;
  if (correct) message = equilibria.size ? COPY.correct : COPY.correctNone;
  else message = equilibria.size ? COPY.incorrect : COPY.incorrectNone;

  $('.nash-submit').hidden = true;
  showFeedback($('.feedback'), { correct, messageHtml: message });
  $('.feedback-next').focus();
}

export default {
  scored: true,

  mount(el, ctx) {
    root = el;
    score = ctx.score;
    root.innerHTML = `
      <div class="info"><p>${COPY.info}</p></div>
      <div class="section">
        <h2>${COPY.matrixTitle}</h2>
        <p class="subtitle">${COPY.instructions}</p>
        <div class="matrix-slot"></div>
        <button type="button" class="primary-btn nash-submit">${COPY.submit}</button>
      </div>
      ${feedbackHtml()}`;

    $('.nash-submit').addEventListener('click', submit);
    $('.feedback-next').addEventListener('click', newQuestion);
    newQuestion();
  },

  reset() {
    newQuestion();
  },
};

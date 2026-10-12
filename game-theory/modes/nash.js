// Nash Equilibria: click every pure Nash equilibrium in a payoff matrix.
// Ported from the Nash section of legacy/game-theory/script.js.

import { generateRandomPayoffs, calculateNashEquilibria } from '../lib/game.js';
import { renderPayoffMatrix, strategyLabel } from '../lib/matrix-view.js';
import { plainMath } from '../../shared/js/math.js';
import { escapeHtml, feedbackHtml, showFeedback, hideFeedback } from '../../shared/js/ui.js';

const COPY = {
  matrixTitle: 'Payoff matrix',
  instructions: 'Select all pure Nash equilibria by clicking the matching outcomes. If there are none, submit without selecting any.',
  submit: 'Submit answer',
  correct: 'You found every pure Nash equilibrium.',
  correctNone: 'There are no pure Nash equilibria in this game.',
  // After a wrong answer the message names the cells, so it doesn't depend
  // on seeing the marks in the matrix. Cells are (row strategy, column strategy).
  answer: cells => cells.length === 1
    ? `The pure Nash equilibrium is ${cells[0]}.`
    : `The pure Nash equilibria are ${listText(cells)}.`,
  notOne: cells => cells.length === 1 ? `${cells[0]} is not one.` : `${listText(cells)} are not equilibria.`,
  noneSoNotOne: cells => `There are no pure Nash equilibria in this game, so ${
    cells.length === 1 ? `${cells[0]} is not one` : `${listText(cells)} are not equilibria`}.`,
};

/** "a", "a and b", "a, b and c". */
const listText = items => (items.length < 2 ? items.join('')
  : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);

let root, score, problem, cells, selected, answered;
const $ = selector => root.querySelector(selector);

/** A cell as text: "(B, X)", from the same labels the matrix shows. */
function cellName(key) {
  const [i, j] = key.split('-').map(Number);
  return `(${plainMath(strategyLabel(i, 1, problem.rows))}, ${plainMath(strategyLabel(j, 2, problem.cols))})`;
}

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
    if (equilibria.has(key) && selected.has(key)) cell.classList.add('is-correct');
    if (correct) continue;
    if (equilibria.has(key) && !selected.has(key)) cell.classList.add('is-missed');
    if (!equilibria.has(key) && selected.has(key)) cell.classList.add('is-crossed');
  }

  let message;
  if (correct) {
    message = equilibria.size ? COPY.correct : COPY.correctNone;
  } else {
    const wrong = [...cells.keys()].filter(key => selected.has(key) && !equilibria.has(key)).map(cellName);
    const right = [...cells.keys()].filter(key => equilibria.has(key)).map(cellName);
    if (!equilibria.size) message = COPY.noneSoNotOne(wrong);
    else message = [COPY.answer(right), wrong.length ? COPY.notOne(wrong) : ''].filter(Boolean).join(' ');
  }

  $('.nash-submit').hidden = true;
  showFeedback($('.feedback'), { correct, messageHtml: escapeHtml(message) });
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

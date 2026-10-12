// Play: pick strategies against a computer opponent in an editable game.
// Not scored. Ported from the play section of legacy/game-theory/script.js.

import { renderPayoffMatrix, strategyLabel } from '../lib/matrix-view.js';
import { typeset, clearMath } from '../../shared/js/math.js';
import { escapeHtml, loadStylesheet } from '../../shared/js/ui.js';

const text = name => `\\(\\text{${name}}\\)`;

/** Classic games. Payoffs are [row][col] = [Player 1, Player 2]. */
export const PRESETS = {
  prisoners: {
    title: "Prisoner's Dilemma",
    names: ['Loyal', 'Betray'],
    payoffs: [[[-1, -1], [-3, 0]], [[0, -3], [-2, -2]]],
  },
  chicken: {
    title: 'Chicken',
    names: ['Swerve', 'Straight'],
    payoffs: [[[2, 2], [0, 3]], [[3, 0], [-10, -10]]],
  },
  stagHunt: {
    title: 'Stag Hunt',
    names: ['Stag', 'Hare'],
    payoffs: [[[2, 2], [0, 1]], [[1, 0], [1, 1]]],
  },
  rps: {
    title: 'Rock Paper Scissors',
    names: ['Rock', 'Paper', 'Scissors'],
    payoffs: [[[0, 0], [-1, 1], [1, -1]], [[1, -1], [0, 0], [-1, 1]], [[-1, 1], [1, -1], [0, 0]]],
  },
};

/**
 * The opponent's choice: 30% of the time a random column; otherwise the column
 * with the best average payoff for them, ties broken at random.
 */
export function opponentChoice(game, random = Math.random) {
  const { rows, cols, payoffs } = game;
  if (random() < 0.3) return Math.floor(random() * cols);
  const average = Array.from({ length: cols }, (_, j) => {
    let sum = 0;
    for (let i = 0; i < rows; i++) sum += payoffs[`${i}-${j}`].p2;
    return sum / rows;
  });
  const best = Math.max(...average);
  const choices = average.map((a, j) => (a === best ? j : -1)).filter(j => j >= 0);
  return choices[Math.floor(random() * choices.length)];
}

const COPY = {
  edit: 'Edit payoff matrix',
  done: 'Done editing',
  rows: 'Your strategies:',
  cols: 'Opponent strategies:',
  updateSize: 'Update dimensions',
  badSize: 'Use 2 to 5 strategies for each player.',
  badPayoff: 'Every payoff must be a number.',
  editHint: 'Strategy names can use TeX, e.g. \\(X\\) or \\(\\text{Strategy}\\). Leave a name empty for the default.',
  playerLabels: ['Player 1 (You)', 'Player 2 (Opponent)'],
  actionsTitle: 'What strategy will you choose?',
  resultsTitle: 'Results',
  start: 'Choose a strategy to start playing!',
  round: (you, opp, yourPay, oppPay) =>
    `<strong>Round result:</strong><br>You chose: strategy ${you} | Opponent chose: strategy ${opp}<br>`
    + `Your payoff: ${signed(yourPay)} | Opponent payoff: ${signed(oppPay)}`,
  yourScore: 'Your score:',
  oppScore: 'Opponent score:',
  historyTitle: 'Game history',
  clearHistory: 'Clear history',
  historyRound: (n, you, opp) => `<strong>Round ${n}:</strong> You: ${you} vs Opponent: ${opp}`,
  historyPayoffs: (you, opp) => `Payoffs - You: ${signed(you)}, Opponent: ${signed(opp)}`,
};

const signed = x => (x >= 0 ? `+${x}` : String(x));

let root;
// The game: size, payoffs keyed "row-col", custom names (TeX, or null for the default).
let game, editing = false, totals, history;
const $ = selector => root.querySelector(selector);

function loadPreset(key) {
  const preset = PRESETS[key];
  const n = preset.names.length;
  const payoffs = {};
  preset.payoffs.forEach((row, i) => row.forEach(([p1, p2], j) => { payoffs[`${i}-${j}`] = { p1, p2 }; }));
  game = { rows: n, cols: n, payoffs, names: { 1: preset.names.map(text), 2: preset.names.map(text) } };
  editing = false;
  clearHistory();
  render();
}

const label = (index, player) =>
  game.names[player]?.[index] || strategyLabel(index, player, player === 1 ? game.rows : game.cols);

function render() {
  const rows = game.rows, cols = game.cols;
  renderPayoffMatrix($('.matrix-slot'), {
    rows, cols, payoffs: game.payoffs, editable: editing, playerLabels: COPY.playerLabels,
    rowLabels: Array.from({ length: rows }, (_, i) => label(i, 1)),
    colLabels: Array.from({ length: cols }, (_, j) => label(j, 2)),
  });
  $('.edit-btn').textContent = editing ? COPY.done : COPY.edit;
  $('.edit-btn').classList.toggle('is-editing', editing);
  $('.size-controls').hidden = !editing;
  $('.input-error').textContent = '';
  $('#play-rows').value = rows;
  $('#play-cols').value = cols;

  clearMath($('.strategy-buttons'));
  $('.strategy-buttons').innerHTML = Array.from({ length: rows }, (_, i) =>
    `<button type="button" class="choice-btn strategy-btn" data-index="${i}"${editing ? ' disabled' : ''}>${escapeHtml(label(i, 1))}</button>`).join('');
  typeset($('.strategy-buttons'));
}

/** Read the edited matrix. Returns false (and says why) if a payoff isn't a number. */
function saveEdits() {
  const inputs = [...root.querySelectorAll('.payoff-input')];
  inputs.forEach(input => input.classList.toggle('is-invalid', input.value.trim() === '' || Number.isNaN(Number(input.value))));
  if (inputs.some(input => input.classList.contains('is-invalid'))) {
    $('.input-error').textContent = COPY.badPayoff;
    return false;
  }
  for (const input of inputs) game.payoffs[input.dataset.key][input.dataset.player] = Number(input.value);
  const names = { 1: [], 2: [] };
  root.querySelectorAll('.strategy-name-input').forEach(input => {
    names[input.dataset.player][input.dataset.index] = input.value.trim() || null;
  });
  game.names = names;
  return true;
}

function toggleEditing() {
  if (editing && !saveEdits()) return;
  editing = !editing;
  render();
}

function updateSize() {
  const rows = parseInt($('#play-rows').value, 10), cols = parseInt($('#play-cols').value, 10);
  if (!(rows >= 2 && rows <= 5 && cols >= 2 && cols <= 5)) {
    $('.input-error').textContent = COPY.badSize;
    return;
  }
  const payoffs = {};
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) payoffs[`${i}-${j}`] = { p1: 0, p2: 0 };
  game = { rows, cols, payoffs, names: { 1: [], 2: [] } };
  clearHistory();
  render();   // still editing, so the new payoffs can be filled in
}

function play(row) {
  const col = opponentChoice(game);
  const { p1, p2 } = game.payoffs[`${row}-${col}`];
  totals.you += p1;
  totals.opp += p2;
  history.push({ you: label(row, 1), opp: label(col, 2), p1, p2 });

  // Highlight only the outcome just played (restarting the animation).
  root.querySelectorAll('.matrix-cell.is-highlighted').forEach(c => c.classList.remove('is-highlighted'));
  const cell = root.querySelector(`.matrix-cell[data-key="${row}-${col}"]`);
  void cell.offsetWidth;
  cell.classList.add('is-highlighted');

  const result = $('.result-text');
  clearMath(result);
  result.innerHTML = COPY.round(escapeHtml(label(row, 1)), escapeHtml(label(col, 2)), p1, p2);
  renderScores(true);
  renderHistory();
  typeset([result, $('.history-list')]);
}

function renderScores(animate = false) {
  for (const [selector, value] of [['.your-score', totals.you], ['.opp-score', totals.opp]]) {
    const el = $(selector);
    el.textContent = Number.isInteger(value) ? value : value.toFixed(1);
    if (animate) {
      el.classList.remove('score-update');
      void el.offsetWidth;
      el.classList.add('score-update');
    }
  }
}

function renderHistory() {
  const list = $('.history-list');
  clearMath(list);
  list.innerHTML = history.map((h, k) => ({ ...h, n: k + 1 })).reverse().map(h => `
    <div class="history-item ${h.p1 > h.p2 ? 'win' : h.p1 < h.p2 ? 'lose' : 'tie'}">
      <p>${COPY.historyRound(h.n, escapeHtml(h.you), escapeHtml(h.opp))}</p>
      <p>${COPY.historyPayoffs(h.p1, h.p2)}</p>
    </div>`).join('');
}

function clearHistory() {
  totals = { you: 0, opp: 0 };
  history = [];
  if (!root.querySelector('.result-text')) return;
  $('.result-text').textContent = COPY.start;
  renderScores();
  renderHistory();
}

export default {
  mount(el) {
    root = el;
    loadStylesheet(new URL('./play.css', import.meta.url));
    root.innerHTML = `

      <div class="section">
        <div class="button-row">
          <button type="button" class="add-btn edit-btn">${COPY.edit}</button>
        </div>
        <div class="size-controls" hidden>
          <p class="subtitle mathjax_ignore">${escapeHtml(COPY.editHint)}</p>
          <div class="answer-row">
            <label for="play-rows">${COPY.rows}</label>
            <input type="number" id="play-rows" class="count-input" min="2" max="5">
            <label for="play-cols">${COPY.cols}</label>
            <input type="number" id="play-cols" class="count-input" min="2" max="5">
            <button type="button" class="primary-btn size-btn">${COPY.updateSize}</button>
          </div>
        </div>
        <p class="input-error" role="alert"></p>
        <div class="matrix-slot"></div>
        <div class="preset-buttons">
          ${Object.entries(PRESETS).map(([key, p]) => `<button type="button" data-preset="${key}">${escapeHtml(p.title)}</button>`).join('')}
        </div>
      </div>

      <div class="section">
        <h2>${COPY.actionsTitle}</h2>
        <div class="choice-row strategy-buttons"></div>
      </div>

      <div class="section results">
        <h2>${COPY.resultsTitle}</h2>
        <p class="result-text" aria-live="polite"></p>
        <div class="score-display">
          <p>${COPY.yourScore} <span class="your-score">0</span></p>
          <p>${COPY.oppScore} <span class="opp-score">0</span></p>
        </div>
      </div>

      <div class="section history">
        <h2>${COPY.historyTitle}</h2>
        <button type="button" class="danger-btn clear-history">${COPY.clearHistory}</button>
        <div class="history-list"></div>
      </div>`;

    $('.edit-btn').addEventListener('click', toggleEditing);
    $('.size-btn').addEventListener('click', updateSize);
    $('.preset-buttons').addEventListener('click', event => {
      const key = event.target.closest('[data-preset]')?.dataset.preset;
      if (key) loadPreset(key);
    });
    $('.strategy-buttons').addEventListener('click', event => {
      const btn = event.target.closest('.strategy-btn');
      if (btn && !editing) play(Number(btn.dataset.index));
    });
    $('.clear-history').addEventListener('click', clearHistory);
    loadPreset('prisoners');
  },
};

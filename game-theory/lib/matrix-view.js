// Drawing payoff matrices. Used by every game theory mode that shows one.
//
// Replaces the near-identical generate*Matrix() functions in
// legacy/game-theory/script.js. Styles are in matrix-view.css, which the
// topic page links. Strategy labels are TeX, typeset with MathJax.

import { escapeHtml } from '../../shared/js/ui.js';
import { typeset, clearMath, plainMath } from '../../shared/js/math.js';

/**
 * Default strategy label, as TeX. Player 1 (rows): A, B, C, or A_1, A_2, ...
 * when there are more than 3. Player 2 (columns): X, Y, Z, or X_1, X_2, ...
 *
 * @param {number} index  0-based
 * @param {1|2} player
 * @param {number} count  number of strategies that player has
 */
export function strategyLabel(index, player, count) {
  const letters = player === 1 ? ['A', 'B', 'C'] : ['X', 'Y', 'Z'];
  if (count <= 3) return `\\(${letters[index]}\\)`;
  return `\\(${letters[0]}_{${index + 1}}\\)`;
}

/**
 * Draw a payoff matrix into `container`, replacing what was there.
 *
 * @param {HTMLElement} container
 * @param {object} options
 * @param {number} options.rows
 * @param {number} options.cols
 * @param {Object.<string, {p1: number, p2: number}>} options.payoffs  keyed "row-col"
 * @param {string[]} [options.rowLabels]  TeX; default strategyLabel(i, 1, rows)
 * @param {string[]} [options.colLabels]  TeX; default strategyLabel(j, 2, cols)
 * @param {(key: string, cell: HTMLElement) => void} [options.onCellClick]
 *   If given, payoff cells can be chosen by click, Enter or Space.
 * @param {[string, string]} [options.playerLabels]  default ['Player 1', 'Player 2']
 * @param {boolean} [options.editable]
 *   Show text boxes instead of values: strategy names (class
 *   strategy-name-input, data-player 1|2, data-index) and payoffs (class
 *   payoff-input, data-key "row-col", data-player p1|p2). The caller reads them.
 * @returns {Map<string, HTMLElement>}  payoff cells by "row-col" key
 */
export function renderPayoffMatrix(container, {
  rows, cols, payoffs,
  rowLabels = Array.from({ length: rows }, (_, i) => strategyLabel(i, 1, rows)),
  colLabels = Array.from({ length: cols }, (_, j) => strategyLabel(j, 2, cols)),
  onCellClick,
  playerLabels = ['Player 1', 'Player 2'],
  editable = false,
}) {
  clearMath(container);
  const clickable = typeof onCellClick === 'function';

  const label = (tex, player, index) => (editable
    ? `<input type="text" class="strategy-name-input" data-player="${player}" data-index="${index}"
         value="${escapeHtml(tex)}" aria-label="Player ${player} strategy ${index + 1} name">`
    : escapeHtml(tex));
  const payoff = (key, player, value, where) => (editable
    ? `<input type="text" class="payoff-input" data-key="${key}" data-player="${player}"
         value="${escapeHtml(value)}" aria-label="${escapeHtml(where)}: ${player === 'p1' ? 'Player 1' : 'Player 2'}'s payoff">`
    : `<span class="payoff">${escapeHtml(value)}</span>`);

  const header = colLabels.map((l, j) => `<th scope="col">${label(l, 2, j)}</th>`).join('');
  const body = Array.from({ length: rows }, (_, i) => {
    const cells = Array.from({ length: cols }, (_, j) => {
      const key = `${i}-${j}`;
      const { p1, p2 } = payoffs[key];
      const where = `${plainMath(rowLabels[i])} and ${plainMath(colLabels[j])}`;
      const spoken = `${where}: Player 1 gets ${p1}, Player 2 gets ${p2}`;
      const attrs = clickable
        ? ` tabindex="0" role="button" aria-pressed="false" aria-label="${escapeHtml(spoken)}"`
        : '';
      return `
        <td class="matrix-cell${clickable ? ' is-clickable' : ''}" data-key="${key}"${attrs}>
          ${payoff(key, 'p1', p1, where)}
          ${payoff(key, 'p2', p2, where)}
        </td>`;
    }).join('');
    return `<tr><th scope="row" class="row-label">${label(rowLabels[i], 1, i)}</th>${cells}</tr>`;
  }).join('');

  container.innerHTML = `
    <div class="payoff-matrix">
      <div class="player-label player2-label">${escapeHtml(playerLabels[1])}</div>
      <div class="matrix-table-row">
        <div class="player-label player1-label">${escapeHtml(playerLabels[0])}</div>
        <table>
          <thead><tr><td></td>${header}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </div>`;

  const cells = new Map([...container.querySelectorAll('.matrix-cell')].map(td => [td.dataset.key, td]));
  if (clickable) {
    for (const [key, td] of cells) {
      td.addEventListener('click', () => {
        if (td.getAttribute('aria-disabled') !== 'true') onCellClick(key, td);
      });
      td.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        td.click();
      });
    }
  }

  typeset(container);
  return cells;
}

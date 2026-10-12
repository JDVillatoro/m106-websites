// Reading the payoff matrix a game theory mode is showing, for browser tests.

/** { rows, cols, payoffs } from the visible matrix, payoffs keyed "row-col". */
export async function matrixOnScreen(page) {
  const cells = await page.locator('.mode-panel:not([hidden]) .matrix-cell').evaluateAll(tds =>
    tds.map(td => ({
      key: td.dataset.key,
      values: [...td.querySelectorAll('.payoff, .payoff-input')].map(el => Number(el.value ?? el.textContent)),
    })));
  const payoffs = Object.fromEntries(cells.map(c => [c.key, { p1: c.values[0], p2: c.values[1] }]));
  const rows = Math.max(...cells.map(c => Number(c.key.split('-')[0]))) + 1;
  const cols = Math.max(...cells.map(c => Number(c.key.split('-')[1]))) + 1;
  return { rows, cols, payoffs };
}

/** Index of a default strategy label: \(A\) → 0, \(Y\) → 1, \(X_{3}\) → 2. */
export function labelIndex(tex) {
  const inner = tex.replace(/^\\\(|\\\)$/g, '');
  const sub = inner.match(/_\{(\d+)\}/);
  if (sub) return Number(sub[1]) - 1;
  return 'ABCXYZ'.indexOf(inner) % 3;
}

// Math typesetting with MathJax, and reading and writing fractions.
//
// A page that shows math loads MathJax itself, with a pinned version and its
// menu off (the menu makes every piece of math focusable):
//   <script>window.MathJax = { options: { enableMenu: false } };</script>
//   <script async src="https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-mml-chtml.js"></script>
// MathJax's text isn't a reliable accessible name: give a button whose label
// is math an aria-label with plainMath(label).
// Math is written in TeX between \( and \), e.g. '\\(A_{1}\\)' in JavaScript.

// MathJax shouldn't typeset two things at once, so calls wait in line.
let queue = Promise.resolve();

/**
 * Typeset the math inside `els` (one element or several). Safe to call before
 * MathJax has loaded: when it finishes loading, MathJax typesets the whole
 * page by itself.
 */
export function typeset(els) {
  const mathJax = window.MathJax;
  if (!mathJax?.startup?.promise) return Promise.resolve();
  const list = [].concat(els);
  queue = queue
    .then(() => mathJax.startup.promise)
    .then(() => mathJax.typesetPromise(list))
    .catch(err => console.error('MathJax error:', err));
  return queue;
}

/** Tell MathJax that the math inside `els` is about to be removed or replaced. */
export function clearMath(els) {
  window.MathJax?.typesetClear?.([].concat(els));
}

/**
 * Plain-text version of a TeX label, for screen readers and messages:
 * '\\(A_{1}\\)' → 'A1', '\\(\\text{Rock}\\)' → 'Rock'.
 */
export function plainMath(tex) {
  return String(tex)
    .replace(/^\\\(|\\\)$/g, '')
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/[_^]\{([^}]*)\}/g, '$1')
    .replace(/[{}\\]/g, '')
    .trim();
}

/**
 * Read a fraction such as "1/2" or " 3 / 4 ". Returns its value, or null if
 * the text isn't a fraction (no slash, not numbers, or dividing by zero).
 */
export function parseFraction(str) {
  str = String(str).trim();
  if (!str.includes('/')) return null;
  const parts = str.split('/');
  if (parts.length !== 2) return null;
  const numerator = parseFloat(parts[0].trim());
  const denominator = parseFloat(parts[1].trim());
  if (isNaN(numerator) || isNaN(denominator) || denominator === 0) return null;
  return numerator / denominator;
}

/**
 * `decimal` (between 0 and 1) as a fraction in lowest terms with denominator
 * up to 100, e.g. 0.6666666666666666 → "2/3". Falls back to two decimals.
 * (The old site allowed an error of 0.01, so 7/13 came out as "6/11".)
 */
export function decimalToFraction(decimal) {
  const tolerance = 1e-9;
  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  for (let denom = 1; denom <= 100; denom++) {
    for (let numer = 0; numer <= denom; numer++) {
      if (Math.abs(numer / denom - decimal) < tolerance) {
        const divisor = gcd(numer, denom);
        return `${numer / divisor}/${denom / divisor}`;
      }
    }
  }
  return decimal.toFixed(2);
}

// Math typesetting with MathJax.
//
// A page that shows math loads MathJax itself, with a pinned version:
//   <script async src="https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-mml-chtml.js"></script>
// Math is written in TeX between \( and \), e.g. '\\(A_{1}\\)' in JavaScript.

/**
 * Typeset the math inside `el`. Safe to call before MathJax has loaded: when
 * it finishes loading, MathJax typesets the whole page by itself.
 */
export function typeset(el) {
  const mathJax = window.MathJax;
  if (!mathJax?.startup?.promise) return Promise.resolve();
  return mathJax.startup.promise
    .then(() => mathJax.typesetPromise([el]))
    .catch(err => console.error('MathJax error:', err));
}

/** Tell MathJax that the math inside `el` is about to be removed or replaced. */
export function clearMath(el) {
  window.MathJax?.typesetClear?.([el]);
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

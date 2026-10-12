// Small helpers for building mode UIs. Styles are in shared/css/components.css.

/** Escape text for use inside an HTML template string. */
export function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Show the feedback block after an answer.
 * `messageHtml` is inserted as HTML; escape any text that comes from the user.
 *
 * @param {HTMLElement} el  an element with class "feedback"
 * @param {{correct: boolean, title?: string, messageHtml: string}} options
 */
export function showFeedback(el, { correct, title, messageHtml }) {
  el.classList.toggle('is-correct', correct);
  el.classList.toggle('is-incorrect', !correct);
  el.querySelector('.feedback-title').textContent = title ?? (correct ? 'Correct' : 'Incorrect');
  el.querySelector('.feedback-message').innerHTML = messageHtml;
  el.hidden = false;
}

export function hideFeedback(el) {
  el.hidden = true;
  el.classList.remove('is-correct', 'is-incorrect');
}

/** HTML for an empty feedback block, to include in a mode's template. */
export function feedbackHtml({ nextLabel = 'Next question' } = {}) {
  return `
    <div class="feedback" hidden aria-live="polite">
      <h2 class="feedback-title"></h2>
      <p class="feedback-message"></p>
      <button type="button" class="primary-btn feedback-next">${escapeHtml(nextLabel)}</button>
    </div>`;
}

/**
 * Add a stylesheet to the page once. Resolve the URL from the calling module:
 *   loadStylesheet(new URL('./coloring.css', import.meta.url))
 */
export function loadStylesheet(url) {
  const href = String(url);
  if (document.querySelector(`link[rel="stylesheet"][href="${CSS.escape(href)}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.append(link);
}

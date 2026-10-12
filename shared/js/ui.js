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
 * `canRetry` shows the block's "try again" button, if it has one (feedbackHtml
 * with retryLabel).
 *
 * @param {HTMLElement} el  an element with class "feedback"
 * @param {{correct: boolean, title?: string, messageHtml: string, canRetry?: boolean}} options
 */
export function showFeedback(el, { correct, title, messageHtml, canRetry = false }) {
  el.classList.toggle('is-correct', correct);
  el.classList.toggle('is-incorrect', !correct);
  el.querySelector('.feedback-title').textContent = title ?? (correct ? 'Correct' : 'Incorrect');
  el.querySelector('.feedback-message').innerHTML = messageHtml;
  const retry = el.querySelector('.feedback-retry');
  if (retry) retry.hidden = !canRetry;
  el.hidden = false;
}

export function hideFeedback(el) {
  el.hidden = true;
  el.classList.remove('is-correct', 'is-incorrect');
}

/**
 * HTML for an empty feedback block, to include in a mode's template.
 * With `retryLabel`, it also has a "try again" button (class feedback-retry),
 * shown only when showFeedback is called with canRetry.
 */
export function feedbackHtml({ nextLabel = 'Next question', retryLabel = null } = {}) {
  const retry = retryLabel
    ? `<button type="button" class="primary-btn feedback-retry" hidden>${escapeHtml(retryLabel)}</button>`
    : '';
  return `
    <div class="feedback" hidden aria-live="polite">
      <h2 class="feedback-title"></h2>
      <p class="feedback-message"></p>
      <div class="button-row">
        ${retry}
        <button type="button" class="primary-btn feedback-next">${escapeHtml(nextLabel)}</button>
      </div>
    </div>`;
}

/**
 * Add a stylesheet to the page once. Resolve the URL from the calling module:
 *   loadStylesheet(new URL('./coloring.css', import.meta.url))
 *
 * The stylesheet loads in the background. Don't use this for styles that
 * code measures straight away (such as the height of a Cytoscape area); link
 * those from the topic's index.html instead.
 */
export function loadStylesheet(url) {
  const href = String(url);
  if (document.querySelector(`link[rel="stylesheet"][href="${CSS.escape(href)}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.append(link);
}

/**
 * After an answer: disable every button in a row of choices (class
 * "choice-btn") and color the chosen one green or red.
 */
export function lockChoices(row, chosen, correct) {
  row.querySelectorAll('.choice-btn').forEach(btn => { btn.disabled = true; });
  chosen.classList.add(correct ? 'is-correct' : 'is-wrong');
}

/** Before a new question: enable a row of choices and clear their colors. */
export function resetChoices(row) {
  row.querySelectorAll('.choice-btn').forEach(btn => {
    btn.disabled = false;
    btn.classList.remove('is-correct', 'is-wrong', 'is-selected');
  });
}

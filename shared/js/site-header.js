// The header at the top of every page: a crimson line, "M106 Practice"
// (links to the hub) and the topics, the current one marked. Also a "Skip to
// content" link, first on the page, for keyboard users.
//
// The hub calls it from index.html, topic pages through startTopic().

import topics from '../../topics.js';
import { escapeHtml } from './ui.js';

/**
 * Add the header at the start of <body>.
 *
 * @param {object} options
 * @param {string} options.home      relative URL of the hub from this page ('./' or '../')
 * @param {string} [options.current] id of the topic this page is about, if any
 * @param {string} [options.contentId]  id of the element "Skip to content" goes to
 */
export function addSiteHeader({ home, current = null, contentId = 'app' }) {
  const here = ' aria-current="page"';
  const header = document.createElement('header');
  header.className = 'site-banner';
  header.innerHTML = `
    <a class="skip-link" href="#${escapeHtml(contentId)}">Skip to content</a>
    <div class="site-banner-inner">
      <a class="site-brand" href="${escapeHtml(home)}"${current ? '' : here}>
        <span class="site-brand-mark">M106</span> Practice
      </a>
      <nav class="site-topics" aria-label="Topics">
        <ul>
          ${topics.map(t => `
            <li><a href="${escapeHtml(home + t.id)}/"${t.id === current ? here : ''}>${escapeHtml(t.title)}</a></li>`).join('')}
        </ul>
      </nav>
    </div>`;
  // Move focus without changing the URL: on topic pages the hash picks the
  // mode, so following "#app" would switch views.
  header.querySelector('.skip-link').addEventListener('click', event => {
    const target = document.getElementById(contentId);
    if (!target) return;
    event.preventDefault();
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus();
  });
  document.body.prepend(header);
}

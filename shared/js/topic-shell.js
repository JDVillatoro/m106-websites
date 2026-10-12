// Builds a topic page from its list of modes (its modes.js).
//
// Two views, chosen by the URL hash, so both can be linked to and Back works:
// - no hash (graph-theory/), or an unknown one: the mode list, one card per
//   mode with its description and saved score;
// - a mode's id (graph-theory/#eulerian): that mode, with a breadcrumb,
//   "Mode 2 of 8", its description (the same as on its card), previous/next
//   links, its score box and (on wide screens) the list of modes beside it.
// Each mode is loaded the first time it's opened, and then kept, so its state
// survives switching modes.
//
// The mode format is described in docs/adding-modes.md ("A mode").

import { createStorage } from './storage.js';
import { createScore, describeScore } from './score.js';
import { escapeHtml } from './ui.js';
import { addSiteHeader } from './site-header.js';

const ARROW_LEFT = '<span aria-hidden="true">&larr;</span>';
const ARROW_RIGHT = '<span aria-hidden="true">&rarr;</span>';

/**
 * @param {object} topic
 * @param {string} topic.id      folder name, e.g. 'graph-theory'
 * @param {string} topic.title   e.g. 'Graph Theory'
 * @param {{id: string, title: string, description: string, tool?: boolean,
 *   load: () => Promise<{default: object}>}[]} topic.modes
 * @param {HTMLElement} [topic.root]  defaults to #app
 */
export function startTopic({ id: topicId, title, modes, root = document.getElementById('app') }) {
  addSiteHeader({ home: '../', current: topicId, contentId: root.id || undefined });
  const t = escapeHtml(title);
  root.innerHTML = `
    <main class="topic-home" hidden>
      <a class="back-link" href="../">${ARROW_LEFT} All topics</a>
      <h1 tabindex="-1">${t}</h1>
      <ol class="mode-cards"></ol>
    </main>

    <div class="mode-view" hidden>
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <ol>
          <li><a href="../">M106 Practice</a></li>
          <li><a href="#">${t}</a></li>
          <li><span class="breadcrumb-current" aria-current="page"></span></li>
        </ol>
      </nav>
      <a class="back-link mode-back-link" href="#">${ARROW_LEFT} ${t}</a>
      <div class="mode-layout">
        <main class="mode-main">
          <p class="mode-position"></p>
          <h1 class="mode-title" tabindex="-1"></h1>
          <p class="info mode-intro"></p>
          <div class="mode-panels"></div>
        </main>
        <aside class="mode-aside">
          <div class="score-slot"></div>
          <nav class="mode-nav" aria-labelledby="mode-nav-title">
            <h2 id="mode-nav-title">${t} modes</h2>
            <ol>
              ${modes.map(m => `<li><a href="#${escapeHtml(m.id)}">${escapeHtml(m.title)}</a></li>`).join('')}
            </ol>
          </nav>
        </aside>
        <nav class="mode-pager" aria-label="Previous and next mode"></nav>
      </div>
    </div>`;

  const $ = selector => root.querySelector(selector);
  const home = $('.topic-home');
  const view = $('.mode-view');
  const navLinks = new Map([...root.querySelectorAll('.mode-nav a')].map((a, i) => [modes[i].id, a]));
  const panels = new Map();   // mode id -> { el, scoreEl, ready: Promise<mode object | null> }
  let currentId = null;

  function panelFor(entry) {
    let panel = panels.get(entry.id);
    if (!panel) {
      const el = document.createElement('section');
      el.className = 'mode-panel';
      el.innerHTML = '<p class="mode-status">Loading…</p>';
      $('.mode-panels').append(el);
      panel = { el, scoreEl: null };
      panel.ready = loadMode(topicId, entry, el, scoreEl => {
        panel.scoreEl = scoreEl;
        scoreEl.hidden = currentId !== entry.id;
        $('.score-slot').append(scoreEl);
      });
      panels.set(entry.id, panel);
    }
    return panel;
  }

  function showHome() {
    currentId = null;
    $('.mode-cards').innerHTML = modes.map(m => {
      const score = m.tool ? 'Tool' : describeScore(createScore(storageFor(topicId, m)));
      return `
        <li class="mode-card">
          <h2><a href="#${escapeHtml(m.id)}">${escapeHtml(m.title)}</a></h2>
          <p class="mode-card-score">${escapeHtml(score)}</p>
          <p class="mode-card-description">${escapeHtml(m.description ?? '')}</p>
        </li>`;
    }).join('');
    view.hidden = true;
    home.hidden = false;
    document.title = `${title} – M106`;
    return home.querySelector('h1');
  }

  function showMode(entry) {
    const index = modes.indexOf(entry);
    currentId = entry.id;
    $('.breadcrumb-current').textContent = entry.title;
    $('.mode-position').textContent = `${title} · Mode ${index + 1} of ${modes.length}`;
    $('.mode-title').textContent = entry.title;
    $('.mode-intro').textContent = entry.description ?? '';
    for (const [modeId, a] of navLinks) {
      if (modeId === entry.id) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
    const prev = modes[index - 1], next = modes[index + 1];
    $('.mode-pager').innerHTML = `
      ${prev ? `<a class="pager-link pager-prev" href="#${escapeHtml(prev.id)}">
        <span class="pager-label">Previous</span>
        <span class="pager-title">${ARROW_LEFT} ${escapeHtml(prev.title)}</span></a>` : ''}
      ${next ? `<a class="pager-link pager-next" href="#${escapeHtml(next.id)}">
        <span class="pager-label">Next</span>
        <span class="pager-title">${escapeHtml(next.title)} ${ARROW_RIGHT}</span></a>` : ''}`;
    document.title = `${entry.title} – ${title} – M106`;

    home.hidden = true;
    view.hidden = false;
    const isNew = !panels.has(entry.id);
    const panel = panelFor(entry);
    for (const p of panels.values()) {
      p.el.hidden = p !== panel;
      if (p.scoreEl) p.scoreEl.hidden = p !== panel;
    }
    // A mode that was already open gets show(), so it can redraw anything
    // that couldn't be sized while its panel was hidden.
    if (!isNew) panel.ready.then(mode => mode?.show?.());
    return $('.mode-title');
  }

  function open({ moveFocus }) {
    const requested = decodeURIComponent(location.hash.slice(1));
    const entry = modes.find(m => m.id === requested);
    const heading = entry ? showMode(entry) : showHome();
    // After a link inside the page (not on first load), move focus to the new
    // heading, so screen reader users hear where they are; it also scrolls
    // to the top.
    if (moveFocus) heading.focus();
  }

  window.addEventListener('hashchange', () => open({ moveFocus: true }));
  open({ moveFocus: false });
}

function storageFor(topicId, entry) {
  return createStorage(`m106:${topicId}:${entry.id}:`);
}

/**
 * Load a mode's module and mount it in `el`; a scored mode's score box is
 * passed to `addScoreBox`. Resolves to the mode, or null if it failed.
 */
async function loadMode(topicId, entry, el, addScoreBox) {
  let mode;
  try {
    mode = (await entry.load()).default;
  } catch (err) {
    console.error(`Mode "${entry.id}" failed to load:`, err);
    showModeError(el, entry);
    return null;
  }
  if (Boolean(mode.scored) === Boolean(entry.tool)) {
    console.error(`Mode "${entry.id}": "tool" in modes.js doesn't match "scored" in the mode.`);
  }

  const storage = storageFor(topicId, entry);
  const ctx = { storage };
  el.innerHTML = '';

  if (mode.scored) {
    ctx.score = createScore(storage);
    addScoreBox(buildScoreBox(ctx.score, mode, entry));
  }

  const body = document.createElement('div');
  body.className = 'mode-body';
  el.append(body);

  try {
    mode.mount(body, ctx);
  } catch (err) {
    console.error(`Mode "${entry.id}" failed to start:`, err);
    showModeError(el, entry);
    return null;
  }
  return mode;
}

function showModeError(el, entry) {
  el.innerHTML = `
    <div class="mode-error" role="alert">
      <p>Sorry, “${escapeHtml(entry.title)}” didn't load. Try reloading the page.</p>
    </div>`;
}

function buildScoreBox(score, mode, entry) {
  const box = document.createElement('section');
  box.className = 'scoreboard';
  const titleId = `score-title-${entry.id}`;
  box.setAttribute('aria-labelledby', titleId);
  box.innerHTML = `
    <h2 id="${escapeHtml(titleId)}">Score</h2>
    <p class="scoreboard-value"></p>
    <button type="button" class="reset-btn">Reset score</button>`;
  box.querySelector('.reset-btn').addEventListener('click', () => {
    score.reset();
    mode.reset?.();
  });

  const value = box.querySelector('.scoreboard-value');
  const render = () => {
    if (!score.questions) {
      value.textContent = describeScore(score);
      return;
    }
    // "3 / 4 points", the points larger.
    const [points, rest] = describeScore(score).split(/ (?=\/)/);
    value.innerHTML = `<span class="scoreboard-points">${escapeHtml(points)}</span> ${escapeHtml(rest)}`;
  };
  score.onChange(render);
  render();
  return box;
}

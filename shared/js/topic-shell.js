// Builds a topic page: header, mode tabs, and one panel per mode.
//
// A topic page calls startTopic() with its list of modes (its modes.js).
// Each mode is loaded the first time its tab is opened, and then kept, so a
// mode's state survives switching tabs. The URL hash names the open mode
// (graph-theory/#eulerian), so modes can be linked to and Back works.
//
// The mode format is described in PLAN.md ("How a mode works").

import { createStorage } from './storage.js';
import { createScore } from './score.js';
import { escapeHtml } from './ui.js';

/**
 * @param {object} topic
 * @param {string} topic.id      folder name, e.g. 'graph-theory'
 * @param {string} topic.title   e.g. 'Graph Theory'
 * @param {{id: string, title: string, load: () => Promise<{default: object}>}[]} topic.modes
 * @param {HTMLElement} [topic.root]  defaults to #app
 */
export function startTopic({ id: topicId, title, modes, root = document.getElementById('app') }) {
  root.innerHTML = `
    <header class="site-header">
      <a class="back-link" href="../">&larr; All topics</a>
      <h1>${escapeHtml(title)}</h1>
    </header>
    <nav class="mode-tabs" aria-label="Modes">
      ${modes.map(m => `<a class="mode-tab" href="#${escapeHtml(m.id)}">${escapeHtml(m.title)}</a>`).join('')}
    </nav>
    <main class="mode-panels"></main>`;

  const tabs = new Map([...root.querySelectorAll('.mode-tab')].map((a, i) => [modes[i].id, a]));
  const panelsEl = root.querySelector('.mode-panels');
  const panels = new Map();   // mode id -> { el, ready: Promise<mode object | null> }

  function panelFor(entry) {
    let panel = panels.get(entry.id);
    if (!panel) {
      const el = document.createElement('section');
      el.className = 'mode-panel';
      el.setAttribute('aria-label', entry.title);
      el.innerHTML = '<p class="mode-status">Loading…</p>';
      panelsEl.append(el);
      panel = { el, ready: loadMode(topicId, entry, el) };
      panels.set(entry.id, panel);
    }
    return panel;
  }

  function openFromHash() {
    const requested = decodeURIComponent(location.hash.slice(1));
    const entry = modes.find(m => m.id === requested) ?? modes[0];
    if (!entry) return;

    for (const [modeId, tab] of tabs) {
      if (modeId === entry.id) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    }
    document.title = `${entry.title} – ${title} – M106`;

    const isNew = !panels.has(entry.id);
    const panel = panelFor(entry);
    for (const p of panels.values()) p.el.hidden = p !== panel;

    // A mode that was already open gets show(), so it can redraw anything
    // that couldn't be sized while its panel was hidden.
    if (!isNew) panel.ready.then(mode => mode?.show?.());
  }

  window.addEventListener('hashchange', openFromHash);
  openFromHash();
}

/** Load a mode's module and mount it in `el`. Resolves to the mode, or null if it failed. */
async function loadMode(topicId, entry, el) {
  let mode;
  try {
    mode = (await entry.load()).default;
  } catch (err) {
    console.error(`Mode "${entry.id}" failed to load:`, err);
    showModeError(el, entry);
    return null;
  }

  const storage = createStorage(`m106:${topicId}:${entry.id}:`);
  const ctx = { storage };
  el.innerHTML = '';

  if (mode.scored) {
    ctx.score = createScore(storage);
    el.append(buildToolbar(ctx.score, mode));
  }

  const body = document.createElement('div');
  body.className = 'mode-body';
  el.append(body);

  if (mode.scored) el.append(buildScoreboard(ctx.score));

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

function buildToolbar(score, mode) {
  const toolbar = document.createElement('div');
  toolbar.className = 'mode-toolbar';
  toolbar.innerHTML = '<button type="button" class="reset-btn">Reset score</button>';
  toolbar.querySelector('button').addEventListener('click', () => {
    score.reset();
    mode.reset?.();
  });
  return toolbar;
}

function buildScoreboard(score) {
  const board = document.createElement('div');
  board.className = 'scoreboard';
  board.innerHTML = `
    <h2>Score</h2>
    <div class="scoreboard-values">
      <p>Questions: <span data-value="questions"></span></p>
      <p>Points: <span data-value="points"></span></p>
      <p>Score: <span data-value="percent"></span></p>
    </div>`;

  const set = (name, text) => { board.querySelector(`[data-value="${name}"]`).textContent = text; };
  const render = () => {
    set('questions', score.questions);
    // At most two decimals, without trailing zeros: 3, 2.5, 1.25.
    set('points', String(Number(score.points.toFixed(2))));
    set('percent', `${score.percent}%`);
  };
  score.onChange(render);
  render();
  return board;
}

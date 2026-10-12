// Make a Graph: draw random graphs, edit vertices and edges, copy alt text,
// and download the drawing. Not scored.
// Ported from legacy/graph-theory/make-mode.js.

import {
  vertexId, makeLabels, generateRandomGraph, generateSimpleGraph,
  generateMSCDigraph, generateEulerianDigraph, generateEulerianSimpleGraph, generateEulerianMultigraph,
} from '../lib/graph.js';
import { createGraphView, graphToDescription } from '../lib/render.js';
import { escapeHtml, loadStylesheet } from '../../shared/js/ui.js';

const GENERATORS = {
  default: { label: 'Default', make: generateRandomGraph },
  simple_graph: { label: 'Simple Graph', make: generateSimpleGraph },
  msc_digraph: { label: 'MSC Digraph', make: generateMSCDigraph },
  eulerian_digraph: { label: 'Eulerian Digraph', make: generateEulerianDigraph },
  eulerian_simple: { label: 'Eulerian Simple', make: generateEulerianSimpleGraph },
  eulerian_multi: { label: 'Eulerian Multi', make: generateEulerianMultigraph },
};

const COPY = {
  info: 'Create and edit graphs!',
  edit: 'Edit graph',
  download: 'Download',
  altText: 'Alt text',
  done: 'Done editing',
  cancel: 'Cancel',
  altTextLabel: 'Alt text',
  copy: 'Copy',
  copied: 'Copied!',
  editorTitle: 'Edit graph',
  editorHelp: 'You can change the names of the edges and vertices here. To add an edge, pick a source and target. To make a weighted graph just add labels to the edges.',
  vertexCount: 'Number of vertices:',
  setVertices: 'Set vertices',
  randomType: 'Randomize type:',
  randomize: 'Randomize',
  directed: 'Directed graph',
  vertices: 'Vertices',
  edges: 'Edges',
  columns: ['Start', 'End', 'Label', ''],
  addEdge: 'Add edge',
  remove: 'Remove',
  exportFailed: "Sorry, this browser couldn't export the graph.",
};

let root, view, graph;
// While editing: vertex names, and edges as { source, target, label } with "vN" ids.
let draft = null;
const $ = selector => root.querySelector(selector);

/** Draw `g`, and refresh the alt text if it's showing. */
function show(g) {
  graph = g;
  view.draw(g);
  if (!$('.alt-text-panel').hidden) fillAltText();
}

function fillAltText() {
  const box = $('.alt-text-output');
  box.value = graphToDescription(graph).text;
  box.style.height = 'auto';
  box.style.height = `${box.scrollHeight + 4}px`;
}

function setEditing(on) {
  $('.editor').hidden = !on;
  $('.edit-btn').hidden = on;
  $('.download-btn').hidden = on;
  $('.done-btn').hidden = !on;
  $('.cancel-btn').hidden = !on;
}

function openEditor() {
  draft = {
    names: graph.names.slice(0, graph.n).map((name, i) => name || vertexId(i)),
    edges: graph.edges.map(e => ({ source: e.source, target: e.target, label: e.label ?? '' })),
  };
  $('.vertex-count').value = draft.names.length;
  $('.directed-input').checked = !!graph.directed;
  renderDraft();
  setEditing(true);
}

function renderDraft() {
  $('.vertex-list').innerHTML = draft.names.map((name, i) => `
    <div class="vertex-line">
      <label for="make-vertex-${i}" class="vertex-number">${i + 1}.</label>
      <input type="text" id="make-vertex-${i}" class="vertex-name" data-index="${i}" value="${escapeHtml(name)}">
    </div>`).join('');
  renderEdges();
}

function renderEdges() {
  const options = selected => ['<option value="">--</option>',
    ...draft.names.map((name, i) => {
      const id = vertexId(i);
      return `<option value="${id}"${id === selected ? ' selected' : ''}>${i + 1}.${name ? ' ' + escapeHtml(name) : ''}</option>`;
    })].join('');
  $('.edge-list').innerHTML = `
    <div class="edge-list-header" aria-hidden="true">
      ${COPY.columns.map(c => `<div class="edge-col">${c}</div>`).join('')}
    </div>
    ${draft.edges.map((e, i) => `
      <div class="edge-row" data-index="${i}">
        <div class="edge-col"><span class="col-label">${COPY.columns[0]}</span>
          <select class="edge-source" aria-label="Edge ${i + 1} start">${options(e.source)}</select></div>
        <div class="edge-col"><span class="col-label">${COPY.columns[1]}</span>
          <select class="edge-target" aria-label="Edge ${i + 1} end">${options(e.target)}</select></div>
        <div class="edge-col edge-col-label"><span class="col-label">${COPY.columns[2]}</span>
          <input type="text" class="edge-label" placeholder="label" aria-label="Edge ${i + 1} label" value="${escapeHtml(e.label)}"></div>
        <div class="edge-col"><button type="button" class="small-btn danger-btn edge-remove">${COPY.remove}</button></div>
      </div>`).join('')}
    <div class="edge-footer"><button type="button" class="add-btn edge-add">${COPY.addEdge}</button></div>`;
}

function setVertexCount() {
  const n = parseInt($('.vertex-count').value, 10);
  if (!(n >= 1)) return;
  const labels = makeLabels(n);
  draft.names = Array.from({ length: n }, (_, i) => draft.names[i] ?? labels[i]);
  const valid = new Set(draft.names.map((_, i) => vertexId(i)));
  draft.edges = draft.edges.filter(e => (!e.source || valid.has(e.source)) && (!e.target || valid.has(e.target)));
  renderDraft();
}

function applyDraft() {
  const edges = draft.edges
    .filter(e => e.source && e.target)
    .map(e => ({ source: e.source, target: e.target, label: e.label.trim() || null }));
  const labels = edges.filter(e => e.label);
  const edgeLabel = labels.length === 0 ? null : labels.every(e => !isNaN(Number(e.label))) ? 'weight' : 'name';
  show({
    n: draft.names.length,
    names: draft.names.map(name => name.trim()),
    directed: $('.directed-input').checked,
    edgeLabel,
    edges,
  });
  setEditing(false);
}

function randomize() {
  const n = parseInt($('.vertex-count').value, 10) || 5;
  show(GENERATORS[$('.random-type').value].make(n));
  openEditor();
}

/** Save `blob` as a file called `name`. */
function save(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function download() {
  const { cy } = view;
  try {
    if (typeof cy.svg === 'function') {
      save(new Blob([cy.svg({ scale: 1 })], { type: 'image/svg+xml;charset=utf-8' }), 'graph.svg');
      return;
    }
    save(await (await fetch(cy.png({ full: true, scale: 1 }))).blob(), 'graph.png');
  } catch (err) {
    console.error('Graph export failed:', err);
    alert(COPY.exportFailed);
  }
}

async function copyAltText() {
  const btn = $('.copy-btn');
  try {
    await navigator.clipboard.writeText($('.alt-text-output').value);
  } catch {
    $('.alt-text-output').select();
    document.execCommand('copy');
  }
  btn.textContent = COPY.copied;
  setTimeout(() => { btn.textContent = COPY.copy; }, 2000);
}

export default {
  mount(el) {
    root = el;
    loadStylesheet(new URL('./make.css', import.meta.url));
    root.innerHTML = `
      <div class="info"><p>${COPY.info}</p></div>
      <div class="button-row make-toolbar">
        <button type="button" class="add-btn edit-btn">${COPY.edit}</button>
        <button type="button" class="add-btn download-btn">${COPY.download}</button>
        <button type="button" class="add-btn alt-text-btn" aria-expanded="false">${COPY.altText}</button>
        <button type="button" class="primary-btn done-btn" hidden>${COPY.done}</button>
        <button type="button" class="cancel-btn" hidden>${COPY.cancel}</button>
      </div>

      <div class="panel alt-text-panel" hidden>
        <div class="alt-text-box">
          <div class="alt-text-head">
            <label for="make-alt-text">${COPY.altTextLabel}</label>
            <button type="button" class="small-btn copy-btn">${COPY.copy}</button>
          </div>
          <textarea id="make-alt-text" class="alt-text-output" rows="1" readonly></textarea>
        </div>
      </div>

      <div class="panel editor" hidden>
        <h2>${COPY.editorTitle}</h2>
        <p class="editor-help">${COPY.editorHelp}</p>
        <div class="answer-row">
          <label for="make-vertex-count">${COPY.vertexCount}</label>
          <input type="number" id="make-vertex-count" class="vertex-count count-input" min="1" value="5">
          <button type="button" class="set-vertices-btn">${COPY.setVertices}</button>
          <label for="make-random-type">${COPY.randomType}</label>
          <select id="make-random-type" class="random-type">
            ${Object.entries(GENERATORS).map(([key, g]) => `<option value="${key}">${g.label}</option>`).join('')}
          </select>
          <button type="button" class="randomize-btn">${COPY.randomize}</button>
        </div>
        <label class="directed-label"><input type="checkbox" class="directed-input"> ${COPY.directed}</label>
        <h3 class="editor-heading">${COPY.vertices}</h3>
        <div class="vertex-list"></div>
        <hr>
        <h3 class="editor-heading">${COPY.edges}</h3>
        <div class="edge-list"></div>
      </div>

      <div class="graph-slot"></div>`;

    view = createGraphView($('.graph-slot'));

    $('.edit-btn').addEventListener('click', openEditor);
    $('.cancel-btn').addEventListener('click', () => setEditing(false));
    $('.done-btn').addEventListener('click', applyDraft);
    $('.download-btn').addEventListener('click', download);
    $('.alt-text-btn').addEventListener('click', () => {
      const panel = $('.alt-text-panel');
      panel.hidden = !panel.hidden;
      $('.alt-text-btn').setAttribute('aria-expanded', String(!panel.hidden));
      if (!panel.hidden) fillAltText();
    });
    $('.copy-btn').addEventListener('click', copyAltText);
    $('.set-vertices-btn').addEventListener('click', setVertexCount);
    $('.randomize-btn').addEventListener('click', randomize);

    $('.vertex-list').addEventListener('input', event => {
      draft.names[event.target.dataset.index] = event.target.value;
      renderEdges();
    });
    const edgeIndex = target => Number(target.closest('.edge-row')?.dataset.index);
    $('.edge-list').addEventListener('change', event => {
      const i = edgeIndex(event.target);
      if (event.target.classList.contains('edge-source')) draft.edges[i].source = event.target.value;
      if (event.target.classList.contains('edge-target')) draft.edges[i].target = event.target.value;
    });
    $('.edge-list').addEventListener('input', event => {
      if (event.target.classList.contains('edge-label')) draft.edges[edgeIndex(event.target)].label = event.target.value;
    });
    $('.edge-list').addEventListener('click', event => {
      if (event.target.classList.contains('edge-remove')) {
        draft.edges.splice(edgeIndex(event.target), 1);
        renderEdges();
      } else if (event.target.classList.contains('edge-add')) {
        draft.edges.push({ source: '', target: '', label: '' });
        renderEdges();
        [...root.querySelectorAll('.edge-source')].pop().focus();
      }
    });

    show(generateRandomGraph(5));
  },
};

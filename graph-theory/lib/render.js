// Drawing graphs with Cytoscape.
//
// Moved from legacy/graph-theory/script.js. A mode calls createGraphView() on
// an element; it builds the graph area, a screen-reader description and zoom
// buttons there, and returns functions to draw graphs into it.
//
// The topic page must load, with plain tags:
// - vendor/cytoscape.min.js, which defines the global `cytoscape` (it isn't
//   an ES module);
// - lib/graph-view.css, before any graph area is built: Cytoscape measures its
//   area straight away, so the area's size must already be styled.

import { vertexId, graphToDescription } from './graph.js';

/** Cytoscape style, with colors read from the --graph-* tokens in tokens.css. */
function graphStyle() {
  const css = getComputedStyle(document.documentElement);
  const token = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
  const nodeFill = token('--graph-node-fill', '#fff');
  const nodeBorder = token('--graph-node-border', '#333');
  const nodeLabel = token('--graph-node-label', '#333');
  const edge = token('--graph-edge', '#888');
  const edgeLabel = token('--graph-edge-label', '#fff');

  return [
    {
      selector: 'node',
      style: {
        'background-color': nodeFill,
        'border-width': 2,
        'border-color': nodeBorder,
        'label': 'data(displayName)',
        'color': nodeLabel,
        'text-valign': 'center',
        'text-halign': 'center',
        'width': 'mapData(labelLen, 1, 12, 36, 120)',
        'height': 36,
        'shape': 'ellipse',
      },
    },
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': edge,
        'curve-style': 'bezier',
        'font-size': 12,
        'color': edgeLabel,
        'text-background-color': edge,
        'text-background-opacity': 1,
        'text-background-padding': 6,
      },
    },
    { selector: 'edge[label]', style: { 'label': 'data(label)' } },
    {
      selector: 'edge[directed = "yes"]',
      style: { 'target-arrow-color': edge, 'target-arrow-shape': 'triangle' },
    },
    {
      selector: 'edge[directed = "no"]',
      style: { 'target-arrow-shape': 'none' },
    },
  ];
}

let nextViewId = 1;
let announcer = null;

/** One shared live region, so screen readers announce newly drawn graphs. */
function announce(text) {
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.className = 'sr-only';
    announcer.setAttribute('aria-live', 'polite');
    document.body.append(announcer);
  }
  announcer.textContent = '';
  setTimeout(() => { announcer.textContent = text; }, 50);
}

/**
 * Build a graph area inside `parent`.
 *
 * @param {HTMLElement} parent
 * @param {object} [options]
 * @param {string} [options.label]  accessible name of the graph area
 * @param {boolean} [options.zoomButtons]
 * @param {boolean} [options.compact]  shorter area, e.g. for two graphs on one page
 * @returns {{
 *   cy: object,
 *   draw: (graph: object, options?: {announce?: boolean}) => void,
 *   drawCircle: (graph: object, vertexOrder?: number[], options?: {announce?: boolean}) => void,
 *   describe: (graph: object, options?: {announce?: boolean}) => void,
 *   setEdgeLabels: (graph: object, options?: {announce?: boolean}) => void,
 *   refresh: () => void,
 * }}
 */
export function createGraphView(parent, { label = 'Graph diagram', zoomButtons = true, compact = false } = {}) {
  if (typeof cytoscape !== 'function') {
    throw new Error('Cytoscape is not loaded: the page needs <script src="../vendor/cytoscape.min.js">.');
  }

  const descId = `graph-description-${nextViewId++}`;
  const wrapper = document.createElement('div');
  wrapper.className = compact ? 'graph-view is-compact' : 'graph-view';
  wrapper.innerHTML = `
    <div class="graph-area" role="img" aria-describedby="${descId}">
      <div class="graph-viewport"></div>
    </div>
    <p class="sr-only" id="${descId}"></p>
    ${zoomButtons ? `
    <div class="zoom-controls">
      <button type="button" class="zoom-in">Zoom in</button>
      <button type="button" class="zoom-out">Zoom out</button>
    </div>` : ''}`;
  wrapper.querySelector('.graph-area').setAttribute('aria-label', label);
  parent.append(wrapper);

  const cy = cytoscape({
    container: wrapper.querySelector('.graph-viewport'),
    elements: [],
    style: graphStyle(),
    userZoomingEnabled: true,
    layout: { name: 'preset' },
  });

  // Fit the graph again whenever the area changes size: window resized,
  // phone rotated, or panel shown after being hidden.
  const viewport = wrapper.querySelector('.graph-viewport');
  let lastSize = '';
  new ResizeObserver(() => {
    const size = `${viewport.clientWidth}x${viewport.clientHeight}`;
    if (size === lastSize || viewport.clientHeight === 0) return;
    lastSize = size;
    cy.resize();
    if (cy.elements().length) { cy.fit(); cy.center(); }
  }).observe(viewport);

  if (zoomButtons) {
    const mid = () => ({ x: cy.width() / 2, y: cy.height() / 2 });
    wrapper.querySelector('.zoom-in').addEventListener('click',
      () => cy.zoom({ level: cy.zoom() * 1.2, renderedPosition: mid() }));
    wrapper.querySelector('.zoom-out').addEventListener('click',
      () => cy.zoom({ level: cy.zoom() / 1.2, renderedPosition: mid() }));
  }

  function describe(graph, { announce: shouldAnnounce = true } = {}) {
    const { text } = graphToDescription(graph);
    wrapper.querySelector(`#${descId}`).textContent = text;
    if (shouldAnnounce) announce('New graph loaded. ' + text);
  }

  return {
    cy,

    /** Draw `graph` with a force-directed layout (vertices placed randomly). */
    draw(graph, options) {
      if (!graph) return;
      replaceElements(cy, graph);
      runLayout(cy, { name: 'cose', animate: false, randomize: true, fit: true });
      describe(graph, options);
    },

    /** Draw `graph` with vertices on a circle, in `vertexOrder` (indices) if given. */
    drawCircle(graph, vertexOrder, options) {
      if (!graph) return;
      const n = Number(graph.n) || 0;
      const order = vertexOrder || Array.from({ length: n }, (_, i) => i);
      const R = 150;
      const positions = {};
      order.forEach((vIdx, k) => {
        const angle = (2 * Math.PI * k) / n - Math.PI / 2;
        positions[vertexId(vIdx)] = { x: R * Math.cos(angle), y: R * Math.sin(angle) };
      });
      replaceElements(cy, graph, positions);
      runLayout(cy, { name: 'preset', animate: false, fit: true });
      describe(graph, options);
    },

    /** Update the screen-reader description without redrawing. */
    describe,

    /**
     * Show `graph`'s edge labels (e.g. weights revealed after a first answer)
     * without moving any vertex. `graph` must be the one last drawn.
     */
    setEdgeLabels(graph, options) {
      cy.batch(() => {
        graph.edges.forEach((e, idx) => {
          const edge = cy.getElementById(`e${idx}_${e.source}_${e.target}`);
          const label = e.label && String(e.label).trim() !== '' ? String(e.label).trim() : null;
          if (label === null) edge.removeData('label');
          else edge.data('label', label);
        });
      });
      describe(graph, options);
    },

    /**
     * Fit the graph to its area again. Size changes are handled automatically;
     * call this to undo the user's zooming and panning.
     */
    refresh() {
      cy.resize();
      cy.fit();
      cy.center();
    },
  };
}

/** Replace everything in `cy` with the vertices and edges of `graph`. */
function replaceElements(cy, graph, positions = null) {
  const n = Number(graph.n) || 0;
  const names = Array.isArray(graph.names) ? graph.names : [];
  const edges = Array.isArray(graph.edges) ? graph.edges : [];
  const elems = [];

  for (let i = 0; i < n; i++) {
    const id = vertexId(i);
    const displayName = (names[i] && String(names[i]).trim()) ? String(names[i]).trim() : id;
    const node = { data: { id, displayName, labelLen: displayName.length } };
    if (positions) node.position = positions[id];
    elems.push(node);
  }

  const validIds = new Set(Array.from({ length: n }, (_, i) => vertexId(i)));
  edges.forEach((e, idx) => {
    if (!validIds.has(e.source) || !validIds.has(e.target)) {
      console.warn(`Graph drawing: skipping edge ${idx}, unknown endpoint`, e);
      return;
    }
    const data = {
      id: `e${idx}_${e.source}_${e.target}`,
      source: e.source,
      target: e.target,
      directed: graph.directed ? 'yes' : 'no',
    };
    if (e.label && String(e.label).trim() !== '') data.label = String(e.label).trim();
    elems.push({ data });
  });

  cy.batch(() => { cy.elements().remove(); cy.add(elems); });
  cy.resize();
}

function runLayout(cy, options) {
  const layout = cy.layout(options);
  layout.on('layoutstop', () => { cy.fit(); cy.center(); });
  layout.run();
}

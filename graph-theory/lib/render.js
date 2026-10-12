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

import { vertexId, vertexIndex, vertexLabel } from './graph/core.js';

// ---------------------------------------------------------------------------
// Graph description (for screen readers / alt text)
// ---------------------------------------------------------------------------
// Moved here unchanged from lib/graph.js: it's page text, not graph math. Make
// a Graph also uses it for its alt text box.

/**
 * Convert a graph object to a plain-English description suitable for screen
 * readers and alt-text output.
 * @param {object} graph  - full graph object {n, names, directed, edgeLabel, edges}
 * @returns {{ text: string, isLong: boolean }}
 */
export function graphToDescription(graph) {
    if (!graph) return { text: 'No graph data available.', isLong: false };

    const n      = Number(graph.n) || 0;
    const names  = Array.isArray(graph.names)  ? graph.names  : [];
    const edges  = Array.isArray(graph.edges)  ? graph.edges  : [];
    const isLong = edges.length > 10 || n > 8;

    const parts = [];
    parts.push(`A ${graph.directed ? 'directed ' : ''}graph with ${n} ${n === 1 ? 'vertex' : 'vertices'} and ${edges.length} ${edges.length === 1 ? 'edge' : 'edges'}.`);

    if (isLong) parts.push('Note: this graph is large. The following description may be lengthy.');

    for (let i = 0; i < n; i++) {
        const name = names[i] && String(names[i]).trim();
        parts.push(name ? `Vertex ${i + 1} labeled ${name}.` : `Vertex ${i + 1}.`);
    }

    parts.push(edges.length === 0 ? 'There are no edges.' : 'The full edge list is as follows.');

    for (const e of edges) {
        const src  = vertexLabel(e.source, names);
        const tgt  = vertexLabel(e.target, names);
        const lbl  = e.label && String(e.label).trim() !== '' ? String(e.label).trim() : null;
        const loop = vertexIndex(e.source) === vertexIndex(e.target);

        let sentence;
        if (graph.directed) {
            sentence = lbl !== null
                ? (graph.edgeLabel === 'weight'
                    ? `A directed edge from ${src} to ${tgt} with weight ${lbl}.`
                    : `A directed edge from ${src} to ${tgt} labeled ${lbl}.`)
                : `A directed edge from ${src} to ${tgt}.`;
        } else if (loop) {
            sentence = lbl !== null ? `A loop on vertex ${src} labeled ${lbl}.` : `A loop on vertex ${src}.`;
        } else {
            sentence = lbl !== null
                ? (graph.edgeLabel === 'weight'
                    ? `An edge between ${src} and ${tgt} with weight ${lbl}.`
                    : `An edge between ${src} and ${tgt} labeled ${lbl}.`)
                : `An edge between ${src} and ${tgt}.`;
        }
        parts.push(sentence);
    }

    return { text: parts.join(' '), isLong };
}

// Labels (vertex names, edge weights) in the site's font, semibold.
// Cytoscape accepts only double quotes in font names.
const LABEL_FONT_WEIGHT = 600;
const labelFont = () => (getComputedStyle(document.documentElement)
  .getPropertyValue('--font-body').trim() || 'sans-serif').replaceAll("'", '"');

/** Cytoscape style, with colors read from the --graph-* tokens in tokens.css. */
function graphStyle() {
  const css = getComputedStyle(document.documentElement);
  const token = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
  const font = { 'font-family': labelFont(), 'font-weight': LABEL_FONT_WEIGHT };
  const nodeFill = token('--graph-node-fill', '#fff');
  const nodeBorder = token('--graph-node-border', '#243142');
  const nodeLabel = token('--graph-node-label', '#243142');
  const edge = token('--graph-edge', '#75838f');
  const edgeLabel = token('--graph-edge-label', '#fff');
  const edgeLabelBg = token('--graph-edge-label-bg', '#4c5a69');

  return [
    {
      selector: 'node',
      style: {
        'background-color': nodeFill,
        'border-width': 2,
        'border-color': nodeBorder,
        'label': 'data(displayName)',
        'color': nodeLabel,
        ...font,
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
        ...font,
        'text-background-color': edgeLabelBg,
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

  // Cytoscape draws on a canvas, which isn't redrawn when a web font
  // arrives: draw again once the label font has loaded.
  document.fonts?.load(`${LABEL_FONT_WEIGHT} 16px ${labelFont()}`)
    .then(() => cy.style(graphStyle()))
    .catch(() => {});

  // TODO(refactor): moving vertices (drag) and panning need a mouse or touch.
  // Nothing needs them to answer, but the hints suggest dragging, and
  // Isomorphism suggests rearranging to compare. A keyboard way (choose a
  // vertex, move it with the arrow keys) would need its own controls.

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

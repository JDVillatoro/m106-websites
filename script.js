// =============================================================================
// script.js  –  Graph Theory Website (glue + shared rendering)
// =============================================================================

const VERBOSE = (typeof window !== 'undefined' && !!window.GRAPH_VERBOSE);

// ---------------------------------------------------------------------------
// Shared Cytoscape style
// ---------------------------------------------------------------------------
const CY_STYLE = [
    {
        selector: 'node',
        style: {
            'background-color': '#fff',
            'border-width': 2,
            'border-color': '#333',
            'label': 'data(displayName)',
            'color': '#333',
            'text-valign': 'center',
            'text-halign': 'center',
            'width': 'mapData(labelLen, 1, 12, 36, 120)',
            'height': 36,
            'shape': 'ellipse'
        }
    },
    {
        selector: 'edge',
        style: {
            'width': 2,
            'line-color': '#888',
            'curve-style': 'bezier',
            'font-size': 12,
            'color': '#fff',
            'text-background-color': '#888',
            'text-background-opacity': 1,
            'text-background-padding': 6
        }
    },
    { selector: 'edge[label]', style: { 'label': 'data(label)' } },
    {
        selector: 'edge[directed = "yes"]',
        style: { 'target-arrow-color': '#888', 'target-arrow-shape': 'triangle' }
    },
    {
        selector: 'edge[directed = "no"]',
        style: { 'target-arrow-shape': 'none' }
    }
];

// ---------------------------------------------------------------------------
// Per-mode Cytoscape instances (lazy, cached on window)
// ---------------------------------------------------------------------------
const CY_CONFIG = {
    make:     { containerId: 'make-graph-area',     panelId: 'make-graph-panel' },
    degree:   { containerId: 'degree-graph-area',   panelId: 'degree-panel' },
    eulerian: { containerId: 'eulerian-graph-area', panelId: 'eulerian-panel' },
    planar:   { containerId: 'planar-graph-area',   panelId: 'planar-panel' },
    coloring: { containerId: 'coloring-graph-area', panelId: 'coloring-panel' },
    iso1:     { containerId: 'iso-graph-area-1',    panelId: 'iso-col-1' },
    iso2:     { containerId: 'iso-graph-area-2',    panelId: 'iso-col-2' },
};

window._cy = {};   // mode → cytoscape instance

/**
 * Get or lazily create the Cytoscape instance for a given mode.
 * @param {'make'|'degree'|'eulerian'|'iso1'|'iso2'} mode
 * @returns {object|null}
 */
function getCy(mode) {
    if (window._cy[mode]) return window._cy[mode];

    const cfg = CY_CONFIG[mode];
    if (!cfg) return null;
    const container = document.getElementById(cfg.containerId);
    if (!container) return null;

    let vp = container.querySelector('.graph-viewport');
    if (!vp) {
        vp = document.createElement('div');
        vp.className = 'graph-viewport';
        container.appendChild(vp);
    }

    window._cy[mode] = cytoscape({
        container: vp,
        elements: [],
        style: CY_STYLE,
        userZoomingEnabled: true,
        layout: { name: 'preset' }
    });
    wireZoomButtons(cfg.panelId, window._cy[mode]);
    return window._cy[mode];
}

function wireZoomButtons(panelId, cy) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    const zin = panel.querySelector('.zoom-button.zoom-in');
    const zout = panel.querySelector('.zoom-button.zoom-out');
    const mid = () => ({ x: cy.width() / 2, y: cy.height() / 2 });
    if (zin) zin.onclick = () => cy.zoom({ level: cy.zoom() * 1.2, renderedPosition: mid() });
    if (zout) zout.onclick = () => cy.zoom({ level: cy.zoom() / 1.2, renderedPosition: mid() });
}

// ---------------------------------------------------------------------------
// draw_graph – render a graph object into a Cytoscape instance
// ---------------------------------------------------------------------------
/**
 * @param {object} graph  - {n, names, directed, edgeLabel, edges}
 * @param {object} cy     - Cytoscape instance
 */
function draw_graph(graph, cy) {
    if (!cy || !graph) return;

    const n = Number(graph.n) || 0;
    const names = Array.isArray(graph.names) ? graph.names : [];
    const edges = Array.isArray(graph.edges) ? graph.edges : [];

    const elems = [];

    for (let i = 0; i < n; i++) {
        const id = vertexId(i);
        const displayName = (names[i] && String(names[i]).trim()) ? String(names[i]).trim() : id;
        elems.push({ data: { id, displayName, labelLen: displayName.length } });
    }

    const validIds = new Set(Array.from({ length: n }, (_, i) => vertexId(i)));
    edges.forEach((e, idx) => {
        if (!validIds.has(e.source) || !validIds.has(e.target)) {
            if (VERBOSE) console.warn(`draw_graph: skipping edge ${idx} – unknown endpoint`, e);
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

    const layout = cy.layout({ name: 'cose', animate: false, randomize: true, fit: true });
    layout.on('layoutstop', () => { cy.fit(); cy.center(); });
    layout.run();
}

// ---------------------------------------------------------------------------
// drawGraphCircle – render a graph with vertices placed on a circle
// ---------------------------------------------------------------------------
/**
 * @param {object}   graph
 * @param {object}   cy
 * @param {number[]} vertexOrder
 */
function drawGraphCircle(graph, cy, vertexOrder) {
    if (!cy || !graph) return;

    const n     = Number(graph.n) || 0;
    const names = Array.isArray(graph.names) ? graph.names : [];
    const edges = Array.isArray(graph.edges) ? graph.edges : [];
    const order = vertexOrder || Array.from({ length: n }, (_, i) => i);

    const R = 150;
    const posMap = {};
    order.forEach((vIdx, k) => {
        const angle = (2 * Math.PI * k) / n - Math.PI / 2;
        posMap[vertexId(vIdx)] = { x: R * Math.cos(angle), y: R * Math.sin(angle) };
    });

    const elems = [];
    for (let i = 0; i < n; i++) {
        const id = vertexId(i);
        const displayName = (names[i] && String(names[i]).trim()) ? String(names[i]).trim() : id;
        elems.push({ data: { id, displayName, labelLen: displayName.length }, position: posMap[id] });
    }

    const validIds = new Set(Array.from({ length: n }, (_, i) => vertexId(i)));
    edges.forEach((e, idx) => {
        if (!validIds.has(e.source) || !validIds.has(e.target)) return;
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
    const layout = cy.layout({ name: 'preset', animate: false, fit: true });
    layout.on('layoutstop', () => { cy.fit(); cy.center(); });
    layout.run();
}

// ---------------------------------------------------------------------------
// Screen-reader accessibility helpers
// ---------------------------------------------------------------------------
function updateGraphAria(descriptionElementId, graph, announce) {
    const descEl = document.getElementById(descriptionElementId);
    const announcer = document.getElementById('graph-sr-announcer');
    if (!descEl) return;

    const { text } = graphToDescription(graph);
    descEl.textContent = text;

    if (announce && announcer) {
        announcer.textContent = '';
        setTimeout(() => { announcer.textContent = 'New graph loaded. ' + text; }, 50);
    }

    if (descriptionElementId === 'make-graph-description') refreshAltTextPanel(graph);
}

// ---------------------------------------------------------------------------
// Shared mode state
// ---------------------------------------------------------------------------
const modeStates = {
    make:     { graph: null, _initialized: false },
    degree:   { graph: null, expectedSeq: [], stats: { correct: 0, incorrect: 0 }, _initialized: false },
    eulerian: { graph: null, stats: { correct: 0, total: 0, points: 0 }, _initialized: false, currentPuzzle: null, part1Scored: false, part2Scored: false },
    iso:      { stats: { total: 0, points: 0 }, _initialized: false, currentPuzzle: null, part1Scored: false, part2Scored: false },
    planar:   { graph: null, stats: { total: 0, points: 0 }, _initialized: false, currentPuzzle: null, part1Scored: false, part2Scored: false },
    coloring: { graph: null, stats: { total: 0, points: 0 }, _initialized: false, currentPuzzle: null, selection: {} },
    applications: { stats: { total: 0, points: 0 }, _initialized: false, currentPuzzle: null, selection: {}, lastFeedbackWasCorrect: false, organizationName: null },
};
let currentMode = 'make';

// ---------------------------------------------------------------------------
// Mode switching glue
// ---------------------------------------------------------------------------
const modeMakeBtn = document.getElementById('mode-make');
const modeDegreeBtn = document.getElementById('mode-degree');
const modeEulerBtn = document.getElementById('mode-eulerian');
const modeIsoBtn = document.getElementById('mode-iso');
const modePlanarBtn = document.getElementById('mode-planar');
const modeColoringBtn = document.getElementById('mode-coloring');
const modeApplicationsBtn = document.getElementById('mode-applications');

function setMode(mode) {
    document.querySelectorAll('.mode-panel').forEach(p => p.style.display = 'none');

    const activate = id => document.getElementById(id)?.classList.add('active');
    const deactivate = id => document.getElementById(id)?.classList.remove('active');

    ['mode-make', 'mode-degree', 'mode-eulerian', 'mode-iso', 'mode-planar', 'mode-coloring', 'mode-applications'].forEach(deactivate);

    if (mode === 'make') {
        activate('mode-make');
        document.getElementById('make-graph-panel').style.display = '';
        currentMode = 'make';
        const g = modeStates.make.graph;
        if (g) setTimeout(() => {
            const cy = getCy('make');
            if (cy) draw_graph(g, cy);
            updateGraphAria('make-graph-description', g, true);
        }, 30);

    } else if (mode === 'degree') {
        activate('mode-degree');
        document.getElementById('degree-panel').style.display = '';
        currentMode = 'degree';
        if (!modeStates.degree._initialized) {
            loadDegreeStats();
            bindDegreeControls();
            modeStates.degree._initialized = true;
            setTimeout(() => startDegreeSequence(), 30);
        } else {
            const g = modeStates.degree.graph;
            if (g) setTimeout(() => {
                const cy = getCy('degree');
                if (cy) draw_graph(g, cy);
                updateGraphAria('degree-graph-description', g, true);
            }, 30);
        }

    } else if (mode === 'eulerian') {
        activate('mode-eulerian');
        document.getElementById('eulerian-panel').style.display = '';
        currentMode = 'eulerian';
        if (!modeStates.eulerian._initialized) {
            loadEulerianStats();
            bindEulerianControls();
            modeStates.eulerian._initialized = true;
            setTimeout(() => startEulerianTrial(), 30);
        } else {
            const g = modeStates.eulerian.graph;
            if (g) setTimeout(() => {
                const cy = getCy('eulerian');
                if (cy) draw_graph(g, cy);
                updateGraphAria('eulerian-graph-description', g, true);
            }, 30);
        }
    } else if (mode === 'iso') {
        activate('mode-iso');
        document.getElementById('iso-panel').style.display = '';
        currentMode = 'iso';
        if (!modeStates.iso._initialized) {
            loadIsoStats();
            bindIsoControls();
            modeStates.iso._initialized = true;
            setTimeout(() => startIsoTrial(), 30);
        } else {
            const p = modeStates.iso.currentPuzzle;
            if (p) setTimeout(() => {
                drawGraphCircle(p.g1, getCy('iso1'), shuffle(Array.from({ length: p.g1.n }, (_, i) => i)));
                drawGraphCircle(p.g2, getCy('iso2'), shuffle(Array.from({ length: p.g2.n }, (_, i) => i)));
            }, 30);
        }
    } else if (mode === 'planar') {
        activate('mode-planar');
        document.getElementById('planar-panel').style.display = '';
        currentMode = 'planar';
        if (!modeStates.planar._initialized) {
            loadPlanarStats();
            bindPlanarControls();
            modeStates.planar._initialized = true;
            setTimeout(() => startPlanarTrial(), 30);
        } else {
            const g = modeStates.planar.graph;
            if (g) setTimeout(() => {
                const cy = getCy('planar');
                if (cy) draw_graph(g, cy);
                updateGraphAria('planar-graph-description', g, true);
            }, 30);
        }
    } else if (mode === 'coloring') {
        activate('mode-coloring');
        document.getElementById('coloring-panel').style.display = '';
        currentMode = 'coloring';
        if (!modeStates.coloring._initialized) {
            loadColoringStats();
            bindColoringControls();
            modeStates.coloring._initialized = true;
            setTimeout(() => startColoringTrial(), 30);
        } else {
            const g = modeStates.coloring.graph;
            if (g) setTimeout(() => {
                const cy = getCy('coloring');
                if (cy) draw_graph(g, cy);
                updateGraphAria('coloring-graph-description', g, true);
                applyColoringSelectionToGraph();
            }, 30);
        }
    } else if (mode === 'applications') {
        activate('mode-applications');
        document.getElementById('applications-panel').style.display = '';
        currentMode = 'applications';
        if (!modeStates.applications._initialized) {
            loadApplicationsStats();
            bindApplicationsControls();
            modeStates.applications._initialized = true;
            setTimeout(() => startApplicationsTrial(), 30);
        }
    }
}

modeMakeBtn && modeMakeBtn.addEventListener('click', () => setMode('make'));
modeDegreeBtn && modeDegreeBtn.addEventListener('click', () => setMode('degree'));
modeEulerBtn && modeEulerBtn.addEventListener('click', () => setMode('eulerian'));
modeIsoBtn && modeIsoBtn.addEventListener('click', () => setMode('iso'));
modePlanarBtn && modePlanarBtn.addEventListener('click', () => setMode('planar'));
modeColoringBtn && modeColoringBtn.addEventListener('click', () => setMode('coloring'));
modeApplicationsBtn && modeApplicationsBtn.addEventListener('click', () => setMode('applications'));

// ---------------------------------------------------------------------------
// Initial load
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    setMode('make');
    setTimeout(() => generateAndRenderRandom(5, false), 30);
});

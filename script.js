// =============================================================================
// script.js  –  Graph Theory Website
// =============================================================================
// Key design decisions:
//  • Each mode owns its own Cytoscape instance (_cyMake / _cyDegree / _cyEulerian).
//    Sharing a single instance caused layout/resize bugs when switching panels.
//  • draw_graph() accepts a graph object {n, names, directed, edgeLabel, edges}
//    and renders it into a Cytoscape instance.
//  • Editor state (editorNodes / editorEdges) works entirely with internal ids
//    ("v0", "v1", …) – display names are kept in inputs only.
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
    make:     { containerId: 'make-graph-area',    panelId: 'make-graph-panel' },
    degree:   { containerId: 'degree-graph-area',  panelId: 'degree-panel' },
    eulerian: { containerId: 'eulerian-graph-area', panelId: 'eulerian-panel' },
    iso1:     { containerId: 'iso-graph-area-1',   panelId: 'iso-col-1' },
    iso2:     { containerId: 'iso-graph-area-2',   panelId: 'iso-col-2' },
};

window._cy = {};   // mode → cytoscape instance

/**
 * Get or lazily create the Cytoscape instance for a given mode.
 * @param {'make'|'degree'|'eulerian'} mode
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
 * Draws a graph into a Cytoscape instance with every vertex placed evenly
 * around a circle, in the order given by `vertexOrder`.  Passing different
 * shuffled `vertexOrder` arrays for two copies of the same graph makes them
 * look visually distinct while preserving identical adjacency.
 *
 * @param {object}   graph        - {n, names, directed, edgeLabel, edges}
 * @param {object}   cy           - Cytoscape instance
 * @param {number[]} vertexOrder  - permutation of [0 .. n-1]; slot k gets vertex vertexOrder[k]
 */
function drawGraphCircle(graph, cy, vertexOrder) {
    if (!cy || !graph) return;

    const n     = Number(graph.n)  || 0;
    const names = Array.isArray(graph.names) ? graph.names : [];
    const edges = Array.isArray(graph.edges) ? graph.edges : [];
    const order = vertexOrder || Array.from({ length: n }, (_, i) => i);

    // Compute positions: vertex at slot k sits at angle 2πk/n on a circle
    const R = 150;
    const posMap = {};
    order.forEach((vIdx, k) => {
        const angle = (2 * Math.PI * k) / n - Math.PI / 2;
        posMap[vertexId(vIdx)] = { x: R * Math.cos(angle), y: R * Math.sin(angle) };
    });

    const elems = [];
    for (let i = 0; i < n; i++) {
        const id          = vertexId(i);
        const displayName = (names[i] && String(names[i]).trim()) ? String(names[i]).trim() : id;
        elems.push({ data: { id, displayName, labelLen: displayName.length }, position: posMap[id] });
    }

    const validIds = new Set(Array.from({ length: n }, (_, i) => vertexId(i)));
    edges.forEach((e, idx) => {
        if (!validIds.has(e.source) || !validIds.has(e.target)) return;
        const data = {
            id:       `e${idx}_${e.source}_${e.target}`,
            source:   e.source,
            target:   e.target,
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
/**
 * Update the static description element and optionally push to the live region.
 * @param {string}  descriptionElementId
 * @param {object}  graph
 * @param {boolean} announce
 */
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
// Mode state
// ---------------------------------------------------------------------------
const modeStates = {
    make:     { graph: null, _initialized: false },
    degree:   { graph: null, expectedSeq: [], stats: { correct: 0, incorrect: 0 }, _initialized: false },
    eulerian: { graph: null, stats: { correct: 0, total: 0, points: 0 }, _initialized: false, currentPuzzle: null, part1Scored: false, part2Scored: false },
    iso:      { stats: { total: 0, points: 0 }, _initialized: false, currentPuzzle: null, part1Scored: false, part2Scored: false },
};
let currentMode = 'make';

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------
const editBtn = document.getElementById('edit-graph-btn');
const downloadBtn = document.getElementById('download-btn');
const altTextBtn = document.getElementById('alt-text-btn');
const altTextPanel = document.getElementById('alt-text-panel');
const altTextOutput = document.getElementById('alt-text-output');
const altTextCopyBtn = document.getElementById('alt-text-copy-btn');
const doneEditBtn = document.getElementById('done-edit-btn');
const closeEditBtn = document.getElementById('close-edit-btn');
const modeMakeBtn = document.getElementById('mode-make');
const modeDegreeBtn = document.getElementById('mode-degree');
const modeEulerBtn = document.getElementById('mode-eulerian');
const modeIsoBtn   = document.getElementById('mode-iso');
const editor = document.getElementById('graph-editor');
const setVerticesBtn = document.getElementById('set-vertices-btn');
const editorVertices = document.getElementById('editor-vertices');
const vertexNamesDiv = document.getElementById('vertex-names');
const edgeListDiv = document.getElementById('edge-list');
const editorRandomBtn = document.getElementById('editor-random-btn');

// Editor working state (internal ids and display names)
let editorNodes = [];   // display names parallel to v0..v{n-1}
let editorEdges = [];   // [{source: "v0", target: "v1", label, isDirected}]

// ---------------------------------------------------------------------------
// Mode switching
// ---------------------------------------------------------------------------
function setMode(mode) {
    document.querySelectorAll('.mode-panel').forEach(p => p.style.display = 'none');

    const activate = id => document.getElementById(id)?.classList.add('active');
    const deactivate = id => document.getElementById(id)?.classList.remove('active');

    ['mode-make', 'mode-degree', 'mode-eulerian', 'mode-iso'].forEach(deactivate);

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
    }
}

modeMakeBtn && modeMakeBtn.addEventListener('click', () => setMode('make'));
modeDegreeBtn && modeDegreeBtn.addEventListener('click', () => setMode('degree'));
modeEulerBtn && modeEulerBtn.addEventListener('click', () => setMode('eulerian'));
modeIsoBtn   && modeIsoBtn.addEventListener('click',   () => setMode('iso'));

// ---------------------------------------------------------------------------
// Random graph generation for the make panel
// ---------------------------------------------------------------------------
/**
 * Generate a graph of a given type, store it, render it, and optionally
 * populate the editor.
 * @param {number}  n
 * @param {boolean} populateEditor
 * @param {string}  [type='default']
 */
function generateAndRenderRandom(n = 5, populateEditor = false, type = 'default') {
    let graph;

    if (type === 'msc_digraph') {
        graph = generateMSCDigraph(n);
    } else if (type === 'eulerian_digraph') {
        graph = generateEulerianDigraph(n);
    } else if (type === 'simple_graph') {
        graph = generateSimpleGraph(n);
    } else if (type === 'eulerian_simple') {
        graph = generateEulerianSimpleGraph(n);
    } else if (type === 'eulerian_multi') {
        graph = generateEulerianMultigraph(n);
    } else {
        graph = generateRandomGraph(n);
    }

    modeStates.make.graph = graph;

    const cy = getCy('make');
    if (cy) draw_graph(graph, cy);
    updateGraphAria('make-graph-description', graph, true);

    if (populateEditor) {
        editorVertices.value = n;
        editorNodes = graph.names.slice();
        createVertexInputs(n);
        const inputs = vertexNamesDiv.querySelectorAll('input');
        inputs.forEach((inp, i) => {
            inp.value = graph.names[i] || '';
            inp.placeholder = graph.names[i] || '';
            inp.dataset.prev = inp.value;
            inp.dataset.id = vertexId(i);
        });
        const directedCheckbox = document.getElementById('editor-directed');
        if (directedCheckbox) directedCheckbox.checked = graph.directed;
        // Convert graph edges to editor edge format
        editorEdges = graph.edges.map(e => ({
            source: e.source,
            target: e.target,
            label: e.label || null,
        }));
        renderEdgeList();
        editor.style.display = 'block';
        if (editBtn) editBtn.style.display = 'none';
        if (doneEditBtn) doneEditBtn.style.display = '';
        if (closeEditBtn) closeEditBtn.style.display = '';
        if (downloadBtn) downloadBtn.style.display = 'none';
    }
}

// ---------------------------------------------------------------------------
// Initial load
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    setMode('make');
    setTimeout(() => generateAndRenderRandom(5, false), 30);
});

// ---------------------------------------------------------------------------
// Editor – open / close
// ---------------------------------------------------------------------------
editBtn && editBtn.addEventListener('click', () => {
    const cy = getCy('make');
    if (cy) {
        const nodes = cy.nodes().map(nd => ({ id: nd.data('id'), name: nd.data('displayName') || '' }));
        const cyEdges = cy.edges().map(ed => ({
            source: ed.data('source'),
            target: ed.data('target'),
            label: ed.data('label') || null,
        }));
        editorVertices.value = nodes.length || 1;
        editorNodes = nodes.map(nd => nd.name);
        createVertexInputs(nodes.length || 1);
        const inputs = vertexNamesDiv.querySelectorAll('input');
        inputs.forEach((inp, i) => {
            inp.value = nodes[i] ? nodes[i].name : '';
            inp.placeholder = inp.value;
            inp.dataset.prev = inp.value;
            inp.dataset.id = nodes[i] ? nodes[i].id : vertexId(i);
        });
        editorEdges = cyEdges;
        const directedCheckbox = document.getElementById('editor-directed');
        if (directedCheckbox) {
            const g = modeStates.make.graph;
            directedCheckbox.checked = g ? g.directed : false;
        }
        renderEdgeList();
    }
    editor.style.display = 'block';
    if (editBtn) editBtn.style.display = 'none';
    if (doneEditBtn) doneEditBtn.style.display = '';
    if (closeEditBtn) closeEditBtn.style.display = '';
    if (downloadBtn) downloadBtn.style.display = 'none';
});

closeEditBtn && closeEditBtn.addEventListener('click', () => {
    editor.style.display = 'none';
    if (editBtn) editBtn.style.display = '';
    if (doneEditBtn) doneEditBtn.style.display = 'none';
    if (closeEditBtn) closeEditBtn.style.display = 'none';
    if (downloadBtn) downloadBtn.style.display = '';
});

// ---------------------------------------------------------------------------
// Editor – apply (Done Editing)
// ---------------------------------------------------------------------------
function applyGraphAction() {
    const inputs = vertexNamesDiv.querySelectorAll('input');
    const vertices = Array.from(inputs).map((inp, idx) => ({
        id: inp.dataset.id || vertexId(idx),
        name: (inp.value || '').trim(),
    }));

    const n = vertices.length;
    const names = vertices.map(v => v.name);

    // Resolve and filter edges
    const edges = [];
    for (const e of editorEdges) {
        const sVert = vertices.find(v => v.id === e.source || v.name === String(e.source || '').trim());
        const tVert = vertices.find(v => v.id === e.target || v.name === String(e.target || '').trim());
        if (!sVert || !tVert) continue;
        edges.push({ source: sVert.id, target: tVert.id, label: e.label || null });
    }

    const directedCheckbox = document.getElementById('editor-directed');
    const directed = directedCheckbox ? directedCheckbox.checked : false;
    const hasLabels = edges.some(e => e.label && e.label.trim() !== '');
    const allNumeric = hasLabels && edges.filter(e => e.label).every(e => !isNaN(Number(e.label)));
    const edgeLabel = !hasLabels ? null : allNumeric ? 'weight' : 'name';

    const graph = { n, names, directed, edgeLabel, edges };
    modeStates.make.graph = graph;

    const cy = getCy('make');
    if (cy) draw_graph(graph, cy);
    updateGraphAria('make-graph-description', graph, true);

    editor.style.display = 'none';
    if (editBtn) editBtn.style.display = '';
    if (doneEditBtn) doneEditBtn.style.display = 'none';
    if (closeEditBtn) closeEditBtn.style.display = 'none';
    if (downloadBtn) downloadBtn.style.display = '';
}

doneEditBtn && doneEditBtn.addEventListener('click', applyGraphAction);

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------
downloadBtn && downloadBtn.addEventListener('click', async () => {
    const cy = getCy('make');
    if (!cy) { alert('No graph to download'); return; }
    if (typeof cy.svg === 'function') {
        try {
            const svgStr = cy.svg({ scale: 1 });
            const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'graph.svg';
            document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
            return;
        } catch (e) { console.warn('SVG export failed, trying PNG', e); }
    }
    if (typeof cy.png === 'function') {
        try {
            const dataUrl = cy.png({ full: true, scale: 1 });
            const res = await fetch(dataUrl);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'graph.png';
            document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
            return;
        } catch (e) { console.warn('PNG export failed', e); }
    }
    alert('Export not available. Add the cytoscape-svg extension to enable SVG export.');
});

// ---------------------------------------------------------------------------
// Alt text panel
// ---------------------------------------------------------------------------
altTextBtn && altTextBtn.addEventListener('click', () => {
    const isVisible = altTextPanel.style.display !== 'none';
    if (isVisible) {
        altTextPanel.style.display = 'none';
    } else {
        const g = modeStates.make.graph;
        altTextOutput.value = g ? graphToDescription(g).text : '';
        altTextPanel.style.display = 'block';
        altTextOutput.style.height = 'auto';
        altTextOutput.style.height = (altTextOutput.scrollHeight + 4) + 'px';
    }
});

altTextCopyBtn && altTextCopyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(altTextOutput.value).then(() => {
        altTextCopyBtn.textContent = 'Copied!';
        setTimeout(() => { altTextCopyBtn.textContent = 'Copy'; }, 2000);
    }).catch(() => {
        altTextOutput.select();
        document.execCommand('copy');
        altTextCopyBtn.textContent = 'Copied!';
        setTimeout(() => { altTextCopyBtn.textContent = 'Copy'; }, 2000);
    });
});

function refreshAltTextPanel(graph) {
    if (!altTextOutput || altTextPanel.style.display === 'none') return;
    altTextOutput.value = graphToDescription(graph).text;
    altTextOutput.style.height = 'auto';
    altTextOutput.style.height = (altTextOutput.scrollHeight + 4) + 'px';
}

// ---------------------------------------------------------------------------
// Editor – vertex inputs
// ---------------------------------------------------------------------------
setVerticesBtn && setVerticesBtn.addEventListener('click', () => {
    const n = parseInt(editorVertices.value, 10);
    if (isNaN(n) || n < 1) return;

    const oldInputs = vertexNamesDiv.querySelectorAll('input');
    const oldNames = Array.from(oldInputs).map(i => i.value || i.placeholder);

    createVertexInputs(n);

    const newInputs = vertexNamesDiv.querySelectorAll('input');
    for (let i = 0; i < newInputs.length; i++) {
        if (i < oldNames.length) {
            newInputs[i].value = oldNames[i];
            newInputs[i].placeholder = oldNames[i];
            newInputs[i].dataset.prev = oldNames[i];
        }
    }

    const validIds = new Set(Array.from(newInputs).map(inp => inp.dataset.id));
    editorEdges = editorEdges.filter(e => validIds.has(e.source) && validIds.has(e.target));
    renderEdgeList();
});

editorRandomBtn && editorRandomBtn.addEventListener('click', () => {
    const n = parseInt(editorVertices.value, 10) || 5;
    const typeSelect = document.getElementById('editor-random-type');
    const type = typeSelect ? typeSelect.value : 'default';
    generateAndRenderRandom(n, true, type);
});

function createVertexInputs(n) {
    editorNodes = [];
    vertexNamesDiv.innerHTML = '';

    const header = document.createElement('h3');
    header.textContent = 'Vertices';
    header.classList.add('vertex-header');
    vertexNamesDiv.appendChild(header);

    const list = document.createElement('div');
    list.classList.add('vertex-list');

    for (let i = 0; i < n; i++) {
        const line = document.createElement('div');
        line.classList.add('vertex-line');

        const lbl = document.createElement('label');
        lbl.textContent = `${i + 1}.`;
        lbl.classList.add('vertex-label');

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = '';
        input.value = editorNodes[i] || '';
        input.dataset.prev = input.value;
        input.dataset.index = i;
        input.dataset.id = vertexId(i);
        input.classList.add('vertex-input');

        input.addEventListener('input', ev => {
            const idx = parseInt(ev.target.dataset.index, 10);
            const newName = (ev.target.value || '').trim();
            const prev = ev.target.dataset.prev || '';
            renameVertex(idx, newName, prev);
            ev.target.dataset.prev = newName;
        });

        line.appendChild(lbl);
        line.appendChild(input);
        list.appendChild(line);
        editorNodes.push(input.value);
    }
    vertexNamesDiv.appendChild(list);
}

function renameVertex(index, newName, prevDisplayedName) {
    const oldName = (typeof prevDisplayedName === 'string' && prevDisplayedName.length > 0)
        ? prevDisplayedName.trim()
        : (editorNodes[index] ? String(editorNodes[index]).trim() : '');
    const nodeId = vertexId(index);
    for (const e of editorEdges) {
        if (e.source === nodeId || String(e.source || '').trim() === oldName) e.source = nodeId;
        if (e.target === nodeId || String(e.target || '').trim() === oldName) e.target = nodeId;
    }
    editorNodes[index] = (newName || '').trim();
    renderEdgeList();
}

// ---------------------------------------------------------------------------
// Editor – edge list
// ---------------------------------------------------------------------------
function renderEdgeList() {
    edgeListDiv.innerHTML = '';

    const inputs = vertexNamesDiv.querySelectorAll('input');
    const vertices = Array.from(inputs).map((inp, idx) => ({
        id: inp.dataset.id || vertexId(idx),
        name: (inp.value || '').trim(),
        index: idx,
    }));

    // Header row
    const hdr = document.createElement('div');
    hdr.classList.add('edge-list-header');
    ['Start', 'End', 'Label', ''].forEach((txt, i) => {
        const cell = document.createElement('div');
        cell.textContent = txt;
        cell.classList.add('edge-col', ['edge-col-start', 'edge-col-end', 'edge-col-name', 'edge-col-actions'][i]);
        hdr.appendChild(cell);
    });
    edgeListDiv.appendChild(hdr);

    editorEdges.forEach((e, idx) => {
        const row = document.createElement('div');
        row.classList.add('edge-row');

        function makeVertexSelect(currentVal) {
            const sel = document.createElement('select');
            const ph = document.createElement('option');
            ph.value = ''; ph.textContent = '--'; sel.appendChild(ph);
            vertices.forEach(v => {
                const o = document.createElement('option');
                o.value = v.id;
                o.textContent = `${v.index + 1}.${v.name ? ' ' + v.name : ''}`;
                sel.appendChild(o);
            });
            const match = vertices.find(v => v.id === currentVal)
                || vertices.find(v => v.name === String(currentVal || '').trim());
            sel.value = match ? match.id : '';
            return sel;
        }

        const fromSel = makeVertexSelect(e.source);
        fromSel.addEventListener('change', () => { editorEdges[idx].source = fromSel.value; });

        const toSel = makeVertexSelect(e.target);
        toSel.addEventListener('change', () => { editorEdges[idx].target = toSel.value; });

        const lblInput = document.createElement('input');
        lblInput.type = 'text';
        lblInput.placeholder = 'label';
        lblInput.value = e.label || '';
        lblInput.style.width = '100%';
        lblInput.style.boxSizing = 'border-box';
        lblInput.addEventListener('input', () => { editorEdges[idx].label = lblInput.value; });

        const rem = document.createElement('button');
        rem.textContent = 'Remove';
        rem.addEventListener('click', () => { editorEdges.splice(idx, 1); renderEdgeList(); });

        function makeCol(cls, ...children) {
            const div = document.createElement('div');
            div.classList.add('edge-col', cls);
            children.forEach(c => div.appendChild(c));
            return div;
        }

        row.appendChild(makeCol('edge-col-start', fromSel));
        row.appendChild(makeCol('edge-col-end', toSel));
        row.appendChild(makeCol('edge-col-name', lblInput));
        row.appendChild(makeCol('edge-col-actions', rem));
        edgeListDiv.appendChild(row);
    });

    const footer = document.createElement('div');
    footer.style.cssText = 'margin-top:8px;display:flex;justify-content:center;';
    const addBtn = document.createElement('button');
    addBtn.textContent = 'Add Edge';
    addBtn.addEventListener('click', () => {
        editorEdges.push({ source: '', target: '', label: null });
        renderEdgeList();
    });
    footer.appendChild(addBtn);
    edgeListDiv.appendChild(footer);
}

// ---------------------------------------------------------------------------
// Degree Sequences Mode
// ---------------------------------------------------------------------------
function loadDegreeStats() {
    try {
        const raw = localStorage.getItem('graph_degree_stats');
        if (raw) {
            const s = JSON.parse(raw);
            modeStates.degree.stats.correct = s.correct || 0;
            modeStates.degree.stats.incorrect = s.incorrect || 0;
        }
    } catch (e) { /* ignore */ }
}

function saveDegreeStats() {
    try { localStorage.setItem('graph_degree_stats', JSON.stringify(modeStates.degree.stats)); }
    catch (e) { /* ignore */ }
}

function updateDegreeStatsDisplay() {
    const { correct, incorrect } = modeStates.degree.stats;
    const total = correct + incorrect;
    const pct = total === 0 ? 0 : Math.round((correct / total) * 100);
    const el = id => document.getElementById(id);
    if (el('degree-correct')) el('degree-correct').textContent = correct;
    if (el('degree-incorrect')) el('degree-incorrect').textContent = incorrect;
    if (el('degree-accuracy')) el('degree-accuracy').textContent = pct + '%';
}

function showAnswerInput() {
    const answerInput = document.getElementById('degree-answer');
    const submitBtn = document.getElementById('degree-submit-btn');
    const feedbackBox = document.getElementById('training-feedback');
    if (answerInput) { answerInput.value = ''; answerInput.disabled = false; }
    if (submitBtn) submitBtn.style.display = '';
    if (feedbackBox) feedbackBox.style.display = 'none';
}

function showFeedback(correct, expected) {
    const answerInput = document.getElementById('degree-answer');
    const submitBtn = document.getElementById('degree-submit-btn');
    const feedbackBox = document.getElementById('training-feedback');
    const feedbackText = document.getElementById('feedback-text');

    if (answerInput) answerInput.disabled = true;
    if (submitBtn) submitBtn.style.display = 'none';
    if (feedbackText) {
        feedbackText.innerHTML = correct
            ? '✓ <strong class="feedback-report correct">Correct!</strong>'
            : `✗ <strong class="feedback-report incorrect">Incorrect.</strong> The correct degree sequence was {${expected.join(',')}}.`;
    }
    if (feedbackBox) {
        feedbackBox.style.display = '';
        feedbackBox.className = 'training-feedback ' + (correct ? 'correct' : 'incorrect');
    }
}

function bindDegreeControls() {
    const resetBtn = document.getElementById('degree-reset-btn');
    const submitBtn = document.getElementById('degree-submit-btn');
    const answerInput = document.getElementById('degree-answer');
    const nextBtn = document.getElementById('training-next');

    if (resetBtn && !resetBtn.dataset.bound) {
        resetBtn.dataset.bound = '1';
        resetBtn.onclick = () => {
            modeStates.degree.stats.correct = modeStates.degree.stats.incorrect = 0;
            saveDegreeStats();
            updateDegreeStatsDisplay();
            showAnswerInput();
            startDegreeSequence();
        };
    }

    if (submitBtn && answerInput && !submitBtn.dataset.bound) {
        submitBtn.dataset.bound = '1';
        submitBtn.onclick = () => {
            const got = parseAnswer(answerInput.value);
            if (got === null) {
                answerInput.style.outline = '2px solid #e74c3c';
                setTimeout(() => { answerInput.style.outline = ''; }, 1200);
                return;
            }
            const expected = modeStates.degree.expectedSeq.slice();
            const correct = arraysEqual(got, expected);
            modeStates.degree.stats[correct ? 'correct' : 'incorrect']++;
            saveDegreeStats();
            updateDegreeStatsDisplay();
            showFeedback(correct, expected);
        };
    }

    if (nextBtn && !nextBtn.dataset.bound) {
        nextBtn.dataset.bound = '1';
        nextBtn.onclick = () => { showAnswerInput(); startDegreeSequence(); };
    }
}

function parseAnswer(str) {
    if (!str) return null;
    str = str.trim();
    if (str.startsWith('{') && str.endsWith('}')) str = str.slice(1, -1);
    str = str.replace(/\s+/g, '');
    if (str.length === 0) return [];
    const parts = str.split(',').map(s => parseInt(s, 10));
    if (parts.some(x => isNaN(x))) return null;
    return parts.sort((a, b) => a - b);
}

function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
}

function startDegreeSequence() {
    const n = Math.floor(Math.random() * 5) + 3;   // 3–7
    let graph = generateSimpleGraph(n);

    // Occasionally add loops / parallel edges for variety
    if (Math.random() < 0.5) {
        const extra = Math.floor(Math.random() * 3) + 1;
        const extraEdges = graph.edges.slice();
        for (let k = 0; k < extra; k++) {
            if (Math.random() < 0.5) {
                const idx = Math.floor(Math.random() * n);
                extraEdges.push({ source: vertexId(idx), target: vertexId(idx), label: null });
            } else {
                const i = Math.floor(Math.random() * n);
                const j = (i + 1 + Math.floor(Math.random() * (n - 1))) % n;
                extraEdges.push({ source: vertexId(i), target: vertexId(j), label: null });
            }
        }
        graph = { ...graph, edges: extraEdges };
    }

    const ds = modeStates.degree;
    ds.graph = graph;
    ds.expectedSeq = degreeSequence(graph.edges, n);

    const cy = getCy('degree');
    if (cy) draw_graph(graph, cy);
    updateGraphAria('degree-graph-description', graph, true);
    updateDegreeStatsDisplay();

    if (VERBOSE) console.log('startDegreeSequence: expected', ds.expectedSeq);
}

// ---------------------------------------------------------------------------
// Eulerian graphs Mode
// ---------------------------------------------------------------------------
function loadEulerianStats() {
    try {
        const raw = localStorage.getItem('graph_eulerian_stats');
        if (raw) {
            const s = JSON.parse(raw);
            modeStates.eulerian.stats.correct = s.correct || 0;
            modeStates.eulerian.stats.total = s.total || 0;
            modeStates.eulerian.stats.points = s.points || 0;
        }
    } catch (e) { /* ignore */ }
}

function saveEulerianStats() {
    try { localStorage.setItem('graph_eulerian_stats', JSON.stringify(modeStates.eulerian.stats)); }
    catch (e) { /* ignore */ }
}

function updateEulerianStatsDisplay() {
    const s = modeStates.eulerian.stats;
    const pct = s.total === 0 ? 0 : Math.round((s.points / s.total) * 100);
    const el = id => document.getElementById(id);
    if (el('eulerian-total')) el('eulerian-total').textContent = s.total;
    if (el('eulerian-points')) el('eulerian-points').textContent = s.points.toFixed(1);
    if (el('eulerian-accuracy')) el('eulerian-accuracy').textContent = pct + '%';
}

let eulerAddEdges = [];

function renderEulerAddEdgeList() {
    const container = document.getElementById('eulerian-add-edge-list');
    if (!container) return;
    container.innerHTML = '';

    eulerAddEdges.forEach((row, idx) => {
        const div = document.createElement('div');
        div.className = 'eulerian-edge-row';

        const lbl = document.createElement('label');
        lbl.textContent = `${idx + 1}.`;

        function makeInput(placeholder, value, onInput) {
            const inp = document.createElement('input');
            inp.type = 'text';
            inp.placeholder = placeholder;
            inp.value = value;
            inp.maxLength = 1;
            inp.addEventListener('input', () => {
                const v = inp.value.toUpperCase().trim();
                inp.value = v;
                onInput(v);
            });
            return inp;
        }

        const fromLbl = Object.assign(document.createElement('span'), { textContent: 'From:', style: 'color:#555;font-size:14px;' });
        const fromInput = makeInput('A', row.from || '', v => { eulerAddEdges[idx].from = v; });
        const toLbl = Object.assign(document.createElement('span'), { textContent: 'To:', style: 'color:#555;font-size:14px;' });
        const toInput = makeInput('B', row.to || '', v => { eulerAddEdges[idx].to = v; });

        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', () => { eulerAddEdges.splice(idx, 1); renderEulerAddEdgeList(); });

        [lbl, fromLbl, fromInput, toLbl, toInput, removeBtn].forEach(el => div.appendChild(el));
        container.appendChild(div);
    });
}

/**
 * Render checkboxes inside #eulerian-identify-checkboxes for every vertex
 * in the given directed puzzle graph. State is read back at submit time by
 * querying the checked inputs.
 */
function renderEulerIdentifyCheckboxes(puzzle) {
    const container = document.getElementById('eulerian-identify-checkboxes');
    if (!container) return;
    container.innerHTML = '';

    puzzle.names.forEach(name => {
        const label = document.createElement('label');
        label.style.cssText = 'display:flex; align-items:center; gap:6px; font-size:15px; cursor:pointer;';

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = name;
        cb.style.cssText = 'width:16px; height:16px; cursor:pointer;';

        label.appendChild(cb);
        label.appendChild(document.createTextNode(name));
        container.appendChild(label);
    });
}

function resetEulerianUI() {
    const show = id => { const el = document.getElementById(id); if (el) el.style.display = ''; };
    const hide = id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; };
    const get = id => document.getElementById(id);

    show('eulerian-part1');
    ['eulerian-part1-wrong', 'eulerian-part2-circuit', 'eulerian-part2-eulerize',
        'eulerian-part2-identify', 'eulerian-circuit-feedback', 'eulerian-eulerize-feedback',
        'eulerian-identify-feedback'].forEach(hide);

    ['eulerian-yes-btn', 'eulerian-no-btn'].forEach(id => {
        const btn = get(id);
        if (btn) { btn.classList.remove('selected-correct', 'selected-wrong'); btn.disabled = false; }
    });

    const circuitInput = get('eulerian-circuit-input');
    if (circuitInput) { circuitInput.value = ''; circuitInput.disabled = false; }

    eulerAddEdges = [{ from: '', to: '' }];
    renderEulerAddEdgeList();

    const submitBtn = get('eulerian-circuit-submit-btn');
    const ezSubmitBtn = get('eulerian-eulerize-submit-btn');
    const addEdgeBtn = get('eulerian-add-edge-btn');
    const identifySubmitBtn = get('eulerian-identify-submit-btn');
    if (submitBtn) submitBtn.style.display = '';
    if (ezSubmitBtn) ezSubmitBtn.style.display = '';
    if (identifySubmitBtn) identifySubmitBtn.style.display = '';
}

function startEulerianTrial() {
    const puzzle = generateEulerianGraphPuzzle();
    modeStates.eulerian.currentPuzzle = puzzle;
    modeStates.eulerian.part1Scored = false;
    modeStates.eulerian.part2Scored = false;
    modeStates.eulerian.graph = puzzle;

    const cy = getCy('eulerian');
    if (cy) draw_graph(puzzle, cy);
    updateGraphAria('eulerian-graph-description', puzzle, true);

    resetEulerianUI();
    updateEulerianStatsDisplay();

    // Update circuit input hint
    const hint = document.getElementById('eulerian-part2-circuit-hint');
    if (hint) {
        if (puzzle.isMulti) {
            hint.textContent = 'Enter alternating vertices and edge labels, e.g. AaBbCcA';
        } else if (puzzle.directed) {
            hint.textContent = 'Enter the vertices of an Eulerian circuit in order, e.g. ABCDA';
        } else {
            const oddCount = getOddVertices(puzzle.edges, puzzle.n).length;
            hint.textContent = oddCount === 0
                ? 'Enter the vertices of an Eulerian circuit in order, e.g. ABCA'
                : 'Enter the vertices of an Eulerian circuit in order, e.g. ABCD';
        }
    }

    if (VERBOSE) console.log('startEulerianTrial:', puzzle);
}

function bindEulerianControls() {
    const get = id => document.getElementById(id);

    const resetBtn = get('eulerian-reset-btn');
    if (resetBtn && !resetBtn.dataset.bound) {
        resetBtn.dataset.bound = '1';
        resetBtn.onclick = () => {
            modeStates.eulerian.stats = { correct: 0, total: 0, points: 0 };
            saveEulerianStats();
            updateEulerianStatsDisplay();
            startEulerianTrial();
        };
    }

    ['eulerian-yes-btn', 'eulerian-no-btn'].forEach(btnId => {
        const btn = get(btnId);
        if (btn && !btn.dataset.bound) {
            btn.dataset.bound = '1';
            btn.onclick = () => {
                const puzzle = modeStates.eulerian.currentPuzzle;
                if (!puzzle) return;

                const userSaysEulerian = (btnId === 'eulerian-yes-btn');
                const correct = (userSaysEulerian === puzzle.isEulerian);

                ['eulerian-yes-btn', 'eulerian-no-btn'].forEach(id => {
                    const b = get(id); if (b) b.disabled = true;
                });

                modeStates.eulerian.stats.total += 1;
                if (correct) {
                    modeStates.eulerian.stats.points += 0.5;
                    modeStates.eulerian.part1Scored = true;
                    btn.classList.add('selected-correct');
                } else {
                    btn.classList.add('selected-wrong');
                    const wrongPanel = get('eulerian-part1-wrong');
                    const wrongText = get('eulerian-part1-wrong-text');
                    if (wrongText) {
                        if (puzzle.isEulerian) {
                            wrongText.textContent = puzzle.directed
                                ? 'This graph is actually Eulerian — every vertex has equal in-degree and out-degree, and the graph is strongly connected.'
                                : 'This graph is actually Eulerian — every vertex has even degree (and the graph is connected).';
                        } else {
                            wrongText.textContent = puzzle.directed
                                ? 'This graph is actually not Eulerian — it has one or more vertices where in-degree ≠ out-degree (or is not strongly connected).'
                                : 'This graph is actually not Eulerian — it has one or more vertices with odd degree (or is not connected).';
                        }
                    }
                    get('eulerian-part1').style.display = 'none';
                    if (wrongPanel) wrongPanel.style.display = '';
                    saveEulerianStats();
                    updateEulerianStatsDisplay();
                    return;
                }

                saveEulerianStats();
                updateEulerianStatsDisplay();

                get('eulerian-part1').style.display = 'none';
                if (puzzle.isEulerian) {
                    const part2 = get('eulerian-part2-circuit');
                    if (part2) part2.style.display = '';
                    const title = get('eulerian-part2-circuit-title');
                    if (title) {
                        if (puzzle.directed) {
                            title.textContent = 'Part 2 — Find an Eulerian circuit';
                        } else {
                            const oddCount = getOddVertices(puzzle.edges, puzzle.n).length;
                            title.textContent = oddCount === 0
                                ? 'Part 2 — Find an Eulerian circuit'
                                : 'Part 2 — Find an Eulerian circuit';
                        }
                    }
                } else if (puzzle.directed) {
                    // Directed non-Eulerian: ask user to identify mismatched vertices
                    const part2 = get('eulerian-part2-identify');
                    if (part2) part2.style.display = '';
                    renderEulerIdentifyCheckboxes(puzzle);
                } else {
                    // Undirected non-Eulerian: ask user to Eulerize
                    const part2 = get('eulerian-part2-eulerize');
                    if (part2) part2.style.display = '';
                    const addEdgeBtn = get('eulerian-add-edge-btn');
                    const ezSubmitBtn = get('eulerian-eulerize-submit-btn');
                    if (addEdgeBtn) addEdgeBtn.style.display = '';
                    if (ezSubmitBtn) ezSubmitBtn.style.display = '';
                    eulerAddEdges = [{ from: '', to: '' }];
                    renderEulerAddEdgeList();
                }
            };
        }
    });

    const nextFromWrong = get('eulerian-next-from-wrong');
    if (nextFromWrong && !nextFromWrong.dataset.bound) {
        nextFromWrong.dataset.bound = '1';
        nextFromWrong.onclick = () => startEulerianTrial();
    }

    const addEdgeBtn = get('eulerian-add-edge-btn');
    if (addEdgeBtn && !addEdgeBtn.dataset.bound) {
        addEdgeBtn.dataset.bound = '1';
        addEdgeBtn.onclick = () => { eulerAddEdges.push({ from: '', to: '' }); renderEulerAddEdgeList(); };
    }

    // Submit eulerization
    const ezSubmitBtn = get('eulerian-eulerize-submit-btn');
    if (ezSubmitBtn && !ezSubmitBtn.dataset.bound) {
        ezSubmitBtn.dataset.bound = '1';
        ezSubmitBtn.onclick = () => {
            const puzzle = modeStates.eulerian.currentPuzzle;
            if (!puzzle) return;

            const result = validateEulerization(puzzle, eulerAddEdges);

            const feedbackDiv = get('eulerian-eulerize-feedback');
            const feedbackText = get('eulerian-eulerize-feedback-text');
            const tryAgainBtn = get('eulerian-eulerize-try-again');
            const addEdgeBtn = get('eulerian-add-edge-btn');
            if (feedbackDiv) feedbackDiv.style.display = '';

            if (result.ok) {
                if (!modeStates.eulerian.part2Scored) {
                    modeStates.eulerian.stats.points += 0.5;
                    modeStates.eulerian.part2Scored = true;
                    saveEulerianStats();
                    updateEulerianStatsDisplay();
                }
                const usedEdges = eulerAddEdges.filter(ae => ae.from && ae.to).length;
                const minEdges  = minEulerizeEdges(puzzle);
                const minNote   = usedEdges === minEdges
                    ? ' That uses the minimum number of edges needed!'
                    : ` Note: a minimum Eulerization only requires ${minEdges} edge${minEdges !== 1 ? 's' : ''} (you used ${usedEdges}).`;
                if (feedbackText) feedbackText.innerHTML =
                    `✓ <strong class="feedback-report correct">Correct!</strong> The added edges make every vertex even-degree — the graph is now Eulerian.${minNote}`;
                if (feedbackDiv) feedbackDiv.className = 'training-feedback correct';
                if (tryAgainBtn) tryAgainBtn.style.display = 'none';
                const ezNextBtn = get('eulerian-eulerize-next');
                if (ezNextBtn) ezNextBtn.style.display = '';
                if (ezSubmitBtn) ezSubmitBtn.style.display = 'none';
                if (addEdgeBtn) addEdgeBtn.style.display = 'none';

            } else if (result.reason === 'invalid_vertices') {
                // Soft error — don't lock the form, just warn inline
                if (feedbackText) feedbackText.innerHTML =
                    '✗ <strong class="feedback-report incorrect">Invalid input.</strong> ' +
                    `The following edges reference vertex names that don't exist in this graph: ${result.bad.join(', ')}. ` +
                    'Check your spelling and try again.';
                if (feedbackDiv) feedbackDiv.className = 'training-feedback incorrect';
                if (tryAgainBtn) tryAgainBtn.style.display = '';
                // Leave submit + add-edge visible so they can fix it
                if (ezSubmitBtn) ezSubmitBtn.style.display = '';
                // if (addEdgeBtn)  addEdgeBtn.style.display  = '';

            } else {
                // Definitive wrong answer — lock the form and move on
                let message;
                if (result.reason === 'not_duplicate') {
                    const direction = puzzle.directed
                        ? ' You can only duplicate an existing directed edge in the same direction.'
                        : ' You can only duplicate edges that already exist in the graph.';
                    message = `The following edges you added don't duplicate any existing edge: ${result.bad.join(', ')}.` + direction;
                } else {
                    // not_eulerian
                    message = `Your added edges are valid duplicates, but the graph is still not Eulerian. ` +
                        `${puzzle.directed ? 'Vertices where in-degree ≠ out-degree' : 'Vertices with odd degree'} ` +
                        `after your additions: ${result.oddVertices.join(', ')}.`;
                }
                if (feedbackText) feedbackText.innerHTML =
                    `✗ <strong class="feedback-report incorrect">Incorrect.</strong> ${message}`;
                if (feedbackDiv) feedbackDiv.className = 'training-feedback incorrect';
                if (tryAgainBtn) tryAgainBtn.style.display = '';
                if (ezSubmitBtn) ezSubmitBtn.style.display = 'none';
                if (addEdgeBtn) addEdgeBtn.style.display = 'none';
            }
        };
    }

    const ezTryAgain = get('eulerian-eulerize-try-again');
    if (ezTryAgain && !ezTryAgain.dataset.bound) {
        ezTryAgain.dataset.bound = '1';
        // After a soft error (invalid vertices) this re-hides feedback so they can fix input.
        // After a definitive wrong answer the submit button is already hidden so clicking
        // this just progresses — we update the label dynamically in the submit handler above,
        // but the simplest approach is to always move to the next question here and let the
        // submit handler control whether the button is visible at all.
        ezTryAgain.onclick = () => startEulerianTrial();
    }

    const ezNext = get('eulerian-eulerize-next');
    if (ezNext && !ezNext.dataset.bound) {
        ezNext.dataset.bound = '1';
        ezNext.onclick = () => startEulerianTrial();
    }

    // Submit identify-vertices (directed non-Eulerian)
    const identifySubmitBtn = get('eulerian-identify-submit-btn');
    if (identifySubmitBtn && !identifySubmitBtn.dataset.bound) {
        identifySubmitBtn.dataset.bound = '1';
        identifySubmitBtn.onclick = () => {
            const puzzle = modeStates.eulerian.currentPuzzle;
            if (!puzzle) return;

            const feedbackDiv  = get('eulerian-identify-feedback');
            const feedbackText = get('eulerian-identify-feedback-text');
            const tryAgainBtn  = get('eulerian-identify-try-again');
            const nextBtn      = get('eulerian-identify-next');
            if (feedbackDiv) feedbackDiv.style.display = '';

            // Collect selected vertex names from checkboxes
            const container = document.getElementById('eulerian-identify-checkboxes');
            const checked = container
                ? Array.from(container.querySelectorAll('input[type=checkbox]:checked')).map(cb => cb.value)
                : [];

            const correct = getMismatchedVertices(puzzle);
            const correctSet  = new Set(correct);
            const checkedSet  = new Set(checked);

            const missing  = correct.filter(v => !checkedSet.has(v));
            const extra    = checked.filter(v => !correctSet.has(v));
            const isCorrect = missing.length === 0 && extra.length === 0;

            if (isCorrect) {
                if (!modeStates.eulerian.part2Scored) {
                    modeStates.eulerian.stats.points += 0.5;
                    modeStates.eulerian.part2Scored = true;
                    saveEulerianStats();
                    updateEulerianStatsDisplay();
                }
                if (feedbackText) {
                    const detail = correct.length === 1
                        ? `Vertex ${correct[0]} has mismatched in/out degree.`
                        : `Vertices ${correct.join(', ')} each have mismatched in/out degree.`;
                    feedbackText.innerHTML =
                        `✓ <strong class="feedback-report correct">Correct!</strong> ${detail}`;
                }
                if (feedbackDiv) feedbackDiv.className = 'training-feedback correct';
                if (tryAgainBtn) tryAgainBtn.style.display = 'none';
                if (nextBtn) nextBtn.style.display = '';
                if (identifySubmitBtn) identifySubmitBtn.style.display = 'none';
            } else {
                let message = '';
                if (missing.length > 0 && extra.length > 0) {
                    message = `You missed ${missing.join(', ')} and incorrectly selected ${extra.join(', ')}.`;
                } else if (missing.length > 0) {
                    message = `You missed ${missing.join(', ')}.`;
                } else {
                    message = `${extra.join(', ')} ${extra.length === 1 ? 'does' : 'do'} not have a degree mismatch.`;
                }
                if (feedbackText) feedbackText.innerHTML =
                    `✗ <strong class="feedback-report incorrect">Incorrect.</strong> ${message}`;
                if (feedbackDiv) feedbackDiv.className = 'training-feedback incorrect';
                if (tryAgainBtn) tryAgainBtn.style.display = '';
                if (identifySubmitBtn) identifySubmitBtn.style.display = 'none';
            }
        };
    }

    const identifyTryAgain = get('eulerian-identify-try-again');
    if (identifyTryAgain && !identifyTryAgain.dataset.bound) {
        identifyTryAgain.dataset.bound = '1';
        identifyTryAgain.onclick = () => startEulerianTrial();
    }

    const identifyNext = get('eulerian-identify-next');
    if (identifyNext && !identifyNext.dataset.bound) {
        identifyNext.dataset.bound = '1';
        identifyNext.onclick = () => startEulerianTrial();
    }

    // Submit Eulerian circuit
    const circuitSubmitBtn = get('eulerian-circuit-submit-btn');
    if (circuitSubmitBtn && !circuitSubmitBtn.dataset.bound) {
        circuitSubmitBtn.dataset.bound = '1';
        circuitSubmitBtn.onclick = () => {
            const puzzle = modeStates.eulerian.currentPuzzle;
            const circuitInput = get('eulerian-circuit-input');
            if (!puzzle || !circuitInput) return;

            const raw = circuitInput.value.trim();
            let valid = false;

            if (puzzle.isMulti) {
                const oddCount = getOddVertices(puzzle.edges, puzzle.n).length;
                valid = validateEulerianCircuitMulti(raw, puzzle, oddCount === 0);
            } else if (puzzle.directed) {
                const circuit = raw.toUpperCase().split('').filter(c => /[A-Z]/.test(c));
                valid = validateEulerianCircuitDigraph(circuit, puzzle);
            } else {
                const circuit = raw.toUpperCase().split('').filter(c => /[A-Z]/.test(c));
                const oddCount = getOddVertices(puzzle.edges, puzzle.n).length;
                valid = validateEulerianCircuitSimple(circuit, puzzle, oddCount === 0);
            }

            const feedbackDiv = get('eulerian-circuit-feedback');
            const feedbackText = get('eulerian-circuit-feedback-text');
            const tryAgainBtn = get('eulerian-circuit-try-again');
            if (feedbackDiv) feedbackDiv.style.display = '';

            if (valid) {
                if (!modeStates.eulerian.part2Scored) {
                    modeStates.eulerian.stats.points += 0.5;
                    modeStates.eulerian.part2Scored = true;
                    saveEulerianStats();
                    updateEulerianStatsDisplay();
                }
                if (feedbackText) feedbackText.innerHTML = '✓ <strong class="feedback-report correct">Correct!</strong> That is a valid Eulerian circuit.';
                if (feedbackDiv) feedbackDiv.className = 'training-feedback correct';
            } else {
                if (feedbackText) {
                    let hint = '';
                    if (puzzle.isMulti) hint = ' Remember: use alternating capital letters (vertices) and lowercase letters (edge labels), e.g. AaBbCA.';
                    else if (puzzle.directed) hint = ' Remember: it must be a circuit (start = end) and follow edge directions.';
                    else hint = ' Make sure you use every edge exactly once.';
                    feedbackText.innerHTML = '✗ <strong class="feedback-report incorrect">Not valid.</strong>' + hint;
                }
                if (feedbackDiv) feedbackDiv.className = 'training-feedback incorrect';
            }
            if (tryAgainBtn) tryAgainBtn.style.display = '';
            if (circuitSubmitBtn) circuitSubmitBtn.style.display = 'none';
            circuitInput.disabled = true;
        };
    }

    const circuitTryAgain = get('eulerian-circuit-try-again');
    if (circuitTryAgain && !circuitTryAgain.dataset.bound) {
        circuitTryAgain.dataset.bound = '1';
        circuitTryAgain.onclick = () => {
            startEulerianTrial();
        };
    }
}


// =============================================================================
// Isomorphism Mode
// =============================================================================

// Human-readable labels for each "neither" reason, keyed by the reason id
const ISO_REASON_LABELS = {
    diff_vertices:   'Different number of vertices',
    diff_edges:      'Different number of edges',
    diff_degree_seq: 'Different degree sequences',
    diff_components: 'Different number of connected components',
    diff_triangles:  'Different number of triangles/squares',
};

// All five reason ids in a fixed display order
const ISO_REASON_ORDER = [
    'diff_vertices', 'diff_edges', 'diff_degree_seq',
    'diff_components', 'diff_triangles',
];

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------
function loadIsoStats() {
    try {
        const raw = localStorage.getItem('graph_iso_stats');
        if (raw) {
            const s = JSON.parse(raw);
            modeStates.iso.stats.total  = s.total  || 0;
            modeStates.iso.stats.points = s.points || 0;
        }
    } catch (e) { /* ignore */ }
}

function saveIsoStats() {
    try { localStorage.setItem('graph_iso_stats', JSON.stringify(modeStates.iso.stats)); }
    catch (e) { /* ignore */ }
}

function updateIsoStatsDisplay() {
    const s   = modeStates.iso.stats;
    const pct = s.total === 0 ? 0 : Math.round((s.points / s.total) * 100);
    const el  = id => document.getElementById(id);
    if (el('iso-total'))    el('iso-total').textContent    = s.total;
    if (el('iso-points'))   el('iso-points').textContent   = s.points.toFixed(1);
    if (el('iso-accuracy')) el('iso-accuracy').textContent = pct + '%';
}

// ---------------------------------------------------------------------------
// Trial lifecycle
// ---------------------------------------------------------------------------
function startIsoTrial() {
    const puzzle = generateIsoPuzzle();
    modeStates.iso.currentPuzzle = puzzle;
    modeStates.iso.part1Scored   = false;
    modeStates.iso.part2Scored   = false;

    // Draw both graphs with independently shuffled circular layouts
    const order1 = shuffle(Array.from({ length: puzzle.g1.n }, (_, i) => i));
    const order2 = shuffle(Array.from({ length: puzzle.g2.n }, (_, i) => i));
    drawGraphCircle(puzzle.g1, getCy('iso1'), order1);
    drawGraphCircle(puzzle.g2, getCy('iso2'), order2);

    updateGraphAria('iso-graph-description-1', puzzle.g1, true);
    updateGraphAria('iso-graph-description-2', puzzle.g2, false);

    resetIsoUI(puzzle);
    updateIsoStatsDisplay();

    if (VERBOSE) console.log('startIsoTrial:', puzzle);
}

function resetIsoUI(puzzle) {
    const show = id => { const el = document.getElementById(id); if (el) el.style.display = ''; };
    const hide = id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; };
    const get  = id => document.getElementById(id);

    show('iso-part1');
    ['iso-part1-wrong', 'iso-part2-reason', 'iso-part2-mapping',
     'iso-reason-feedback', 'iso-mapping-feedback'].forEach(hide);

    // Reset the wrong-panel class in case it was repurposed for the equal-correct case
    const wrongPanel = document.getElementById('iso-part1-wrong');
    if (wrongPanel) wrongPanel.className = 'training-feedback incorrect';

    ['iso-equal-btn', 'iso-iso-btn', 'iso-neither-btn'].forEach(id => {
        const btn = get(id);
        if (btn) { btn.classList.remove('selected-correct', 'selected-wrong'); btn.disabled = false; }
    });

    // Reset feedback-panel internal buttons so a previous trial's state doesn't bleed through
    ['iso-reason-try-again', 'iso-reason-next',
     'iso-mapping-try-again', 'iso-mapping-next'].forEach(hide);
    ['iso-reason-submit-btn', 'iso-mapping-submit-btn'].forEach(show);

    // Re-enable radios/selects in case a previous trial locked them
    document.querySelectorAll('input[name="iso-reason"]').forEach(r => r.disabled = false);
    document.querySelectorAll('#iso-mapping-container select').forEach(s => s.disabled = false);

    // Pre-populate Part 2 UI while everything is still hidden
    if (puzzle) {
        renderIsoReasonRadios();
        renderIsoMappingDropdowns(puzzle);
    }
}

// ---------------------------------------------------------------------------
// Dynamic sub-panel renderers
// ---------------------------------------------------------------------------
function renderIsoReasonRadios() {
    const container = document.getElementById('iso-reason-radios');
    if (!container) return;
    container.innerHTML = '';
    ISO_REASON_ORDER.forEach(reason => {
        const label = document.createElement('label');
        label.style.cssText = 'display:flex; align-items:center; gap:8px; font-size:15px; cursor:pointer;';

        const rb = document.createElement('input');
        rb.type  = 'radio';
        rb.name  = 'iso-reason';
        rb.value = reason;
        rb.style.cssText = 'width:16px; height:16px; cursor:pointer;';

        label.appendChild(rb);
        label.appendChild(document.createTextNode(ISO_REASON_LABELS[reason]));
        container.appendChild(label);
    });
}

function renderIsoMappingDropdowns(puzzle) {
    const container = document.getElementById('iso-mapping-container');
    if (!container) return;
    container.innerHTML = '';

    const g1Names = puzzle.g1.names;
    const g2Names = puzzle.g2.names;

    g1Names.forEach(name => {
        const row = document.createElement('div');
        row.className = 'iso-mapping-row';

        const lbl = document.createElement('span');
        lbl.textContent = `${name}  →`;
        lbl.style.minWidth = '40px';

        const sel = document.createElement('select');
        sel.dataset.g1vertex = name;
        // Blank placeholder
        const blank = document.createElement('option');
        blank.value = ''; blank.textContent = '—';
        sel.appendChild(blank);
        g2Names.forEach(g2name => {
            const opt = document.createElement('option');
            opt.value = g2name; opt.textContent = g2name;
            sel.appendChild(opt);
        });

        row.appendChild(lbl);
        row.appendChild(sel);
        container.appendChild(row);
    });
}

// ---------------------------------------------------------------------------
// Controls binding
// ---------------------------------------------------------------------------
function bindIsoControls() {
    const get = id => document.getElementById(id);

    // Reset
    const resetBtn = get('iso-reset-btn');
    if (resetBtn && !resetBtn.dataset.bound) {
        resetBtn.dataset.bound = '1';
        resetBtn.onclick = () => {
            modeStates.iso.stats = { total: 0, points: 0 };
            saveIsoStats();
            updateIsoStatsDisplay();
            startIsoTrial();
        };
    }

    // Part 1 — Equal / Isomorphic / Neither
    ['iso-equal-btn', 'iso-iso-btn', 'iso-neither-btn'].forEach(btnId => {
        const btn = get(btnId);
        if (btn && !btn.dataset.bound) {
            btn.dataset.bound = '1';
            btn.onclick = () => {
                const puzzle = modeStates.iso.currentPuzzle;
                if (!puzzle) return;

                const userAnswer = btnId === 'iso-equal-btn'   ? 'equal'
                                 : btnId === 'iso-iso-btn'      ? 'isomorphic'
                                 : /* iso-neither-btn */          'neither';
                const correct = userAnswer === puzzle.scenario;

                ['iso-equal-btn', 'iso-iso-btn', 'iso-neither-btn'].forEach(id => {
                    const b = get(id); if (b) b.disabled = true;
                });

                modeStates.iso.stats.total += 1;

                if (correct) {
                    modeStates.iso.stats.points += puzzle.scenario === 'equal' ? 1 : 0.5;
                    modeStates.iso.part1Scored = true;
                    btn.classList.add('selected-correct');
                    saveIsoStats();
                    updateIsoStatsDisplay();

                    get('iso-part1').style.display = 'none';

                    if (puzzle.scenario === 'equal') {
                        // No Part 2 for equal — show immediate correct feedback
                        _showIsoEqualCorrect();
                    } else if (puzzle.scenario === 'neither') {
                        get('iso-part2-reason').style.display = '';
                        get('iso-reason-submit-btn').style.display = '';
                    } else if (puzzle.scenario === 'isomorphic') {
                        get('iso-part2-mapping').style.display = '';
                        get('iso-mapping-submit-btn').style.display = '';
                    }

                } else {
                    btn.classList.add('selected-wrong');
                    const wrongPanel = get('iso-part1-wrong');
                    const wrongText  = get('iso-part1-wrong-text');
                    if (wrongText) {
                        const actual = puzzle.scenario === 'equal'       ? 'equal (they have the same labels and relationships)'
                                     : puzzle.scenario === 'isomorphic'  ? 'isomorphic (there is a way of relabeling that makes them equal)'
                                     : 'neither equal nor isomorphic';
                        wrongText.textContent = `These graphs are actually ${actual}.`;
                    }
                    get('iso-part1').style.display = 'none';
                    if (wrongPanel) wrongPanel.style.display = '';
                    saveIsoStats();
                    updateIsoStatsDisplay();
                }
            };
        }
    });

    const nextFromWrong = get('iso-next-from-wrong');
    if (nextFromWrong && !nextFromWrong.dataset.bound) {
        nextFromWrong.dataset.bound = '1';
        nextFromWrong.onclick = () => startIsoTrial();
    }

    // Part 2a — Reason for Neither
    const reasonSubmitBtn = get('iso-reason-submit-btn');
    if (reasonSubmitBtn && !reasonSubmitBtn.dataset.bound) {
        reasonSubmitBtn.dataset.bound = '1';
        reasonSubmitBtn.onclick = () => {
            const puzzle = modeStates.iso.currentPuzzle;
            if (!puzzle) return;

            const checked = document.querySelector('input[name="iso-reason"]:checked');
            const feedbackDiv  = get('iso-reason-feedback');
            const feedbackText = get('iso-reason-feedback-text');
            const tryAgainBtn  = get('iso-reason-try-again');
            const nextBtn      = get('iso-reason-next');
            if (feedbackDiv) feedbackDiv.style.display = '';

            if (!checked) {
                if (feedbackText) feedbackText.textContent = 'You have to pick a reason before submitting!';
                if (feedbackDiv) feedbackDiv.className = 'training-feedback incorrect';
                if (feedbackDiv) feedbackDiv.style.display = '';
                return;
            }

            // Accept ANY reason that is actually true for this pair
            const chosen  = checked.value;
            const isValid = checkNeitherReason(puzzle.g1, puzzle.g2, chosen);

            if (isValid) {
                if (!modeStates.iso.part2Scored) {
                    modeStates.iso.stats.points += 0.5;
                    modeStates.iso.part2Scored   = true;
                    saveIsoStats();
                    updateIsoStatsDisplay();
                }
                if (feedbackText) feedbackText.innerHTML =
                    `✓ <strong class="feedback-report correct">Correct!</strong> ` +
                    `${ISO_REASON_LABELS[chosen]} — that property differs between the two graphs.`;
                if (feedbackDiv) feedbackDiv.className = 'training-feedback correct';
                if (tryAgainBtn) tryAgainBtn.style.display = 'none';
                if (nextBtn)     nextBtn.style.display     = '';
                if (reasonSubmitBtn) reasonSubmitBtn.style.display = 'none';
                // Disable all radios
                document.querySelectorAll('input[name="iso-reason"]').forEach(r => r.disabled = true);
            } else {
                const correctLabel = ISO_REASON_LABELS[puzzle.reason] || puzzle.reason;
                if (feedbackText) feedbackText.innerHTML =
                    `✗ <strong class="feedback-report incorrect">Incorrect.</strong> ` +
                    `That property is actually the same in both graphs. ` +
                    `A valid reason is: <strong>${correctLabel}</strong>.`;
                if (feedbackDiv) feedbackDiv.className = 'training-feedback incorrect';
                if (tryAgainBtn) tryAgainBtn.style.display = '';
                if (nextBtn)     nextBtn.style.display     = 'none';
                if (reasonSubmitBtn) reasonSubmitBtn.style.display = 'none';
                document.querySelectorAll('input[name="iso-reason"]').forEach(r => r.disabled = true);
            }
        };
    }

    const reasonTryAgain = get('iso-reason-try-again');
    if (reasonTryAgain && !reasonTryAgain.dataset.bound) {
        reasonTryAgain.dataset.bound = '1';
        reasonTryAgain.onclick = () => startIsoTrial();
    }

    const reasonNext = get('iso-reason-next');
    if (reasonNext && !reasonNext.dataset.bound) {
        reasonNext.dataset.bound = '1';
        reasonNext.onclick = () => startIsoTrial();
    }

    // Part 2b — Isomorphism mapping
    const mappingSubmitBtn = get('iso-mapping-submit-btn');
    if (mappingSubmitBtn && !mappingSubmitBtn.dataset.bound) {
        mappingSubmitBtn.dataset.bound = '1';
        mappingSubmitBtn.onclick = () => {
            const puzzle = modeStates.iso.currentPuzzle;
            if (!puzzle) return;

            const feedbackDiv  = get('iso-mapping-feedback');
            const feedbackText = get('iso-mapping-feedback-text');
            const tryAgainBtn  = get('iso-mapping-try-again');
            const nextBtn      = get('iso-mapping-next');
            if (feedbackDiv) feedbackDiv.style.display = '';

            // Collect the mapping from dropdowns
            const selects = document.querySelectorAll('#iso-mapping-container select');
            const nameMap = {};
            let incomplete = false;
            selects.forEach(sel => {
                const g1v = sel.dataset.g1vertex;
                const g2v = sel.value;
                if (!g2v) { incomplete = true; return; }
                nameMap[g1v] = g2v;
            });

            if (incomplete) {
                if (feedbackText) feedbackText.textContent = 'Make sure to pick all the correspondences before submitting!';
                if (feedbackDiv) feedbackDiv.className = 'training-feedback incorrect';
                if (feedbackDiv) feedbackDiv.style.display = '';
                return;
            }

            const valid = verifyIsomorphismWitness(puzzle.g1, puzzle.g2, nameMap);

            if (valid) {
                if (!modeStates.iso.part2Scored) {
                    modeStates.iso.stats.points += 0.5;
                    modeStates.iso.part2Scored   = true;
                    saveIsoStats();
                    updateIsoStatsDisplay();
                }
                const mapStr = Object.entries(nameMap).map(([k, v]) => `${k}→${v}`).join(', ');
                if (feedbackText) feedbackText.innerHTML =
                    `✓ <strong class="feedback-report correct">Correct!</strong> ` +
                    `The mapping ${mapStr} is a valid isomorphism.`;
                if (feedbackDiv) feedbackDiv.className = 'training-feedback correct';
                if (tryAgainBtn) tryAgainBtn.style.display = 'none';
                if (nextBtn)     nextBtn.style.display     = '';
                if (mappingSubmitBtn) mappingSubmitBtn.style.display = 'none';
                selects.forEach(s => s.disabled = true);
            } else {
                const witnessStr = Object.entries(puzzle.witness).map(([k, v]) => `${k}\u2192${v}`).join(', ');
                if (feedbackText) feedbackText.innerHTML =
                    `✗ <strong class="feedback-report incorrect">Incorrect.</strong> ` +
                    `That correspondence does not preserve all relationships. ` +
                    `A correct answer could is: <strong>${witnessStr}</strong>.`;
                if (feedbackDiv) feedbackDiv.className = 'training-feedback incorrect';
                if (tryAgainBtn) tryAgainBtn.style.display = '';
                if (nextBtn)     nextBtn.style.display     = 'none';
                if (mappingSubmitBtn) mappingSubmitBtn.style.display = 'none';
                selects.forEach(s => s.disabled = true);
            }
        };
    }

    const mappingTryAgain = get('iso-mapping-try-again');
    if (mappingTryAgain && !mappingTryAgain.dataset.bound) {
        mappingTryAgain.dataset.bound = '1';
        mappingTryAgain.onclick = () => startIsoTrial();
    }

    const mappingNext = get('iso-mapping-next');
    if (mappingNext && !mappingNext.dataset.bound) {
        mappingNext.dataset.bound = '1';
        mappingNext.onclick = () => startIsoTrial();
    }
}

/** Show a small "correct, next question" feedback for the equal scenario. */
function _showIsoEqualCorrect() {
    // Temporarily repurpose the part1-wrong panel as a success notice
    const panel = document.getElementById('iso-part1-wrong');
    const text  = document.getElementById('iso-part1-wrong-text');
    const btn   = document.getElementById('iso-next-from-wrong');
    if (!panel) return;
    panel.className = 'training-feedback correct';
    if (text) text.textContent = 'Correct! These two graphs are equal.';
    if (btn)  btn.textContent  = 'Next Question';
    panel.style.display = '';
}
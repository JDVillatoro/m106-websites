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
    make:     { containerId: 'make-graph-area',     panelId: 'make-graph-panel' },
    degree:   { containerId: 'degree-graph-area',   panelId: 'degree-panel'     },
    eulerian: { containerId: 'eulerian-graph-area',  panelId: 'eulerian-panel'   },
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
    const zin  = panel.querySelector('.zoom-button.zoom-in');
    const zout = panel.querySelector('.zoom-button.zoom-out');
    const mid  = () => ({ x: cy.width() / 2, y: cy.height() / 2 });
    if (zin)  zin.onclick  = () => cy.zoom({ level: cy.zoom() * 1.2, renderedPosition: mid() });
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

    const n     = Number(graph.n) || 0;
    const names = Array.isArray(graph.names) ? graph.names : [];
    const edges = Array.isArray(graph.edges) ? graph.edges : [];

    const elems = [];

    for (let i = 0; i < n; i++) {
        const id          = vertexId(i);
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

    const layout = cy.layout({ name: 'cose', animate: false, randomize: true, fit: true });
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
    const descEl    = document.getElementById(descriptionElementId);
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
    eulerian: { graph: null, stats: { correct: 0, total: 0, points: 0 }, _initialized: false, currentPuzzle: null, part1Scored: false, part2Scored: false }
};
let currentMode = 'make';

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------
const editBtn      = document.getElementById('edit-graph-btn');
const downloadBtn  = document.getElementById('download-btn');
const altTextBtn   = document.getElementById('alt-text-btn');
const altTextPanel = document.getElementById('alt-text-panel');
const altTextOutput = document.getElementById('alt-text-output');
const altTextCopyBtn = document.getElementById('alt-text-copy-btn');
const doneEditBtn  = document.getElementById('done-edit-btn');
const closeEditBtn = document.getElementById('close-edit-btn');
const modeMakeBtn  = document.getElementById('mode-make');
const modeDegreeBtn = document.getElementById('mode-degree');
const modeEulerBtn  = document.getElementById('mode-eulerian');
const editor       = document.getElementById('graph-editor');
const setVerticesBtn = document.getElementById('set-vertices-btn');
const editorVertices = document.getElementById('editor-vertices');
const vertexNamesDiv = document.getElementById('vertex-names');
const edgeListDiv    = document.getElementById('edge-list');
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

    ['mode-make', 'mode-degree', 'mode-eulerian'].forEach(deactivate);

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
    }
}

modeMakeBtn  && modeMakeBtn.addEventListener('click',  () => setMode('make'));
modeDegreeBtn && modeDegreeBtn.addEventListener('click', () => setMode('degree'));
modeEulerBtn  && modeEulerBtn.addEventListener('click',  () => setMode('eulerian'));

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
            inp.value        = graph.names[i] || '';
            inp.placeholder  = graph.names[i] || '';
            inp.dataset.prev = inp.value;
            inp.dataset.id   = vertexId(i);
        });
        const directedCheckbox = document.getElementById('editor-directed');
        if (directedCheckbox) directedCheckbox.checked = graph.directed;
        // Convert graph edges to editor edge format
        editorEdges = graph.edges.map(e => ({
            source: e.source,
            target: e.target,
            label:  e.label || null,
        }));
        renderEdgeList();
        editor.style.display = 'block';
        if (editBtn)     editBtn.style.display     = 'none';
        if (doneEditBtn) doneEditBtn.style.display  = '';
        if (closeEditBtn) closeEditBtn.style.display = '';
        if (downloadBtn) downloadBtn.style.display  = 'none';
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
        const nodes   = cy.nodes().map(nd => ({ id: nd.data('id'), name: nd.data('displayName') || '' }));
        const cyEdges = cy.edges().map(ed => ({
            source: ed.data('source'),
            target: ed.data('target'),
            label:  ed.data('label') || null,
        }));
        editorVertices.value = nodes.length || 1;
        editorNodes = nodes.map(nd => nd.name);
        createVertexInputs(nodes.length || 1);
        const inputs = vertexNamesDiv.querySelectorAll('input');
        inputs.forEach((inp, i) => {
            inp.value        = nodes[i] ? nodes[i].name : '';
            inp.placeholder  = inp.value;
            inp.dataset.prev = inp.value;
            inp.dataset.id   = nodes[i] ? nodes[i].id : vertexId(i);
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
    if (editBtn)     editBtn.style.display     = 'none';
    if (doneEditBtn) doneEditBtn.style.display  = '';
    if (closeEditBtn) closeEditBtn.style.display = '';
    if (downloadBtn) downloadBtn.style.display  = 'none';
});

closeEditBtn && closeEditBtn.addEventListener('click', () => {
    editor.style.display = 'none';
    if (editBtn)     editBtn.style.display     = '';
    if (doneEditBtn) doneEditBtn.style.display  = 'none';
    if (closeEditBtn) closeEditBtn.style.display = 'none';
    if (downloadBtn) downloadBtn.style.display  = '';
});

// ---------------------------------------------------------------------------
// Editor – apply (Done Editing)
// ---------------------------------------------------------------------------
function applyGraphAction() {
    const inputs   = vertexNamesDiv.querySelectorAll('input');
    const vertices = Array.from(inputs).map((inp, idx) => ({
        id:   inp.dataset.id || vertexId(idx),
        name: (inp.value || '').trim(),
    }));

    const n     = vertices.length;
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
    const directed   = directedCheckbox ? directedCheckbox.checked : false;
    const hasLabels  = edges.some(e => e.label && e.label.trim() !== '');
    const allNumeric = hasLabels && edges.filter(e => e.label).every(e => !isNaN(Number(e.label)));
    const edgeLabel  = !hasLabels ? null : allNumeric ? 'weight' : 'name';

    const graph = { n, names, directed, edgeLabel, edges };
    modeStates.make.graph = graph;

    const cy = getCy('make');
    if (cy) draw_graph(graph, cy);
    updateGraphAria('make-graph-description', graph, true);

    editor.style.display = 'none';
    if (editBtn)     editBtn.style.display     = '';
    if (doneEditBtn) doneEditBtn.style.display  = 'none';
    if (closeEditBtn) closeEditBtn.style.display = 'none';
    if (downloadBtn) downloadBtn.style.display  = '';
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
            const blob   = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
            const url    = URL.createObjectURL(blob);
            const a      = document.createElement('a');
            a.href = url; a.download = 'graph.svg';
            document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
            return;
        } catch (e) { console.warn('SVG export failed, trying PNG', e); }
    }
    if (typeof cy.png === 'function') {
        try {
            const dataUrl = cy.png({ full: true, scale: 1 });
            const res  = await fetch(dataUrl);
            const blob = await res.blob();
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
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
    const oldNames  = Array.from(oldInputs).map(i => i.value || i.placeholder);

    createVertexInputs(n);

    const newInputs = vertexNamesDiv.querySelectorAll('input');
    for (let i = 0; i < newInputs.length; i++) {
        if (i < oldNames.length) {
            newInputs[i].value       = oldNames[i];
            newInputs[i].placeholder = oldNames[i];
            newInputs[i].dataset.prev = oldNames[i];
        }
    }

    const validIds = new Set(Array.from(newInputs).map(inp => inp.dataset.id));
    editorEdges = editorEdges.filter(e => validIds.has(e.source) && validIds.has(e.target));
    renderEdgeList();
});

editorRandomBtn && editorRandomBtn.addEventListener('click', () => {
    const n          = parseInt(editorVertices.value, 10) || 5;
    const typeSelect = document.getElementById('editor-random-type');
    const type       = typeSelect ? typeSelect.value : 'default';
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
        const line  = document.createElement('div');
        line.classList.add('vertex-line');

        const lbl   = document.createElement('label');
        lbl.textContent = `${i + 1}.`;
        lbl.classList.add('vertex-label');

        const input = document.createElement('input');
        input.type        = 'text';
        input.placeholder = '';
        input.value       = editorNodes[i] || '';
        input.dataset.prev  = input.value;
        input.dataset.index = i;
        input.dataset.id    = vertexId(i);
        input.classList.add('vertex-input');

        input.addEventListener('input', ev => {
            const idx     = parseInt(ev.target.dataset.index, 10);
            const newName = (ev.target.value || '').trim();
            const prev    = ev.target.dataset.prev || '';
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
    const nodeId  = vertexId(index);
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

    const inputs   = vertexNamesDiv.querySelectorAll('input');
    const vertices = Array.from(inputs).map((inp, idx) => ({
        id:    inp.dataset.id || vertexId(idx),
        name:  (inp.value || '').trim(),
        index: idx,
    }));

    // Header row
    const hdr = document.createElement('div');
    hdr.classList.add('edge-list-header');
    ['Start', 'End', 'Label', ''].forEach((txt, i) => {
        const cell = document.createElement('div');
        cell.textContent = txt;
        cell.classList.add('edge-col', ['edge-col-start','edge-col-end','edge-col-name','edge-col-actions'][i]);
        hdr.appendChild(cell);
    });
    edgeListDiv.appendChild(hdr);

    editorEdges.forEach((e, idx) => {
        const row = document.createElement('div');
        row.classList.add('edge-row');

        function makeVertexSelect(currentVal) {
            const sel = document.createElement('select');
            const ph  = document.createElement('option');
            ph.value = ''; ph.textContent = '--'; sel.appendChild(ph);
            vertices.forEach(v => {
                const o = document.createElement('option');
                o.value       = v.id;
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

        const lblInput        = document.createElement('input');
        lblInput.type         = 'text';
        lblInput.placeholder  = 'label';
        lblInput.value        = e.label || '';
        lblInput.style.width  = '100%';
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

        row.appendChild(makeCol('edge-col-start',   fromSel));
        row.appendChild(makeCol('edge-col-end',     toSel));
        row.appendChild(makeCol('edge-col-name',    lblInput));
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
            modeStates.degree.stats.correct   = s.correct   || 0;
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
    const pct   = total === 0 ? 0 : Math.round((correct / total) * 100);
    const el    = id => document.getElementById(id);
    if (el('degree-correct'))   el('degree-correct').textContent   = correct;
    if (el('degree-incorrect')) el('degree-incorrect').textContent = incorrect;
    if (el('degree-accuracy'))  el('degree-accuracy').textContent  = pct + '%';
}

function showAnswerInput() {
    const answerInput = document.getElementById('degree-answer');
    const submitBtn   = document.getElementById('degree-submit-btn');
    const feedbackBox = document.getElementById('training-feedback');
    if (answerInput) { answerInput.value = ''; answerInput.disabled = false; }
    if (submitBtn)   submitBtn.style.display   = '';
    if (feedbackBox) feedbackBox.style.display = 'none';
}

function showFeedback(correct, expected) {
    const answerInput = document.getElementById('degree-answer');
    const submitBtn   = document.getElementById('degree-submit-btn');
    const feedbackBox = document.getElementById('training-feedback');
    const feedbackText = document.getElementById('feedback-text');

    if (answerInput) answerInput.disabled = true;
    if (submitBtn)   submitBtn.style.display = 'none';
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
    const resetBtn    = document.getElementById('degree-reset-btn');
    const submitBtn   = document.getElementById('degree-submit-btn');
    const answerInput = document.getElementById('degree-answer');
    const nextBtn     = document.getElementById('training-next');

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
            const correct  = arraysEqual(got, expected);
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
    const n     = Math.floor(Math.random() * 5) + 3;   // 3–7
    let   graph = generateSimpleGraph(n);

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

    const ds       = modeStates.degree;
    ds.graph       = graph;
    ds.expectedSeq = degreeSequence(graph.edges, n);

    const cy = getCy('degree');
    if (cy) draw_graph(graph, cy);
    updateGraphAria('degree-graph-description', graph, true);
    updateDegreeStatsDisplay();

    if (VERBOSE) console.log('startDegreeSequence: expected', ds.expectedSeq);
}

// ---------------------------------------------------------------------------
// Eulerian Trails Mode
// ---------------------------------------------------------------------------
function loadEulerianStats() {
    try {
        const raw = localStorage.getItem('graph_eulerian_stats');
        if (raw) {
            const s = JSON.parse(raw);
            modeStates.eulerian.stats.correct = s.correct || 0;
            modeStates.eulerian.stats.total   = s.total   || 0;
            modeStates.eulerian.stats.points  = s.points  || 0;
        }
    } catch (e) { /* ignore */ }
}

function saveEulerianStats() {
    try { localStorage.setItem('graph_eulerian_stats', JSON.stringify(modeStates.eulerian.stats)); }
    catch (e) { /* ignore */ }
}

function updateEulerianStatsDisplay() {
    const s    = modeStates.eulerian.stats;
    const pct  = s.total === 0 ? 0 : Math.round((s.points / s.total) * 100);
    const el   = id => document.getElementById(id);
    if (el('eulerian-total'))    el('eulerian-total').textContent    = s.total;
    if (el('eulerian-points'))   el('eulerian-points').textContent   = s.points.toFixed(1);
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
            const inp     = document.createElement('input');
            inp.type      = 'text';
            inp.placeholder = placeholder;
            inp.value     = value;
            inp.maxLength = 1;
            inp.addEventListener('input', () => {
                const v = inp.value.toUpperCase().trim();
                inp.value = v;
                onInput(v);
            });
            return inp;
        }

        const fromLbl   = Object.assign(document.createElement('span'), { textContent: 'From:', style: 'color:#555;font-size:14px;' });
        const fromInput = makeInput('A', row.from || '', v => { eulerAddEdges[idx].from = v; });
        const toLbl     = Object.assign(document.createElement('span'), { textContent: 'To:',   style: 'color:#555;font-size:14px;' });
        const toInput   = makeInput('B', row.to   || '', v => { eulerAddEdges[idx].to   = v; });

        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', () => { eulerAddEdges.splice(idx, 1); renderEulerAddEdgeList(); });

        [lbl, fromLbl, fromInput, toLbl, toInput, removeBtn].forEach(el => div.appendChild(el));
        container.appendChild(div);
    });
}

function resetEulerianUI() {
    const show = id => { const el = document.getElementById(id); if (el) el.style.display = ''; };
    const hide = id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; };
    const get  = id => document.getElementById(id);

    show('eulerian-part1');
    ['eulerian-part1-wrong', 'eulerian-part2-path', 'eulerian-part2-eulerize',
     'eulerian-path-feedback', 'eulerian-eulerize-feedback'].forEach(hide);

    ['eulerian-yes-btn', 'eulerian-no-btn'].forEach(id => {
        const btn = get(id);
        if (btn) { btn.classList.remove('selected-correct', 'selected-wrong'); btn.disabled = false; }
    });

    const pathInput = get('eulerian-path-input');
    if (pathInput) { pathInput.value = ''; pathInput.disabled = false; }

    eulerAddEdges = [{ from: '', to: '' }];
    renderEulerAddEdgeList();

    const submitBtn   = get('eulerian-path-submit-btn');
    const ezSubmitBtn = get('eulerian-eulerize-submit-btn');
    if (submitBtn)   submitBtn.style.display   = '';
    if (ezSubmitBtn) ezSubmitBtn.style.display = '';
}

function startEulerianTrial() {
    const puzzle = generateEulerianTrailPuzzle();
    modeStates.eulerian.currentPuzzle = puzzle;
    modeStates.eulerian.part1Scored   = false;
    modeStates.eulerian.part2Scored   = false;
    modeStates.eulerian.graph         = puzzle;

    const cy = getCy('eulerian');
    if (cy) draw_graph(puzzle, cy);
    updateGraphAria('eulerian-graph-description', puzzle, true);

    resetEulerianUI();
    updateEulerianStatsDisplay();

    // Update path input hint
    const hint = document.getElementById('eulerian-part2-path-hint');
    if (hint) {
        if (puzzle.isMulti) {
            hint.textContent = 'Enter alternating vertices and edge labels, e.g. AaBbCcA';
        } else if (puzzle.directed) {
            hint.textContent = 'Enter the vertices of an Eulerian circuit in order, e.g. ABCDA';
        } else {
            const oddCount = getOddVertices(puzzle.edges, puzzle.n).length;
            hint.textContent = oddCount === 0
                ? 'Enter the vertices of an Eulerian circuit in order, e.g. ABCA'
                : 'Enter the vertices of an Eulerian path in order, e.g. ABCD';
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
                    const wrongText  = get('eulerian-part1-wrong-text');
                    if (wrongText) {
                        wrongText.textContent = puzzle.isEulerian
                            ? 'This graph is actually Eulerian — every vertex has even degree (and the graph is connected).'
                            : 'This graph is actually not Eulerian — it has one or more vertices with odd degree (or is not connected/strongly connected).';
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
                    const part2 = get('eulerian-part2-path');
                    if (part2) part2.style.display = '';
                    const title = get('eulerian-part2-path-title');
                    if (title) {
                        if (puzzle.directed) {
                            title.textContent = 'Part 2 — Find an Eulerian circuit';
                        } else {
                            const oddCount = getOddVertices(puzzle.edges, puzzle.n).length;
                            title.textContent = oddCount === 0
                                ? 'Part 2 — Find an Eulerian circuit'
                                : 'Part 2 — Find an Eulerian path';
                        }
                    }
                } else {
                    const part2 = get('eulerian-part2-eulerize');
                    if (part2) part2.style.display = '';
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

            const valid = validateEulerization(puzzle, eulerAddEdges);

            const feedbackDiv  = get('eulerian-eulerize-feedback');
            const feedbackText = get('eulerian-eulerize-feedback-text');
            const tryAgainBtn  = get('eulerian-eulerize-try-again');
            const nextBtn      = get('eulerian-eulerize-next');
            if (feedbackDiv) feedbackDiv.style.display = '';

            if (valid) {
                if (!modeStates.eulerian.part2Scored) {
                    modeStates.eulerian.stats.points += 0.5;
                    modeStates.eulerian.part2Scored = true;
                    saveEulerianStats();
                    updateEulerianStatsDisplay();
                }
                if (feedbackText) feedbackText.innerHTML = '✓ <strong class="feedback-report correct">Correct!</strong> The added edges make every vertex even-degree — the graph is now Eulerian.';
                if (feedbackDiv)  feedbackDiv.className  = 'training-feedback correct';
                if (tryAgainBtn)  tryAgainBtn.style.display = 'none';
                if (nextBtn)      nextBtn.style.display     = '';
                if (ezSubmitBtn)  ezSubmitBtn.style.display = 'none';
            } else {
                if (feedbackText) {
                    // Compute post-addition odd vertices for the hint
                    const deg = Object.fromEntries(puzzle.names.map(nm => [nm, 0]));
                    puzzle.edges.forEach(e => {
                        const a = vertexLabel(e.source, puzzle.names);
                        const b = vertexLabel(e.target, puzzle.names);
                        if (a === b) { deg[a] += 2; } else { deg[a]++; deg[b]++; }
                    });
                    eulerAddEdges.forEach(ae => {
                        const f = (ae.from || '').toUpperCase();
                        const t = (ae.to   || '').toUpperCase();
                        if (f && t && f !== t && puzzle.names.includes(f) && puzzle.names.includes(t)) {
                            deg[f]++; deg[t]++;
                        }
                    });
                    const oddAfter = Object.entries(deg).filter(([, d]) => d % 2 !== 0).map(([nm]) => nm);
                    const hint = oddAfter.length > 0
                        ? ` Vertices with odd degree after your additions: ${oddAfter.join(', ')}.`
                        : ' Check that your added edges reference valid vertex names.';
                    feedbackText.innerHTML = '✗ <strong class="feedback-report incorrect">Not quite.</strong>' + hint + ' Try again!';
                }
                if (feedbackDiv)  feedbackDiv.className     = 'training-feedback incorrect';
                if (tryAgainBtn)  tryAgainBtn.style.display = '';
                if (nextBtn)      nextBtn.style.display     = 'none';
            }
        };
    }

    const ezTryAgain = get('eulerian-eulerize-try-again');
    if (ezTryAgain && !ezTryAgain.dataset.bound) {
        ezTryAgain.dataset.bound = '1';
        ezTryAgain.onclick = () => {
            get('eulerian-eulerize-feedback').style.display = 'none';
            get('eulerian-eulerize-submit-btn').style.display = '';
        };
    }
    const ezNext = get('eulerian-eulerize-next');
    if (ezNext && !ezNext.dataset.bound) {
        ezNext.dataset.bound = '1';
        ezNext.onclick = () => startEulerianTrial();
    }

    // Submit Eulerian path
    const pathSubmitBtn = get('eulerian-path-submit-btn');
    if (pathSubmitBtn && !pathSubmitBtn.dataset.bound) {
        pathSubmitBtn.dataset.bound = '1';
        pathSubmitBtn.onclick = () => {
            const puzzle    = modeStates.eulerian.currentPuzzle;
            const pathInput = get('eulerian-path-input');
            if (!puzzle || !pathInput) return;

            const raw = pathInput.value.trim();
            let valid = false;

            if (puzzle.isMulti) {
                const oddCount = getOddVertices(puzzle.edges, puzzle.n).length;
                valid = validateEulerianPathMulti(raw, puzzle, oddCount === 0);
            } else if (puzzle.directed) {
                const path = raw.toUpperCase().split('').filter(c => /[A-Z]/.test(c));
                valid = validateEulerianCircuitDigraph(path, puzzle);
            } else {
                const path     = raw.toUpperCase().split('').filter(c => /[A-Z]/.test(c));
                const oddCount = getOddVertices(puzzle.edges, puzzle.n).length;
                valid = validateEulerianPathSimple(path, puzzle, oddCount === 0);
            }

            const feedbackDiv  = get('eulerian-path-feedback');
            const feedbackText = get('eulerian-path-feedback-text');
            const tryAgainBtn  = get('eulerian-path-try-again');
            const nextBtn      = get('eulerian-path-next');
            if (feedbackDiv) feedbackDiv.style.display = '';

            if (valid) {
                if (!modeStates.eulerian.part2Scored) {
                    modeStates.eulerian.stats.points += 0.5;
                    modeStates.eulerian.part2Scored = true;
                    saveEulerianStats();
                    updateEulerianStatsDisplay();
                }
                if (feedbackText) feedbackText.innerHTML = '✓ <strong class="feedback-report correct">Correct!</strong> That is a valid Eulerian path.';
                if (feedbackDiv)  feedbackDiv.className  = 'training-feedback correct';
                if (tryAgainBtn)  tryAgainBtn.style.display  = 'none';
                if (nextBtn)      nextBtn.style.display      = '';
                if (pathSubmitBtn) pathSubmitBtn.style.display = 'none';
                pathInput.disabled = true;
            } else {
                if (feedbackText) {
                    let hint = '';
                    if      (puzzle.isMulti)   hint = ' Remember: use alternating capital letters (vertices) and lowercase letters (edge labels), e.g. AaBbCA.';
                    else if (puzzle.directed)  hint = ' Remember: it must be a circuit (start = end) and follow edge directions.';
                    else                       hint = ' Make sure you use every edge exactly once.';
                    feedbackText.innerHTML = '✗ <strong class="feedback-report incorrect">Not valid.</strong>' + hint;
                }
                if (feedbackDiv)  feedbackDiv.className     = 'training-feedback incorrect';
                if (tryAgainBtn)  tryAgainBtn.style.display = '';
                if (nextBtn)      nextBtn.style.display     = 'none';
            }
        };
    }

    const pathTryAgain = get('eulerian-path-try-again');
    if (pathTryAgain && !pathTryAgain.dataset.bound) {
        pathTryAgain.dataset.bound = '1';
        pathTryAgain.onclick = () => {
            get('eulerian-path-feedback').style.display = 'none';
            const pathInput = get('eulerian-path-input');
            if (pathInput) { pathInput.value = ''; pathInput.disabled = false; }
            get('eulerian-path-submit-btn').style.display = '';
        };
    }
    const pathNext = get('eulerian-path-next');
    if (pathNext && !pathNext.dataset.bound) {
        pathNext.dataset.bound = '1';
        pathNext.onclick = () => startEulerianTrial();
    }
}
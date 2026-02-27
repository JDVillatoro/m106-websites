// =============================================================================
// script.js  –  Graph Theory Website
// =============================================================================
// Key design decisions:
//  • Each mode owns its own Cytoscape instance (_cyMake / _cyDegree).
//    Sharing a single instance caused layout/resize bugs when switching panels.
//  • draw_graph() waits for the 'layoutstop' event before calling fit/center
//    so the graph is always fully visible.
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
        selector: 'edge[edgeType = "directed"]',
        style: { 'target-arrow-color': '#888', 'target-arrow-shape': 'triangle' }
    },
    {
        selector: 'edge[edgeType = "undirected"]',
        style: { 'target-arrow-shape': 'none' }
    }
];

// ---------------------------------------------------------------------------
// Per-mode Cytoscape instances
// ---------------------------------------------------------------------------
// We create them lazily the first time they are needed.
window._cyMake = null;
window._cyDegree = null;
window._cyEulerian = null;

/**
 * Get or create a Cytoscape instance for a given UI mode.
 * Modes supported: 'make' (graph editor) and 'degree' (degree sequence trainer).
 * Instances are created lazily and cached on the global `window` object.
 * @param {string} mode
 * @returns {object|null} Cytoscape instance or null when the container is unavailable
 */
function getCy(mode) {
    if (mode === 'make') {
        if (!window._cyMake) {
            const container = document.getElementById('make-graph-area');
            if (!container) return null;
            // Give the container an explicit viewport div
            let vp = container.querySelector('.graph-viewport');
            if (!vp) {
                vp = document.createElement('div');
                vp.className = 'graph-viewport';
                container.appendChild(vp);
            }
            window._cyMake = cytoscape({
                container: vp,
                elements: [],
                style: CY_STYLE,
                userZoomingEnabled: true,
                layout: { name: 'preset' }
            });
            wireZoomButtons('make-graph-panel', window._cyMake);
        }
        return window._cyMake;
    } else if (mode === 'degree') {
        if (!window._cyDegree) {
            const container = document.getElementById('degree-graph-area');
            if (!container) return null;
            let vp = container.querySelector('.graph-viewport');
            if (!vp) {
                vp = document.createElement('div');
                vp.className = 'graph-viewport';
                container.appendChild(vp);
            }
            window._cyDegree = cytoscape({
                container: vp,
                elements: [],
                style: CY_STYLE,
                userZoomingEnabled: true,
                layout: { name: 'preset' }
            });
            wireZoomButtons('degree-panel', window._cyDegree);
        }
        return window._cyDegree;
    } else if (mode === 'eulerian') {
        if (!window._cyEulerian) {
            const container = document.getElementById('eulerian-graph-area');
            if (!container) return null;
            let vp = container.querySelector('.graph-viewport');
            if (!vp) {
                vp = document.createElement('div');
                vp.className = 'graph-viewport';
                container.appendChild(vp);
            }
            window._cyEulerian = cytoscape({ container: vp, elements: [], style: CY_STYLE, userZoomingEnabled: true, layout: { name: 'preset' } });
            wireZoomButtons('eulerian-panel', window._cyEulerian);
        }
        return window._cyEulerian;
    }
    return null;
}

function wireZoomButtons(panelId, cy) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    const zin = panel.querySelector('.zoom-button.zoom-in');
    const zout = panel.querySelector('.zoom-button.zoom-out');
    if (zin) zin.onclick = () => cy.zoom({ level: cy.zoom() * 1.2, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
    if (zout) zout.onclick = () => cy.zoom({ level: cy.zoom() / 1.2, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
}

// ---------------------------------------------------------------------------
// draw_graph – replace all elements in cy and run cose layout
// graph_data: { n, names: string[], edges: [{source, target, label?, isDirected?}] }
// ---------------------------------------------------------------------------
/**
 * Render a graph into a Cytoscape instance and run a layout.
 * graph_data: { n, names: string[], edges: [{source, target, label?, isDirected?}] }
 * The function filters invalid edges, creates nodes by id (v0..v{n-1}),
 * and performs a 'cose' layout. On layoutstop the view is fit and centered.
 * @param {object} graph_data
 * @param {object} cy
 */
function draw_graph(graph_data, cy) {
    if (!cy || !graph_data) return;

    const n = Number(graph_data.n) || 0;
    const names = Array.isArray(graph_data.names) ? graph_data.names : [];
    const edges = Array.isArray(graph_data.edges) ? graph_data.edges : [];

    const validIds = new Set();
    for (let i = 0; i < n; i++) validIds.add(`v${i}`);

    const elems = [];
    for (let i = 0; i < n; i++) {
        const id = `v${i}`;
        const displayName = typeof names[i] === 'string' ? names[i] : id;
        elems.push({ data: { id, displayName, labelLen: displayName.length } });
    }

    edges.forEach((e, idx) => {
        const src = e && e.source;
        const tgt = e && e.target;
        // skip null-target edges (isolated vertex markers)
        if (!src || !tgt) return;
        if (!validIds.has(src) || !validIds.has(tgt)) {
            if (VERBOSE) console.warn(`draw_graph: skipping edge ${idx} – unknown endpoint`, e);
            return;
        }
        const data = { id: `e${idx}_${src}_${tgt}`, source: src, target: tgt };
        if (e.label && String(e.label).trim() !== '') data.label = String(e.label);
        data.edgeType = e.isDirected ? 'directed' : 'undirected';
        elems.push({ data });
    });

    cy.batch(() => {
        cy.elements().remove();
        cy.add(elems);
    });

    cy.resize();

    const layout = cy.layout({ name: 'cose', animate: false, randomize: true, fit: true });
    layout.on('layoutstop', () => {
        cy.fit();
        cy.center();
    });
    layout.run();
}

// ---------------------------------------------------------------------------
// Screen-reader accessibility helpers
// ---------------------------------------------------------------------------

// descriptionElementId: the id of the <p> holding the static description
// graph_data: { n, names, edges } in draw_graph format
// announce: if true, also push "New graph loaded. <description>" into the live region
/**
 * Update graph description for screen readers and optionally announce it
 * via the polite live region. Also refreshes the alt-text panel when
 * updating the 'make' panel description.
 * @param {string} descriptionElementId
 * @param {object} graph_data
 * @param {boolean} announce
 */
function updateGraphAria(descriptionElementId, graph_data, announce) {
    const descEl = document.getElementById(descriptionElementId);
    const announcer = document.getElementById('graph-sr-announcer');
    if (!descEl) return;

    const { text, isLong } = graphToDescription(graph_data);
    descEl.textContent = text;

    if (announce && announcer) {
        // Momentarily clear the announcer so screen readers re-announce even if text is identical
        announcer.textContent = '';
        // Use setTimeout to ensure the DOM mutation is detected as a change
        setTimeout(() => {
            const prefix = 'New graph loaded. ';
            announcer.textContent = prefix + text;
        }, 50);
    }

    if (descriptionElementId === 'make-graph-description') refreshAltTextPanel(graph_data);
}

// ---------------------------------------------------------------------------
// Mode state
// ---------------------------------------------------------------------------
const modeStates = {
    make: { nodes: [], edges: [], _initialized: false },
    degree: { nodes: [], edges: [], expectedSeq: [], stats: { correct: 0, incorrect: 0 }, _initialized: false },
    eulerian: { nodes: [], edges: [], stats: { correct: 0, total: 0, points: 0 }, _initialized: false, currentPuzzle: null, part1Scored: false, part2Scored: false }
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
const editor = document.getElementById('graph-editor');
const setVerticesBtn = document.getElementById('set-vertices-btn');
const editorVertices = document.getElementById('editor-vertices');
const vertexNamesDiv = document.getElementById('vertex-names');
const edgeListDiv = document.getElementById('edge-list');
const editorRandomBtn = document.getElementById('editor-random-btn');


let editorNodes = [];  // display names parallel to v0..v{n-1}
let editorEdges = [];  // [{source: "v0", target: "v1", label, isDirected}]

// ---------------------------------------------------------------------------
// Mode switching
// ---------------------------------------------------------------------------
function setMode(mode) {
    document.querySelectorAll('.mode-panel').forEach(p => p.style.display = 'none');

    if (mode === 'make') {
        modeMakeBtn && modeMakeBtn.classList.add('active');
        modeDegreeBtn && modeDegreeBtn.classList.remove('active');
        modeEulerBtn && modeEulerBtn.classList.remove('active');
        document.getElementById('make-graph-panel').style.display = '';
        currentMode = 'make';

        if (!modeStates.make._initialized) {
            modeStates.make._initialized = true;
        }

        // Re-draw stored make graph
        const ms = modeStates.make;
        if (ms.nodes.length > 0 || ms.edges.length > 0) {
            // Need a small delay so the panel is visible before cytoscape measures size
            setTimeout(() => {
                const cy = getCy('make');
                if (cy) draw_graph({ n: ms.nodes.length, names: ms.nodes, edges: ms.edges }, cy);
                updateGraphAria('make-graph-description', { n: ms.nodes.length, names: ms.nodes, edges: ms.edges }, true);
            }, 30);
        }

    } else if (mode === 'degree') {
        modeMakeBtn && modeMakeBtn.classList.remove('active');
        modeDegreeBtn && modeDegreeBtn.classList.add('active');
        modeEulerBtn && modeEulerBtn.classList.remove('active');
        document.getElementById('degree-panel').style.display = '';
        currentMode = 'degree';

        if (!modeStates.degree._initialized) {
            loadDegreeStats();
            bindDegreeControls();
            modeStates.degree._initialized = true;
            setTimeout(() => startDegreeSequence(), 30);
        } else {
            // Re-draw existing degree graph
            const ds = modeStates.degree;
            if (ds.nodes.length > 0) {
                setTimeout(() => {
                    const cy = getCy('degree');
                    if (cy) draw_graph({ n: ds.nodes.length, names: ds.nodes, edges: ds.edges }, cy);
                    updateGraphAria('degree-graph-description', { n: ds.nodes.length, names: ds.nodes, edges: ds.edges }, true);
                }, 30);
            }
        }
    } else if (mode === 'eulerian') {
        modeMakeBtn && modeMakeBtn.classList.remove('active');
        modeDegreeBtn && modeDegreeBtn.classList.remove('active');
        const modeEulerBtn = document.getElementById('mode-eulerian');
        if (modeEulerBtn) modeEulerBtn.classList.add('active');
        document.getElementById('eulerian-panel').style.display = '';
        currentMode = 'eulerian';

        if (!modeStates.eulerian._initialized) {
            loadEulerianStats();
            bindEulerianControls();
            modeStates.eulerian._initialized = true;
            setTimeout(() => startEulerianTrial(), 30);
        } else {
            const es = modeStates.eulerian;
            if (es.nodes.length > 0) {
                setTimeout(() => {
                    const cy = getCy('eulerian');
                    if (cy) draw_graph({ n: es.nodes.length, names: es.nodes, edges: es.edges }, cy);
                    updateGraphAria('eulerian-graph-description', { n: es.nodes.length, names: es.nodes, edges: es.edges }, true);
                }, 30);
            }
        }
    }
}

modeMakeBtn && modeMakeBtn.addEventListener('click', () => setMode('make'));
modeDegreeBtn && modeDegreeBtn.addEventListener('click', () => setMode('degree'));
modeEulerBtn && modeEulerBtn.addEventListener('click', () => setMode('eulerian'));

// ---------------------------------------------------------------------------
// Random graph generation helpers
// ---------------------------------------------------------------------------
function makeLabels(n) {
    if (n > 8) return Array.from({ length: n }, (_, i) => String(i + 1));
    return Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
}

function generateAndRenderRandom(n = 5, populateEditor = false) {
    // Determine randomization mode if provided via optional third parameter
    const args = Array.from(arguments);
    const type = args.length >= 3 && typeof args[2] === 'string' ? args[2] : 'default';
    // Collect raw edges from the requested generator (if available)
    let raw = [];
    if (type === 'msc_digraph' && typeof generateMSC_Digraph === 'function') {
        raw = generateMSC_Digraph(n) || [];
    } else if (type === 'eulerian_digraph' && typeof generateEulerianDigraph === 'function') {
        raw = generateEulerianDigraph(n) || [];
    } else if (type === 'simple_graph' && typeof generateSimpleGraph === 'function') {
        raw = generateSimpleGraph(n) || [];
    } else if (type === 'eulerian_simple' && typeof generateEulerianSimpleGraph === 'function') {
        raw = generateEulerianSimpleGraph(n) || [];
    } else if (type === 'eulerian_multi' && typeof generateEulerianMultigraph === 'function') {
        raw = generateEulerianMultigraph(n) || [];
    } else if (type === 'mcs_graph' && typeof generateMinimalConnectedGraph === 'function') {
        raw = generateMinimalConnectedGraph(n) || [];
    } else {
        // default: allow generators that may include random weights/directions
        raw = generateRandomGraph(n, false, false, 1) || [];
    }

    // Normalize edges per-mode rules:
    // - Only `default` may include random weights/directions (preserve from generator)
    // - Digraph modes (msc_digraph, eulerian_digraph) must be directed, no weights
    // - All other named modes: never directed and never weighted
    const edges = raw.map(e => {
        const src = (typeof e.source === 'number') ? `v${e.source}` : String(e.source);
        const tgt = (typeof e.target === 'number') ? `v${e.target}` : String(e.target);
        let isDirected = false;
        let weight = null;

        if (type === 'msc_digraph' || type === 'eulerian_digraph') {
            isDirected = true;
            weight = null;
        } else if (type === 'default') {
            isDirected = !!e.isDirected;
            weight = (e.weight !== undefined) ? e.weight : null;
        } else {
            isDirected = false;
            weight = null;
        }

        return {
            source: src, target: tgt, isDirected, weight,
            isLoop: !!e.isLoop, isMultiple: !!e.isMultiple
        };
    });
    const labels = makeLabels(n);

    modeStates.make.nodes = labels.slice();
    modeStates.make.edges = edges.slice();

    const cy = getCy('make');
    if (cy) draw_graph({ n, names: labels, edges }, cy);
    updateGraphAria('make-graph-description', { n, names: labels, edges }, true);

    if (populateEditor) {
        editorVertices.value = n;
        editorNodes = labels.slice();
        createVertexInputs(n);
        const inputs = vertexNamesDiv.querySelectorAll('input');
        inputs.forEach((inp, i) => {
            inp.value = labels[i];
            inp.placeholder = labels[i];
            inp.dataset.prev = labels[i];
            inp.dataset.id = `v${i}`;
        });
        editorEdges = edges
            .filter(e => e.target !== null)
            .map(e => ({ source: e.source, target: e.target, label: e.weight != null ? String(e.weight) : null, isDirected: !!e.isDirected, directed: !!e.isDirected }));
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
            isDirected: ed.data('edgeType') === 'directed',
            directed: ed.data('edgeType') === 'directed'
        }));
        editorVertices.value = nodes.length || 1;
        editorNodes = nodes.map(nd => nd.name);
        createVertexInputs(nodes.length || 1);
        const inputs = vertexNamesDiv.querySelectorAll('input');
        inputs.forEach((inp, i) => {
            inp.value = nodes[i] ? nodes[i].name : '';
            inp.placeholder = nodes[i] ? nodes[i].name : '';
            inp.dataset.prev = inp.value;
            inp.dataset.id = nodes[i] ? nodes[i].id : `v${i}`;
        });
        editorEdges = cyEdges;
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
        id: inp.dataset.id || `v${idx}`,
        name: (inp.value || '').trim()
    }));

    const n = vertices.length;
    const names = vertices.map(v => v.name);

    // Resolve edge ids → filter out incomplete edges
    const resolvedEdges = [];
    editorEdges.forEach((e, i) => {
        const sVert = vertices.find(v => v.id === e.source || v.name === String(e.source || '').trim());
        const tVert = vertices.find(v => v.id === e.target || v.name === String(e.target || '').trim());
        if (!sVert || !tVert) return;
        resolvedEdges.push({
            source: sVert.id,
            target: tVert.id,
            label: e.label || null,
            isDirected: !!e.isDirected
        });
    });

    modeStates.make.nodes = names;
    modeStates.make.edges = resolvedEdges;

    const cy = getCy('make');
    if (cy) draw_graph({ n, names, edges: resolvedEdges }, cy);
    updateGraphAria('make-graph-description', { n, names, edges: resolvedEdges }, true);

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
            const a = document.createElement('a'); a.href = url; a.download = 'graph.svg';
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
            const a = document.createElement('a'); a.href = url; a.download = 'graph.png';
            document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
            return;
        } catch (e) { console.warn('PNG export failed', e); }
    }
    alert('Export not available. Add the cytoscape-svg extension to enable SVG export.');
});

altTextBtn && altTextBtn.addEventListener('click', () => {
    const isVisible = altTextPanel.style.display !== 'none';
    if (isVisible) {
        altTextPanel.style.display = 'none';
    } else {
        const ms = modeStates.make;
        const { text } = graphToDescription({ n: ms.nodes.length, names: ms.nodes, edges: ms.edges });
        altTextOutput.value = text;
        altTextPanel.style.display = 'block';
        // Auto-fit height to content
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


function refreshAltTextPanel(graph_data) {
    if (!altTextOutput || altTextPanel.style.display === 'none') return;
    const { text } = graphToDescription(graph_data);
    altTextOutput.value = text;
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

    // Drop edges referencing removed vertices
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
        input.dataset.id = `v${i}`;
        input.classList.add('vertex-input');

        input.addEventListener('input', ev => {
            const idx = parseInt(ev.target.dataset.index, 10);
            const newName = (ev.target.value || '').trim();
            const prevName = ev.target.dataset.prev || '';
            renameVertex(idx, newName, prevName);
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
    newName = String(newName || '').trim();

    const nodeId = `v${index}`;
    for (const e of editorEdges) {
        if (e.source === nodeId || String(e.source || '').trim() === oldName) e.source = nodeId;
        if (e.target === nodeId || String(e.target || '').trim() === oldName) e.target = nodeId;
    }

    editorNodes[index] = newName;
    renderEdgeList();
}

// ---------------------------------------------------------------------------
// Editor – edge list
// ---------------------------------------------------------------------------
function renderEdgeList() {
    edgeListDiv.innerHTML = '';

    const inputs = vertexNamesDiv.querySelectorAll('input');
    const vertices = Array.from(inputs).map((inp, idx) => ({
        id: inp.dataset.id || `v${idx}`,
        name: (inp.value || '').trim(),
        index: idx
    }));

    // Header row
    const hdr = document.createElement('div');
    hdr.classList.add('edge-list-header');
    ['Start', 'End', 'Label', 'Directed', ''].forEach((txt, i) => {
        const cell = document.createElement('div');
        cell.textContent = txt;
        cell.classList.add('edge-col', ['edge-col-start', 'edge-col-end', 'edge-col-name', 'edge-col-directed', 'edge-col-actions'][i]);
        hdr.appendChild(cell);
    });
    edgeListDiv.appendChild(hdr);

    editorEdges.forEach((e, idx) => {
        const row = document.createElement('div');
        row.classList.add('edge-row');

        // Helper: build a vertex select
        function makeVertexSelect(currentVal) {
            const sel = document.createElement('select');
            const ph = document.createElement('option'); ph.value = ''; ph.textContent = '--'; sel.appendChild(ph);
            vertices.forEach(v => {
                const o = document.createElement('option');
                o.value = v.id;
                o.textContent = `${v.index + 1}.${v.name ? ' ' + v.name : ''}`;
                sel.appendChild(o);
            });
            // Resolve selection
            const match = vertices.find(v => v.id === currentVal) || vertices.find(v => v.name === String(currentVal || '').trim());
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

        const dirCheckbox = document.createElement('input');
        dirCheckbox.type = 'checkbox';
        dirCheckbox.title = 'Directed';
        dirCheckbox.checked = !!(e.isDirected || e.directed);
        dirCheckbox.addEventListener('change', () => {
            editorEdges[idx].isDirected = dirCheckbox.checked;
            editorEdges[idx].directed = dirCheckbox.checked;
        });

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
        row.appendChild(makeCol('edge-col-directed', dirCheckbox));
        row.appendChild(makeCol('edge-col-actions', rem));
        edgeListDiv.appendChild(row);
    });

    // Add Edge button
    const footer = document.createElement('div');
    footer.style.cssText = 'margin-top:8px;display:flex;justify-content:center;';
    const addBtn = document.createElement('button');
    addBtn.textContent = 'Add Edge';
    addBtn.addEventListener('click', () => {
        editorEdges.push({ source: '', target: '', label: null, directed: false, isDirected: false });
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
    try {
        localStorage.setItem('graph_degree_stats', JSON.stringify(modeStates.degree.stats));
    } catch (e) { /* ignore */ }
}

function updateDegreeStatsDisplay() {
    const stats = modeStates.degree.stats;
    const total = stats.correct + stats.incorrect;
    const pct = total === 0 ? 0 : Math.round((stats.correct / total) * 100);
    const el = id => document.getElementById(id);
    if (el('degree-correct')) el('degree-correct').textContent = stats.correct;
    if (el('degree-incorrect')) el('degree-incorrect').textContent = stats.incorrect;
    if (el('degree-accuracy')) el('degree-accuracy').textContent = pct + '%';
}

// Show the answer input / submit button; hide the feedback box
function showAnswerInput() {
    const answerInput = document.getElementById('degree-answer');
    const submitBtn = document.getElementById('degree-submit-btn');
    const feedbackBox = document.getElementById('training-feedback');
    if (answerInput) { answerInput.value = ''; answerInput.disabled = false; }
    if (submitBtn) submitBtn.style.display = '';
    if (feedbackBox) feedbackBox.style.display = 'none';
}

// Show the feedback box; hide the submit button and lock the input
function showFeedback(correct, expected) {
    const answerInput = document.getElementById('degree-answer');
    const submitBtn = document.getElementById('degree-submit-btn');
    const feedbackBox = document.getElementById('training-feedback');
    const feedbackText = document.getElementById('feedback-text');

    if (answerInput) answerInput.disabled = true;
    if (submitBtn) submitBtn.style.display = 'none';
    // Use the feedback report classes to show correct/incorrect styling
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
            modeStates.degree.stats.correct = 0;
            modeStates.degree.stats.incorrect = 0;
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
            if (correct) {
                modeStates.degree.stats.correct++;
            } else {
                modeStates.degree.stats.incorrect++;
            }
            saveDegreeStats();
            updateDegreeStatsDisplay();
            showFeedback(correct, expected);
        };
    }

    if (nextBtn && !nextBtn.dataset.bound) {
        nextBtn.dataset.bound = '1';
        nextBtn.onclick = () => {
            showAnswerInput();
            startDegreeSequence();
        };
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
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
}

function startDegreeSequence() {
    const n = Math.floor(Math.random() * 5) + 3;   // 3..7
    let edges = generateSimpleGraph(n);

    // Occasionally add loops / parallel edges to make it more interesting
    if (Math.random() < 0.5) {
        const extra = Math.floor(Math.random() * 3) + 1;
        for (let k = 0; k < extra; k++) {
            if (Math.random() < 0.5) {
                const idx = Math.floor(Math.random() * n);
                edges.push({ source: `v${idx}`, target: `v${idx}`, isDirected: false, weight: null });
            } else {
                let i = Math.floor(Math.random() * n);
                let j = Math.floor(Math.random() * n);
                if (i === j) j = (i + 1) % n;
                edges.push({ source: `v${i}`, target: `v${j}`, isDirected: false, weight: null });
            }
        }
    }

    const labels = makeLabels(n);
    const ds = modeStates.degree;
    ds.nodes = labels.slice();           // store display names
    ds.edges = edges;
    ds.expectedSeq = degreeSequence(edges, n);

    const cy = getCy('degree');
    if (cy) draw_graph({ n, names: labels, edges }, cy);
    updateGraphAria('degree-graph-description', { n, names: labels, edges }, true);

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
    try {
        localStorage.setItem('graph_eulerian_stats', JSON.stringify(modeStates.eulerian.stats));
    } catch (e) { /* ignore */ }
}

function updateEulerianStatsDisplay() {
    const s = modeStates.eulerian.stats;
    const maxPts = s.total;
    const pct = maxPts === 0 ? 0 : Math.round((s.points / maxPts) * 100);
    const get = id => document.getElementById(id);
    if (get('eulerian-total'))    get('eulerian-total').textContent    = s.total;
    if (get('eulerian-points'))   get('eulerian-points').textContent   = s.points.toFixed(1);
    if (get('eulerian-accuracy')) get('eulerian-accuracy').textContent = pct + '%';
}

/**
 * Render the add-edge rows for the Eulerize panel.
 * eulerAddEdges is an array of {from, to} objects (module-level state).
 */
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

        const fromLbl = document.createElement('span');
        fromLbl.textContent = 'From:';
        fromLbl.style.cssText = 'color:#555; font-size:14px;';

        const fromInput = document.createElement('input');
        fromInput.type = 'text';
        fromInput.placeholder = 'A';
        fromInput.value = row.from || '';
        fromInput.maxLength = 1;
        fromInput.addEventListener('input', () => {
            eulerAddEdges[idx].from = fromInput.value.toUpperCase().trim();
            fromInput.value = eulerAddEdges[idx].from;
        });

        const toLbl = document.createElement('span');
        toLbl.textContent = 'To:';
        toLbl.style.cssText = 'color:#555; font-size:14px;';

        const toInput = document.createElement('input');
        toInput.type = 'text';
        toInput.placeholder = 'B';
        toInput.value = row.to || '';
        toInput.maxLength = 1;
        toInput.addEventListener('input', () => {
            eulerAddEdges[idx].to = toInput.value.toUpperCase().trim();
            toInput.value = eulerAddEdges[idx].to;
        });

        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', () => {
            eulerAddEdges.splice(idx, 1);
            renderEulerAddEdgeList();
        });

        div.appendChild(lbl);
        div.appendChild(fromLbl);
        div.appendChild(fromInput);
        div.appendChild(toLbl);
        div.appendChild(toInput);
        div.appendChild(removeBtn);
        container.appendChild(div);
    });
}

/**
 * Reset the Eulerian Trails UI to a clean state ready for a new puzzle.
 */
function resetEulerianUI() {
    const show = id => { const el = document.getElementById(id); if (el) el.style.display = ''; };
    const hide = id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; };
    const get  = id => document.getElementById(id);

    show('eulerian-part1');
    hide('eulerian-part1-wrong');
    hide('eulerian-part2-path');
    hide('eulerian-part2-eulerize');
    hide('eulerian-path-feedback');
    hide('eulerian-eulerize-feedback');

    // Reset Part1 buttons
    ['eulerian-yes-btn', 'eulerian-no-btn'].forEach(id => {
        const btn = get(id);
        if (btn) { btn.classList.remove('selected-correct', 'selected-wrong'); btn.disabled = false; }
    });

    // Reset path input
    const pathInput = get('eulerian-path-input');
    if (pathInput) { pathInput.value = ''; pathInput.disabled = false; }

    // Reset eulerize
    eulerAddEdges = [{ from: '', to: '' }];
    renderEulerAddEdgeList();

    const submitBtn = get('eulerian-path-submit-btn');
    if (submitBtn) submitBtn.style.display = '';
    const ezSubmitBtn = get('eulerian-eulerize-submit-btn');
    if (ezSubmitBtn) ezSubmitBtn.style.display = '';
}

function startEulerianTrial() {
    const puzzle = generateEulerianTrailPuzzle();
    modeStates.eulerian.currentPuzzle = puzzle;
    modeStates.eulerian.part1Scored   = false;
    modeStates.eulerian.part2Scored   = false;

    const { n, names, edges, isDirected, isMulti, isEulerian } = puzzle;
    modeStates.eulerian.nodes = names.slice();
    modeStates.eulerian.edges = edges.slice();

    const cy = getCy('eulerian');
    if (cy) draw_graph({ n, names, edges }, cy);
    updateGraphAria('eulerian-graph-description', { n, names, edges }, true);

    resetEulerianUI();
    updateEulerianStatsDisplay();

    // Update subtitle hint for path input based on graph type
    const hint = document.getElementById('eulerian-part2-path-hint');
    if (hint) {
        if (isMulti) {
            hint.textContent = 'Enter alternating vertices and edge labels, e.g. AaBbCcA';
        } else if (isDirected) {
            hint.textContent = 'Enter the vertices of an Eulerian circuit in order, e.g. ABCDA';
        } else {
            const oddCount = (() => {
                const deg = new Array(n).fill(0);
                edges.forEach(e => {
                    const si = parseInt(e.source.slice(1));
                    const ti = parseInt(e.target.slice(1));
                    if (si === ti) { deg[si] += 2; } else { deg[si]++; deg[ti]++; }
                });
                return deg.filter(d => d % 2 !== 0).length;
            })();
            hint.textContent = oddCount === 0
                ? 'Enter the vertices of an Eulerian circuit in order, e.g. ABCA'
                : 'Enter the vertices of an Eulerian path in order, e.g. ABCD';
        }
    }

    if (VERBOSE) console.log('startEulerianTrial:', puzzle);
}

function bindEulerianControls() {
    const get = id => document.getElementById(id);

    // Reset button
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

    // Part 1 — Eulerian / Not Eulerian buttons
    ['eulerian-yes-btn', 'eulerian-no-btn'].forEach(btnId => {
        const btn = get(btnId);
        if (btn && !btn.dataset.bound) {
            btn.dataset.bound = '1';
            btn.onclick = () => {
                const puzzle = modeStates.eulerian.currentPuzzle;
                if (!puzzle) return;

                const userSaysEulerian = (btnId === 'eulerian-yes-btn');
                const correct = (userSaysEulerian === puzzle.isEulerian);

                // Disable both buttons
                ['eulerian-yes-btn', 'eulerian-no-btn'].forEach(id => {
                    const b = get(id); if (b) b.disabled = true;
                });

                // Award half point for Part 1
                modeStates.eulerian.stats.total += 1;
                if (correct) {
                    modeStates.eulerian.stats.points += 0.5;
                    modeStates.eulerian.part1Scored = true;
                    btn.classList.add('selected-correct');
                } else {
                    btn.classList.add('selected-wrong');
                    // Show wrong-answer panel with explanation
                    get('eulerian-part1').style.display = 'none';
                    const wrongPanel = get('eulerian-part1-wrong');
                    const wrongText  = get('eulerian-part1-wrong-text');
                    if (wrongText) {
                        wrongText.textContent = puzzle.isEulerian
                            ? 'This graph is actually Eulerian — every vertex has even degree (and the graph is connected).'
                            : 'This graph is actually not Eulerian — it has one or more vertices with odd degree (or is not connected/strongly connected).';
                    }
                    if (wrongPanel) wrongPanel.style.display = '';
                    saveEulerianStats();
                    updateEulerianStatsDisplay();
                    return;
                }

                saveEulerianStats();
                updateEulerianStatsDisplay();

                // Show Part 2
                get('eulerian-part1').style.display = 'none';
                if (puzzle.isEulerian) {
                    // Part 2a — find the path/circuit
                    const part2 = get('eulerian-part2-path');
                    if (part2) part2.style.display = '';
                    const title = get('eulerian-part2-path-title');
                    if (title) {
                        if (puzzle.isDirected) {
                            title.textContent = 'Part 2 — Find an Eulerian circuit';
                        } else {
                            const deg = new Array(puzzle.n).fill(0);
                            puzzle.edges.forEach(e => {
                                const si = parseInt(e.source.slice(1));
                                const ti = parseInt(e.target.slice(1));
                                if (si === ti) { deg[si] += 2; } else { deg[si]++; deg[ti]++; }
                            });
                            const oddCount = deg.filter(d => d % 2 !== 0).length;
                            title.textContent = oddCount === 0
                                ? 'Part 2 — Find an Eulerian circuit'
                                : 'Part 2 — Find an Eulerian path';
                        }
                    }
                } else {
                    // Part 2b — eulerize
                    const part2 = get('eulerian-part2-eulerize');
                    if (part2) part2.style.display = '';
                    eulerAddEdges = [{ from: '', to: '' }];
                    renderEulerAddEdgeList();
                }
            };
        }
    });

    // Next button after Part 1 wrong
    const nextFromWrong = get('eulerian-next-from-wrong');
    if (nextFromWrong && !nextFromWrong.dataset.bound) {
        nextFromWrong.dataset.bound = '1';
        nextFromWrong.onclick = () => startEulerianTrial();
    }

    // Add Edge button (Eulerize panel)
    const addEdgeBtn = get('eulerian-add-edge-btn');
    if (addEdgeBtn && !addEdgeBtn.dataset.bound) {
        addEdgeBtn.dataset.bound = '1';
        addEdgeBtn.onclick = () => {
            eulerAddEdges.push({ from: '', to: '' });
            renderEulerAddEdgeList();
        };
    }

    // Submit eulerization
    const ezSubmitBtn = get('eulerian-eulerize-submit-btn');
    if (ezSubmitBtn && !ezSubmitBtn.dataset.bound) {
        ezSubmitBtn.dataset.bound = '1';
        ezSubmitBtn.onclick = () => {
            const puzzle = modeStates.eulerian.currentPuzzle;
            if (!puzzle) return;

            const valid = typeof validateEulerization === 'function'
                ? validateEulerization(puzzle.edges, eulerAddEdges, puzzle.names, puzzle.n)
                : false;

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
                if (feedbackDiv)  feedbackDiv.className = 'training-feedback correct';
                if (tryAgainBtn)  tryAgainBtn.style.display = 'none';
                if (nextBtn)      nextBtn.style.display = '';
                if (ezSubmitBtn)  ezSubmitBtn.style.display = 'none';
            } else {
                if (feedbackText) {
                    // Give a helpful hint
                    const deg = {};
                    puzzle.names.forEach(nm => { deg[nm] = 0; });
                    puzzle.edges.forEach(e => {
                        const a = puzzle.names[parseInt(e.source.slice(1))];
                        const b = puzzle.names[parseInt(e.target.slice(1))];
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
                if (feedbackDiv)  feedbackDiv.className = 'training-feedback incorrect';
                if (tryAgainBtn)  tryAgainBtn.style.display = '';
                if (nextBtn)      nextBtn.style.display = 'none';
            }
        };
    }

    // Try again / Next — eulerize
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
            const puzzle   = modeStates.eulerian.currentPuzzle;
            const pathInput = get('eulerian-path-input');
            if (!puzzle || !pathInput) return;

            const raw = pathInput.value.trim();
            let valid = false;

            if (puzzle.isMulti) {
                // Multigraph: alternating capital/lowercase
                // Determine if circuit required (all even) or path (2 odd)
                const deg = new Array(puzzle.n).fill(0);
                puzzle.edges.forEach(e => {
                    const si = parseInt(e.source.slice(1));
                    const ti = parseInt(e.target.slice(1));
                    if (si === ti) { deg[si] += 2; } else { deg[si]++; deg[ti]++; }
                });
                const oddCount = deg.filter(d => d % 2 !== 0).length;
                valid = validateEulerianPathMulti(raw, puzzle.names, puzzle.edges, oddCount === 0);
            } else if (puzzle.isDirected) {
                // Directed: must be a circuit
                const path = raw.toUpperCase().split('').filter(c => /[A-Z]/.test(c));
                valid = validateEulerianCircuitDigraph(path, puzzle.names, puzzle.edges);
            } else {
                // Simple undirected
                const path = raw.toUpperCase().split('').filter(c => /[A-Z]/.test(c));
                const deg = new Array(puzzle.n).fill(0);
                puzzle.edges.forEach(e => {
                    const si = parseInt(e.source.slice(1));
                    const ti = parseInt(e.target.slice(1));
                    if (si === ti) { deg[si] += 2; } else { deg[si]++; deg[ti]++; }
                });
                const oddCount = deg.filter(d => d % 2 !== 0).length;
                valid = validateEulerianPathSimple(path, puzzle.names, puzzle.edges, oddCount === 0);
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
                if (feedbackDiv)  feedbackDiv.className = 'training-feedback correct';
                if (tryAgainBtn)  tryAgainBtn.style.display = 'none';
                if (nextBtn)      nextBtn.style.display = '';
                if (pathSubmitBtn) pathSubmitBtn.style.display = 'none';
                pathInput.disabled = true;
            } else {
                if (feedbackText) {
                    let hint = '';
                    if (puzzle.isMulti) hint = ' Remember: use alternating capital letters (vertices) and lowercase letters (edge labels), e.g. AaBbCA.';
                    else if (puzzle.isDirected) hint = ' Remember: it must be a circuit (start = end) and follow edge directions.';
                    else hint = ' Make sure you use every edge exactly once.';
                    feedbackText.innerHTML = '✗ <strong class="feedback-report incorrect">Not valid.</strong>' + hint;
                }
                if (feedbackDiv)  feedbackDiv.className = 'training-feedback incorrect';
                if (tryAgainBtn)  tryAgainBtn.style.display = '';
                if (nextBtn)      nextBtn.style.display = 'none';
            }
        };
    }

    // Try again / Next — path
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
// =============================================================================
// make-mode.js  –  Make A Graph mode
// =============================================================================

// DOM refs
const editBtn = document.getElementById('edit-graph-btn');
const downloadBtn = document.getElementById('download-btn');
const altTextBtn = document.getElementById('alt-text-btn');
const altTextPanel = document.getElementById('alt-text-panel');
const altTextOutput = document.getElementById('alt-text-output');
const altTextCopyBtn = document.getElementById('alt-text-copy-btn');
const doneEditBtn = document.getElementById('done-edit-btn');
const closeEditBtn = document.getElementById('close-edit-btn');
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

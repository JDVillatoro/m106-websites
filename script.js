// Helper: convert edges array to Cytoscape elements
function edgesToCyElements(edges, nodesMap = {}) {
    const nodeSet = new Set();
    for (const e of edges) {
        nodeSet.add(e.source);
        if (e.target !== null) nodeSet.add(e.target);
    }
    const elements = [];
    for (const id of nodeSet) elements.push({ data: { id, displayName: nodesMap[id] || '' } });
    for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        if (edge.target === null) continue;
        elements.push({ data: { id: `e${i}_${edge.source}_${edge.target}`, source: edge.source, target: edge.target, label: edge.label || null, edgeType: edge.isDirected ? 'directed' : 'undirected' } });
    }
    return elements;
}

// Debug logging toggle: set `window.GRAPH_VERBOSE = true` in the console to enable
const VERBOSE = (typeof window !== 'undefined' && !!window.GRAPH_VERBOSE);

function renderCyElements(elements) {
    if (window._cyInstance) {
        window._cyInstance.elements().remove();
        window._cyInstance.add(elements);
        window._cyInstance.layout({ name: 'cose', animate: true, randomize: true }).run();
        return;
    }
    window._cyInstance = cytoscape({
        container: document.getElementById('cy'),
        elements,
        style: [
            { selector: 'node', style: { 'background-color': '#fff', 'border-width': 2, 'border-color': '#333', 'label': 'data(displayName)', 'color': '#333', 'text-valign': 'center', 'text-halign': 'center', 'width': 36, 'height': 36 } },
            { selector: 'edge', style: { 'width': 2, 'line-color': '#888', 'curve-style': 'bezier', 'font-size': 12, 'color': '#fff', 'text-background-color': '#888', 'text-background-opacity': 1, 'text-background-padding': 6 } },
            { selector: 'edge[label]', style: { 'label': 'data(label)' } },
            { selector: 'edge[edgeType = "directed"]', style: { 'target-arrow-color': '#888', 'target-arrow-shape': 'triangle' } },
            { selector: 'edge[edgeType = "undirected"]', style: { 'target-arrow-shape': 'none' } }
        ],
        layout: { name: 'cose', animate: true, randomize: true },
        userZoomingEnabled: false
    });
    document.getElementById('zoom-in').onclick = function() { window._cyInstance.zoom({ level: window._cyInstance.zoom() * 1.2 }); };
    document.getElementById('zoom-out').onclick = function() { window._cyInstance.zoom({ level: window._cyInstance.zoom() / 1.2 }); };
    window._cyInstance.userZoomingEnabled(false);
    document.getElementById('cy').addEventListener('wheel', function(e) { e.stopPropagation(); }, { passive: false });
}

function generateAndRenderRandom(n = 5, populateEditor = false) {
    const edges = generateRandomGraph(n, false, false, 1);
    // Decide vertex labels: A,B,C... (caps) unless n > 8 then use numbers starting at 1
    const labels = [];
    if (n > 8) {
        for (let i = 0; i < n; i++) labels.push(String(i + 1));
    } else {
        for (let i = 0; i < n; i++) labels.push(String.fromCharCode(65 + i));
    }
    // nodesMap maps internal id (v0..) -> display label
    const nodesMap = {};
    for (let i = 0; i < n; i++) nodesMap[`v${i}`] = labels[i];
    const elements = edgesToCyElements(edges, nodesMap);
    renderCyElements(elements);
    if (populateEditor) {
        // populate editor inputs and edges (editorNodes holds display names)
        editorVertices.value = n;
        // set editorNodes to labels so inputs show default labels
        editorNodes = labels.slice();
        createVertexInputs(n);
        const inputs = vertexNamesDiv.querySelectorAll('input');
        inputs.forEach((inp, i) => { inp.value = labels[i]; inp.placeholder = ''; inp.dataset.prev = labels[i]; inp.dataset.id = `v${i}`; });
        editorEdges = edges.filter(e => e.target !== null).map(e => ({ source: e.source, target: e.target, label: e.weight !== null ? String(e.weight) : null, isDirected: !!e.isDirected, directed: !!e.isDirected }));
        renderEdgeList();
        editor.style.display = 'block';
        const graphWindow = document.getElementById('graph-window');
        if (graphWindow) graphWindow.style.display = 'none';
    }
}

// initial random graph on load
document.addEventListener('DOMContentLoaded', () => {
    const defaultN = 5;
    // prepare editor elements references used by generateAndRenderRandom
    // (vertexNamesDiv exists later in script scope)
    setTimeout(() => generateAndRenderRandom(defaultN, false), 0);
});

// Editor UI logic
const editBtn = document.getElementById('edit-graph-btn');
const downloadBtn = document.getElementById('download-btn');
const doneEditBtn = document.getElementById('done-edit-btn');
const closeEditBtn = document.getElementById('close-edit-btn');
const modeMakeBtn = document.getElementById('mode-make');
const modeTestBtn = document.getElementById('mode-test');
const modeDescription = document.getElementById('mode-description');
const testPlaceholder = document.getElementById('test-placeholder');
const editor = document.getElementById('graph-editor');
const setVerticesBtn = document.getElementById('set-vertices-btn');
const editorVertices = document.getElementById('editor-vertices');
const vertexNamesDiv = document.getElementById('vertex-names');
// removed legacy global edge-source/edge-target/add-edge controls
const edgeListDiv = document.getElementById('edge-list');
// apply-graph button deprecated; use applyGraphAction() instead
const directedCheckbox = document.getElementById('directed-checkbox');
const labelEdgesCheckbox = document.getElementById('label-edges-checkbox');
const edgeLabelInput = document.getElementById('edge-label');
const editorRandomBtn = document.getElementById('editor-random-btn');

let editorNodes = [];
let editorEdges = [];

editBtn.addEventListener('click', () => {
    // If a cytoscape instance exists, populate editor from it; otherwise use main input
    if (window._cyInstance) {
        try {
            const nodes = window._cyInstance.nodes().map(n => ({ id: n.data('id'), name: n.data('displayName') || '' }));
            const edges = window._cyInstance.edges().map(ed => ({ source: ed.data('source'), target: ed.data('target'), label: ed.data('label') || null, isDirected: ed.data('edgeType') === 'directed' }));
            editorVertices.value = nodes.length || 1;
            // set editorNodes from display names
            editorNodes = nodes.map(n => n.name || '');
            createVertexInputs(nodes.length || 1);
            const inputs = vertexNamesDiv.querySelectorAll('input');
            inputs.forEach((inp, i) => { inp.value = nodes[i] ? nodes[i].name : inp.placeholder; inp.dataset.prev = inp.value; inp.dataset.id = nodes[i] ? nodes[i].id : (`v${i}`); });
            editorEdges = edges.slice();
            renderEdgeList();
            editor.style.display = 'block';
            // hide rendered graph while editing
            const graphWindow = document.getElementById('graph-window');
            if (graphWindow) graphWindow.style.display = 'none';
            // swap main buttons
            if (editBtn) editBtn.style.display = 'none';
            if (doneEditBtn) doneEditBtn.style.display = '';
            if (closeEditBtn) closeEditBtn.style.display = '';
                if (downloadBtn) downloadBtn.style.display = 'none';
            return;
        } catch (err) {
            console.error('Failed to populate editor from Cytoscape instance', err);
        }
    }
    // fallback: pre-fill editor vertices from main input
    editor.style.display = 'block';
    // hide rendered graph while editing
    const graphWindow = document.getElementById('graph-window');
    if (graphWindow) graphWindow.style.display = 'none';
    const mainV = document.getElementById('vertices').value || 5;
    editorVertices.value = mainV;
    createVertexInputs(parseInt(editorVertices.value, 10));
    if (editBtn) editBtn.style.display = 'none';
    if (doneEditBtn) doneEditBtn.style.display = '';
    if (closeEditBtn) closeEditBtn.style.display = '';
        if (downloadBtn) downloadBtn.style.display = 'none';
});

// Mode switching
function setMode(mode) {
    if (mode === 'make') {
        if (modeMakeBtn) modeMakeBtn.classList.add('active');
        if (modeTestBtn) modeTestBtn.classList.remove('active');
        if (modeDescription) modeDescription.textContent = 'Create and edit graphs.';
        // show main graph UI
        const gc = document.querySelector('.graph-controls'); if (gc) gc.style.display = '';
        const graphWindow = document.getElementById('graph-window'); if (graphWindow) graphWindow.style.display = '';
        if (testPlaceholder) testPlaceholder.style.display = 'none';
    } else {
        if (modeMakeBtn) modeMakeBtn.classList.remove('active');
        if (modeTestBtn) modeTestBtn.classList.add('active');
        if (modeDescription) modeDescription.textContent = 'Test mode placeholder (features coming soon).';
        const gc = document.querySelector('.graph-controls'); if (gc) gc.style.display = 'none';
        const graphWindow = document.getElementById('graph-window'); if (graphWindow) graphWindow.style.display = 'none';
        if (testPlaceholder) testPlaceholder.style.display = '';
    }
}

if (modeMakeBtn) modeMakeBtn.addEventListener('click', () => setMode('make'));
if (modeTestBtn) modeTestBtn.addEventListener('click', () => setMode('test'));

// Ensure initial mode
setMode('make');

if (closeEditBtn) {
    closeEditBtn.addEventListener('click', () => {
        editor.style.display = 'none';
        const graphWindow = document.getElementById('graph-window');
        if (graphWindow) graphWindow.style.display = '';
        if (editBtn) editBtn.style.display = '';
        if (doneEditBtn) doneEditBtn.style.display = 'none';
        if (closeEditBtn) closeEditBtn.style.display = 'none';
            if (downloadBtn) downloadBtn.style.display = '';
    });
}

setVerticesBtn.addEventListener('click', () => {
    const n = parseInt(editorVertices.value, 10);
    if (isNaN(n) || n < 1) return;
    // Preserve existing names where possible, and remove edges referencing deleted vertices
    const oldInputs = vertexNamesDiv.querySelectorAll('input');
    const oldNames = Array.from(oldInputs).map(i => i.value || i.placeholder);
    createVertexInputs(n);
    const newInputs = vertexNamesDiv.querySelectorAll('input');
    // Restore names for overlapping indices and propagate renames
    for (let i = 0; i < newInputs.length; i++) {
        const inp = newInputs[i];
        if (i < oldNames.length) {
            const prev = oldNames[i];
            // set value and trigger rename propagation
            inp.value = prev;
            inp.placeholder = prev;
            inp.dataset.prev = prev;
            renameVertex(i, prev);
        }
    }
    // If vertices were removed, drop edges that reference removed names
    if (oldNames.length > newInputs.length) {
        const allowed = new Set(Array.from(newInputs).map(i => i.value || i.placeholder));
        editorEdges = editorEdges.filter(e => allowed.has(e.source) && (e.target === null || allowed.has(e.target)));
    }
    updateVertexLists();
    renderEdgeList();
});

function createVertexInputs(n) {
    editorNodes = [];
    vertexNamesDiv.innerHTML = '';
    // Render header + a vertical numbered list of inputs: "1. [label]"
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
        lbl.textContent = `${i+1}.`;
        lbl.classList.add('vertex-label');
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = '';
        input.value = editorNodes[i] || '';
        input.dataset.prev = input.value;
        input.dataset.index = i;
        input.dataset.id = `v${i}`;
        input.classList.add('vertex-input');
        input.addEventListener('input', (ev) => {
            const idx = parseInt(ev.target.dataset.index, 10);
            const raw = ev.target.value || ev.target.placeholder || '';
            const newName = String(raw).trim();
            // read previous displayed name from dataset (helps when placeholders differ)
            const prevName = ev.target.dataset.prev || '';
            // update the input value to the trimmed name for consistency and store prev
            ev.target.value = newName;
            if (VERBOSE) console.log('vertex input', { idx, newName, prev: prevName, editorNodesPrev: editorNodes[idx] });
            // call renameVertex with prevName to update edges that referenced the old displayed name
            renameVertex(idx, newName, prevName);
            ev.target.dataset.prev = newName;
        });
        line.appendChild(lbl);
        line.appendChild(input);
        list.appendChild(line);
        editorNodes.push(input.value);
    }
    vertexNamesDiv.appendChild(list);
    updateVertexLists();
}

function renameVertex(index, newName, prevDisplayedName) {
    // prefer the previous displayed name (from input.dataset.prev) when provided,
    // otherwise fall back to the stored editorNodes value
    const oldName = (typeof prevDisplayedName === 'string' && prevDisplayedName.length > 0)
        ? String(prevDisplayedName).trim()
        : (editorNodes[index] ? String(editorNodes[index]).trim() : '');
    newName = String(newName || '').trim();
    if (VERBOSE) console.log('renameVertex start', { index, oldName, newName, editorEdgesBefore: JSON.parse(JSON.stringify(editorEdges)) });
    if (oldName === newName) {
        editorNodes[index] = newName;
        updateVertexLists();
        return;
    }
    // Update any edges that reference the old name or the internal id
    const nodeId = `v${index}`;
    for (const e of editorEdges) {
        if (e.source === nodeId || String(e.source || '').trim() === oldName) e.source = nodeId;
        if (e.target === nodeId || String(e.target || '').trim() === oldName) e.target = nodeId;
    }
    // Also update any existing edge-select DOM options so UI updates immediately
    const edgeListEl = document.getElementById('edge-list');
    if (edgeListEl) {
        const inputs = Array.from(vertexNamesDiv.querySelectorAll('input'));
        const idToIndex = inputs.reduce((m, inp, idx) => { m[inp.dataset.id || `v${idx}`] = idx; return m; }, {});
        const selects = edgeListEl.querySelectorAll('select');
        selects.forEach((sel, selIdx) => {
            Array.from(sel.options).forEach((opt, optIdx) => {
                const optVal = String(opt.value || '');
                // if option value is the internal id, update its displayed text
                if (optVal === nodeId) {
                    const idx = idToIndex[nodeId] ?? index;
                    opt.textContent = `${idx+1}.${newName ? ' ' + newName : ''}`;
                    if (VERBOSE) console.log('renameVertex: updated option text', { selIdx, optIdx, optVal, newText: opt.textContent });
                }
                // handle legacy option values that used the oldName as the value
                if (oldName && optVal === oldName) {
                    // switch the option value to the internal id and update text
                    const prevVal = optVal;
                    opt.value = nodeId;
                    const idx = idToIndex[nodeId] ?? index;
                    opt.textContent = `${idx+1}.${newName ? ' ' + newName : ''}`;
                    if (VERBOSE) console.log('renameVertex: migrated legacy option', { selIdx, optIdx, prevVal, newVal: opt.value });
                }
            });
            // if currently selected matched oldName (legacy), migrate selection to nodeId
            if (oldName && String(sel.value || '').trim() === oldName) {
                sel.value = nodeId;
                if (VERBOSE) console.log('renameVertex: migrated select selection', { selIdx, newValue: sel.value });
            }
        });
    }
    if (VERBOSE) console.log('renameVertex after updates', { editorEdgesAfter: JSON.parse(JSON.stringify(editorEdges)) });
    editorNodes[index] = newName;
    updateVertexLists();
    renderEdgeList();
}

function updateVertexLists() {
    const inputs = vertexNamesDiv.querySelectorAll('input');
    const names = [];
    inputs.forEach(inp => names.push(inp.value || inp.placeholder));
    // update legacy selects if present in DOM
    const edgeSourceEl = document.getElementById('edge-source');
    const edgeTargetEl = document.getElementById('edge-target');
    if (edgeSourceEl && edgeTargetEl) {
        edgeSourceEl.innerHTML = '';
        edgeTargetEl.innerHTML = '';
        names.forEach(n => {
            const o1 = document.createElement('option'); o1.value = n; o1.textContent = n;
            const o2 = document.createElement('option'); o2.value = n; o2.textContent = n;
            edgeSourceEl.appendChild(o1);
            edgeTargetEl.appendChild(o2);
        });
    }
}

if (labelEdgesCheckbox) {
    labelEdgesCheckbox.addEventListener('change', () => {
        if (edgeLabelInput) edgeLabelInput.style.display = labelEdgesCheckbox.checked ? 'inline-block' : 'none';
    });
}

// legacy addEdgeBtn removed; footer 'Add Edge' in renderEdgeList handles adding rows

// Random graph button inside editor: generate with no loops, no multiedges, 1 component
if (editorRandomBtn) {
    editorRandomBtn.addEventListener('click', () => {
        const n = parseInt(editorVertices.value, 10) || 5;
        generateAndRenderRandom(n, true);
    });
}

function renderEdgeList() {
    edgeListDiv.innerHTML = '';
    const inputs = vertexNamesDiv.querySelectorAll('input');
    const vertices = Array.from(inputs).map((i, idx) => ({ id: i.dataset.id || `v${idx}`, name: (i.value || '').trim(), index: idx }));
    // Header row for the table-like view
    const hdr = document.createElement('div');
    hdr.classList.add('edge-list-header');
    const hStart = document.createElement('div'); hStart.textContent = 'Start'; hStart.classList.add('edge-col','edge-col-start');
    const hEnd = document.createElement('div'); hEnd.textContent = 'End'; hEnd.classList.add('edge-col','edge-col-end');
    const hLabel = document.createElement('div'); hLabel.textContent = 'Label'; hLabel.classList.add('edge-col','edge-col-name');
    const hDirected = document.createElement('div'); hDirected.textContent = 'Directed'; hDirected.classList.add('edge-col','edge-col-directed');
    const hActions = document.createElement('div'); hActions.textContent = ''; hActions.classList.add('edge-col','edge-col-actions');
    hdr.appendChild(hStart); hdr.appendChild(hEnd); hdr.appendChild(hLabel); hdr.appendChild(hDirected); hdr.appendChild(hActions);
    edgeListDiv.appendChild(hdr);
    editorEdges.forEach((e, idx) => {
        const row = document.createElement('div');
        row.classList.add('edge-row');

        // From select
        const fromSel = document.createElement('select');
        const ph1 = document.createElement('option'); ph1.value = ''; ph1.textContent = '--'; fromSel.appendChild(ph1);
        vertices.forEach(v => { const o = document.createElement('option'); o.value = v.id; o.textContent = `${v.index+1}.${v.name ? ' ' + v.name : ''}`; fromSel.appendChild(o); });
        // resolve selection: e.source may be an id or a display name
        let selSourceId = '';
        if (e.source) {
            // if matches an id
            const matchById = vertices.find(v => v.id === e.source);
            if (matchById) selSourceId = matchById.id;
            else {
                // try match by name
                const matchByName = vertices.find(v => v.name === String(e.source).trim());
                if (matchByName) selSourceId = matchByName.id;
            }
        }
        if (selSourceId) fromSel.value = selSourceId; else fromSel.selectedIndex = 0;
        if (VERBOSE) console.log('renderEdgeList: fromSel', { idx, source: e.source, selectedValue: fromSel.value });
        fromSel.addEventListener('change', () => { editorEdges[idx].source = fromSel.value; });

        // To select
        const toSel = document.createElement('select');
        const ph2 = document.createElement('option'); ph2.value = ''; ph2.textContent = '--'; toSel.appendChild(ph2);
        vertices.forEach(v => { const o = document.createElement('option'); o.value = v.id; o.textContent = `${v.index+1}.${v.name ? ' ' + v.name : ''}`; toSel.appendChild(o); });
        let selTargetId = '';
        if (e.target) {
            const matchById = vertices.find(v => v.id === e.target);
            if (matchById) selTargetId = matchById.id;
            else {
                const matchByName = vertices.find(v => v.name === String(e.target).trim());
                if (matchByName) selTargetId = matchByName.id;
            }
        }
        if (selTargetId) toSel.value = selTargetId; else toSel.selectedIndex = 0;
        if (VERBOSE) console.log('renderEdgeList: toSel', { idx, target: e.target, selectedValue: toSel.value });
        toSel.addEventListener('change', () => { editorEdges[idx].target = toSel.value; });

        // Label input
        const lblInput = document.createElement('input');
        lblInput.type = 'text';
        lblInput.placeholder = 'label';
        lblInput.value = e.label || '';
        lblInput.style.width = '100%';
        lblInput.style.boxSizing = 'border-box';
        lblInput.addEventListener('input', () => { editorEdges[idx].label = lblInput.value; });

        // Direction checkbox per-edge
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
        rem.addEventListener('click', () => { editorEdges.splice(idx,1); renderEdgeList(); });

        const cFrom = document.createElement('div'); cFrom.classList.add('edge-col','edge-col-start');
        const labelFrom = document.createElement('span'); labelFrom.classList.add('col-label'); labelFrom.textContent = 'Start';
        cFrom.appendChild(labelFrom); cFrom.appendChild(fromSel);
        const cTo = document.createElement('div'); cTo.classList.add('edge-col','edge-col-end');
        const labelTo = document.createElement('span'); labelTo.classList.add('col-label'); labelTo.textContent = 'End';
        cTo.appendChild(labelTo); cTo.appendChild(toSel);
        const cLabel = document.createElement('div'); cLabel.classList.add('edge-col','edge-col-name');
        const labelName = document.createElement('span'); labelName.classList.add('col-label'); labelName.textContent = 'Label';
        cLabel.appendChild(labelName); cLabel.appendChild(lblInput);
        const cDirected = document.createElement('div'); cDirected.classList.add('edge-col','edge-col-directed');
        const labelDirected = document.createElement('span'); labelDirected.classList.add('col-label'); labelDirected.textContent = 'Directed';
        cDirected.appendChild(labelDirected); cDirected.appendChild(dirCheckbox);
        const cActions = document.createElement('div'); cActions.classList.add('edge-col','edge-col-actions');
        const labelActions = document.createElement('span'); labelActions.classList.add('col-label'); labelActions.textContent = '';
        cActions.appendChild(labelActions); cActions.appendChild(rem);
        row.appendChild(cFrom);
        row.appendChild(cTo);
        row.appendChild(cLabel);
        row.appendChild(cDirected);
        row.appendChild(cActions);
        edgeListDiv.appendChild(row);
    });

    // Footer: Add Edge button that inserts a blank editable edge row
    const footer = document.createElement('div');
    footer.style.marginTop = '8px';
    footer.style.display = 'flex';
    footer.style.justifyContent = 'center';
    const addBtn = document.createElement('button');
    addBtn.textContent = 'Add Edge';
    addBtn.addEventListener('click', () => {
        const labelVal = (labelEdgesCheckbox && labelEdgesCheckbox.checked) ? (edgeLabelInput ? edgeLabelInput.value || '' : '') : null;
        const edge = { source: '', target: '', label: labelVal, directed: directedCheckbox && directedCheckbox.checked, isDirected: directedCheckbox && directedCheckbox.checked };
        editorEdges.push(edge);
        renderEdgeList();
    });
    footer.appendChild(addBtn);
    edgeListDiv.appendChild(footer);
}

function applyGraphAction() {
    // Build cytoscape elements from editorNodes and editorEdges
    const inputs = vertexNamesDiv.querySelectorAll('input');
    // build mapping of internal id -> displayName
    const vertices = Array.from(inputs).map((inp, idx) => ({ id: inp.dataset.id || `v${idx}`, name: (inp.value || '').trim() }));
    const idByName = new Map(vertices.map(v => [v.name, v.id]));
    const cyElements = [];
    vertices.forEach(v => cyElements.push({ data: { id: v.id, displayName: v.name || '' } }));
    editorEdges.forEach((e, i) => {
        // resolve source/target ids (e.source may be id or legacy name)
        const resolveId = (val) => {
            if (!val) return null;
            // direct id match
            const direct = vertices.find(v => v.id === val); if (direct) return direct.id;
            // match by name
            const byName = vertices.find(v => v.name === String(val).trim()); if (byName) return byName.id;
            return null;
        };
        const sId = resolveId(e.source);
        const tId = resolveId(e.target);
        if (!sId || !tId) return;
        cyElements.push({ data: { id: `e${i}_${sId}_${tId}`, source: sId, target: tId, label: e.label || null, edgeType: e.directed ? 'directed' : 'undirected' } });
    });

    // reuse rendering logic: create or update cytoscape
    if (window._cyInstance) {
        window._cyInstance.elements().remove();
        window._cyInstance.add(cyElements);
        window._cyInstance.layout({ name: 'cose', animate: true, randomize: true }).run();
    } else {
        window._cyInstance = cytoscape({
            container: document.getElementById('cy'),
            elements: cyElements,
            style: [
            { selector: 'node', style: { 'background-color': '#fff', 'border-width': 2, 'border-color': '#333', 'label': 'data(displayName)', 'color': '#333', 'text-valign': 'center', 'text-halign': 'center', 'width': 36, 'height': 36 } },
                { selector: 'edge', style: { 'width': 2, 'line-color': '#888', 'curve-style': 'bezier', 'font-size': 12, 'color': '#fff', 'text-background-color': '#888', 'text-background-opacity': 1, 'text-background-padding': 6 } },
                { selector: 'edge[label]', style: { 'label': 'data(label)' } },
                { selector: 'edge[edgeType = "directed"]', style: { 'target-arrow-color': '#888', 'target-arrow-shape': 'triangle' } },
                { selector: 'edge[edgeType = "undirected"]', style: { 'target-arrow-shape': 'none' } }
            ],
            layout: { name: 'cose', animate: true, randomize: true },
            userZoomingEnabled: false
        });
        // attach zoom buttons
        document.getElementById('zoom-in').onclick = function() { window._cyInstance.zoom({ level: window._cyInstance.zoom() * 1.2 }); };
        document.getElementById('zoom-out').onclick = function() { window._cyInstance.zoom({ level: window._cyInstance.zoom() / 1.2 }); };
    }

    editor.style.display = 'none';
    const graphWindow = document.getElementById('graph-window');
    if (graphWindow) graphWindow.style.display = '';
    if (editBtn) editBtn.style.display = '';
    if (doneEditBtn) doneEditBtn.style.display = 'none';
    if (closeEditBtn) closeEditBtn.style.display = 'none';
    if (downloadBtn) downloadBtn.style.display = '';
}

if (doneEditBtn) {
    doneEditBtn.addEventListener('click', () => {
        // Trigger the Apply Graph behavior then close editor
        applyGraphAction();
    });
}

// Download/export handler: prefer SVG (if cytoscape provides svg()), fall back to PNG
if (downloadBtn) {
    downloadBtn.addEventListener('click', async () => {
        if (!window._cyInstance) { alert('No graph to download'); return; }
        // SVG if available
        if (typeof window._cyInstance.svg === 'function') {
            try {
                const svgStr = window._cyInstance.svg({ scale: 1 });
                const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'graph.svg'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
                return;
            } catch (e) {
                console.warn('SVG export failed, falling back to PNG', e);
            }
        }
        // Fallback: PNG using cy.png()
        if (typeof window._cyInstance.png === 'function') {
            try {
                const dataUrl = window._cyInstance.png({ full: true, scale: 1 });
                const res = await fetch(dataUrl);
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'graph.png'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
                return;
            } catch (e) {
                console.warn('PNG export failed', e);
            }
        }
        alert('Export not available. To enable SVG export, add the cytoscape-svg extension.');
    });
}

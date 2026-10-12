// =============================================================================
// Graph Coloring Mode
// =============================================================================

const COLORING_BASE = [
    { token: 'a', name: 'Red', css: '#e74c3c', freeAlias: 'R', greedyAlias: 'A' },
    { token: 'b', name: 'Green', css: '#27ae60', freeAlias: 'G', greedyAlias: 'B' },
    { token: 'c', name: 'Blue', css: '#3498db', freeAlias: 'B', greedyAlias: 'C' },
    { token: 'd', name: 'Yellow', css: '#f1c40f', freeAlias: 'Y', greedyAlias: 'D' },
    { token: 'e', name: 'Purple', css: '#9b59b6', freeAlias: 'P', greedyAlias: 'E' },
    { token: 'f', name: 'Orange', css: '#e67e22', freeAlias: 'O', greedyAlias: 'F' },
];

const COLORING_BY_TOKEN = Object.fromEntries(
    COLORING_BASE.map(c => [c.token, c])
);

const COLORING_COPY = {
    titles: {
        freeform: max => `Color the graph using at most ${max} colors.`,
        greedy: 'Use the greedy coloring algorithm to color the graph.',
    },
    subtitles: {
        greedyChoices: 'Your color choices are A, B, C, D, E and F (in that order).',
        // greedyRule: 'The greedy coloring algorithm says to go through each vertex in the specified order and color the graph using the first allowed color.',
        // greedyOrder: names => `Vertex order: ${names.join(', ')}.`,
    },
    feedback: {
        successFreeform: 'That is a valid coloring of the graph!',
        successFreeformMinimal: 'That is a valid coloring of the graph and you used the minimal number of colors!',
        successGreedy: 'You applied the greedy coloring algorithm correctly!',
        failGreedy: (vertexLabel, expectedAlias) => `Vertex ${vertexLabel} is colored incorrectly. It should be assigned ${expectedAlias}.`,
        failConflict: (v1, v2, colorName) => `This is not a valid coloring of the graph. Vertex ${v1} and Vertex ${v2} are both colored ${colorName} and are connected by an edge.`,
    },
};

const COLORING_PUZZLE_CONFIG = {
    nMin: 5,
    nMax: 8,
    bipartiteWeight: 0.25,
    planarWeight: 0.50,
    k5Weight: 0.25,
    generationMaxChromatic: 5,
    promptMaxColors: 6,
};

function _makeColoringNumberNames(n) {
    return Array.from({ length: n }, (_, i) => String(i + 1));
}

function _makeBipartiteColoringPuzzleGraph(n) {
    const leftSize = _randInt(2, n - 2);
    const vertices = shuffle(Array.from({ length: n }, (_, i) => i));
    const left = vertices.slice(0, leftSize);
    const right = vertices.slice(leftSize);

    const edgeSet = new Set();
    const edges = [];
    const addEdge = (a, b) => {
        const key = _edgeKey(a, b);
        if (a === b || edgeSet.has(key)) return false;
        edgeSet.add(key);
        edges.push({ s: Math.min(a, b), t: Math.max(a, b) });
        return true;
    };

    for (const r of right) addEdge(r, left[_randInt(0, left.length - 1)]);
    for (const l of left) addEdge(l, right[_randInt(0, right.length - 1)]);

    const target = Math.max(n + 1, Math.min(Math.floor(1.7 * n), left.length * right.length));
    let guard = 0;
    while (edges.length < target && guard < 3000) {
        guard++;
        addEdge(left[_randInt(0, left.length - 1)], right[_randInt(0, right.length - 1)]);
    }

    return {
        n,
        names: _makeColoringNumberNames(n),
        directed: false,
        edgeLabel: null,
        edges: _toEdges(edges),
        flavor: 'bipartite',
    };
}

function _makePlanarColoringPuzzleGraph(n) {
    const g = generatePlanarGraph(n, 1.14, 1.55);
    return {
        n: g.n,
        names: _makeColoringNumberNames(g.n),
        directed: false,
        edgeLabel: null,
        edges: g.edges.slice(),
        flavor: 'planar',
    };
}

function _makeK5ColoringPuzzleGraph(n) {
    const vertices = shuffle(Array.from({ length: n }, (_, i) => i));
    const core = vertices.slice(0, 5);
    const extras = vertices.slice(5);

    const edgeSet = new Set();
    const edges = [];
    const addEdge = (a, b) => {
        const key = _edgeKey(a, b);
        if (a === b || edgeSet.has(key)) return;
        edgeSet.add(key);
        edges.push({ s: Math.min(a, b), t: Math.max(a, b) });
    };

    for (let i = 0; i < core.length; i++) {
        for (let j = i + 1; j < core.length; j++) addEdge(core[i], core[j]);
    }

    for (const v of extras) {
        const shuffledCore = shuffle(core.slice());
        const degreeToCore = _randInt(2, 4);
        for (let i = 0; i < degreeToCore; i++) addEdge(v, shuffledCore[i]);
    }

    return {
        n,
        names: _makeColoringNumberNames(n),
        directed: false,
        edgeLabel: null,
        edges: _toEdges(edges),
        flavor: 'k5',
    };
}

function generateGraphColoringPuzzle() {
    for (let attempt = 0; attempt < 60; attempt++) {
        const n = _randInt(COLORING_PUZZLE_CONFIG.nMin, COLORING_PUZZLE_CONFIG.nMax);
        const roll = Math.random();

        let graph;
        if (roll < COLORING_PUZZLE_CONFIG.bipartiteWeight) {
            graph = _makeBipartiteColoringPuzzleGraph(n);
        } else if (roll < COLORING_PUZZLE_CONFIG.bipartiteWeight + COLORING_PUZZLE_CONFIG.planarWeight) {
            graph = _makePlanarColoringPuzzleGraph(n);
        } else {
            graph = _makeK5ColoringPuzzleGraph(Math.max(n, 5));
        }

        const minColors = chromaticNumber(graph, COLORING_PUZZLE_CONFIG.generationMaxChromatic);
        if (!minColors || minColors > COLORING_PUZZLE_CONFIG.generationMaxChromatic) continue;

        const plusOne = minColors + 1;
        const requested = plusOne === graph.n ? minColors : plusOne;
        const maxColorsAllowed = Math.min(COLORING_PUZZLE_CONFIG.promptMaxColors, requested);

        return { ...graph, minColors, maxColorsAllowed };
    }

    const fallback = _makeBipartiteColoringPuzzleGraph(6);
    return { ...fallback, minColors: 2, maxColorsAllowed: 3 };
}

function pickColoringCaseType() {
    return Math.random() < 0.5 ? 'freeform' : 'greedy';
}

function getColoringPaletteForCase(caseType, puzzle) {
    if (caseType === 'greedy') return COLORING_BASE.slice();
    const maxColors = Math.max(1, Math.min(COLORING_BASE.length, puzzle.maxColorsAllowed || 3));
    return COLORING_BASE.slice(0, maxColors);
}

function getGreedyVertexOrder(puzzle) {
    return Array.from({ length: puzzle.n }, (_, i) => vertexId(i));
}

function loadColoringStats() {
    try {
        const raw = localStorage.getItem('graph_coloring_stats');
        if (raw) {
            const s = JSON.parse(raw);
            modeStates.coloring.stats.total = s.total || 0;
            modeStates.coloring.stats.points = s.points || 0;
        }
    } catch (e) { /* ignore */ }
}

function saveColoringStats() {
    try { localStorage.setItem('graph_coloring_stats', JSON.stringify(modeStates.coloring.stats)); }
    catch (e) { /* ignore */ }
}

function updateColoringStatsDisplay() {
    const s = modeStates.coloring.stats;
    const pct = s.total === 0 ? 0 : Math.round((s.points / s.total) * 100);
    const el = id => document.getElementById(id);
    if (el('coloring-total')) el('coloring-total').textContent = s.total;
    if (el('coloring-points')) el('coloring-points').textContent = s.points.toFixed(1);
    if (el('coloring-accuracy')) el('coloring-accuracy').textContent = pct + '%';
}

function getColoringDisplayAlias(token, caseType) {
    const c = COLORING_BY_TOKEN[token];
    if (!c) return '';
    return caseType === 'greedy' ? c.greedyAlias : c.freeAlias;
}

function clearColoringDropdownHighlights() {
    const selects = document.querySelectorAll('#coloring-assignments select');
    selects.forEach(sel => {
        sel.style.outline = '';
        sel.style.borderColor = '';
        sel.style.boxShadow = '';
    });
}

function getIncompleteVertexIds(puzzle, selection) {
    const missing = [];
    for (let i = 0; i < puzzle.n; i++) {
        const vid = vertexId(i);
        const token = String(selection?.[vid] || '').trim().toLowerCase();
        if (!token) missing.push(vid);
    }
    return missing;
}

function highlightIncompleteDropdowns(missingVertexIds) {
    missingVertexIds.forEach(vid => {
        const i = vertexIndex(vid);
        const sel = document.getElementById(`coloring-select-${i}`);
        if (!sel) return;
        sel.style.outline = '2px solid #e67e22';
        sel.style.borderColor = '#e67e22';
        sel.style.boxShadow = '0 0 0 2px rgba(230, 126, 34, 0.2)';
    });
}

function renderColoringAssignments(puzzle) {
    const container = document.getElementById('coloring-assignments');
    if (!container) return;
    container.innerHTML = '';

    const caseType = modeStates.coloring.caseType || 'freeform';
    const allowed = getColoringPaletteForCase(caseType, puzzle);

    for (let i = 0; i < puzzle.n; i++) {
        const id = vertexId(i);
        const row = document.createElement('div');
        row.style.cssText = 'display:flex; align-items:center; gap:10px; margin:6px 0; flex-wrap:wrap;';

        const label = document.createElement('label');
        label.setAttribute('for', `coloring-select-${i}`);
        label.textContent = `Vertex ${puzzle.names[i]}`;
        label.style.cssText = 'min-width:90px; color:#333; font-size:15px;';

        const select = document.createElement('select');
        select.id = `coloring-select-${i}`;
        select.style.minWidth = '180px';

        const blank = document.createElement('option');
        blank.value = '';
        blank.textContent = 'Select color';
        select.appendChild(blank);

        allowed.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.token;
            opt.textContent = caseType === 'greedy' ? c.greedyAlias : c.name;
            select.appendChild(opt);
        });

        select.addEventListener('change', () => {
            modeStates.coloring.selection[id] = select.value;
            clearColoringDropdownHighlights();
            applyColoringSelectionToGraph();
        });

        row.appendChild(label);
        row.appendChild(select);
        container.appendChild(row);
    }
}

function applyColoringSelectionToGraph() {
    const puzzle = modeStates.coloring.currentPuzzle;
    const cy = getCy('coloring');
    if (!puzzle || !cy) return;

    const caseType = modeStates.coloring.caseType || 'freeform';

    for (let i = 0; i < puzzle.n; i++) {
        const id = vertexId(i);
        const node = cy.$id(id);
        if (!node) continue;

        const chosen = String(modeStates.coloring.selection[id] || '').trim().toLowerCase();
        const c = COLORING_BY_TOKEN[chosen];
        const baseLabel = String(puzzle.names[i] || (i + 1));
        const alias = c ? getColoringDisplayAlias(c.token, caseType) : '';
        const displayName = c ? `${baseLabel}: ${alias}` : baseLabel;

        node.data('displayName', displayName);
        node.data('labelLen', displayName.length);
        node.style('background-color', c ? c.css : '#fff');
        node.style('border-color', '#333');
    }
}

function resetColoringUI() {
    const show = id => { const el = document.getElementById(id); if (el) el.style.display = ''; };
    const hide = id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; };

    show('coloring-actions');
    hide('coloring-feedback');
    clearColoringDropdownHighlights();
    const nextBtn = document.getElementById('coloring-next-btn');
    if (nextBtn) nextBtn.style.display = '';
}

function showColoringFeedback({ correct, message, nextLabel, showNext = true, titleText, variant }) {
    const panel = document.getElementById('coloring-feedback');
    const titleEl = document.getElementById('coloring-feedback-title');
    const text = document.getElementById('coloring-feedback-text');
    const nextBtn = document.getElementById('coloring-next-btn');

    if (!panel) return;

    const styleVariant = variant || (correct ? 'correct' : 'incorrect');
    panel.className = styleVariant === 'neutral' ? 'training-feedback' : `training-feedback ${styleVariant}`;
    if (titleEl) titleEl.textContent = titleText || (correct ? 'Correct!' : 'Incorrect!');
    if (text) text.textContent = message;
    if (nextBtn) {
        nextBtn.style.display = showNext ? '' : 'none';
        if (showNext) nextBtn.textContent = nextLabel || (correct ? 'Next Question' : 'Try Again');
    }
    panel.style.display = '';
}

function startColoringTrial() {
    const puzzle = generateGraphColoringPuzzle();
    const caseType = pickColoringCaseType();
    const vertexOrder = caseType === 'greedy' ? getGreedyVertexOrder(puzzle) : [];

    modeStates.coloring.currentPuzzle = puzzle;
    modeStates.coloring.graph = puzzle;
    modeStates.coloring.selection = {};
    modeStates.coloring.caseType = caseType;
    modeStates.coloring.vertexOrder = vertexOrder;

    const cy = getCy('coloring');
    if (cy) draw_graph(puzzle, cy);
    updateGraphAria('coloring-graph-description', puzzle, true);

    const taskTitle = document.getElementById('coloring-task-title');
    const taskSubtitle = document.getElementById('coloring-task-subtitle');
    // const greedyRule = document.getElementById('coloring-greedy-rule');
    // const orderText = document.getElementById('coloring-order-text');
    const limitLabel = document.getElementById('coloring-limit-label');

    if (caseType === 'greedy') {
        if (taskTitle) taskTitle.textContent = COLORING_COPY.titles.greedy;
        if (taskSubtitle) {
            taskSubtitle.textContent = COLORING_COPY.subtitles.greedyChoices;
            taskSubtitle.style.display = '';
        }
        // if (greedyRule) {
        //     greedyRule.textContent = COLORING_COPY.subtitles.greedyRule;
        //     greedyRule.style.display = '';
        // }
        // if (orderText) {
        //     const names = vertexOrder.map(vid => puzzle.names[vertexIndex(vid)] || String(vertexIndex(vid) + 1));
        //     orderText.textContent = COLORING_COPY.subtitles.greedyOrder(names);
        //     orderText.style.display = '';
        // }
        if (limitLabel) limitLabel.style.display = 'none';
    } else {
        if (taskTitle) taskTitle.textContent = COLORING_COPY.titles.freeform(puzzle.maxColorsAllowed);
        if (taskSubtitle) taskSubtitle.style.display = 'none';
        // if (greedyRule) greedyRule.style.display = 'none';
        // if (orderText) orderText.style.display = 'none';
        if (limitLabel) limitLabel.style.display = '';
    }

    renderColoringAssignments(puzzle);
    applyColoringSelectionToGraph();
    resetColoringUI();
    updateColoringStatsDisplay();
}

function bindColoringControls() {
    const get = id => document.getElementById(id);

    const resetBtn = get('coloring-reset-btn');
    if (resetBtn && !resetBtn.dataset.bound) {
        resetBtn.dataset.bound = '1';
        resetBtn.onclick = () => {
            modeStates.coloring.stats = { total: 0, points: 0 };
            saveColoringStats();
            updateColoringStatsDisplay();
            startColoringTrial();
        };
    }

    const submitBtn = get('coloring-submit-btn');
    if (submitBtn && !submitBtn.dataset.bound) {
        submitBtn.dataset.bound = '1';
        submitBtn.onclick = () => {
            const puzzle = modeStates.coloring.currentPuzzle;
            const caseType = modeStates.coloring.caseType || 'freeform';
            if (!puzzle) return;

            clearColoringDropdownHighlights();

            let result;
            if (caseType === 'greedy') {
                const colorOrder = COLORING_BASE.map(c => c.token);
                result = validateGreedyColoring(puzzle, modeStates.coloring.vertexOrder, modeStates.coloring.selection, colorOrder);
            } else {
                const normalizedSelection = {};
                for (let i = 0; i < puzzle.n; i++) {
                    const vid = vertexId(i);
                    const token = String(modeStates.coloring.selection[vid] || '').trim().toLowerCase();
                    const base = COLORING_BY_TOKEN[token];
                    normalizedSelection[vid] = base ? base.name.toLowerCase() : '';
                }
                result = validateGraphColoring(puzzle, normalizedSelection, puzzle.minColors);
            }

            if (!result.ok && result.reason === 'incomplete') {
                const missing = getIncompleteVertexIds(puzzle, modeStates.coloring.selection);
                highlightIncompleteDropdowns(missing);
                return;
            }

            modeStates.coloring.stats.total += 1;

            if (result.ok) {
                modeStates.coloring.stats.points += 1;
                saveColoringStats();
                updateColoringStatsDisplay();

                let msg;
                if (caseType === 'greedy') {
                    msg = COLORING_COPY.feedback.successGreedy;
                } else {
                    msg = result.isMinimal
                        ? COLORING_COPY.feedback.successFreeformMinimal
                        : COLORING_COPY.feedback.successFreeform;
                }

                showColoringFeedback({
                    correct: true,
                    message: msg,
                    nextLabel: 'Next Question',
                });
            } else {
                if (caseType === 'greedy') {
                    const expected = COLORING_BY_TOKEN[result.expected || ''];
                    const expectedAlias = expected ? expected.greedyAlias : '?';
                    showColoringFeedback({
                        correct: false,
                        message: COLORING_COPY.feedback.failGreedy(result.vertexLabel, expectedAlias),
                        nextLabel: 'Try Again',
                    });
                } else if (result.reason === 'incomplete') {
                    const missing = getIncompleteVertexIds(puzzle, modeStates.coloring.selection);
                    highlightIncompleteDropdowns(missing);
                    return;
                } else {
                    const colorName = result.color
                        ? (result.color.charAt(0).toUpperCase() + result.color.slice(1))
                        : 'the same color';
                    showColoringFeedback({
                        correct: false,
                        message: COLORING_COPY.feedback.failConflict(result.v1, result.v2, colorName),
                        nextLabel: 'Try Again',
                    });
                }

                saveColoringStats();
                updateColoringStatsDisplay();
            }

            get('coloring-actions').style.display = 'none';
        };
    }

    const nextBtn = get('coloring-next-btn');
    if (nextBtn && !nextBtn.dataset.bound) {
        nextBtn.dataset.bound = '1';
        nextBtn.onclick = () => startColoringTrial();
    }
}

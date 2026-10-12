// ---------------------------------------------------------------------------
// Eulerian graphs Mode
// ---------------------------------------------------------------------------

// ---- Complexity heuristics ------------------------------------------------
// Applied to every puzzle graph to keep it legible regardless of vertex count.
//
//   1. Max degree of any vertex <= EULER_PUZZLE_MAX_DEG
//   2. For every vertex v, mean degree of closed neighbourhood
//      {v} U neighbors(v) <= EULER_PUZZLE_MAX_NBR_MEAN
//
// For directed graphs "degree" = in-degree + out-degree; "neighbour" means
// adjacent in either direction.

const EULER_PUZZLE_MAX_DEG = 5;
const EULER_PUZZLE_MAX_NBR_MEAN = 3.5;

/**
 * Return true when `edges` satisfies both puzzle complexity heuristics.
 * @param {Edge[]} edges
 * @param {number} n
 * @param {boolean} directed
 * @returns {boolean}
 */
function _puzzleComplexityOk(edges, n, directed) {
    const deg = new Array(n).fill(0);
    const adj = Array.from({ length: n }, () => new Set());

    for (const { source, target } of edges) {
        const s = vertexIndex(source);
        const t = vertexIndex(target);
        if (s === t) {
            if (!directed) deg[s] += 2;
            continue;
        }
        deg[s]++;
        deg[t]++;
        adj[s].add(t);
        adj[t].add(s);
    }

    for (let v = 0; v < n; v++) {
        if (deg[v] > EULER_PUZZLE_MAX_DEG) return false;
        const closed = [v, ...adj[v]];
        const mean = closed.reduce((sum, u) => sum + deg[u], 0) / closed.length;
        if (mean > EULER_PUZZLE_MAX_NBR_MEAN) return false;
    }
    return true;
}

/**
 * Pick a random target edge count appropriate for an undirected puzzle graph.
 * @param {number} n
 * @returns {number}
 */
function _puzzleEdgeTarget(n) {
    const lo = n;
    const hi = Math.min(Math.floor(1.8 * n), (n * (n - 1)) / 2);
    return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

/** @returns {object} graph */
function _makeEulerianDigraph(n) {
    for (let attempt = 0; attempt < 20; attempt++) {
        const g = generateEulerianDigraph(n);
        if (_puzzleComplexityOk(g.edges, n, true)) return g;
    }
    return generateEulerianDigraph(n);
}

/** @returns {object} graph */
function _makeNonEulerianDigraph(n) {
    for (let attempt = 0; attempt < 20; attempt++) {
        const g = generateEulerianDigraph(n);
        if (!_puzzleComplexityOk(g.edges, n, true)) continue;
        const candidates = shuffle(g.edges.slice());
        for (const cand of candidates) {
            const trial = g.edges.filter(e => e !== cand);
            if (isStronglyConnected({ ...g, edges: trial })) {
                return { ...g, edges: trial };
            }
        }
    }
    return _makeEulerianDigraph(n);
}

/** @returns {object} graph */
function _makeEulerianSimple(n) {
    for (let attempt = 0; attempt < 25; attempt++) {
        const g = generateEulerianSimpleGraph(n, _puzzleEdgeTarget(n));
        if (_puzzleComplexityOk(g.edges, n, false)) return g;
    }
    return generateEulerianSimpleGraph(n, n);
}

/** @returns {object} graph */
function _makeNonEulerianSimple(n) {
    for (let attempt = 0; attempt < 25; attempt++) {
        const g = generateEulerianSimpleGraph(n, _puzzleEdgeTarget(n));
        if (!_puzzleComplexityOk(g.edges, n, false)) continue;
        let edges = g.edges.slice();
        const numDelete = Math.random() < 0.5 ? 1 : 2;
        let deleted = 0;
        for (const cand of shuffle(edges.slice())) {
            if (deleted >= numDelete) break;
            const trial = edges.filter(e => e !== cand);
            if (isConnected({ ...g, edges: trial }) && getOddVertices({ ...g, edges: trial }).length > 0) {
                edges = trial;
                deleted++;
            }
        }
        if (deleted > 0) return { ...g, edges };
    }
    return _makeEulerianSimple(n);
}

/** @returns {object} graph */
function _makeEulerianMulti(n) {
    for (let attempt = 0; attempt < 25; attempt++) {
        const g = generateEulerianMultigraph(n, _puzzleEdgeTarget(n));
        if (_puzzleComplexityOk(g.edges, n, false)) return g;
    }
    return generateEulerianMultigraph(n, n);
}

/** @returns {object} graph */
function _makeNonEulerianMulti(n) {
    for (let attempt = 0; attempt < 25; attempt++) {
        const g = generateEulerianMultigraph(n, _puzzleEdgeTarget(n));
        if (!_puzzleComplexityOk(g.edges, n, false)) continue;
        let edges = g.edges.slice();
        const numDelete = Math.random() < 0.5 ? 1 : 2;
        let deleted = 0;
        for (const cand of shuffle(edges.slice())) {
            if (deleted >= numDelete) break;
            const trial = edges.filter(e => e !== cand);
            if (isConnected({ ...g, edges: trial }) && getOddVertices({ ...g, edges: trial }).length > 0) {
                edges = trial;
                deleted++;
            }
        }
        if (deleted > 0) return { ...g, edges };
    }
    return _makeEulerianMulti(n);
}

/**
 * Generate a random Eulerian graph puzzle.
 * @returns {object}
 */
function generateEulerianGraphPuzzle() {
    const n = Math.floor(Math.random() * 6) + 4;
    const scenario = Math.floor(Math.random() * 6);

    const makers = [
        _makeEulerianDigraph,
        _makeNonEulerianDigraph,
        _makeEulerianSimple,
        _makeNonEulerianSimple,
        _makeEulerianMulti,
        _makeNonEulerianMulti,
    ];
    const graph = makers[scenario](n);
    const isMulti = graph.edgeLabel === 'name';

    let isEulerian;
    if (graph.directed) {
        const { inDeg, outDeg } = getDirectedDegrees(graph);
        const balanced = inDeg.every((d, i) => d === outDeg[i]);
        isEulerian = balanced && isStronglyConnected(graph);
    } else {
        isEulerian = isConnected(graph) && getOddVertices(graph).length === 0;
    }

    return { ...graph, isEulerian, isMulti };
}

/**
 * Check whether a sequence of vertex display-names forms a valid Eulerian
 * circuit in a simple undirected graph.
 * @param {string[]} circuit
 * @param {object} graph
 * @param {boolean} requireCircuit
 * @returns {boolean}
 */
function validateEulerianCircuitSimple(circuit, graph, requireCircuit) {
    if (circuit.length < 2) return false;
    if (requireCircuit && circuit[0] !== circuit[circuit.length - 1]) return false;

    const pool = graph.edges.map(e => ({
        a: vertexLabel(e.source, graph.names),
        b: vertexLabel(e.target, graph.names),
        used: false,
    }));

    for (let step = 0; step < circuit.length - 1; step++) {
        const u = circuit[step], v = circuit[step + 1];
        const ei = pool.findIndex(e => !e.used && ((e.a === u && e.b === v) || (e.a === v && e.b === u)));
        if (ei === -1) return false;
        pool[ei].used = true;
    }
    return pool.every(e => e.used);
}

/**
 * Check whether an alternating vertex/edge-label string is a valid Eulerian
 * circuit in a multigraph, e.g. "AaBbCcA".
 * @param {string} input
 * @param {object} graph
 * @param {boolean} requireCircuit
 * @returns {boolean}
 */
function validateEulerianCircuitMulti(input, graph, requireCircuit) {
    const tokens = input.match(/[A-Z]|[a-z]/g);
    if (!tokens || tokens.length < 3) return false;
    for (let i = 0; i < tokens.length; i++) {
        if (i % 2 === 0 && !/[A-Z]/.test(tokens[i])) return false;
        if (i % 2 === 1 && !/[a-z]/.test(tokens[i])) return false;
    }
    if (tokens.length % 2 === 0) return false;
    if (requireCircuit && tokens[0] !== tokens[tokens.length - 1]) return false;

    const edgeUsed = new Array(graph.edges.length).fill(false);

    for (let i = 0; i < tokens.length - 2; i += 2) {
        const u = tokens[i], edgeLbl = tokens[i + 1], v = tokens[i + 2];
        const ei = graph.edges.findIndex((e, idx) =>
            !edgeUsed[idx] &&
            e.label === edgeLbl &&
            ((vertexLabel(e.source, graph.names) === u && vertexLabel(e.target, graph.names) === v) ||
             (vertexLabel(e.source, graph.names) === v && vertexLabel(e.target, graph.names) === u))
        );
        if (ei === -1) return false;
        edgeUsed[ei] = true;
    }
    return edgeUsed.every(Boolean);
}

/**
 * Check whether a sequence of vertex display-names is a valid Eulerian circuit
 * in a directed graph.
 * @param {string[]} circuit
 * @param {object} graph
 * @returns {boolean}
 */
function validateEulerianCircuitDigraph(circuit, graph) {
    if (circuit.length < 2) return false;
    if (circuit[0] !== circuit[circuit.length - 1]) return false;

    const pool = graph.edges.map(e => ({
        a: vertexLabel(e.source, graph.names),
        b: vertexLabel(e.target, graph.names),
        used: false,
    }));

    for (let step = 0; step < circuit.length - 1; step++) {
        const u = circuit[step], v = circuit[step + 1];
        const ei = pool.findIndex(e => !e.used && e.a === u && e.b === v);
        if (ei === -1) return false;
        pool[ei].used = true;
    }
    return pool.every(e => e.used);
}

/**
 * Validate whether adding a set of edges to a graph makes it Eulerian.
 * Added edges must duplicate existing edges (no new vertex relationships).
 * @param {object} graph
 * @param {Array<{from: string, to: string}>} addedEdges
 * @returns {{ ok: boolean, reason?: string, bad?: string[], oddVertices?: string[] }}
 */
function validateEulerization(graph, addedEdges) {
    const { names, directed, edges: origEdges } = graph;

    const origSet = new Set(origEdges.map(e => {
        const a = vertexLabel(e.source, names), b = vertexLabel(e.target, names);
        if (a === b) return null;
        return directed ? `${a}->${b}` : [a, b].sort().join('--');
    }).filter(Boolean));

    const combined = origEdges
        .map(e => ({ s: vertexLabel(e.source, names), t: vertexLabel(e.target, names) }))
        .filter(e => e.s !== e.t);

    const invalidVertices = [];
    const nonDuplicates = [];

    for (const ae of addedEdges) {
        if (!ae.from || !ae.to) continue;
        const from = ae.from.trim().toUpperCase();
        const to = ae.to.trim().toUpperCase();

        if (!names.includes(from) || !names.includes(to)) {
            invalidVertices.push(`${from}–${to}`);
            continue;
        }
        if (from === to) continue;

        const key = directed ? `${from}->${to}` : [from, to].sort().join('--');
        if (!origSet.has(key)) {
            nonDuplicates.push(directed ? `${from}→${to}` : `${from}–${to}`);
            continue;
        }
        combined.push({ s: from, t: to });
    }

    if (invalidVertices.length > 0) {
        return { ok: false, reason: 'invalid_vertices', bad: invalidVertices };
    }
    if (nonDuplicates.length > 0) {
        return { ok: false, reason: 'not_duplicate', bad: nonDuplicates };
    }

    if (directed) {
        const inDeg = Object.fromEntries(names.map(nm => [nm, 0]));
        const outDeg = Object.fromEntries(names.map(nm => [nm, 0]));
        for (const { s, t } of combined) { outDeg[s]++; inDeg[t]++; }
        const oddVertices = names.filter(nm => inDeg[nm] !== outDeg[nm]);
        if (oddVertices.length > 0) return { ok: false, reason: 'not_eulerian', oddVertices };
    } else {
        const deg = Object.fromEntries(names.map(nm => [nm, 0]));
        for (const { s, t } of combined) { deg[s]++; deg[t]++; }
        const oddVertices = names.filter(nm => deg[nm] % 2 !== 0);
        if (oddVertices.length > 0) return { ok: false, reason: 'not_eulerian', oddVertices };
    }

    return { ok: true };
}

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
            const oddCount = getOddVertices(puzzle).length;
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
                            const oddCount = getOddVertices(puzzle).length;
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
                const oddCount = getOddVertices(puzzle).length;
                valid = validateEulerianCircuitMulti(raw, puzzle, oddCount === 0);
            } else if (puzzle.directed) {
                const circuit = raw.toUpperCase().split('').filter(c => /[A-Z]/.test(c));
                valid = validateEulerianCircuitDigraph(circuit, puzzle);
            } else {
                const circuit = raw.toUpperCase().split('').filter(c => /[A-Z]/.test(c));
                const oddCount = getOddVertices(puzzle).length;
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

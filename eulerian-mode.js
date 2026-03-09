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

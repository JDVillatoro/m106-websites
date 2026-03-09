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
                        showIsoPart1Feedback({
                            isCorrect: true,
                            message: 'Correct! These two graphs are equal.'
                        });
                    } else if (puzzle.scenario === 'neither') {
                        get('iso-part2-reason').style.display = '';
                        get('iso-reason-submit-btn').style.display = '';
                    } else if (puzzle.scenario === 'isomorphic') {
                        get('iso-part2-mapping').style.display = '';
                        get('iso-mapping-submit-btn').style.display = '';
                    }

                } else {
                    btn.classList.add('selected-wrong');
                    const actual = puzzle.scenario === 'equal'       ? 'equal (they have the same labels and relationships)'
                                 : puzzle.scenario === 'isomorphic'  ? 'isomorphic (there is a way of relabeling that makes them equal)'
                                 : 'neither equal nor isomorphic';
                    showIsoPart1Feedback({
                        isCorrect: false,
                        message: `These graphs are actually ${actual}.`
                    });
                    get('iso-part1').style.display = 'none';
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
                    `A correct answer could be: <strong>${witnessStr}</strong>.`;
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

function showIsoPart1Feedback({ isCorrect, message }) {
    const panel = document.getElementById('iso-part1-wrong');
    const title = panel ? panel.querySelector('h2') : null;
    const text  = document.getElementById('iso-part1-wrong-text');
    const btn   = document.getElementById('iso-next-from-wrong');
    if (!panel) return;
    panel.className = `training-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    if (title) title.textContent = isCorrect ? 'Correct' : 'Incorrect';
    if (text) text.textContent = message;
    if (btn)  btn.textContent = 'Next Question';
    panel.style.display = '';
}

// =============================================================================
// Planar Graphs Mode
// =============================================================================

let planarNonPlanarChoice = null;

const PLANAR_MODE_CONFIG = {
    nMin: 6,
    nMax: 8,
    planarExtraEdgeFactorMin: 1.14,
    planarExtraEdgeFactorMax: 1.55,
    nonPlanarExtraEdgeSlackMax: 2,
};

function _planarRandInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function loadPlanarStats() {
    try {
        const raw = localStorage.getItem('graph_planar_stats');
        if (raw) {
            const s = JSON.parse(raw);
            modeStates.planar.stats.total = s.total || 0;
            modeStates.planar.stats.points = s.points || 0;
        }
    } catch (e) { /* ignore */ }
}

function savePlanarStats() {
    try { localStorage.setItem('graph_planar_stats', JSON.stringify(modeStates.planar.stats)); }
    catch (e) { /* ignore */ }
}

function updatePlanarStatsDisplay() {
    const s = modeStates.planar.stats;
    const pct = s.total === 0 ? 0 : Math.round((s.points / s.total) * 100);
    const el = id => document.getElementById(id);
    if (el('planar-total')) el('planar-total').textContent = s.total;
    if (el('planar-points')) el('planar-points').textContent = s.points.toFixed(1);
    if (el('planar-accuracy')) el('planar-accuracy').textContent = pct + '%';
}

function resetPlanarUI() {
    const show = id => { const el = document.getElementById(id); if (el) el.style.display = ''; };
    const hide = id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; };
    const get = id => document.getElementById(id);

    show('planar-part1');
    ['planar-part2-planar', 'planar-part2-nonplanar', 'planar-feedback'].forEach(hide);

    ['planar-yes-btn', 'planar-no-btn', 'planar-k5-btn', 'planar-k33-btn'].forEach(id => {
        const btn = get(id);
        if (!btn) return;
        btn.disabled = false;
        btn.classList.remove('selected-correct', 'selected-wrong', 'selected');
    });

    ['planar-vertices-input', 'planar-edges-input', 'planar-faces-input'].forEach(id => {
        const input = get(id);
        if (input) input.value = '';
    });

    const submitPlanar = get('planar-planar-submit-btn');
    if (submitPlanar) submitPlanar.style.display = '';

    planarNonPlanarChoice = null;
}

function showPlanarFeedback({ correct, message, nextLabel }) {
    const panel = document.getElementById('planar-feedback');
    const title = document.getElementById('planar-feedback-title');
    const text = document.getElementById('planar-feedback-text');
    const nextBtn = document.getElementById('planar-next-btn');

    if (!panel) return;

    panel.className = `training-feedback ${correct ? 'correct' : 'incorrect'}`;
    if (title) title.textContent = correct ? 'Correct!' : 'Incorrect!';
    if (text) text.textContent = message;
    if (nextBtn) nextBtn.textContent = nextLabel || (correct ? 'Next Question' : 'Try Again');
    panel.style.display = '';
}

function startPlanarTrial() {
    const n = _planarRandInt(PLANAR_MODE_CONFIG.nMin, PLANAR_MODE_CONFIG.nMax);
    const shouldBePlanar = Math.random() < 0.5;

    let graph;
    let obstruction = null;

    if (shouldBePlanar) {
        graph = generatePlanarGraph(
            n,
            PLANAR_MODE_CONFIG.planarExtraEdgeFactorMin,
            PLANAR_MODE_CONFIG.planarExtraEdgeFactorMax,
        );
    } else {
        obstruction = (n >= 6 && Math.random() < 0.5) ? 'K3,3' : 'K5';
        graph = generateNonPlanarGraph(n, obstruction, PLANAR_MODE_CONFIG.nonPlanarExtraEdgeSlackMax);
    }

    const puzzle = { ...graph, isPlanar: shouldBePlanar, obstruction };

    modeStates.planar.currentPuzzle = puzzle;
    modeStates.planar.graph = puzzle;
    modeStates.planar.part1Scored = false;
    modeStates.planar.part2Scored = false;

    const cy = getCy('planar');
    if (cy) {
        const order = shuffle(Array.from({ length: puzzle.n }, (_, i) => i));
        drawGraphCircle(puzzle, cy, order);
    }
    updateGraphAria('planar-graph-description', puzzle, true);

    resetPlanarUI();
    updatePlanarStatsDisplay();
}

function bindPlanarControls() {
    const get = id => document.getElementById(id);

    const resetBtn = get('planar-reset-btn');
    if (resetBtn && !resetBtn.dataset.bound) {
        resetBtn.dataset.bound = '1';
        resetBtn.onclick = () => {
            modeStates.planar.stats = { total: 0, points: 0 };
            savePlanarStats();
            updatePlanarStatsDisplay();
            startPlanarTrial();
        };
    }

    ['planar-yes-btn', 'planar-no-btn'].forEach(btnId => {
        const btn = get(btnId);
        if (btn && !btn.dataset.bound) {
            btn.dataset.bound = '1';
            btn.onclick = () => {
                const puzzle = modeStates.planar.currentPuzzle;
                if (!puzzle) return;

                const userSaysPlanar = btnId === 'planar-yes-btn';
                const correct = userSaysPlanar === puzzle.isPlanar;

                ['planar-yes-btn', 'planar-no-btn'].forEach(id => {
                    const b = get(id);
                    if (b) b.disabled = true;
                });

                modeStates.planar.stats.total += 1;

                if (!correct) {
                    btn.classList.add('selected-wrong');
                    savePlanarStats();
                    updatePlanarStatsDisplay();
                    get('planar-part1').style.display = 'none';
                    showPlanarFeedback({
                        correct: false,
                        message: `Actually this graph is ${puzzle.isPlanar ? 'planar' : 'not planar'}.`,
                        nextLabel: 'Try Again',
                    });
                    return;
                }

                modeStates.planar.stats.points += 0.5;
                modeStates.planar.part1Scored = true;
                btn.classList.add('selected-correct');
                savePlanarStats();
                updatePlanarStatsDisplay();

                get('planar-part1').style.display = 'none';
                if (puzzle.isPlanar) {
                    const panel = get('planar-part2-planar');
                    if (panel) panel.style.display = '';
                } else {
                    const panel = get('planar-part2-nonplanar');
                    if (panel) panel.style.display = '';
                }
            };
        }
    });

    const planarSubmitBtn = get('planar-planar-submit-btn');
    if (planarSubmitBtn && !planarSubmitBtn.dataset.bound) {
        planarSubmitBtn.dataset.bound = '1';
        planarSubmitBtn.onclick = () => {
            const puzzle = modeStates.planar.currentPuzzle;
            if (!puzzle || !puzzle.isPlanar || !puzzle.planarCounts) return;

            const v = Number(get('planar-vertices-input')?.value);
            const e = Number(get('planar-edges-input')?.value);
            const f = Number(get('planar-faces-input')?.value);

            const expectedV = vertexCount(puzzle);
            const expectedE = edgeCount(puzzle);
            const expectedF = faceCount(puzzle);
            const correct = (v === expectedV && e === expectedE && f === expectedF);

            get('planar-part2-planar').style.display = 'none';
            planarSubmitBtn.style.display = 'none';

            if (correct) {
                if (!modeStates.planar.part2Scored) {
                    modeStates.planar.stats.points += 0.5;
                    modeStates.planar.part2Scored = true;
                    savePlanarStats();
                    updatePlanarStatsDisplay();
                }
                showPlanarFeedback({
                    correct: true,
                    message: "That's the correct number of vertices, edges, and faces.",
                    nextLabel: 'Next Question',
                });
            } else {
                showPlanarFeedback({
                    correct: false,
                    message: `The graph has ${expectedV} vertices, ${expectedE} edges, and ${expectedF} faces.`,
                    nextLabel: 'Try Again',
                });
            }
        };
    }

    ['planar-k5-btn', 'planar-k33-btn'].forEach(btnId => {
        const btn = get(btnId);
        if (btn && !btn.dataset.bound) {
            btn.dataset.bound = '1';
            btn.onclick = () => {
                planarNonPlanarChoice = (btnId === 'planar-k5-btn') ? 'K5' : 'K3,3';
                const puzzle = modeStates.planar.currentPuzzle;
                if (!puzzle || puzzle.isPlanar) return;

                const correct = planarNonPlanarChoice === puzzle.obstruction;

                ['planar-k5-btn', 'planar-k33-btn'].forEach(id => {
                    const b = get(id);
                    if (b) {
                        b.disabled = true;
                        b.classList.remove('selected');
                    }
                });

                btn.classList.add(correct ? 'selected-correct' : 'selected-wrong');

                get('planar-part2-nonplanar').style.display = 'none';

                if (correct) {
                    if (!modeStates.planar.part2Scored) {
                        modeStates.planar.stats.points += 0.5;
                        modeStates.planar.part2Scored = true;
                        savePlanarStats();
                        updatePlanarStatsDisplay();
                    }
                    showPlanarFeedback({
                        correct: true,
                        message: `This graph contains a ${puzzle.obstruction} subgraph.`,
                        nextLabel: 'Next Question',
                    });
                } else {
                    showPlanarFeedback({
                        correct: false,
                        message: `This graph contains a ${puzzle.obstruction} subgraph.`,
                        nextLabel: 'Try Again',
                    });
                }
            };
        }
    });

    const nextBtn = get('planar-next-btn');
    if (nextBtn && !nextBtn.dataset.bound) {
        nextBtn.dataset.bound = '1';
        nextBtn.onclick = () => startPlanarTrial();
    }
}

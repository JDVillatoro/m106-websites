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

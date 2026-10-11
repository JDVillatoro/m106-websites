// =============================================================================
// Hamiltonian Graphs Mode
// =============================================================================

const HAM_COPY = {
    promptTitle:             'Here is a graph...',
    promptSubtitle:          'Can you tell if it\'s a Hamiltonian graph?',
    part1Title:              'Part 1 — Is this graph Hamiltonian?',
    part2TitleFreeform:      'Part 2 — Find a Hamiltonian cycle',
    part2TitleNN:            'Part 2 — Nearest Neighbor strategy',
    part2TitleSE:            'Part 2 — Sorted Edge strategy',
    part2TitleNonHam:        'Part 2 — Why is it not Hamiltonian?',
    feedbackCorrect:         'Correct!',
    feedbackIncorrect:       'Incorrect.',
    feedbackPart1WrongHam:   'Actually, this graph is Hamiltonian.',
    feedbackPart1WrongNot:   'Actually, this graph is not Hamiltonian.',
    hint:                    'Hint: Try clicking and dragging the vertices to get a better look.',
};

// ─── Stats management ──────────────────────────────────────────────────────

function loadHamiltonianStats() {
    try {
        const raw = localStorage.getItem('graph_hamiltonian_stats');
        if (raw) {
            const s = JSON.parse(raw);
            modeStates.hamiltonian.stats.total  = s.total  || 0;
            modeStates.hamiltonian.stats.points = s.points || 0;
        }
    } catch (e) { /* ignore */ }
}

function saveHamiltonianStats() {
    try {
        localStorage.setItem('graph_hamiltonian_stats', JSON.stringify(modeStates.hamiltonian.stats));
    } catch (e) { /* ignore */ }
}

function updateHamiltonianStatsDisplay() {
    const s   = modeStates.hamiltonian.stats;
    const pct = s.total === 0 ? 0 : Math.round((s.points / s.total) * 100);
    const el  = id => document.getElementById(id);
    if (el('ham-total'))    el('ham-total').textContent    = s.total;
    if (el('ham-points'))   el('ham-points').textContent   = s.points.toFixed(1);
    if (el('ham-accuracy')) el('ham-accuracy').textContent = pct + '%';
}

// ─── UI helpers ────────────────────────────────────────────────────────────

function _hamShow(id) { const el = document.getElementById(id); if (el) el.style.display = ''; }
function _hamHide(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
function _hamGet(id)  { return document.getElementById(id); }

function _hamSetText(id, html) {
    const el = _hamGet(id);
    if (el) el.innerHTML = html;
}

// ─── Reset UI to initial state ────────────────────────────────────────────

function resetHamiltonianUI() {
    _hamShow('ham-part1');
    _hamHide('ham-part1-feedback');
    _hamHide('ham-part2-freeform');
    _hamHide('ham-part2-nn');
    _hamHide('ham-part2-se');
    _hamHide('ham-part2-nonham');
    _hamHide('ham-part2-freeform-feedback');
    _hamHide('ham-part2-nn-feedback');
    _hamHide('ham-part2-se-feedback');
    _hamHide('ham-part2-nonham-feedback');

    // Reset buttons
    ['ham-ham-btn', 'ham-notham-btn'].forEach(id => {
        const btn = _hamGet(id);
        if (btn) { btn.classList.remove('selected-correct', 'selected-wrong'); btn.disabled = false; }
    });
    ['ham-leaf-btn', 'ham-cutvertex-btn', 'ham-bipartite-btn'].forEach(id => {
        const btn = _hamGet(id);
        if (btn) { btn.disabled = false; btn.classList.remove('selected-correct', 'selected-wrong'); }
    });

    // Reset text inputs
    ['ham-freeform-input', 'ham-nn-input', 'ham-se-input'].forEach(id => {
        const inp = _hamGet(id);
        if (inp) { inp.value = ''; inp.disabled = false; }
    });

    // Reset submit buttons visibility
    ['ham-freeform-submit-btn', 'ham-nn-submit-btn', 'ham-se-submit-btn'].forEach(id => {
        const btn = _hamGet(id);
        if (btn) btn.style.display = '';
    });
}

// ─── Draw/redraw graph ────────────────────────────────────────────────────

/**
 * Draw the puzzle graph, optionally hiding edge weights.
 * @param {object} puzzle
 * @param {boolean} showWeights
 */
function _hamDrawGraph(puzzle, showWeights) {
    const cy = getCy('hamiltonian');
    if (!cy || !puzzle) return;

    if (!showWeights) {
        // Draw without labels
        const stripped = {
            ...puzzle,
            edgeLabel: null,
            edges: puzzle.edges.map(e => ({ ...e, label: null })),
        };
        draw_graph(stripped, cy);
    } else {
        draw_graph(puzzle, cy);
    }
    updateGraphAria('ham-graph-description', puzzle, true);
}

// ─── Start a new trial ────────────────────────────────────────────────────

function startHamiltonianTrial() {
    const puzzle = generateHamiltonianPuzzle();
    modeStates.hamiltonian.currentPuzzle = puzzle;
    modeStates.hamiltonian.part1Scored   = false;
    modeStates.hamiltonian.part2Scored   = false;

    resetHamiltonianUI();
    _hamDrawGraph(puzzle, false);   // always hide weights initially
    updateHamiltonianStatsDisplay();
}

// ─── Part 1: Is it Hamiltonian? ──────────────────────────────────────────

function _hamHandlePart1(userSaysHam) {
    const puzzle = modeStates.hamiltonian.currentPuzzle;
    if (!puzzle || modeStates.hamiltonian.part1Scored) return;

    const correct = userSaysHam === puzzle.isHamiltonian;
    modeStates.hamiltonian.part1Scored = true;
    modeStates.hamiltonian.stats.total += 1;

    if (correct) {
        modeStates.hamiltonian.stats.points += 0.5;
        saveHamiltonianStats();
        updateHamiltonianStatsDisplay();

        // Disable part1 buttons visually
        const hamBtn    = _hamGet('ham-ham-btn');
        const notHamBtn = _hamGet('ham-notham-btn');
        if (hamBtn)    { hamBtn.disabled = true;    if (userSaysHam)  hamBtn.classList.add('selected-correct'); }
        if (notHamBtn) { notHamBtn.disabled = true; if (!userSaysHam) notHamBtn.classList.add('selected-correct'); }

        // Show Part 2
        _hamShowPart2(puzzle);
    } else {
        // Incorrect part1
        saveHamiltonianStats();
        updateHamiltonianStatsDisplay();

        const msg = puzzle.isHamiltonian ? HAM_COPY.feedbackPart1WrongHam : HAM_COPY.feedbackPart1WrongNot;
        _hamSetText('ham-part1-feedback-text', `<strong>Incorrect!</strong> ${msg}`);
        _hamShow('ham-part1-feedback');

        const hamBtn    = _hamGet('ham-ham-btn');
        const notHamBtn = _hamGet('ham-notham-btn');
        if (hamBtn)    { hamBtn.disabled = true;    if (userSaysHam)  hamBtn.classList.add('selected-wrong'); }
        if (notHamBtn) { notHamBtn.disabled = true; if (!userSaysHam) notHamBtn.classList.add('selected-wrong'); }
    }
}

// ─── Show Part 2 based on puzzle type ────────────────────────────────────

function _hamShowPart2(puzzle) {
    _hamHide('ham-part1');
    if (puzzle.isHamiltonian) {
        // Reveal weights now for NN / sorted_edge
        if (puzzle.showWeights) _hamDrawGraph(puzzle, true);

        if (puzzle.strategy === 'freeform') {
            const instr = 'Specify a Hamiltonian cycle by listing the vertices in order (e.g. <em>A B C D</em> or <em>ABCDA</em>).';
            _hamSetText('ham-freeform-instr', instr);
            _hamShow('ham-part2-freeform');
        } else if (puzzle.strategy === 'nearest_neighbor') {
            const startName = puzzle.names[puzzle.startVertex];
            const instr     = `Find a Hamiltonian cycle using the Nearest Neighbor strategy. Start at vertex <strong>${startName}</strong> and use the displayed weights to determine the nearest neighbor at each step.`;
            _hamSetText('ham-nn-instr', instr);
            _hamShow('ham-part2-nn');
        } else if (puzzle.strategy === 'sorted_edge') {
            const instr = 'Find a Hamiltonian cycle using the Sorted Edge strategy. Use the displayed weights to determine the order in which to consider the edges.';
            _hamSetText('ham-se-instr', instr);
            _hamShow('ham-part2-se');
        }
    } else {
        _hamShow('ham-part2-nonham');
    }
}

// ─── Part 2: Hamiltonian case — Freeform ─────────────────────────────────

function _hamSubmitFreeform() {
    const puzzle = modeStates.hamiltonian.currentPuzzle;
    if (!puzzle || modeStates.hamiltonian.part2Scored) return;

    const inp = _hamGet('ham-freeform-input');
    if (!inp) return;
    const input = inp.value.trim();

    const result = validateHamiltonianCycleFreeform(input, puzzle);
    _hamHandlePart2Result(result, 'ham-part2-freeform-feedback', 'ham-part2-freeform-feedback-text',
        'ham-freeform-try-btn', 'ham-freeform-next-btn', 'ham-freeform-submit-btn',
        _hamFreeformErrorMsg);
}

function _hamFreeformErrorMsg(result) {
    switch (result.reason) {
        case 'not_a_valid_path':   return 'That\'s not a valid path.';
        case 'missing_vertex':     return `It doesn\'t visit vertex <strong>${result.detail}</strong>.`;
        case 'repeated_vertex':    return `It visits vertex <strong>${result.detail}</strong> more than once.`;
        case 'no_edge':            return `There is no edge between <strong>${result.detail}</strong>.`;
        default:                   return 'That\'s not a valid Hamiltonian cycle.';
    }
}

// ─── Part 2: Hamiltonian case — Nearest Neighbor ─────────────────────────

function _hamSubmitNN() {
    const puzzle = modeStates.hamiltonian.currentPuzzle;
    if (!puzzle || modeStates.hamiltonian.part2Scored) return;

    const inp = _hamGet('ham-nn-input');
    if (!inp) return;
    const input = inp.value.trim();

    const result = validateHamiltonianCycleNN(input, puzzle);
    _hamHandlePart2Result(result, 'ham-part2-nn-feedback', 'ham-part2-nn-feedback-text',
        'ham-nn-try-btn', 'ham-nn-next-btn', 'ham-nn-submit-btn',
        _hamNNErrorMsg);
}

function _hamNNErrorMsg(result) {
    switch (result.reason) {
        case 'not_a_valid_path':  return 'That\'s not a valid path.';
        case 'wrong_start':       return `It doesn\'t start at the correct vertex (<strong>${result.detail}</strong>).`;
        case 'incomplete_cycle':  return 'You didn\'t complete the cycle.';
        case 'repeated_vertex':   return `It visits vertex <strong>${result.detail}</strong> more than once.`;
        case 'no_edge':           return `There is no edge between <strong>${result.detail}</strong>.`;
        case 'wrong_nn_step':     return `Incorrect step: <em>${result.detail}</em>.`;
        case 'cant_close_cycle':  return 'The last vertex cannot connect back to the start.';
        default:                  return 'That\'s not the Hamiltonian cycle obtained by the nearest neighbor strategy.';
    }
}

// ─── Part 2: Hamiltonian case — Sorted Edge ──────────────────────────────

function _hamSubmitSE() {
    const puzzle = modeStates.hamiltonian.currentPuzzle;
    if (!puzzle || modeStates.hamiltonian.part2Scored) return;

    const inp = _hamGet('ham-se-input');
    if (!inp) return;
    const input = inp.value.trim();

    const result = validateHamiltonianCycleSE(input, puzzle);
    _hamHandlePart2Result(result, 'ham-part2-se-feedback', 'ham-part2-se-feedback-text',
        'ham-se-try-btn', 'ham-se-next-btn', 'ham-se-submit-btn',
        _hamSEErrorMsg);
}

function _hamSEErrorMsg(result) {
    switch (result.reason) {
        case 'not_a_valid_path':     return 'That\'s not a valid path.';
        case 'missing_vertex':       return `It doesn\'t visit vertex <strong>${result.detail}</strong>.`;
        case 'repeated_vertex':      return `It visits vertex <strong>${result.detail}</strong> more than once.`;
        case 'no_edge':              return `There is no edge between <strong>${result.detail}</strong>.`;
        case 'wrong_edge_missing':   return `The sorted edge strategy should have included edge <strong>${result.detail}</strong>.`;
        case 'wrong_edge_extra':     return `The sorted edge strategy does not include edge <strong>${result.detail}</strong>.`;
        default:                     return 'That\'s not the Hamiltonian cycle obtained by the sorted edge strategy.';
    }
}

// ─── Shared part-2 result handler ────────────────────────────────────────

function _hamHandlePart2Result(result, feedbackId, textId, tryBtnId, nextBtnId, submitBtnId, errMsgFn) {
    const puzzle = modeStates.hamiltonian.currentPuzzle;
    const feedbackEl = _hamGet(feedbackId);
    const textEl     = _hamGet(textId);
    const tryBtn     = _hamGet(tryBtnId);
    const nextBtn    = _hamGet(nextBtnId);
    const submitBtn  = _hamGet(submitBtnId);

    if (!feedbackEl) return;

    if (result.valid) {
        modeStates.hamiltonian.part2Scored   = true;
        modeStates.hamiltonian.stats.points += 0.5;
        saveHamiltonianStats();
        updateHamiltonianStatsDisplay();

        if (textEl) textEl.innerHTML = '<strong>Correct!</strong> Well done.';
        feedbackEl.className = 'training-feedback correct';
        feedbackEl.style.display = '';
        if (submitBtn) submitBtn.style.display = 'none';
        if (tryBtn)    tryBtn.style.display    = 'none';
        if (nextBtn)   nextBtn.style.display   = '';
    } else {
        if (textEl) textEl.innerHTML = `<strong>Sorry, that\'s not right.</strong> ${errMsgFn(result)}`;
        feedbackEl.className = 'training-feedback incorrect';
        feedbackEl.style.display = '';
        if (tryBtn)    tryBtn.style.display    = '';
        if (nextBtn)   nextBtn.style.display   = 'none';
    }
}

// ─── Part 2: Non-Hamiltonian reason ──────────────────────────────────────

function _hamSubmitReason(reason) {
    const puzzle = modeStates.hamiltonian.currentPuzzle;
    if (!puzzle || modeStates.hamiltonian.part2Scored) return;

    const valid = puzzle.nonHamiltonianReasons.includes(reason);
    const feedbackEl = _hamGet('ham-part2-nonham-feedback');
    const textEl     = _hamGet('ham-part2-nonham-feedback-text');
    const tryBtn     = _hamGet('ham-nonham-try-btn');
    const nextBtn    = _hamGet('ham-nonham-next-btn');

    // Disable the buttons
    ['ham-leaf-btn', 'ham-cutvertex-btn', 'ham-bipartite-btn'].forEach(id => {
        const btn = _hamGet(id);
        if (btn) btn.disabled = true;
    });
    const chosenBtn = _hamGet(
        reason === 'leaf' ? 'ham-leaf-btn' :
        reason === 'cut_vertex' ? 'ham-cutvertex-btn' : 'ham-bipartite-btn'
    );

    if (valid) {
        modeStates.hamiltonian.part2Scored   = true;
        modeStates.hamiltonian.stats.points += 0.5;
        saveHamiltonianStats();
        updateHamiltonianStatsDisplay();

        if (chosenBtn) chosenBtn.classList.add('selected-correct');
        if (textEl) textEl.innerHTML = '<strong>Correct!</strong> ' + _hamReasonDescription(reason, puzzle);
        if (feedbackEl) { feedbackEl.className = 'training-feedback correct'; feedbackEl.style.display = ''; }
        if (tryBtn)  tryBtn.style.display  = 'none';
        if (nextBtn) nextBtn.style.display = '';
    } else {
        if (chosenBtn) chosenBtn.classList.add('selected-wrong');
        const correctReasons = puzzle.nonHamiltonianReasons.map(_hamReasonLabel).join(', ');
        if (textEl) textEl.innerHTML = `<strong>Incorrect.</strong> The graph is not Hamiltonian because: ${correctReasons}.`;
        if (feedbackEl) { feedbackEl.className = 'training-feedback incorrect'; feedbackEl.style.display = ''; }
        if (tryBtn) tryBtn.style.display = '';
        if (nextBtn) nextBtn.style.display = 'none';
    }
}

function _hamReasonLabel(reason) {
    if (reason === 'leaf')             return 'it contains a leaf';
    if (reason === 'cut_vertex')       return 'it contains a cut vertex';
    if (reason === 'bipartite_unequal') return 'it is bipartite with non-equal partition sizes';
    return reason;
}

function _hamReasonDescription(reason, puzzle) {
    if (reason === 'leaf')             return 'A Hamiltonian cycle requires every vertex to have degree ≥ 2, but this graph has a leaf (a vertex of degree 1).';
    if (reason === 'cut_vertex')       return 'A Hamiltonian cycle cannot pass through a cut vertex in a way that traverses all components.';
    if (reason === 'bipartite_unequal') return 'A Hamiltonian cycle in a bipartite graph must alternate between the two parts, so the parts must be equal in size.';
    return '';
}

// ─── Bind event listeners (once) ─────────────────────────────────────────

function bindHamiltonianControls() {
    const on = (id, fn) => {
        const el = _hamGet(id);
        if (el && !el.dataset.bound) { el.dataset.bound = '1'; el.onclick = fn; }
    };

    // Reset
    on('ham-reset-btn', () => {
        modeStates.hamiltonian.stats.total  = 0;
        modeStates.hamiltonian.stats.points = 0;
        saveHamiltonianStats();
        updateHamiltonianStatsDisplay();
        startHamiltonianTrial();
    });

    // Part 1
    on('ham-ham-btn',    () => _hamHandlePart1(true));
    on('ham-notham-btn', () => _hamHandlePart1(false));

    // Part 1 wrong → next
    on('ham-part1-next-btn', () => startHamiltonianTrial());

    // Part 2 freeform
    on('ham-freeform-submit-btn', _hamSubmitFreeform);
    on('ham-freeform-try-btn',    () => {
        _hamHide('ham-part2-freeform-feedback');
        const inp = _hamGet('ham-freeform-input');
        if (inp) { inp.disabled = false; inp.focus(); }
    });
    on('ham-freeform-next-btn', () => startHamiltonianTrial());

    // Allow Enter key on freeform input
    const ffInp = _hamGet('ham-freeform-input');
    if (ffInp && !ffInp.dataset.bound) {
        ffInp.dataset.bound = '1';
        ffInp.addEventListener('keydown', e => { if (e.key === 'Enter') _hamSubmitFreeform(); });
    }

    // Part 2 NN
    on('ham-nn-submit-btn', _hamSubmitNN);
    on('ham-nn-try-btn',    () => {
        _hamHide('ham-part2-nn-feedback');
        const inp = _hamGet('ham-nn-input');
        if (inp) { inp.disabled = false; inp.focus(); }
    });
    on('ham-nn-next-btn', () => startHamiltonianTrial());

    const nnInp = _hamGet('ham-nn-input');
    if (nnInp && !nnInp.dataset.bound) {
        nnInp.dataset.bound = '1';
        nnInp.addEventListener('keydown', e => { if (e.key === 'Enter') _hamSubmitNN(); });
    }

    // Part 2 SE
    on('ham-se-submit-btn', _hamSubmitSE);
    on('ham-se-try-btn',    () => {
        _hamHide('ham-part2-se-feedback');
        const inp = _hamGet('ham-se-input');
        if (inp) { inp.disabled = false; inp.focus(); }
    });
    on('ham-se-next-btn', () => startHamiltonianTrial());

    const seInp = _hamGet('ham-se-input');
    if (seInp && !seInp.dataset.bound) {
        seInp.dataset.bound = '1';
        seInp.addEventListener('keydown', e => { if (e.key === 'Enter') _hamSubmitSE(); });
    }

    // Part 2 non-Hamiltonian reasons
    on('ham-leaf-btn',      () => _hamSubmitReason('leaf'));
    on('ham-cutvertex-btn', () => _hamSubmitReason('cut_vertex'));
    on('ham-bipartite-btn', () => _hamSubmitReason('bipartite_unequal'));

    on('ham-nonham-try-btn',  () => {
        _hamHide('ham-part2-nonham-feedback');
        ['ham-leaf-btn', 'ham-cutvertex-btn', 'ham-bipartite-btn'].forEach(id => {
            const btn = _hamGet(id);
            if (btn) {
                btn.disabled = false;
                btn.classList.remove('selected-correct', 'selected-wrong');
            }
        });
        modeStates.hamiltonian.part2Scored = false;
    });
    on('ham-nonham-next-btn', () => startHamiltonianTrial());
}

// =============================================================================
// Applications Mode
// =============================================================================

const APPLICATIONS_COPY = {
    scheduling: {
        prompt: 'Can you find the optimal schedule?',
        intro: org => `${org} needs to figure out how to schedule meetings.`,
        details: 'The organization has the following committees and members:',
        instructions: 'Try to schedule the meetings in as few time slots as possible. Remember that committee members can only be in one place at once!',
        selectLabel: 'Time Slot',
        feedbackOptimal: n => `Great job! You found the optimal schedule using ${n} time slots.`,
        feedbackClose: n => `That schedule works but you can do better! You can schedule the meetings in ${n} time slots.`,
        feedbackFar: (n, m) => `That schedule works but you can do much better! You can schedule the meetings in ${n} time slots and you used ${m} time slots.`,
        feedbackConflict: (member, a, b) => member
            ? `That schedule doesn't work because ${member} is scheduled for both ${a} and ${b} at the same time.`
            : `That schedule doesn't work because ${a} and ${b} are scheduled at the same time and share a committee member.`,
    },
    interference: {
        prompt: 'Can you find the optimal frequency assignment?',
        intro: org => `${org} needs to assign frequencies to radio stations.`,
        details: d => `After some testing, they have determined that there is unacceptable interference when two stations share frequencies and are within ${d.toFixed(2)} miles of each other.`,
        instructions: d => `Try to assign the frequencies using as few as possible. Remember that stations within ${d.toFixed(2)} miles of each other cannot share the same frequency!`,
        selectLabel: 'Frequency',
        feedbackOptimal: n => `Great job! You found the optimal assignment using ${n} frequencies.`,
        feedbackClose: n => `That assignment works but you can do better! You can assign frequencies using ${n} frequencies.`,
        feedbackFar: (n, m) => `That assignment works but you can do much better! You can assign frequencies in ${n} frequencies and you used ${m} frequencies.`,
        feedbackConflict: (a, b, d) => `That assignment doesn't work because ${a} and ${b} are within ${d.toFixed(2)} miles and share the same frequency.`,
    },
};

const APPLICATIONS_ORGANIZATIONS = [
    'Metro Coordination Office',
    'Regional Planning Bureau',
    'Community Operations Council',
    'City Services Collaborative',
];

function loadApplicationsStats() {
    try {
        const raw = localStorage.getItem('graph_applications_stats');
        if (raw) {
            const stats = JSON.parse(raw);
            modeStates.applications.stats.total = Number(stats.total) || 0;
            modeStates.applications.stats.points = Number(stats.points) || 0;
        }
    } catch (e) { /* ignore */ }
}

function saveApplicationsStats() {
    try {
        localStorage.setItem('graph_applications_stats', JSON.stringify(modeStates.applications.stats));
    } catch (e) { /* ignore */ }
}

function updateApplicationsStatsDisplay() {
    const s = modeStates.applications.stats;
    const pct = s.total === 0 ? 0 : Math.round((s.points / s.total) * 100);
    const el = id => document.getElementById(id);
    if (el('applications-total')) el('applications-total').textContent = s.total;
    if (el('applications-points')) el('applications-points').textContent = s.points.toFixed(1);
    if (el('applications-accuracy')) el('applications-accuracy').textContent = `${pct}%`;
}

function clearApplicationsSelectionHighlights() {
    document.querySelectorAll('#applications-assignment-list select').forEach(sel => {
        sel.style.outline = '';
        sel.style.borderColor = '';
        sel.style.boxShadow = '';
    });
}

function highlightApplicationsMissingSelections(puzzle) {
    for (let i = 0; i < puzzle.n; i++) {
        const vid = vertexId(i);
        const selected = String(modeStates.applications.selection[vid] || '').trim();
        if (selected) continue;
        const sel = document.getElementById(`applications-select-${i}`);
        if (!sel) continue;
        sel.style.outline = '2px solid #e67e22';
        sel.style.borderColor = '#e67e22';
        sel.style.boxShadow = '0 0 0 2px rgba(230, 126, 34, 0.2)';
    }
}

function applicationsOrgName() {
    if (!modeStates.applications.organizationName) {
        modeStates.applications.organizationName = APPLICATIONS_ORGANIZATIONS[_randInt(0, APPLICATIONS_ORGANIZATIONS.length - 1)];
    }
    return modeStates.applications.organizationName;
}

function renderApplicationsCommitteeList(puzzle) {
    const container = document.getElementById('applications-committee-list');
    if (!container) return;
    container.innerHTML = '';

    const ul = document.createElement('ul');
    ul.style.margin = '8px 0 0 20px';
    ul.style.padding = '0';

    puzzle.committees.forEach(c => {
        const li = document.createElement('li');
        li.textContent = `${c.name}: ${c.members.join(', ')}`;
        ul.appendChild(li);
    });

    container.appendChild(ul);
}

function renderApplicationsDistanceTable(puzzle) {
    const wrap = document.getElementById('applications-distance-table-wrap');
    const tableContainer = document.getElementById('applications-distance-table');
    if (!wrap || !tableContainer) return;

    wrap.style.display = '';
    tableContainer.innerHTML = '';

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.marginTop = '8px';
    table.style.fontSize = '14px';

    const header = document.createElement('tr');
    const firstHeader = document.createElement('th');
    firstHeader.textContent = 'Distance Table';
    firstHeader.style.border = '1px solid #ddd';
    firstHeader.style.padding = '6px';
    header.appendChild(firstHeader);

    puzzle.stations.forEach(name => {
        const th = document.createElement('th');
        th.textContent = name;
        th.style.border = '1px solid #ddd';
        th.style.padding = '6px';
        header.appendChild(th);
    });
    table.appendChild(header);

    for (let i = 0; i < puzzle.n; i++) {
        const tr = document.createElement('tr');

        const rowLabel = document.createElement('th');
        rowLabel.textContent = puzzle.stations[i];
        rowLabel.style.border = '1px solid #ddd';
        rowLabel.style.padding = '6px';
        rowLabel.style.textAlign = 'left';
        tr.appendChild(rowLabel);

        for (let j = 0; j < puzzle.n; j++) {
            const td = document.createElement('td');
            td.textContent = puzzle.distanceMiles[i][j].toFixed(2);
            td.style.border = '1px solid #ddd';
            td.style.padding = '6px';
            td.style.textAlign = 'center';
            tr.appendChild(td);
        }

        table.appendChild(tr);
    }

    tableContainer.appendChild(table);
}

function hideApplicationsDistanceTable() {
    const wrap = document.getElementById('applications-distance-table-wrap');
    const tableContainer = document.getElementById('applications-distance-table');
    if (wrap) wrap.style.display = 'none';
    if (tableContainer) tableContainer.innerHTML = '';
}

function getApplicationsChoices(puzzle) {
    if (puzzle.type === 'interference') {
        return Array.isArray(puzzle.frequencyOptions) ? puzzle.frequencyOptions.slice() : [];
    }
    const minCount = Math.max(Number(puzzle.minResources) || 0, Number(puzzle.n) || 0);
    return Array.from({ length: minCount }, (_, i) => `Time Slot ${i + 1}`);
}

function isApplicationsPuzzleSolvable(puzzle) {
    const choices = getApplicationsChoices(puzzle);
    return choices.length >= (Number(puzzle.minResources) || 0);
}

function renderApplicationsAssignments(puzzle) {
    const container = document.getElementById('applications-assignment-list');
    if (!container) return;
    container.innerHTML = '';

    const choices = getApplicationsChoices(puzzle);

    for (let i = 0; i < puzzle.n; i++) {
        const vid = vertexId(i);
        const row = document.createElement('div');
        row.style.cssText = 'display:flex; align-items:center; gap:10px; margin:6px 0; flex-wrap:wrap;';

        const label = document.createElement('label');
        label.setAttribute('for', `applications-select-${i}`);
        label.textContent = puzzle.names[i];
        label.style.cssText = 'min-width:220px; color:#333; font-size:15px;';

        const select = document.createElement('select');
        select.id = `applications-select-${i}`;
        select.style.minWidth = '190px';

        const blank = document.createElement('option');
        blank.value = '';
        blank.textContent = `Select ${puzzle.type === 'interference' ? 'frequency' : 'time slot'}`;
        select.appendChild(blank);

        choices.forEach(choice => {
            const opt = document.createElement('option');
            opt.value = choice;
            opt.textContent = choice;
            select.appendChild(opt);
        });

        select.addEventListener('change', () => {
            modeStates.applications.selection[vid] = select.value;
            clearApplicationsSelectionHighlights();
        });

        row.appendChild(label);
        row.appendChild(select);
        container.appendChild(row);
    }
}

function showApplicationsFeedback({ correct, message, nextLabel }) {
    const panel = document.getElementById('applications-feedback');
    const title = document.getElementById('applications-feedback-title');
    const text = document.getElementById('applications-feedback-text');
    const next = document.getElementById('applications-next-btn');

    if (!panel) return;

    panel.className = `training-feedback ${correct ? 'correct' : 'incorrect'}`;
    if (title) title.textContent = correct ? 'Correct' : 'Try Again';
    if (text) text.textContent = message;
    if (next) next.textContent = nextLabel || (correct ? 'Next Question' : 'Try Again');
    panel.style.display = '';

    modeStates.applications.lastFeedbackWasCorrect = !!correct;
}

function resetApplicationsUI() {
    const actions = document.getElementById('applications-actions');
    const feedback = document.getElementById('applications-feedback');
    if (actions) actions.style.display = '';
    if (feedback) feedback.style.display = 'none';
    clearApplicationsSelectionHighlights();
}

function renderApplicationsPrompt(puzzle) {
    const prompt = document.getElementById('applications-prompt-title');
    const intro = document.getElementById('applications-intro');
    const details = document.getElementById('applications-details');
    const instructions = document.getElementById('applications-instructions');
    const subtitle = document.getElementById('applications-subtitle');

    const org = applicationsOrgName();

    if (puzzle.type === 'scheduling') {
        if (prompt) prompt.textContent = APPLICATIONS_COPY.scheduling.prompt;
        if (subtitle) subtitle.textContent = 'Schedule committee meetings with as few time slots as possible.';
        if (intro) intro.textContent = APPLICATIONS_COPY.scheduling.intro(org);
        if (details) details.textContent = APPLICATIONS_COPY.scheduling.details;
        if (instructions) instructions.textContent = APPLICATIONS_COPY.scheduling.instructions;
        renderApplicationsCommitteeList(puzzle);
        hideApplicationsDistanceTable();
    } else {
        if (prompt) prompt.textContent = APPLICATIONS_COPY.interference.prompt;
        if (subtitle) subtitle.textContent = 'Assign frequencies with minimal interference and minimal usage.';
        if (intro) intro.textContent = APPLICATIONS_COPY.interference.intro(org);
        if (details) details.textContent = APPLICATIONS_COPY.interference.details(puzzle.thresholdMiles);
        if (instructions) instructions.textContent = APPLICATIONS_COPY.interference.instructions(puzzle.thresholdMiles);

        const committeeContainer = document.getElementById('applications-committee-list');
        if (committeeContainer) committeeContainer.innerHTML = '';
        renderApplicationsDistanceTable(puzzle);
    }
}

function startApplicationsTrial() {
    let puzzle = generateApplicationsPuzzle();
    for (let attempt = 0; attempt < 40 && !isApplicationsPuzzleSolvable(puzzle); attempt++) {
        puzzle = generateApplicationsPuzzle();
    }

    modeStates.applications.currentPuzzle = puzzle;
    modeStates.applications.selection = {};
    modeStates.applications.lastFeedbackWasCorrect = false;

    renderApplicationsPrompt(puzzle);
    renderApplicationsAssignments(puzzle);
    resetApplicationsUI();
    updateApplicationsStatsDisplay();
}

function buildApplicationsFeedbackMessage(puzzle, result) {
    if (result.ok) {
        if (result.optimal) {
            return puzzle.type === 'scheduling'
                ? APPLICATIONS_COPY.scheduling.feedbackOptimal(result.usedCount)
                : APPLICATIONS_COPY.interference.feedbackOptimal(result.usedCount);
        }

        const isClose = result.usedCount === result.minResources + 1;
        if (puzzle.type === 'scheduling') {
            return isClose
                ? APPLICATIONS_COPY.scheduling.feedbackClose(result.minResources)
                : APPLICATIONS_COPY.scheduling.feedbackFar(result.minResources, result.usedCount);
        }
        return isClose
            ? APPLICATIONS_COPY.interference.feedbackClose(result.minResources)
            : APPLICATIONS_COPY.interference.feedbackFar(result.minResources, result.usedCount);
    }

    if (result.reason === 'conflict') {
        if (puzzle.type === 'scheduling') {
            return APPLICATIONS_COPY.scheduling.feedbackConflict(result.sharedMember, result.v1Name, result.v2Name);
        }
        return APPLICATIONS_COPY.interference.feedbackConflict(result.v1Name, result.v2Name, puzzle.thresholdMiles);
    }

    return 'Please complete all assignments before submitting.';
}

function bindApplicationsControls() {
    const get = id => document.getElementById(id);

    const resetBtn = get('applications-reset-btn');
    if (resetBtn && !resetBtn.dataset.bound) {
        resetBtn.dataset.bound = '1';
        resetBtn.onclick = () => {
            modeStates.applications.stats = { total: 0, points: 0 };
            saveApplicationsStats();
            updateApplicationsStatsDisplay();
            startApplicationsTrial();
        };
    }

    const submitBtn = get('applications-submit-btn');
    if (submitBtn && !submitBtn.dataset.bound) {
        submitBtn.dataset.bound = '1';
        submitBtn.onclick = () => {
            const puzzle = modeStates.applications.currentPuzzle;
            if (!puzzle) return;

            clearApplicationsSelectionHighlights();

            const result = validateApplicationsAssignment(puzzle, modeStates.applications.selection);
            if (!result.ok && result.reason === 'incomplete') {
                highlightApplicationsMissingSelections(puzzle);
                return;
            }

            modeStates.applications.stats.total += 1;
            if (result.ok) {
                if (result.optimal) {
                    modeStates.applications.stats.points += 1;
                } else if (result.usedCount === result.minResources + 1) {
                    modeStates.applications.stats.points += 0.5;
                }
            }
            saveApplicationsStats();
            updateApplicationsStatsDisplay();

            const message = buildApplicationsFeedbackMessage(puzzle, result);
            showApplicationsFeedback({
                correct: !!(result.ok && result.optimal),
                message,
                nextLabel: (result.ok && result.optimal) ? 'Next Question' : 'Try Again',
            });

            const actions = get('applications-actions');
            if (actions) actions.style.display = 'none';
        };
    }

    const nextBtn = get('applications-next-btn');
    if (nextBtn && !nextBtn.dataset.bound) {
        nextBtn.dataset.bound = '1';
        nextBtn.onclick = () => {
            if (modeStates.applications.lastFeedbackWasCorrect) {
                startApplicationsTrial();
            } else {
                resetApplicationsUI();
            }
        };
    }
}

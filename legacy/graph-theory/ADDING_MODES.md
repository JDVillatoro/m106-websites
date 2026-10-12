# Adding New Modes

This project uses a **mode-based architecture**:

- `graph.js`: graph/domain utilities (generation, validation, properties)
- `script.js`: shared glue (mode switching, shared Cytoscape rendering helpers, shared state)
- `*-mode.js`: mode-specific behavior and UI logic
- `index.html`: mode button + mode panel markup
- `style.css`: shared look and component classes

Use this guide when adding a new mode so behavior stays consistent.

---

## 1) Architecture Rules

When adding a mode:

1. **Put mode-specific logic in its own file**
   - Example: `fizzy-mode.js`
   - Include: event handlers, per-mode scoring, feedback flow, mode lifecycle

2. **Do not put mode logic in `script.js`**
   - `script.js` should only host shared glue and rendering helpers (`getCy`, `draw_graph`, `drawGraphCircle`, `updateGraphAria`, `setMode`)

3. **Put reusable graph/math logic in `graph.js`**
   - If your mode needs a new graph generator or validator, add that utility to `graph.js`

4. **Keep IDs stable**
   - The JS bindings depend heavily on exact element IDs in `index.html`

5. **Centralize user-facing UI copy in the mode file**
  - Put all mode-specific prompt text, feedback messages, and labels in a single top-level object (e.g. `const FIZZY_COPY = {...}`)
  - Avoid scattering user-visible strings across handlers
  - This makes copy edits fast and reduces regressions

---

## 2) Add the UI in `index.html`

### A. Add a mode button in `.mode-selector`

```html
<button id="mode-fizzy" class="mode-btn">Fizzy Graphs</button>
```

### B. Add a new mode panel

Follow existing panel patterns (`degree-panel`, `eulerian-panel`, `iso-panel`).

```html
<div id="fizzy-panel" class="mode-panel" style="display:none;">
  <div class="game-info">
    <p>Is this graph fizzy?</p>
  </div>

  <div class="mode-options-panel">
    <button id="fizzy-reset-btn" class="reset-session-btn">Reset</button>
  </div>

  <div class="graphic-prompt">
    <h2>Here is a graph...</h2>
    <p class="graphic-prompt-subtitle">Can you tell if it is fizzy?</p>

    <div id="fizzy-graph-area" role="img" aria-label="Graph diagram" aria-describedby="fizzy-graph-description"></div>
    <p id="fizzy-graph-description" class="sr-only"></p>

    <div id="fizzy-zoom-controls" class="zoom-controls">
      <button class="zoom-button zoom-in">Zoom In</button>
      <button class="zoom-button zoom-out">Zoom Out</button>
    </div>
  </div>

  <div id="fizzy-part1" class="fizzy-section">
    <div class="training-actions">
      <h2>Part 1 — Is this graph fizzy?</h2>
      <div class="eulerian-btn-row">
        <button id="fizzy-yes-btn" class="eulerian-choice-btn">Fizzy</button>
        <button id="fizzy-no-btn" class="eulerian-choice-btn">Not Fizzy</button>
      </div>
    </div>
  </div>

  <div id="fizzy-feedback" class="training-feedback" style="display:none;">
    <h2 id="fizzy-feedback-title">Feedback</h2>
    <p id="fizzy-feedback-text"></p>
    <button id="fizzy-next-btn" class="submit-btn">Next Question</button>
  </div>

  <div class="training-stats">
    <h2>Score</h2>
    <div class="stats-display">
      <p>Questions: <span id="fizzy-total">0</span></p>
      <p>Points earned: <span id="fizzy-points">0.0</span></p>
      <p>Score: <span id="fizzy-accuracy">0%</span></p>
    </div>
  </div>
</div>
```

---

## 3) Register Cytoscape container in `script.js`

Add config entry:

```js
const CY_CONFIG = {
  // ...existing modes...
  fizzy: { containerId: 'fizzy-graph-area', panelId: 'fizzy-panel' },
};
```

Add button reference + click binding:

```js
const modeFizzyBtn = document.getElementById('mode-fizzy');
modeFizzyBtn && modeFizzyBtn.addEventListener('click', () => setMode('fizzy'));
```

Update `setMode(mode)` with a new `else if (mode === 'fizzy')` block mirroring existing patterns:

- activate button
- show panel
- initialize once (`_initialized` guard)
- call `load...Stats()`, `bind...Controls()`, `start...Trial()`
- otherwise redraw existing graph

Also add state slot:

```js
fizzy: { graph: null, stats: { total: 0, points: 0 }, _initialized: false, currentPuzzle: null }
```

---

## 4) Add script include order in `index.html`

Keep order consistent:

1. Cytoscape core
2. Cytoscape extension(s)
3. `graph.js`
4. all `*-mode.js`
5. `script.js` last

Example:

```html
<script src="graph.js"></script>
<script src="fizzy-mode.js"></script>
<script src="script.js"></script>
```

---

## 5) Example Mode Skeleton (`fizzy-mode.js`)

Use this as a starting template.

```js
// =============================================================================
// Fizzy Mode
// =============================================================================

const FIZZY_COPY = {
  promptTitle: 'Here is a graph...',
  promptSubtitle: 'Can you tell if it is fizzy?',
  part1Title: 'Part 1 — Is this graph fizzy?',
  feedbackTitleCorrect: 'Correct',
  feedbackTitleIncorrect: 'Incorrect',
  feedbackCorrect: 'Good work. Your classification is correct.',
  feedbackIsFizzy: 'This graph is fizzy.',
  feedbackNotFizzy: 'This graph is not fizzy.',
};

function loadFizzyStats() {
  try {
    const raw = localStorage.getItem('graph_fizzy_stats');
    if (raw) {
      const s = JSON.parse(raw);
      modeStates.fizzy.stats.total = s.total || 0;
      modeStates.fizzy.stats.points = s.points || 0;
    }
  } catch (e) { /* ignore */ }
}

function saveFizzyStats() {
  try { localStorage.setItem('graph_fizzy_stats', JSON.stringify(modeStates.fizzy.stats)); }
  catch (e) { /* ignore */ }
}

function updateFizzyStatsDisplay() {
  const s = modeStates.fizzy.stats;
  const pct = s.total === 0 ? 0 : Math.round((s.points / s.total) * 100);
  const el = id => document.getElementById(id);
  if (el('fizzy-total')) el('fizzy-total').textContent = s.total;
  if (el('fizzy-points')) el('fizzy-points').textContent = s.points.toFixed(1);
  if (el('fizzy-accuracy')) el('fizzy-accuracy').textContent = pct + '%';
}

function resetFizzyUI() {
  const show = id => { const el = document.getElementById(id); if (el) el.style.display = ''; };
  const hide = id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; };

  show('fizzy-part1');
  hide('fizzy-feedback');

  ['fizzy-yes-btn', 'fizzy-no-btn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('selected-correct', 'selected-wrong');
    }
  });
}

function startFizzyTrial() {
  // Replace with real utility from graph.js
  // const puzzle = generateFizzyPuzzle();
  const puzzle = {
    graph: generateSimpleGraph(5),
    isFizzy: true,
  };

  modeStates.fizzy.currentPuzzle = puzzle;
  modeStates.fizzy.graph = puzzle.graph;

  const cy = getCy('fizzy');
  if (cy) draw_graph(puzzle.graph, cy);
  updateGraphAria('fizzy-graph-description', puzzle.graph, true);

  resetFizzyUI();
  updateFizzyStatsDisplay();
}

function showFizzyFeedback({ correct, message }) {
  const panel = document.getElementById('fizzy-feedback');
  const title = document.getElementById('fizzy-feedback-title');
  const text = document.getElementById('fizzy-feedback-text');

  if (!panel) return;
  panel.className = `training-feedback ${correct ? 'correct' : 'incorrect'}`;
  if (title) title.textContent = correct ? FIZZY_COPY.feedbackTitleCorrect : FIZZY_COPY.feedbackTitleIncorrect;
  if (text) text.textContent = message;
  panel.style.display = '';
}

function bindFizzyControls() {
  const get = id => document.getElementById(id);

  const resetBtn = get('fizzy-reset-btn');
  if (resetBtn && !resetBtn.dataset.bound) {
    resetBtn.dataset.bound = '1';
    resetBtn.onclick = () => {
      modeStates.fizzy.stats = { total: 0, points: 0 };
      saveFizzyStats();
      updateFizzyStatsDisplay();
      startFizzyTrial();
    };
  }

  ['fizzy-yes-btn', 'fizzy-no-btn'].forEach(btnId => {
    const btn = get(btnId);
    if (btn && !btn.dataset.bound) {
      btn.dataset.bound = '1';
      btn.onclick = () => {
        const puzzle = modeStates.fizzy.currentPuzzle;
        if (!puzzle) return;

        const userSaysFizzy = btnId === 'fizzy-yes-btn';
        const correct = userSaysFizzy === puzzle.isFizzy;

        modeStates.fizzy.stats.total += 1;
        if (correct) {
          modeStates.fizzy.stats.points += 1;
          btn.classList.add('selected-correct');
        } else {
          btn.classList.add('selected-wrong');
        }

        ['fizzy-yes-btn', 'fizzy-no-btn'].forEach(id => {
          const b = get(id); if (b) b.disabled = true;
        });

        saveFizzyStats();
        updateFizzyStatsDisplay();

        get('fizzy-part1').style.display = 'none';
        showFizzyFeedback({
          correct,
          message: correct
            ? FIZZY_COPY.feedbackCorrect
            : (puzzle.isFizzy ? FIZZY_COPY.feedbackIsFizzy : FIZZY_COPY.feedbackNotFizzy),
        });
      };
    }
  });

  const nextBtn = get('fizzy-next-btn');
  if (nextBtn && !nextBtn.dataset.bound) {
    nextBtn.dataset.bound = '1';
    nextBtn.onclick = () => startFizzyTrial();
  }
}
```

---

## 6) Score Tracking Conventions

Score tracking should follow a predictable flow so every mode behaves similarly.

### A. Recommended state shape

Use a per-mode `stats` object inside `modeStates`:

```js
fizzy: {
  graph: null,
  stats: { total: 0, points: 0 },
  _initialized: false,
  currentPuzzle: null,
  part1Scored: false,
  part2Scored: false,
}
```

Notes:

- `total`: how many questions/trials have been answered in Part 1
- `points`: score earned (supports fractional points)
- `part1Scored` / `part2Scored`: prevents awarding points twice in multi-part flows

### B. Persistence pattern

Use a dedicated `localStorage` key per mode, e.g. `graph_fizzy_stats`:

```js
function loadFizzyStats() { /* read + parse + defaults */ }
function saveFizzyStats() { /* write JSON */ }
```

Call `loadFizzyStats()` only on first mode init (`_initialized` gate in `setMode`).

### C. Display/update pattern

Keep one display updater and call it whenever stats change:

```js
function updateFizzyStatsDisplay() {
  const s = modeStates.fizzy.stats;
  const pct = s.total === 0 ? 0 : Math.round((s.points / s.total) * 100);
  // update #fizzy-total, #fizzy-points, #fizzy-accuracy
}
```

### D. Awarding points (typical)

- Increment `stats.total` once per new question attempt (usually after Part 1 answer)
- Add points only when correct
- For multipart modes, use split scoring (common pattern: `0.5 + 0.5`)
- Save + refresh display immediately after score changes

Typical flow inside submit handlers:

1. Validate answer
2. Update stats (`total`, `points`)
3. `save...Stats()`
4. `update...StatsDisplay()`
5. Show feedback / move UI forward

### E. Reset behavior

Reset button should:

```js
modeStates.fizzy.stats = { total: 0, points: 0 };
saveFizzyStats();
updateFizzyStatsDisplay();
startFizzyTrial();
```

This gives users a clean scoring session while preserving consistent UI state.

---

## 7) UI Design Conventions for This Project

Follow these conventions to keep the experience coherent:

- **Panel layout**
  - `game-info` → `mode-options-panel` → `graphic-prompt` → task sections → stats

- **Feedback style**
  - Use `training-feedback` plus either `correct` or `incorrect`
  - Keep heading and message semantically aligned (never "Incorrect" + "Correct!" text)

- **Buttons**
  - Primary submit/next actions use `submit-btn`
  - Binary choice buttons usually use `eulerian-choice-btn` + selection classes (`selected-correct`, `selected-wrong`)

- **Stats**
  - Use `Questions`, `Points earned`, `Score` format 

- **Accessibility**
  - Graph area should include `role="img"`, `aria-label`, and `aria-describedby`
  - Provide/update a hidden description element (`sr-only`) via `updateGraphAria(...)`

- **Event binding safety**
  - Guard handlers with `if (!btn.dataset.bound)` to avoid duplicate listeners

- **State reset discipline**
  - Each trial start should reset UI visibility, temporary selections, and button enabled states

- **Centralized copy**
  - Keep mode UI text and feedback strings in one top-level `*_COPY` object in the mode file
  - Handlers should reference that object instead of hardcoded inline strings

- **Script order**
  - Keep `script.js` last because it depends on mode functions already being defined

---

## 8) Quick Checklist

- [ ] Add mode button and panel markup in `index.html`
- [ ] Add new mode file `your-mode.js`
- [ ] Add script tag for `your-mode.js` before `script.js`
- [ ] Extend `CY_CONFIG` in `script.js` with container/panel IDs
- [ ] Add mode state slot in `modeStates`
- [ ] Add `setMode(...)` branch for the mode
- [ ] Bind mode button click
- [ ] Implement `load/save/updateStats`, `bind...Controls`, `start...Trial`
- [ ] Centralize mode UI copy in a top-level `*_COPY` object
- [ ] Add score UI ids (`*-total`, `*-points`, `*-accuracy`) in the panel
- [ ] Increment `total` exactly once per trial and gate multi-part scoring
- [ ] Persist stats with a mode-specific `localStorage` key
- [ ] Use `updateGraphAria(...)` for graph descriptions
- [ ] Verify feedback heading/message consistency

// Graph Coloring: color the graph with at most k colors, or apply the greedy
// coloring algorithm. The graph shows the colors as they are chosen.
// Ported from legacy/graph-theory/graph-coloring-mode.js; spec in coloring.md.
// Puzzle generation (up to getGreedyVertexOrder) is copied unchanged, except
// that it uses the local helpers below instead of graph.js's private ones.

import { shuffle, vertexId } from '../lib/graph/core.js';
import { generatePlanarGraph } from '../lib/graph/planar.js';
import {
  chromaticNumber, validateGraphColoring, validateGreedyColoring,
} from '../lib/graph/coloring.js';
import { createGraphView } from '../lib/render.js';
import { escapeHtml, feedbackHtml, showFeedback, hideFeedback, loadStylesheet } from '../../shared/js/ui.js';

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const edgeKey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
const toEdges = indexEdges => indexEdges.map(({ s, t }) => ({ source: vertexId(s), target: vertexId(t), label: null }));

const COLORING_BASE = [
    // cssVar: the fill, from shared/css/tokens.css.
    { token: 'a', name: 'Red', cssVar: '--coloring-red', freeAlias: 'R', greedyAlias: 'A' },
    { token: 'b', name: 'Green', cssVar: '--coloring-green', freeAlias: 'G', greedyAlias: 'B' },
    { token: 'c', name: 'Blue', cssVar: '--coloring-blue', freeAlias: 'B', greedyAlias: 'C' },
    { token: 'd', name: 'Yellow', cssVar: '--coloring-yellow', freeAlias: 'Y', greedyAlias: 'D' },
    { token: 'e', name: 'Purple', cssVar: '--coloring-purple', freeAlias: 'P', greedyAlias: 'E' },
    { token: 'f', name: 'Orange', cssVar: '--coloring-orange', freeAlias: 'O', greedyAlias: 'F' },
];

const COLORING_BY_TOKEN = Object.fromEntries(
    COLORING_BASE.map(c => [c.token, c])
);

export const COLORING_PUZZLE_CONFIG = {
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
    const leftSize = randInt(2, n - 2);
    const vertices = shuffle(Array.from({ length: n }, (_, i) => i));
    const left = vertices.slice(0, leftSize);
    const right = vertices.slice(leftSize);

    const edgeSet = new Set();
    const edges = [];
    const addEdge = (a, b) => {
        const key = edgeKey(a, b);
        if (a === b || edgeSet.has(key)) return false;
        edgeSet.add(key);
        edges.push({ s: Math.min(a, b), t: Math.max(a, b) });
        return true;
    };

    for (const r of right) addEdge(r, left[randInt(0, left.length - 1)]);
    for (const l of left) addEdge(l, right[randInt(0, right.length - 1)]);

    const target = Math.max(n + 1, Math.min(Math.floor(1.7 * n), left.length * right.length));
    let guard = 0;
    while (edges.length < target && guard < 3000) {
        guard++;
        addEdge(left[randInt(0, left.length - 1)], right[randInt(0, right.length - 1)]);
    }

    return {
        n,
        names: _makeColoringNumberNames(n),
        directed: false,
        edgeLabel: null,
        edges: toEdges(edges),
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
        const key = edgeKey(a, b);
        if (a === b || edgeSet.has(key)) return;
        edgeSet.add(key);
        edges.push({ s: Math.min(a, b), t: Math.max(a, b) });
    };

    for (let i = 0; i < core.length; i++) {
        for (let j = i + 1; j < core.length; j++) addEdge(core[i], core[j]);
    }

    for (const v of extras) {
        const shuffledCore = shuffle(core.slice());
        const degreeToCore = randInt(2, 4);
        for (let i = 0; i < degreeToCore; i++) addEdge(v, shuffledCore[i]);
    }

    return {
        n,
        names: _makeColoringNumberNames(n),
        directed: false,
        edgeLabel: null,
        edges: toEdges(edges),
        flavor: 'k5',
    };
}

export function generateGraphColoringPuzzle() {
    for (let attempt = 0; attempt < 60; attempt++) {
        const n = randInt(COLORING_PUZZLE_CONFIG.nMin, COLORING_PUZZLE_CONFIG.nMax);
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


// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

const COPY = {
  promptTitle: 'Here is a graph...',
  promptSubtitle: 'Can you color the graph?',
  hint: 'Hint: it can be helpful to arrange the vertices in a way where there are not too many crossings.',
  freeformTitle: max => `Color the graph using at most ${max} colors.`,
  greedyTitle: 'Use the greedy coloring algorithm to color the graph.',
  greedyChoices: 'Your color choices are A, B, C, D, E and F (in that order).',
  vertex: name => `Vertex ${name}`,
  chooseColor: 'Select color',
  incomplete: 'Choose a color for every vertex.',
  submit: 'Submit',
  successFreeform: 'That is a valid coloring of the graph!',
  successFreeformMinimal: 'That is a valid coloring of the graph and you used the minimal number of colors!',
  successGreedy: 'You applied the greedy coloring algorithm correctly!',
  failGreedy: (vertexLabel, expectedAlias) => `Vertex ${vertexLabel} is colored incorrectly. It should be assigned ${expectedAlias}.`,
  failConflict: (v1, v2, colorName) => `This is not a valid coloring of the graph. Vertex ${v1} and Vertex ${v2} are both colored ${colorName} and are connected by an edge.`,
};

let root, score, view, puzzle, caseType, selection;
const $ = selector => root.querySelector(selector);

/** Show the chosen colors on the graph: fill, plus an alias in the label ("3: R"). */
function colorGraph() {
  const styleOf = getComputedStyle(document.documentElement);
  const token = name => styleOf.getPropertyValue(name).trim();
  const blank = token('--graph-node-fill') || '#fff';
  view.cy.batch(() => {
    for (let i = 0; i < puzzle.n; i++) {
      const node = view.cy.getElementById(vertexId(i));
      const c = COLORING_BY_TOKEN[selection[vertexId(i)]];
      const alias = c ? (caseType === 'greedy' ? c.greedyAlias : c.freeAlias) : '';
      const displayName = c ? `${puzzle.names[i]}: ${alias}` : puzzle.names[i];
      node.data({ displayName, labelLen: displayName.length });
      node.style('background-color', c ? token(c.cssVar) : blank);
    }
  });
}

function newQuestion() {
  puzzle = generateGraphColoringPuzzle();
  caseType = pickColoringCaseType();
  selection = {};
  view.draw(puzzle);

  $('.coloring-title').textContent = caseType === 'greedy' ? COPY.greedyTitle : COPY.freeformTitle(puzzle.maxColorsAllowed);
  $('.coloring-subtitle').textContent = caseType === 'greedy' ? COPY.greedyChoices : '';
  $('.coloring-subtitle').hidden = caseType !== 'greedy';

  const palette = getColoringPaletteForCase(caseType, puzzle);
  $('.color-rows').innerHTML = puzzle.names.map((name, i) => `
    <div class="color-row">
      <label for="coloring-${i}">${escapeHtml(COPY.vertex(name))}</label>
      <select id="coloring-${i}" data-vertex="${vertexId(i)}">
        <option value="">${COPY.chooseColor}</option>
        ${palette.map(c => `<option value="${c.token}">${caseType === 'greedy' ? c.greedyAlias : c.name}</option>`).join('')}
      </select>
    </div>`).join('');

  $('.coloring-form [type="submit"]').disabled = false;
  $('.coloring-form .input-error').textContent = '';
  hideFeedback($('.feedback'));
}

function submit() {
  const selects = [...root.querySelectorAll('.color-rows select')];
  const missing = selects.filter(s => !s.value);
  selects.forEach(s => s.classList.toggle('is-invalid', !s.value));
  if (missing.length) {
    $('.coloring-form .input-error').textContent = COPY.incomplete;
    missing[0].focus();
    return;
  }
  $('.coloring-form .input-error').textContent = '';

  let correct, message;
  if (caseType === 'greedy') {
    const result = validateGreedyColoring(puzzle, getGreedyVertexOrder(puzzle), selection, COLORING_BASE.map(c => c.token));
    correct = result.ok;
    message = correct
      ? COPY.successGreedy
      : COPY.failGreedy(result.vertexLabel, COLORING_BY_TOKEN[result.expected]?.greedyAlias ?? '?');
  } else {
    const byName = Object.fromEntries(Object.entries(selection).map(([vid, token]) => [vid, COLORING_BY_TOKEN[token].name.toLowerCase()]));
    const result = validateGraphColoring(puzzle, byName, puzzle.minColors);
    correct = result.ok;
    if (correct) message = result.isMinimal ? COPY.successFreeformMinimal : COPY.successFreeform;
    else {
      const colorName = result.color ? result.color.charAt(0).toUpperCase() + result.color.slice(1) : 'the same color';
      message = COPY.failConflict(result.v1, result.v2, colorName);
    }
  }

  score.record(correct ? 1 : 0);
  selects.forEach(s => { s.disabled = true; });
  $('.coloring-form [type="submit"]').disabled = true;
  showFeedback($('.feedback'), { correct, messageHtml: escapeHtml(message) });
  $('.feedback-next').focus();
}

export default {
  scored: true,

  mount(el, ctx) {
    root = el;
    score = ctx.score;
    loadStylesheet(new URL('./coloring.css', import.meta.url));
    root.innerHTML = `
      <div class="section">
        <h2>${COPY.promptTitle}</h2>
        <p class="subtitle">${COPY.promptSubtitle}</p>
        <div class="graph-slot"></div>
        <p class="hint">${COPY.hint}</p>
      </div>

      <form class="section coloring-form">
        <h2 class="coloring-title"></h2>
        <p class="subtitle coloring-subtitle" hidden></p>
        <div class="color-rows"></div>
        <button type="submit" class="primary-btn">${COPY.submit}</button>
        <p class="input-error" role="alert"></p>
      </form>

      ${feedbackHtml()}`;

    view = createGraphView($('.graph-slot'));
    $('.color-rows').addEventListener('change', event => {
      const select = event.target;
      selection[select.dataset.vertex] = select.value;
      if (!select.value) delete selection[select.dataset.vertex];
      select.classList.remove('is-invalid');
      colorGraph();
    });
    $('.coloring-form').addEventListener('submit', event => {
      event.preventDefault();
      if (!$('.coloring-form [type="submit"]').disabled) submit();
    });
    $('.feedback-next').addEventListener('click', newQuestion);
    newQuestion();
  },

  reset() {
    newQuestion();
  },
};

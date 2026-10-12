// Hamiltonian Graphs: is the graph Hamiltonian? If it is, find a Hamiltonian
// cycle (freely, by nearest neighbor, or by sorted edges); if not, say why.
// Ported from legacy/graph-theory/hamiltonian-mode.js; spec in hamiltonian.md.
// Puzzle generation and checking are in lib/graph.js (generateHamiltonianPuzzle,
// validateHamiltonianCycle*).

import {
  generateHamiltonianPuzzle, validateHamiltonianCycleFreeform, validateHamiltonianCycleNN,
  validateHamiltonianCycleSE,
} from '../lib/graph.js';
import { createGraphView } from '../lib/render.js';
import {
  escapeHtml, feedbackHtml, showFeedback, hideFeedback, lockChoices, resetChoices,
} from '../../shared/js/ui.js';

const strong = text => `<strong>${escapeHtml(text)}</strong>`;

const COPY = {
  info: 'Can you tell if this graph is Hamiltonian? If so, find a Hamiltonian cycle!',
  promptTitle: 'Here is a graph...',
  promptSubtitle: "Can you tell if it's a Hamiltonian graph?",
  hint: 'Hint: try clicking and dragging the vertices to get a better look.',
  part1Title: 'Part 1 — Is this graph Hamiltonian?',
  yes: 'Hamiltonian',
  no: 'Not Hamiltonian',
  part1Wrong: isHamiltonian => `Actually, this graph is ${isHamiltonian ? '' : 'not '}Hamiltonian.`,

  cycleLead: "That's right, the graph is Hamiltonian!",
  instructions: {
    freeform: () => 'Specify a Hamiltonian cycle by listing the vertices in order (e.g. <em>A B C D</em> or <em>ABCDA</em>).',
    nearest_neighbor: start => `Find a Hamiltonian cycle using the nearest neighbor strategy. Start at vertex ${strong(start)} and use the displayed weights to determine the nearest neighbor at each step.`,
    sorted_edge: () => 'Find a Hamiltonian cycle using the sorted edge strategy. Use the displayed weights to determine the order in which to consider the edges.',
  },
  cycleLabel: 'Hamiltonian cycle',
  cyclePlaceholder: 'e.g. A B C D or ABCDA',
  cycleEmpty: 'Type the cycle first.',
  cycleCorrect: {
    freeform: 'That is a valid Hamiltonian cycle.',
    nearest_neighbor: "That's the cycle the nearest neighbor strategy finds.",
    sorted_edge: "That's the cycle the sorted edge strategy finds.",
  },
  cycleWrong: result => {
    switch (result.reason) {
      case 'not_a_valid_path': return "That's not a valid path.";
      case 'missing_vertex': return `It doesn't visit vertex ${strong(result.detail)}.`;
      case 'repeated_vertex': return `It visits vertex ${strong(result.detail)} more than once.`;
      case 'no_edge': return `There is no edge between ${strong(result.detail)}.`;
      case 'wrong_start': return `It doesn't start at the correct vertex (${strong(result.detail)}).`;
      case 'incomplete_cycle': return "You didn't complete the cycle.";
      case 'wrong_nn_step': return `Incorrect step: <em>${escapeHtml(result.detail)}</em>.`;
      case 'cant_close_cycle': return 'The last vertex cannot connect back to the start.';
      case 'wrong_edge_missing': return `The sorted edge strategy should have included edge ${strong(result.detail)}.`;
      case 'wrong_edge_extra': return `The sorted edge strategy does not include edge ${strong(result.detail)}.`;
      default: return "That's not the right Hamiltonian cycle.";
    }
  },
  retry: 'Let me try again',
  next: 'Next question',

  whyLead: "That's right, the graph is not Hamiltonian!",
  whyTitle: 'Part 2 — Can you tell why?',
  reasons: {
    leaf: 'It contains a leaf',
    cut_vertex: 'It contains a cut vertex',
    bipartite_unequal: 'It is bipartite with non-equal partition sizes',
  },
  reasonExplained: {
    leaf: 'A Hamiltonian cycle requires every vertex to have degree ≥ 2, but this graph has a leaf (a vertex of degree 1).',
    cut_vertex: 'A Hamiltonian cycle cannot pass through a cut vertex in a way that traverses all components.',
    bipartite_unequal: 'A Hamiltonian cycle in a bipartite graph must alternate between the two parts, so the parts must be equal in size.',
  },
  alsoLeaf: ' This graph also has a leaf (a vertex of degree 1).',
  reasonWrong: reasons => `The graph is not Hamiltonian because: ${reasons.map(r => COPY.reasons[r].replace(/^It/, 'it')).join(', ')}.`,
  submit: 'Submit',
};

const VALIDATORS = {
  freeform: validateHamiltonianCycleFreeform,
  nearest_neighbor: validateHamiltonianCycleNN,
  sorted_edge: validateHamiltonianCycleSE,
};

let root, score, view, puzzle, part2Scored;
const $ = selector => root.querySelector(selector);

/** The puzzle with weights removed, for drawing before part 1 is answered. */
const withoutWeights = p => ({ ...p, edgeLabel: null, edges: p.edges.map(e => ({ ...e, label: null })) });

function newQuestion() {
  puzzle = generateHamiltonianPuzzle();
  part2Scored = false;
  view.draw(withoutWeights(puzzle));

  resetChoices($('.part1'));
  resetChoices($('.part2-why'));
  $('.part2-cycle').hidden = true;
  $('.part2-why').hidden = true;
  $('.cycle-input').value = '';
  $('.cycle-input').disabled = false;
  $('.part2-cycle [type="submit"]').disabled = false;
  $('.part2-cycle .input-error').textContent = '';
  hideFeedback($('.feedback'));
}

function finish(correct, messageHtml, canRetry = false) {
  showFeedback($('.feedback'), { correct, messageHtml, canRetry });
  (canRetry ? $('.feedback-retry') : $('.feedback-next')).focus();
}

function answerPart1(btn) {
  const correct = (btn.dataset.answer === 'yes') === puzzle.isHamiltonian;
  lockChoices($('.part1'), btn, correct);
  score.record(correct ? 0.5 : 0);
  if (!correct) return finish(false, escapeHtml(COPY.part1Wrong(puzzle.isHamiltonian)));

  if (!puzzle.isHamiltonian) {
    $('.part2-why').hidden = false;
    $('.part2-why .choice-btn').focus();
    return;
  }
  if (puzzle.showWeights) view.setEdgeLabels(puzzle);
  $('.cycle-instructions').innerHTML = COPY.instructions[puzzle.strategy](puzzle.names[puzzle.startVertex]);
  $('.part2-cycle').hidden = false;
  $('.cycle-input').focus();
}

function submitCycle() {
  const input = $('.cycle-input');
  if (!/[A-Za-z]/.test(input.value)) {
    $('.part2-cycle .input-error').textContent = COPY.cycleEmpty;
    return;
  }
  $('.part2-cycle .input-error').textContent = '';
  const result = VALIDATORS[puzzle.strategy](input.value.trim(), puzzle);
  input.disabled = true;
  $('.part2-cycle [type="submit"]').disabled = true;
  if (result.valid) {
    // Points for part 2 once, even after retries.
    if (!part2Scored) score.addPoints(0.5);
    part2Scored = true;
    finish(true, escapeHtml(COPY.cycleCorrect[puzzle.strategy]));
  } else {
    finish(false, COPY.cycleWrong(result), true);
  }
}

function retry() {
  hideFeedback($('.feedback'));
  $('.cycle-input').disabled = false;
  $('.part2-cycle [type="submit"]').disabled = false;
  $('.cycle-input').focus();
}

function answerWhy(btn) {
  const reason = btn.dataset.answer;
  const reasons = puzzle.nonHamiltonianReasons;
  const correct = reasons.includes(reason);
  lockChoices($('.part2-why'), btn, correct);
  if (correct) {
    score.addPoints(0.5);
    const also = reason !== 'leaf' && reasons.includes('leaf') ? COPY.alsoLeaf : '';
    finish(true, escapeHtml(COPY.reasonExplained[reason] + also));
  } else {
    finish(false, escapeHtml(COPY.reasonWrong(reasons)));
  }
}

export default {
  scored: true,

  mount(el, ctx) {
    root = el;
    score = ctx.score;
    root.innerHTML = `
      <div class="info"><p>${COPY.info}</p></div>
      <div class="section">
        <h2>${COPY.promptTitle}</h2>
        <p class="subtitle">${COPY.promptSubtitle}</p>
        <div class="graph-slot"></div>
        <p class="hint">${COPY.hint}</p>
      </div>

      <div class="section part1">
        <h2>${COPY.part1Title}</h2>
        <div class="choice-row">
          <button type="button" class="choice-btn" data-answer="yes">${COPY.yes}</button>
          <button type="button" class="choice-btn" data-answer="no">${COPY.no}</button>
        </div>
      </div>

      <form class="section part2-cycle" hidden>
        <h2>${COPY.cycleLead}</h2>
        <p class="subtitle cycle-instructions"></p>
        <div class="answer-row">
          <label for="ham-cycle" class="sr-only">${COPY.cycleLabel}</label>
          <input type="text" id="ham-cycle" class="cycle-input" autocomplete="off" placeholder="${COPY.cyclePlaceholder}">
          <button type="submit" class="primary-btn">${COPY.submit}</button>
        </div>
        <p class="input-error" role="alert"></p>
      </form>

      <div class="section part2-why" hidden>
        <h2>${COPY.whyLead}</h2>
        <p class="subtitle">${COPY.whyTitle}</p>
        <div class="choice-row">
          ${Object.entries(COPY.reasons).map(([key, label]) =>
            `<button type="button" class="choice-btn" data-answer="${key}">${label}</button>`).join('')}
        </div>
      </div>

      ${feedbackHtml({ retryLabel: COPY.retry, nextLabel: COPY.next })}`;

    view = createGraphView($('.graph-slot'));
    root.querySelectorAll('.part1 .choice-btn').forEach(btn => btn.addEventListener('click', () => answerPart1(btn)));
    root.querySelectorAll('.part2-why .choice-btn').forEach(btn => btn.addEventListener('click', () => answerWhy(btn)));
    $('.part2-cycle').addEventListener('submit', event => {
      event.preventDefault();
      if (!$('.part2-cycle [type="submit"]').disabled) submitCycle();
    });
    $('.feedback-retry').addEventListener('click', retry);
    $('.feedback-next').addEventListener('click', newQuestion);
    newQuestion();
  },

  reset() {
    newQuestion();
  },
};

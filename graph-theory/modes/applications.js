// Applications: graph coloring in disguise. Schedule committee meetings in as
// few time slots as possible, or assign radio frequencies to stations.
// Ported from legacy/graph-theory/applications-mode.js; spec in applications.md.
// Puzzle generation and checking are still in lib/graph.js
// (generateApplicationsPuzzle, validateApplicationsAssignment).
// TODO(refactor): move them here (docs/merge-history.md, "Still to do").

import { vertexId, generateApplicationsPuzzle, validateApplicationsAssignment } from '../lib/graph.js';
import { escapeHtml, feedbackHtml, showFeedback, hideFeedback, loadStylesheet } from '../../shared/js/ui.js';

const ORGANIZATIONS = [
  'Metro Coordination Office',
  'Regional Planning Bureau',
  'Community Operations Council',
  'City Services Collaborative',
];

const TIME_SLOTS = ['9am-10am', '10am-11am', '11am-12pm', '1pm-2pm', '2pm-3pm', '3pm-4pm', '4pm-5pm'];

const COPY = {
  info: 'Solve real-world optimization puzzles modeled by graphs.',
  scheduling: {
    prompt: 'Can you find the optimal schedule?',
    subtitle: 'Schedule committee meetings with as few time slots as possible.',
    intro: org => `${org} needs to figure out how to schedule meetings.`,
    details: 'The organization has the following committees and members:',
    instructions: 'Try to schedule the meetings in as few time slots as possible. Remember that committee members can only be in one place at once!',
    choose: 'Select time slot',
    optimal: n => `Great job! You found the optimal schedule using ${n} time slots.`,
    close: n => `That schedule works but you can do better! You can schedule the meetings in ${n} time slots.`,
    far: (n, m) => `That schedule works but you can do much better! You can schedule the meetings in ${n} time slots and you used ${m} time slots.`,
    conflict: (member, a, b, slot) => member
      ? `That schedule doesn't work because ${member} is scheduled for both ${a} and ${b} at ${slot}.`
      : `That schedule doesn't work because ${a} and ${b} are both scheduled at ${slot} and share a committee member.`,
  },
  interference: {
    prompt: 'Can you find the optimal frequency assignment?',
    subtitle: 'Assign frequencies with minimal interference and minimal usage.',
    intro: org => `${org} needs to assign frequencies to radio stations.`,
    details: d => `After some testing, they have determined that there is unacceptable interference when two stations share frequencies and are within ${d.toFixed(2)} miles of each other.`,
    tableCaption: 'Distance between each pair of stations, in miles',
    instructions: d => `Try to assign the frequencies using as few as possible. Remember that stations within ${d.toFixed(2)} miles of each other cannot share the same frequency!`,
    choose: 'Select frequency',
    optimal: n => `Great job! You found the optimal assignment using ${n} frequencies.`,
    close: n => `That assignment works but you can do better! You can assign frequencies using ${n} frequencies.`,
    far: (n, m) => `That assignment works but you can do much better! You can assign frequencies in ${n} frequencies and you used ${m} frequencies.`,
    conflict: (a, b, d) => `That assignment doesn't work because ${a} and ${b} are within ${d.toFixed(2)} miles and share the same frequency.`,
  },
  assignTitle: 'Assign resources',
  incomplete: 'Make a choice for every row.',
  notOptimal: 'Not optimal',
  submit: 'Submit',
};

let root, score, puzzle, organization;
const $ = selector => root.querySelector(selector);

const choicesFor = p => (p.type === 'interference' ? p.frequencyOptions.slice() : TIME_SLOTS.slice());

/**
 * Do the distances shown (rounded to 0.01 mile) give the same conflicts as the
 * exact ones? About 1 interference puzzle in 150 doesn't: two distances within
 * 0.005 miles of each other, on either side of the threshold.
 */
export function matchesShownDistances(p) {
  if (p.type !== 'interference') return true;
  const conflicts = new Set(p.edges.map(e => [e.source, e.target].sort().join()));
  for (let a = 0; a < p.n; a++) {
    for (let b = a + 1; b < p.n; b++) {
      const shown = p.distanceMiles[a][b] <= p.thresholdMiles;
      if (shown !== conflicts.has([vertexId(a), vertexId(b)].sort().join())) return false;
    }
  }
  return true;
}

/** A puzzle that has enough time slots or frequencies, and whose numbers match its answer. */
function newPuzzle() {
  let p = generateApplicationsPuzzle();
  for (let attempt = 0; attempt < 40; attempt++) {
    if (choicesFor(p).length >= (Number(p.minResources) || 0) && matchesShownDistances(p)) break;
    p = generateApplicationsPuzzle();
  }
  return p;
}

function renderPrompt() {
  const copy = COPY[puzzle.type];
  $('.app-title').textContent = copy.prompt;
  $('.app-subtitle').textContent = copy.subtitle;
  $('.app-intro').textContent = copy.intro(organization);
  if (puzzle.type === 'scheduling') {
    $('.app-details').textContent = copy.details;
    $('.app-instructions').textContent = copy.instructions;
    $('.app-data').innerHTML = puzzle.committees.map(c => `
      <h3 class="committee-name">${escapeHtml(c.name)}</h3>
      <p class="committee-members">${escapeHtml([...c.members].sort((a, b) => String(a).localeCompare(String(b))).join(', '))}</p>`).join('');
  } else {
    $('.app-details').textContent = copy.details(puzzle.thresholdMiles);
    $('.app-instructions').textContent = copy.instructions(puzzle.thresholdMiles);
    const header = puzzle.stations.map(s => `<th scope="col">${escapeHtml(s)}</th>`).join('');
    const rows = puzzle.stations.map((s, i) => `
      <tr><th scope="row">${escapeHtml(s)}</th>${puzzle.distanceMiles[i].map(d => `<td>${d.toFixed(2)}</td>`).join('')}</tr>`).join('');
    $('.app-data').innerHTML = `
      <div class="distance-table-wrap">
        <table class="distance-table">
          <caption class="sr-only">${copy.tableCaption}</caption>
          <thead><tr><th scope="col">Distance Table</th>${header}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }
}

function newQuestion() {
  puzzle = newPuzzle();
  renderPrompt();
  const copy = COPY[puzzle.type];
  const choices = choicesFor(puzzle);
  $('.assign-rows').innerHTML = puzzle.names.map((name, i) => `
    <div class="assign-row">
      <label for="app-${i}">${escapeHtml(name)}</label>
      <select id="app-${i}" data-vertex="${vertexId(i)}">
        <option value="">${copy.choose}</option>
        ${choices.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
      </select>
    </div>`).join('');
  $('.assign-form [type="submit"]').disabled = false;
  $('.assign-form .input-error').textContent = '';
  hideFeedback($('.feedback'));
}

function submit() {
  const selects = [...root.querySelectorAll('.assign-rows select')];
  selects.forEach(s => s.classList.toggle('is-invalid', !s.value));
  if (selects.some(s => !s.value)) {
    $('.assign-form .input-error').textContent = COPY.incomplete;
    return;
  }
  $('.assign-form .input-error').textContent = '';

  const selection = Object.fromEntries(selects.map(s => [s.dataset.vertex, s.value]));
  const result = validateApplicationsAssignment(puzzle, selection);
  const copy = COPY[puzzle.type];
  let points = 0, message, title;
  if (result.ok && result.optimal) {
    points = 1;
    message = copy.optimal(result.usedCount);
  } else if (result.ok) {
    const close = result.usedCount === result.minResources + 1;
    points = close ? 0.5 : 0;
    title = COPY.notOptimal;
    message = close ? copy.close(result.minResources) : copy.far(result.minResources, result.usedCount);
  } else {
    message = puzzle.type === 'scheduling'
      ? copy.conflict(result.sharedMember, result.v1Name, result.v2Name, selection[result.v1Id])
      : copy.conflict(result.v1Name, result.v2Name, puzzle.thresholdMiles);
    for (const id of [result.v1Id, result.v2Id]) root.querySelector(`select[data-vertex="${id}"]`).classList.add('is-invalid');
  }

  score.record(points);
  selects.forEach(s => { s.disabled = true; });
  $('.assign-form [type="submit"]').disabled = true;
  showFeedback($('.feedback'), { correct: points === 1, title, messageHtml: escapeHtml(message) });
  $('.feedback-next').focus();
}

export default {
  scored: true,

  mount(el, ctx) {
    root = el;
    score = ctx.score;
    organization = ORGANIZATIONS[Math.floor(Math.random() * ORGANIZATIONS.length)];
    loadStylesheet(new URL('./applications.css', import.meta.url));
    root.innerHTML = `
      <div class="info"><p>${COPY.info}</p></div>
      <div class="section">
        <h2 class="app-title"></h2>
        <p class="subtitle app-subtitle"></p>
        <p class="app-intro"></p>
        <p class="app-details"></p>
        <div class="app-data"></div>
        <p class="app-instructions"></p>
      </div>

      <form class="section assign-form">
        <h2>${COPY.assignTitle}</h2>
        <div class="assign-rows"></div>
        <button type="submit" class="primary-btn">${COPY.submit}</button>
        <p class="input-error" role="alert"></p>
      </form>

      ${feedbackHtml()}`;

    $('.assign-rows').addEventListener('change', event => event.target.classList.remove('is-invalid'));
    $('.assign-form').addEventListener('submit', event => {
      event.preventDefault();
      if (!$('.assign-form [type="submit"]').disabled) submit();
    });
    $('.feedback-next').addEventListener('click', newQuestion);
    newQuestion();
  },

  reset() {
    newQuestion();
  },
};

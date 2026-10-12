// Applications: graph coloring in disguise. Schedule committee meetings in as
// few time slots as possible, or assign radio frequencies to stations.
// Ported from legacy/graph-theory/applications-mode.js; spec in applications.md.
// Puzzle generation and checking (from APPLICATIONS_COMMITTEE_NAMES to
// validateApplicationsAssignment) were moved here unchanged from lib/graph.js,
// except that they use the local helpers below instead of graph.js's private ones.

import { shuffle, vertexId, vertexIndex } from '../lib/graph/core.js';
import { generatePlanarGraph } from '../lib/graph/planar.js';
import { chromaticNumber } from '../lib/graph/coloring.js';
import { escapeHtml, feedbackHtml, showFeedback, hideFeedback, loadStylesheet } from '../../shared/js/ui.js';

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const edgeKey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
const toEdges = indexEdges => indexEdges.map(({ s, t }) => ({ source: vertexId(s), target: vertexId(t), label: null }));
const makeNumberNames = n => Array.from({ length: n }, (_, i) => String(i + 1));

const ORGANIZATIONS = [
  'Metro Coordination Office',
  'Regional Planning Bureau',
  'Community Operations Council',
  'City Services Collaborative',
];

const TIME_SLOTS = ['9am-10am', '10am-11am', '11am-12pm', '1pm-2pm', '2pm-3pm', '3pm-4pm', '4pm-5pm'];

const COPY = {
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

// ---- Puzzle generation and checking ---------------------------------------

const APPLICATIONS_COMMITTEE_NAMES = [
    'Appeals Board', 'Welcoming Committee', 'Oversight Panel', 'Ethics Subcommittee', 'Grievance Council',
    'Advisory Circle', 'Review Board', 'Standards Committee', 'Nominations Panel', 'Steering Group',
    'Transition Team', 'Allocation Board', 'Credentials Committee', 'Incident Review Panel', 'Social Committee',
    'Recognition Board', 'Continuity Group', 'Founding Council', 'Exceptions Committee', 'Peripheral Affairs Bureau',
];

const APPLICATIONS_MEMBER_NAMES = [
    'Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Frank', 'Grace', 'Heidi', 'Ivan', 'Judy',
    'Karl', 'Leo', 'Mallory', 'Nina', 'Oscar', 'Peggy', 'Quentin', 'Rupert', 'Sybil', 'Trent',
    'Uma', 'Victor', 'Walter', 'Xavier', 'Yvonne', 'Zara', 'Abby', 'Ben', 'Cathy', 'Derek', 
    'Ella', 'Fred', 'Gina', 'Hank', 'Ivy', 'Jack', 'Kara', 'Liam', 'Mona', 'Nate', 'Olivia', 
    'Paul', 'Queen', 'Ralph', 'Sara', 'Tom', 'Ursula', 'Vince', 'Wendy', 'Xander', 'Yara', 'Zane',
];

const APPLICATIONS_LOCATION_NAMES = [
    'Downtown', 'Uptown', 'Suburbia', 'Industrial Park', 'University District', 'Waterfront',
    'Historic Quarter', 'Business Center', 'Residential Area', 'Cultural Hub', 'Tech Park', 'Greenbelt',
    'Airport', 'Shopping District', 'Entertainment Zone', 'Medical Center', 'Government Plaza', 'Sports Complex',
];

const APPLICATIONS_FREQUENCY_OPTIONS = ['540 kHz', '600 kHz', '700 kHz', '800 kHz', '900 kHz', '1000 kHz'];

const APPLICATIONS_SCHEDULING_CONFIG = {
    nMin: 5,
    nMax: 8,
    bipartiteWeight: 0.25,
    planarWeight: 0.50,
    k5Weight: 0.25,
    generationMaxChromatic: 5,
};

function _pickUniqueNames(pool, count, fallbackPrefix) {
    const shuffled = shuffle(pool.slice());
    const out = [];
    for (let i = 0; i < count; i++) {
        if (i < shuffled.length) out.push(shuffled[i]);
        else out.push(`${fallbackPrefix} ${i + 1}`);
    }
    return out;
}

function _makeBipartiteApplicationsGraph(n) {
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
        names: makeNumberNames(n),
        directed: false,
        edgeLabel: null,
        edges: toEdges(edges),
    };
}

function _makePlanarApplicationsGraph(n) {
    const g = generatePlanarGraph(n, 1.14, 1.55);
    return {
        n: g.n,
        names: makeNumberNames(g.n),
        directed: false,
        edgeLabel: null,
        edges: g.edges.slice(),
    };
}

function _makeK5ApplicationsGraph(n) {
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
        names: makeNumberNames(n),
        directed: false,
        edgeLabel: null,
        edges: toEdges(edges),
    };
}

function _generateSchedulingBaseGraph() {
    for (let attempt = 0; attempt < 60; attempt++) {
        const n = randInt(APPLICATIONS_SCHEDULING_CONFIG.nMin, APPLICATIONS_SCHEDULING_CONFIG.nMax);
        const roll = Math.random();

        let graph;
        if (roll < APPLICATIONS_SCHEDULING_CONFIG.bipartiteWeight) {
            graph = _makeBipartiteApplicationsGraph(n);
        } else if (roll < APPLICATIONS_SCHEDULING_CONFIG.bipartiteWeight + APPLICATIONS_SCHEDULING_CONFIG.planarWeight) {
            graph = _makePlanarApplicationsGraph(n);
        } else {
            graph = _makeK5ApplicationsGraph(Math.max(n, 5));
        }

        const minResources = chromaticNumber(graph, APPLICATIONS_SCHEDULING_CONFIG.generationMaxChromatic);
        if (!minResources || minResources > APPLICATIONS_SCHEDULING_CONFIG.generationMaxChromatic) continue;

        return { graph, minResources };
    }

    const fallback = _makeBipartiteApplicationsGraph(6);
    return { graph: fallback, minResources: 2 };
}

// Generates a scheduling puzzle by dressing up a graph coloring problem in
// committee/member language. The process works as follows:
//
// 1. A base graph is generated by _generateSchedulingBaseGraph (vertices =
//    committees, minResources = minimum time slots needed).
//
// 2. Each committee gets 1 unique member assigned to it, with a 35% chance of
//    receiving a second unique member. These members belong to only that committee.
//
// 3. For every edge (s, t) in the base graph, a single new member name is drawn
//    and added to BOTH committees s and t. This is the key structural step: it
//    encodes the graph's adjacency directly into shared membership. Two committees
//    share a member if and only if there is an edge between them.
//
// 4. The resulting puzzle asks: assign meeting time slots to committees such that
//    no two committees with a shared member meet at the same time. This is exactly
//    graph coloring — the minimum number of time slots required equals minResources
//    from the base puzzle.
function _generateSchedulingApplicationsPuzzle() {
    const { graph: base, minResources } = _generateSchedulingBaseGraph();
    const committeeNames = _pickUniqueNames(APPLICATIONS_COMMITTEE_NAMES, base.n, 'Committee');

    const committeeMembers = Array.from({ length: base.n }, () => []);
    const availableMembers = shuffle(APPLICATIONS_MEMBER_NAMES.slice());
    let syntheticMemberCounter = 1;

    function takeMemberName() {
        if (availableMembers.length > 0) return availableMembers.pop();
        const name = `Member ${syntheticMemberCounter}`;
        syntheticMemberCounter++;
        return name;
    }

    for (let i = 0; i < base.n; i++) {
        committeeMembers[i].push(takeMemberName());
        if (Math.random() < 0.35) committeeMembers[i].push(takeMemberName());
    }

    for (const e of base.edges) {
        const s = vertexIndex(e.source);
        const t = vertexIndex(e.target);
        const shared = takeMemberName();
        committeeMembers[s].push(shared);
        committeeMembers[t].push(shared);
    }

    const committees = Array.from({ length: base.n }, (_, i) => ({
        vertexId: vertexId(i),
        name: committeeNames[i],
        members: Array.from(new Set(committeeMembers[i])),
    }));

    const namesById = Object.fromEntries(committees.map(c => [c.vertexId, c.name]));

    return {
        type: 'scheduling',
        n: base.n,
        names: committeeNames,
        committees,
        edges: base.edges.slice(),
        minResources,
        namesById,
    };
}

function _distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
}

function _generateSeparatedPoints(n, minSep, maxTries = 4000) {
    const pts = [];
    let tries = 0;
    while (pts.length < n && tries < maxTries) {
        tries++;
        const p = { x: Math.random() * 2, y: Math.random() * 2 };
        let ok = true;
        for (const q of pts) {
            if (_distance(p, q) < minSep) { ok = false; break; }
        }
        if (ok) pts.push(p);
    }
    return pts.length === n ? pts : null;
}

function _pairwiseDistances(points) {
    const n = points.length;
    const d = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const dist = _distance(points[i], points[j]);
            d[i][j] = dist;
            d[j][i] = dist;
        }
    }
    return d;
}

function _mstBottleneckDistance(dist) {
    const n = dist.length;
    const edges = [];
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            edges.push({ i, j, w: dist[i][j] });
        }
    }
    edges.sort((a, b) => a.w - b.w);

    const parent = Array.from({ length: n }, (_, i) => i);
    const rank = new Array(n).fill(0);
    const find = x => {
        while (parent[x] !== x) {
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        return x;
    };
    const unite = (a, b) => {
        const ra = find(a);
        const rb = find(b);
        if (ra === rb) return false;
        if (rank[ra] < rank[rb]) parent[ra] = rb;
        else if (rank[rb] < rank[ra]) parent[rb] = ra;
        else { parent[rb] = ra; rank[ra]++; }
        return true;
    };

    let used = 0;
    let bottleneck = 0;
    for (const e of edges) {
        if (!unite(e.i, e.j)) continue;
        used++;
        if (e.w > bottleneck) bottleneck = e.w;
        if (used === n - 1) break;
    }
    return bottleneck;
}

function _buildInterferenceGraphFromDistance(dist, threshold) {
    const n = dist.length;
    const indexEdges = [];
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (dist[i][j] <= threshold) indexEdges.push({ s: i, t: j });
        }
    }
    return toEdges(indexEdges);
}

// Generates a frequency-assignment puzzle by constructing a geometric interference
// graph from randomly placed radio stations. The process works as follows:
//
// 1. n points are scattered randomly in a 2D unit square, representing station
//    locations. Points are kept at a minimum separation to avoid degenerate layouts.
//
// 2. Pairwise distances are computed. Two key distances characterise the layout:
//    - MST bottleneck: the longest edge in the minimum spanning tree. Any threshold
//      below this would disconnect the graph.
//    - Half-diameter: half the largest pairwise distance.
//
// 3. A raw interference threshold is chosen uniformly at random between the MST
//    bottleneck and 0.6× the diameter (or just 0.6× the diameter if it lies below
//    the bottleneck, which yields a disconnected graph ~25% of the time by design).
//    Using the full diameter would produce very dense graphs; this value was tuned
//    via simulation to keep the disconnected rate near 25%.
//
// 4. An edge is added between every pair of stations whose distance is ≤ the
//    threshold — these stations interfere with each other and must be assigned
//    different frequencies.
//
// 5. The raw coordinates and threshold are scaled so the closest pair of stations
//    is a random human-readable distance (100–500 miles apart).
//
// 6. The chromatic number of the interference graph is computed. This is the
//    minimum number of distinct frequencies required. If it exceeds the number of
//    available frequency options the attempt is discarded; up to 60 attempts are
//    made before falling back to a scheduling-style puzzle with dummy distances.
function _generateInterferenceApplicationsPuzzle() {
    for (let attempt = 0; attempt < 60; attempt++) {
        const n = randInt(APPLICATIONS_SCHEDULING_CONFIG.nMin, APPLICATIONS_SCHEDULING_CONFIG.nMax);
        const points = _generateSeparatedPoints(n, 0.05);
        if (!points) continue;

        const dist = _pairwiseDistances(points);
        let minDist = Infinity;
        let diameter = 0;
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const dij = dist[i][j];
                if (dij < minDist) minDist = dij;
                if (dij > diameter) diameter = dij;
            }
        }

        const connectThreshold = _mstBottleneckDistance(dist);
        const upperDiameter = diameter * 0.6;
        const thresholdRaw = upperDiameter >= connectThreshold
            ? connectThreshold + Math.random() * (upperDiameter - connectThreshold)
            : upperDiameter;

        const targetMinMiles = Number((randInt(100, 500) / 100).toFixed(2));
        const scale = targetMinMiles / minDist;
        const thresholdMiles = Number((thresholdRaw * scale).toFixed(2));

        const edgeList = _buildInterferenceGraphFromDistance(dist, thresholdRaw);
        const graph = {
            n,
            names: _pickUniqueNames(APPLICATIONS_LOCATION_NAMES, n, 'Station'),
            directed: false,
            edgeLabel: null,
            edges: edgeList,
        };

        const minResources = chromaticNumber(graph, APPLICATIONS_FREQUENCY_OPTIONS.length);
        if (!minResources || minResources > APPLICATIONS_FREQUENCY_OPTIONS.length) continue;

        const normalizedDistance = Array.from({ length: n }, (_, i) =>
            Array.from({ length: n }, (_, j) => Number((dist[i][j] * scale).toFixed(2)))
        );

        return {
            type: 'interference',
            n,
            names: graph.names,
            stations: graph.names.slice(),
            edges: graph.edges,
            minResources,
            thresholdMiles,
            distanceMiles: normalizedDistance,
            frequencyOptions: APPLICATIONS_FREQUENCY_OPTIONS.slice(),
            namesById: Object.fromEntries(Array.from({ length: n }, (_, i) => [vertexId(i), graph.names[i]])),
        };
    }

    const fallback = _generateSchedulingApplicationsPuzzle();
    return {
        type: 'interference',
        n: fallback.n,
        names: fallback.names,
        stations: fallback.names.slice(),
        edges: fallback.edges,
        minResources: fallback.minResources,
        thresholdMiles: 3,
        distanceMiles: Array.from({ length: fallback.n }, (_, i) =>
            Array.from({ length: fallback.n }, (_, j) => (i === j ? 0 : 3.01))
        ),
        frequencyOptions: APPLICATIONS_FREQUENCY_OPTIONS.slice(),
        namesById: fallback.namesById,
    };
}

export function generateApplicationsPuzzle() {
    return Math.random() < 0.5
        ? _generateSchedulingApplicationsPuzzle()
        : _generateInterferenceApplicationsPuzzle();
}

function _sharedMembersForEdge(puzzle, sourceId, targetId) {
    if (!puzzle || puzzle.type !== 'scheduling') return [];
    const committees = Array.isArray(puzzle.committees) ? puzzle.committees : [];
    const byId = Object.fromEntries(committees.map(c => [c.vertexId, c]));
    const s = byId[sourceId];
    const t = byId[targetId];
    if (!s || !t) return [];
    const sSet = new Set(s.members || []);
    return (t.members || []).filter(m => sSet.has(m));
}

export function validateApplicationsAssignment(puzzle, assignmentByVertexId) {
    if (!puzzle || !Array.isArray(puzzle.edges)) return { ok: false, reason: 'incomplete' };

    const n = Number(puzzle.n) || 0;
    const used = new Set();

    for (let i = 0; i < n; i++) {
        const vid = vertexId(i);
        const value = String(assignmentByVertexId?.[vid] || '').trim();
        if (!value) return { ok: false, reason: 'incomplete' };
        used.add(value);
    }

    for (const e of puzzle.edges) {
        const a = String(assignmentByVertexId?.[e.source] || '').trim();
        const b = String(assignmentByVertexId?.[e.target] || '').trim();
        if (!a || !b) return { ok: false, reason: 'incomplete' };
        if (a === b) {
            const shared = _sharedMembersForEdge(puzzle, e.source, e.target);
            return {
                ok: false,
                reason: 'conflict',
                v1Id: e.source,
                v2Id: e.target,
                v1Name: puzzle.namesById?.[e.source] || e.source,
                v2Name: puzzle.namesById?.[e.target] || e.target,
                sharedMember: shared[0] || null,
            };
        }
    }

    const usedCount = used.size;
    const minResources = Number(puzzle.minResources) || usedCount;
    return {
        ok: true,
        usedCount,
        minResources,
        optimal: usedCount === minResources,
    };
}

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

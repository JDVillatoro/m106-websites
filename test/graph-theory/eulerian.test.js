// Eulerian Graphs mode (graph-theory/modes/eulerian.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeLabels, vertexId } from '../../graph-theory/lib/graph/core.js';
import {
  generateEulerianGraphPuzzle, validateEulerianCircuitSimple, validateEulerianCircuitMulti,
  validateEulerianCircuitDigraph, validateEulerization,
} from '../../graph-theory/modes/eulerian.js';
import { useBrowser, scoreText, checkScoreSavedAndReset } from '../helpers/browser.js';
import { graphOnScreen, isEulerian, degrees, eulerianCircuit, circuitText, eulerizingEdges } from '../helpers/graph-on-screen.js';

/** Graph from [from, to, label?] triples over vertices A, B, C, ... */
function graph(n, triples, { directed = false } = {}) {
  return {
    n, names: makeLabels(n), directed, edgeLabel: triples.some(t => t[2]) ? 'name' : null,
    edges: triples.map(([s, t, label = null]) => ({ source: vertexId(s), target: vertexId(t), label })),
  };
}
const split = s => s.split('');

test('checking Eulerian circuits', () => {
  const triangle = graph(3, [[0, 1], [1, 2], [2, 0]]);
  assert.equal(validateEulerianCircuitSimple(split('ABCA'), triangle, true), true);
  assert.equal(validateEulerianCircuitSimple(split('ACBA'), triangle, true), true);
  assert.equal(validateEulerianCircuitSimple(split('ABC'), triangle, true), false);    // not closed
  assert.equal(validateEulerianCircuitSimple(split('ABA'), triangle, true), false);    // reuses AB

  const cycle = graph(3, [[0, 1], [1, 2], [2, 0]], { directed: true });
  assert.equal(validateEulerianCircuitDigraph(split('ABCA'), cycle), true);
  assert.equal(validateEulerianCircuitDigraph(split('ACBA'), cycle), false);           // against arrows

  // Two parallel edges a, b between A and B.
  const pair = graph(2, [[0, 1, 'a'], [1, 0, 'b']]);
  assert.equal(validateEulerianCircuitMulti('AaBbA', pair, true), true);
  assert.equal(validateEulerianCircuitMulti('AaBaA', pair, true), false);              // edge a twice
  assert.equal(validateEulerianCircuitMulti('ABA', pair, true), false);                // no edge labels
});

test('checking Eulerizations', () => {
  const path = graph(3, [[0, 1], [1, 2]]);   // A-B-C: A and C are odd
  assert.deepEqual(validateEulerization(path, [{ from: 'A', to: 'B' }, { from: 'b', to: 'c' }]), { ok: true });
  assert.equal(validateEulerization(path, [{ from: 'A', to: 'C' }]).reason, 'not_duplicate');
  assert.equal(validateEulerization(path, [{ from: 'A', to: 'B' }]).reason, 'not_eulerian');
  assert.equal(validateEulerization(path, [{ from: 'A', to: 'Q' }]).reason, 'invalid_vertices');
});

test('puzzles: isEulerian matches the definition; multigraph edges are labelled', () => {
  for (let i = 0; i < 60; i++) {
    const p = generateEulerianGraphPuzzle();
    const names = p.names;
    const onScreen = {
      names, directed: p.directed,
      edges: p.edges.map(e => ({ from: names[+e.source.slice(1)], to: names[+e.target.slice(1)], label: e.label })),
    };
    assert.equal(p.isEulerian, isEulerian(onScreen));
    if (p.isMulti) assert.ok(p.edges.every(e => /^[a-z]$/.test(e.label)));
  }
});

const site = useBrowser();

test('all three kinds of part 2, scoring, reset', async () => {
  const { page, errors, close } = await site.openPage('graph-theory/#eulerian');
  await page.waitForSelector('.graph-viewport canvas');
  const seen = new Set();
  let questions = 0;

  // Answer questions correctly until every kind of part 2 has come up.
  while (seen.size < 3 && questions < 40) {
    const g = await graphOnScreen(page);
    const eulerian = isEulerian(g);
    await page.click(`.part1 .choice-btn[data-answer="${eulerian ? 'yes' : 'no'}"]`);
    questions++;
    assert.match(await page.locator('.part1 .choice-btn.is-correct').innerText(), /Eulerian/);

    if (eulerian) {
      seen.add('circuit');
      await page.fill('.circuit-input', circuitText(g, eulerianCircuit(g)));
      await page.press('.circuit-input', 'Enter');
    } else if (g.directed) {
      seen.add('identify');
      const { inDeg, outDeg } = degrees(g);
      for (const name of g.names.filter(n => inDeg[n] !== outDeg[n])) {
        await page.check(`.vertex-options input[value="${name}"]`);
      }
      await page.click('.part2-identify [type="submit"]');
    } else {
      seen.add('eulerize');
      const edges = eulerizingEdges(g);
      for (let k = 0; k < edges.length; k++) {
        if (k > 0) await page.click('.edge-add');
        await page.fill(`.edge-input-row:nth-child(${k + 1}) .edge-from`, edges[k].from.toLowerCase());
        await page.fill(`.edge-input-row:nth-child(${k + 1}) .edge-to`, edges[k].to);
      }
      await page.click('.part2-eulerize [type="submit"]');
    }
    assert.equal(await page.locator('.feedback-title').innerText(), 'Correct',
      await page.locator('.feedback-message').innerText());
    assert.equal(await scoreText(page), `Questions: ${questions} Points: ${questions} Score: 100%`);
    await page.click('.feedback-next');
  }
  assert.equal(seen.size, 3, `only saw ${[...seen]}`);

  // Part 1 wrong: half the question lost, no part 2.
  const g = await graphOnScreen(page);
  await page.click(`.part1 .choice-btn[data-answer="${isEulerian(g) ? 'no' : 'yes'}"]`);
  assert.equal(await page.locator('.feedback-title').innerText(), 'Not quite');
  assert.equal(await page.locator('.part2:not([hidden])').count(), 0);
  const points = questions;
  questions++;
  assert.equal(await scoreText(page), `Questions: ${questions} Points: ${points} Score: ${Math.round(points / questions * 100)}%`);

  await checkScoreSavedAndReset(page, await scoreText(page));
  assert.deepEqual(errors, []);
  await close();
});

test('part 2 wrong answers and input mistakes', async () => {
  const { page, errors, close } = await site.openPage('graph-theory/#eulerian');
  await page.waitForSelector('.graph-viewport canvas');
  const kinds = new Set();
  for (let i = 0; i < 40 && kinds.size < 2; i++) {
    const g = await graphOnScreen(page);
    const eulerian = isEulerian(g);
    if (eulerian) {
      await page.click('.part1 .choice-btn[data-answer="yes"]');
      // Empty: a message, no answer yet.
      await page.press('.circuit-input', 'Enter');
      assert.match(await page.locator('.part2-circuit .input-error').innerText(), /Type the circuit/);
      await page.fill('.circuit-input', 'AB');
      await page.press('.circuit-input', 'Enter');
      assert.equal(await page.locator('.feedback-title').innerText(), 'Not quite');
      kinds.add('circuit');
    } else if (!g.directed) {
      await page.click('.part1 .choice-btn[data-answer="no"]');
      // A vertex that doesn't exist: a message, the form stays open.
      await page.fill('.edge-from', 'Z');
      await page.fill('.edge-to', 'A');
      await page.click('.part2-eulerize [type="submit"]');
      assert.match(await page.locator('.part2-eulerize .input-error').innerText(), /Z–A/);
      assert.ok(await page.locator('.feedback').isHidden());
      // Nothing added: still not Eulerian.
      await page.click('.edge-remove');
      await page.click('.part2-eulerize [type="submit"]');
      assert.equal(await page.locator('.feedback-title').innerText(), 'Not quite');
      assert.match(await page.locator('.feedback-message').innerText(), /still not Eulerian/);
      kinds.add('eulerize');
    } else {
      await page.click('.part1 .choice-btn[data-answer="no"]');
      await page.click('.part2-identify [type="submit"]');
      assert.equal(await page.locator('.feedback-title').innerText(), 'Not quite');
    }
    await page.click('.feedback-next');
  }
  assert.equal(kinds.size, 2);
  assert.deepEqual(errors, []);
  await close();
});

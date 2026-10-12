// Hamiltonian Graphs mode (graph-theory/modes/hamiltonian.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateHamiltonianPuzzle, validateHamiltonianCycleNN, validateHamiltonianCycleSE,
} from '../../graph-theory/modes/hamiltonian.js';
import { useBrowser, scoreText, checkScoreSavedAndReset } from '../helpers/browser.js';
import {
  graphOnScreen, hamiltonianCycle, nearestNeighborCycle, sortedEdgeCycle, nonHamiltonianReasons,
} from '../helpers/graph-on-screen.js';

const asNames = p => ({
  names: p.names,
  edges: p.edges.map(e => ({ from: p.names[+e.source.slice(1)], to: p.names[+e.target.slice(1)], label: e.label })),
});

test('puzzles: Hamiltonian or not as stated, reasons right, strategies work', () => {
  for (let i = 0; i < 300; i++) {
    const p = generateHamiltonianPuzzle();
    const g = asNames(p);
    assert.equal(p.isHamiltonian, hamiltonianCycle(g) !== null);
    if (!p.isHamiltonian) {
      assert.deepEqual([...p.nonHamiltonianReasons].sort(), nonHamiltonianReasons(g).sort());
    } else if (p.strategy === 'nearest_neighbor') {
      // The start vertex is always set, including vertex A (index 0).
      assert.equal(typeof p.startVertex, 'number');
      assert.equal(validateHamiltonianCycleNN(nearestNeighborCycle(g, p.names[p.startVertex]).join(''), p).valid, true);
    } else if (p.strategy === 'sorted_edge') {
      assert.equal(validateHamiltonianCycleSE(sortedEdgeCycle(g).join(' '), p).valid, true);
    }
  }
});

const site = useBrowser();

const nodePositions = page => page.evaluate(() =>
  document.querySelector('.mode-panel:not([hidden]) .graph-viewport')._cyreg.cy.nodes()
    .map(n => `${n.data('displayName')}@${Math.round(n.position('x'))},${Math.round(n.position('y'))}`));

test('every kind of part 2, weights revealed in place, scoring, reset', async () => {
  const { page, errors, close } = await site.openPage('graph-theory/#hamiltonian');
  await page.waitForSelector('.graph-viewport canvas');
  const seen = new Set();
  let questions = 0;
  while (seen.size < 4 && questions < 60) {
    const before = await graphOnScreen(page);
    assert.ok(before.edges.every(e => e.label === null), 'weights hidden before part 1');
    const cycle = hamiltonianCycle(before);
    const positions = await nodePositions(page);
    await page.click(`.part1 .choice-btn[data-answer="${cycle ? 'yes' : 'no'}"]`);
    questions++;

    if (!cycle) {
      seen.add('why');
      const [reason] = nonHamiltonianReasons(before);
      await page.click(`.part2-why .choice-btn[data-answer="${reason}"]`);
    } else {
      const instructions = await page.locator('.cycle-instructions').innerText();
      const g = await graphOnScreen(page);
      let answer;
      if (/nearest neighbor/.test(instructions)) {
        seen.add('nn');
        const start = instructions.match(/Start at vertex (\w+)/)[1];
        assert.notEqual(start, 'undefined');
        answer = nearestNeighborCycle(g, start).join('');
      } else if (/sorted edge/.test(instructions)) {
        seen.add('se');
        answer = sortedEdgeCycle(g).join(' ');
      } else {
        seen.add('free');
        assert.ok(g.edges.every(e => e.label === null), 'no weights for freeform');
        answer = cycle.join('') + cycle[0];
      }
      // Revealing weights doesn't move the vertices.
      assert.deepEqual(await nodePositions(page), positions);
      await page.fill('.cycle-input', answer);
      await page.press('.cycle-input', 'Enter');
    }
    assert.equal(await page.locator('.feedback-title').innerText(), 'Correct',
      await page.locator('.feedback-message').innerText());
    assert.ok(await page.locator('.feedback-retry').isHidden());
    assert.equal(await scoreText(page), `Questions: ${questions} Points: ${questions} Score: 100%`);
    await page.click('.feedback-next');
  }
  assert.equal(seen.size, 4, `only saw ${[...seen]}`);
  await checkScoreSavedAndReset(page, await scoreText(page));
  assert.deepEqual(errors, []);
  await close();
});

test('wrong cycle: try again on the same graph, then right', async () => {
  const { page, errors, close } = await site.openPage('graph-theory/#hamiltonian');
  await page.waitForSelector('.graph-viewport canvas');
  for (let i = 0; i < 40; i++) {
    const g = await graphOnScreen(page);
    const cycle = hamiltonianCycle(g);
    if (!cycle) { await page.click('.feedback-next').catch(() => {}); await page.click('.reset-btn'); continue; }
    await page.click('.part1 .choice-btn[data-answer="yes"]');
    const instructions = await page.locator('.cycle-instructions').innerText();
    if (!/Specify a Hamiltonian cycle/.test(instructions)) { await page.click('.reset-btn'); continue; }

    await page.press('.cycle-input', 'Enter');
    assert.equal(await page.locator('.part2-cycle .input-error').innerText(), 'Type the cycle first.');
    await page.fill('.cycle-input', cycle.slice(0, -1).join(''));   // misses a vertex
    await page.press('.cycle-input', 'Enter');
    assert.equal(await page.locator('.feedback-title').innerText(), 'Not quite');
    assert.match(await page.locator('.feedback-message').innerText(), /doesn't visit vertex/);
    assert.equal(await scoreText(page), 'Questions: 1 Points: 0.5 Score: 50%');

    await page.click('.feedback-retry');
    assert.ok(await page.locator('.feedback').isHidden());
    await page.fill('.cycle-input', cycle.join(''));
    await page.press('.cycle-input', 'Enter');
    assert.equal(await page.locator('.feedback-title').innerText(), 'Correct');
    assert.equal(await scoreText(page), 'Questions: 1 Points: 1 Score: 100%');
    assert.deepEqual(errors, []);
    await close();
    return;
  }
  assert.fail('no freeform puzzle came up');
});

test('wrong reason is final', async () => {
  const { page, errors, close } = await site.openPage('graph-theory/#hamiltonian');
  await page.waitForSelector('.graph-viewport canvas');
  for (let i = 0; i < 60; i++) {
    const g = await graphOnScreen(page);
    if (hamiltonianCycle(g)) { await page.click('.reset-btn'); continue; }
    const reasons = nonHamiltonianReasons(g);
    const wrong = ['leaf', 'cut_vertex', 'bipartite_unequal'].find(r => !reasons.includes(r));
    if (!wrong) { await page.click('.reset-btn'); continue; }
    await page.click('.part1 .choice-btn[data-answer="no"]');
    await page.click(`.part2-why .choice-btn[data-answer="${wrong}"]`);
    assert.equal(await page.locator('.feedback-title').innerText(), 'Not quite');
    assert.match(await page.locator('.feedback-message').innerText(), /not Hamiltonian because/);
    assert.ok(await page.locator('.feedback-retry').isHidden());
    assert.equal(await page.locator('.part2-why .choice-btn:not([disabled])').count(), 0);
    assert.deepEqual(errors, []);
    await close();
    return;
  }
  assert.fail('no suitable non-Hamiltonian puzzle came up');
});

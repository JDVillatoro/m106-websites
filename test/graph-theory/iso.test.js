// Isomorphism mode (graph-theory/modes/iso.js, puzzles from lib/graph.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateIsoPuzzle } from '../../graph-theory/lib/graph.js';
import { useBrowser, scoreText, checkScoreSavedAndReset } from '../helpers/browser.js';
import { graphOnScreen } from '../helpers/graph-on-screen.js';

const edgeSet = (g, rename = x => x) => new Set(g.edges.map(e => [rename(e.from), rename(e.to)].sort().join('-')));
const sameSet = (a, b) => a.size === b.size && [...a].every(x => b.has(x));

function permutations(items) {
  if (items.length <= 1) return [items];
  return items.flatMap((x, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map(p => [x, ...p]));
}

/** 'equal', 'isomorphic' (with a mapping) or 'neither'. */
function relation(g1, g2) {
  const sameNames = g1.names.length === g2.names.length && g1.names.every(n => g2.names.includes(n));
  if (sameNames && sameSet(edgeSet(g1), edgeSet(g2))) return { kind: 'equal' };
  if (g1.names.length === g2.names.length && g1.edges.length === g2.edges.length) {
    const target = edgeSet(g2);
    for (const perm of permutations(g2.names)) {
      const map = Object.fromEntries(g1.names.map((n, i) => [n, perm[i]]));
      if (sameSet(edgeSet(g1, v => map[v]), target)) return { kind: 'isomorphic', map };
    }
  }
  return { kind: 'neither' };
}

/** A reason the graphs differ, from invariants computed here. */
function differingReason(g1, g2) {
  const degSeq = g => g.names.map(n => g.edges.filter(e => e.from === n || e.to === n).length).sort().join();
  const components = g => {
    const seen = new Set(); let count = 0;
    for (const s of g.names) {
      if (seen.has(s)) continue;
      count++; const stack = [s]; seen.add(s);
      while (stack.length) {
        const u = stack.pop();
        for (const e of g.edges) {
          const w = e.from === u ? e.to : e.to === u ? e.from : null;
          if (w && !seen.has(w)) { seen.add(w); stack.push(w); }
        }
      }
    }
    return count;
  };
  const triangles = g => {
    const has = (a, b) => g.edges.some(e => (e.from === a && e.to === b) || (e.from === b && e.to === a));
    let t = 0;
    for (let i = 0; i < g.names.length; i++) for (let j = i + 1; j < g.names.length; j++) for (let k = j + 1; k < g.names.length; k++) {
      const [a, b, c] = [g.names[i], g.names[j], g.names[k]];
      if (has(a, b) && has(b, c) && has(a, c)) t++;
    }
    return t;
  };
  if (g1.names.length !== g2.names.length) return 'diff_vertices';
  if (g1.edges.length !== g2.edges.length) return 'diff_edges';
  if (degSeq(g1) !== degSeq(g2)) return 'diff_degree_seq';
  if (components(g1) !== components(g2)) return 'diff_components';
  if (triangles(g1) !== triangles(g2)) return 'diff_triangles';
  return null;
}

const asNames = g => ({
  names: g.names,
  edges: g.edges.map(e => ({ from: g.names[+e.source.slice(1)], to: g.names[+e.target.slice(1)] })),
});

test('puzzles: the stated relation is the real one, and neither has a listed reason', () => {
  for (let i = 0; i < 200; i++) {
    const p = generateIsoPuzzle();
    const [g1, g2] = [asNames(p.g1), asNames(p.g2)];
    assert.equal(relation(g1, g2).kind, p.scenario);
    if (p.scenario === 'neither') assert.notEqual(differingReason(g1, g2), null);
  }
});

const site = useBrowser();

test('equal, isomorphic and neither: scoring and reset', async () => {
  const { page, errors, close } = await site.openPage('graph-theory/#iso');
  await page.waitForSelector('.graph-viewport canvas');
  const seen = new Set();
  let questions = 0;
  while (seen.size < 3 && questions < 30) {
    const g1 = await graphOnScreen(page, 0), g2 = await graphOnScreen(page, 1);
    const r = relation(g1, g2);
    seen.add(r.kind);
    await page.click(`.part1 .choice-btn[data-answer="${r.kind}"]`);
    questions++;
    if (r.kind === 'isomorphic') {
      for (const [i, name] of g1.names.entries()) {
        // Rows follow graph 1's vertex order, which graphOnScreen also uses.
        await page.selectOption(`#iso-map-${i}`, r.map[name]);
      }
      await page.click('.part2-mapping [type="submit"]');
    } else if (r.kind === 'neither') {
      await page.check(`input[name="iso-reason"][value="${differingReason(g1, g2)}"]`);
      await page.click('.part2-reason [type="submit"]');
    }
    assert.equal(await page.locator('.feedback-title').innerText(), 'Correct',
      await page.locator('.feedback-message').innerText());
    assert.equal(await scoreText(page), `Questions: ${questions} Points: ${questions} Score: 100%`);
    await page.click('.feedback-next');
  }
  assert.equal(seen.size, 3);
  await checkScoreSavedAndReset(page, await scoreText(page));
  assert.deepEqual(errors, []);
  await close();
});

test('missing answers and wrong answers', async () => {
  const { page, errors, close } = await site.openPage('graph-theory/#iso');
  await page.waitForSelector('.graph-viewport canvas');
  const seen = new Set();
  for (let i = 0; i < 40 && seen.size < 2; i++) {
    const g1 = await graphOnScreen(page, 0), g2 = await graphOnScreen(page, 1);
    const r = relation(g1, g2);
    if (r.kind === 'isomorphic' && !seen.has('map')) {
      await page.click('.part1 .choice-btn[data-answer="isomorphic"]');
      await page.click('.part2-mapping [type="submit"]');
      assert.match(await page.locator('.part2-mapping .input-error').innerText(), /every vertex/);
      // Everything to the same vertex: not an isomorphism.
      for (let k = 0; k < g1.names.length; k++) await page.selectOption(`#iso-map-${k}`, g2.names[0]);
      await page.click('.part2-mapping [type="submit"]');
      assert.equal(await page.locator('.feedback-title').innerText(), 'Incorrect');
      assert.match(await page.locator('.feedback-message').innerText(), /A correct answer could be: .+→/);
      seen.add('map');
    } else if (r.kind === 'neither' && !seen.has('reason')) {
      await page.click('.part1 .choice-btn[data-answer="neither"]');
      await page.click('.part2-reason [type="submit"]');
      assert.equal(await page.locator('.part2-reason .input-error').innerText(), 'Pick a reason before submitting.');
      seen.add('reason');
      await page.click('.reset-btn');
      continue;
    } else {
      await page.click('.reset-btn');
      continue;
    }
    await page.click('.feedback-next');
  }
  assert.equal(seen.size, 2);
  assert.deepEqual(errors, []);
  await close();
});

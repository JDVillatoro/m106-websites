// Reading the graph a mode is showing, and solving it, for browser tests of
// graph theory modes. The solvers are written independently of the site's
// code, so a test doesn't just repeat the code it's checking.

/**
 * The graph in the visible graph area (or the n-th graph area in the panel),
 * from Cytoscape: { names, directed, edges: [{ from, to, label }] }.
 */
export function graphOnScreen(page, index = 0) {
  return page.evaluate(i => {
    const el = document.querySelectorAll('.mode-panel:not([hidden]) .graph-viewport')[i];
    const cy = el._cyreg.cy;
    const name = id => cy.getElementById(id).data('displayName');
    const edges = cy.edges().map(e => ({
      from: name(e.data('source')),
      to: name(e.data('target')),
      label: e.data('label') ?? null,
      directed: e.data('directed') === 'yes',
    }));
    return {
      names: cy.nodes().map(n => n.data('displayName')),
      directed: edges.some(e => e.directed),
      edges,
    };
  }, index);
}

/** Degree (undirected; a loop counts 2), or in- and out-degree (directed). */
export function degrees({ names, edges }) {
  const deg = Object.fromEntries(names.map(n => [n, 0]));
  const inDeg = { ...deg }, outDeg = { ...deg };
  for (const { from, to } of edges) {
    deg[from]++; deg[to]++;
    outDeg[from]++; inDeg[to]++;
  }
  return { deg, inDeg, outDeg };
}

/** Is every vertex with an edge reachable from every other (ignoring direction)? */
function connected({ names, edges }, directedReach = false) {
  const adj = Object.fromEntries(names.map(n => [n, []]));
  for (const { from, to } of edges) {
    adj[from].push(to);
    if (!directedReach) adj[to].push(from);
  }
  const used = names.filter(n => edges.some(e => e.from === n || e.to === n));
  if (used.length === 0) return true;
  const reach = start => {
    const seen = new Set([start]), stack = [start];
    while (stack.length) for (const w of adj[stack.pop()]) if (!seen.has(w)) { seen.add(w); stack.push(w); }
    return seen;
  };
  if (!directedReach) return used.every(n => reach(used[0]).has(n));
  return used.every(a => { const r = reach(a); return used.every(b => r.has(b)); });
}

export function isEulerian(graph) {
  const { deg, inDeg, outDeg } = degrees(graph);
  if (graph.directed) return graph.names.every(n => inDeg[n] === outDeg[n]) && connected(graph, true);
  return graph.names.every(n => deg[n] % 2 === 0) && connected(graph);
}

/**
 * An Eulerian circuit (Hierholzer), as the list of steps
 * [{ vertex }, { edge }, { vertex }, ...] starting and ending at the same vertex.
 */
export function eulerianCircuit(graph) {
  const remaining = graph.edges.map((e, i) => ({ ...e, i, used: false }));
  const start = graph.edges[0].from;
  const stack = [{ vertex: start, edge: null }];
  const circuit = [];
  while (stack.length) {
    const top = stack[stack.length - 1];
    const next = remaining.find(e => !e.used
      && (e.from === top.vertex || (!graph.directed && e.to === top.vertex)));
    if (next) {
      next.used = true;
      const other = next.from === top.vertex ? next.to : next.from;
      stack.push({ vertex: other, edge: next });
    } else {
      circuit.push(stack.pop());
    }
  }
  return circuit.reverse();
}

/** Circuit as typed by a student: 'ABCA', or 'AaBbCcA' for labelled multigraph edges. */
export function circuitText(graph, circuit) {
  const multi = graph.edges.some(e => e.label);
  return circuit.map((step, i) => (multi && i > 0 ? step.edge.label : '') + step.vertex).join('');
}

/**
 * Edges to add (duplicates of existing edges) that make an undirected graph
 * Eulerian: pair up odd vertices and duplicate a shortest path between each pair.
 */
export function eulerizingEdges(graph) {
  const { deg } = degrees(graph);
  const odd = graph.names.filter(n => deg[n] % 2 === 1);
  const added = [];
  for (let k = 0; k < odd.length; k += 2) {
    const [a, b] = [odd[k], odd[k + 1]];
    const prev = { [a]: null };
    const queue = [a];
    while (queue.length && !(b in prev)) {
      const u = queue.shift();
      for (const e of graph.edges) {
        const w = e.from === u ? e.to : e.to === u ? e.from : null;
        if (w !== null && !(w in prev)) { prev[w] = u; queue.push(w); }
      }
    }
    for (let v = b; prev[v] !== null; v = prev[v]) added.push({ from: prev[v], to: v });
  }
  return added;
}

/** All k-element subsets of `items`. */
function subsets(items, k, start = 0, picked = []) {
  if (picked.length === k) return [picked];
  const out = [];
  for (let i = start; i < items.length; i++) out.push(...subsets(items, k, i + 1, [...picked, items[i]]));
  return out;
}

function adjacency({ names, edges }) {
  const adj = Object.fromEntries(names.map(n => [n, new Set()]));
  for (const { from, to } of edges) if (from !== to) { adj[from].add(to); adj[to].add(from); }
  return adj;
}

/** Does the graph contain K5 as a subgraph (five vertices, all joined)? */
export function containsK5(graph) {
  const adj = adjacency(graph);
  return subsets(graph.names, 5).some(s => s.every(a => s.every(b => a === b || adj[a].has(b))));
}

/** Does the graph contain K3,3 as a subgraph (two groups of three, every pair across joined)? */
export function containsK33(graph) {
  const adj = adjacency(graph);
  return subsets(graph.names, 6).some(six => subsets(six, 3).some(left => {
    const right = six.filter(v => !left.includes(v));
    return left.every(a => right.every(b => adj[a].has(b)));
  }));
}

/** A Hamiltonian cycle as a list of vertex names (first not repeated), or null. Brute force. */
export function hamiltonianCycle(graph) {
  const adj = adjacency(graph);
  const [first, ...rest] = graph.names;
  const path = [first];
  const used = new Set(path);
  const extend = () => {
    if (path.length === graph.names.length) return adj[path[path.length - 1]].has(first);
    for (const v of rest) {
      if (used.has(v) || !adj[path[path.length - 1]].has(v)) continue;
      path.push(v); used.add(v);
      if (extend()) return true;
      path.pop(); used.delete(v);
    }
    return false;
  };
  return graph.names.length >= 3 && extend() ? path : null;
}

const weightOf = e => Number(e.label);

/** Nearest neighbor from `start`, using edge labels as weights. */
export function nearestNeighborCycle(graph, start) {
  const path = [start];
  while (path.length < graph.names.length) {
    const here = path[path.length - 1];
    const options = graph.edges
      .filter(e => (e.from === here && !path.includes(e.to)) || (e.to === here && !path.includes(e.from)))
      .sort((a, b) => weightOf(a) - weightOf(b));
    const e = options[0];
    path.push(e.from === here ? e.to : e.from);
  }
  return path;
}

/** Sorted edge: cheapest edges first, skipping any that give a vertex degree 3 or close a cycle early. */
export function sortedEdgeCycle(graph) {
  const n = graph.names.length;
  const chosen = [];
  const deg = Object.fromEntries(graph.names.map(v => [v, 0]));
  const group = Object.fromEntries(graph.names.map(v => [v, v]));
  const find = v => (group[v] === v ? v : (group[v] = find(group[v])));
  for (const e of [...graph.edges].sort((a, b) => weightOf(a) - weightOf(b))) {
    if (deg[e.from] === 2 || deg[e.to] === 2) continue;
    if (find(e.from) === find(e.to) && chosen.length !== n - 1) continue;
    chosen.push(e); deg[e.from]++; deg[e.to]++;
    group[find(e.from)] = find(e.to);
    if (chosen.length === n) break;
  }
  // Walk the chosen edges into a cycle.
  const path = [graph.names[0]];
  while (path.length < n) {
    const here = path[path.length - 1];
    const e = chosen.find(c => (c.from === here && !path.includes(c.to)) || (c.to === here && !path.includes(c.from)));
    path.push(e.from === here ? e.to : e.from);
  }
  return path;
}

/** Reasons a graph can't be Hamiltonian: 'leaf', 'cut_vertex', 'bipartite_unequal'. */
export function nonHamiltonianReasons(graph) {
  const adj = adjacency(graph);
  const reasons = [];
  if (graph.names.some(v => adj[v].size === 1)) reasons.push('leaf');
  const componentsWithout = removed => {
    const left = graph.names.filter(v => v !== removed);
    const seen = new Set();
    let count = 0;
    for (const s of left) {
      if (seen.has(s)) continue;
      count++;
      const stack = [s]; seen.add(s);
      while (stack.length) for (const w of adj[stack.pop()]) if (w !== removed && !seen.has(w)) { seen.add(w); stack.push(w); }
    }
    return count;
  };
  const base = componentsWithout(null);
  if (graph.names.some(v => componentsWithout(v) > base)) reasons.push('cut_vertex');
  const side = {};
  let bipartite = true;
  for (const s of graph.names) {
    if (s in side) continue;
    side[s] = 0;
    const stack = [s];
    while (stack.length) {
      const u = stack.pop();
      for (const w of adj[u]) {
        if (!(w in side)) { side[w] = 1 - side[u]; stack.push(w); } else if (side[w] === side[u]) bipartite = false;
      }
    }
  }
  const zeros = Object.values(side).filter(x => x === 0).length;
  if (bipartite && zeros * 2 !== graph.names.length) reasons.push('bipartite_unequal');
  return reasons;
}

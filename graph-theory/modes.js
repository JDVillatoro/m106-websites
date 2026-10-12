// Graph theory modes, in order. The topic page (graph-theory/) lists them as
// cards; graph-theory/#<id> opens one. `description` is the line on its card;
// `tool: true` marks a mode without a score (its card says "Tool").
// To add a mode, write modes/<name>.js and add an entry here (see docs/adding-modes.md).

export default [
  { id: 'make', title: 'Make a Graph', tool: true, load: () => import('./modes/make.js'),
    description: 'Draw your own graph, then download it or get a text description.' },
  { id: 'degree', title: 'Degree Sequences', load: () => import('./modes/degree.js'),
    description: 'Write the degree sequence of a graph.' },
  { id: 'eulerian', title: 'Eulerian Graphs', load: () => import('./modes/eulerian.js'),
    description: 'Decide whether a graph is Eulerian, then find a circuit or fix the graph.' },
  { id: 'iso', title: 'Isomorphism', load: () => import('./modes/iso.js'),
    description: 'Decide whether two graphs are equal, isomorphic or neither, and show why.' },
  { id: 'planar', title: 'Planar Graphs', load: () => import('./modes/planar.js'),
    description: 'Decide whether a graph is planar, then count its vertices, edges and faces or say why not.' },
  { id: 'coloring', title: 'Graph Coloring', load: () => import('./modes/coloring.js'),
    description: 'Color a graph with few colors, or follow the greedy coloring algorithm.' },
  { id: 'applications', title: 'Applications', load: () => import('./modes/applications.js'),
    description: 'Schedule meetings and assign radio frequencies by coloring a graph.' },
  { id: 'hamiltonian', title: 'Hamiltonian Graphs', load: () => import('./modes/hamiltonian.js'),
    description: 'Decide whether a graph is Hamiltonian, then find a cycle, also with nearest neighbor and sorted edges.' },
];

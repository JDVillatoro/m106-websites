// Graph theory modes, in tab order. The first one opens by default.
// To add a mode, write modes/<name>.js and add a line here (see docs/adding-modes.md).

export default [
  { id: 'make',         title: 'Make a Graph',       load: () => import('./modes/make.js') },
  { id: 'degree',       title: 'Degree Sequences',   load: () => import('./modes/degree.js') },
  { id: 'eulerian',     title: 'Eulerian Graphs',    load: () => import('./modes/eulerian.js') },
  { id: 'iso',          title: 'Isomorphism',        load: () => import('./modes/iso.js') },
  { id: 'planar',       title: 'Planar Graphs',      load: () => import('./modes/planar.js') },
  { id: 'coloring',     title: 'Graph Coloring',     load: () => import('./modes/coloring.js') },
  { id: 'applications', title: 'Applications',       load: () => import('./modes/applications.js') },
  { id: 'hamiltonian',  title: 'Hamiltonian Graphs', load: () => import('./modes/hamiltonian.js') },
];

// Graph theory modes, in tab order. The first one opens by default.
// To add a mode, write modes/<name>.js and add a line here (see PLAN.md).

export default [
  { id: 'about',  title: 'About',           load: () => import('./modes/placeholder.js') },
  { id: 'sample', title: 'Sample Exercise', load: () => import('./modes/sample.js') },
];

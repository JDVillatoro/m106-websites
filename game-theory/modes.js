// Game theory modes, in tab order. The first one opens by default.
// To add a mode, write modes/<name>.js and add a line here (see PLAN.md).

export default [
  { id: 'play',            title: 'Play',               load: () => import('./modes/play.js') },
  { id: 'best-response',   title: 'Best Response',      load: () => import('./modes/best-response.js') },
  { id: 'dominance',       title: 'Dominance Relations', load: () => import('./modes/dominance.js') },
  { id: 'nash',            title: 'Nash Equilibria',    load: () => import('./modes/nash.js') },
  { id: 'expected-payoff', title: 'Expected Payoff',    load: () => import('./modes/expected-payoff.js') },
  { id: 'indifference',    title: 'Indifference',       load: () => import('./modes/indifference.js') },
];

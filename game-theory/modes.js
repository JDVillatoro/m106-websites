// Game theory modes, in order. The topic page (game-theory/) lists them as
// cards; game-theory/#<id> opens one. `description` is the line on its card;
// `tool: true` marks a mode without a score (its card says "Tool").
// To add a mode, write modes/<name>.js and add an entry here (see docs/adding-modes.md).

export default [
  { id: 'play', title: 'Play', tool: true, load: () => import('./modes/play.js'),
    description: 'Play a game against the computer: a classic game or your own payoff matrix.' },
  { id: 'best-response', title: 'Best Response', load: () => import('./modes/best-response.js'),
    description: "Find a player's best responses to the other player's strategy." },
  { id: 'dominance', title: 'Dominance Relations', load: () => import('./modes/dominance.js'),
    description: 'Decide which strategies dominate others, strictly or weakly.' },
  { id: 'nash', title: 'Nash Equilibria', load: () => import('./modes/nash.js'),
    description: 'Find all the pure Nash equilibria in a payoff matrix.' },
  { id: 'expected-payoff', title: 'Expected Payoff', load: () => import('./modes/expected-payoff.js'),
    description: 'Calculate expected payoffs when a player uses a mixed strategy.' },
  { id: 'indifference', title: 'Indifference', load: () => import('./modes/indifference.js'),
    description: 'Find the mixed strategy that makes the other player indifferent.' },
];

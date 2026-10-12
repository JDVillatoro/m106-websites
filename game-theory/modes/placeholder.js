// Placeholder shown while game theory modes are moved from legacy/game-theory/.
// TODO: delete once the real modes are in modes.js (PLAN.md, step 5).

export default {
  mount(root) {
    root.innerHTML = `
      <div class="info">
        <p>The game theory modes are being moved to this new site.
        Until they're done, use the <a href="../legacy/game-theory/">old version</a>.</p>
      </div>`;
  },
};

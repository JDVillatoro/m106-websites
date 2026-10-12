// Placeholder shown while graph theory modes are moved from legacy/graph-theory/.
// TODO: delete once the real modes are in modes.js (PLAN.md, step 4).

export default {
  mount(root) {
    root.innerHTML = `
      <div class="info">
        <p>The graph theory modes are being moved to this new site.
        Until they're done, use the <a href="../legacy/graph-theory/">old version</a>.</p>
      </div>`;
  },
};

# M106 websites

Interactive practice website for M106 (IU), published at
<https://jdvillatoro.github.io/m106-websites/>: a hub page linking to one page
per topic, each with several practice modes. Plain HTML/CSS/JavaScript, no
build step.

| Topic | Modes |
|---|---|
| Graph theory | Make a Graph, Degree Sequences, Eulerian Graphs, Isomorphism, Planar Graphs, Graph Coloring, Applications, Hamiltonian Graphs |
| Game theory | Play, Best Response, Dominance Relations, Nash Equilibria, Expected Payoff, Indifference |

| Folder | Contents |
|---|---|
| `graph-theory/`, `game-theory/` | Topic pages: `modes/` has one file per mode, `lib/` the topic's math. |
| `shared/` | Styles and code used by every page. |
| `vendor/` | Copies of outside libraries (Cytoscape). |
| `test/` | Tests (`npm test`). |
| `docs/` | [How to add modes and topics](docs/adding-modes.md); [how the two old sites were merged](docs/merge-history.md). |

## Running locally

Open the repo in VS Code and choose **Reopen in Container**. The container
serves the repo at <http://localhost:8080/>, which opens the hub page.

Any static web server works too, e.g. `python3 -m http.server 8080` from the
repo root. Opening `index.html` directly from disk doesn't work, because
browsers don't load JavaScript modules from `file://` addresses.

## Tests

```
npm test
```

runs unit tests for the math code and browser tests that click through every
mode in headless Chromium. The dev container installs what they need;
elsewhere, run `npm ci` and `npx playwright install --with-deps chromium`
first. The site itself doesn't use `package.json`.

## Publishing

GitHub Pages serves `main` from the repo root, so pushing to `main`
publishes. `.nojekyll` makes Pages serve the files as they are.

## History

The site started as two separate repos on IU GitHub
(`jvillato/M106-Graph-Theory`, `jvillato/M106-Game-Theory`), imported here
with `git subtree` (full history kept; use `git log --follow <file>`) and
merged into one site in October 2026: see
[docs/merge-history.md](docs/merge-history.md).

The site is under the MIT license: see [LICENSE](LICENSE).

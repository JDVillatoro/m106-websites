# M106 websites

Interactive practice websites for M106 (IU).

| Folder | Site |
|---|---|
| `graph-theory/` | Making graphs and practicing graph theory exercises (degree sequences, Eulerian and Hamiltonian graphs, planarity, coloring, isomorphism, applications). |
| `game-theory/` | Game theory exercises. |

The plan is to merge these into a single website; for now each folder is a
separate static site (plain HTML/CSS/JavaScript, no build step).

## Running locally

Open the repo in VS Code and choose **Reopen in Container**. The container
serves the repo at <http://localhost:8080/>; open
<http://localhost:8080/graph-theory/> or <http://localhost:8080/game-theory/>.

Any static web server works too, e.g. `python3 -m http.server 8080` from the
repo root.

## History

Both sites were separate repos on IU GitHub (`jvillato/M106-Graph-Theory`,
`jvillato/M106-Game-Theory`). They were imported here with `git subtree`, so
their full commit history is kept. Older commits show the files at the top
level rather than in their folder; use `git log --follow <file>` to see a
file's full history.

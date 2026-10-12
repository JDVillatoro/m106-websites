# M106 websites

Interactive practice website for M106 (IU): a hub page linking to one page
per topic, each with several practice modes. Plain HTML/CSS/JavaScript, no
build step.

| Folder | Contents |
|---|---|
| `graph-theory/`, `game-theory/` | Topic pages (being filled in). |
| `shared/` | Styles and code used by every page. |
| `vendor/` | Copies of outside libraries (Cytoscape). |
| `test/` | Tests (`npm test`). |
| `legacy/` | The two old sites, kept until their modes are moved over. |

The two old sites are being merged into this one; see [PLAN.md](PLAN.md).

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

runs unit tests for the math code and a browser test that clicks through
every page in headless Chromium. The dev container installs what they need;
elsewhere, run `npm ci` and `npx playwright install --with-deps chromium`
first. The site itself doesn't use `package.json` and has no build step.

## History

Both sites were separate repos on IU GitHub (`jvillato/M106-Graph-Theory`,
`jvillato/M106-Game-Theory`). They were imported here with `git subtree`, so
their full commit history is kept. Older commits show the files at the top
level rather than in their folder; use `git log --follow <file>` to see a
file's full history.

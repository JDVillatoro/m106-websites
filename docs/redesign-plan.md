# Visual redesign plan

The site still has the look of the two original sites (indigo-to-purple
gradient, white card, Flat UI colors), all LLM-generated. The goal is a calmer
look that borrows from Indiana University's Rivet design system, plus a mode
navigation that works on phones with many modes, and accessibility to WCAG 2.2
AA.

The chosen direction is mockup **A** on the design canvas
(https://claude.ai/artifact/1bdQsJzCyrZ3aD9VWwdB6S, private to Joel: the
"A" row). Read it with the Artifact tool's `read` action if you can; the
description below is enough if you can't.

Delete this file when the last pass is done, and move the decisions worth
keeping to `docs/design.md` (pass 6) and `docs/merge-history.md`.

## Decisions

| Question | Decision |
|---|---|
| Rivet | Copy its values and patterns (colors, spacing, type, focus ring, breadcrumbs, previous/next), not the library. No `rivet.min.css` or `rivet.min.js`: they restyle `body` and headings and would mean rewriting every mode's markup. |
| Branding | A crimson "M106" block and a 4px crimson line at the top of the header. No IU trident or IU wordmark. |
| Fonts | Self-hosted Source Sans 3 (body) and Gelasio (headings), both SIL Open Font License, in `vendor/fonts/` with their license files. Only the weights used (Source Sans 400, 600, 700; Gelasio 600), as `woff2`. |
| Colors | Rivet's: crimson `#990000` for brand touches only; blue `#006298` for buttons, links and selection; text `#243142`, secondary text `#4c5a69`, borders `#e2e7e9`, light background `#f8f9fa`; green `#056e41` for correct, orange-red `#b11c00` for incorrect. No gradients, no colored shadows. |
| Mode navigation | The topic page with no hash (`graph-theory/`) lists the modes as cards (title, one line, score). A mode (`graph-theory/#degree`) shows a breadcrumb, "Mode 2 of 8", its title, and previous/next links at the bottom; on wide screens the mode list sits beside it. No tab strip. |
| Score | Shown as points out of questions: "3 / 4 points" (points can be 2.5). "No score" before the first question. No percentage anywhere: it reads like completion. The score box sits beside the mode (below it on phones), with "Reset score" as a small link-style button inside it. |
| Feedback | Border, light background, an icon, and a word ("Correct", "Not quite") as its first line, so it never depends on color alone. |
| Dark mode | Not now. |
| Publishing | No students use the site yet, so each pass can go to `main` when it's done, even if the site looks half-finished in between. |
| Name and footer | No changes: the site stays "M106 Practice", and there is no footer. |
| Add and remove buttons | No longer green and red; green and red mean only correct and incorrect. |
| Links | Both must be linkable: the mode list (`graph-theory/`) and each mode (`graph-theory/#degree`). |

## How to work

- One pass per session and per commit. Joel reviews and commits; don't
  commit.
- Keep class names that tests and modes use (`.feedback`, `.choice-btn`,
  `.primary-btn`, `.reset-btn`, `.scoreboard`, …) unless a pass says
  otherwise; restyle them instead. Where a pass renames something, update the
  tests in the same pass.
- No behavior changes to modes (puzzles, checking, scoring), only how they
  look, except where a pass says so (score display, navigation).
- Tests: the whole site is affected, so `npm test` at the end of each pass.
- Screenshots of every changed page, desktop (1280) and phone (390), before
  and after, using the script from pass 1. Tests have missed layout bugs
  before.
- Tick items off here as they're done, and note anything decided on the way.
- **Any change to text students see** (instructions, labels, button text,
  feedback, headings, alt text and screen-reader-only text) is listed in the
  pass report for Joel to review: where it is, the old text and the new
  text. This includes text that only moved or was split up. Don't reword
  copy that a pass doesn't need to change.
- The report at the end of a pass also lists any page whose behavior (not
  just look) changed, and accessibility checks that fail.

## Pass 1: safety net

- [x] Screenshot script (`test/screenshots.js`, run with
      `node test/screenshots.js`, not part of `npm test`): hub, each topic
      page, and every mode, at 1280 and 390 wide, into a gitignored folder.
      Used for before/after comparisons in every pass.
- [x] Automated accessibility checks: add `axe-core` as a dev dependency and
      a browser test that runs it on the hub and every mode (WCAG 2.2 A/AA
      rules). Known failures from the current look (e.g. accent contrast) are
      listed in the test as expected, so the test passes now and each later
      pass removes items from that list.
- [x] Test that CSS files other than `tokens.css` contain no raw colors (hex,
      `rgb()`, `hsl()`) and no font families. Plain Node, no new dependency.
      Current exceptions listed in the test (the `rgba(...)` shadows in
      `components.css`); pass 2 removes them. Coloring's palette is in JS and
      handled in pass 6.

Done. Notes:

- Pages come from `topics.js` and each `modes.js` (`test/helpers/pages.js`),
  so new modes get screenshots and axe checks without editing the tests.
  `node test/screenshots.js before`, then `after`; `screenshots/` is
  gitignored.
- axe-core 4.14.0, pinned. The test runs at both widths and also fails when
  an expected failure stops happening, so each pass has to shrink the list.
- Besides contrast (everywhere except the hub, whose gradient axe can't
  measure), axe found three problems a restyle won't fix, left for pass 6:
  - Play and Best Response: strategy buttons labeled by MathJax have an
    empty accessible name in Chromium, and MathJax puts a focusable element
    inside each button.
  - Nash: clickable payoff cells show "0 1" but are named "A and X: Player 1
    gets 0, Player 2 gets 1" (WCAG 2.5.3, label in name).
  - Applications: the distance table scrolls sideways on phones but can't be
    reached with the keyboard.
- No raw colors or font names in CSS outside `tokens.css` except the three
  shadows the plan expected.

## Pass 2: tokens and fonts

- [x] Rewrite `shared/css/tokens.css` with the colors above, named by role
      rather than hue, e.g. `--color-text`, `--color-text-secondary`,
      `--color-border`, `--color-surface`, `--color-surface-muted`,
      `--color-brand` (crimson), `--color-action` / `-hover` (blue),
      `--color-action-tint` (selected background), `--color-correct` /
      `-bg`, `--color-incorrect` / `-bg`, `--color-focus`. Fewer than now:
      there are three gray text colors and two accents.
- [x] Spacing and radius from Rivet's scale (4, 8, 16, 24, 32, 40px; radius
      2px and 4px), type sizes in `rem`, `--font-body`, `--font-heading`.
- [x] Fonts: copy the `woff2` files and licenses into `vendor/fonts/`, with
      `@font-face` rules (`font-display: swap`) and fallback stacks in
      `tokens.css`.
- [x] Update every stylesheet to the new names (`shared/css/`,
      `graph-theory/lib/graph-view.css`, `game-theory/lib/matrix-view.css`,
      `modes/*.css`). Remove the exceptions from pass 1's raw-color test.
- [x] Graph drawing colors (`--graph-*`, read by `graph-theory/lib/render.js`):
      node border and label `#243142`, edges `#75838f` (3:1 against white
      for non-text graphics).
- [x] Remove `--page-background` (the gradient) and the colored shadows.

After this pass the site has the new colors on the old layout. That's
expected.

Done. Notes:

- Two tokens beyond the list above: `--color-border-strong` (`#75838f`, for
  lines that must be seen: form control edges, graph edges; 3:1 on white)
  and `--graph-edge-label-bg` (`--color-text-secondary`): edge weights were
  white on the edge color, 3.5:1 before and still under 4.5:1 with the new
  gray, so `render.js` now reads a separate label background.
- Old roles mapped: purple accent and "primary" purple → blue action;
  `.primary-btn`, `.reset-btn`, `.add-btn`, `.danger-btn` all look like the
  plain blue button until pass 3 adds the secondary style. Play's "Done
  editing" button (was orange) is the darker blue. Play's highlighted
  outcome (was yellow) uses the selection tint and a blue border. Matrix
  column and row headers, player labels and score numbers are text color,
  not blue: they aren't clickable. The selected choice button's ring is
  text color, a 2px white gap away.
- Spacing tokens kept their names (`--space-xs` … `--space-xl`, plus
  `--space-xxl`) with Rivet's values in `rem`, so gaps changed slightly
  (10→8, 15→16, 20→24, 30→32px). Raw `px` gaps in mode CSS are left for
  pass 3. Radii are 4px (2px for the history items); font sizes are
  tokens in `rem` (body 17px, line height 1.5, inputs at body size).
- Only the fonts' Latin subsets (16–20 KB each): →, ≥, ≠ and ⅓ come from
  the fallback font. Only Gelasio is defined; headings use it from pass 3.
  No italic faces: the few italic lines (`.subtitle`, `.mode-status`) are
  slanted by the browser; pass 3 decides whether they stay italic.
- Graph labels are drawn by Cytoscape in its own font, not Source Sans.
- axe: contrast passes everywhere, so that entry is gone. The Applications
  table entry turned out to depend on the random question (only frequency
  assignment questions have the table), so it's now `sometimes: true`:
  allowed, not required. Still a real problem for pass 6.

## Pass 3: base styles and shared components

- [x] `base.css`: white page, no card or gradient; content column up to about
      1120px with 24px side margins (16px on phones); headings in the heading
      font; body 17px, line height 1.5.
- [x] Form controls: 44px tall, 2px border, `:focus-visible` ring
      (2px solid `--color-focus`, 2px offset) on every control, link and
      clickable matrix cell. Remove `outline: none`.
- [x] Buttons: `.primary-btn` filled blue; a secondary style (white, blue
      2px border) for "Next question" and similar; no hover lift; at least
      44px tall. `.add-btn` and `.danger-btn` become secondary / outlined, so
      green and red mean only correct and incorrect.
- [x] `@media (prefers-reduced-motion: reduce)`: no transitions.
- [x] `.feedback` as in Decisions. Correct/incorrect icons are inline SVG in
      `shared/js/ui.js` (`feedbackHtml`), hidden from screen readers; the
      word is real text.
- [x] `.info` becomes a plain intro paragraph under the title (secondary
      text color, no tinted box, not centered).
- [x] `.choice-btn`, `.option-list` (checkboxes and radios at least 24px),
      `.input-error`.
- [x] Payoff matrix (`matrix-view.css`): cells as in mockup A (white,
      1px border; selected: blue tint, 3px blue border, check icon;
      correct/incorrect after submitting: border plus icon, not color only).
      Clickable cells at least 44px tall on phones.
- [x] Look at every mode's own CSS for leftovers of the old look.
- [x] Graph labels (vertex names, edge weights) in the body font:
      `render.js` reads `--font-body` for Cytoscape, and redraws once the
      font has loaded (Cytoscape draws on a canvas, which doesn't update
      when a web font arrives).

Done. Notes:

- No `.secondary-btn` class: the plain button is outlined, and
  `.primary-btn` fills it. `.add-btn` and `.danger-btn` have no styles of
  their own now. The feedback block's "Next question" and "try again" lost
  `.primary-btn`; so did Play's preset games (they're choices, not the
  main action). Play's "Done editing" is filled while editing.
- `[hidden] { display: none !important }` in `base.css`: buttons are
  `inline-flex` now, which otherwise beat the `hidden` attribute (tests
  caught Make's and Hamiltonian's hidden buttons showing).
- Feedback: `showFeedback` puts the icon in `.feedback-icon`; text,
  message and buttons are in `.feedback-body`. Default title "Incorrect"
  became "Not quite" (tests updated).
- State icons (check, cross) are CSS masks from `--icon-check` and
  `--icon-cross` in `tokens.css`, colored by tokens: choice buttons,
  matrix cells, `.input-error`, Dominance's menus after submitting.
- Matrix: Nash now also marks right picks (`is-correct`, one line in
  `nash.js`). Nash's feedback says "Cells outlined in red are equilibria
  you missed. Crossed-out cells are not equilibria.", so missed cells keep
  a (dashed) red outline and wrong picks stay crossed out. Play's history
  no longer colors rounds won or lost (the payoffs are written out).
- `.info` is a plain paragraph; `.subtitle` and `.mode-status` aren't
  italic any more (no italic font is loaded); `.hint` is small text, left
  aligned. Reset score looks like a link. The tabs got an interim look
  (links, crimson bar under the current one) until pass 5 replaces them.
- Graph labels: Cytoscape's `font-family` accepts only double quotes, so
  `render.js` swaps the token's single quotes; with single quotes it
  silently kept its default font.


## Pass 4: page shell and hub

- [x] Shared header, built in one place (`shared/js/`) for the hub and topic
      pages: crimson top line, "M106 Practice" with the crimson block
      (links to the hub), topic links on the right with `aria-current`.
- [x] Hub (`index.html`): title, one-line intro, topic cards (title as a
      link, description, number of modes). Cards are links big enough to tap.

Done. Notes:

- `shared/js/site-header.js` (`addSiteHeader`), called by the hub's
  script and by `startTopic`; the topic links come from `topics.js`. The
  brand link has `aria-current="page"` on the hub. It's the page's only
  `<header>`: the old page headers (title, intro, back link) are `div`s
  now, so there's one banner landmark.
- Added a "Skip to content" link, first on every page and shown only when
  focused (WCAG 2.4.1, now that a header with links comes before the
  content). It goes to `#app`.
- "← All topics" stays on topic pages until pass 5's breadcrumb replaces
  it.
- Hub cards: the title link covers the whole card (`::after`), so its name
  is still just the title; focus ring and hover on the card. The mode
  count ("8 modes") comes from each topic's `modes.js`.
- Phones: the topic links fit beside "M106 Practice" at 390px and wrap
  below it on narrower screens.


## Pass 5: topic page navigation and score

This pass changes behavior: update `test/site.test.js` and the helpers in
`test/helpers/browser.js` that find tabs, the scoreboard and its text.

- [ ] `modes.js`: add a one-line `description` to each mode, for the cards.
      Draft them and list them all in the report: Joel reviews this wording
      before it's published.
- [ ] `topic-shell.js`: no hash shows the mode list (cards: title,
      description, the saved score as "3 / 4 points", "No score", or "Tool"
      for modes without a score). A hash shows that mode with breadcrumb
      (M106 Practice / Graph Theory / Degree Sequences), "Mode 2 of 8", title
      (`h1`), and previous/next links. Modes still load once and keep their
      state when you switch.
- [ ] Wide screens: mode list beside the mode (current one marked with
      `aria-current` and a crimson bar), score box above it. Phones: the
      list isn't repeated below the mode; "← Graph Theory" goes back to the
      cards.
- [ ] When the mode changes, move focus to its `h1` and update
      `document.title`, so screen reader users hear where they are.
- [ ] Scoreboard as in Decisions; `score.js` keeps `percent` only if
      something still uses it.
- [ ] Links: `graph-theory/` (no hash) shows the list and `#<mode id>`
      opens that mode, both from a fresh page load and with Back/Forward.
      Test both. An unknown hash shows the list.

## Pass 6: remaining accessibility, and keeping it consistent

- [ ] Graph Coloring (`COLORING_BASE` in `graph-theory/modes/coloring.js`)
      is meant not to rely on color: vertices already show their color's
      letter (`3: R`, or `3: A` in greedy questions) and colors are chosen by
      name from menus. Keep that and the names. Check: the label is readable
      on every fill (4.5:1; change shades or use a white label on dark
      fills), the graph's text description includes each vertex's color, and
      the shades still look like their names.
- [ ] Keyboard check of every mode, especially clicking vertices and edges
      in Make a Graph, Coloring and Hamiltonian: list what can't be done
      without a mouse, with `TODO(refactor):` comments where the fix isn't
      obvious.
- [ ] Check every page at 400% zoom (or 320px wide): no sideways scrolling
      except inside graph areas and matrices.
- [ ] Feedback that points at the look instead of saying the answer
      (WCAG 1.4.1 use of color, 1.3.3 sensory characteristics). Screen
      readers don't hear the marks shown after answering (matrix cells:
      selected, right, missed, crossed out; Dominance's menus: right or
      wrong), and the text leans on them. Name the cells in the message, so
      the marks only add to the words. Wording agreed with Joel (show him
      the final text in the report):
      - Nash, wrong, game has equilibria: "The pure Nash equilibria are
        (B, X) and (C, Y). (A, X) is not one." (was "Cells outlined in red
        are equilibria you missed. Crossed-out cells are not equilibria.")
      - Nash, wrong, no equilibria: "There are no pure Nash equilibria in
        this game, so (A, X) is not one." (was "… The crossed-out cells are
        not equilibria.")
      - The second sentence only when a non-equilibrium was picked; several
        are listed: "(A, X) and (B, Y) are not equilibria." Pairs are
        (row strategy, column strategy), from the labels `nash.js` has.
      - Dominance, wrong: "You got 1/2 (50%). A vs B: the answer is "A
        strictly dominates B"." (one sentence per wrong pair; was "… The
        correct relations are shown above.")
      - Best Response: fine (the answer is in words); "They're highlighted
        in the matrix." can stay.
      - Update the Nash and Dominance tests that check this text. Once the
        text doesn't describe the look, the matrix marks can change freely
        (`matrix-view.css` comment).
- [ ] Empty pass 1's list of expected axe failures (`EXPECTED` in
      `test/accessibility.test.js`), including the three non-contrast ones
      in pass 1's notes; anything left gets a comment saying why.
- [ ] `docs/design.md`: the rules for future modes (tokens only; use shared
      components before writing new CSS; mode CSS is layout only; feedback,
      buttons and focus look the same everywhere; 44px targets; never color
      alone), linked from `CLAUDE.md` and `docs/adding-modes.md`.
- [ ] Update `docs/adding-modes.md` (classes, navigation, score) and the
      "Still to do" list in `docs/merge-history.md`.

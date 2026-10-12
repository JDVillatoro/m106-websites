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

- [ ] Rewrite `shared/css/tokens.css` with the colors above, named by role
      rather than hue, e.g. `--color-text`, `--color-text-secondary`,
      `--color-border`, `--color-surface`, `--color-surface-muted`,
      `--color-brand` (crimson), `--color-action` / `-hover` (blue),
      `--color-action-tint` (selected background), `--color-correct` /
      `-bg`, `--color-incorrect` / `-bg`, `--color-focus`. Fewer than now:
      there are three gray text colors and two accents.
- [ ] Spacing and radius from Rivet's scale (4, 8, 16, 24, 32, 40px; radius
      2px and 4px), type sizes in `rem`, `--font-body`, `--font-heading`.
- [ ] Fonts: copy the `woff2` files and licenses into `vendor/fonts/`, with
      `@font-face` rules (`font-display: swap`) and fallback stacks in
      `tokens.css`.
- [ ] Update every stylesheet to the new names (`shared/css/`,
      `graph-theory/lib/graph-view.css`, `game-theory/lib/matrix-view.css`,
      `modes/*.css`). Remove the exceptions from pass 1's raw-color test.
- [ ] Graph drawing colors (`--graph-*`, read by `graph-theory/lib/render.js`):
      node border and label `#243142`, edges `#75838f` (3:1 against white
      for non-text graphics).
- [ ] Remove `--page-background` (the gradient) and the colored shadows.

After this pass the site has the new colors on the old layout. That's
expected.

## Pass 3: base styles and shared components

- [ ] `base.css`: white page, no card or gradient; content column up to about
      1120px with 24px side margins (16px on phones); headings in the heading
      font; body 17px, line height 1.5.
- [ ] Form controls: 44px tall, 2px border, `:focus-visible` ring
      (2px solid `--color-focus`, 2px offset) on every control, link and
      clickable matrix cell. Remove `outline: none`.
- [ ] Buttons: `.primary-btn` filled blue; a secondary style (white, blue
      2px border) for "Next question" and similar; no hover lift; at least
      44px tall. `.add-btn` and `.danger-btn` become secondary / outlined, so
      green and red mean only correct and incorrect.
- [ ] `@media (prefers-reduced-motion: reduce)`: no transitions.
- [ ] `.feedback` as in Decisions. Correct/incorrect icons are inline SVG in
      `shared/js/ui.js` (`feedbackHtml`), hidden from screen readers; the
      word is real text.
- [ ] `.info` becomes a plain intro paragraph under the title (secondary
      text color, no tinted box, not centered).
- [ ] `.choice-btn`, `.option-list` (checkboxes and radios at least 24px),
      `.input-error`.
- [ ] Payoff matrix (`matrix-view.css`): cells as in mockup A (white,
      1px border; selected: blue tint, 3px blue border, check icon;
      correct/incorrect after submitting: border plus icon, not color only).
      Clickable cells at least 44px tall on phones.
- [ ] Look at every mode's own CSS for leftovers of the old look.

## Pass 4: page shell and hub

- [ ] Shared header, built in one place (`shared/js/`) for the hub and topic
      pages: crimson top line, "M106 Practice" with the crimson block
      (links to the hub), topic links on the right with `aria-current`.
- [ ] Hub (`index.html`): title, one-line intro, topic cards (title as a
      link, description, number of modes). Cards are links big enough to tap.

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
- [ ] Empty pass 1's list of expected axe failures (`EXPECTED` in
      `test/accessibility.test.js`), including the three non-contrast ones
      in pass 1's notes; anything left gets a comment saying why.
- [ ] `docs/design.md`: the rules for future modes (tokens only; use shared
      components before writing new CSS; mode CSS is layout only; feedback,
      buttons and focus look the same everywhere; 44px targets; never color
      alone), linked from `CLAUDE.md` and `docs/adding-modes.md`.
- [ ] Update `docs/adding-modes.md` (classes, navigation, score) and the
      "Still to do" list in `docs/merge-history.md`.

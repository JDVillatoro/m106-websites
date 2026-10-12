# Design

How the site looks and behaves, and the rules that keep it consistent and
accessible (WCAG 2.2 AA). For how pages and modes are built, see
[adding-modes.md](adding-modes.md).

The look borrows values and patterns from Indiana University's Rivet design
system (colors, spacing, type, focus ring, breadcrumbs, previous/next), not
the library itself: Rivet's CSS restyles `body` and headings and would mean
rewriting every mode's markup. It replaced the look of the two original sites
in October 2026, in six passes (`git log --grep=pass`).

## Decisions

| Question | Decision |
|---|---|
| Branding | A crimson "M106" block and a 4px crimson line at the top of the header. No IU trident or wordmark. The site is "M106 Practice"; no footer. |
| Fonts | Self-hosted Source Sans 3 (body; 400, 600, 700) and Gelasio (headings; 600), Latin subset, in `vendor/fonts/` with their licenses (SIL Open Font License). |
| Colors | Rivet's, named by role in `tokens.css`: crimson for brand touches only; blue for buttons, links, selection and focus; green and red only for correct and incorrect. No gradients, no colored shadows. |
| Navigation | `graph-theory/` lists the modes as cards (title, description, score); `graph-theory/#degree` shows that mode with a breadcrumb, "Mode 2 of 8", previous/next links, and on wide screens the score box and mode list beside it. No tabs. |
| Score | Points out of questions: "3 / 4 points" (points can be 2.5), "No score" before the first question. Never a percent: it reads like how much is done. |
| Feedback | Border, light background, an icon, and a word ("Correct", "Not quite") first. The message says the answer in words. |
| Descriptions | Each mode is described once, in `modes.js`: on its card and under its title. |
| Dark mode | Not now. |

## Rules for modes

- **Tokens only.** Colors, fonts, sizes and icons come from
  `shared/css/tokens.css`; `test/css.test.js` fails on raw colors or font
  names anywhere else. Colors used from JavaScript (graph drawings,
  Coloring's palette) are tokens too, read with `getComputedStyle`.
- **Shared components first.** Use the classes below before writing CSS.
  A mode's own CSS is for layout (rows, widths, gaps), not for new looks.
- **Same everywhere.** Buttons, feedback, focus and form controls look the
  same in every mode. Buttons are outlined; only the main action (Submit)
  gets `.primary-btn`. Don't color buttons green or red.
- **Targets at least 44px** tall (`--control-height`): buttons, text boxes,
  menus, links in lists, clickable matrix cells. Checkboxes and radio
  buttons are 24px.
- **Never color alone.** Every state has a second sign: an icon, a word, an
  outline, crossing out. Text never points at a look ("outlined in red",
  "highlighted"): feedback names the answer, e.g. "The pure Nash equilibria
  are (B, X) and (C, Y)."
- **Focus.** Never remove the focus ring (`:focus-visible`, 2px blue, 2px
  away). Anything clickable that isn't a link or button gets `tabindex="0"`,
  a role, and Enter and Space (see `matrix-view.js`).
- **Names.** Every control has a name a screen reader can read. A button
  whose label is math gets `aria-label` with `plainMath(label)`; a name
  starts with the visible text, so speech input works ("click -4 -5").
- **Headings.** The shell's `h1` is the mode's title; a mode's headings
  start at `h2`.
- **Narrow screens.** Nothing scrolls sideways at 320px (400% zoom), except
  inside graph areas, matrices and tables, which scroll in their own box
  (make that box focusable, with `tabindex="0"`, `role="region"` and a
  name, as in Applications).
- **Text students see** (instructions, labels, feedback, screen-reader-only
  text) is reviewed by Joel: point out every change.

## Components

| Class | What |
|---|---|
| `button` | Outlined blue, 44px. `.primary-btn` filled; `.small-btn` smaller text; `.reset-btn` looks like a link. |
| `.choice-row` / `.choice-btn` | A row of answer choices; `is-selected`, `is-correct`, `is-wrong` add an icon and color (`lockChoices`, `resetChoices` in `ui.js`). |
| `.feedback` | Built by `feedbackHtml()`, filled by `showFeedback()` (icon, title, message, Next). |
| `.answer-row`, `.button-row`, `.option-list` | Label + input + button on a line; buttons side by side; checkboxes or radios. |
| `.input-error` | Message about badly formatted input, with an icon; mark the field with `is-invalid`. |
| `.section`, `.subtitle`, `.hint`, `.info` | A block of a mode; the line under its heading; a small tip; an intro paragraph. |
| `.payoff-matrix` | `renderPayoffMatrix()`; cell states `is-selected`, `is-correct`, `is-answer`, `is-missed`, `is-crossed`, `is-highlighted`. |
| `.graph-view` | `createGraphView()`; labels in the body font, colors from `--graph-*`. |

## Checks

- `npm test` runs `test/accessibility.test.js` (axe-core, WCAG 2.2 A and AA,
  every page at 1280 and 390px; no known failures) and `test/css.test.js`.
- axe finds only some problems. For a new or changed mode, also: Tab through
  it (everything reachable, focus visible, a question answerable without a
  mouse), look at it at 320px, and compare screenshots before and after
  (`node test/screenshots.js before`, then `after`).

## Known gaps

- Moving vertices and panning graphs need a mouse or touch (`TODO(refactor)`
  in `graph-theory/lib/render.js`). Nothing needs them to answer.
- Clickable payoff cells are table cells with `role="button"`, which hides
  them as cells from screen readers' table navigation; a real `<button>`
  inside each cell would be better.
- Graph Coloring: a vertex at the edge of the area can be cut off once its
  label grows ("3: R"); the graph isn't refitted.

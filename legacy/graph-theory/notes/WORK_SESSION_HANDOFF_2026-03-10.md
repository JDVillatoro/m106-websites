# Graph Theory Architecture Handoff (2026-03-10)

## Audience and purpose

This handoff is written for an engineer who has no prior context on this codebase.

Primary goals of this document:

1. Explain what this project is and how it is structured today.
2. Explain the intended architecture the project is moving toward.
3. Identify what is currently stable, what is transitional, and what should be done next.
4. Provide a safe and efficient way to resume work without re-discovery.

This document is intentionally architecture-first. Historical change details are included only where they help clarify current state or next steps.

---

## Project overview

This is a browser-based graph theory practice app with multiple puzzle/trial modes.

At runtime, users interact with one active mode at a time (for example: degree sequence, Eulerian, planar, graph coloring, applications, isomorphism). Each mode renders a graph, prompts for an answer, validates input, and tracks score.

High-level source layout:

- graph.js: shared graph primitives, algorithms, and some remaining mixed puzzle helpers.
- script.js: app-level orchestration, rendering integration, mode switching, shared UI concerns.
- mode files (for example eulerian-mode.js, planar-mode.js, graph-coloring-mode.js): mode-specific trial generation, mode UX flow, mode scoring and validation behavior.
- make-mode.js: graph editor / graph construction interactions.
- index.html and style.css: host page and styling.
- graph.md plus update-graph-md-refs.js: internal documentation inventory for functions in graph.js.

---

## Current architecture (what exists now)

## 1) Runtime model

The project uses plain browser JavaScript loaded into a shared global scope.

Implications:

- Any function defined in a loaded file can be called by other files.
- Script load order matters.
- There is no module boundary enforcement at build time.

Because of this, architectural boundaries are currently convention-based rather than compiler-enforced.

## 2) Practical architectural split in use

The code is currently organized around this working split:

- Shared layer (graph.js): graph data utilities and reusable algorithms.
- Mode layer (mode-specific files): puzzle policy, scenario generation tuning, UI text, answer flow, and mode-specific validation framing.

This split is partially complete and actively being improved.

## 3) Graph data model assumptions

Most shared functions now assume a graph object with this shape:

- n: number of vertices
- names: display labels for vertices
- directed: directed or undirected
- edgeLabel: optional edge-label strategy (for example in multigraph entry format)
- edges: array of edge objects with source and target vertex ids

Vertex ids use a string format like v0, v1, etc.

## 4) Signature policy currently in place

A major consistency policy is now active:

- Graph-processing functions should take a graph object, not fragmented parameters like edges and n.

Core utilities have already moved to this style (for example degree and connectivity functions), and related call sites were updated.

## 5) Mode ownership status

Mode ownership is strongest in these areas:

- Eulerian mode: owns Eulerian puzzle orchestration and validation flow details.
- Planar mode: owns planar vs non-planar trial policy and uses explicit shared planar generation APIs.
- Graph coloring mode: owns coloring puzzle generation distribution and tuning policy.

Applications mode has partial decoupling done for scheduling base graph generation but still shares some mixed concerns through graph.js.

---

## Intended future architecture (target state)

The target architecture is a clearer layered model.

## Target layer A: graph core (graph.js)

Should contain only reusable graph math and algorithmic primitives, including:

- graph structure helpers,
- core graph algorithms,
- reusable generation primitives that are not tied to one mode's narrative,
- validation primitives that are mathematically defined and mode-agnostic.

Should not contain:

- mode-specific puzzle distributions,
- mode-specific story constants and copy,
- mode-specific scoring semantics,
- mode-specific UX-oriented feedback assembly.

## Target layer B: mode adapters (mode files)

Each mode file should own:

- scenario design for that mode,
- randomization and difficulty tuning parameters,
- prompt and feedback behavior,
- answer interpretation and grading flow,
- score progression logic.

Mode files should call into graph core for shared computation but should not push mode narrative policy back into graph core.

## Target layer C: app shell (script.js + html/css)

Should own:

- page wiring,
- mode activation and lifecycle,
- graph render plumbing,
- accessibility and global UI behavior.

Should avoid embedding mode-specific algorithm policy.

## Design tradeoff accepted for now

Some duplication across modes is acceptable when it preserves mode independence and tuning agility. Do not over-deduplicate mode generators if that would re-introduce cross-mode coupling.

---

## Architecture status vs target

This table reflects where the code currently stands relative to target architecture.

- Graph core utility signatures: mostly aligned with target.
- Graph core mathematical helpers: largely aligned.
- Mode-owned puzzle orchestration:
  - Eulerian: aligned.
  - Planar: aligned.
  - Graph coloring: aligned.
  - Applications: partially aligned; still transitional.
- Documentation support for shared layer: aligned (graph.md and updater script).
- Hard enforcement of boundaries: not aligned yet (global-script architecture cannot enforce boundaries automatically).

---

## What is in progress right now

Highest-priority in-progress goal:

- Finish separating Applications mode policy from graph core.

Why this is next:

- Three modes already demonstrate the intended boundary pattern.
- Applications remains the largest source of residual mixed responsibilities.
- Completing this gives a coherent architecture story across major modes.

Secondary in-progress goal:

- Continue tightening graph.js to keep only mode-agnostic APIs.

Tertiary in-progress goal:

- Keep graph.md synchronized with graph.js so architecture cleanup remains observable and less error-prone.

---

## Current constraints and assumptions you should preserve

1. Graph-object signatures are the default API style for graph-processing functions.
2. Refactoring is being done incrementally mode-by-mode to limit regression risk.
3. Mode-specific puzzle logic independence is intentional.
4. Explicit parameters are preferred over config bags for small, clear API surfaces.
5. Runtime behavior should remain stable while boundaries are cleaned up.

---

## Safe continuation plan

Use this exact order to continue with minimal risk.

1. Audit graph.js for remaining mode-specific content (especially applications-related scenario assembly).
2. For each candidate function/constant, classify as either:
   - mathematically reusable, or
   - mode policy / scenario concern.
3. Move one coherent Applications slice at a time to applications-mode.js:
   - generation policy first,
   - then validation messaging or scenario framing.
4. Keep shared computation in graph.js only when multiple modes can reasonably use it.
5. Run diagnostics after each slice and do mode-level spot checks.
6. Update graph.md metadata using the sync script.

Do not attempt a single large rewrite of all files in one pass; the current strategy is controlled incremental migration.

---

## Verification checklist for any new refactor slice

A slice is complete only when all are true:

1. The moved code now lives in the mode file when it defines mode policy.
2. graph.js API remains cohesive and mode-agnostic.
3. Affected call sites use graph-object signatures consistently.
4. Diagnostics are clean on touched files.
5. graph.md has been refreshed and spot-checked for correctness.
6. At least one manual run-through was done for each affected mode flow.

---

## Known architecture risks

1. Global namespace and script load order can hide coupling.
2. Similar generators in multiple modes may drift over time (accepted tradeoff).
3. Legacy calls with old signatures may survive in less-frequent paths.
4. Documentation drift can return if graph.md updater is not run regularly.

Mitigation strategy:

- Keep edits narrow and mode-scoped.
- Verify each touched mode immediately.
- Use the graph.md updater as part of normal completion.

---

## Operational references

Working files to inspect first when resuming:

- graph.js
- applications-mode.js
- eulerian-mode.js
- planar-mode.js
- graph-coloring-mode.js
- script.js
- graph.md
- update-graph-md-refs.js

Useful commands from repository root:

- node update-graph-md-refs.js
- git status
- git diff -- graph.js
- git diff -- applications-mode.js

---

## Short orientation summary

If you remember only one thing:

The project is converging on a layered architecture where graph.js is a reusable math core and each mode file owns puzzle policy. This is already true for Eulerian, Planar, and Graph Coloring. Applications is the next major boundary cleanup target.

# RetroBuffer Milestone 01: Foundation

## Purpose

Milestone 01 creates the planning and guidance layer that all later implementation work depends on. The goal is to make the roadmap source-controlled, explicit, and aligned with the repo as it exists today rather than with an imagined rewrite.

## Current Repo Baseline

This milestone assumes the current repository already has:
- A WebGL-backed immediate-mode renderer in `src/js/core/Retrobuffer.js`.
- Shared runtime bootstrap code in `src/js/app/`.
- A launcher entry point in `src/js/game.js`.
- A game registry in `src/games/registry.js`.
- A smoke-test game in `src/games/ballistics_coordinator/`.
- A build pipeline that still needs to catch up with the source layout.

## Goals

- Capture the framework roadmap in source-controlled reference docs.
- Make VS Code extension-based authoring and Node-backed build/export explicit project assumptions.
- Define how smoke-test games validate new runtime and tool features.
- Update workspace guidance so future agents work from the same framework direction.

## Deliverables

- Canonical umbrella roadmap in `reference/plan.md`.
- Six milestone docs under `reference/`.
- Four tool docs under `reference/`.
- Updated `.github/copilot-instructions.md` aligned to framework evolution.
- New workspace agents for architecture, runtime/API, editor tooling, audio systems, and smoke-test games.

## Workstreams

### Planning Docs

- Keep `reference/plan.md` as the umbrella vision doc.
- Use milestone docs as implementation-stage guides.
- Use tool docs as product and architecture briefs for editors and authoring surfaces.

### Workspace Guidance

- Move `.github/copilot-instructions.md` from bootstrap cleanup guidance to framework-evolution guidance.
- Preserve the repo's existing bias toward small, direct, maintainable changes.
- Make VS Code extension-based authoring and browser-playable runtime output both explicit.

### Agent Model

Add focused agents for:
- Architecture and repo evolution.
- Runtime/API design.
- Editor/tooling work.
- Audio systems.
- Smoke-test game integration and regression coverage.

## Smoke-Test Expectations

Foundation work should already define how smoke tests are used later:
- Existing games in `src/games/` are not just examples; they validate framework behavior.
- New runtime features should land with at least one game-level use case.
- New tools should prove authored content round-trips into at least one game.

## Exit Criteria

- The roadmap exists in versioned markdown files under `reference/`.
- The docs reflect the real repo structure and current launcher/game split.
- VS Code extension-based asset tooling is named as the default authoring surface.
- Node-backed build/export is named as foundational.
- Planned guidance changes for `.github/` are clear enough to implement next.

## Out Of Scope

- Runtime refactors.
- Tool implementation.
- VS Code extension implementation code.
- Asset format implementation.
- Build pipeline rewrites.

## Notes

This milestone is complete when later implementation work can proceed without re-debating the project identity, platform stance, or milestone order.

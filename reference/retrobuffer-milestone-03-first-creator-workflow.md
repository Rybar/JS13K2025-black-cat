# RetroBuffer Milestone 03: First Creator Workflow

## Purpose

Milestone 03 proves the first real authoring loop: create or edit an asset in a RetroBuffer tool, save it through the project model, and see it used by a smoke-test game.

## Recommended Vertical Slice

The first vertical slice should be:
- Sprite asset format.
- Sprite editor MVP.
- One smoke-test game consuming authored sprite assets.

This is the smallest slice that exercises runtime, asset storage, tool UX, and project I/O together.

## Goals

- Define the first concrete asset type for the framework.
- Validate the project model with a real authoring workflow.
- Establish the first reusable editor document pattern.
- Prove that smoke-test games are the battle-tests for tool-driven features.

## Deliverables

- Versioned sprite asset format.
- Sprite import/save/load path inside the integrated authoring environment.
- Sprite editor MVP document and canvas workflow.
- Game-side runtime loading path for authored sprites.
- One smoke-test game updated to use authored sprite assets.

## Recommended Game Validation Strategy

Use one of the existing games as the first integration target if practical. If the current smoke-test game is not a clean fit, add a smaller dedicated validation game under `src/games/` that exists primarily to verify sprite asset round-tripping.

## MVP Capabilities

- Indexed-color drawing.
- Palette selection.
- Pencil and erase tools.
- Fill tool.
- Rectangular selection.
- Basic frame list for animation.
- Save and reload through the project model.

## Smoke-Test Expectations

- An edited sprite persists to disk.
- The runtime loads the saved asset without bespoke glue.
- The consuming game renders the new art correctly.
- A small regression pass confirms palette, atlas placement, and animation data remain valid.

## Exit Criteria

- The first authored asset type exists end-to-end.
- The editor shell can host a real working document.
- The runtime and project model agree on sprite data shape.
- At least one game proves the workflow is not tool-only theater.

## Risks

- Designing the sprite format around the editor UI instead of runtime needs.
- Encoding atlas assumptions too rigidly before tilesets and maps exist.
- Trying to solve every paint-tool feature before validating round-trip success.

## Out Of Scope

- Map authoring.
- Audio authoring.
- Rich animation tooling.
- Multi-layer sprite editing.
- Full workspace polish.

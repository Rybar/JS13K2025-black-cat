# RetroBuffer Milestone 04: Integrated Editors

## Purpose

Milestone 04 turns isolated tool experiments into a shared VS Code-based authoring environment. The goal is not to build a huge desktop UI framework, but to establish the minimum common tool layer that makes multiple RetroBuffer editors feel like one system.

## Goals

- Establish the integrated VS Code tooling layer.
- Add reusable document and panel infrastructure.
- Grow the sprite editor from MVP to practical v1.
- Deliver the first map editor MVP on top of shared editor systems.

## Deliverables

- VS Code extension tool suite with shared custom-editor, webview, tree-view, and command infrastructure.
- Asset browser.
- Inspector or equivalent tool-facing metadata surface.
- Tabbed documents through VS Code editor tabs.
- Selection and clipboard primitives.
- Per-document undo/redo.
- Shared canvas widget behavior for zoom, pan, and overlays.
- Sprite editor v1.
- Map editor MVP.

## Shared Infrastructure Priorities

Build the shared layer only as far as two tools demand it:
- Document lifecycle.
- Command routing.
- Selection handling.
- Clipboard integration.
- Undo/redo.
- Reusable grids, rulers, overlays, and timelines where useful.

## Sprite Editor Expansion

By this milestone, the sprite editor should add:
- Better frame workflows.
- Transform operations.
- Tile slicing support.
- Optional onion skinning.
- Symmetry and mirroring.
- Dithering-aware operations where they materially help.

## Map Editor MVP

The map editor should support:
- Tile-based editing.
- Layer visibility and locking.
- Fill and replace tools.
- Metadata markers for practical gameplay use.
- A workflow that integrates with tilesets produced by the sprite pipeline.

## Smoke-Test Expectations

- A map-authored game scenario is playable in a smoke-test game.
- Sprite editor outputs continue to load correctly in runtime.
- Two tools share the same VS Code extension patterns without diverging into separate application models.

## Exit Criteria

- The VS Code tool suite is clearly the home for multiple asset editors.
- Shared editor infrastructure is reused, not copied.
- Map data and sprite data both round-trip through the project model.
- Smoke-test games exercise both authored sprites and authored map content.

## Risks

- Building a full docking system before the first two tools justify it.
- Letting tool-specific hacks leak into the shared shell.
- Making the shell visually complex before workflows are solid.

## Out Of Scope

- Full audio tooling.
- Rich project templates.
- Packaging polish.
- Plugin systems.

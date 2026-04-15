# RetroBuffer Tool Plan: Sprite Editor

## Role In The Framework

The sprite editor is the first planned authoring tool because it is the smallest vertical slice that proves the project model, editor document patterns, runtime integration, and smoke-test game validation loop.

## Product Goal

Provide a compact indexed-color art workflow that feels toy-like, fast, and tightly aligned with runtime needs rather than like a generic paint application.

## Runtime Alignment

Sprite assets should map cleanly into runtime usage:
- Palette-indexed pixel data.
- Frame metadata for animation.
- Dimensions and slicing metadata for atlas placement and tile usage.
- Optional pivots, tags, or named regions only if game integration pressure justifies them.

The runtime should not need a second interpretation layer full of editor-only assumptions.

## MVP

- Indexed-color painting.
- Palette selection.
- Pencil and erase tools.
- Fill tool.
- Rectangular selection.
- Frame list for simple animation.
- Save/load through the project model.
- Import path from common source images where useful.

## v1

- Transform tools.
- Tile slicing helpers.
- Onion skinning.
- Mirroring and symmetry.
- Dithering-aware paint operations.
- Better frame management and preview tools.

## Later

- Multi-layer editing.
- Palette remap previews.
- Batch operations.
- Procedural assists that do not compromise clarity.

## Document Model

A sprite document should track:
- Asset metadata.
- Indexed pixel buffers by frame.
- Current palette selection.
- Selection state.
- Undo/redo history.
- View state such as zoom and pan.

Keep ephemeral UI state separate from persisted asset data.

## Recommended Host Surface

- Implement as a VS Code custom editor backed by a webview.
- Keep file I/O, commands, and workspace integration in the extension host.
- Keep pixel editing UI, canvas rendering, and interaction state inside the webview document.

## Editor Surface Requirements

- Pixel-accurate canvas rendering.
- Zoom and pan.
- Overlay rendering for grid, selection, onion skin, and bounds.
- Responsive palette and frame strip UI.
- Keyboard shortcuts for common edit operations.

## Integration Requirements

- Works inside the shared VS Code extension tool suite through a custom editor surface.
- Saves through the shared filesystem/project-I/O layer.
- Emits assets the runtime can load without bespoke transforms.
- Has at least one smoke-test game consumer.

## Risks

- Adding too many paint-program features before asset round-tripping is proven.
- Overfitting atlas assumptions before tilesets and maps are settled.
- Mixing document state with runtime-facing asset representation.

## Recommended Smoke Tests

- Edit a sprite used by a game and verify the change appears immediately.
- Validate animated frame playback in both tool preview and runtime.
- Validate palette-index correctness after save/reload.

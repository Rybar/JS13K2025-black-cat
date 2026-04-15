# RetroBuffer Tool Plan: Map Editor

## Role In The Framework

The map editor is the first major consumer of shared editor infrastructure after the sprite workflow. It proves that RetroBuffer can support a second substantial document type without inventing a separate application model.

## Recommended Map Model

Start with a layered tilemap model.

Recommended components:
- Tile layers for visible art.
- Optional collision or logic layer.
- Metadata marker layer for spawns, triggers, and gameplay annotations.
- Chunking only as an internal scaling strategy once map size demands it.

This approach reaches practical game usefulness faster than a generalized world editor.

## MVP

- Tile-based editing.
- One active tileset workflow.
- Paint, erase, fill, and replace.
- Layer visibility and locking.
- Basic metadata markers.
- Save/load through the project model.

## v1

- Multiple tile layers.
- Collision or logic overlays.
- Typed entity or trigger markers.
- Better large-map navigation.
- Viewport culling and chunk-aware editing where needed.

## Later

- Streaming world support.
- Prefabs.
- Rule-based paint helpers.
- Richer metadata editing tools.

## Asset Model Expectations

A map asset should include:
- Grid dimensions.
- Tile references.
- Layer ordering.
- Metadata layer content.
- Tileset dependency references.
- Format version.

The format should remain readable and diffable in its early life unless scale clearly forces a binary strategy.

## Recommended Host Surface

- Implement as a VS Code custom editor backed by a webview.
- Keep file I/O, commands, and workspace integration in the extension host.
- Keep map rendering, layer controls, and editing interactions inside the webview document.

## Editor Surface Requirements

- Tile palette or tileset browser.
- Layer stack UI.
- Zoom and pan.
- Selection, marquee, fill, and replace tools.
- Clear editing overlays for metadata and logic layers.

## Integration Requirements

- Consumes tilesets derived from the sprite pipeline.
- Loads and saves through the shared project model.
- Produces content that at least one smoke-test game can use directly.
- Reuses shared editor-shell systems for documents, selection, clipboard, and undo/redo.

## Risks

- Solving infinite world editing before the first playable map exists.
- Baking entity-authoring assumptions into the map format too early.
- Creating separate shell behavior because map editing feels more complex than sprite editing.

## Recommended Smoke Tests

- Author a small playable level and run it in a smoke-test game.
- Validate layer visibility and collision/logic semantics in runtime.
- Validate map save/reload without tileset reference breakage.

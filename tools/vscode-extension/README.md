# RetroBuffer VS Code Tools

This folder contains the first scaffold for RetroBuffer asset tooling as a VS Code extension.

## Current Scope

- A workspace extension manifest.
- A `RetroBuffer Assets` explorer view listing `*.rbsprite.json` files.
- A `RetroBuffer: Create Sprite Asset` command.
- A first sprite custom editor stub backed by a webview.
- Extension-host to webview messaging for loading and editing sprite asset JSON.

## How To Run

1. Open this `tools/vscode-extension` folder in VS Code.
2. Press `F5` to launch an Extension Development Host.
3. In the Extension Development Host, run `RetroBuffer: Create Sprite Asset` from the command palette.
4. Open the created `.rbsprite.json` file to use the custom editor.

## Current Asset Shape

The scaffold uses a JSON sprite format with:

- `formatVersion`
- `type`
- `name`
- `width`
- `height`
- `paletteSize`
- `frames[]`
- `frames[].pixels` as an array of rows

This is intentionally simple so the first custom editor can rely on `CustomTextEditorProvider` and let VS Code continue to own text-document save, undo, and backup behavior.

## Next Likely Steps

- Add a proper project model and asset directory conventions.
- Split shared sprite document normalization into reusable modules.
- Add more capable pixel tools and multi-frame workflows.
- Add a map editor using the same extension-host and webview patterns.
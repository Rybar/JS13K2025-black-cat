# RetroBuffer Milestone 02: Runtime Consolidation

## Purpose

Milestone 02 stabilizes the runtime, project model, and VS Code extension authoring foundation around the repo's current launcher-plus-games architecture. This is the point where the tooling layer catches up with the source layout.

## Starting Point

The repo already has:
- Shared runtime bootstrap in `src/js/app/`.
- Shared engine infrastructure in `src/js/core/`.
- Game modules under `src/games/`.
- A working launcher flow.
- Build scripts that still mostly assume a simpler single-target world.

## Goals

- Align build tooling with the multi-game source structure.
- Define a first-class project model for RetroBuffer projects.
- Add VS Code extension scaffolding for authoring.
- Define a filesystem and project-I/O abstraction suitable for local projects.
- Clean up runtime API edges that will otherwise complicate tool integration later.

## Deliverables

- Direct game build targeting from the existing tooling.
- Project manifest draft describing project metadata, code entry points, assets, and tool-facing metadata.
- VS Code extension scaffold capable of opening integrated asset tooling surfaces.
- Filesystem abstraction that separates runtime asset loading from authoring-time local file access.
- Normalized asset manifest conventions for games and future projects.

## Scope

### Build And Export

- Keep browser-playable output as the final runtime target.
- Use Node-backed tooling for builds, packing, exports, and authoring integration.
- Support launcher builds plus direct single-game builds.

### Project Model

Define a project structure that can support:
- Code.
- Sprites and tilesets.
- Maps.
- Audio assets.
- Project configuration.
- Export metadata.

### VS Code Extension Foundation

This milestone only needs the initial extension and plumbing:
- Extension activation and command registration.
- Shared custom-editor and webview foundation.
- Basic explorer or asset-view integration.
- Project and asset save/load entry points against workspace files.
- Clear separation between extension-host logic and browser-playable runtime previews.

## Smoke-Test Expectations

- Existing `ballistics_coordinator` remains buildable and playable.
- Launcher behavior remains intact.
- At least one game can be built directly without going through the full launcher flow.
- Project open/save plumbing works against a local project directory.

## Exit Criteria

- Build scripts reflect the repo's real structure.
- The project model is documented clearly enough to support sprite assets next.
- VS Code extension authoring scaffolding exists or is fully specified for immediate implementation.
- Filesystem concerns are abstracted before editor documents are built on top.

## Risks

- Overdesigning the project format before a real tool uses it.
- Mixing runtime asset loading rules with authoring-time local filesystem rules.
- Letting VS Code extension scaffolding sprawl into a fake standalone application model too early.

## Out Of Scope

- Full editor shell UX.
- Sprite editor implementation.
- Map editor implementation.
- Tracker and synth work.
- Polish and export ergonomics.

## Plan: RetroBuffer Framework Roadmap

RetroBuffer should evolve from a reusable game bootstrap into a small JavaScript-native retro creation framework with integrated tools, while preserving the current WebGL-backed immediate-mode renderer, the shared app/bootstrap layer, the game registry, and the new `src/games/` structure. Recommended approach: treat the current repository as the seed of a multi-layer system with four parallel tracks that remain tightly coordinated: runtime/API ergonomics, project and asset model, integrated editors, and smoke-test games. The immediate next work should be planning and repository guidance, not deep feature implementation: produce the canonical planning document, break it into milestone/tool reference docs under `reference/`, add workspace-shared planning agents, and amend workspace instructions so future implementation follows the same framework vision.

### Project Identity

RetroBuffer should feel like a JavaScript-native retro creation workbench: a small, opinionated, retro-forward environment where browser-playable games, VS Code extension-based asset tools, assets, and validation demos live inside one coherent system.

What should feel Picotron-like:
- Tight feedback between runtime and creation tools.
- A compact drawing and media API that feels toy-like in the best way.
- A sense that games, assets, and tools are part of one little machine.
- Built-in editors that encourage iteration instead of external-pipeline friction.

What should intentionally diverge:
- No Lua, no Lua table semantics, no compatibility chase.
- Editor layouts should use modern browser UI affordances and larger work surfaces when useful.
- Project structure should be explicit, file-based, and JavaScript-native.
- Runtime and tooling should embrace modules, typed data shapes, JSON manifests, and browser APIs.

What makes RetroBuffer uniquely JavaScript-native:
- Native ES modules as the authoring model.
- Browser-playable runtime plus VS Code extension-based authoring tools built with WebGL, Web Audio, custom editors, webviews, and Node-backed workflows under a retro-facing API.
- Shared code between games, editors, and validation demos through the same repo structure.
- Integrated launcher and smoke-test games under `src/games/` as part of development culture.

Target developer and user experience:
- A solo developer or small team should be able to open the repo, run one command, launch a game or tool, and iterate immediately.
- The framework should feel constrained enough to be charming, but not so constrained that it blocks practical game development.
- Every subsystem should prefer obviousness, inspectability, and fast iteration over clever abstraction.

### Design Principles

API design:
- Keep the public runtime API small, immediate-mode, and mnemonic.
- Hide internal complexity behind explicit configuration objects and stable engine contracts.
- Avoid introducing multiple ways to do the same thing early.

Editor UX:
- Shared shell, shared widgets, shared interaction grammar.
- Modern paneling is allowed; fake retro friction is not a goal.
- Tools should feel like part of the same machine as the runtime, not bolt-on utilities.

Data formats:
- Prefer explicit, versioned, human-readable metadata for project-facing data.
- Use binary or image-backed payloads only where they materially improve runtime or editing performance.
- Every persisted format must have a migration path from day one.

Rendering decisions:
- Preserve the current WebGL-backed immediate-mode direction.
- Keep retro-facing behavior at the API level; keep batching, atlasing, and palette tricks internal.
- Use smoke-test games to validate rendering additions before exposing them as public API.

Audio tooling:
- Start with the smallest useful tracker-plus-synth loop.
- Instrument authoring and playback must share one runtime model.
- Avoid building a DAW; build a compact music tool that serves game production.

Scope decisions:
- Use smoke-test games as the proving ground for each new feature or tool.
- Land must-have vertical slices before broadening feature breadth.
- Prefer one coherent implementation path over optionality-heavy architecture.

### Major Subsystems

Core runtime:
- Responsibility: own game lifecycle, shared app bootstrap, game contract, timing, storage access, and system coordination.
- Interfaces: `src/js/app/`, game definition contract, future project runtime context.
- Challenges: keeping lifecycle stable while expanding toward tools and project-mode workflows.

Rendering layer:
- Responsibility: indexed-color rendering, palettes, dithering, sprites, text, surfaces, and eventual editor rendering helpers.
- Interfaces: `src/js/core/Retrobuffer.js`, `src/js/core/immediate/`, future editor canvas widgets.
- Challenges: preserving API simplicity while adding surfaces, tilemaps, palette effects, and debugging aids.

Input system:
- Responsibility: action mapping, cursor state, keyboard, mouse, touch, gamepad, and future editor shortcuts.
- Interfaces: `src/js/core/InputManager.js`, shared command system later.
- Challenges: reconciling gameplay input and editor input without duplicating interaction infrastructure.

Audio runtime:
- Responsibility: playback of music and sound effects, future synth voice model, tracker sequencing.
- Interfaces: current music code, future tracker and synth data formats, runtime sound API.
- Challenges: browser audio state, latency, deterministic playback expectations, authoring-time preview.

Asset system:
- Responsibility: manifest-driven loading, asset descriptors, caching, and editor/runtime asset interchange.
- Interfaces: current asset manifests in games, future project model and import/export layer.
- Challenges: reconciling runtime simplicity with tool-rich metadata.

Project and file model:
- Responsibility: define what a RetroBuffer project is on disk, how assets are named, grouped, versioned, and migrated.
- Interfaces: `src/games/`, future project packages, reference docs, build tooling.
- Challenges: staying simple enough for manual editing while supporting tools cleanly.

Editor shell:
- Responsibility: shared VS Code extension tooling surfaces, commands, asset browser, inspectors, custom editors, webview views, and document lifecycle.
- Interfaces: VS Code extension host, custom editors, webview views, launcher, browser runtime previews, shared state.
- Challenges: fitting rich retro-forward tools into VS Code ergonomics without rebuilding a fake standalone app inside the editor.

Sprite editor:
- Responsibility: indexed-color image editing, frames, palettes, basic transforms, stamps, and runtime asset alignment.
- Interfaces: sprite assets, palette assets, runtime blit APIs.
- Challenges: keeping tools responsive and dither-aware without building an entire paint program.

Map editor:
- Responsibility: layered tilemap editing, metadata layers, collision/entity markers, chunk-aware navigation.
- Interfaces: tilesets, map assets, runtime tilemap renderer and lookup APIs.
- Challenges: balancing an MVP map format with enough metadata for real game production.

Music tracker:
- Responsibility: pattern editing, song arrangement, transport, instrument assignment, and runtime playback data.
- Interfaces: synth patches, audio runtime, project model.
- Challenges: making it feel musical and usable early without overbuilding effect commands.

Synthesizer:
- Responsibility: patch design, envelopes, oscillator/noise, filter and modulation basics, live preview.
- Interfaces: tracker instruments, runtime sound API, project model.
- Challenges: browser CPU cost, state serialization, and keeping the UI legible.

Serialization/import/export:
- Responsibility: project save/load, asset imports, format versioning, migrations, and distributable exports.
- Interfaces: project model, tools, build pipeline.
- Challenges: keeping formats stable while the framework is still evolving.

Packaging/build/export pipeline:
- Responsibility: bundle launcher, direct game targets, tools, smoke-test games, packing, zip output, and reporting.
- Interfaces: `package.json`, Rollup config, size scripts, future project export workflow.
- Challenges: the repo is currently launcher-aware in source but still mostly single-target in packaging.

Documentation/examples/templates:
- Responsibility: planning docs, milestone docs, tool docs, onboarding guides, templates, and smoke-test recipes.
- Interfaces: `reference/`, README, `.github/` guidance.
- Challenges: keeping docs aligned with implementation as the framework grows.

### Runtime and API Direction

Recommended approach:
- Preserve immediate-mode drawing at the public API level.
- Introduce more structured internal systems for surfaces, assets, maps, and audio state.
- Use short, readable JavaScript names inspired by fantasy-console ergonomics, but not strict Picotron naming.

Naming conventions:
- Keep primitive names compact: `pset`, `line`, `rect`, `rectFill`, `circFill`, `spr`, `map`, `print`, `pal`, `dither`, `cam`, `clip`.
- Use explicit object-based configuration when complexity rises: `spr(id, x, y, { atlas, flipX, flipY, scale })`.
- Keep system entrypoints descriptive: `createProject`, `openTool`, `playSong`, `playSfx`, `loadAsset`.

What should remain immediate-mode:
- Primitives, sprite draws, text draws, camera transforms, clip regions, palette swaps, dither changes, and frame rendering.

What should become more structured internally:
- Surface management, tilemap storage and draw plans, palette remap tables, command buffering, asset loading, audio sequencing, and editor document models.

How to preserve tiny-machine usability while leveraging WebGL:
- Keep one simple render object in game code.
- Internally batch commands, atlas textures, and palette lookups in shaders.
- Treat advanced features as configuration or optional state changes, not new conceptual systems for casual users.

API mistakes to avoid early:
- Do not leak raw WebGL concepts into author-facing APIs.
- Do not create parallel sprite APIs for editor/runtime before asset formats settle.
- Do not overload a single function with too many optional positional parameters.
- Do not couple project editing APIs to DOM widgets.

### Asset and Project Model

Recommended approach:
- Standardize on one explicit project folder model inside the repository, with future support for standalone exported projects.
- Keep project metadata and most asset manifests JSON-based and versioned.
- Use hybrid formats when runtime/editor performance benefits are clear.

Project structure on disk:
- `src/games/<slug>/` remains the home for smoke-test and demo games.
- Future RetroBuffer projects should mirror this with local folders for code, sprites, tilesets, maps, palette, audio, and project config.

Recommended asset formats:
- Sprites: hybrid. JSON metadata plus image-index payload or compact indexed bitmap payload.
- Tilesets: hybrid. Sprite-like storage with tile metadata.
- Maps: JSON first for MVP, potentially chunked JSON or binary-backed chunks later.
- Palettes: JSON metadata plus explicit ordered color entries.
- Music patterns: JSON for authoring, optional compiled runtime cache later.
- Synth patches: JSON.
- Metadata: JSON.
- Project config: JSON.

Versioning and migrations:
- Every asset file should carry a `formatVersion`.
- Keep migrations code-driven and centralized.
- Avoid silent in-place rewrites without upgrade tracking.

Human editability:
- JSON should remain readable and stable enough to diff.
- Binary blobs should only appear where hand-editing provides little value.

Import/export concerns:
- Support import from common image/audio formats at the tool boundary, not the runtime boundary.
- Export should compile authoring assets into runtime-friendly bundles without losing source data.

### Editor Architecture

Recommended approach:
- One integrated authoring tool suite inside VS Code using custom editors, webviews, views, and commands, not a separate standalone creator app.
- Build a shared extension substrate with a minimal document model, reusable canvas widgets, message-passing contracts, and a command bus.

Shared infrastructure should include:
- VS Code-native placement across custom editors, webview views, explorer trees, panels, and commands.
- Asset browser.
- Inspector.
- Tabbed documents.
- Shared selection model.
- Undo/redo stack per document plus global command integration.
- Clipboard abstraction for tool data.
- Zoom and pan primitives for canvas documents.
- Keyboard shortcut registry.
- Reusable grid, timeline, and transport widgets.
- Shared state split into app shell state, project state, and document-local state.

UI architecture recommendation:
- Keep extension-host state, project state, and webview document state explicit and modular.
- Prefer VS Code-native surfaces over recreating a full desktop window manager inside the tooling layer.
- Use shared document controllers and message protocols so tools look different but behave consistently.

### Sprite Editor Plan

MVP:
- Indexed-color canvas editing.
- Pencil, erase, fill, rectangular selection.
- Palette selection.
- Frame list for simple animation.
- Save/load to sprite asset format aligned with runtime atlas expectations.

v1:
- Stamp/brush tools.
- Flip and rotate transforms.
- Tile slicing.
- Onion skinning.
- Mirroring and symmetry.
- Dithering-aware painting.
- Better animation timeline controls.

Later:
- Multi-layer sprite editing.
- Palette remap previews.
- Procedural fill or brush helpers.
- Batch tile operations.

Runtime alignment:
- Sprite assets should map directly into atlas slots and metadata that runtime blits can use with minimal translation.

### Map Editor Plan

Recommended map model:
- Layered tilemap with optional metadata layers and marker layers.
- Start tile-based, not freeform.
- Support chunking internally later, but keep author-facing MVP simple.

MVP:
- One tileset selection workflow.
- Paint, erase, rectangle fill, replace.
- Layer visibility and locking.
- Basic metadata markers for spawns and triggers.

v1:
- Multiple tile layers.
- Collision or logic layer.
- Entity markers with typed metadata.
- Large-map editing with chunked loading and viewport culling.

Later:
- Streaming world support.
- Reusable map prefabs.
- Rule-based paint helpers.

Why recommended:
- This reaches practical game usefulness sooner than building a generalized world editor first.

### Music Tracker Plan

MVP:
- Pattern grid.
- Song arrangement made of pattern order.
- Fixed small channel count.
- Note, instrument, volume, and a minimal effect set.
- Transport, loop, and runtime playback.

Usable v1:
- More effect commands.
- Per-channel mute/solo.
- Better edit ergonomics.
- Instrument previews from tracker rows.
- Solid tempo and speed model with deterministic playback.

Later:
- Advanced automation and pattern tools.
- Richer effect command vocabulary.
- Cross-song pattern management.

Recommended structure:
- Keep note data grid-oriented and tracker-native.
- Bind tracker rows to synth patches through explicit instrument definitions.
- Compile to a runtime playback structure rather than interpreting raw editor state every frame.

### Synthesizer Plan

MVP:
- Oscillator basics plus noise.
- ADSR envelope.
- Simple filter.
- Patch save/load.
- Real-time preview and tracker instrument binding.

v1:
- More waveform choices.
- Modulation routing limited to the most useful paths.
- Small effect chain if it is cheap and stable.
- Better UI for envelope and filter editing.

Later:
- Rich modulation matrix.
- Macro controls.
- More sophisticated effects.

Why recommended:
- A compact synth tightly paired with the tracker is more valuable than a broad synth with weak workflow integration.

### Rendering and Performance Strategy

Recommended approach:
- Maintain the retro illusion in the API and presentation, not by limiting internal implementation.
- Keep immediate-mode command collection, but batch and resolve internally.

Key strategy:
- Continue batching shape and sprite commands.
- Use palette lookup and remapping through shader-friendly structures.
- Introduce offscreen surfaces and framebuffers as internal primitives before exposing them broadly.
- Allow post-processing only after base rendering and tool rendering are stable.
- Keep text rendering atlas-based unless a more flexible glyph pipeline becomes necessary.
- Preserve fixed integer display scaling behavior for runtime and editor preview modes where appropriate.

Risks:
- Debugging palette and remap bugs in shader code.
- Tool rendering paths diverging from game rendering paths.
- Surface proliferation without lifecycle discipline.
- Premature post-process features complicating the pipeline.

### Development Workflow

Recommended creator workflow:
- One command starts the launcher and active development environment.
- Games and tools should run inside the same shell.
- Smoke-test games should be the first consumers of new runtime and editor capabilities.

Workflow expectations:
- Keep browser-playable runtime output as a core product goal, but do not treat browser-only authoring as the baseline.
- Standardize on Node-backed development tooling and VS Code extension-based asset editors early so authoring stays inside the same workspace as code, git, and build commands.
- Use live reload and targeted rebuilds for both VS Code extension webviews and browser runtime previews.
- Add debug overlays and inspection tools incrementally.
- Treat battle-test games as part of the architecture, not just examples.

Runtime versus authoring environment:
- The runtime and final exported games should remain browser-playable wherever practical.
- The authoring environment should assume VS Code extension-based tooling from the start, because the desired workflow keeps game code, assets, git, and build commands inside one editor.
- Node-backed tooling is a foundational requirement, not an optional later addition, because final game builds, packaging, and export workflows already require server-side or local Node execution.
- A separate standalone creator shell should only be reconsidered later if VS Code extension surfaces prove materially insufficient for the needed asset workflows.

### Phased Roadmap

Phase 1: Foundation
- Goal: align guidance and planning around the actual repo state.
- Build: canonical planning guide, reference doc breakdown, workspace agents, updated copilot instructions.
- Why now: without shared guidance, implementation work will drift.
- Exit criteria: planning guide approved, milestone/tool docs specified, customization plan approved.

Phase 2: Core Runtime Consolidation
- Goal: stabilize the runtime, project model, and VS Code extension authoring foundation around the current shared launcher and game contract.
- Build: direct game targeting in build scripts, project model draft, runtime API cleanup, asset manifest conventions, VS Code extension scaffolding, shared custom-editor/webview foundations, and a filesystem/project-I/O abstraction for workspace-backed project authoring.
- Why now: the current runtime split exists, but build, project, and extension-authoring layers lag behind.
- Exit criteria: launcher plus direct-game build flow, stable asset and game definition conventions, and a proven path for local project and asset editing inside VS Code.

Phase 3: First Creator Workflow
- Goal: prove runtime plus one tool plus one smoke-test loop.
- Build: palette and sprite asset pipeline, first sprite editor MVP, one smoke-test game updated to consume authored sprite assets.
- Why now: validates the integrated-creation promise early.
- Exit criteria: edit a sprite asset in-repo and see it in a game through the shared toolchain.

Phase 4: Integrated Editors
- Goal: establish the shared editor shell and document model.
- Build: editor workspace, asset browser, inspector, tabbed docs, undo/redo, sprite editor v1, map editor MVP.
- Why now: multiple tools need shared interaction infrastructure.
- Exit criteria: two tools share the same shell and document systems.

Phase 5: Audio Toolchain
- Goal: add a usable music workflow.
- Build: audio runtime refresh, synth MVP, tracker MVP, runtime playback integration, audio smoke-test scenes or games.
- Why now: audio is complex enough to deserve its own phase after visual/editor patterns are proven.
- Exit criteria: author and play a short song through the runtime.

Phase 6: Polish and Ecosystem
- Goal: turn the framework into a cohesive creator environment.
- Build: migrations, export polish, more smoke-test games, templates, docs, debugging tools, optional advanced rendering features.
- Why now: polish depends on stable core patterns.
- Exit criteria: framework can onboard a new project with docs, templates, and at least a few validating games.

### Risks and Scope Traps

Overengineering risks:
- Building a fully general editor framework before two tools prove the shared abstractions.
- Designing a perfect asset schema before real tools use it.

False Picotron parity goals:
- Chasing syntax or compatibility instead of workflow feel.
- Copying constraints that only make sense in Picotron’s environment.

UI complexity traps:
- Building full desktop-style docking too early.
- Overinvesting in shell chrome before tools are actually useful.

Audio traps:
- Trying to build a rich DAW too early.
- Overloading the tracker with effects before playback stability is proven.

Serialization traps:
- Mixing runtime-compiled data and authoring data in one unstable file.
- Skipping versioning because formats are “temporary”.

Editor rabbit holes:
- Tool-specific widgets with no shared layer.
- Abstract command systems with no real tool pressure.

Web limitations:
- Filesystem and audio constraints should inform architecture, not be denied.

Do not build yet:
- Strict Picotron compatibility layers.
- Alternative standalone creator shells beyond the initial VS Code extension tool suite.
- Complex post-processing stack.
- Multi-user collaboration.
- Plugin ecosystems.

### Recommended First Vertical Slice

Recommended slice:
- Shared project model plus sprite editor MVP plus one smoke-test game that loads authored sprites from a project asset file.

What it validates:
- Runtime direction.
- Asset loading and serialization.
- One real editor workflow.
- Shared shell/document concepts.
- The principle that games are the battle-tests for new features.

Why recommended:
- It touches runtime, assets, tool UX, and smoke-test game integration without requiring the full map or audio stack.

### Suggested Repo / Module Structure

Recommended structure direction:
- `src/js/core/` for stable runtime and rendering internals.
- `src/js/app/` for launcher, display shell, lifecycle, and future editor shell glue.
- `src/games/` for smoke-test and example games.
- Future top-level folders or namespaces for `tools`, `audio`, `project-model`, and shared UI components once implementation begins.
- `reference/` for planning and milestone/tool docs.
- `.github/agents/` for workspace-shared specialist agents.
- `.github/copilot-instructions.md` as the always-on guidance layer for repo direction.

### Concrete Milestones

Implementation milestones:
0. Create the source-controlled `reference/` planning set before any other implementation work so the roadmap is captured in-repo and reviewable alongside code changes.
   - Create `reference/` milestone docs adjacent to `reference/retrobuffer-planning.md`:
     - `reference/retrobuffer-milestone-01-foundation.md`
     - `reference/retrobuffer-milestone-02-runtime-consolidation.md`
     - `reference/retrobuffer-milestone-03-first-creator-workflow.md`
     - `reference/retrobuffer-milestone-04-integrated-editors.md`
     - `reference/retrobuffer-milestone-05-audio-toolchain.md`
     - `reference/retrobuffer-milestone-06-polish-and-ecosystem.md`
   - Create tool docs adjacent to the planning guide:
     - `reference/retrobuffer-tool-sprite-editor.md`
     - `reference/retrobuffer-tool-map-editor.md`
     - `reference/retrobuffer-tool-music-tracker.md`
     - `reference/retrobuffer-tool-synthesizer.md`
    - Ensure these docs explicitly reflect the current repo state, VS Code extension-based authoring, Node-backed build/export, and the use of smoke-test games as validation.
1. Finalize and approve the canonical RetroBuffer planning guide against current repo state.
  2. Amend `.github/copilot-instructions.md` to cover framework evolution, integrated tools, VS Code extension-based authoring, and smoke-test game expectations.
3. Add new workspace agents for architecture, runtime/API, tools/editors, audio, and smoke-test games.
4. Parameterize direct game build targeting and finish the packaging/export refactor already implied by the current repo state.
5. Define the project and asset model for sprite assets first.
6. Build the first sprite-authoring vertical slice and validate it through a smoke-test game.

Recommended agent set:
- `.github/agents/retrobuffer-architecture.agent.md`
- `.github/agents/retrobuffer-runtime-api.agent.md`
- `.github/agents/retrobuffer-editor-tooling.agent.md`
- `.github/agents/retrobuffer-audio-systems.agent.md`
- `.github/agents/retrobuffer-smoke-test-games.agent.md`
- Keep `.github/agents/retrobuffer-game-dev.agent.md` for implementation-focused work.

### Immediate Next Steps

1. Create the six milestone markdown files and four tool markdown files in `reference/` adjacent to `reference/retrobuffer-planning.md` as the first source-controlled implementation artifact.
2. Update the planning guide and those new reference docs to explicitly reflect the current repo state, VS Code extension-based authoring, Node-backed build/export, and smoke-test games as recurring validation.
3. Amend `.github/copilot-instructions.md` to move from bootstrap cleanup guidance to framework-evolution guidance while preserving the lightweight architecture rules.
4. Create the new workspace-shared agent files for architecture, runtime/API, editors, audio, and smoke-test games.
5. Finish the current build/export refactor so the repo’s multi-game source structure is matched by the tooling layer.
6. Start the first vertical slice by drafting the sprite asset format and sprite editor MVP boundaries.

### Relevant files

- `/home/malmr/repos/scratch/JS13K2025-black-cat/reference/retrobuffer-planning.md` — canonical planning brief to respond to and split into adjacent docs.
- `/home/malmr/repos/scratch/JS13K2025-black-cat/.github/copilot-instructions.md` — current always-on workspace guidance that should be amended or replaced for framework evolution work.
- `/home/malmr/repos/scratch/JS13K2025-black-cat/.github/agents/retrobuffer-game-dev.agent.md` — current implementation agent; should remain but gain companion planning agents.
- `/home/malmr/repos/scratch/JS13K2025-black-cat/src/js/core/Retrobuffer.js` — existing rendering/runtime baseline the framework plan must preserve.
- `/home/malmr/repos/scratch/JS13K2025-black-cat/src/js/app/displayShell.js` — existing shared shell abstraction that the editor shell plan should account for.
- `/home/malmr/repos/scratch/JS13K2025-black-cat/src/js/app/gamePlayer.js` — existing lifecycle abstraction that future project and tool workflows should build on.
- `/home/malmr/repos/scratch/JS13K2025-black-cat/src/games/registry.js` — existing registry that should become the pattern for smoke-test game registration.
- `/home/malmr/repos/scratch/JS13K2025-black-cat/src/games/ballistics_coordinator/` — first smoke-test game project and proof that the repo is already moving toward the planned structure.
- `/home/malmr/repos/scratch/JS13K2025-black-cat/scripts/rollup.config.js` — current build layer still lagging behind the source layout and needing roadmap attention.
- `/home/malmr/repos/scratch/JS13K2025-black-cat/package.json` — current dev/build command surface that must evolve with the framework plan.

### Verification

1. Confirm the planning guide and adjacent reference docs reflect the current repo reality, not a hypothetical rewrite.
2. Confirm the proposed milestone files and tool files map cleanly onto the phases and tool sections in the planning brief.
3. Confirm the proposed agent set cleanly separates planning, runtime/API, editors, audio, smoke-test games, and implementation work.
4. Confirm updated copilot instructions would reinforce lightweight architecture, JavaScript-native tooling, and smoke-test-game validation instead of only bootstrap cleanup.
5. Confirm the roadmap keeps the current WebGL immediate-mode renderer and `src/games/` project direction as foundational assumptions.

### Decisions

- Chosen customization scope: workspace-shared under `.github/`.
- Chosen reference granularity: one file per milestone plus one file per planned tool.
- Chosen roadmap emphasis: runtime and API feel first, then integrated creator workflow, then broader editor and audio systems.
- Chosen validation strategy: add games as battle/smoke tests for new runtime features and tools throughout the roadmap.
- Chosen platform stance: browser-playable runtime output, but VS Code extension-based authoring and Node-backed build/export from the start.
- Chosen authoring stance: VS Code extension-based asset tooling is the explicit default authoring surface for the roadmap; standalone creator shells are a later reevaluation topic, not a current abstraction target.
- Chosen architectural stance: evolve the current repo incrementally; do not reset the project around a new grand framework.

### Further Considerations

1. Recommended approach: keep `reference/retrobuffer-planning.md` as the canonical umbrella vision and create adjacent milestone/tool docs as working implementation guides. Alternative: split the big planning guide completely. Why recommended: preserves one authoritative vision while making execution more navigable.
2. Recommended approach: amend `.github/copilot-instructions.md` rather than replacing it wholesale with only framework-planning concerns. Alternative: discard the current bootstrap-focused guidance. Why recommended: the existing lightweight-architecture and anti-JS13K-sprawl rules are still valid and should become a subset of the broader framework guidance.
3. Recommended approach: create several narrowly scoped workspace agents instead of one massive “RetroBuffer planner” agent. Alternative: one monolithic planning agent. Why recommended: architecture, runtime/API, tools, audio, and smoke-test game work are distinct enough to benefit from focused discovery and handoff behavior.
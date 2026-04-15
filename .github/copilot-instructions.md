# Project Guidelines

## Repository Direction

- Treat this repository as the seed of a JavaScript-native RetroBuffer framework, not as a finished JS13K entry and not just as a one-game bootstrap.
- Follow the roadmap in `reference/plan.md` and the milestone and tool docs under `reference/` when implementation priorities or scope tradeoffs are unclear.
- Preserve the repo's current strengths: lightweight runtime code, immediate-mode ergonomics, reusable shared infrastructure, and a multi-game layout under `src/games/`.
- Keep bundles reasonably small and self-contained, but do not preserve jam-era constraints when they make the framework harder to extend, validate, or maintain.

## Platform Stance

- Browser-playable runtime output remains a core product goal.
- VS Code extension-based asset tooling is the default direction for authoring.
- Node-backed build, export, and packaging workflows are foundational assumptions, not optional later additions.
- Do not spend time maintaining browser-only authoring constraints or standalone-app assumptions when they conflict with a VS Code-centered workflow, workspace files, or export reliability.

## Architecture

- Keep the lightweight canvas and RetroBuffer-centered architecture unless a task clearly requires broader change.
- Prefer small, direct improvements to the engine, runtime, and toolchain over introducing heavyweight frameworks or speculative abstractions.
- Treat shared engine code under `src/js/core/` as stable infrastructure: preserve existing APIs unless there is a clear payoff for changing them.
- Treat shared bootstrap and lifecycle code under `src/js/app/` as the base for launcher, runtime, and future VS Code tool integration.
- Treat `src/games/` as both example content and smoke-test coverage for framework features.
- When building tools, prefer reusable VS Code extension systems such as custom editors, webviews, tree views, and commands over isolated one-off tool applications.

## Planning And Scope

- Respect the milestone order in `reference/plan.md` unless the user explicitly reprioritizes work.
- Use smoke-test games as the proving ground for new runtime features, asset flows, and tools.
- Land vertical slices before broadening feature scope. A smaller end-to-end workflow is more valuable than a wide partial system.
- Do not chase Picotron compatibility, Lua semantics, or fantasy-console imitation when it conflicts with a coherent JavaScript-native design.
- Do not build plugin systems, multi-user collaboration, or alternative standalone creator shells unless the roadmap explicitly reaches that stage.

## Build And Validation

- Use `npm start` for active development and `npm run build` for production validation.
- When working on build tooling, move the repo toward direct game targeting, maintainable export flows, and VS Code-extension-aware authoring support.
- Validate targeted changes with the smallest relevant command or check instead of expanding scope unnecessarily.
- When touching shared runtime, build, project-model, or tooling code, call out likely downstream effects on games or authoring workflows.

## Conventions

- Match the existing JavaScript style and keep edits focused.
- Prefer plain, readable code over clever size-golfing.
- When removing old constraints or systems, leave behind a clear replacement path or placeholder rather than partial dead code.
- Keep reference docs, workspace instructions, and agent files aligned with implementation decisions as the framework evolves.
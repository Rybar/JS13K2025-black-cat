# RetroBuffer Milestone 06: Polish And Ecosystem

## Purpose

Milestone 06 turns RetroBuffer from a promising internal framework into a cohesive creator environment that can support new projects with less hand-holding.

## Goals

- Polish project export and packaging.
- Add migrations and upgrade discipline for evolving asset formats.
- Improve debugging and inspection tools.
- Expand documentation, templates, and example coverage.
- Add more smoke-test games to validate the framework under different content pressures.

## Deliverables

- Export polish for browser-playable final builds.
- Migration layer for versioned assets and project data.
- Debug overlays and inspection tools where they materially improve iteration speed.
- Project templates and onboarding documentation.
- More smoke-test and battle-test games under `src/games/`.
- Better examples covering runtime APIs and authored asset flows.

## Ecosystem Priorities

### Templates

Provide templates only after the project model is stable enough that they will not immediately rot.

### Documentation

Documentation should cover:
- New project setup.
- Asset workflows.
- Tool usage.
- Runtime API patterns.
- Build and export flows.

### Battle-Test Games

By this milestone, the framework should be exercised by more than one type of game. Aim for games that stress different parts of the stack:
- Sprite-heavy presentation.
- Tilemap-driven gameplay.
- Audio-centric interaction.
- UI-heavy or tool-like interaction.

## Smoke-Test Expectations

- Multiple games validate the same runtime and toolchain assumptions.
- Exported builds remain browser-playable.
- Project upgrades and migrations are tested against older authored assets.
- Documentation is strong enough for a new user to onboard without oral history.

## Exit Criteria

- RetroBuffer can onboard a new project with docs and templates.
- Export and migration workflows are no longer ad hoc.
- The framework has enough validation coverage to make future refactors safer.

## Risks

- Spending too long polishing before the core workflows are stable.
- Treating examples as marketing material instead of regression coverage.
- Adding too many optional systems before the base framework is clearly coherent.

## Out Of Scope

- Strict Picotron compatibility.
- Plugin ecosystems.
- Multi-user collaboration.
- Fancy packaging features that do not improve creator workflows.

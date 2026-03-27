# Project Guidelines

## Repository Direction

- Treat this repository as a RetroBuffer bootstrap for future canvas-based 2D JavaScript games, not as a finished JS13K entry.
- Prefer changes that remove old game-specific logic, content, and jam-era assumptions in favor of a clean placeholder project.
- Keep bundles self-contained and reasonably small, but do not preserve JS13K-specific constraints when they make the project harder to extend or maintain.

## Architecture

- Keep the lightweight canvas and RetroBuffer-centered architecture unless a task clearly requires broader change.
- Prefer small, direct improvements to the engine and game loop over introducing new frameworks or large abstractions.
- Treat shared engine code under `src/js/core/` as stable infrastructure: preserve existing APIs unless there is a clear payoff for changing them.

## Build And Validation

- Use `npm start` for active development and `npm run build` for production validation.
- When working on build tooling, favor a maintainable bootstrap pipeline over jam-oriented compression steps that no longer fit the repo's direction.
- Validate targeted changes with the smallest relevant command or check instead of expanding scope unnecessarily.

## Conventions

- Match the existing JavaScript style and keep edits focused.
- Prefer plain, readable code over clever size-golfing.
- When removing old constraints or systems, leave behind a clear replacement path or placeholder rather than partial dead code.
# RetroBuffer Bootstrap

This repository is a lightweight starting point for small indexed-color JavaScript games built around the current WebGL immediate-mode renderer.

It currently ships with a small interactive demo instead of a full game so the repo stays focused on reusable engine and bootstrap code.

## Included

- An immediate-mode indexed-color renderer under `src/js/core/ImmediateModeEngine.js` and `src/js/core/immediate/`.
- A particle stress-test demo in `src/js/game.js` that boots the engine and exercises the current primitive and sprite paths.
- A production build that keeps output self-contained without JS13K-specific packing steps.

## Getting Started

- `npm start` builds `dist/game.js` in watch mode and serves the project with live reload.
- `npm run build` creates a production bundle and a self-contained `dist/index.html`.
- `npm run build:size` also runs Roadroller, writes packed artifacts to `dist/`, creates `dist/gamejam.zip` as a real distributable, and prints raw and zipped size numbers for the normal and packed builds.

## Project Layout

- `src/js/core/` contains the active engine code, the `immediate/` renderer internals, and `musicplayer.js` if you want to bring audio back later.
- `src/js/game.js` is the demo entrypoint you replace when starting a new game.
- `src/img/palette.webp` contains the palette row and sprite/font source data used by the current renderer.

## Starting Your Own Game

The current demo is intentionally small. Replace the logic in `src/js/game.js` with your own update and draw loop, or split it into game-specific modules once you know the structure you want.

The main boot pattern is:

```javascript
const atlasImage = new Image();
atlasImage.src = 'DATAURL:src/img/palette.webp';
atlasImage.onload = () => {
  const engine = new ImmediateModeEngine(480, 270, atlasImage);
  document.getElementById('game').appendChild(engine.canvas);
  resizeCanvas(engine.canvas, 480, 270);
  requestAnimationFrame(loop);
};
```

From there, draw with methods such as `pset`, `line`, `rectFill`, `circleFill`, `ellipseFill`, `polygonFill`, `drawSprite`, and `drawAtlasSprite` inside your frame loop.

## Notes

- The repo still favors small bundles and simple runtime behavior.
- JS13K-specific constraints and packing tricks are not part of the default workflow, but optional size-pack tooling is available when you want to inspect packed output.

This project is released under the MIT license.

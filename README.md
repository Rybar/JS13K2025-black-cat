# Tiny JS Game Boilerplate

This repository provides a small framework for building 13&nbsp;kB JavaScript games. It includes:

- **RetroBuffer** – an indexed colour framebuffer with drawing primitives.
- **SoundBox** – a tiny synth for sound effects and music.
- Rollup, Roadroller and other tools to generate minified builds.

## RetroBuffer overview

`src/js/game.js` loads `src/img/palette.webp` and creates a `RetroBuffer` once the atlas is ready:

```javascript
const atlasURL = 'DATAURL:src/img/palette.webp';
loadAtlas(atlasURL, () => {
  r = new RetroBuffer(screenWidth, screenHeight, atlasImage, 10);
  document.getElementById('game').appendChild(r.canvas);
  resizeCanvas(r.canvas, screenWidth, screenHeight);
  gameFont = new SpriteFont(r);
  Game.init({ r, Key, screenWidth, screenHeight, gameFont });
});
```

RetroBuffer stores a palette and multiple pages of 8‑bit RAM. Use methods such as `pset`, `line`, `rectFill`, `blitFromPage` or `scaledBlit` to draw to the screen buffer, then call `r.render()` each frame. Colours can be remapped through the `colorTable` for palette effects.

## Creating a game

Game modules live in `src/js/games`. The file `games/template.js` contains a minimal skeleton:

```javascript
export default {
  init({ r, Key, screenWidth, screenHeight, gameFont }) { /* setup */ },
  titleUpdate(dt) {},
  titleDraw() {},
  update(dt) {},
  draw() {},
  gameOverUpdate(dt) {},
  gameOverDraw() {}
};
```

To start your own game, copy `template.js` to a new file and fill in the functions. Then edit `src/js/game.js` and change the import at the top:

```javascript
import Game from './games/demo.js'; // replace with your module
```

The engine handles input, timing and simple state transitions between the title screen, game play and game over screens.

## Playing sounds

Sound effects exported from [SoundBox](http://sb.bitsnbites.eu/) are plain JavaScript objects stored under `src/js/sounds`. To use them:

```javascript
import { initAudio, playSound } from './core/utils.js';
import tada from './sounds/tada.js';

let soundBank;
function initGameData() {
  soundBank = initAudio([{ name: 'tada', data: tada }]);
}

// later on
playSound(soundBank.tada);
```

The file `sound_assets_editable.md` keeps a bunch of data URLs from last year's entry so they can be reloaded in SoundBox for editing.

## Development

- `npm start` builds the project and serves `dist/` with live reload.
- `npm run build` generates a compressed build in `dist/`. The final zip step requires `advzip`; if it is missing the command may fail.


This boilerplate is released under the MIT license.

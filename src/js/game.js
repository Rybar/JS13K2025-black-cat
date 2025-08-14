import RetroBuffer from './core/RetroBuffer.js';
import { Key, resizeCanvas, loadAtlas, initAudio, playSound, randFloat, clamp, distance, rand, getMapTile } from './core/utils.js';
import SpriteFont from './core/SpriteFont.js';
import SpriteSheet, { scaledSprite } from './core/SpriteSheet.js';
import tada from './sounds/tada.js';

(function () {
  // --- Core state ---
  let lastFrameTime = performance.now();
  let paused = false;
  let gamestate = 0;
  const LOADING = 0, TITLESCREEN = 2, GAMESCREEN = 1, GAMEOVER = 3;

  const screenWidth = 240, screenHeight = 135;
  document.body.style = 'margin:0; background:black; overflow:hidden';
  let r, gameFont;

  let soundData, soundBank, sheet;
  let fps = 60;
  const FPS_SMOOTH = 0.1;
  let font;

  // debug flag: show current state in upper-right
  const DEBUG = true;
  function drawDebugState(name) {
    if (!DEBUG || !font) return;
    const txt = name;
    const w = txt.length * font.charWidth;
    const x = Math.max(0, screenWidth - w - 4);
    const y = 2;
    font.drawText(txt, x, y);
  }

  function initGameData(){
    soundData = [{ name: 'tada', data: tada }];
    soundBank = initAudio(soundData);
  }

  function initSprites() {
    const page = 0;
    sheet = new SpriteSheet(r, page, 0, 79, 8, 8, 64);
  }

  function drawChecker() {
    const size = 16;
    for (let y = 0; y < screenHeight; y += size) {
      for (let x = 0; x < screenWidth; x += size) {
        const c = ((x/size + y/size) & 1) ? 53 : 54;
        r.rectFill(x, y, x + size - 1, y + size - 1, c);
      }
    }
  }

  function drawAll() {
    drawChecker();
    font.drawTextColored(`FPS: ${fps}`, 4, 4, 2);
  }

  const Game = {
    init({ r:buf, Key:K, screenWidth:w, screenHeight:h, gameFont:gf }) {
      r = buf || r;
      font = gf || gameFont;
      initGameData();
      initSprites();
      this.over = false;
    },

    titleUpdate(dt) {
      // start the game on any key release
      if (Object.keys(Key.released).length) {
        playSound(soundBank.tada);
        gamestate = GAMESCREEN;
      }
    },
    titleDraw() { 
      // draw background then centered title
      r.clear(0, r.SCREEN);
      drawAll();
      const txt = 'Toby';
      const w = txt.length * font.charWidth;
      const x = Math.floor((screenWidth - w) / 2);
      const y = Math.floor((screenHeight - font.charHeight) / 2);
      font.drawText(txt, x, y);
      drawDebugState('TITLESCREEN');
    },

    update(dt) {
      if (Key.justReleased && Key.justReleased(Key.r)) playSound(soundBank.tada);
    },

  draw() { drawAll(); drawDebugState('GAMESCREEN'); },

    gameOverUpdate(dt) {
      // restart on any key release
      if (Object.keys(Key.released).length) {
        playSound(soundBank.tada);
        Game.init({ r, Key, screenWidth, screenHeight, gameFont });
        gamestate = GAMESCREEN;
      }
    },
    gameOverDraw() { 
      r.clear(0, r.SCREEN);
      drawAll();
      const txt = 'Game Over';
      const w = txt.length * font.charWidth;
      const x = Math.floor((screenWidth - w) / 2);
      const y = Math.floor((screenHeight - font.charHeight) / 2);
      font.drawText(txt, x, y);
      drawDebugState('GAMEOVER');
    }
  };

  // Load palette & boot
  const atlasURL = 'DATAURL:src/img/palette.webp';
  const atlasImage = new Image();
  atlasImage.src = atlasURL;
  loadAtlas(atlasURL, () => {
    r = new RetroBuffer(screenWidth, screenHeight, atlasImage, 10);
    document.getElementById('game').appendChild(r.canvas);
    resizeCanvas(r.canvas, screenWidth, screenHeight);
    gameFont = new SpriteFont(r);

  // Initialize inlined game
  Game.init({ r, Key, screenWidth, screenHeight, gameFont });
    gamestate = TITLESCREEN;

    createEventListeners();
    requestAnimationFrame(loop);
  });

  function loop(timestamp) {
    const deltaTime = timestamp - lastFrameTime;
    lastFrameTime = timestamp;

    switch (gamestate) {
      case LOADING:
        // optional loading screen
        break;
      case TITLESCREEN:
        Game.titleUpdate(deltaTime);
        Game.titleDraw();
        break;
      case GAMESCREEN:
        if (!paused) Game.update(deltaTime);
        drawGame();
        if (Game.over) gamestate = GAMEOVER;
        break;
      case GAMEOVER:
        Game.gameOverUpdate(deltaTime);
        Game.gameOverDraw();
        break;
    }
    Key.update();

    r.render();
    requestAnimationFrame(loop);
  }

  function drawGame() {
    r.clear(0, r.SCREEN);
  Game.draw();
  }

  function createEventListeners() {
    window.addEventListener('keydown', Key.onKeydown.bind(Key));
    window.addEventListener('keyup',   Key.onKeyup.bind(Key));
    window.addEventListener('blur',    () => paused = true);
    window.addEventListener('focus',   () => paused = false);
    window.addEventListener('resize',  () => resizeCanvas(r.canvas, screenWidth, screenHeight));
    window.addEventListener('click',   handleClick);
  }

  function handleClick() {
    if (gamestate === TITLESCREEN) {
      gamestate = GAMESCREEN;
    } else if (gamestate === GAMEOVER) {
      Game.init({ r, Key, screenWidth, screenHeight, gameFont });
      gamestate = GAMESCREEN;
    }
  }

})();

import RetroBuffer from './core/RetroBuffer.js';
import { Key, resizeCanvas, loadAtlas } from './core/utils.js';
import SpriteFont from './core/SpriteFont.js';
import Game from './games/demo.js';

(function () {
  // --- Core state ---
  let lastFrameTime = performance.now();
  let paused = false;
  let gamestate = 0;
  const LOADING = 0, TITLESCREEN = 2, GAMESCREEN = 1, GAMEOVER = 3;

  const screenWidth = 480, screenHeight = 270;
  document.body.style = 'margin:0; background:black; overflow:hidden';
  let r, gameFont;

  // Load palette & boot
  const atlasURL = 'DATAURL:src/img/palette.webp';
  const atlasImage = new Image();
  atlasImage.src = atlasURL;
  loadAtlas(atlasURL, () => {
    r = new RetroBuffer(screenWidth, screenHeight, atlasImage, 10);
    document.getElementById('game').appendChild(r.canvas);
    resizeCanvas(r.canvas, screenWidth, screenHeight);
    gameFont = new SpriteFont(r);

    // Delegate init to the game module
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

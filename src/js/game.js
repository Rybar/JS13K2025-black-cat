import RetroBuffer from './core/RetroBuffer.js';
import { Key, resizeCanvas, loadAtlas, initAudio, playSound, randFloat, clamp, distance, rand, getMapTile } from './core/utils.js';
import SpriteFont from './core/SpriteFont.js';
import SpriteSheet, { scaledSprite } from './core/SpriteSheet.js';
import ClickableEntity from './core/ClickableEntity.js';
import LaserTurret from './core/LaserTurret.js';
import ParticleSystem from './core/ParticleSystem.js';
import tada from './sounds/tada.js';

import Mirror from './core/Mirror.js';
(function () {
  // --- Core state ---
  let lastFrameTime = performance.now();
  let paused = false;
  let gamestate = 0;
  const LOADING = 0, TITLESCREEN = 2, GAMESCREEN = 1, GAMEOVER = 3;

  const screenWidth = 480, screenHeight = 270;
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

  // active clickable entities (populated in Game.init)
  let clickables = [];
  // laser turrets in the scene
  let turrets = [];
  // player movement speed (pixels per update tick) - slow tank-like speed
  const TURRET_SPEED = 0.06; // pixels per ms; scaled by dt in update
  // mouse position in retro buffer coordinates
  let mouseX = -10, mouseY = -10;
  // mouse button state
  let mouseDown = false;
  // particle system
  let particleSys = null;
  // track which entities were toggled during the current mouse-hold
  let holdToggledEntities = new Set();
  // particle spawn timer (ms) for continuous beam
  let beamParticleTimer = 0;
  const BEAM_PARTICLE_PERIOD = 150; // ms between particle spawns while beam hitting

  const Game = {
    init({ r:buf, Key:K, screenWidth:w, screenHeight:h, gameFont:gf }) {
      r = buf || r;
      font = gf || gameFont;
      initGameData();
      initSprites();
      this.over = false;
  // create a few clickable entities at different positions on the gamescreen
  clickables = [];
  clickables.push(new ClickableEntity(20, 20, 28, 18, 9, 11));
  clickables.push(new ClickableEntity(80, 10, 24, 24, 14, 16));
  clickables.push(new ClickableEntity(140, 40, 32, 20, 21, 23));
  clickables.push(new ClickableEntity(40, 80, 64, 28, 30, 32));
  // add additional clickables
  clickables.push(new ClickableEntity(220, 20, 28, 18, 12, 13));
  clickables.push(new ClickableEntity(300, 60, 24, 24, 15, 18));
  clickables.push(new ClickableEntity(360, 90, 32, 20, 22, 25));

  // add a mirror into the scene
  const mirror = new Mirror(200, 120, 12, 12, 14);
  // flip orientation for variety
  mirror.flipped = false;
  clickables.push(mirror);

  // create a single laser turret at top-middle
  turrets = [];
  const turretX = Math.floor((screenWidth - 8) / 2);
  const turretY = 8; // top area
  turrets.push(new LaserTurret(turretX, turretY, 8, 8, 48));

  // particle system
  particleSys = new ParticleSystem(r);
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
      // Player/turret movement: move the first turret with keyboard (WASD or arrows)
      if (turrets.length > 0) {
        const t = turrets[0];
        let mvx = 0, mvy = 0;
        if (Key.isDown(Key.LEFT) || Key.isDown(Key.a)) mvx -= 1;
        if (Key.isDown(Key.RIGHT) || Key.isDown(Key.d)) mvx += 1;
        if (Key.isDown(Key.UP) || Key.isDown(Key.w)) mvy -= 1;
        if (Key.isDown(Key.DOWN) || Key.isDown(Key.s)) mvy += 1;
        if (mvx !== 0 || mvy !== 0) {
          // normalize diagonal movement
          const mag = Math.hypot(mvx, mvy) || 1;
          const nx = mvx / mag;
          const ny = mvy / mag;
          // apply movement scaled by dt
          // apply movement scaled by dt and check collisions against active clickables
          const nextX = t.x + nx * TURRET_SPEED * dt;
          const nextY = t.y + ny * TURRET_SPEED * dt;
          // turret bounding box for collision
          const tb = { x: nextX, y: nextY, w: t.w, h: t.h };
          // check overlap against any active clickable that blocks movement
          let blocked = false;
          for (let c of clickables) {
            if (!c) continue;
            const b = (typeof c.getBounds === 'function') ? c.getBounds() : null;
            // treat mirrors (which always return bounds) and active clickables as obstacles
            if (!b) continue;
            // simple AABB overlap
            if (tb.x < b.x + b.w && tb.x + tb.w > b.x && tb.y < b.y + b.h && tb.y + tb.h > b.y) {
              blocked = true;
              break;
            }
          }
          if (!blocked) {
            t.x = nextX;
            t.y = nextY;
            // clamp to screen bounds so turret stays visible
            t.x = Math.max(0, Math.min(screenWidth - t.w, t.x));
            t.y = Math.max(0, Math.min(screenHeight - t.h, t.y));
          }
        }
      }
      if (Key.justReleased && Key.justReleased(Key.r)) playSound(soundBank.tada);
      // continuous firing while mouse button is held
      if (mouseDown && turrets.length > 0) {
        // don't fire if cursor is inside any toggleable object (mouse clicks should be used instead)
        let cursorInToggle = false;
        for (let c of clickables) {
          if (!c) continue;
          if (typeof c.onClick === 'function' && typeof c.contains === 'function' && c.contains(mouseX, mouseY)) {
            cursorInToggle = true;
            break;
          }
        }
        if (cursorInToggle) {
          // skip firing while cursor is inside a togglable area
        } else {
          const t = turrets[0];
          const shot = t.fireAt(mouseX, mouseY, clickables, r.width, r.height);
          if (shot && shot.hits && shot.hits.length) {
            // iterate hits in order; for laser hits call onLaserHit (not onClick)
            for (let h of shot.hits) {
              if (!h || !h.entity) continue;
              if (typeof h.entity.onLaserHit === 'function' && !holdToggledEntities.has(h.entity)) {
                h.entity.onLaserHit();
                holdToggledEntities.add(h.entity);
              }
            }

            // spawn particles for the first non-mirror hit only, periodically
            let nonMirrorHit = shot.hits.find(h => h && h.entity && !h.entity.isMirror);
            beamParticleTimer += dt;
            if (beamParticleTimer >= BEAM_PARTICLE_PERIOD) {
              beamParticleTimer = 0;
              if (nonMirrorHit && particleSys) particleSys.spawn(nonMirrorHit.x, nonMirrorHit.y, 6, 36);
            }
          } else {
            // no hit -> spawn a particle at the mouse/cursor position periodically while firing
            beamParticleTimer += dt;
            if (beamParticleTimer >= BEAM_PARTICLE_PERIOD) {
              beamParticleTimer = 0;
              if (particleSys) particleSys.spawn(mouseX, mouseY, 6, 36);
            }
          }
        }
      }
      // Ensure beam doesn't persist when not holding
      if (!mouseDown && turrets.length > 0 && turrets[0].lastShot) {
        turrets[0].lastShot = null;
      }
    },

  draw() { 
    drawAll();
    // draw clickable entities and turrets when on the gamescreen
    clickables.forEach(c => c.draw(r));
    turrets.forEach(t => t.draw(r));
    // draw retro mouse cursor (small crosshair)
    const cursorColor = 36;
    // only draw if inside screen
    if (mouseX >= 0 && mouseX < screenWidth && mouseY >= 0 && mouseY < screenHeight) {
      // crosshair
      r.line(mouseX - 6, mouseY, mouseX + 6, mouseY, cursorColor);
      r.line(mouseX, mouseY - 6, mouseX, mouseY + 6, cursorColor);
      // small box center
      r.rectFill(mouseX - 1, mouseY - 1, mouseX + 1, mouseY + 1, cursorColor);
    }
    drawDebugState('GAMESCREEN');
  },

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
  // update particle system
  if (particleSys) particleSys.update(deltaTime);
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
  // draw particles on top
  if (particleSys) particleSys.draw();
  }

  function createEventListeners() {
    window.addEventListener('keydown', Key.onKeydown.bind(Key));
    window.addEventListener('keyup',   Key.onKeyup.bind(Key));
    window.addEventListener('blur',    () => paused = true);
    window.addEventListener('focus',   () => paused = false);
    window.addEventListener('resize',  () => resizeCanvas(r.canvas, screenWidth, screenHeight));
    // map clicks on the canvas to retro buffer coordinates and handle them
    r.canvas.addEventListener('click', handleCanvasClick);
    // track mouse position so we can draw a retro cursor
    r.canvas.addEventListener('mousemove', (evt) => {
      const p = screenToGame(evt.clientX, evt.clientY);
      mouseX = p.x; mouseY = p.y;
    });
    r.canvas.addEventListener('mousedown', (evt) => {
      const p = screenToGame(evt.clientX, evt.clientY);
      mouseX = p.x; mouseY = p.y;
      mouseDown = true;
      holdToggledEntities.clear();
    });
    function stopFiring() {
      mouseDown = false;
      holdToggledEntities.clear();
      beamParticleTimer = 0;
      // clear turret beam visualization
      if (turrets.length > 0) turrets[0].lastShot = null;
    }
    window.addEventListener('mouseup', (evt) => {
      stopFiring();
    });
  // pointer/touch fallbacks
  window.addEventListener('pointerup', stopFiring);
  window.addEventListener('pointercancel', stopFiring);
  window.addEventListener('touchend', stopFiring);
  window.addEventListener('touchcancel', stopFiring);
    r.canvas.addEventListener('mouseleave', () => {
      stopFiring();
    });
    // hide the native cursor over the canvas
    r.canvas.style.cursor = 'none';
  }

  // Convert a mouse event's client coordinates to RetroBuffer pixel coords
  function screenToGame(clientX, clientY) {
    const rect = r.canvas.getBoundingClientRect();
    // canvas is styled (CSS) to scale; map client coords into canvas pixels
  // Use the RetroBuffer logical dimensions (r.width/r.height) to map to game pixel coords
  const scaleX = r.width / rect.width;
  const scaleY = r.height / rect.height;
  const x = Math.floor((clientX - rect.left) * scaleX);
  const y = Math.floor((clientY - rect.top) * scaleY);
    return { x, y };
  }

  function handleCanvasClick(evt) {
    // Map to retro coords
    const pos = screenToGame(evt.clientX, evt.clientY);
    if (gamestate === TITLESCREEN) {
      gamestate = GAMESCREEN;
      return;
    }
    if (gamestate === GAMEOVER) {
      Game.init({ r, Key, screenWidth, screenHeight, gameFont });
      gamestate = GAMESCREEN;
      return;
    }

    if (gamestate === GAMESCREEN) {
      // First, let the single turret fire towards the clicked position; stop at first hit
      let handled = false;
      if (turrets.length > 0) {
        const shot = turrets[0].fireAt(pos.x, pos.y, clickables, r.width, r.height);
        if (shot && shot.hits && shot.hits.length) {
          // prefer toggling the first non-mirror hit; if none, toggle the first hit (mirror) which flips it
          let nonMirror = shot.hits.find(h => h && h.entity && typeof h.entity.isMirror === 'undefined');
          let first = shot.hits[0];
          const target = nonMirror || first;
          if (target && target.entity && typeof target.entity.onClick === 'function') {
            // Mirrors should only toggle when clicked directly (cursor inside their bounds).
            if (target.entity.isMirror) {
              if (typeof target.entity.contains === 'function' && target.entity.contains(pos.x, pos.y)) {
                target.entity.onClick();
                handled = true;
                // no particle for mirrors
              }
            } else {
              target.entity.onClick();
              handled = true;
              // only spawn particle for non-mirror target
              if (particleSys) particleSys.spawn(target.x, target.y, 8, 36);
            }
          }
        }
        // if turret shot didn't hit anything, but the beam endpoint equals the clicked position,
        // spawn a particle at the cursor to indicate the beam landed there
        if (!handled && shot && (!shot.hits || !shot.hits.length)) {
          if (particleSys) particleSys.spawn(pos.x, pos.y, 8, 36);
  }
      }

      if (!handled) {
        // fall back to direct clicking on clickables, from topmost to bottom; stop at first
        for (let i = clickables.length - 1; i >= 0; i--) {
          const c = clickables[i];
          if (typeof c.contains === 'function' && c.contains(pos.x, pos.y)) {
            if (typeof c.onClick === 'function') {
              c.onClick();
              handled = true;
              break;
            }
          }
        }
      }
  // For single clicks, don't leave the beam visible after mouse release
  if (turrets.length > 0) turrets[0].lastShot = null;
    }
  }

})();

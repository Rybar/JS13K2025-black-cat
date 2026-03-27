import ImmediateModeEngine from './core/ImmediateModeEngine.js';
import { resizeCanvas } from './core/utils.js';

(function () {
  const screenWidth = 480;
  const screenHeight = 270;
  const atlasURL = 'DATAURL:src/img/palette.webp';
  const twoPi = Math.PI * 2;
  const playfield = { x: 10, y: 8, w: screenWidth - 20, h: screenHeight - 16 };
  const worldWidth = 420;
  const worldCenterX = worldWidth * 0.5;
  const hudPanel = { x: 310, y: 16, w: 154, h: 92 };

  const palette = {
    black: 1,
    white: 2,
    soot: 3,
    stone: 0,
    silver: 6,
    bog: 7,
    moss: 8,
    lime: 9,
    pear: 10,
    chartreuse: 11,
    lichen: 12,
    sage: 13,
    fern: 14,
    duskSage: 15,
    slateTeal: 16,
    ink: 17,
    midnight: 18,
    ocean: 19,
    storm: 20,
    mineral: 21,
    aqua: 22,
    seafoam: 23,
    frost: 24,
    mist: 25,
    cloud: 26,
    periwinkle: 27,
    gunmetal: 28,
    lilac: 29,
    amethyst: 30,
    plum: 31,
    indigoPlum: 32,
    blackberry: 33,
    mulberry: 34,
    cranberry: 35,
    raspberry: 36,
    salmon: 37,
    apricot: 38,
    sand: 39,
    amber: 40,
    toasted: 41,
    rust: 42,
    coral: 43,
    brick: 44,
    garnet: 45,
    mahogany: 46,
    coffee: 47,
    walnut: 48,
    clay: 49,
    terracotta: 50,
    mauveTaupe: 51,
    aubergine: 52,
    smokyPlum: 53,
    midnightPlum: 54,
    bark: 55,
    mushroom: 56,
    straw: 57,
  };

  const keys = Object.create(null);
  const pointer = { x: screenWidth * 0.5, y: screenHeight * 0.72, active: false, down: false };

  const state = {
    elapsed: 0,
    scroll: 0,
    waveIndex: 0,
    waveTimer: 100,
    camera: { x: 0, y: 0 },
    shake: 0,
    flash: 0,
    warning: 0,
    score: 0,
    kills: 0,
    chain: 0,
    bestChain: 0,
    intensity: 1,
    fps: 60,
    fpsFrames: 0,
    fpsTimer: 0,
    fpsDisplay: 'FPS 60',
    glyphRects: new Map(),
    player: null,
    enemies: [],
    enemyShots: [],
    playerShots: [],
    effects: [],
    pickups: [],
    stars: [],
    arches: [],
  };

  let engine;
  let lastFrameTime = performance.now();
  let paused = false;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function randomInt(min, max) {
    return Math.floor(randomRange(min, max + 1));
  }

  function randomFrom(values) {
    return values[Math.floor(Math.random() * values.length)];
  }

  function boot() {
    const atlasImage = new Image();
    atlasImage.src = atlasURL;
    atlasImage.onload = () => {
      engine = new ImmediateModeEngine(screenWidth, screenHeight, atlasImage);
      cacheGlyphs();
      initScene();

      const mount = document.getElementById('game');
      mount.appendChild(engine.canvas);
      resizeCanvas(engine.canvas, screenWidth, screenHeight);
      bindEvents();
      requestAnimationFrame(loop);
    };
  }

  function cacheGlyphs() {
    for (const ch of 'HPX!RISK<>^*+-/GPU') {
      state.glyphRects.set(ch, engine.getGlyphRect(ch));
    }
  }

  function initScene() {
    state.elapsed = 0;
    state.scroll = 0;
    state.waveIndex = 0;
    state.waveTimer = 280;
    state.camera.x = 0;
    state.camera.y = 0;
    state.shake = 0;
    state.flash = 0;
    state.warning = 0;
    state.score = 0;
    state.kills = 0;
    state.chain = 0;
    state.bestChain = 0;
    state.intensity = 1;
    state.enemies.length = 0;
    state.enemyShots.length = 0;
    state.playerShots.length = 0;
    state.effects.length = 0;
    state.pickups.length = 0;
    state.stars.length = 0;
    state.arches.length = 0;

    state.player = {
      x: worldCenterX,
      localY: playfield.h - 42,
      y: playfield.h - 42,
      radius: 9,
      speed: 0.24,
      fireTimer: 0,
      beamTimer: 0,
      beamCharge: 0,
      beamEnergy: 100,
      hp: 100,
      invuln: 0,
      roll: 0,
      hueFlip: 0,
    };

    for (let layer = 0; layer < 3; layer++) {
      for (let index = 0; index < 80; index++) {
        state.stars.push({
          layer,
          x: randomRange(-40, worldWidth + 40),
          y: randomRange(-20, 1200),
          size: 1 + ((index + layer) % 3 === 0 ? 1 : 0),
          color: layer === 0 ? palette.gunmetal : layer === 1 ? palette.mist : palette.aqua,
          speed: 0.03 + layer * 0.02 + Math.random() * 0.02,
          twinkle: Math.random() * twoPi,
        });
      }
    }

    for (let index = 0; index < 18; index++) {
      state.arches.push({
        y: index * 72,
        width: 150 + (index % 3) * 24,
        glow: index % 2 === 0 ? palette.aqua : palette.amber,
      });
    }
  }

  function bindEvents() {
    globalThis.addEventListener('keydown', (event) => {
      keys[event.code] = true;
    });

    globalThis.addEventListener('keyup', (event) => {
      keys[event.code] = false;
    });

    globalThis.addEventListener('blur', () => {
      paused = true;
      pointer.down = false;
    });

    globalThis.addEventListener('focus', () => {
      paused = false;
    });

    globalThis.addEventListener('resize', () => {
      resizeCanvas(engine.canvas, screenWidth, screenHeight);
    });

    engine.canvas.addEventListener('mousemove', (event) => {
      const pos = screenToCanvas(event.clientX, event.clientY);
      pointer.x = pos.x;
      pointer.y = pos.y;
      pointer.active = true;
    });

    engine.canvas.addEventListener('mouseenter', () => {
      pointer.active = true;
    });

    engine.canvas.addEventListener('mouseleave', () => {
      pointer.active = false;
      pointer.down = false;
    });

    engine.canvas.addEventListener('mousedown', () => {
      pointer.down = true;
      pointer.active = true;
    });

    globalThis.addEventListener('mouseup', () => {
      pointer.down = false;
    });
  }

  function screenToCanvas(clientX, clientY) {
    const rect = engine.canvas.getBoundingClientRect();
    return {
      x: clamp(Math.floor((clientX - rect.left) * (screenWidth / rect.width)), 0, screenWidth - 1),
      y: clamp(Math.floor((clientY - rect.top) * (screenHeight / rect.height)), 0, screenHeight - 1),
    };
  }

  function addPlayerShot(x, y, vx, vy, colorA, colorB, type = 'needle') {
    if (state.playerShots.length > 260) state.playerShots.shift();
    state.playerShots.push({
      x,
      y,
      vx,
      vy,
      age: 0,
      life: 1200,
      colorA,
      colorB,
      type,
      radius: type === 'pulse' ? 5 : 3,
      rotation: Math.atan2(vy, vx),
      spin: randomRange(-0.01, 0.01),
    });
  }

  function addEnemyShot(x, y, vx, vy, style, colorA, colorB, radius = 4) {
    if (state.enemyShots.length > 900) state.enemyShots.shift();
    state.enemyShots.push({
      x,
      y,
      vx,
      vy,
      style,
      colorA,
      colorB,
      radius,
      age: 0,
      life: 4400,
      rotation: Math.atan2(vy, vx),
      spin: randomRange(-0.008, 0.008),
      glyph: randomFrom(['X', 'R', '!', '*']),
    });
  }

  function addEffect(kind, x, y, options = {}) {
    if (state.effects.length > 700) state.effects.shift();
    state.effects.push({
      kind,
      x,
      y,
      vx: options.vx ?? randomRange(-0.12, 0.12),
      vy: options.vy ?? randomRange(-0.18, 0.18),
      size: options.size ?? randomRange(2, 10),
      age: 0,
      life: options.life ?? randomRange(300, 900),
      colorA: options.colorA ?? palette.aqua,
      colorB: options.colorB ?? palette.frost,
      colorC: options.colorC ?? palette.amber,
      rotation: options.rotation ?? randomRange(0, twoPi),
      spin: options.spin ?? randomRange(-0.02, 0.02),
      glyph: options.glyph ?? randomFrom(['X', 'P', 'R', 'G', '*']),
      spriteIndex: options.spriteIndex ?? randomInt(0, 5),
      thickness: options.thickness ?? randomRange(1, 2.6),
      seed: Math.random() * 1000,
      sides: options.sides ?? randomInt(4, 7),
    });
  }

  function spawnBurst(x, y, colors, count = 14) {
    const kinds = ['spark', 'tri', 'ring', 'glyph', 'sprite', 'diamond', 'ellipse'];
    for (let index = 0; index < count; index++) {
      addEffect(randomFrom(kinds), x, y, {
        colorA: randomFrom(colors),
        colorB: randomFrom(colors),
        colorC: randomFrom(colors),
        size: randomRange(2, 8),
        life: randomRange(240, 860),
        vx: randomRange(-0.18, 0.18),
        vy: randomRange(-0.2, 0.14),
        spriteIndex: randomInt(0, 5),
      });
    }
  }

  function addPickup(x, y, flavor) {
    if (state.pickups.length > 24) state.pickups.shift();
    state.pickups.push({
      x,
      y,
      vx: randomRange(-0.02, 0.02),
      vy: randomRange(0.015, 0.045),
      flavor,
      age: 0,
      life: 6000,
      radius: 7,
      glyph: flavor === 'beam' ? 'R' : flavor === 'score' ? 'P' : 'X',
      colorA: flavor === 'beam' ? palette.aqua : flavor === 'score' ? palette.amber : palette.chartreuse,
      colorB: flavor === 'beam' ? palette.frost : flavor === 'score' ? palette.apricot : palette.lichen,
    });
  }

  function addEnemy(kind, x, y, options = {}) {
    if (state.enemies.length > 56) return;
    const palettes = {
      scout: [palette.coral, palette.brick, palette.apricot],
      spinner: [palette.aqua, palette.seafoam, palette.frost],
      carrier: [palette.amethyst, palette.lilac, palette.apricot],
      shrine: [palette.amber, palette.sand, palette.frost],
      warden: [palette.mulberry, palette.aubergine, palette.apricot],
    };
    const colors = palettes[kind] ?? [palette.aqua, palette.frost, palette.amber];
    state.enemies.push({
      kind,
      x,
      y,
      vx: options.vx ?? 0,
      vy: options.vy ?? 0.04,
      hp: options.hp ?? (kind === 'warden' ? 260 : kind === 'carrier' ? 56 : kind === 'shrine' ? 80 : 18),
      maxHp: options.hp ?? (kind === 'warden' ? 260 : kind === 'carrier' ? 56 : kind === 'shrine' ? 80 : 18),
      radius: options.radius ?? (kind === 'warden' ? 26 : kind === 'carrier' ? 16 : kind === 'shrine' ? 12 : 9),
      t: 0,
      seed: Math.random() * 1000,
      fireTimer: randomRange(280, 900),
      mode: options.mode ?? 0,
      phase: options.phase ?? 0,
      swing: options.swing ?? randomRange(18, 64),
      anchorX: x,
      spriteIndex: options.spriteIndex ?? randomInt(0, 5),
      colorA: colors[0],
      colorB: colors[1],
      colorC: colors[2],
    });
  }

  function spawnWave() {
    const top = state.scroll - 50;
    const laneLeft = 54;
    const laneRight = worldWidth - 54;
    const pattern = state.waveIndex % 6;
    state.waveIndex += 1;

    if (pattern === 0) {
      for (let index = 0; index < 7; index++) {
        const t = index / 6;
        addEnemy('scout', lerp(laneLeft, laneRight, t), top - index * 18, {
          swing: 22 + index * 6,
          vy: 0.045,
          mode: index % 2,
        });
      }
      state.waveTimer = 1050;
      return;
    }

    if (pattern === 1) {
      for (let index = 0; index < 4; index++) {
        addEnemy('spinner', 92 + index * 76, top - index * 26, {
          hp: 26,
          radius: 11,
          swing: 30,
          vy: 0.032,
          mode: index,
        });
      }
      state.waveTimer = 900;
      return;
    }

    if (pattern === 2) {
      addEnemy('carrier', worldCenterX - 72, top - 18, { swing: 44, mode: 1, vy: 0.026, hp: 64, radius: 18 });
      addEnemy('carrier', worldCenterX + 72, top - 54, { swing: 44, mode: -1, vy: 0.026, hp: 64, radius: 18 });
      for (let index = 0; index < 5; index++) {
        addEnemy('scout', 78 + index * 64, top - 112 - index * 10, { swing: 18, vy: 0.05, mode: index % 2 });
      }
      state.waveTimer = 1500;
      return;
    }

    if (pattern === 3) {
      for (let index = 0; index < 9; index++) {
        const x = worldCenterX + Math.sin(index * 0.7) * 120;
        addEnemy('shrine', x, top - index * 22, { hp: 28, radius: 10, vy: 0.05, mode: index });
      }
      state.waveTimer = 980;
      return;
    }

    if (pattern === 4) {
      state.warning = 1400;
      addEnemy('warden', worldCenterX, top - 90, { vy: 0.022, hp: 300, radius: 28, swing: 66, mode: 2, spriteIndex: 2 });
      state.waveTimer = 2600;
      return;
    }

    for (let index = 0; index < 10; index++) {
      const side = index % 2 === 0 ? laneLeft + 18 : laneRight - 18;
      addEnemy(index % 3 === 0 ? 'spinner' : 'scout', side + (index % 2 === 0 ? 1 : -1) * index * 8, top - index * 26, {
        swing: 38,
        vy: 0.046,
        mode: index,
      });
    }
    state.waveTimer = 880;
  }

  function aimedSpread(enemy, count, speed, spread, style) {
    const dx = state.player.x - enemy.x;
    const dy = state.player.y - enemy.y;
    const base = Math.atan2(dy, dx);
    for (let index = 0; index < count; index++) {
      const t = count === 1 ? 0.5 : index / (count - 1);
      const angle = base + lerp(-spread, spread, t);
      addEnemyShot(enemy.x, enemy.y, Math.cos(angle) * speed, Math.sin(angle) * speed, style, enemy.colorA, enemy.colorB, style === 'line' ? 5 : 4);
    }
  }

  function ringBurst(enemy, count, speed, style) {
    for (let index = 0; index < count; index++) {
      const angle = (index / count) * twoPi + enemy.t * 0.0007;
      addEnemyShot(enemy.x, enemy.y, Math.cos(angle) * speed, Math.sin(angle) * speed, style, enemy.colorA, enemy.colorB, style === 'diamond' ? 5 : 4);
    }
  }

  function spiralBurst(enemy, arms, speed, style) {
    for (let index = 0; index < arms; index++) {
      const angle = enemy.t * 0.0022 + index * (twoPi / arms);
      addEnemyShot(enemy.x, enemy.y, Math.cos(angle) * speed, Math.sin(angle) * speed + 0.015, style, enemy.colorB, enemy.colorC, 4);
    }
  }

  function update(dt) {
    state.elapsed += dt;
    state.scroll += dt * (0.052 + state.intensity * 0.0012);
    state.intensity = 1 + Math.min(1.8, state.elapsed * 0.00004);
    state.warning = Math.max(0, state.warning - dt);
    state.flash = Math.max(0, state.flash - dt * 0.0032);
    state.shake *= 0.9;

    state.fpsTimer += dt;
    state.fpsFrames += 1;
    if (state.fpsTimer >= 250) {
      state.fps = (state.fpsFrames * 1000) / state.fpsTimer;
      state.fpsDisplay = `FPS ${Math.round(state.fps)}`;
      state.fpsTimer = 0;
      state.fpsFrames = 0;
    }

    updatePlayer(dt);
    updateStars(dt);
    updateSpawn(dt);
    updateEnemies(dt);
    updatePlayerShots(dt);
    updateEnemyShots(dt);
    updatePickups(dt);
    updateEffects(dt);
    updateCamera(dt);
  }

  function updatePlayer(dt) {
    const player = state.player;
    const moveLeft = keys.ArrowLeft || keys.KeyA;
    const moveRight = keys.ArrowRight || keys.KeyD;
    const moveUp = keys.ArrowUp || keys.KeyW;
    const moveDown = keys.ArrowDown || keys.KeyS;
    const focus = keys.ShiftLeft || keys.ShiftRight || pointer.down;
    const localLeft = playfield.x + 18;
    const localRight = playfield.x + playfield.w - 18;
    const localTop = playfield.y + 22;
    const localBottom = playfield.y + playfield.h - 16;

    let targetX = player.x;
    let targetLocalY = player.localY;

    if (pointer.active) {
      targetX = state.camera.x + clamp(pointer.x, localLeft, localRight);
      targetLocalY = clamp(pointer.y, localTop, localBottom);
      player.x = lerp(player.x, targetX, focus ? 0.12 : 0.18);
      player.localY = lerp(player.localY, targetLocalY, focus ? 0.14 : 0.2);
    } else {
      const speed = player.speed * (focus ? 0.48 : 1) * dt;
      if (moveLeft) player.x -= speed;
      if (moveRight) player.x += speed;
      if (moveUp) player.localY -= speed;
      if (moveDown) player.localY += speed;
    }

    player.x = clamp(player.x, 34, worldWidth - 34);
    player.localY = clamp(player.localY, localTop, localBottom);
    player.y = state.scroll + player.localY;
    player.roll = lerp(player.roll, clamp((targetX - player.x) * 0.04, -0.8, 0.8), 0.08);
    player.invuln = Math.max(0, player.invuln - dt);
    player.hueFlip += dt * 0.006;
    player.fireTimer -= dt;
    player.beamTimer -= dt;

    const fireRate = focus ? 64 : 82;
    if (player.fireTimer <= 0) {
      player.fireTimer += fireRate;
      const spread = focus ? 0.018 : 0.06;
      addPlayerShot(player.x - 5, player.y - 8, -spread, -0.84, palette.frost, palette.aqua, focus ? 'pulse' : 'needle');
      addPlayerShot(player.x + 5, player.y - 8, spread, -0.84, palette.frost, palette.aqua, focus ? 'pulse' : 'needle');
      if (!focus) {
        addPlayerShot(player.x, player.y - 14, 0, -0.94, palette.amber, palette.apricot, 'pulse');
      }
    }

    if (focus || keys.Space) {
      player.beamCharge = clamp(player.beamCharge + dt * 0.0032, 0, 1);
      if (player.beamEnergy > 0) {
        player.beamEnergy = Math.max(0, player.beamEnergy - dt * 0.022);
        applyPlayerBeam(dt, player.beamCharge);
      }
    } else {
      player.beamCharge = Math.max(0, player.beamCharge - dt * 0.0045);
      player.beamEnergy = Math.min(100, player.beamEnergy + dt * 0.014);
    }
  }

  function applyPlayerBeam(dt, beamCharge) {
    const player = state.player;
    const beamWidth = 8 + beamCharge * 14;
    const damage = dt * (0.08 + beamCharge * 0.07);
    for (const enemy of state.enemies) {
      if (enemy.y > player.y) continue;
      if (Math.abs(enemy.x - player.x) <= enemy.radius + beamWidth) {
        enemy.hp -= damage;
        if (state.elapsed - enemy.seed > 0 && player.beamTimer <= 0) {
          addEffect('spark', enemy.x + randomRange(-4, 4), enemy.y + randomRange(-8, 8), {
            colorA: palette.aqua,
            colorB: palette.frost,
            life: 260,
            size: 3,
            vx: randomRange(-0.08, 0.08),
            vy: randomRange(-0.18, -0.04),
          });
        }
      }
    }
    if (player.beamTimer <= 0) {
      player.beamTimer = 34;
      addEffect('ring', player.x, player.y - 24, {
        size: 10 + beamCharge * 12,
        life: 180,
        colorA: palette.aqua,
        colorB: palette.frost,
        vx: 0,
        vy: -0.06,
      });
    }
  }

  function updateStars(dt) {
    for (const star of state.stars) {
      star.y += dt * star.speed * (1 + state.intensity * 0.1);
      if (star.y < state.scroll - 40) star.y += 1400;
      if (star.y > state.scroll + 1200) star.y -= 1400;
      star.twinkle += dt * (0.001 + star.layer * 0.0007);
    }
  }

  function updateSpawn(dt) {
    state.waveTimer -= dt;
    if (state.waveTimer <= 0) {
      spawnWave();
    }
  }

  function updateEnemies(dt) {
    for (let index = state.enemies.length - 1; index >= 0; index--) {
      const enemy = state.enemies[index];
      enemy.t += dt;
      enemy.y += enemy.vy * dt;

      if (enemy.kind === 'scout') {
        enemy.x = enemy.anchorX + Math.sin(enemy.t * 0.0022 + enemy.mode) * enemy.swing;
        enemy.fireTimer -= dt;
        if (enemy.fireTimer <= 0) {
          enemy.fireTimer = 540 + enemy.mode * 40;
          aimedSpread(enemy, 3, 0.14, 0.22, 'diamond');
        }
      } else if (enemy.kind === 'spinner') {
        enemy.x = enemy.anchorX + Math.sin(enemy.t * 0.0028 + enemy.seed) * enemy.swing;
        enemy.fireTimer -= dt;
        if (enemy.fireTimer <= 0) {
          enemy.fireTimer = 420;
          ringBurst(enemy, 8, 0.105, 'ring');
        }
      } else if (enemy.kind === 'carrier') {
        enemy.x = enemy.anchorX + Math.sin(enemy.t * 0.0015 + enemy.mode) * enemy.swing;
        enemy.fireTimer -= dt;
        if (enemy.fireTimer <= 0) {
          enemy.fireTimer = 760;
          aimedSpread(enemy, 5, 0.12, 0.38, 'line');
          for (let burst = 0; burst < 2; burst++) {
            addEnemy('scout', enemy.x + (burst === 0 ? -18 : 18), enemy.y + 4, {
              swing: 22,
              vy: 0.058,
              mode: burst,
              hp: 10,
              radius: 8,
            });
          }
        }
      } else if (enemy.kind === 'shrine') {
        enemy.x = enemy.anchorX + Math.sin(enemy.t * 0.0016 + enemy.mode * 0.4) * enemy.swing;
        enemy.fireTimer -= dt;
        if (enemy.fireTimer <= 0) {
          enemy.fireTimer = 360;
          spiralBurst(enemy, 4, 0.11, enemy.mode % 2 === 0 ? 'ring' : 'diamond');
        }
      } else if (enemy.kind === 'warden') {
        enemy.x = enemy.anchorX + Math.sin(enemy.t * 0.0014) * enemy.swing;
        enemy.fireTimer -= dt;
        if (enemy.fireTimer <= 0) {
          enemy.fireTimer = enemy.hp < enemy.maxHp * 0.4 ? 190 : 320;
          ringBurst(enemy, enemy.hp < enemy.maxHp * 0.4 ? 18 : 12, 0.12, 'diamond');
          aimedSpread(enemy, 7, 0.15, 0.48, 'ring');
          state.shake += 1.8;
        }
        if ((enemy.t % 680) < dt) {
          for (let offset = -2; offset <= 2; offset++) {
            addEnemy('spinner', enemy.x + offset * 28, enemy.y - 38 - Math.abs(offset) * 10, {
              swing: 16,
              vy: 0.036,
              hp: 18,
              radius: 9,
              mode: offset,
            });
          }
        }
      }

      if (enemy.hp <= 0) {
        destroyEnemy(enemy);
        state.enemies.splice(index, 1);
        continue;
      }

      if (enemy.y > state.scroll + screenHeight + 80 || enemy.x < -60 || enemy.x > worldWidth + 60) {
        state.enemies.splice(index, 1);
      }
    }
  }

  function destroyEnemy(enemy) {
    state.score += enemy.maxHp * 10;
    state.kills += 1;
    state.chain += 1;
    state.bestChain = Math.max(state.bestChain, state.chain);
    state.flash = Math.min(1, state.flash + 0.12);
    state.shake += enemy.kind === 'warden' ? 5 : enemy.kind === 'carrier' ? 2.5 : 1.2;
    spawnBurst(enemy.x, enemy.y, [enemy.colorA, enemy.colorB, enemy.colorC], enemy.kind === 'warden' ? 40 : 18);
    if (enemy.kind === 'carrier' || enemy.kind === 'warden' || Math.random() < 0.18) {
      addPickup(enemy.x, enemy.y, enemy.kind === 'warden' ? 'beam' : Math.random() < 0.5 ? 'score' : 'heal');
    }
  }

  function updatePlayerShots(dt) {
    for (let index = state.playerShots.length - 1; index >= 0; index--) {
      const shot = state.playerShots[index];
      shot.age += dt;
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      shot.rotation += shot.spin * dt;

      if (shot.age > shot.life || shot.y < state.scroll - 50 || shot.x < -30 || shot.x > worldWidth + 30) {
        state.playerShots.splice(index, 1);
        continue;
      }

      let hit = false;
      for (let enemyIndex = state.enemies.length - 1; enemyIndex >= 0; enemyIndex--) {
        const enemy = state.enemies[enemyIndex];
        const dx = shot.x - enemy.x;
        const dy = shot.y - enemy.y;
        const radius = enemy.radius + shot.radius + (shot.type === 'pulse' ? 3 : 1);
        if (dx * dx + dy * dy <= radius * radius) {
          enemy.hp -= shot.type === 'pulse' ? 8 : 5;
          addEffect(shot.type === 'pulse' ? 'diamond' : 'spark', shot.x, shot.y, {
            colorA: shot.colorA,
            colorB: shot.colorB,
            size: shot.type === 'pulse' ? 6 : 3,
            life: 180,
            vx: randomRange(-0.05, 0.05),
            vy: randomRange(-0.14, -0.02),
          });
          state.playerShots.splice(index, 1);
          hit = true;
          break;
        }
      }
      if (hit) continue;
    }
  }

  function updateEnemyShots(dt) {
    const player = state.player;
    for (let index = state.enemyShots.length - 1; index >= 0; index--) {
      const shot = state.enemyShots[index];
      shot.age += dt;
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      shot.rotation += shot.spin * dt;

      if (shot.age > shot.life || shot.y > state.scroll + screenHeight + 80 || shot.y < state.scroll - 70 || shot.x < -50 || shot.x > worldWidth + 50) {
        state.enemyShots.splice(index, 1);
        continue;
      }

      const dx = shot.x - player.x;
      const dy = shot.y - player.y;
      const radius = player.radius + shot.radius;
      if (player.invuln <= 0 && dx * dx + dy * dy <= radius * radius) {
        player.hp = Math.max(0, player.hp - 9);
        player.invuln = 900;
        state.chain = 0;
        state.shake += 4;
        state.flash = 1;
        spawnBurst(player.x, player.y, [palette.coral, palette.apricot, palette.frost], 22);
        state.enemyShots.splice(index, 1);
        if (player.hp <= 0) {
          player.hp = 100;
          player.beamEnergy = 40;
          state.score = Math.max(0, state.score - 1500);
        }
      }
    }
  }

  function updatePickups(dt) {
    const player = state.player;
    for (let index = state.pickups.length - 1; index >= 0; index--) {
      const pickup = state.pickups[index];
      pickup.age += dt;
      const dx = player.x - pickup.x;
      const dy = player.y - pickup.y;
      const distance = Math.hypot(dx, dy) || 1;
      const attract = distance < 90 ? 0.0016 * dt : 0;
      pickup.vx += dx * attract;
      pickup.vy += dy * attract;
      pickup.x += pickup.vx * dt;
      pickup.y += pickup.vy * dt;

      if (pickup.age > pickup.life || pickup.y > state.scroll + screenHeight + 60) {
        state.pickups.splice(index, 1);
        continue;
      }

      if (distance < player.radius + pickup.radius + 2) {
        if (pickup.flavor === 'beam') {
          player.beamEnergy = Math.min(100, player.beamEnergy + 28);
        } else if (pickup.flavor === 'heal') {
          player.hp = Math.min(100, player.hp + 18);
        } else {
          state.score += 650;
        }
        state.chain += 2;
        state.bestChain = Math.max(state.bestChain, state.chain);
        addEffect('glyph', pickup.x, pickup.y, {
          colorA: pickup.colorA,
          colorB: pickup.colorB,
          glyph: pickup.glyph,
          size: 10,
          life: 420,
          vy: -0.08,
          vx: 0,
        });
        state.pickups.splice(index, 1);
      }
    }
  }

  function updateEffects(dt) {
    for (let index = state.effects.length - 1; index >= 0; index--) {
      const fx = state.effects[index];
      fx.age += dt;
      fx.x += fx.vx * dt;
      fx.y += fx.vy * dt;
      fx.rotation += fx.spin * dt;
      fx.vx *= 0.996;
      fx.vy = fx.vy * 0.996 + 0.00005 * dt;

      if (fx.age >= fx.life) {
        state.effects.splice(index, 1);
      }
    }
  }

  function updateCamera(dt) {
    const player = state.player;
    const shakeX = Math.sin(state.elapsed * 0.02) * state.shake;
    const shakeY = Math.cos(state.elapsed * 0.024) * state.shake;
    const targetX = clamp(player.x - screenWidth * 0.5, -30, worldWidth - screenWidth + 30) + Math.sin(state.elapsed * 0.0006) * 8;
    state.camera.x = lerp(state.camera.x, targetX + shakeX, 0.08);
    state.camera.y = state.scroll - 6 + Math.sin(state.elapsed * 0.00035) * 3 + shakeY;
  }

  function drawBackground() {
    const top = palette.midnight;
    const mid = palette.ocean;
    const low = palette.slateTeal;
    const glow = palette.aqua;
    const shimmer = (Math.sin(state.elapsed * 0.0012) + 1) * 0.5;

    engine.rectFill(-80, state.scroll - 120, worldWidth + 80, state.scroll + screenHeight + 140, top, {
      dither: { colorB: palette.blackberry, mix: 0.32 },
    });

    for (let y = state.scroll - 80; y < state.scroll + screenHeight + 80; y += 18) {
      const t = (y - state.scroll + 80) / (screenHeight + 160);
      const colorA = t < 0.55 ? top : mid;
      const colorB = t < 0.55 ? mid : low;
      const mix = t < 0.55 ? t / 0.55 : (t - 0.55) / 0.45;
      engine.rectFill(-80, y, worldWidth + 80, y + 17, colorA, {
        dither: { colorB, mix },
      });
    }

    drawStars();
    drawCathedralLanes(shimmer, glow);
    drawNebulaClouds();
  }

  function drawStars() {
    for (const star of state.stars) {
      const screenY = star.y - state.camera.y;
      if (screenY < -8 || screenY > screenHeight + 8) continue;
      const twinkle = Math.sin(star.twinkle) * 0.5 + 0.5;
      if (star.size === 1) {
        engine.pset(Math.round(star.x), Math.round(star.y), twinkle > 0.6 ? star.color : palette.gunmetal);
      } else {
        engine.rectFill(star.x, star.y, star.x + star.size - 1, star.y + star.size - 1, star.color, {
          dither: { colorB: palette.frost, mix: twinkle * 0.35 },
        });
      }
    }
  }

  function drawCathedralLanes(shimmer, glow) {
    const centerLeft = worldCenterX - 58;
    const centerRight = worldCenterX + 58;
    engine.rectFill(centerLeft, state.scroll - 80, centerRight, state.scroll + screenHeight + 100, palette.ink, {
      dither: { colorB: palette.ocean, mix: 0.26 },
    });

    for (let y = state.scroll - 60; y < state.scroll + screenHeight + 90; y += 20) {
      const pulse = 0.18 + ((y * 0.013 + state.elapsed * 0.002) % 1) * 0.24;
      engine.rectFill(worldCenterX - 6, y, worldCenterX + 6, y + 10, palette.aqua, {
        dither: { colorB: palette.frost, mix: pulse },
      });
      engine.rectFill(centerLeft + 12, y + 5, centerLeft + 18, y + 11, palette.amber, {
        dither: { colorB: palette.apricot, mix: shimmer * 0.45 },
      });
      engine.rectFill(centerRight - 18, y + 5, centerRight - 12, y + 11, palette.amber, {
        dither: { colorB: palette.apricot, mix: shimmer * 0.45 },
      });
    }

    for (const arch of state.arches) {
      const y = Math.floor(arch.y + Math.floor(state.scroll / 2) * 2);
      const leftX = worldCenterX - arch.width;
      const rightX = worldCenterX + arch.width;
      engine.rectFill(leftX - 18, y, leftX + 22, y + 96, palette.blackberry, {
        dither: { colorB: palette.midnightPlum, mix: 0.48 },
      });
      engine.rectFill(rightX - 22, y, rightX + 18, y + 96, palette.blackberry, {
        dither: { colorB: palette.midnightPlum, mix: 0.48 },
      });
      engine.line(leftX + 20, y + 8, worldCenterX - 18, y + 86, arch.glow, 2);
      engine.line(rightX - 20, y + 8, worldCenterX + 18, y + 86, arch.glow, 2);
      engine.ellipseFill(worldCenterX, y + 16, 22, 8, arch.glow, {
        dither: { colorB: palette.frost, mix: 0.24 + shimmer * 0.2 },
      });
    }
  }

  function drawNebulaClouds() {
    const cloudBase = Math.floor(state.scroll / 90) * 90;
    for (let index = -1; index < 5; index++) {
      const y = cloudBase + index * 90;
      const sway = Math.sin((y + state.elapsed * 0.18) * 0.01) * 28;
      engine.ellipseFill(worldCenterX - 92 + sway, y + 20, 54, 16, palette.mulberry, {
        rotation: Math.sin(y * 0.01) * 0.4,
        dither: { colorB: palette.aubergine, mix: 0.52 },
      });
      engine.ellipseFill(worldCenterX + 94 - sway, y + 52, 48, 14, palette.mineral, {
        rotation: Math.cos(y * 0.012) * 0.35,
        dither: { colorB: palette.aqua, mix: 0.42 },
      });
    }
  }

  function drawPlayer() {
    const player = state.player;
    const flicker = player.invuln > 0 && Math.floor(player.invuln / 80) % 2 === 0;
    if (flicker) return;

    const beamMix = player.beamCharge * 0.55;
    engine.ellipseFill(player.x, player.y + 5, 12, 7, palette.storm, {
      dither: { colorB: palette.aqua, mix: beamMix },
    });
    engine.circleFill(player.x, player.y + 1, 12, palette.blackberry, {
      dither: { colorB: palette.amethyst, mix: 0.28 },
    });
    engine.drawAtlasSprite(0, player.x, player.y, {
      scale: 2,
      originX: 0.5,
      originY: 0.5,
      remap: [
        { from: 1, to: palette.frost },
        { from: 2, to: palette.aqua },
        { from: 3, to: palette.amber },
      ],
      flipX: player.roll < -0.12,
    });
    engine.triFill(
      { x: player.x, y: player.y - 14 },
      { x: player.x - 7 - player.roll * 4, y: player.y + 10 },
      { x: player.x + 7 - player.roll * 4, y: player.y + 10 },
      palette.frost,
      { dither: { colorB: palette.aqua, mix: 0.32 } },
    );
    engine.line(player.x - 10, player.y + 11, player.x - 2, player.y + 18, palette.coral, 2);
    engine.line(player.x + 10, player.y + 11, player.x + 2, player.y + 18, palette.coral, 2);
    engine.ellipseFill(player.x, player.y + 16, 6, 3, palette.apricot, {
      dither: { colorB: palette.amber, mix: 0.45 + Math.sin(state.elapsed * 0.02) * 0.15 },
    });
    if (player.beamCharge > 0.05) drawPlayerBeam();
  }

  function drawPlayerBeam() {
    const player = state.player;
    const width = 7 + player.beamCharge * 14;
    const beamTop = state.scroll - 30;
    engine.line(player.x, player.y - 12, player.x, beamTop, palette.aqua, width);
    engine.line(player.x, player.y - 12, player.x, beamTop, palette.frost, Math.max(1, width * 0.36));
    for (let index = 0; index < 5; index++) {
      const y = player.y - 26 - index * 24;
      engine.ellipseFill(player.x + Math.sin(state.elapsed * 0.01 + index) * 4, y, width * 0.7, 4, palette.aqua, {
        dither: { colorB: palette.frost, mix: 0.35 },
      });
    }
  }

  function drawEnemies() {
    for (const enemy of state.enemies) {
      const hurtMix = 1 - enemy.hp / enemy.maxHp;
      if (enemy.kind === 'scout') {
        engine.drawAtlasSprite(enemy.spriteIndex, enemy.x, enemy.y, {
          scale: 1.8,
          originX: 0.5,
          originY: 0.5,
          remap: [
            { from: 1, to: enemy.colorA },
            { from: 2, to: enemy.colorB },
            { from: 3, to: enemy.colorC },
          ],
        });
        engine.triFill(
          { x: enemy.x, y: enemy.y + 8 },
          { x: enemy.x - 10, y: enemy.y - 9 },
          { x: enemy.x + 10, y: enemy.y - 9 },
          enemy.colorA,
          { dither: { colorB: enemy.colorB, mix: 0.28 } },
        );
      } else if (enemy.kind === 'spinner') {
        engine.circleFill(enemy.x, enemy.y, 10, enemy.colorA, {
          dither: { colorB: enemy.colorB, mix: 0.36 },
        });
        engine.regularPolygonFill(enemy.x, enemy.y, 14, 6, enemy.t * 0.004, enemy.colorB, {
          dither: { colorB: enemy.colorC, mix: 0.24 },
        });
        engine.circleFill(enemy.x, enemy.y, 4, palette.frost);
      } else if (enemy.kind === 'carrier') {
        engine.rectFill(enemy.x - 16, enemy.y - 8, enemy.x + 16, enemy.y + 8, enemy.colorA, {
          dither: { colorB: enemy.colorB, mix: 0.44 },
        });
        engine.rect(enemy.x - 18, enemy.y - 10, enemy.x + 18, enemy.y + 10, enemy.colorC, 2);
        engine.drawAtlasSprite(enemy.spriteIndex, enemy.x, enemy.y, {
          scale: 2,
          originX: 0.5,
          originY: 0.5,
          remap: [
            { from: 1, to: enemy.colorC },
            { from: 2, to: enemy.colorB },
            { from: 3, to: palette.frost },
          ],
        });
      } else if (enemy.kind === 'shrine') {
        engine.regularPolygonFill(enemy.x, enemy.y, 12, 5, enemy.t * 0.002, enemy.colorA, {
          dither: { colorB: enemy.colorB, mix: 0.34 },
        });
        engine.circleFill(enemy.x, enemy.y, 5, enemy.colorC);
        engine.line(enemy.x - 12, enemy.y, enemy.x + 12, enemy.y, palette.frost, 2);
      } else if (enemy.kind === 'warden') {
        engine.circleFill(enemy.x, enemy.y, 30, palette.blackberry, {
          dither: { colorB: enemy.colorA, mix: 0.26 + hurtMix * 0.3 },
        });
        engine.regularPolygonFill(enemy.x, enemy.y, 38, 8, enemy.t * 0.0012, enemy.colorA, {
          dither: { colorB: enemy.colorB, mix: 0.32 },
        });
        engine.drawAtlasSprite(enemy.spriteIndex, enemy.x, enemy.y, {
          scale: 3.2,
          originX: 0.5,
          originY: 0.5,
          remap: [
            { from: 1, to: enemy.colorC },
            { from: 2, to: enemy.colorB },
            { from: 3, to: palette.frost },
          ],
        });
        engine.circleFill(enemy.x, enemy.y, 8, palette.frost, {
          dither: { colorB: enemy.colorB, mix: 0.24 },
        });
      }

      const hpWidth = enemy.kind === 'warden' ? 60 : 22;
      engine.rectFill(enemy.x - hpWidth * 0.5, enemy.y - enemy.radius - 14, enemy.x + hpWidth * 0.5, enemy.y - enemy.radius - 11, palette.soot);
      engine.rectFill(enemy.x - hpWidth * 0.5, enemy.y - enemy.radius - 14, enemy.x - hpWidth * 0.5 + hpWidth * (enemy.hp / enemy.maxHp), enemy.y - enemy.radius - 11, enemy.colorA, {
        dither: { colorB: enemy.colorB, mix: 0.34 },
      });
    }
  }

  function drawPlayerShots() {
    for (const shot of state.playerShots) {
      if (shot.type === 'pulse') {
        engine.circleFill(shot.x, shot.y, shot.radius, shot.colorA, {
          dither: { colorB: shot.colorB, mix: 0.42 },
        });
      } else {
        engine.line(shot.x, shot.y + 5, shot.x, shot.y - 7, shot.colorA, 2);
        engine.line(shot.x, shot.y + 2, shot.x, shot.y - 5, shot.colorB, 1);
      }
    }
  }

  function drawEnemyShots() {
    for (const shot of state.enemyShots) {
      if (shot.style === 'ring') {
        engine.circleFill(shot.x, shot.y, shot.radius, shot.colorA, {
          dither: { colorB: shot.colorB, mix: 0.46 },
        });
      } else if (shot.style === 'diamond') {
        engine.regularPolygonFill(shot.x, shot.y, shot.radius + 1, 4, shot.rotation, shot.colorA, {
          dither: { colorB: shot.colorB, mix: 0.42 },
        });
      } else if (shot.style === 'line') {
        const dx = Math.cos(shot.rotation) * (shot.radius + 3);
        const dy = Math.sin(shot.rotation) * (shot.radius + 3);
        engine.line(shot.x - dx, shot.y - dy, shot.x + dx, shot.y + dy, shot.colorA, 2);
        engine.line(shot.x - dx * 0.7, shot.y - dy * 0.7, shot.x + dx * 0.7, shot.y + dy * 0.7, shot.colorB, 1);
      }
    }
  }

  function drawPickups() {
    for (const pickup of state.pickups) {
      const pulse = Math.sin(state.elapsed * 0.01 + pickup.age * 0.01) * 0.5 + 0.5;
      engine.circleFill(pickup.x, pickup.y, pickup.radius + pulse * 2, pickup.colorA, {
        dither: { colorB: pickup.colorB, mix: 0.42 },
      });
      engine.regularPolygonFill(pickup.x, pickup.y, pickup.radius + 3, 6, pickup.age * 0.01, pickup.colorB, {
        dither: { colorB: palette.frost, mix: 0.18 + pulse * 0.2 },
      });
      const glyph = state.glyphRects.get(pickup.glyph);
      if (glyph) {
        engine.drawSprite(glyph, {
          x: pickup.x - glyph.w * 0.5,
          y: pickup.y - glyph.h * 0.5,
          w: glyph.w,
          h: glyph.h,
        }, {
          replaceSource: 2,
          replaceTarget: palette.frost,
        });
      }
    }
  }

  function drawEffects() {
    for (const fx of state.effects) {
      const lifeT = fx.age / fx.life;
      const size = Math.max(1, fx.size * (1 - lifeT * 0.7));
      const mix = 0.2 + (1 - lifeT) * 0.55;
      if (fx.kind === 'spark') {
        engine.line(fx.x, fx.y, fx.x - Math.cos(fx.rotation) * size * 2.4, fx.y - Math.sin(fx.rotation) * size * 2.4, fx.colorA, fx.thickness);
      } else if (fx.kind === 'tri') {
        engine.triFill(
          { x: fx.x + Math.cos(fx.rotation) * size * 1.4, y: fx.y + Math.sin(fx.rotation) * size * 1.4 },
          { x: fx.x + Math.cos(fx.rotation + twoPi / 3) * size, y: fx.y + Math.sin(fx.rotation + twoPi / 3) * size },
          { x: fx.x + Math.cos(fx.rotation + twoPi * 0.666) * size, y: fx.y + Math.sin(fx.rotation + twoPi * 0.666) * size },
          fx.colorA,
          { dither: { colorB: fx.colorB, mix } },
        );
      } else if (fx.kind === 'ring') {
        engine.circleFill(fx.x, fx.y, size * 0.8, fx.colorA, {
          dither: { colorB: fx.colorB, mix },
        });
      } else if (fx.kind === 'glyph') {
        const glyph = state.glyphRects.get(fx.glyph);
        if (glyph) {
          const glyphScale = 0.8 + size * 0.08;
          engine.drawSprite(glyph, {
            x: fx.x - glyph.w * glyphScale * 0.5,
            y: fx.y - glyph.h * glyphScale * 0.5,
            w: glyph.w * glyphScale,
            h: glyph.h * glyphScale,
          }, {
            replaceSource: 2,
            replaceTarget: fx.colorA,
            flipX: Math.sin(fx.rotation) > 0,
          });
        }
      } else if (fx.kind === 'sprite') {
        engine.drawAtlasSprite(fx.spriteIndex, fx.x, fx.y, {
          scale: 0.8 + size * 0.12,
          originX: 0.5,
          originY: 0.5,
          remap: [
            { from: 1, to: fx.colorA },
            { from: 2, to: fx.colorB },
            { from: 3, to: fx.colorC },
          ],
        });
      } else if (fx.kind === 'diamond') {
        engine.regularPolygonFill(fx.x, fx.y, size, 4, fx.rotation, fx.colorA, {
          dither: { colorB: fx.colorB, mix },
        });
      } else if (fx.kind === 'ellipse') {
        engine.ellipseFill(fx.x, fx.y, size * 1.8, size * 0.8, fx.colorA, {
          rotation: fx.rotation,
          dither: { colorB: fx.colorB, mix },
        });
      }
    }
  }

  function drawOverlay() {
    drawHudPanels();
    drawBossWarning();
    drawReticle();
  }

  function drawHudPanels() {
    const player = state.player;
    const heatPanel = { x: 16, y: 16, w: 132, h: 62 };
    const scorePanel = { x: 16, y: 194, w: 170, h: 58 };

    engine.rectFill(heatPanel.x, heatPanel.y, heatPanel.x + heatPanel.w, heatPanel.y + heatPanel.h, palette.blackberry, {
      dither: { colorB: palette.plum, mix: 0.42 },
    });
    engine.rect(heatPanel.x, heatPanel.y, heatPanel.x + heatPanel.w, heatPanel.y + heatPanel.h, palette.mist);
    engine.text('STAR SHRINE RAID', heatPanel.x + 10, heatPanel.y + 8, palette.frost);
    engine.text(state.fpsDisplay, heatPanel.x + 10, heatPanel.y + 18, palette.aqua);
    engine.text(`DMG CHAIN ${state.chain}`, heatPanel.x + 10, heatPanel.y + 28, palette.apricot);
    engine.text(`KILLS ${state.kills}`, heatPanel.x + 10, heatPanel.y + 38, palette.sand);
    engine.text('SHIFT OR HOLD MOUSE', heatPanel.x + 10, heatPanel.y + 48, palette.mist);

    engine.rectFill(scorePanel.x, scorePanel.y, scorePanel.x + scorePanel.w, scorePanel.y + scorePanel.h, palette.midnightPlum, {
      dither: { colorB: palette.coffee, mix: 0.46 },
    });
    engine.rect(scorePanel.x, scorePanel.y, scorePanel.x + scorePanel.w, scorePanel.y + scorePanel.h, palette.frost);
    engine.text(`SCORE ${state.score}`, scorePanel.x + 10, scorePanel.y + 8, palette.frost);
    engine.text(`BEST ${state.bestChain}`, scorePanel.x + 10, scorePanel.y + 20, palette.aqua);
    engine.text(`WAVES ${state.waveIndex}`, scorePanel.x + 10, scorePanel.y + 32, palette.sand);
    engine.text(`OBJ ${(state.enemies.length + state.enemyShots.length + state.playerShots.length + state.effects.length).toString()}`, scorePanel.x + 10, scorePanel.y + 44, palette.chartreuse);

    drawMeters(player);
    drawTelemetry();
  }

  function drawMeters(player) {
    const hpX = 164;
    const hpY = 16;
    engine.rectFill(hpX, hpY, hpX + 132, hpY + 22, palette.blackberry, {
      dither: { colorB: palette.gunmetal, mix: 0.45 },
    });
    engine.rect(hpX, hpY, hpX + 132, hpY + 22, palette.mist);
    engine.text('HULL', hpX + 8, hpY + 7, palette.frost);
    engine.rectFill(hpX + 44, hpY + 7, hpX + 120, hpY + 13, palette.soot);
    engine.rectFill(hpX + 44, hpY + 7, hpX + 44 + 76 * (player.hp / 100), hpY + 13, palette.coral, {
      dither: { colorB: palette.apricot, mix: 0.28 },
    });

    engine.rectFill(hpX, hpY + 28, hpX + 132, hpY + 50, palette.blackberry, {
      dither: { colorB: palette.gunmetal, mix: 0.45 },
    });
    engine.rect(hpX, hpY + 28, hpX + 132, hpY + 50, palette.mist);
    engine.text('BEAM', hpX + 8, hpY + 35, palette.frost);
    engine.rectFill(hpX + 44, hpY + 35, hpX + 120, hpY + 41, palette.soot);
    engine.rectFill(hpX + 44, hpY + 35, hpX + 44 + 76 * (player.beamEnergy / 100), hpY + 41, palette.aqua, {
      dither: { colorB: palette.frost, mix: 0.28 + player.beamCharge * 0.25 },
    });
  }

  function drawTelemetry() {
    engine.rectFill(hudPanel.x, hudPanel.y, hudPanel.x + hudPanel.w, hudPanel.y + hudPanel.h, palette.blackberry, {
      dither: { colorB: palette.midnightPlum, mix: 0.48 },
    });
    engine.rect(hudPanel.x, hudPanel.y, hudPanel.x + hudPanel.w, hudPanel.y + hudPanel.h, palette.mist);
    engine.text('TACTICAL FEED', hudPanel.x + 8, hudPanel.y + 8, palette.frost);
    engine.text(`ENM ${state.enemies.length}`, hudPanel.x + 8, hudPanel.y + 20, palette.apricot);
    engine.text(`INB ${state.enemyShots.length}`, hudPanel.x + 8, hudPanel.y + 30, palette.coral);
    engine.text(`OUT ${state.playerShots.length}`, hudPanel.x + 8, hudPanel.y + 40, palette.aqua);
    engine.text(`FX ${state.effects.length}`, hudPanel.x + 8, hudPanel.y + 50, palette.chartreuse);
    engine.text('MOUSE OR WASD TO DODGE', hudPanel.x + 8, hudPanel.y + 74, palette.mist);

    engine.pushClip(hudPanel.x + 86, hudPanel.y + 18, 58, 48);
    engine.rectFill(hudPanel.x + 86, hudPanel.y + 18, hudPanel.x + 144, hudPanel.y + 66, palette.ink, {
      dither: { colorB: palette.ocean, mix: 0.34 },
    });
    for (let index = 0; index < 10; index++) {
      const y = hudPanel.y + 18 + index * 6 + Math.sin(state.elapsed * 0.004 + index) * 2;
      engine.line(hudPanel.x + 88, y, hudPanel.x + 142, y, index % 2 === 0 ? palette.gunmetal : palette.periwinkle, 1);
    }
    for (const enemy of state.enemies.slice(0, 10)) {
      const px = hudPanel.x + 115 + ((enemy.x - worldCenterX) / 5);
      const py = hudPanel.y + 60 - ((enemy.y - state.scroll) / 8);
      engine.rectFill(px - 1, py - 1, px + 1, py + 1, enemy.colorA);
    }
    engine.rectFill(hudPanel.x + 115 + ((state.player.x - worldCenterX) / 5) - 1, hudPanel.y + 58, hudPanel.x + 115 + ((state.player.x - worldCenterX) / 5) + 1, hudPanel.y + 60, palette.frost);
    engine.popClip();
  }

  function drawBossWarning() {
    if (state.warning <= 0) return;
    const pulse = Math.floor(state.warning / 120) % 2 === 0;
    const colorA = pulse ? palette.coral : palette.amber;
    const colorB = pulse ? palette.apricot : palette.frost;
    engine.rectFill(92, 104, screenWidth - 92, 128, colorA, {
      dither: { colorB, mix: 0.42 },
    });
    engine.rect(92, 104, screenWidth - 92, 128, palette.white);
    engine.text('WARDEN SIGNATURE DETECTED', 122, 111, palette.blackberry);
  }

  function drawReticle() {
    if (!pointer.active) return;
    const worldX = state.camera.x + pointer.x;
    const worldY = state.camera.y + pointer.y;
    engine.line(worldX - 8, worldY, worldX + 8, worldY, palette.frost, 1);
    engine.line(worldX, worldY - 8, worldX, worldY + 8, palette.frost, 1);
    engine.circleFill(worldX, worldY, 2, pointer.down ? palette.aqua : palette.apricot);
  }

  function drawBorder() {
    engine.rectFill(0, 0, screenWidth - 1, screenHeight - 1, palette.blackberry, {
      dither: { colorB: palette.midnight, mix: 0.24 + state.flash * 0.2 },
    });
    engine.rect(playfield.x - 2, playfield.y - 2, playfield.x + playfield.w + 1, playfield.y + playfield.h + 1, palette.mist, 2);
    engine.rect(playfield.x - 5, playfield.y - 5, playfield.x + playfield.w + 4, playfield.y + playfield.h + 4, palette.blackberry, 2);
  }

  function draw() {
    engine.beginFrame();
    engine.clear(palette.midnight);
    drawBorder();

    engine.pushClip(playfield.x, playfield.y, playfield.w, playfield.h);
    engine.setCamera(state.camera.x, state.camera.y);
    drawBackground();
    drawEnemies();
    drawPickups();
    drawPlayerShots();
    drawEnemyShots();
    drawEffects();
    drawPlayer();
    engine.popClip();

    engine.setCamera(0, 0);
    drawOverlay();
    engine.endFrame();
  }

  function loop(timestamp) {
    const dt = Math.min(33, timestamp - lastFrameTime);
    lastFrameTime = timestamp;

    if (!paused) {
      update(dt);
      draw();
    }

    requestAnimationFrame(loop);
  }

  boot();
})();

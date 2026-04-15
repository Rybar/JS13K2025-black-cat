import Retrobuffer from './core/Retrobuffer.js';
import InputManager from './core/InputManager.js';
import { clamp, resizeCanvas } from './core/utils.js';

(function () {
  const baseResolution = { width: 480, height: 270 };
  const screenWidth = 640;
  const screenHeight = 360;
  const scaleX = screenWidth / baseResolution.width;
  const scaleY = screenHeight / baseResolution.height;
  const scale = Math.min(scaleX, scaleY);
  const layout = createLayout(screenWidth, screenHeight);
  const tuning = createTuning(scale);
  const playfield = layout.playfield;
  const horizonY = layout.horizonY;
  const groundY = layout.groundY;
  const baseMissiles = [10, 12, 10];
  const batteryMissileLayouts = {
    10: [4, 3, 2, 1],
    12: [5, 4, 3],
  };
  const displayScale = {
    windowed: 2,
    fullscreen: 3,
  };
  const highScoreKey = 'ballisticsCoordinatorHighScore';
  const cityXs = layout.cityXs;
  const batteryXs = layout.batteryXs;
  const assetURLs = {
    palette: 'DATAURL:src/img/palette.png',
    font: 'DATAURL:src/img/font-atlas.png',
    spriteAtlases: {
      main: 'DATAURL:src/img/sprites-main.png',
    },
  };

  const palette = {
    black: 0,
    white: 15,
    soot: 151,
    stone: 117,
    silver: 114,
    gunmetal: 122,
    apricot: 162,
    amber: 174,
    sand: 84,
    straw: 173,
    coral: 159,
    brick: 156,
    rust: 165,
    garnet: 253,
    aqua: 201,
    frost: 131,
    cloud: 130,
    mist: 217,
    midnight: 121,
    ocean: 206,
    storm: 123,
    slateTeal: 119,
    mineral: 116,
    bog: 193,
    moss: 89,
    sage: 104,
    lichen: 102,
    coffee: 167,
    mahogany: 154,
    bark: 152,
    mushroom: 136,
    dawn: 142,
    bloom: 145,
    signalBlue: 214,
    signalViolet: 229,
    panelEdge: 116,
    window: 175,
  };

  const shell = {
    scene: 'boot',
    elapsed: 0,
    highScore: loadHighScore(),
    gameplay: null,
    summary: null,
    gameOver: null,
    paused: false,
    stars: createStars(),
  };

  let engine;
  let input;
  let displayShell;
  let fullscreenToggle;
  let lastFrameTime = performance.now();

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      image.src = src;
    });
  }

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function randomInt(min, max) {
    return Math.floor(randomRange(min, max + 1));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function sx(value) {
    return Math.round(value * scaleX);
  }

  function sy(value) {
    return Math.round(value * scaleY);
  }

  function ss(value) {
    return Math.max(1, Math.round(value * scale));
  }

  function distributeSpan(start, end, count) {
    if (count <= 1) {
      return [Math.round((start + end) * 0.5)];
    }

    const span = end - start;
    return new Array(count).fill(0).map((_, index) => Math.round(start + (span * index) / (count - 1)));
  }

  function createCenteredRect(width, y, height) {
    const scaledWidth = sx(width);
    const scaledHeight = sy(height);
    return {
      x: Math.round(screenWidth * 0.5 - scaledWidth * 0.5),
      y: sy(y),
      w: scaledWidth,
      h: scaledHeight,
    };
  }

  function createLayout(width, height) {
    const playfieldRect = {
      x: sx(10),
      y: sy(10),
      w: width - sx(20),
      h: height - sy(20),
    };
    const centerX = Math.round(width * 0.5);

    return {
      centerX,
      playfield: playfieldRect,
      horizonY: sy(204),
      groundY: sy(222),
      starCount: Math.round(64 * scaleX * scaleY),
      cityXs: [42, 96, 152, 328, 384, 438].map((value) => sx(value)),
      batteryXs: [78, 240, 402].map((value) => sx(value)),
      backdropBandHeight: ss(8),
      gameplay: {
        cursorPaddingX: ss(8),
        cursorPaddingTop: ss(10),
        cursorPaddingBottom: ss(20),
        spawnPaddingX: ss(12),
        spawnY: playfieldRect.y + ss(4),
        cityTargetOffsetY: ss(8),
      },
      hud: {
        top: playfieldRect.y + 1,
        bottom: sy(23),
        textY: sy(13),
        columns: distributeSpan(playfieldRect.x + ss(34), playfieldRect.x + playfieldRect.w - ss(34), 6),
      },
      batteryBar: {
        left: sx(66),
        right: sx(414),
        top: sy(233),
        bottom: sy(251),
        selectionHalfWidth: ss(34),
        dividerTop: sy(236),
        dividerBottom: sy(248),
        pyramidTop: sy(236),
        cellWidth: ss(4),
        cellHeight: ss(2),
        cellGap: Math.max(1, ss(1)),
      },
      title: {
        titleY: sy(48),
        subtitleY: sy(64),
        blurbY: sy(92),
        blurbDetailY: sy(104),
        startY: sy(154),
        instructionsY: sy(168),
        highScoreY: sy(196),
        controlsY: sy(222),
        radar: {
          centerY: sy(134),
          outerRadius: ss(64),
          ring52: ss(52),
          ring40: ss(40),
          ring28: ss(28),
          ring16: ss(16),
          beamOuter: ss(58),
          beamInner: ss(42),
          coreRadius: ss(4),
        },
      },
      mountains: [
        [
          { x: 0, y: sy(204) },
          { x: sx(86), y: sy(132) },
          { x: sx(174), y: sy(204) },
        ],
        [
          { x: sx(114), y: sy(204) },
          { x: sx(238), y: sy(120) },
          { x: sx(360), y: sy(204) },
        ],
        [
          { x: sx(280), y: sy(204) },
          { x: sx(392), y: sy(142) },
          { x: sx(479), y: sy(204) },
        ],
      ],
      panels: {
        instructions: createCenteredRect(400, 30, 206),
        summary: createCenteredRect(236, 48, 166),
        gameOver: createCenteredRect(244, 56, 150),
        paused: createCenteredRect(208, 114, 52),
        banner: createCenteredRect(248, 96, 26),
      },
    };
  }

  function createTuning(worldScale) {
    return {
      cursorSpeed: 0.24 * worldScale,
      enemySpeedScale: worldScale,
      playerSideSpeed: 0.17 * worldScale,
      playerCenterSpeed: 0.22 * worldScale,
      explosionScale: worldScale,
      explosionGrowthRate: 0.08 * worldScale,
      explosionDecayRate: 0.05 * worldScale,
      emberSpeedMin: 0.03 * worldScale,
      emberSpeedMax: 0.12 * worldScale,
      emberLift: 0.03 * worldScale,
      emberGravity: 0.00008 * worldScale,
      mirvChildSpread: 18 * worldScale,
      impactRadiusSq: 18 * worldScale * worldScale,
    };
  }

  function createStars() {
    const stars = [];
    for (let index = 0; index < layout.starCount; index++) {
      stars.push({
        x: randomRange(playfield.x + ss(4), playfield.x + playfield.w - ss(4)),
        y: randomRange(playfield.y + ss(4), horizonY - ss(14)),
        speed: randomRange(0.0008, 0.0026),
        twinkle: randomRange(0, Math.PI * 2),
        color: index % 4 === 0 ? palette.frost : index % 3 === 0 ? palette.aqua : palette.cloud,
      });
    }
    return stars;
  }

  function isDisplayFullscreen() {
    return document.fullscreenElement === displayShell;
  }

  function syncDisplayMode() {
    if (!engine || !displayShell) return;

    const fullscreen = isDisplayFullscreen();
    document.body.classList.toggle('fullscreen-active', fullscreen);
    displayShell.classList.toggle('is-fullscreen', fullscreen);
    resizeCanvas(engine.canvas, screenWidth, screenHeight, fullscreen ? displayScale.fullscreen : displayScale.windowed);

    if (fullscreenToggle) {
      fullscreenToggle.textContent = fullscreen ? 'Exit Full Screen' : 'Full Screen';
      fullscreenToggle.setAttribute('aria-pressed', fullscreen ? 'true' : 'false');
    }
  }

  async function toggleDisplayFullscreen() {
    if (!displayShell) return;

    try {
      if (isDisplayFullscreen()) {
        await document.exitFullscreen();
      } else {
        await displayShell.requestFullscreen();
      }
    } catch (error) {
      console.error(error);
    }
  }

  function handleFullscreenEscape(event) {
    if (event.key !== 'Escape' || !isDisplayFullscreen()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void document.exitFullscreen();
  }

  async function boot() {
    const spriteAtlasEntries = Object.entries(assetURLs.spriteAtlases);
    const images = await Promise.all([
      loadImage(assetURLs.palette),
      loadImage(assetURLs.font),
      ...spriteAtlasEntries.map(([, url]) => loadImage(url)),
    ]);

    const spriteAtlases = {};
    for (let index = 0; index < spriteAtlasEntries.length; index++) {
      const [name] = spriteAtlasEntries[index];
      spriteAtlases[name] = {
        image: images[index + 2],
        spriteWidth: 8,
        spriteHeight: 8,
        sheetWidth: 64,
      };
    }

    engine = new Retrobuffer(screenWidth, screenHeight, {
      paletteImage: images[0],
      font: {
        image: images[1],
        charWidth: 5,
        charHeight: 10,
      },
      spriteAtlases,
      defaultSpriteAtlas: 'main',
    });

    input = new InputManager({
      screenWidth,
      screenHeight,
      cursorX: screenWidth * 0.5,
      cursorY: screenHeight * 0.45,
      cursorSpeed: tuning.cursorSpeed,
    });

    displayShell = document.getElementById('display-shell');
    fullscreenToggle = document.getElementById('fullscreen-toggle');
    const mount = document.getElementById('display-stage');
    mount.appendChild(engine.canvas);
    input.attach(engine.canvas);
    syncDisplayMode();

    fullscreenToggle?.addEventListener('click', () => {
      void toggleDisplayFullscreen();
    });

    document.addEventListener('fullscreenchange', syncDisplayMode);
    globalThis.addEventListener('keydown', handleFullscreenEscape, true);

    globalThis.addEventListener('blur', () => {
      if (shell.scene === 'gameplay') {
        shell.paused = true;
      }
    });

    showTitle();
    requestAnimationFrame(loop);
  }

  function showTitle() {
    shell.scene = 'title';
    shell.summary = null;
    shell.gameOver = null;
    shell.gameplay = null;
    shell.paused = false;
  }

  function showInstructions() {
    shell.scene = 'instructions';
  }

  function startNewGame() {
    const campaign = {
      round: 1,
      score: 0,
      multiplier: 1,
      reserveCities: 0,
      nextBonusScore: 10000,
      cityAlive: new Array(cityXs.length).fill(true),
      bonusFlash: 0,
    };
    startRound(campaign);
  }

  function startRound(campaign) {
    repairCitiesFromReserve(campaign);
    shell.scene = 'gameplay';
    shell.summary = null;
    shell.gameOver = null;
    shell.paused = false;
    shell.gameplay = createRoundState(campaign);
  }

  function createRoundState(campaign) {
    const batteries = batteryXs.map((x, index) => ({
      id: index,
      x,
      y: groundY - 4,
      alive: true,
      missiles: baseMissiles[index],
      maxMissiles: baseMissiles[index],
      cooldown: 0,
      pulse: 0,
    }));

    return {
      campaign,
      batteries,
      cities: cityXs.map((x, index) => ({ x, alive: campaign.cityAlive[index], damage: 0 })),
      selectedBattery: 1,
      enemyMissiles: [],
      playerMissiles: [],
      explosions: [],
      embers: [],
      spawnPlan: buildSpawnPlan(campaign.round),
      spawnIndex: 0,
      spawnTimer: 1600,
      roundBanner: 1300,
      message: `ROUND ${campaign.round}`,
      messageTimer: 1100,
      completeTimer: 0,
      shock: 0,
      cursor: {
        x: clamp(input.cursor.x, playfield.x + layout.gameplay.cursorPaddingX, playfield.x + playfield.w - layout.gameplay.cursorPaddingX),
        y: clamp(input.cursor.y, playfield.y + layout.gameplay.cursorPaddingTop, groundY - layout.gameplay.cursorPaddingBottom),
      },
    };
  }

  function buildSpawnPlan(round) {
    const total = 5 + round * 2;
    const plan = [];
    for (let index = 0; index < total; index++) {
      const type = round >= 4 && index % 6 === 5 ? 'mirv' : 'standard';
      plan.push({
        type,
        delay: Math.max(220, 520 + randomInt(0, 240) - round * 18),
        speed: (0.018 + round * 0.0014 + (type === 'mirv' ? 0.003 : 0)) * tuning.enemySpeedScale,
      });
    }
    return plan;
  }

  function repairCitiesFromReserve(campaign) {
    while (campaign.reserveCities > 0 && campaign.cityAlive.includes(false)) {
      const index = campaign.cityAlive.indexOf(false);
      campaign.cityAlive[index] = true;
      campaign.reserveCities -= 1;
    }
  }

  function loadHighScore() {
    try {
      const value = globalThis.localStorage?.getItem(highScoreKey);
      return value ? Number(value) || 0 : 0;
    } catch {
      return 0;
    }
  }

  function saveHighScore(score) {
    try {
      globalThis.localStorage?.setItem(highScoreKey, String(score));
    } catch {
      return;
    }
  }

  function awardScore(campaign, amount) {
    campaign.score += amount;
    while (campaign.score >= campaign.nextBonusScore) {
      campaign.reserveCities += 1;
      campaign.nextBonusScore += 10000;
      campaign.bonusFlash = 1500;
      if (shell.gameplay) {
        shell.gameplay.message = 'BONUS CITY BANKED';
        shell.gameplay.messageTimer = 1200;
      }
    }
    if (campaign.score > shell.highScore) {
      shell.highScore = campaign.score;
      saveHighScore(shell.highScore);
    }
  }

  function update(dt) {
    shell.elapsed += dt;
    input.update(dt);
    for (const star of shell.stars) {
      star.twinkle += dt * star.speed;
    }

    if (shell.scene === 'title') {
      updateTitle();
      return;
    }

    if (shell.scene === 'instructions') {
      updateInstructions();
      return;
    }

    if (shell.scene === 'summary') {
      updateSummary();
      return;
    }

    if (shell.scene === 'gameOver') {
      updateGameOver();
      return;
    }

    if (shell.scene === 'gameplay') {
      updateGameplay(dt);
    }
  }

  function updateTitle() {
    if (input.wasPressed('instructions')) {
      showInstructions();
      return;
    }

    if (input.wasPressed('confirm') || input.wasPressed('fire')) {
      startNewGame();
    }
  }

  function updateInstructions() {
    if (input.wasPressed('confirm') || input.wasPressed('back') || input.wasPressed('instructions')) {
      showTitle();
    }
  }

  function updateSummary() {
    if (!shell.summary) return;
    if (input.wasPressed('confirm') || input.wasPressed('fire')) {
      shell.summary.campaign.round += 1;
      startRound(shell.summary.campaign);
      return;
    }

    if (input.wasPressed('back')) {
      showTitle();
    }
  }

  function updateGameOver() {
    if (input.wasPressed('confirm') || input.wasPressed('fire')) {
      startNewGame();
      return;
    }

    if (input.wasPressed('back') || input.wasPressed('instructions')) {
      showTitle();
    }
  }

  function updateGameplay(dt) {
    const round = shell.gameplay;
    if (!round) return;

    round.campaign.multiplier = Math.min(6, 1 + Math.floor((round.campaign.round - 1) / 2));
    round.campaign.bonusFlash = Math.max(0, round.campaign.bonusFlash - dt);
    round.roundBanner = Math.max(0, round.roundBanner - dt);
    round.messageTimer = Math.max(0, round.messageTimer - dt);
    round.shock *= 0.9;

    if (input.wasPressed('pause')) {
      shell.paused = !shell.paused;
    }

    if (shell.paused) {
      if (input.wasPressed('back')) {
        showTitle();
      }
      return;
    }

    round.cursor.x = clamp(input.cursor.x, playfield.x + layout.gameplay.cursorPaddingX, playfield.x + playfield.w - layout.gameplay.cursorPaddingX);
    round.cursor.y = clamp(input.cursor.y, playfield.y + layout.gameplay.cursorPaddingTop, groundY - layout.gameplay.cursorPaddingBottom);

    for (const battery of round.batteries) {
      battery.cooldown = Math.max(0, battery.cooldown - dt);
      battery.pulse = Math.max(0, battery.pulse - dt);
    }

    updateBatteryAim(round);

    if (input.wasPressed('fire') || input.wasPressed('confirm')) {
      fireCounterMissile(round);
    }

    if (round.spawnIndex < round.spawnPlan.length) {
      round.spawnTimer -= dt;
      if (round.spawnTimer <= 0) {
        spawnEnemyMissile(round, round.spawnPlan[round.spawnIndex]);
        round.spawnIndex += 1;
        if (round.spawnIndex < round.spawnPlan.length) {
          round.spawnTimer = round.spawnPlan[round.spawnIndex].delay;
        }
      }
    }

    updatePlayerMissiles(round, dt);
    updateEnemyMissiles(round, dt);
    updateExplosions(round, dt);
    updateEmbers(round, dt);

    if (round.spawnIndex >= round.spawnPlan.length && round.enemyMissiles.length === 0 && round.playerMissiles.length === 0) {
      if (round.completeTimer <= 0) {
        round.completeTimer = 900;
      }
      round.completeTimer -= dt;
      if (round.completeTimer <= 0) {
        finishRound(round);
      }
    } else {
      round.completeTimer = 0;
    }
  }

  function updateBatteryAim(round) {
    const launchBattery = findNearestBattery(round, { requireAmmo: true });
    if (launchBattery) {
      round.selectedBattery = launchBattery.id;
      return;
    }

    const fallback = findNearestBattery(round);
    if (fallback) {
      round.selectedBattery = fallback.id;
    }
  }

  function fireCounterMissile(round) {
    const battery = resolveBatteryForLaunch(round);
    if (!battery || battery.cooldown > 0) {
      round.message = 'NO READY BATTERY';
      round.messageTimer = 700;
      return;
    }

    const speed = battery.id === 1 ? tuning.playerCenterSpeed : tuning.playerSideSpeed;
    const dx = round.cursor.x - battery.x;
    const dy = round.cursor.y - battery.y;
    const distance = Math.hypot(dx, dy) || 1;

    battery.missiles -= 1;
    battery.cooldown = battery.id === 1 ? 110 : 180;
    battery.pulse = 420;

    round.playerMissiles.push({
      batteryId: battery.id,
      startX: battery.x,
      startY: battery.y,
      x: battery.x,
      y: battery.y,
      targetX: round.cursor.x,
      targetY: round.cursor.y,
      speed,
      vx: (dx / distance) * speed,
      vy: (dy / distance) * speed,
    });
  }

  function findNearestBattery(round, { requireAmmo = false, requireReady = false } = {}) {
    let closest = null;
    let closestDistance = Infinity;

    for (const battery of round.batteries) {
      if (!battery.alive) continue;
      if (requireAmmo && battery.missiles <= 0) continue;
      if (requireReady && (battery.missiles <= 0 || battery.cooldown > 0)) continue;

      const distance = Math.hypot(battery.x - round.cursor.x, battery.y - round.cursor.y);
      if (distance < closestDistance) {
        closest = battery;
        closestDistance = distance;
      }
    }

    return closest;
  }

  function resolveBatteryForLaunch(round) {
    const battery = findNearestBattery(round, { requireReady: true });
    if (battery) {
      round.selectedBattery = battery.id;
      return battery;
    }

    updateBatteryAim(round);
    return null;
  }

  function spawnEnemyMissile(round, spec) {
    const target = pickEnemyTarget(round);
    if (!target) return;

    const startX = randomRange(playfield.x + layout.gameplay.spawnPaddingX, playfield.x + playfield.w - layout.gameplay.spawnPaddingX);
    const startY = layout.gameplay.spawnY;
    const dx = target.x - startX;
    const dy = target.y - startY;
    const distance = Math.hypot(dx, dy) || 1;

    round.enemyMissiles.push({
      type: spec.type,
      x: startX,
      y: startY,
      startX,
      startY,
      targetX: target.x,
      targetY: target.y,
      targetKind: target.kind,
      targetIndex: target.index,
      speed: spec.speed,
      vx: (dx / distance) * spec.speed,
      vy: (dy / distance) * spec.speed,
      trailX: startX,
      trailY: startY,
      value: spec.type === 'mirv' ? 40 : 25,
      splitAt: spec.type === 'mirv' ? randomRange(0.34, 0.58) : 2,
      totalDistance: distance,
    });
  }

  function pickEnemyTarget(round) {
    const targets = [];
    for (let index = 0; index < round.cities.length; index++) {
      if (round.cities[index].alive) {
        targets.push({ kind: 'city', index, x: round.cities[index].x, y: groundY - layout.gameplay.cityTargetOffsetY });
      }
    }
    for (let index = 0; index < round.batteries.length; index++) {
      if (round.batteries[index].alive) {
        targets.push({ kind: 'battery', index, x: round.batteries[index].x, y: round.batteries[index].y });
      }
    }

    if (targets.length === 0) return null;
    return targets[randomInt(0, targets.length - 1)];
  }

  function updatePlayerMissiles(round, dt) {
    for (let index = round.playerMissiles.length - 1; index >= 0; index--) {
      const missile = round.playerMissiles[index];
      missile.trailX = missile.x;
      missile.trailY = missile.y;
      const step = missile.speed * dt;
      const dx = missile.targetX - missile.x;
      const dy = missile.targetY - missile.y;
      const distance = Math.hypot(dx, dy);

      if (distance <= step) {
        round.playerMissiles.splice(index, 1);
        addExplosion(round, missile.targetX, missile.targetY, (missile.batteryId === 1 ? 30 : 24) * tuning.explosionScale, 'player');
        continue;
      }

      missile.x += missile.vx * dt;
      missile.y += missile.vy * dt;
    }
  }

  function updateEnemyMissiles(round, dt) {
    for (let index = round.enemyMissiles.length - 1; index >= 0; index--) {
      const missile = round.enemyMissiles[index];
      missile.trailX = missile.x;
      missile.trailY = missile.y;
      missile.x += missile.vx * dt;
      missile.y += missile.vy * dt;

      const traveled = Math.hypot(missile.x - missile.startX, missile.y - missile.startY);
      if (missile.type === 'mirv' && traveled / missile.totalDistance >= missile.splitAt) {
        splitMirv(round, missile);
        round.enemyMissiles.splice(index, 1);
        continue;
      }

      if (isIntercepted(round, missile)) {
        destroyEnemyMissile(round, missile);
        round.enemyMissiles.splice(index, 1);
        continue;
      }

      const dx = missile.targetX - missile.x;
      const dy = missile.targetY - missile.y;
      if (dx * dx + dy * dy <= Math.max(tuning.impactRadiusSq, missile.speed * dt * missile.speed * dt)) {
        impactEnemyMissile(round, missile);
        round.enemyMissiles.splice(index, 1);
      }
    }
  }

  function splitMirv(round, missile) {
    addExplosion(round, missile.x, missile.y, 11 * tuning.explosionScale, 'split');
    const children = 3;
    for (let child = 0; child < children; child++) {
      const target = pickEnemyTarget(round);
      if (!target) continue;
      const spreadX = target.x + (child - 1) * tuning.mirvChildSpread;
      const dx = spreadX - missile.x;
      const dy = target.y - missile.y;
      const distance = Math.hypot(dx, dy) || 1;
      round.enemyMissiles.push({
        type: 'standard',
        x: missile.x,
        y: missile.y,
        startX: missile.x,
        startY: missile.y,
        targetX: spreadX,
        targetY: target.y,
        targetKind: target.kind,
        targetIndex: target.index,
        speed: missile.speed + 0.01 * tuning.enemySpeedScale,
        vx: (dx / distance) * (missile.speed + 0.01 * tuning.enemySpeedScale),
        vy: (dy / distance) * (missile.speed + 0.01 * tuning.enemySpeedScale),
        trailX: missile.x,
        trailY: missile.y,
        value: 25,
        splitAt: 2,
        totalDistance: distance,
      });
    }
  }

  function isIntercepted(round, missile) {
    for (const explosion of round.explosions) {
      if (explosion.owner !== 'player') continue;
      const dx = missile.x - explosion.x;
      const dy = missile.y - explosion.y;
      if (dx * dx + dy * dy <= explosion.radius * explosion.radius) {
        return true;
      }
    }
    return false;
  }

  function destroyEnemyMissile(round, missile) {
    awardScore(round.campaign, missile.value * round.campaign.multiplier);
    addExplosion(round, missile.x, missile.y, 9 * tuning.explosionScale, 'intercept');
  }

  function impactEnemyMissile(round, missile) {
    addExplosion(round, missile.targetX, missile.targetY, 18 * tuning.explosionScale, 'enemy');
    round.shock = Math.min(ss(4), round.shock + 1.5 * scale);

    if (missile.targetKind === 'city') {
      const city = round.cities[missile.targetIndex];
      if (city) {
        city.alive = false;
        city.damage = 1;
        round.campaign.cityAlive[missile.targetIndex] = false;
      }
      return;
    }

    if (missile.targetKind === 'battery') {
      const battery = round.batteries[missile.targetIndex];
      if (battery) {
        battery.alive = false;
        battery.missiles = 0;
      }
    }
  }

  function addExplosion(round, x, y, maxRadius, owner) {
    const style = getExplosionStyle(owner);

    round.explosions.push({
      x,
      y,
      owner,
      style,
      radius: 2,
      maxRadius,
      growing: true,
      age: 0,
      sparkTimer: randomRange(26, 54),
    });

    addBurst(round, x, y, style.burstCount, style.emberA, style.emberB);
  }

  function addBurst(round, x, y, count, colorA, colorB) {
    for (let index = 0; index < count; index++) {
      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(tuning.emberSpeedMin, tuning.emberSpeedMax);
      round.embers.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - tuning.emberLift,
        life: randomRange(260, 660),
        age: 0,
        colorA,
        colorB,
      });
    }
  }

  function updateExplosions(round, dt) {
    for (let index = round.explosions.length - 1; index >= 0; index--) {
      const explosion = round.explosions[index];
      explosion.age += dt;
      explosion.sparkTimer -= dt;
      if (explosion.growing) {
        explosion.radius += dt * tuning.explosionGrowthRate;
        if (explosion.radius >= explosion.maxRadius) {
          explosion.radius = explosion.maxRadius;
          explosion.growing = false;
        }
      } else {
        explosion.radius -= dt * tuning.explosionDecayRate;
      }

      if (explosion.sparkTimer <= 0 && explosion.radius > 4) {
        addBurst(round, explosion.x, explosion.y, 3, explosion.style.emberA, explosion.style.emberB);
        explosion.sparkTimer = randomRange(32, 68);
      }

      if (explosion.radius <= 0.5) {
        round.explosions.splice(index, 1);
      }
    }
  }

  function updateEmbers(round, dt) {
    for (let index = round.embers.length - 1; index >= 0; index--) {
      const ember = round.embers[index];
      ember.age += dt;
      ember.x += ember.vx * dt;
      ember.y += ember.vy * dt;
      ember.vy += dt * tuning.emberGravity;
      ember.vx *= 0.996;
      if (ember.age >= ember.life) {
        round.embers.splice(index, 1);
      }
    }
  }

  function finishRound(round) {
    const livingCities = round.cities.filter((city) => city.alive).length;
    const remainingMissiles = round.batteries.reduce((total, battery) => total + battery.missiles, 0);
    const cityBonus = livingCities * 100 * round.campaign.multiplier;
    const missileBonus = remainingMissiles * 5 * round.campaign.multiplier;

    awardScore(round.campaign, cityBonus + missileBonus);
    repairCitiesFromReserve(round.campaign);

    if (!round.campaign.cityAlive.includes(true)) {
      shell.scene = 'gameOver';
      shell.gameplay = null;
      shell.gameOver = {
        score: round.campaign.score,
        round: round.campaign.round,
        highScore: shell.highScore,
      };
      return;
    }

    shell.scene = 'summary';
    shell.summary = {
      campaign: round.campaign,
      round: round.campaign.round,
      cityBonus,
      missileBonus,
      survivingCities: round.campaign.cityAlive.filter(Boolean).length,
      reserveCities: round.campaign.reserveCities,
      score: round.campaign.score,
      multiplier: round.campaign.multiplier,
    };
    shell.gameplay = null;
  }

  function draw() {
    engine.beginFrame();
    engine.clear(palette.midnight);
    drawBackdrop();

    if (shell.scene === 'title') {
      drawTitle();
    } else if (shell.scene === 'instructions') {
      drawInstructions();
    } else if (shell.scene === 'summary') {
      drawSummary();
    } else if (shell.scene === 'gameOver') {
      drawGameOver();
    } else if (shell.scene === 'gameplay') {
      drawGameplay();
    }

    engine.endFrame();
  }

  function drawBackdrop() {
    engine.rectFill(0, 0, screenWidth - 1, screenHeight - 1, palette.midnight);

    for (let y = 0; y < horizonY; y += layout.backdropBandHeight) {
      const t = y / horizonY;
      let bandColor = palette.midnight;

      if (t >= 0.16 && t < 0.32) {
        bandColor = palette.ocean;
      } else if (t >= 0.32 && t < 0.5) {
        bandColor = palette.slateTeal;
      } else if (t >= 0.5 && t < 0.72) {
        bandColor = palette.storm;
      } else if (t >= 0.72 && t < 0.9) {
        bandColor = palette.mineral;
      } else if (t >= 0.9) {
        bandColor = palette.dawn;
      }

      engine.rectFill(0, y, screenWidth - 1, Math.min(horizonY - 1, y + layout.backdropBandHeight - 1), bandColor);
    }

    drawStars();
    drawMountains();
    drawGround();
    drawFrame();
  }

  function drawStars() {
    for (const star of shell.stars) {
      const twinkle = Math.sin(star.twinkle) * 0.5 + 0.5;
      const size = twinkle > 0.82 ? 2 : 1;
      engine.rectFill(star.x, star.y, star.x + size - 1, star.y + size - 1, twinkle > 0.58 ? star.color : palette.mineral);
    }
  }

  function drawMountains() {
    const [ridgeA, ridgeB, ridgeC] = layout.mountains;
    engine.triFill(ridgeA[0], ridgeA[1], ridgeA[2], palette.bark);
    engine.triFill(ridgeB[0], ridgeB[1], ridgeB[2], palette.mushroom);
    engine.triFill(ridgeC[0], ridgeC[1], ridgeC[2], palette.mahogany);
  }

  function drawGround() {
    engine.rectFill(0, horizonY, screenWidth - 1, groundY, palette.bog);
    engine.rectFill(0, groundY, screenWidth - 1, screenHeight - 1, palette.coffee);
    engine.line(0, groundY, screenWidth - 1, groundY, palette.straw, 1);
  }

  function drawFrame() {
    engine.rect(playfield.x - 1, playfield.y - 1, playfield.x + playfield.w, playfield.y + playfield.h, palette.panelEdge, 1);
    engine.rect(playfield.x - 4, playfield.y - 4, playfield.x + playfield.w + 3, playfield.y + playfield.h + 3, palette.storm, 2);
  }

  function drawTitle() {
    const titleLayout = layout.title;

    drawTitleRadar();
    engine.textCentered('BALLISTICS', layout.centerX, titleLayout.titleY, palette.frost);
    engine.textCentered('COORDINATOR', layout.centerX, titleLayout.subtitleY, palette.dawn);
    engine.textCentered('DEFEND THE HINTERLAND', layout.centerX, titleLayout.blurbY, palette.sand);
    engine.textCentered('FROM A CASCADING MISSILE STORM', layout.centerX, titleLayout.blurbDetailY, palette.mist);
    engine.textCentered('PRESS FIRE OR ENTER TO START', layout.centerX, titleLayout.startY, palette.aqua);
    engine.textCentered('PRESS I FOR INSTRUCTIONS', layout.centerX, titleLayout.instructionsY, palette.cloud);
    engine.textCentered(`HIGH SCORE ${shell.highScore}`, layout.centerX, titleLayout.highScoreY, palette.straw);
    engine.textCentered('MOUSE KEYBOARD GAMEPAD TOUCH', layout.centerX, titleLayout.controlsY, palette.cloud);
  }

  function drawTitleRadar() {
    const radar = layout.title.radar;
    const sweep = (shell.elapsed * 0.0014) % 1;
    engine.circleFill(layout.centerX, radar.centerY, radar.outerRadius, palette.gunmetal);
    engine.circleFill(layout.centerX, radar.centerY, radar.ring52, palette.midnight);
    engine.circleFill(layout.centerX, radar.centerY, radar.ring40, palette.storm);
    engine.circleFill(layout.centerX, radar.centerY, radar.ring28, palette.midnight);
    engine.circleFill(layout.centerX, radar.centerY, radar.ring16, palette.slateTeal);
    const angle = sweep * Math.PI * 2 - Math.PI * 0.7;
    engine.line(layout.centerX, radar.centerY, layout.centerX + Math.cos(angle) * radar.beamOuter, radar.centerY + Math.sin(angle) * radar.beamOuter, palette.signalBlue, 2);
    engine.line(layout.centerX, radar.centerY, layout.centerX + Math.cos(angle) * radar.beamInner, radar.centerY + Math.sin(angle) * radar.beamInner, palette.frost, 1);
    engine.circleFill(layout.centerX, radar.centerY, radar.coreRadius, palette.frost);
  }

  function drawInstructions() {
    const panel = layout.panels.instructions;
    const centerX = layout.centerX;
    drawPanel(panel.x, panel.y, panel.w, panel.h, palette.gunmetal);
    engine.textCentered('BALLISTICS COORDINATOR', centerX, panel.y + ss(14), palette.frost);
    engine.textCentered('YOU ARE DEFENDING SIX CITIES', centerX, panel.y + ss(40), palette.sand);
    engine.textCentered('AND THREE LAUNCH BATTERIES.', centerX, panel.y + ss(52), palette.sand);
    engine.textCentered('ARROWS WASD OR STICK MOVE CURSOR', centerX, panel.y + ss(78), palette.mist);
    engine.textCentered('SPACE ENTER CLICK OR TAP FIRES', centerX, panel.y + ss(90), palette.mist);
    engine.textCentered('NEAREST BATTERY FIRES AUTOMATICALLY', centerX, panel.y + ss(102), palette.mist);
    engine.textCentered('CENTER BATTERY FIRES FASTEST.', centerX, panel.y + ss(126), palette.aqua);
    engine.textCentered('SURVIVING CITIES AND MISSILES', centerX, panel.y + ss(138), palette.aqua);
    engine.textCentered('AWARD BONUS SCORE EACH ROUND.', centerX, panel.y + ss(150), palette.aqua);
    engine.textCentered('EVERY 10000 POINTS BANKS A CITY.', centerX, panel.y + ss(162), palette.apricot);
    engine.textCentered('PRESS FIRE TO RETURN', centerX, panel.y + panel.h - ss(20), palette.frost);
  }

  function getBatteryMissileLayout(maxMissiles) {
    return batteryMissileLayouts[maxMissiles] ?? [maxMissiles];
  }

  function drawMissilePyramid(centerX, topY, count, maxMissiles, filledColor, emptyColor, cellWidth = 4, cellHeight = 2, gap = 1) {
    const bottomFirstLayout = getBatteryMissileLayout(maxMissiles);
    const fillByRow = [];
    let remaining = count;

    for (const rowCapacity of bottomFirstLayout) {
      const filled = Math.max(0, Math.min(rowCapacity, remaining));
      fillByRow.push(filled);
      remaining -= filled;
    }

    const topFirstLayout = bottomFirstLayout.slice().reverse();
    const topFirstFill = fillByRow.slice().reverse();

    for (let rowIndex = 0; rowIndex < topFirstLayout.length; rowIndex++) {
      const rowCapacity = topFirstLayout[rowIndex];
      const filled = topFirstFill[rowIndex];
      const rowWidth = rowCapacity * cellWidth + Math.max(0, rowCapacity - 1) * gap;
      const startX = Math.round(centerX - rowWidth * 0.5);
      const y = topY + rowIndex * (cellHeight + gap);

      for (let cellIndex = 0; cellIndex < rowCapacity; cellIndex++) {
        const color = cellIndex < filled ? filledColor : emptyColor;
        const x = startX + cellIndex * (cellWidth + gap);
        engine.rectFill(x, y, x + cellWidth - 1, y + cellHeight - 1, color);
      }
    }
  }

  function getExplosionStyle(owner) {
    if (owner === 'enemy') {
      return {
        outer: palette.mahogany,
        middle: palette.brick,
        inner: palette.amber,
        core: palette.straw,
        emberA: palette.amber,
        emberB: palette.straw,
        burstCount: 22,
      };
    }

    if (owner === 'split') {
      return {
        outer: palette.bark,
        middle: palette.rust,
        inner: palette.apricot,
        core: palette.straw,
        emberA: palette.apricot,
        emberB: palette.straw,
        burstCount: 16,
      };
    }

    if (owner === 'intercept') {
      return {
        outer: palette.brick,
        middle: palette.coral,
        inner: palette.amber,
        core: palette.white,
        emberA: palette.amber,
        emberB: palette.sand,
        burstCount: 18,
      };
    }

    return {
      outer: palette.rust,
      middle: palette.brick,
      inner: palette.apricot,
      core: palette.straw,
      emberA: palette.apricot,
      emberB: palette.straw,
      burstCount: 20,
    };
  }

  function drawSummary() {
    const summary = shell.summary;
    if (!summary) return;
    const panel = layout.panels.summary;

    drawPanel(panel.x, panel.y, panel.w, panel.h, palette.gunmetal);
    engine.textCentered(`ROUND ${summary.round} CLEARED`, layout.centerX, panel.y + ss(14), palette.frost);
    engine.textCentered(`MULTIPLIER X${summary.multiplier}`, layout.centerX, panel.y + ss(38), palette.aqua);
    engine.textCentered(`CITY BONUS ${summary.cityBonus}`, layout.centerX, panel.y + ss(62), palette.sand);
    engine.textCentered(`MISSILE BONUS ${summary.missileBonus}`, layout.centerX, panel.y + ss(74), palette.apricot);
    engine.textCentered(`SURVIVING CITIES ${summary.survivingCities}`, layout.centerX, panel.y + ss(98), palette.mist);
    engine.textCentered(`RESERVE CITIES ${summary.reserveCities}`, layout.centerX, panel.y + ss(110), palette.mist);
    engine.textCentered(`TOTAL SCORE ${summary.score}`, layout.centerX, panel.y + ss(134), palette.frost);
    engine.textCentered('PRESS FIRE FOR NEXT ROUND', layout.centerX, panel.y + panel.h - ss(20), palette.cloud);
  }

  function drawGameOver() {
    const gameOver = shell.gameOver;
    if (!gameOver) return;
    const panel = layout.panels.gameOver;

    drawPanel(panel.x, panel.y, panel.w, panel.h, palette.gunmetal);
    engine.textCentered('THE END', layout.centerX, panel.y + ss(14), palette.garnet);
    engine.textCentered(`FINAL SCORE ${gameOver.score}`, layout.centerX, panel.y + ss(46), palette.frost);
    engine.textCentered(`ROUND REACHED ${gameOver.round}`, layout.centerX, panel.y + ss(62), palette.apricot);
    engine.textCentered(`HIGH SCORE ${gameOver.highScore}`, layout.centerX, panel.y + ss(78), palette.aqua);
    engine.textCentered('PRESS FIRE TO DEPLOY AGAIN', layout.centerX, panel.y + ss(110), palette.cloud);
    engine.textCentered('PRESS ESC TO RETURN TO TITLE', layout.centerX, panel.y + panel.h - ss(22), palette.mist);
  }

  function drawGameplay() {
    const round = shell.gameplay;
    if (!round) return;
    const shakeX = round.shock > 0.15 ? randomRange(-round.shock, round.shock) : 0;
    const shakeY = round.shock > 0.15 ? randomRange(-round.shock * 0.6, round.shock * 0.6) : 0;

    engine.pushClip(playfield.x, playfield.y, playfield.w, playfield.h);
    engine.setCamera(-shakeX, -shakeY);
    drawCities(round);
    drawBatteries(round);
    drawTrails(round);
    drawExplosions(round);
    drawEmbers(round);
    engine.setCamera(0, 0);
    drawCursor(round);
    engine.popClip();

    drawHud(round);
    drawBatteryBar(round);
    if (round.messageTimer > 0) {
      drawBanner(round.message, round.messageTimer, round.campaign.bonusFlash > 0 ? palette.apricot : palette.frost);
    }
    if (round.roundBanner > 0) {
      drawBanner(`ROUND ${round.campaign.round}`, round.roundBanner, palette.aqua);
    }
    if (shell.paused) {
      drawPausedOverlay();
    }
  }

  function drawCities(round) {
    const ruinHalfWidth = ss(12);
    const ruinSpan = ss(14);
    const ruinHeight = ss(6);
    const leftTowerLeft = ss(16);
    const leftTowerRight = ss(10);
    const leftTowerHeight = ss(12);
    const midTowerLeft = ss(9);
    const midTowerRight = ss(3);
    const midTowerHeight = ss(20);
    const lowTowerLeft = ss(2);
    const lowTowerRight = ss(4);
    const lowTowerHeight = ss(15);
    const tallTowerLeft = ss(5);
    const tallTowerRight = ss(11);
    const tallTowerHeight = ss(24);
    const rightTowerLeft = ss(12);
    const rightTowerRight = ss(17);
    const rightTowerHeight = ss(10);
    const skylineY = ss(13);

    for (const city of round.cities) {
      if (!city.alive) {
        engine.rectFill(city.x - ruinHalfWidth, groundY - ruinHeight, city.x + ruinHalfWidth, groundY - 1, palette.soot);
        engine.line(city.x - ruinSpan, groundY - 2, city.x + ruinSpan, groundY - 2, palette.rust, 1);
        continue;
      }

      engine.rectFill(city.x - leftTowerLeft, groundY - leftTowerHeight, city.x - leftTowerRight, groundY - 1, palette.stone);
      engine.rectFill(city.x - midTowerLeft, groundY - midTowerHeight, city.x - midTowerRight, groundY - 1, palette.silver);
      engine.rectFill(city.x - lowTowerLeft, groundY - lowTowerHeight, city.x + lowTowerRight, groundY - 1, palette.cloud);
      engine.rectFill(city.x + tallTowerLeft, groundY - tallTowerHeight, city.x + tallTowerRight, groundY - 1, palette.mist);
      engine.rectFill(city.x + rightTowerLeft, groundY - rightTowerHeight, city.x + rightTowerRight, groundY - 1, palette.window);
      engine.line(city.x - ruinSpan, groundY - skylineY, city.x + ruinSpan + 1, groundY - skylineY, palette.panelEdge, 1);
    }
  }

  function drawBatteries(round) {
    const wreckHalfWidth = ss(10);
    const wreckRadius = ss(5);
    const liveRadius = ss(10);
    const baseHalfWidth = ss(8);
    const baseTop = ss(2);
    const baseBottom = ss(7);
    const mastStart = ss(8);
    const mastEnd = ss(18);
    const shellHalfWidth = ss(4);
    const barrelLift = ss(4);

    for (const battery of round.batteries) {
      if (!battery.alive) {
        engine.rectFill(battery.x - wreckHalfWidth, groundY - ss(3), battery.x + wreckHalfWidth, groundY, palette.soot);
        engine.circleFill(battery.x, groundY - ss(2), wreckRadius, palette.rust);
        continue;
      }

      const selected = battery.id === round.selectedBattery;
      const shellColor = selected ? palette.straw : palette.silver;
      const coreColor = battery.id === 1 ? palette.apricot : palette.aqua;

      engine.circleFill(battery.x, battery.y, liveRadius, selected ? palette.stone : palette.gunmetal);
      engine.rectFill(battery.x - baseHalfWidth, battery.y - baseTop, battery.x + baseHalfWidth, battery.y + baseBottom, palette.stone);
      engine.line(battery.x, battery.y - mastStart, battery.x, battery.y - mastEnd, coreColor, 2);
      engine.line(battery.x - shellHalfWidth, battery.y - barrelLift, battery.x + shellHalfWidth, battery.y - barrelLift, shellColor, 1);
    }
  }

  function drawTrails(round) {
    for (const missile of round.enemyMissiles) {
      engine.line(missile.startX, missile.startY, missile.x, missile.y, palette.mahogany, 2);
      engine.line(missile.startX, missile.startY, missile.x, missile.y, missile.type === 'mirv' ? palette.amber : palette.apricot, 1);
      engine.circleFill(missile.x, missile.y, missile.type === 'mirv' ? 2.4 * scale : ss(2), palette.sand);
    }
    for (const missile of round.playerMissiles) {
      engine.line(missile.startX, missile.startY, missile.x, missile.y, palette.ocean, 2);
      engine.line(missile.startX, missile.startY, missile.x, missile.y, palette.signalBlue, 1);
      engine.circleFill(missile.x, missile.y, ss(2), palette.frost);
    }
  }

  function drawExplosions(round) {
    for (const explosion of round.explosions) {
      const { outer, middle, inner, core } = explosion.style;

      engine.circleFill(explosion.x, explosion.y, explosion.radius, outer);
      engine.circleFill(explosion.x, explosion.y, explosion.radius * 0.72, middle);
      engine.circleFill(explosion.x, explosion.y, explosion.radius * 0.44, inner);
      if (explosion.radius > 3) {
        engine.circleFill(explosion.x, explosion.y, explosion.radius * 0.18, core);
      }
    }
  }

  function drawEmbers(round) {
    for (const ember of round.embers) {
      const lifeT = 1 - ember.age / ember.life;
      const color = lifeT > 0.5 ? ember.colorA : ember.colorB;
      engine.rectFill(ember.x, ember.y, ember.x + 1, ember.y + 1, color);
    }
  }

  function drawCursor(round) {
    const cursorSpan = ss(8);
    engine.line(round.cursor.x - cursorSpan, round.cursor.y, round.cursor.x + cursorSpan, round.cursor.y, palette.cloud, 1);
    engine.line(round.cursor.x, round.cursor.y - cursorSpan, round.cursor.x, round.cursor.y + cursorSpan, palette.cloud, 1);
    engine.circleFill(round.cursor.x, round.cursor.y, ss(2), input.cursor.down ? palette.aqua : palette.apricot);
  }

  function drawHud(round) {
    const stats = [
      { text: `ROUND ${round.campaign.round}`, color: palette.frost },
      { text: `SCORE ${round.campaign.score}`, color: palette.aqua },
      { text: `HIGH ${shell.highScore}`, color: palette.cloud },
      { text: `MULT ${round.campaign.multiplier}`, color: palette.sand },
      { text: `RES ${round.campaign.reserveCities}`, color: palette.apricot },
      { text: `CITIES ${round.campaign.cityAlive.filter(Boolean).length}`, color: palette.mist },
    ];

    engine.rectFill(playfield.x + 2, layout.hud.top, playfield.x + playfield.w - 3, layout.hud.bottom, palette.midnight);
    engine.line(playfield.x + 2, layout.hud.bottom, playfield.x + playfield.w - 3, layout.hud.bottom, palette.mineral, 1);

    for (let index = 0; index < stats.length; index++) {
      engine.textCentered(stats[index].text, layout.hud.columns[index], layout.hud.textY, stats[index].color);
    }
  }

  function drawBatteryBar(round) {
    const bar = layout.batteryBar;

    engine.rectFill(bar.left, bar.top, bar.right, bar.bottom, palette.midnight);
    engine.line(bar.left, bar.top, bar.right, bar.top, palette.mineral, 1);
    engine.line(bar.left, bar.bottom, bar.right, bar.bottom, palette.panelEdge, 1);

    for (const battery of round.batteries) {
      const selected = battery.id === round.selectedBattery;
      const color = !battery.alive ? palette.rust : selected ? palette.straw : palette.frost;

      if (selected) {
        engine.line(battery.x - bar.selectionHalfWidth, bar.top + ss(2), battery.x + bar.selectionHalfWidth, bar.top + ss(2), palette.ocean, 1);
        engine.line(battery.x - bar.selectionHalfWidth, bar.bottom - ss(2), battery.x + bar.selectionHalfWidth, bar.bottom - ss(2), palette.straw, 1);
      }

      drawMissilePyramid(battery.x, bar.pyramidTop, battery.missiles, battery.maxMissiles, color, palette.soot, bar.cellWidth, bar.cellHeight, bar.cellGap);
    }

    for (let index = 0; index < round.batteries.length - 1; index++) {
      const dividerX = Math.round((round.batteries[index].x + round.batteries[index + 1].x) * 0.5);
      engine.line(dividerX, bar.dividerTop, dividerX, bar.dividerBottom, palette.panelEdge, 1);
    }
  }

  function drawBanner(text, timer, color) {
    const panel = layout.panels.banner;
    const pulse = Math.sin(timer * 0.02) * 0.5 + 0.5;
    drawPanel(panel.x, panel.y, panel.w, panel.h, color === palette.apricot ? palette.coffee : palette.gunmetal);
    engine.rectFill(panel.x, panel.y, panel.x + panel.w, panel.y + panel.h, pulse > 0.5 ? color : (color === palette.apricot ? palette.straw : palette.mist));
    engine.rect(panel.x, panel.y, panel.x + panel.w, panel.y + panel.h, palette.white, 1);
    engine.textCentered(text, layout.centerX, panel.y + ss(8), palette.midnight);
  }

  function drawPausedOverlay() {
    const panel = layout.panels.paused;
    drawPanel(panel.x, panel.y, panel.w, panel.h, palette.gunmetal);
    engine.textCentered('PAUSED', layout.centerX, panel.y + ss(12), palette.frost);
    engine.textCentered('ESC TO LEAVE ROUND', layout.centerX, panel.y + ss(28), palette.mist);
  }

  function drawPanel(x, y, w, h, colorA) {
    engine.rectFill(x, y, x + w, y + h, colorA);
    engine.rect(x, y, x + w, y + h, palette.panelEdge, 1);
    engine.line(x + 1, y + 1, x + w - 1, y + 1, palette.cloud, 1);
    engine.line(x + 1, y + h - 1, x + w - 1, y + h - 1, palette.midnight, 1);
  }

  function loop(timestamp) {
    const dt = Math.min(33, timestamp - lastFrameTime);
    lastFrameTime = timestamp;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  boot().catch((error) => {
    console.error(error);
  });
})();

import ImmediateModeEngine from './core/ImmediateModeEngine.js';
import InputManager from './core/InputManager.js';
import { clamp, resizeCanvas } from './core/utils.js';

(function () {
  const screenWidth = 480;
  const screenHeight = 270;
  const playfield = { x: 10, y: 10, w: screenWidth - 20, h: screenHeight - 20 };
  const horizonY = 204;
  const groundY = 222;
  const baseMissiles = [10, 12, 10];
  const batteryMissileLayouts = {
    10: [4, 3, 2, 1],
    12: [5, 4, 3],
  };
  const highScoreKey = 'ballisticsCoordinatorHighScore';
  const cityXs = [42, 96, 152, 328, 384, 438];
  const batteryXs = [78, 240, 402];
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

  function createStars() {
    const stars = [];
    for (let index = 0; index < 64; index++) {
      stars.push({
        x: randomRange(playfield.x + 4, playfield.x + playfield.w - 4),
        y: randomRange(playfield.y + 4, horizonY - 14),
        speed: randomRange(0.0008, 0.0026),
        twinkle: randomRange(0, Math.PI * 2),
        color: index % 4 === 0 ? palette.frost : index % 3 === 0 ? palette.aqua : palette.cloud,
      });
    }
    return stars;
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

    engine = new ImmediateModeEngine(screenWidth, screenHeight, {
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
    });

    const mount = document.getElementById('game');
    mount.appendChild(engine.canvas);
    resizeCanvas(engine.canvas, screenWidth, screenHeight);
    input.attach(engine.canvas);

    globalThis.addEventListener('resize', () => {
      resizeCanvas(engine.canvas, screenWidth, screenHeight);
    });

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
        x: clamp(input.cursor.x, playfield.x + 8, playfield.x + playfield.w - 8),
        y: clamp(input.cursor.y, playfield.y + 10, groundY - 18),
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
        speed: 0.018 + round * 0.0014 + (type === 'mirv' ? 0.003 : 0),
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

    round.cursor.x = clamp(input.cursor.x, playfield.x + 8, playfield.x + playfield.w - 8);
    round.cursor.y = clamp(input.cursor.y, playfield.y + 10, groundY - 20);

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

    const speed = battery.id === 1 ? 0.22 : 0.17;
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

    const startX = randomRange(playfield.x + 12, playfield.x + playfield.w - 12);
    const startY = playfield.y + 4;
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
        targets.push({ kind: 'city', index, x: round.cities[index].x, y: groundY - 8 });
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
        addExplosion(round, missile.targetX, missile.targetY, missile.batteryId === 1 ? 30 : 24, 'player');
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
      if (dx * dx + dy * dy <= Math.max(18, missile.speed * dt * missile.speed * dt)) {
        impactEnemyMissile(round, missile);
        round.enemyMissiles.splice(index, 1);
      }
    }
  }

  function splitMirv(round, missile) {
    addExplosion(round, missile.x, missile.y, 11, 'split');
    const children = 3;
    for (let child = 0; child < children; child++) {
      const target = pickEnemyTarget(round);
      if (!target) continue;
      const spreadX = target.x + (child - 1) * 18;
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
        speed: missile.speed + 0.01,
        vx: (dx / distance) * (missile.speed + 0.01),
        vy: (dy / distance) * (missile.speed + 0.01),
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
    addExplosion(round, missile.x, missile.y, 9, 'intercept');
  }

  function impactEnemyMissile(round, missile) {
    addExplosion(round, missile.targetX, missile.targetY, 18, 'enemy');
    round.shock = Math.min(4, round.shock + 1.5);

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
      const speed = randomRange(0.03, 0.12);
      round.embers.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.03,
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
        explosion.radius += dt * 0.08;
        if (explosion.radius >= explosion.maxRadius) {
          explosion.radius = explosion.maxRadius;
          explosion.growing = false;
        }
      } else {
        explosion.radius -= dt * 0.05;
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
      ember.vy += dt * 0.00008;
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

    for (let y = 0; y < horizonY; y += 8) {
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

      engine.rectFill(0, y, screenWidth - 1, Math.min(horizonY - 1, y + 7), bandColor);
    }

    drawStars();
    drawMountains();
    drawGround();
    drawFrame();
  }

  function drawStars() {
    for (const star of shell.stars) {
      const twinkle = Math.sin(star.twinkle) * 0.5 + 0.5;
      engine.rectFill(star.x, star.y, star.x + 1, star.y + 1, twinkle > 0.58 ? star.color : palette.mineral);
    }
  }

  function drawMountains() {
    engine.triFill({ x: 0, y: horizonY }, { x: 86, y: 132 }, { x: 174, y: horizonY }, palette.bark);
    engine.triFill({ x: 114, y: horizonY }, { x: 238, y: 120 }, { x: 360, y: horizonY }, palette.mushroom);
    engine.triFill({ x: 280, y: horizonY }, { x: 392, y: 142 }, { x: 479, y: horizonY }, palette.mahogany);
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
    const centerX = Math.round(screenWidth * 0.5);

    drawTitleRadar();
    engine.textCentered('BALLISTICS', centerX, 48, palette.frost);
    engine.textCentered('COORDINATOR', centerX, 64, palette.dawn);
    engine.textCentered('DEFEND THE HINTERLAND', centerX, 92, palette.sand);
    engine.textCentered('FROM A CASCADING MISSILE STORM', centerX, 104, palette.mist);
    engine.textCentered('PRESS FIRE OR ENTER TO START', centerX, 154, palette.aqua);
    engine.textCentered('PRESS I FOR INSTRUCTIONS', centerX, 168, palette.cloud);
    engine.textCentered(`HIGH SCORE ${shell.highScore}`, centerX, 196, palette.straw);
    engine.textCentered('MOUSE KEYBOARD GAMEPAD TOUCH', centerX, 222, palette.cloud);
  }

  function drawTitleRadar() {
    const centerX = screenWidth * 0.5;
    const centerY = 134;
    const sweep = (shell.elapsed * 0.0014) % 1;
    engine.circleFill(centerX, centerY, 64, palette.gunmetal);
    engine.circleFill(centerX, centerY, 52, palette.midnight);
    engine.circleFill(centerX, centerY, 40, palette.storm);
    engine.circleFill(centerX, centerY, 28, palette.midnight);
    engine.circleFill(centerX, centerY, 16, palette.slateTeal);
    const angle = sweep * Math.PI * 2 - Math.PI * 0.7;
    engine.line(centerX, centerY, centerX + Math.cos(angle) * 58, centerY + Math.sin(angle) * 58, palette.signalBlue, 2);
    engine.line(centerX, centerY, centerX + Math.cos(angle) * 42, centerY + Math.sin(angle) * 42, palette.frost, 1);
    engine.circleFill(centerX, centerY, 4, palette.frost);
  }

  function drawInstructions() {
    drawPanel(40, 30, 400, 206, palette.gunmetal);
    engine.text('BALLISTICS COORDINATOR', 108, 44, palette.frost);
    engine.text('YOU ARE DEFENDING SIX CITIES', 92, 70, palette.sand);
    engine.text('AND THREE LAUNCH BATTERIES.', 95, 82, palette.sand);
    engine.text('ARROWS WASD OR STICK MOVE CURSOR', 63, 108, palette.mist);
    engine.text('SPACE ENTER CLICK OR TAP FIRES', 74, 120, palette.mist);
    engine.text('NEAREST BATTERY FIRES AUTOMATICALLY', 51, 132, palette.mist);
    engine.text('CENTER BATTERY FIRES FASTEST.', 91, 156, palette.aqua);
    engine.text('SURVIVING CITIES AND MISSILES', 82, 168, palette.aqua);
    engine.text('AWARD BONUS SCORE EACH ROUND.', 87, 180, palette.aqua);
    engine.text('EVERY 10000 POINTS BANKS A CITY.', 77, 192, palette.apricot);
    engine.text('PRESS FIRE TO RETURN', 135, 216, palette.frost);
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
    const centerX = Math.round(screenWidth * 0.5);

    drawPanel(122, 48, 236, 166, palette.gunmetal);
    engine.textCentered(`ROUND ${summary.round} CLEARED`, centerX, 62, palette.frost);
    engine.textCentered(`MULTIPLIER X${summary.multiplier}`, centerX, 86, palette.aqua);
    engine.textCentered(`CITY BONUS ${summary.cityBonus}`, centerX, 110, palette.sand);
    engine.textCentered(`MISSILE BONUS ${summary.missileBonus}`, centerX, 122, palette.apricot);
    engine.textCentered(`SURVIVING CITIES ${summary.survivingCities}`, centerX, 146, palette.mist);
    engine.textCentered(`RESERVE CITIES ${summary.reserveCities}`, centerX, 158, palette.mist);
    engine.textCentered(`TOTAL SCORE ${summary.score}`, centerX, 182, palette.frost);
    engine.textCentered('PRESS FIRE FOR NEXT ROUND', centerX, 198, palette.cloud);
  }

  function drawGameOver() {
    const gameOver = shell.gameOver;
    if (!gameOver) return;
    const centerX = Math.round(screenWidth * 0.5);

    drawPanel(118, 56, 244, 150, palette.gunmetal);
    engine.textCentered('THE END', centerX, 74, palette.garnet);
    engine.textCentered(`FINAL SCORE ${gameOver.score}`, centerX, 106, palette.frost);
    engine.textCentered(`ROUND REACHED ${gameOver.round}`, centerX, 122, palette.apricot);
    engine.textCentered(`HIGH SCORE ${gameOver.highScore}`, centerX, 138, palette.aqua);
    engine.textCentered('PRESS FIRE TO DEPLOY AGAIN', centerX, 170, palette.cloud);
    engine.textCentered('PRESS ESC TO RETURN TO TITLE', centerX, 184, palette.mist);
  }

  function drawGameplay() {
    const round = shell.gameplay;
    if (!round) return;

    engine.pushClip(playfield.x, playfield.y, playfield.w, playfield.h);
    drawCities(round);
    drawBatteries(round);
    drawTrails(round);
    drawExplosions(round);
    drawEmbers(round);
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
    for (const city of round.cities) {
      if (!city.alive) {
        engine.rectFill(city.x - 12, groundY - 6, city.x + 12, groundY - 1, palette.soot);
        engine.line(city.x - 14, groundY - 2, city.x + 14, groundY - 2, palette.rust, 1);
        continue;
      }

      engine.rectFill(city.x - 16, groundY - 12, city.x - 10, groundY - 1, palette.stone);
      engine.rectFill(city.x - 9, groundY - 20, city.x - 3, groundY - 1, palette.silver);
      engine.rectFill(city.x - 2, groundY - 15, city.x + 4, groundY - 1, palette.cloud);
      engine.rectFill(city.x + 5, groundY - 24, city.x + 11, groundY - 1, palette.mist);
      engine.rectFill(city.x + 12, groundY - 10, city.x + 17, groundY - 1, palette.window);
      engine.line(city.x - 14, groundY - 13, city.x + 15, groundY - 13, palette.panelEdge, 1);
    }
  }

  function drawBatteries(round) {
    for (const battery of round.batteries) {
      if (!battery.alive) {
        engine.rectFill(battery.x - 10, groundY - 3, battery.x + 10, groundY, palette.soot);
        engine.circleFill(battery.x, groundY - 2, 5, palette.rust);
        continue;
      }

      const selected = battery.id === round.selectedBattery;
      const shellColor = selected ? palette.straw : palette.silver;
      const coreColor = battery.id === 1 ? palette.apricot : palette.aqua;

      engine.circleFill(battery.x, battery.y, 10, selected ? palette.stone : palette.gunmetal);
      engine.rectFill(battery.x - 8, battery.y - 2, battery.x + 8, battery.y + 7, palette.stone);
      engine.line(battery.x, battery.y - 8, battery.x, battery.y - 18, coreColor, 2);
      engine.line(battery.x - 4, battery.y - 4, battery.x + 4, battery.y - 4, shellColor, 1);
    }
  }

  function drawTrails(round) {
    for (const missile of round.enemyMissiles) {
      engine.line(missile.startX, missile.startY, missile.x, missile.y, palette.mahogany, 2);
      engine.line(missile.startX, missile.startY, missile.x, missile.y, missile.type === 'mirv' ? palette.amber : palette.apricot, 1);
      engine.circleFill(missile.x, missile.y, missile.type === 'mirv' ? 2.4 : 2, palette.sand);
    }
    for (const missile of round.playerMissiles) {
      engine.line(missile.startX, missile.startY, missile.x, missile.y, palette.ocean, 2);
      engine.line(missile.startX, missile.startY, missile.x, missile.y, palette.signalBlue, 1);
      engine.circleFill(missile.x, missile.y, 2, palette.frost);
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
    engine.line(round.cursor.x - 8, round.cursor.y, round.cursor.x + 8, round.cursor.y, palette.cloud, 1);
    engine.line(round.cursor.x, round.cursor.y - 8, round.cursor.x, round.cursor.y + 8, palette.cloud, 1);
    engine.circleFill(round.cursor.x, round.cursor.y, 2, input.cursor.down ? palette.aqua : palette.apricot);
  }

  function drawHud(round) {
    const hudY = 13;

    engine.rectFill(playfield.x + 2, playfield.y + 1, playfield.x + playfield.w - 3, 23, palette.midnight);
    engine.line(playfield.x + 2, 23, playfield.x + playfield.w - 3, 23, palette.mineral, 1);
    engine.text(`ROUND ${round.campaign.round}`, 18, hudY, palette.frost);
    engine.text(`SCORE ${round.campaign.score}`, 88, hudY, palette.aqua);
    engine.text(`HIGH ${shell.highScore}`, 188, hudY, palette.cloud);
    engine.text(`MULT ${round.campaign.multiplier}`, 292, hudY, palette.sand);
    engine.text(`RES ${round.campaign.reserveCities}`, 360, hudY, palette.apricot);
    engine.text(`CITIES ${round.campaign.cityAlive.filter(Boolean).length}`, 408, hudY, palette.mist);
  }

  function drawBatteryBar(round) {
    const barLeft = playfield.x + 56;
    const barRight = playfield.x + playfield.w - 56;

    engine.rectFill(barLeft, 233, barRight, 251, palette.midnight);
    engine.line(barLeft, 233, barRight, 233, palette.mineral, 1);
    engine.line(barLeft, 251, barRight, 251, palette.panelEdge, 1);

    for (const battery of round.batteries) {
      const selected = battery.id === round.selectedBattery;
      const color = !battery.alive ? palette.rust : selected ? palette.straw : palette.frost;

      if (selected) {
        engine.line(battery.x - 34, 235, battery.x + 34, 235, palette.ocean, 1);
        engine.line(battery.x - 34, 249, battery.x + 34, 249, palette.straw, 1);
      }

      drawMissilePyramid(battery.x, 236, battery.missiles, battery.maxMissiles, color, palette.soot, 4, 2, 1);
    }

    for (let index = 0; index < round.batteries.length - 1; index++) {
      const dividerX = Math.round((round.batteries[index].x + round.batteries[index + 1].x) * 0.5);
      engine.line(dividerX, 236, dividerX, 248, palette.panelEdge, 1);
    }
  }

  function drawBanner(text, timer, color) {
    const pulse = Math.sin(timer * 0.02) * 0.5 + 0.5;
    drawPanel(116, 96, 248, 26, color === palette.apricot ? palette.coffee : palette.gunmetal);
    engine.rectFill(116, 96, 364, 122, pulse > 0.5 ? color : (color === palette.apricot ? palette.straw : palette.mist));
    engine.rect(116, 96, 364, 122, palette.white, 1);
    engine.text(text, 132, 104, palette.midnight);
  }

  function drawPausedOverlay() {
    drawPanel(136, 114, 208, 52, palette.gunmetal);
    engine.text('PAUSED', 214, 126, palette.frost);
    engine.text('ESC TO LEAVE ROUND', 154, 142, palette.mist);
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

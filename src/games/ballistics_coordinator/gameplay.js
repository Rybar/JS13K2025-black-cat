import { clamp } from '../../js/core/utils.js';
import { randomRange } from './math.js';
import { awardScore, repairCitiesFromReserve, showInstructions, showTitle, startNewGame, startRound } from './state.js';

function updateTitle(shell, input) {
  if (input.wasPressed('instructions')) {
    showInstructions(shell);
    return;
  }

  if (input.wasPressed('confirm') || input.wasPressed('fire')) {
    startNewGame(shell, input);
  }
}

function updateInstructions(shell, input) {
  if (input.wasPressed('confirm') || input.wasPressed('back') || input.wasPressed('instructions')) {
    showTitle(shell);
  }
}

function updateSummary(shell, input) {
  if (!shell.summary) return;
  if (input.wasPressed('confirm') || input.wasPressed('fire')) {
    shell.summary.campaign.round += 1;
    startRound(shell, shell.summary.campaign, input);
    return;
  }

  if (input.wasPressed('back')) {
    showTitle(shell);
  }
}

function updateGameOver(shell, input) {
  if (input.wasPressed('confirm') || input.wasPressed('fire')) {
    startNewGame(shell, input);
    return;
  }

  if (input.wasPressed('back') || input.wasPressed('instructions')) {
    showTitle(shell);
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

function fireCounterMissile(shell, round) {
  const { tuning } = shell.config;
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

function spawnEnemyMissile(shell, round, spec) {
  const { layout, playfield, tuning } = shell.config;
  const target = pickEnemyTarget(shell, round);
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
    tuning,
  });
}

function pickEnemyTarget(shell, round) {
  const { groundY, layout } = shell.config;
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
  return targets[Math.floor(randomRange(0, targets.length))];
}

function addBurst(shell, round, x, y, count, colorA, colorB) {
  const { tuning } = shell.config;

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

function getExplosionStyle(shell, owner) {
  const { palette } = shell.config;

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

function addExplosion(shell, round, x, y, maxRadius, owner) {
  const style = getExplosionStyle(shell, owner);

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

  addBurst(shell, round, x, y, style.burstCount, style.emberA, style.emberB);
}

function updatePlayerMissiles(shell, round, dt) {
  const { tuning } = shell.config;

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
      addExplosion(shell, round, missile.targetX, missile.targetY, (missile.batteryId === 1 ? 30 : 24) * tuning.explosionScale, 'player');
      continue;
    }

    missile.x += missile.vx * dt;
    missile.y += missile.vy * dt;
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

function destroyEnemyMissile(shell, round, missile) {
  awardScore(shell, round.campaign, missile.value * round.campaign.multiplier);
  addExplosion(shell, round, missile.x, missile.y, 9 * shell.config.tuning.explosionScale, 'intercept');
}

function impactEnemyMissile(shell, round, missile) {
  const { scaleHelpers, tuning } = shell.config;
  addExplosion(shell, round, missile.targetX, missile.targetY, 18 * tuning.explosionScale, 'enemy');
  round.shock = Math.min(scaleHelpers.size(4), round.shock + 1.5 * shell.config.screenScale);

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

function splitMirv(shell, round, missile) {
  const { tuning } = shell.config;
  addExplosion(shell, round, missile.x, missile.y, 11 * tuning.explosionScale, 'split');

  for (let child = 0; child < 3; child++) {
    const target = pickEnemyTarget(shell, round);
    if (!target) continue;

    const spreadX = target.x + (child - 1) * tuning.mirvChildSpread;
    const dx = spreadX - missile.x;
    const dy = target.y - missile.y;
    const distance = Math.hypot(dx, dy) || 1;
    const childSpeed = missile.speed + 0.01 * tuning.enemySpeedScale;

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
      speed: childSpeed,
      vx: (dx / distance) * childSpeed,
      vy: (dy / distance) * childSpeed,
      trailX: missile.x,
      trailY: missile.y,
      value: 25,
      splitAt: 2,
      totalDistance: distance,
    });
  }
}

function updateEnemyMissiles(shell, round, dt) {
  const { tuning } = shell.config;

  for (let index = round.enemyMissiles.length - 1; index >= 0; index--) {
    const missile = round.enemyMissiles[index];
    missile.trailX = missile.x;
    missile.trailY = missile.y;
    missile.x += missile.vx * dt;
    missile.y += missile.vy * dt;

    const traveled = Math.hypot(missile.x - missile.startX, missile.y - missile.startY);
    if (missile.type === 'mirv' && traveled / missile.totalDistance >= missile.splitAt) {
      splitMirv(shell, round, missile);
      round.enemyMissiles.splice(index, 1);
      continue;
    }

    if (isIntercepted(round, missile)) {
      destroyEnemyMissile(shell, round, missile);
      round.enemyMissiles.splice(index, 1);
      continue;
    }

    const dx = missile.targetX - missile.x;
    const dy = missile.targetY - missile.y;
    if (dx * dx + dy * dy <= Math.max(tuning.impactRadiusSq, missile.speed * dt * missile.speed * dt)) {
      impactEnemyMissile(shell, round, missile);
      round.enemyMissiles.splice(index, 1);
    }
  }
}

function updateExplosions(shell, round, dt) {
  const { tuning } = shell.config;

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
      addBurst(shell, round, explosion.x, explosion.y, 3, explosion.style.emberA, explosion.style.emberB);
      explosion.sparkTimer = randomRange(32, 68);
    }

    if (explosion.radius <= 0.5) {
      round.explosions.splice(index, 1);
    }
  }
}

function updateEmbers(shell, round, dt) {
  const { tuning } = shell.config;

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

function finishRound(shell, round) {
  const livingCities = round.cities.filter((city) => city.alive).length;
  const remainingMissiles = round.batteries.reduce((total, battery) => total + battery.missiles, 0);
  const cityBonus = livingCities * 100 * round.campaign.multiplier;
  const missileBonus = remainingMissiles * 5 * round.campaign.multiplier;

  awardScore(shell, round.campaign, cityBonus + missileBonus);
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

function updateGameplay(shell, dt, input) {
  const { groundY, layout, playfield } = shell.config;
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
      showTitle(shell);
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
    fireCounterMissile(shell, round);
  }

  if (round.spawnIndex < round.spawnPlan.length) {
    round.spawnTimer -= dt;
    if (round.spawnTimer <= 0) {
      spawnEnemyMissile(shell, round, round.spawnPlan[round.spawnIndex]);
      round.spawnIndex += 1;
      if (round.spawnIndex < round.spawnPlan.length) {
        round.spawnTimer = round.spawnPlan[round.spawnIndex].delay;
      }
    }
  }

  updatePlayerMissiles(shell, round, dt);
  updateEnemyMissiles(shell, round, dt);
  updateExplosions(shell, round, dt);
  updateEmbers(shell, round, dt);

  if (round.spawnIndex >= round.spawnPlan.length && round.enemyMissiles.length === 0 && round.playerMissiles.length === 0) {
    if (round.completeTimer <= 0) {
      round.completeTimer = 900;
    }
    round.completeTimer -= dt;
    if (round.completeTimer <= 0) {
      finishRound(shell, round);
    }
  } else {
    round.completeTimer = 0;
  }
}

export function updateBallistics(shell, dt, { input }) {
  shell.elapsed += dt;
  input.update(dt);
  for (const star of shell.stars) {
    star.twinkle += dt * star.speed;
  }

  if (shell.scene === 'title') {
    updateTitle(shell, input);
    return;
  }

  if (shell.scene === 'instructions') {
    updateInstructions(shell, input);
    return;
  }

  if (shell.scene === 'summary') {
    updateSummary(shell, input);
    return;
  }

  if (shell.scene === 'gameOver') {
    updateGameOver(shell, input);
    return;
  }

  if (shell.scene === 'gameplay') {
    updateGameplay(shell, dt, input);
  }
}
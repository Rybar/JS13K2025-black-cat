import { clamp } from '../../js/core/utils.js';
import { randomInt, randomRange } from './math.js';

function createStars(config) {
  const { layout, palette, playfield, horizonY } = config;
  const { size: ss } = config.scaleHelpers;
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

function loadHighScore(storage, key) {
  try {
    const value = storage?.getItem(key);
    return value ? Number(value) || 0 : 0;
  } catch {
    return 0;
  }
}

function saveHighScore(storage, key, score) {
  try {
    storage?.setItem(key, String(score));
  } catch {
    return;
  }
}

function buildSpawnPlan(config, round) {
  const { tuning } = config;
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

export function repairCitiesFromReserve(campaign) {
  while (campaign.reserveCities > 0 && campaign.cityAlive.includes(false)) {
    const index = campaign.cityAlive.indexOf(false);
    campaign.cityAlive[index] = true;
    campaign.reserveCities -= 1;
  }
}

export function createRoundState(shell, campaign, input) {
  const config = shell.config;
  const { batteryXs, baseMissiles, cityXs, groundY, layout, playfield } = config;

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
    spawnPlan: buildSpawnPlan(config, campaign.round),
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

export function createShell(config, storage, input) {
  return {
    config,
    storage,
    scene: 'boot',
    elapsed: 0,
    highScore: loadHighScore(storage, config.highScoreKey),
    gameplay: null,
    summary: null,
    gameOver: null,
    paused: false,
    stars: createStars(config),
    input,
  };
}

export function showTitle(shell) {
  shell.scene = 'title';
  shell.summary = null;
  shell.gameOver = null;
  shell.gameplay = null;
  shell.paused = false;
}

export function showInstructions(shell) {
  shell.scene = 'instructions';
}

export function startRound(shell, campaign, input) {
  repairCitiesFromReserve(campaign);
  shell.scene = 'gameplay';
  shell.summary = null;
  shell.gameOver = null;
  shell.paused = false;
  shell.gameplay = createRoundState(shell, campaign, input);
}

export function startNewGame(shell, input) {
  const campaign = {
    round: 1,
    score: 0,
    multiplier: 1,
    reserveCities: 0,
    nextBonusScore: 10000,
    cityAlive: new Array(shell.config.cityXs.length).fill(true),
    bonusFlash: 0,
  };
  startRound(shell, campaign, input);
}

export function awardScore(shell, campaign, amount) {
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
    saveHighScore(shell.storage, shell.config.highScoreKey, shell.highScore);
  }
}
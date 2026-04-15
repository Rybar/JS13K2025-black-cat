import { randomRange } from './math.js';

function getView(shell) {
  const { config } = shell;
  return {
    groundY: config.groundY,
    horizonY: config.horizonY,
    layout: config.layout,
    palette: config.palette,
    playfield: config.playfield,
    screenHeight: config.screen.height,
    screenScale: config.screenScale,
    screenWidth: config.screen.width,
    ss: config.scaleHelpers.size,
  };
}

function drawPanel(shell, engine, x, y, w, h, colorA) {
  const { palette } = shell.config;
  engine.rectFill(x, y, x + w, y + h, colorA);
  engine.rect(x, y, x + w, y + h, palette.panelEdge, 1);
  engine.line(x + 1, y + 1, x + w - 1, y + 1, palette.cloud, 1);
  engine.line(x + 1, y + h - 1, x + w - 1, y + h - 1, palette.midnight, 1);
}

function drawBackdrop(shell, engine) {
  const { horizonY, layout, palette, screenHeight, screenWidth } = getView(shell);

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

  drawStars(shell, engine);
  drawMountains(shell, engine);
  drawGround(shell, engine);
  drawFrame(shell, engine);
}

function drawStars(shell, engine) {
  const { palette } = shell.config;

  for (const star of shell.stars) {
    const twinkle = Math.sin(star.twinkle) * 0.5 + 0.5;
    const size = twinkle > 0.82 ? 2 : 1;
    engine.rectFill(star.x, star.y, star.x + size - 1, star.y + size - 1, twinkle > 0.58 ? star.color : palette.mineral);
  }
}

function drawMountains(shell, engine) {
  const { layout, palette } = shell.config;
  const [ridgeA, ridgeB, ridgeC] = layout.mountains;
  engine.triFill(ridgeA[0], ridgeA[1], ridgeA[2], palette.bark);
  engine.triFill(ridgeB[0], ridgeB[1], ridgeB[2], palette.mushroom);
  engine.triFill(ridgeC[0], ridgeC[1], ridgeC[2], palette.mahogany);
}

function drawGround(shell, engine) {
  const { groundY, horizonY, palette, screen } = shell.config;
  engine.rectFill(0, horizonY, screen.width - 1, groundY, palette.bog);
  engine.rectFill(0, groundY, screen.width - 1, screen.height - 1, palette.coffee);
  engine.line(0, groundY, screen.width - 1, groundY, palette.straw, 1);
}

function drawFrame(shell, engine) {
  const { palette, playfield } = shell.config;
  engine.rect(playfield.x - 1, playfield.y - 1, playfield.x + playfield.w, playfield.y + playfield.h, palette.panelEdge, 1);
  engine.rect(playfield.x - 4, playfield.y - 4, playfield.x + playfield.w + 3, playfield.y + playfield.h + 3, palette.storm, 2);
}

function drawTitleRadar(shell, engine) {
  const { layout, palette } = shell.config;
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

function drawTitle(shell, engine) {
  const { layout, palette } = shell.config;
  const titleLayout = layout.title;

  drawTitleRadar(shell, engine);
  engine.textCentered('BALLISTICS', layout.centerX, titleLayout.titleY, palette.frost);
  engine.textCentered('COORDINATOR', layout.centerX, titleLayout.subtitleY, palette.dawn);
  engine.textCentered('DEFEND THE HINTERLAND', layout.centerX, titleLayout.blurbY, palette.sand);
  engine.textCentered('FROM A CASCADING MISSILE STORM', layout.centerX, titleLayout.blurbDetailY, palette.mist);
  engine.textCentered('PRESS FIRE OR ENTER TO START', layout.centerX, titleLayout.startY, palette.aqua);
  engine.textCentered('PRESS I FOR INSTRUCTIONS', layout.centerX, titleLayout.instructionsY, palette.cloud);
  engine.textCentered(`HIGH SCORE ${shell.highScore}`, layout.centerX, titleLayout.highScoreY, palette.straw);
  engine.textCentered('MOUSE KEYBOARD GAMEPAD TOUCH', layout.centerX, titleLayout.controlsY, palette.cloud);
}

function drawInstructions(shell, engine) {
  const { layout, palette } = shell.config;
  const { size: ss } = shell.config.scaleHelpers;
  const panel = layout.panels.instructions;
  drawPanel(shell, engine, panel.x, panel.y, panel.w, panel.h, palette.gunmetal);
  engine.textCentered('BALLISTICS COORDINATOR', layout.centerX, panel.y + ss(14), palette.frost);
  engine.textCentered('YOU ARE DEFENDING SIX CITIES', layout.centerX, panel.y + ss(40), palette.sand);
  engine.textCentered('AND THREE LAUNCH BATTERIES.', layout.centerX, panel.y + ss(52), palette.sand);
  engine.textCentered('ARROWS WASD OR STICK MOVE CURSOR', layout.centerX, panel.y + ss(78), palette.mist);
  engine.textCentered('SPACE ENTER CLICK OR TAP FIRES', layout.centerX, panel.y + ss(90), palette.mist);
  engine.textCentered('NEAREST BATTERY FIRES AUTOMATICALLY', layout.centerX, panel.y + ss(102), palette.mist);
  engine.textCentered('CENTER BATTERY FIRES FASTEST.', layout.centerX, panel.y + ss(126), palette.aqua);
  engine.textCentered('SURVIVING CITIES AND MISSILES', layout.centerX, panel.y + ss(138), palette.aqua);
  engine.textCentered('AWARD BONUS SCORE EACH ROUND.', layout.centerX, panel.y + ss(150), palette.aqua);
  engine.textCentered('EVERY 10000 POINTS BANKS A CITY.', layout.centerX, panel.y + ss(162), palette.apricot);
  engine.textCentered('PRESS FIRE TO RETURN', layout.centerX, panel.y + panel.h - ss(20), palette.frost);
}

function getBatteryMissileLayout(shell, maxMissiles) {
  return shell.config.batteryMissileLayouts[maxMissiles] ?? [maxMissiles];
}

function drawMissilePyramid(shell, engine, centerX, topY, count, maxMissiles, filledColor, emptyColor, cellWidth = 4, cellHeight = 2, gap = 1) {
  const bottomFirstLayout = getBatteryMissileLayout(shell, maxMissiles);
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

function drawSummary(shell, engine) {
  if (!shell.summary) return;
  const { layout, palette } = shell.config;
  const { size: ss } = shell.config.scaleHelpers;
  const panel = layout.panels.summary;
  drawPanel(shell, engine, panel.x, panel.y, panel.w, panel.h, palette.gunmetal);
  engine.textCentered(`ROUND ${shell.summary.round} CLEARED`, layout.centerX, panel.y + ss(14), palette.frost);
  engine.textCentered(`MULTIPLIER X${shell.summary.multiplier}`, layout.centerX, panel.y + ss(38), palette.aqua);
  engine.textCentered(`CITY BONUS ${shell.summary.cityBonus}`, layout.centerX, panel.y + ss(62), palette.sand);
  engine.textCentered(`MISSILE BONUS ${shell.summary.missileBonus}`, layout.centerX, panel.y + ss(74), palette.apricot);
  engine.textCentered(`SURVIVING CITIES ${shell.summary.survivingCities}`, layout.centerX, panel.y + ss(98), palette.mist);
  engine.textCentered(`RESERVE CITIES ${shell.summary.reserveCities}`, layout.centerX, panel.y + ss(110), palette.mist);
  engine.textCentered(`TOTAL SCORE ${shell.summary.score}`, layout.centerX, panel.y + ss(134), palette.frost);
  engine.textCentered('PRESS FIRE FOR NEXT ROUND', layout.centerX, panel.y + panel.h - ss(20), palette.cloud);
}

function drawGameOver(shell, engine) {
  if (!shell.gameOver) return;
  const { layout, palette } = shell.config;
  const { size: ss } = shell.config.scaleHelpers;
  const panel = layout.panels.gameOver;
  drawPanel(shell, engine, panel.x, panel.y, panel.w, panel.h, palette.gunmetal);
  engine.textCentered('THE END', layout.centerX, panel.y + ss(14), palette.garnet);
  engine.textCentered(`FINAL SCORE ${shell.gameOver.score}`, layout.centerX, panel.y + ss(46), palette.frost);
  engine.textCentered(`ROUND REACHED ${shell.gameOver.round}`, layout.centerX, panel.y + ss(62), palette.apricot);
  engine.textCentered(`HIGH SCORE ${shell.gameOver.highScore}`, layout.centerX, panel.y + ss(78), palette.aqua);
  engine.textCentered('PRESS FIRE TO DEPLOY AGAIN', layout.centerX, panel.y + ss(110), palette.cloud);
  engine.textCentered('PRESS ESC TO RETURN TO TITLE', layout.centerX, panel.y + panel.h - ss(22), palette.mist);
}

function drawCities(shell, engine, round) {
  const { groundY, palette, ss } = getView(shell);
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

function drawBatteries(shell, engine, round) {
  const { groundY, palette, ss } = getView(shell);
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

function drawTrails(shell, engine, round) {
  const { palette, screenScale, ss } = getView(shell);

  for (const missile of round.enemyMissiles) {
    engine.line(missile.startX, missile.startY, missile.x, missile.y, palette.mahogany, 2);
    engine.line(missile.startX, missile.startY, missile.x, missile.y, missile.type === 'mirv' ? palette.amber : palette.apricot, 1);
    engine.circleFill(missile.x, missile.y, missile.type === 'mirv' ? 2.4 * screenScale : ss(2), palette.sand);
  }

  for (const missile of round.playerMissiles) {
    engine.line(missile.startX, missile.startY, missile.x, missile.y, palette.ocean, 2);
    engine.line(missile.startX, missile.startY, missile.x, missile.y, palette.signalBlue, 1);
    engine.circleFill(missile.x, missile.y, ss(2), palette.frost);
  }
}

function drawExplosions(engine, round) {
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

function drawEmbers(engine, round) {
  for (const ember of round.embers) {
    const lifeT = 1 - ember.age / ember.life;
    const color = lifeT > 0.5 ? ember.colorA : ember.colorB;
    engine.rectFill(ember.x, ember.y, ember.x + 1, ember.y + 1, color);
  }
}

function drawCursor(shell, engine, input, round) {
  const { palette } = shell.config;
  const cursorSpan = shell.config.scaleHelpers.size(8);
  engine.line(round.cursor.x - cursorSpan, round.cursor.y, round.cursor.x + cursorSpan, round.cursor.y, palette.cloud, 1);
  engine.line(round.cursor.x, round.cursor.y - cursorSpan, round.cursor.x, round.cursor.y + cursorSpan, palette.cloud, 1);
  engine.circleFill(round.cursor.x, round.cursor.y, shell.config.scaleHelpers.size(2), input.cursor.down ? palette.aqua : palette.apricot);
}

function drawHud(shell, engine, round) {
  const { layout, palette, playfield } = shell.config;
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

function drawBatteryBar(shell, engine, round) {
  const { layout, palette } = shell.config;
  const { size: ss } = shell.config.scaleHelpers;
  const { batteryBar } = layout;

  engine.rectFill(batteryBar.left, batteryBar.top, batteryBar.right, batteryBar.bottom, palette.midnight);
  engine.line(batteryBar.left, batteryBar.top, batteryBar.right, batteryBar.top, palette.mineral, 1);
  engine.line(batteryBar.left, batteryBar.bottom, batteryBar.right, batteryBar.bottom, palette.panelEdge, 1);

  for (const battery of round.batteries) {
    const selected = battery.id === round.selectedBattery;
    const color = !battery.alive ? palette.rust : selected ? palette.straw : palette.frost;

    if (selected) {
      engine.line(battery.x - batteryBar.selectionHalfWidth, batteryBar.top + ss(2), battery.x + batteryBar.selectionHalfWidth, batteryBar.top + ss(2), palette.ocean, 1);
      engine.line(battery.x - batteryBar.selectionHalfWidth, batteryBar.bottom - ss(2), battery.x + batteryBar.selectionHalfWidth, batteryBar.bottom - ss(2), palette.straw, 1);
    }

    drawMissilePyramid(shell, engine, battery.x, batteryBar.pyramidTop, battery.missiles, battery.maxMissiles, color, palette.soot, batteryBar.cellWidth, batteryBar.cellHeight, batteryBar.cellGap);
  }

  for (let index = 0; index < round.batteries.length - 1; index++) {
    const dividerX = Math.round((round.batteries[index].x + round.batteries[index + 1].x) * 0.5);
    engine.line(dividerX, batteryBar.dividerTop, dividerX, batteryBar.dividerBottom, palette.panelEdge, 1);
  }
}

function drawBanner(shell, engine, text, timer, color) {
  const { layout, palette } = shell.config;
  const panel = layout.panels.banner;
  const pulse = Math.sin(timer * 0.02) * 0.5 + 0.5;
  drawPanel(shell, engine, panel.x, panel.y, panel.w, panel.h, color === palette.apricot ? palette.coffee : palette.gunmetal);
  engine.rectFill(panel.x, panel.y, panel.x + panel.w, panel.y + panel.h, pulse > 0.5 ? color : (color === palette.apricot ? palette.straw : palette.mist));
  engine.rect(panel.x, panel.y, panel.x + panel.w, panel.y + panel.h, palette.white, 1);
  engine.textCentered(text, layout.centerX, panel.y + shell.config.scaleHelpers.size(8), palette.midnight);
}

function drawPausedOverlay(shell, engine) {
  const { layout, palette } = shell.config;
  const { size: ss } = shell.config.scaleHelpers;
  const panel = layout.panels.paused;
  drawPanel(shell, engine, panel.x, panel.y, panel.w, panel.h, palette.gunmetal);
  engine.textCentered('PAUSED', layout.centerX, panel.y + ss(12), palette.frost);
  engine.textCentered('ESC TO LEAVE ROUND', layout.centerX, panel.y + ss(28), palette.mist);
}

function drawGameplay(shell, engine, input) {
  const { palette, playfield } = shell.config;
  const round = shell.gameplay;
  if (!round) return;
  const shakeX = round.shock > 0.15 ? randomRange(-round.shock, round.shock) : 0;
  const shakeY = round.shock > 0.15 ? randomRange(-round.shock * 0.6, round.shock * 0.6) : 0;

  engine.pushClip(playfield.x, playfield.y, playfield.w, playfield.h);
  engine.setCamera(-shakeX, -shakeY);
  drawCities(shell, engine, round);
  drawBatteries(shell, engine, round);
  drawTrails(shell, engine, round);
  drawExplosions(engine, round);
  drawEmbers(engine, round);
  engine.setCamera(0, 0);
  drawCursor(shell, engine, input, round);
  engine.popClip();

  drawHud(shell, engine, round);
  drawBatteryBar(shell, engine, round);
  if (round.messageTimer > 0) {
    drawBanner(shell, engine, round.message, round.messageTimer, round.campaign.bonusFlash > 0 ? palette.apricot : palette.frost);
  }
  if (round.roundBanner > 0) {
    drawBanner(shell, engine, `ROUND ${round.campaign.round}`, round.roundBanner, palette.aqua);
  }
  if (shell.paused) {
    drawPausedOverlay(shell, engine);
  }
}

export function renderBallistics(shell, { engine, input }) {
  engine.beginFrame();
  engine.clear(shell.config.palette.midnight);
  drawBackdrop(shell, engine);

  if (shell.scene === 'title') {
    drawTitle(shell, engine);
  } else if (shell.scene === 'instructions') {
    drawInstructions(shell, engine);
  } else if (shell.scene === 'summary') {
    drawSummary(shell, engine);
  } else if (shell.scene === 'gameOver') {
    drawGameOver(shell, engine);
  } else if (shell.scene === 'gameplay') {
    drawGameplay(shell, engine, input);
  }

  engine.endFrame();
}
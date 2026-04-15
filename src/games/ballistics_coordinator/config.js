const baseResolution = { width: 480, height: 270 };
const screen = { width: 640, height: 360 };
const screenScaleX = screen.width / baseResolution.width;
const screenScaleY = screen.height / baseResolution.height;
const screenScale = Math.min(screenScaleX, screenScaleY);
const baseMissiles = [10, 12, 10];
const batteryMissileLayouts = {
  10: [4, 3, 2, 1],
  12: [5, 4, 3],
};
const highScoreKey = 'ballisticsCoordinatorHighScore';

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

function sx(value) {
  return Math.round(value * screenScaleX);
}

function sy(value) {
  return Math.round(value * screenScaleY);
}

function ss(value) {
  return Math.max(1, Math.round(value * screenScale));
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
    x: Math.round(screen.width * 0.5 - scaledWidth * 0.5),
    y: sy(y),
    w: scaledWidth,
    h: scaledHeight,
  };
}

function createLayout() {
  const playfield = {
    x: sx(10),
    y: sy(10),
    w: screen.width - sx(20),
    h: screen.height - sy(20),
  };
  const centerX = Math.round(screen.width * 0.5);

  return {
    centerX,
    playfield,
    horizonY: sy(204),
    groundY: sy(222),
    starCount: Math.round(64 * screenScaleX * screenScaleY),
    cityXs: [42, 96, 152, 328, 384, 438].map((value) => sx(value)),
    batteryXs: [78, 240, 402].map((value) => sx(value)),
    backdropBandHeight: ss(8),
    gameplay: {
      cursorPaddingX: ss(8),
      cursorPaddingTop: ss(10),
      cursorPaddingBottom: ss(20),
      spawnPaddingX: ss(12),
      spawnY: playfield.y + ss(4),
      cityTargetOffsetY: ss(8),
    },
    hud: {
      top: playfield.y + 1,
      bottom: sy(23),
      textY: sy(13),
      columns: distributeSpan(playfield.x + ss(34), playfield.x + playfield.w - ss(34), 6),
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

function createTuning() {
  return {
    cursorSpeed: 0.24 * screenScale,
    enemySpeedScale: screenScale,
    playerSideSpeed: 0.17 * screenScale,
    playerCenterSpeed: 0.22 * screenScale,
    explosionScale: screenScale,
    explosionGrowthRate: 0.08 * screenScale,
    explosionDecayRate: 0.05 * screenScale,
    emberSpeedMin: 0.03 * screenScale,
    emberSpeedMax: 0.12 * screenScale,
    emberLift: 0.03 * screenScale,
    emberGravity: 0.00008 * screenScale,
    mirvChildSpread: 18 * screenScale,
    impactRadiusSq: 18 * screenScale * screenScale,
  };
}

const layout = createLayout();
const tuning = createTuning();

export const ballisticsConfig = {
  slug: 'ballistics_coordinator',
  title: 'Ballistics Coordinator',
  description: 'Defend six cities against cascading missile waves with auto-targeting launch batteries.',
  screen,
  displayScale: {
    windowed: 2,
    fullscreen: 3,
  },
  input: {
    cursorX: screen.width * 0.5,
    cursorY: screen.height * 0.45,
    cursorSpeed: tuning.cursorSpeed,
  },
  assetManifest: {
    palette: {
      url: 'DATAURL:src/img/palette.png',
    },
    font: {
      url: 'DATAURL:src/img/font-atlas.png',
      charWidth: 5,
      charHeight: 10,
    },
    spriteAtlases: {
      main: {
        url: 'DATAURL:src/img/sprites-main.png',
        spriteWidth: 8,
        spriteHeight: 8,
        sheetWidth: 64,
      },
    },
    defaultSpriteAtlas: 'main',
  },
  baseMissiles,
  batteryMissileLayouts,
  highScoreKey,
  palette,
  layout,
  tuning,
  playfield: layout.playfield,
  horizonY: layout.horizonY,
  groundY: layout.groundY,
  cityXs: layout.cityXs,
  batteryXs: layout.batteryXs,
  screenScale,
  scaleHelpers: {
    x: sx,
    y: sy,
    size: ss,
  },
};
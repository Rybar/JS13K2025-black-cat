import ImmediateModeEngine from './core/ImmediateModeEngine.js';
import { resizeCanvas } from './core/utils.js';

(function () {
  const screenWidth = 480;
  const screenHeight = 270;
  const footerHeight = 42;
  const worldWidth = 640;
  const worldHeight = 330;
  const worldViewHeight = screenHeight - footerHeight;
  const atlasURL = 'DATAURL:src/img/palette.webp';
  const twoPi = Math.PI * 2;
  const glyphPool = ['G', 'P', 'U', 'F', 'X', 'R', '2'];
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
  const colorSchemes = [
    {
      name: 'night sparks',
      primary: [palette.aqua, palette.seafoam, palette.frost],
      secondary: [palette.mineral, palette.aqua, palette.mist],
      accent: [palette.chartreuse, palette.sand],
      emitter: palette.aqua,
    },
    {
      name: 'ember rails',
      primary: [palette.coral, palette.brick, palette.amber],
      secondary: [palette.toasted, palette.rust, palette.garnet],
      accent: [palette.apricot, palette.sand],
      emitter: palette.coral,
    },
    {
      name: 'marsh blocks',
      primary: [palette.moss, palette.lime, palette.pear, palette.sage],
      secondary: [palette.bog, palette.moss, palette.fern],
      accent: [palette.chartreuse, palette.lichen],
      emitter: palette.pear,
    },
    {
      name: 'sage dithers',
      primary: [palette.sage, palette.fern, palette.duskSage],
      secondary: [palette.slateTeal, palette.mineral, palette.lichen],
      accent: [palette.seafoam, palette.mist],
      emitter: palette.sage,
    },
    {
      name: 'velvet frames',
      primary: [palette.lilac, palette.amethyst, palette.plum],
      secondary: [palette.indigoPlum, palette.blackberry, palette.mulberry],
      accent: [palette.apricot, palette.frost],
      emitter: palette.amethyst,
    },
    {
      name: 'sunset shards',
      primary: [palette.sand, palette.amber, palette.apricot],
      secondary: [palette.toasted, palette.coral, palette.salmon],
      accent: [palette.frost, palette.chartreuse],
      emitter: palette.amber,
    },
    {
      name: 'berry triangles',
      primary: [palette.mulberry, palette.cranberry, palette.raspberry],
      secondary: [palette.salmon, palette.apricot, palette.garnet],
      accent: [palette.sand, palette.amethyst],
      emitter: palette.raspberry,
    },
    {
      name: 'earth polys',
      primary: [palette.walnut, palette.clay, palette.terracotta, palette.straw],
      secondary: [palette.bark, palette.mushroom, palette.coffee],
      accent: [palette.sand, palette.apricot],
      emitter: palette.clay,
    },
    {
      name: 'storm sigils',
      primary: [palette.storm, palette.mineral, palette.periwinkle, palette.lilac],
      secondary: [palette.gunmetal, palette.ink, palette.amethyst],
      accent: [palette.aqua, palette.frost],
      emitter: palette.mineral,
    },
    {
      name: 'sea glass',
      primary: [palette.aqua, palette.seafoam, palette.frost],
      secondary: [palette.mineral, palette.mist, palette.cloud],
      accent: [palette.chartreuse, palette.sand],
      emitter: palette.seafoam,
    },
    {
      name: 'reed lights',
      primary: [palette.pear, palette.lichen, palette.seafoam],
      secondary: [palette.sage, palette.duskSage, palette.aqua],
      accent: [palette.chartreuse, palette.frost],
      emitter: palette.lichen,
    },
    {
      name: 'ember ellipses',
      primary: [palette.coral, palette.brick, palette.garnet],
      secondary: [palette.rust, palette.mahogany, palette.coffee],
      accent: [palette.apricot, palette.sand],
      emitter: palette.brick,
    },
    {
      name: 'smoke plumes',
      primary: [palette.mauveTaupe, palette.aubergine, palette.smokyPlum],
      secondary: [palette.midnightPlum, palette.blackberry, palette.bark],
      accent: [palette.lilac, palette.apricot],
      emitter: palette.mauveTaupe,
    },
    {
      name: 'sprite remaps',
      primary: [palette.amber, palette.seafoam, palette.apricot],
      secondary: [palette.brick, palette.mineral, palette.lilac],
      accent: [palette.frost, palette.chartreuse, palette.sand],
      emitter: palette.apricot,
    },
    {
      name: 'glyph ghosts',
      primary: [palette.frost, palette.mist, palette.lilac],
      secondary: [palette.seafoam, palette.apricot, palette.aqua],
      accent: [palette.chartreuse, palette.amber],
      emitter: palette.frost,
    },
  ];

  const particleKinds = [
    { name: 'pixel', count: 480, lifeMin: 800, lifeMax: 1800, speedMin: 0.03, speedMax: 0.09, sizeMin: 1, sizeMax: 1.2, spinMax: 0.002, gravity: 0.000025, turbulence: 0.00002 },
    { name: 'line', count: 280, lifeMin: 900, lifeMax: 2200, speedMin: 0.04, speedMax: 0.11, sizeMin: 2, sizeMax: 6, spinMax: 0.003, gravity: 0.00004, turbulence: 0.00003, thicknessMin: 1, thicknessMax: 2.4 },
    { name: 'rect', count: 220, lifeMin: 1000, lifeMax: 2200, speedMin: 0.03, speedMax: 0.09, sizeMin: 2, sizeMax: 6, spinMax: 0.003, gravity: 0.00005, turbulence: 0.000025 },
    { name: 'rectDither', count: 220, lifeMin: 1000, lifeMax: 2200, speedMin: 0.03, speedMax: 0.09, sizeMin: 3, sizeMax: 7, spinMax: 0.003, gravity: 0.00005, turbulence: 0.00003 },
    { name: 'frame', count: 160, lifeMin: 1000, lifeMax: 2400, speedMin: 0.04, speedMax: 0.1, sizeMin: 3, sizeMax: 8, spinMax: 0.003, gravity: 0.00005, turbulence: 0.000035, thicknessMin: 1, thicknessMax: 2.4 },
    { name: 'tri', count: 180, lifeMin: 900, lifeMax: 2000, speedMin: 0.04, speedMax: 0.11, sizeMin: 3, sizeMax: 8, spinMax: 0.0035, gravity: 0.000045, turbulence: 0.00003 },
    { name: 'triDither', count: 180, lifeMin: 900, lifeMax: 2100, speedMin: 0.04, speedMax: 0.11, sizeMin: 3, sizeMax: 8, spinMax: 0.0035, gravity: 0.000045, turbulence: 0.00003 },
    { name: 'polygon', count: 160, lifeMin: 1200, lifeMax: 2400, speedMin: 0.03, speedMax: 0.09, sizeMin: 4, sizeMax: 9, spinMax: 0.003, gravity: 0.00005, turbulence: 0.00003, sidesMin: 4, sidesMax: 6 },
    { name: 'regular', count: 160, lifeMin: 1200, lifeMax: 2400, speedMin: 0.03, speedMax: 0.09, sizeMin: 4, sizeMax: 10, spinMax: 0.0035, gravity: 0.00005, turbulence: 0.00003, sidesMin: 3, sidesMax: 8 },
    { name: 'circle', count: 220, lifeMin: 900, lifeMax: 2200, speedMin: 0.03, speedMax: 0.09, sizeMin: 2, sizeMax: 7, spinMax: 0.0025, gravity: 0.000055, turbulence: 0.000025 },
    { name: 'circleDither', count: 220, lifeMin: 900, lifeMax: 2200, speedMin: 0.03, speedMax: 0.09, sizeMin: 3, sizeMax: 8, spinMax: 0.0025, gravity: 0.000055, turbulence: 0.00003 },
    { name: 'ellipse', count: 200, lifeMin: 1000, lifeMax: 2300, speedMin: 0.03, speedMax: 0.085, sizeMin: 3, sizeMax: 8, spinMax: 0.004, gravity: 0.00005, turbulence: 0.000025 },
    { name: 'ellipseDither', count: 200, lifeMin: 1000, lifeMax: 2300, speedMin: 0.03, speedMax: 0.085, sizeMin: 3, sizeMax: 9, spinMax: 0.004, gravity: 0.00005, turbulence: 0.00003 },
    { name: 'sprite', count: 120, lifeMin: 1200, lifeMax: 2800, speedMin: 0.025, speedMax: 0.07, sizeMin: 1, sizeMax: 2.5, spinMax: 0.0025, gravity: 0.000045, turbulence: 0.00002 },
    { name: 'glyph', count: 120, lifeMin: 1200, lifeMax: 2600, speedMin: 0.025, speedMax: 0.07, sizeMin: 1, sizeMax: 2.5, spinMax: 0.0025, gravity: 0.000045, turbulence: 0.00002 },
  ];

  const totalParticles = particleKinds.reduce((sum, kind) => sum + kind.count, 0);

  let engine;
  let lastFrameTime = performance.now();
  let paused = false;
  let fps = 60;
  let fpsDisplay = 'FPS 60';
  let fpsAccumulator = 0;
  let fpsFrames = 0;
  let particleSerial = 0;

  const demo = {
    elapsed: 0,
    particles: [],
    emitters: [],
    glyphRects: new Map(),
    camera: { x: 0, y: 0 },
  };

  function boot() {
    const atlasImage = new Image();
    atlasImage.src = atlasURL;
    atlasImage.onload = () => {
      engine = new ImmediateModeEngine(screenWidth, screenHeight, atlasImage);
      cacheGlyphs();
      initEmitters();
      initParticles();

      const mount = document.getElementById('game');
      mount.appendChild(engine.canvas);
      resizeCanvas(engine.canvas, screenWidth, screenHeight);
      bindEvents();
      requestAnimationFrame(loop);
    };
  }

  function bindEvents() {
    globalThis.addEventListener('blur', () => {
      paused = true;
    });
    globalThis.addEventListener('focus', () => {
      paused = false;
    });
    globalThis.addEventListener('resize', () => {
      resizeCanvas(engine.canvas, screenWidth, screenHeight);
    });
  }

  function cacheGlyphs() {
    for (const ch of glyphPool) {
      demo.glyphRects.set(ch, engine.getGlyphRect(ch));
    }
  }

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function randomFrom(values) {
    return values[Math.floor(Math.random() * values.length)];
  }

  function randomSides(min, max) {
    return Math.max(3, Math.floor(randomRange(min, max + 1)));
  }

  function initEmitters() {
    const columns = 5;
    const colSpacing = (worldWidth - 120) / (columns - 1);

    demo.emitters = particleKinds.map((kind, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const scheme = colorSchemes[index % colorSchemes.length];
      return {
        x: 60 + column * colSpacing + (row % 2) * 14,
        y: worldViewHeight - 26 - row * 18,
        angle: -Math.PI * 0.5 + (column - 2) * 0.08,
        spread: 0.42 + row * 0.04,
        lift: 1 + row * 0.05,
        drift: (column - 2) * 0.003,
        color: scheme.emitter,
        scheme,
      };
    });
  }

  function initParticles() {
    particleSerial = 0;
    demo.particles = [];

    for (let kindIndex = 0; kindIndex < particleKinds.length; kindIndex++) {
      const kind = particleKinds[kindIndex];
      for (let index = 0; index < kind.count; index++) {
        const particle = { id: particleSerial++, kindIndex };
        respawnParticle(particle, Math.random());
        demo.particles.push(particle);
      }
    }
  }

  function respawnParticle(particle, ageFraction = 0) {
    const kind = particleKinds[particle.kindIndex];
    const emitter = demo.emitters[particle.kindIndex];
    const scheme = emitter.scheme;
    const angle = emitter.angle + randomRange(-emitter.spread, emitter.spread);
    const speed = randomRange(kind.speedMin, kind.speedMax) * emitter.lift;
    const life = randomRange(kind.lifeMin, kind.lifeMax);
    const warmAge = life * ageFraction;

    particle.kind = kind.name;
    particle.x = emitter.x + randomRange(-6, 6);
    particle.y = emitter.y + randomRange(-2, 2);
    particle.vx = Math.cos(angle) * speed + emitter.drift;
    particle.vy = Math.sin(angle) * speed;
    particle.gravity = kind.gravity;
    particle.turbulence = kind.turbulence;
    particle.drag = 0.00008 + ((particle.id % 7) * 0.00001);
    particle.age = 0;
    particle.life = life;
    particle.size = randomRange(kind.sizeMin, kind.sizeMax);
    particle.rotation = Math.random() * twoPi;
    particle.spin = randomRange(-kind.spinMax, kind.spinMax);
    particle.colorA = randomFrom(scheme.primary);
    particle.colorB = randomFrom(scheme.secondary);
    particle.colorC = randomFrom(scheme.accent);
    particle.thickness = randomRange(kind.thicknessMin ?? 1, kind.thicknessMax ?? 1.8);
    particle.sides = randomSides(kind.sidesMin ?? 3, kind.sidesMax ?? 6);
    particle.seed = Math.random() * 1000;
    particle.spriteIndex = particle.id % 6;
    particle.glyph = glyphPool[particle.id % glyphPool.length];
    particle.scale = randomRange(0.8, 1.8);

    if (warmAge > 0) {
      particle.age = warmAge;
      particle.x += particle.vx * warmAge + Math.sin(particle.seed + warmAge * 0.005) * 12;
      particle.y += particle.vy * warmAge + 0.5 * particle.gravity * warmAge * warmAge;
      particle.vy += particle.gravity * warmAge;
      particle.rotation += particle.spin * warmAge;
    }
  }

  function update(dt) {
    demo.elapsed += dt;
    fpsAccumulator += dt;
    fpsFrames += 1;
    if (fpsAccumulator >= 250) {
      fps = (fpsFrames * 1000) / fpsAccumulator;
      fpsDisplay = `FPS ${Math.round(fps)}`;
      fpsAccumulator = 0;
      fpsFrames = 0;
    }

    demo.camera.x = Math.sin(demo.elapsed * 0.00023) * 54;
    demo.camera.y = Math.cos(demo.elapsed * 0.00017) * 18;

    for (const particle of demo.particles) {
      advanceParticle(particle, dt);
    }
  }

  function advanceParticle(particle, dt) {
    particle.age += dt;
    if (particle.age >= particle.life) {
      respawnParticle(particle, 0);
      return;
    }

    const flutter = Math.sin(demo.elapsed * 0.002 + particle.seed + particle.y * 0.015) * particle.turbulence;
    particle.vx += flutter * dt;
    particle.vy += particle.gravity * dt;

    const damping = Math.max(0.9, 1 - particle.drag * dt);
    particle.vx *= damping;
    particle.vy *= damping;

    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.rotation += particle.spin * dt;

    if (particle.x < -80 || particle.x > worldWidth + 80 || particle.y < -80 || particle.y > worldHeight + 80) {
      respawnParticle(particle, 0);
    }
  }

  function buildPolygonPoints(x, y, radius, sides, rotation, seed) {
    const points = [];
    for (let index = 0; index < sides; index++) {
      const angle = rotation + (index / sides) * twoPi;
      const wobble = 0.78 + 0.2 * Math.sin(seed + index * 1.31);
      points.push({
        x: x + Math.cos(angle) * radius * wobble,
        y: y + Math.sin(angle) * radius * wobble,
      });
    }
    return points;
  }

  function getParticleScale(particle) {
    const lifeT = particle.age / particle.life;
    return Math.max(0.25, 1 - lifeT * 0.8);
  }

  function getParticleMix(particle) {
    const pulse = Math.sin(demo.elapsed * 0.004 + particle.seed) * 0.5 + 0.5;
    return 0.2 + pulse * 0.7;
  }

  function drawBackground() {
    const topColor = palette.blackberry;
    const midColor = palette.ocean;
    const lowColor = palette.slateTeal;
    const horizonColor = palette.mist;
    const glowMix = (Math.sin(demo.elapsed * 0.00035) + 1) * 0.5;

    engine.rectFill(-120, -80, worldWidth + 120, worldViewHeight + 60, topColor, {
      dither: { colorB: palette.midnight, mix: 0.34 },
    });

    for (let y = -80; y < worldViewHeight + 40; y += 18) {
      const t = (y + 80) / (worldViewHeight + 120);
      let colorA = topColor;
      let colorB = midColor;
      let mix = Math.min(1, t * 1.35);

      if (t > 0.58) {
        colorA = midColor;
        colorB = lowColor;
        mix = Math.min(1, (t - 0.58) / 0.42);
      }

      engine.rectFill(-120, y, worldWidth + 120, y + 17, colorA, {
        dither: { colorB, mix },
      });
    }

    engine.rectFill(-120, -80, worldWidth + 120, 44, palette.midnight, {
      dither: { colorB: palette.blackberry, mix: 0.24 + glowMix * 0.08 },
    });

    engine.rectFill(-120, worldViewHeight - 58, worldWidth + 120, worldViewHeight + 10, palette.coffee, {
      dither: { colorB: palette.midnightPlum, mix: 0.62 },
    });

    engine.rectFill(-120, worldViewHeight - 92, worldWidth + 120, worldViewHeight - 52, palette.sand, {
      dither: { colorB: horizonColor, mix: 0.28 + glowMix * 0.16 },
    });

    for (let y = 12; y < worldViewHeight; y += 36) {
      engine.rectFill(-120, y, worldWidth + 120, y + 1, palette.gunmetal, {
        dither: { colorB: palette.periwinkle, mix: 0.14 },
      });
    }
  }

  function drawEmitters() {
    for (const emitter of demo.emitters) {
      engine.rectFill(emitter.x - 8, emitter.y + 6, emitter.x + 8, emitter.y + 10, palette.mushroom, {
        dither: { colorB: palette.straw, mix: 0.22 },
      });
      engine.rect(emitter.x - 10, emitter.y + 4, emitter.x + 10, emitter.y + 12, palette.coffee);
      engine.circleFill(emitter.x, emitter.y + 3, 4, emitter.color, {
        dither: { colorB: palette.frost, mix: 0.28 },
      });
    }
  }

  function drawParticle(particle) {
    const x = particle.x;
    const y = particle.y;
    const scale = getParticleScale(particle);
    const mix = getParticleMix(particle);
    const size = Math.max(1, particle.size * scale);

    switch (particle.kind) {
      case 'pixel': {
        engine.pset(Math.round(x), Math.round(y), particle.colorA);
        engine.pset(Math.round(x + 1), Math.round(y), particle.colorB);
        break;
      }

      case 'line': {
        const dx = Math.cos(particle.rotation) * size * 1.4;
        const dy = Math.sin(particle.rotation) * size * 1.4;
        engine.line(x - dx, y - dy, x + dx, y + dy, particle.colorA, particle.thickness * scale);
        break;
      }

      case 'rect': {
        engine.rectFill(x - size, y - size, x + size, y + size, particle.colorA);
        break;
      }

      case 'rectDither': {
        engine.rectFill(x - size, y - size, x + size, y + size, particle.colorA, {
          dither: { colorB: particle.colorB, mix },
        });
        break;
      }

      case 'frame': {
        engine.rect(x - size, y - size, x + size, y + size, particle.colorA, particle.thickness * scale);
        break;
      }

      case 'tri':
      case 'triDither': {
        const p0 = { x: x + Math.cos(particle.rotation) * size * 1.4, y: y + Math.sin(particle.rotation) * size * 1.4 };
        const p1 = { x: x + Math.cos(particle.rotation + twoPi / 3) * size * 1.2, y: y + Math.sin(particle.rotation + twoPi / 3) * size * 1.2 };
        const p2 = { x: x + Math.cos(particle.rotation + (twoPi * 2) / 3) * size * 1.2, y: y + Math.sin(particle.rotation + (twoPi * 2) / 3) * size * 1.2 };
        engine.triFill(p0, p1, p2, particle.colorA, particle.kind === 'triDither' ? {
          dither: { colorB: particle.colorB, mix },
        } : null);
        break;
      }

      case 'polygon': {
        engine.polygonFill(buildPolygonPoints(x, y, size * 1.5, particle.sides, particle.rotation, particle.seed), particle.colorA);
        break;
      }

      case 'regular': {
        engine.regularPolygonFill(x, y, size * 1.5, particle.sides, particle.rotation, particle.colorA, {
          dither: { colorB: particle.colorB, mix: 1 - mix },
        });
        break;
      }

      case 'circle': {
        engine.circleFill(x, y, size * 1.1, particle.colorA);
        break;
      }

      case 'circleDither': {
        engine.circleFill(x, y, size * 1.2, particle.colorA, {
          dither: { colorB: particle.colorB, mix },
        });
        break;
      }

      case 'ellipse': {
        engine.ellipseFill(x, y, size * 1.5, size * 0.8, particle.colorA, {
          rotation: particle.rotation,
        });
        break;
      }

      case 'ellipseDither': {
        engine.ellipseFill(x, y, size * 1.6, size * 0.85, particle.colorA, {
          rotation: particle.rotation,
          dither: { colorB: particle.colorB, mix },
        });
        break;
      }

      case 'sprite': {
        engine.drawAtlasSprite(particle.spriteIndex, x, y, {
          scale: particle.scale * scale,
          originX: 0.5,
          originY: 0.5,
          flipX: particle.vx < 0,
          remap: [
            { from: 1, to: particle.colorA },
            { from: 2, to: particle.colorB },
            { from: 3, to: particle.colorC },
          ],
        });
        break;
      }

      case 'glyph': {
        const glyph = demo.glyphRects.get(particle.glyph);
        if (!glyph) break;
        const glyphScale = particle.scale * scale;
        engine.drawSprite(glyph, {
          x: x - (glyph.w * glyphScale) * 0.5,
          y: y - (glyph.h * glyphScale) * 0.5,
          w: glyph.w * glyphScale,
          h: glyph.h * glyphScale,
        }, {
          replaceSource: 2,
          replaceTarget: particle.colorA,
          flipX: particle.vx < 0,
          flipY: particle.vy > 0,
          originX: 0,
          originY: 0,
        });
        break;
      }

      default:
        break;
    }
  }

  function drawParticles() {
    for (const particle of demo.particles) {
      drawParticle(particle);
    }
  }

  function drawHeader() {
    engine.rectFill(10, 10, 206, 36, palette.blackberry, {
      dither: { colorB: palette.plum, mix: 0.46 },
    });
    engine.rect(10, 10, 206, 36, palette.mist);
    engine.text('ALL PRIMITIVES AS PARTICLES', 18, 15, palette.frost);
    engine.text('EMITTER GRID + GPU BATCH LOAD', 18, 26, palette.aqua);
  }

  function drawHud() {
    const barY = screenHeight - footerHeight;

    engine.rectFill(0, barY, screenWidth - 1, screenHeight - 1, palette.midnightPlum, {
      dither: { colorB: palette.coffee, mix: 0.48 },
    });
    engine.rectFill(0, barY, screenWidth - 1, barY + 2, palette.sand);
    engine.rectFill(8, barY + 8, 150, barY + 30, palette.sage, {
      dither: { colorB: palette.mineral, mix: 0.42 },
    });
    engine.rect(8, barY + 8, 150, barY + 30, palette.frost);
    engine.text('PARTICLE STRESS RIG', 16, barY + 12, palette.frost);
    engine.text(fpsDisplay, 16, barY + 23, palette.blackberry);
    engine.text(`${totalParticles} LIVE`, 174, barY + 12, palette.aqua);
    engine.text('PIXEL LINE RECT DITHER FRAME TRI POLY CIRCLE ELLIPSE', 174, barY + 23, palette.mist);
    engine.text('SPRITE GLYPH + CAMERA DRIFT + CLIPPED WORLD VIEW', 174, barY + 32, palette.sand);
  }

  function draw() {
    engine.beginFrame();
    engine.clear(palette.midnight);

    engine.setCamera(demo.camera.x, demo.camera.y);
    engine.pushClip(0, 0, screenWidth, worldViewHeight);
    drawBackground();
    drawEmitters();
    drawParticles();
    engine.popClip();

    engine.setCamera(0, 0);
    drawHeader();
    drawHud();
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

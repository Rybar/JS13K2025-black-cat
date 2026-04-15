import Retrobuffer from '../core/Retrobuffer.js';
import InputManager from '../core/InputManager.js';
import { resizeCanvas } from '../core/utils.js';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });
}

async function loadGameAssets(assetManifest) {
  const spriteAtlasEntries = Object.entries(assetManifest.spriteAtlases ?? {});
  const images = await Promise.all([
    loadImage(assetManifest.palette.url),
    loadImage(assetManifest.font.url),
    ...spriteAtlasEntries.map(([, atlas]) => loadImage(atlas.url)),
  ]);

  const font = { ...assetManifest.font, image: images[1] };
  delete font.url;

  const spriteAtlases = {};
  for (let index = 0; index < spriteAtlasEntries.length; index++) {
    const [name, atlas] = spriteAtlasEntries[index];
    spriteAtlases[name] = {
      ...atlas,
      image: images[index + 2],
    };
    delete spriteAtlases[name].url;
  }

  return {
    paletteImage: images[0],
    font,
    spriteAtlases,
    defaultSpriteAtlas: assetManifest.defaultSpriteAtlas,
  };
}

export function createGamePlayer(displayShell) {
  let activeRun = null;

  async function stop() {
    if (!activeRun) return;

    cancelAnimationFrame(activeRun.frameHandle);
    globalThis.removeEventListener('blur', activeRun.handleBlur);
    displayShell.setFullscreenChangeHandler(null);
    activeRun.input.detach();
    activeRun.engine.canvas.remove();
    activeRun.definition.destroy?.(activeRun.session, activeRun.runtime);
    activeRun = null;
  }

  async function start(definition) {
    await stop();

    const assets = await loadGameAssets(definition.assets);
    const engine = new Retrobuffer(definition.screen.width, definition.screen.height, assets);
    const input = new InputManager({
      screenWidth: definition.screen.width,
      screenHeight: definition.screen.height,
      cursorX: definition.input?.cursorX ?? definition.screen.width * 0.5,
      cursorY: definition.input?.cursorY ?? definition.screen.height * 0.5,
      cursorSpeed: definition.input?.cursorSpeed,
    });

    displayShell.mount(engine.canvas);
    input.attach(engine.canvas);

    const runtime = {
      assets,
      displayShell,
      engine,
      game: definition,
      input,
      storage: globalThis.localStorage ?? null,
    };
    const session = definition.create(runtime);

    function syncDisplayMode(fullscreen) {
      const scale = fullscreen ? definition.displayScale.fullscreen : definition.displayScale.windowed;
      resizeCanvas(engine.canvas, definition.screen.width, definition.screen.height, scale);
    }

    function handleBlur() {
      definition.onBlur?.(session, runtime);
    }

    let lastFrameTime = performance.now();
    const runState = {
      definition,
      engine,
      frameHandle: 0,
      handleBlur,
      input,
      runtime,
      session,
    };

    function loop(timestamp) {
      const dt = Math.min(33, timestamp - lastFrameTime);
      lastFrameTime = timestamp;
      definition.update(session, dt, runtime);
      definition.render(session, runtime);
      runState.frameHandle = requestAnimationFrame(loop);
    }

    activeRun = runState;
    document.title = definition.title;
    displayShell.setFullscreenChangeHandler(syncDisplayMode);
    globalThis.addEventListener('blur', handleBlur);
    syncDisplayMode(displayShell.isFullscreen());
    runState.frameHandle = requestAnimationFrame(loop);
    return session;
  }

  return {
    start,
    stop,
  };
}
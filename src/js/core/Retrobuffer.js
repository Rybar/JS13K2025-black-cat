import ImmediateModeRenderer from './immediate/ImmediateModeRenderer.js';

export default class Retrobuffer {
  constructor(width, height, assets) {
    const font = assets.font ?? {};
    const spriteAtlasEntries = Object.entries(assets.spriteAtlases ?? {});
    if (!assets.paletteImage) {
      throw new Error('Retrobuffer requires a paletteImage.');
    }
    if (!font.image) {
      throw new Error('Retrobuffer requires a font atlas image.');
    }
    if (spriteAtlasEntries.length === 0) {
      throw new Error('Retrobuffer requires at least one sprite atlas.');
    }

    this.fontAtlasName = font.atlasName ?? 'font';
    this.spriteAtlases = new Map();
    const rendererAtlases = {
      [this.fontAtlasName]: font.image,
    };

    for (const [name, config] of spriteAtlasEntries) {
      const image = config?.image ?? config;
      if (!image) {
        throw new Error(`Sprite atlas "${name}" is missing an image.`);
      }

      this.spriteAtlases.set(name, {
        name,
        image,
        sheetX: config?.sheetX ?? 0,
        sheetY: config?.sheetY ?? 0,
        sheetWidth: config?.sheetWidth ?? image.width,
        spriteWidth: config?.spriteWidth ?? 8,
        spriteHeight: config?.spriteHeight ?? 8,
      });
      rendererAtlases[name] = image;
    }

    this.defaultSpriteAtlas = assets.defaultSpriteAtlas ?? spriteAtlasEntries[0][0];
    if (!this.spriteAtlases.has(this.defaultSpriteAtlas)) {
      throw new Error(`Unknown default sprite atlas "${this.defaultSpriteAtlas}".`);
    }

    this.renderer = new ImmediateModeRenderer(width, height, {
      paletteImage: assets.paletteImage,
      atlases: rendererAtlases,
      defaultAtlas: this.defaultSpriteAtlas,
    });
    this.width = width;
    this.height = height;
    this.canvas = this.renderer.canvas;
    this.paletteCount = this.renderer.paletteCount;
    this.glyphColorIndex = font.glyphColorIndex ?? 2;
    this.charWidth = font.charWidth ?? 5;
    this.charHeight = font.charHeight ?? 10;
    this.fontSheetWidth = font.sheetWidth ?? font.image.width;
    this.indexString = font.indexString ?? "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890`~!@#$%^&*-=_+\\|;:'\",./?()[]{}<>";
    this.charToIndex = new Map();
    this.glyphRects = new Array(this.indexString.length);
    this.charsPerRow = Math.max(1, Math.floor(this.fontSheetWidth / this.charWidth));
    this.camera = { x: 0, y: 0 };
    this.clipStack = [];

    for (let index = 0; index < this.indexString.length; index++) {
      this.charToIndex.set(this.indexString[index], index);
      const col = index % this.charsPerRow;
      const row = Math.floor(index / this.charsPerRow);
      this.glyphRects[index] = {
        atlas: this.fontAtlasName,
        x: col * this.charWidth,
        y: row * this.charHeight,
        w: this.charWidth,
        h: this.charHeight,
      };
    }
  }

  beginFrame() {
    this.camera.x = 0;
    this.camera.y = 0;
    this.clipStack.length = 0;
    this.renderer.beginFrame();
  }

  clear(colorIndex = 0) {
    this.renderer.clear(colorIndex);
  }

  setCamera(x = 0, y = 0) {
    this.camera.x = x;
    this.camera.y = y;
  }

  transformX(x) {
    return x - this.camera.x;
  }

  transformY(y) {
    return y - this.camera.y;
  }

  intersectRects(a, b) {
    const left = Math.max(a.x, b.x);
    const top = Math.max(a.y, b.y);
    const right = Math.min(a.x + a.w, b.x + b.w);
    const bottom = Math.min(a.y + a.h, b.y + b.h);
    return {
      x: left,
      y: top,
      w: Math.max(0, right - left),
      h: Math.max(0, bottom - top),
    };
  }

  pushClip(x, y, w, h) {
    const rect = {
      x: this.transformX(x),
      y: this.transformY(y),
      w,
      h,
    };
    const parent = this.clipStack[this.clipStack.length - 1];
    const next = parent ? this.intersectRects(parent, rect) : rect;
    this.clipStack.push(next);
    this.renderer.clipRect(next);
  }

  popClip() {
    if (this.clipStack.length === 0) return;
    this.clipStack.pop();
    this.renderer.clipRect(this.clipStack[this.clipStack.length - 1] ?? null);
  }

  pset(x, y, colorIndex) {
    this.renderer.pset(Math.round(this.transformX(x)), Math.round(this.transformY(y)), colorIndex);
  }

  rectFill(x0, y0, x1, y1, colorIndex, options = null) {
    this.renderer.rectFill(
      Math.round(this.transformX(x0)),
      Math.round(this.transformY(y0)),
      Math.round(this.transformX(x1)),
      Math.round(this.transformY(y1)),
      colorIndex,
      options?.dither ?? null,
    );
  }

  rect(x0, y0, x1, y1, colorIndex, thickness = 1) {
    this.renderer.rect(
      this.transformX(x0),
      this.transformY(y0),
      this.transformX(x1),
      this.transformY(y1),
      colorIndex,
      thickness,
    );
  }

  line(x0, y0, x1, y1, colorIndex, thickness = 1) {
    this.renderer.line(
      this.transformX(x0),
      this.transformY(y0),
      this.transformX(x1),
      this.transformY(y1),
      colorIndex,
      thickness,
    );
  }

  triFill(p0, p1, p2, colorIndex, options = null) {
    this.renderer.triFill(
      p0,
      p1,
      p2,
      colorIndex,
      options?.dither ?? null,
      -this.camera.x,
      -this.camera.y,
    );
  }

  polygonFill(points, colorIndex, options = null) {
    if (!points || points.length < 3) return;

    this.renderer.polygonFill(
      points,
      colorIndex,
      options?.dither ?? null,
      -this.camera.x,
      -this.camera.y,
    );
  }

  regularPolygonFill(x, y, radius, sides, rotation = 0, colorIndex = 0, options = null) {
    this.renderer.regularPolygonFill(
      this.transformX(x),
      this.transformY(y),
      radius,
      sides,
      rotation,
      colorIndex,
      options?.dither ?? null,
    );
  }

  circleFill(x, y, radius, colorIndex, options = null) {
    this.renderer.ellipseFill(
      this.transformX(x),
      this.transformY(y),
      radius,
      radius,
      colorIndex,
      options,
    );
  }

  ellipseFill(x, y, radiusX, radiusY, colorIndex, options = null) {
    this.renderer.ellipseFill(
      this.transformX(x),
      this.transformY(y),
      radiusX,
      radiusY,
      colorIndex,
      options,
    );
  }

  drawSprite(sourceRect, destRect, options = {}) {
    this.renderer.drawSpriteRect(
      sourceRect,
      this.transformX(destRect.x),
      this.transformY(destRect.y),
      destRect.w,
      destRect.h,
      {
        ...options,
        atlas: options.atlas ?? sourceRect.atlas,
      },
    );
  }

  getGlyphRect(ch) {
    const glyphIndex = this.charToIndex.get(ch);
    if (glyphIndex === undefined) return null;
    return this.glyphRects[glyphIndex];
  }

  getSpriteAtlasConfig(atlasName = this.defaultSpriteAtlas) {
    const atlas = this.spriteAtlases.get(atlasName);
    if (!atlas) {
      throw new Error(`Unknown sprite atlas "${atlasName}".`);
    }
    return atlas;
  }

  getSpriteRect(index, options = {}) {
    const atlasName = options.atlas ?? this.defaultSpriteAtlas;
    const atlas = this.getSpriteAtlasConfig(atlasName);
    const sheetX = options.sheetX ?? atlas.sheetX;
    const sheetY = options.sheetY ?? atlas.sheetY;
    const spriteWidth = options.spriteWidth ?? atlas.spriteWidth;
    const spriteHeight = options.spriteHeight ?? atlas.spriteHeight;
    const sheetWidth = options.sheetWidth ?? atlas.sheetWidth;
    const spritesPerRow = Math.max(1, Math.floor(sheetWidth / spriteWidth));
    const col = index % spritesPerRow;
    const row = Math.floor(index / spritesPerRow);

    return {
      atlas: atlasName,
      x: sheetX + col * spriteWidth,
      y: sheetY + row * spriteHeight,
      w: spriteWidth,
      h: spriteHeight,
    };
  }

  drawAtlasSprite(index, x, y, options = {}) {
    const sourceRect = this.getSpriteRect(index, options);
    const scale = options.scale ?? 1;
    this.drawSprite(sourceRect, {
      x,
      y,
      w: sourceRect.w * scale,
      h: sourceRect.h * scale,
    }, options);
  }

  textWidth(text = '') {
    let lineWidth = 0;
    let maxWidth = 0;

    for (const ch of String(text)) {
      if (ch === '\n') {
        maxWidth = Math.max(maxWidth, lineWidth);
        lineWidth = 0;
        continue;
      }

      lineWidth += this.charWidth;
    }

    return Math.max(maxWidth, lineWidth);
  }

  text(text, x, y, colorIndex = this.glyphColorIndex) {
    let cursorX = x;
    let cursorY = y;

    for (const ch of text) {
      if (ch === '\n') {
        cursorX = x;
        cursorY += this.charHeight;
        continue;
      }

      const glyphRect = this.getGlyphRect(ch);
      if (glyphRect) {
        this.drawSprite(glyphRect, { x: cursorX, y: cursorY, w: glyphRect.w, h: glyphRect.h }, {
          replaceSource: this.glyphColorIndex,
          replaceTarget: colorIndex,
        });
      }
      cursorX += this.charWidth;
    }
  }

  textCentered(text, centerX, y, colorIndex = this.glyphColorIndex) {
    let cursorY = y;

    for (const line of String(text).split('\n')) {
      const x = Math.round(centerX - this.textWidth(line) * 0.5);
      this.text(line, x, cursorY, colorIndex);
      cursorY += this.charHeight;
    }
  }

  endFrame() {
    this.renderer.endFrame();
  }
}
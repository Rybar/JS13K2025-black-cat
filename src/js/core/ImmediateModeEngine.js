import ImmediateModeRenderer from './immediate/ImmediateModeRenderer.js';

export default class ImmediateModeEngine {
  constructor(width, height, paletteImage) {
    this.renderer = new ImmediateModeRenderer(width, height, paletteImage);
    this.width = width;
    this.height = height;
    this.canvas = this.renderer.canvas;
    this.paletteCount = this.renderer.paletteCount;
    this.glyphColorIndex = 2;
    this.charWidth = 5;
    this.charHeight = 10;
    this.fontSheetWidth = 65;
    this.indexString = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890`~!@#$%^&*-=_+\\|;:'\",./?()[]{}<>";
    this.charToIndex = new Map();
    this.glyphRects = new Array(this.indexString.length);
    this.charsPerRow = Math.floor(this.fontSheetWidth / this.charWidth);
    this.fontRows = Math.ceil(this.indexString.length / this.charsPerRow);
    this.defaultSpriteSheetY = this.fontRows * this.charHeight - 1;
    this.defaultSpriteSheetWidth = 64;
    this.camera = { x: 0, y: 0 };
    this.clipStack = [];

    for (let index = 0; index < this.indexString.length; index++) {
      this.charToIndex.set(this.indexString[index], index);
      const col = index % this.charsPerRow;
      const row = Math.floor(index / this.charsPerRow);
      this.glyphRects[index] = {
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
      options,
    );
  }

  getGlyphRect(ch) {
    const glyphIndex = this.charToIndex.get(ch);
    if (glyphIndex === undefined) return null;
    return this.glyphRects[glyphIndex];
  }

  getSpriteRect(index, options = {}) {
    const sheetX = options.sheetX ?? 0;
    const sheetY = options.sheetY ?? this.defaultSpriteSheetY;
    const spriteWidth = options.spriteWidth ?? 8;
    const spriteHeight = options.spriteHeight ?? 8;
    const sheetWidth = options.sheetWidth ?? this.defaultSpriteSheetWidth;
    const spritesPerRow = Math.max(1, Math.floor(sheetWidth / spriteWidth));
    const col = index % spritesPerRow;
    const row = Math.floor(index / spritesPerRow);

    return {
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

  endFrame() {
    this.renderer.endFrame();
  }
}

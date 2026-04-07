import { parseIndexedImage, parsePaletteImage } from './atlas.js';
import { createProgram } from './gl.js';
import {
  ELLIPSE_FRAGMENT_SHADER_SOURCE,
  ELLIPSE_VERTEX_SHADER_SOURCE,
  SHAPE_FRAGMENT_SHADER_SOURCE,
  SHAPE_VERTEX_SHADER_SOURCE,
  SPRITE_FRAGMENT_SHADER_SOURCE,
  SPRITE_VERTEX_SHADER_SOURCE,
} from './shaders.js';

export default class ImmediateModeRenderer {
  constructor(width, height, assets) {
    const palette = parsePaletteImage(assets.paletteImage);
    const atlasEntries = Object.entries(assets.atlases ?? {});
    if (atlasEntries.length === 0) {
      throw new Error('ImmediateModeRenderer requires at least one atlas image.');
    }

    this.width = width;
    this.height = height;
    this.paletteRGBA = palette.paletteRGBA;
    this.paletteCount = palette.paletteCount;
    this.atlases = new Map();
    this.defaultAtlasName = assets.defaultAtlas ?? atlasEntries[0][0];

    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;

    const gl = this.canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });

    if (!gl) {
      throw new Error('WebGL is required for the immediate-mode renderer.');
    }

    this.gl = gl;
    this.vaoExt = gl.getExtension('OES_vertex_array_object');
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

    this.shapeProgram = createProgram(gl, SHAPE_VERTEX_SHADER_SOURCE, SHAPE_FRAGMENT_SHADER_SOURCE);
    this.ellipseProgram = createProgram(gl, ELLIPSE_VERTEX_SHADER_SOURCE, ELLIPSE_FRAGMENT_SHADER_SOURCE);
    this.spriteProgram = createProgram(gl, SPRITE_VERTEX_SHADER_SOURCE, SPRITE_FRAGMENT_SHADER_SOURCE);

    this.shapeStride = 5;
    this.ellipseStride = 10;
    this.spriteStride = 12;
    this.maxShapeVertices = 32768;
    this.maxEllipseVertices = 16384;
    this.maxSpriteVertices = 32768;
    this.shapeVertices = new Float32Array(this.maxShapeVertices * this.shapeStride);
    this.ellipseVertices = new Float32Array(this.maxEllipseVertices * this.ellipseStride);
    this.spriteVertices = new Float32Array(this.maxSpriteVertices * this.spriteStride);
    this.shapeBufferByteSize = this.shapeVertices.byteLength;
    this.ellipseBufferByteSize = this.ellipseVertices.byteLength;
    this.spriteBufferByteSize = this.spriteVertices.byteLength;
    this.shapeVertexCount = 0;
    this.ellipseVertexCount = 0;
    this.spriteVertexCount = 0;
    this.ditherState = { colorA: 0, colorB: 0, mix: 0 };
    this.spriteRemapSource = new Float32Array(4);
    this.spriteRemapTarget = new Float32Array(4);
    this.activeBatch = null;
    this.clearIndex = 0;
    this.frameCleared = false;
    this.currentClipRect = null;
    this.appliedClipRect = null;
    this.activeProgram = null;
    this.activeArrayBuffer = null;
    this.activeTextureUnit = -1;
    this.boundTextures = [];
    this.activeVertexLayout = null;
    this.activeSpriteAtlasName = this.defaultAtlasName;

    this.shapeBuffer = gl.createBuffer();
    this.ellipseBuffer = gl.createBuffer();
    this.spriteBuffer = gl.createBuffer();
    this.paletteTexture = this.createPaletteTexture();

    for (const [name, image] of atlasEntries) {
      const atlas = parseIndexedImage(image, palette.colorToIndex);
      this.atlases.set(name, {
        name,
        width: atlas.atlasWidth,
        height: atlas.atlasHeight,
        texture: this.createAtlasTexture(atlas.atlasIndices, atlas.atlasWidth, atlas.atlasHeight),
      });
    }

    if (!this.atlases.has(this.defaultAtlasName)) {
      throw new Error(`Unknown default atlas "${this.defaultAtlasName}".`);
    }

    this.shapeLocations = {
      position: gl.getAttribLocation(this.shapeProgram, 'aPosition'),
      colorIndex: gl.getAttribLocation(this.shapeProgram, 'aColorIndex'),
      colorIndexB: gl.getAttribLocation(this.shapeProgram, 'aColorIndexB'),
      ditherMix: gl.getAttribLocation(this.shapeProgram, 'aDitherMix'),
      resolution: gl.getUniformLocation(this.shapeProgram, 'uResolution'),
      paletteTexture: gl.getUniformLocation(this.shapeProgram, 'uPaletteTexture'),
      paletteSize: gl.getUniformLocation(this.shapeProgram, 'uPaletteSize'),
    };

    this.ellipseLocations = {
      position: gl.getAttribLocation(this.ellipseProgram, 'aPosition'),
      localOffset: gl.getAttribLocation(this.ellipseProgram, 'aLocalOffset'),
      radius: gl.getAttribLocation(this.ellipseProgram, 'aRadius'),
      rotation: gl.getAttribLocation(this.ellipseProgram, 'aRotation'),
      colorIndex: gl.getAttribLocation(this.ellipseProgram, 'aColorIndex'),
      colorIndexB: gl.getAttribLocation(this.ellipseProgram, 'aColorIndexB'),
      ditherMix: gl.getAttribLocation(this.ellipseProgram, 'aDitherMix'),
      resolution: gl.getUniformLocation(this.ellipseProgram, 'uResolution'),
      paletteTexture: gl.getUniformLocation(this.ellipseProgram, 'uPaletteTexture'),
      paletteSize: gl.getUniformLocation(this.ellipseProgram, 'uPaletteSize'),
    };

    this.spriteLocations = {
      position: gl.getAttribLocation(this.spriteProgram, 'aPosition'),
      uv: gl.getAttribLocation(this.spriteProgram, 'aUv'),
      remapSource: gl.getAttribLocation(this.spriteProgram, 'aRemapSource'),
      remapTarget: gl.getAttribLocation(this.spriteProgram, 'aRemapTarget'),
      resolution: gl.getUniformLocation(this.spriteProgram, 'uResolution'),
      atlasTexture: gl.getUniformLocation(this.spriteProgram, 'uAtlasTexture'),
      paletteTexture: gl.getUniformLocation(this.spriteProgram, 'uPaletteTexture'),
      paletteSize: gl.getUniformLocation(this.spriteProgram, 'uPaletteSize'),
    };

    this.initializeGpuBuffers();
    this.initializeVertexLayouts();

    gl.viewport(0, 0, width, height);
    gl.disable(gl.BLEND);
    gl.disable(gl.DITHER);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.SCISSOR_TEST);

    gl.useProgram(this.shapeProgram);
    gl.uniform2f(this.shapeLocations.resolution, width, height);
    gl.uniform1i(this.shapeLocations.paletteTexture, 0);
    gl.uniform1f(this.shapeLocations.paletteSize, this.paletteCount);

    gl.useProgram(this.ellipseProgram);
    gl.uniform2f(this.ellipseLocations.resolution, width, height);
    gl.uniform1i(this.ellipseLocations.paletteTexture, 0);
    gl.uniform1f(this.ellipseLocations.paletteSize, this.paletteCount);

    gl.useProgram(this.spriteProgram);
    gl.uniform2f(this.spriteLocations.resolution, width, height);
    gl.uniform1i(this.spriteLocations.atlasTexture, 1);
    gl.uniform1i(this.spriteLocations.paletteTexture, 0);
    gl.uniform1f(this.spriteLocations.paletteSize, this.paletteCount);
  }

  normalizeColorIndex(colorIndex) {
    return ((Math.round(colorIndex) % this.paletteCount) + this.paletteCount) % this.paletteCount;
  }

  createPaletteTexture() {
    const gl = this.gl;
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      this.paletteCount,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      this.paletteRGBA,
    );
    return texture;
  }

  createAtlasTexture(atlasIndices, atlasWidth, atlasHeight) {
    const gl = this.gl;
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.LUMINANCE,
      atlasWidth,
      atlasHeight,
      0,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      atlasIndices,
    );
    return texture;
  }

  beginFrame() {
    this.shapeVertexCount = 0;
    this.ellipseVertexCount = 0;
    this.spriteVertexCount = 0;
    this.activeBatch = null;
    this.frameCleared = false;
    this.currentClipRect = null;
    this.appliedClipRect = null;
    this.activeVertexLayout = null;
    this.activeSpriteAtlasName = this.defaultAtlasName;
  }

  getAtlas(atlasName = this.defaultAtlasName) {
    const atlas = this.atlases.get(atlasName);
    if (!atlas) {
      throw new Error(`Unknown atlas "${atlasName}".`);
    }
    return atlas;
  }

  clear(colorIndex = 0) {
    this.clearIndex = this.normalizeColorIndex(colorIndex);
  }

  flushActiveBatch() {
    if (this.activeBatch === 'shapes') {
      this.flushShapes();
    } else if (this.activeBatch === 'ellipses') {
      this.flushEllipses();
    } else if (this.activeBatch === 'sprites') {
      this.flushSprites();
    }
  }

  clipRect(rect) {
    this.flushActiveBatch();
    this.currentClipRect = rect;
  }

  bindProgram(program) {
    if (this.activeProgram === program) return;
    this.gl.useProgram(program);
    this.activeProgram = program;
  }

  bindArrayBuffer(buffer) {
    if (this.activeArrayBuffer === buffer) return;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.activeArrayBuffer = buffer;
  }

  bindTexture(unit, texture) {
    const gl = this.gl;
    if (this.activeTextureUnit !== unit) {
      gl.activeTexture(unit);
      this.activeTextureUnit = unit;
    }
    const unitIndex = unit - gl.TEXTURE0;
    if (this.boundTextures[unitIndex] === texture) return;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    this.boundTextures[unitIndex] = texture;
  }

  bindVertexLayout(type) {
    if (this.activeVertexLayout === type) return;

    const gl = this.gl;
    const vaoExt = this.vaoExt;
    if (vaoExt) {
      if (type === 'shapes') vaoExt.bindVertexArrayOES(this.shapeVao);
      else if (type === 'ellipses') vaoExt.bindVertexArrayOES(this.ellipseVao);
      else if (type === 'sprites') vaoExt.bindVertexArrayOES(this.spriteVao);
    } else if (type === 'shapes') {
      this.setupShapeAttributes();
    } else if (type === 'ellipses') {
      this.setupEllipseAttributes();
    } else if (type === 'sprites') {
      this.setupSpriteAttributes();
    }

    this.activeVertexLayout = type;
  }

  initializeGpuBuffers() {
    const gl = this.gl;
    this.bindArrayBuffer(this.shapeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.shapeBufferByteSize, gl.DYNAMIC_DRAW);
    this.bindArrayBuffer(this.ellipseBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.ellipseBufferByteSize, gl.DYNAMIC_DRAW);
    this.bindArrayBuffer(this.spriteBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.spriteBufferByteSize, gl.DYNAMIC_DRAW);
    this.activeArrayBuffer = null;
  }

  createVertexArray(setup) {
    if (!this.vaoExt) return null;
    const vao = this.vaoExt.createVertexArrayOES();
    this.vaoExt.bindVertexArrayOES(vao);
    setup();
    this.vaoExt.bindVertexArrayOES(null);
    this.activeArrayBuffer = null;
    return vao;
  }

  initializeVertexLayouts() {
    this.shapeVao = this.createVertexArray(() => this.setupShapeAttributes());
    this.ellipseVao = this.createVertexArray(() => this.setupEllipseAttributes());
    this.spriteVao = this.createVertexArray(() => this.setupSpriteAttributes());
  }

  setupShapeAttributes() {
    const gl = this.gl;
    this.bindArrayBuffer(this.shapeBuffer);
    gl.enableVertexAttribArray(this.shapeLocations.position);
    gl.vertexAttribPointer(this.shapeLocations.position, 2, gl.FLOAT, false, this.shapeStride * 4, 0);
    gl.enableVertexAttribArray(this.shapeLocations.colorIndex);
    gl.vertexAttribPointer(this.shapeLocations.colorIndex, 1, gl.FLOAT, false, this.shapeStride * 4, 8);
    gl.enableVertexAttribArray(this.shapeLocations.colorIndexB);
    gl.vertexAttribPointer(this.shapeLocations.colorIndexB, 1, gl.FLOAT, false, this.shapeStride * 4, 12);
    gl.enableVertexAttribArray(this.shapeLocations.ditherMix);
    gl.vertexAttribPointer(this.shapeLocations.ditherMix, 1, gl.FLOAT, false, this.shapeStride * 4, 16);
  }

  setupEllipseAttributes() {
    const gl = this.gl;
    this.bindArrayBuffer(this.ellipseBuffer);
    gl.enableVertexAttribArray(this.ellipseLocations.position);
    gl.vertexAttribPointer(this.ellipseLocations.position, 2, gl.FLOAT, false, this.ellipseStride * 4, 0);
    gl.enableVertexAttribArray(this.ellipseLocations.localOffset);
    gl.vertexAttribPointer(this.ellipseLocations.localOffset, 2, gl.FLOAT, false, this.ellipseStride * 4, 8);
    gl.enableVertexAttribArray(this.ellipseLocations.radius);
    gl.vertexAttribPointer(this.ellipseLocations.radius, 2, gl.FLOAT, false, this.ellipseStride * 4, 16);
    gl.enableVertexAttribArray(this.ellipseLocations.rotation);
    gl.vertexAttribPointer(this.ellipseLocations.rotation, 1, gl.FLOAT, false, this.ellipseStride * 4, 24);
    gl.enableVertexAttribArray(this.ellipseLocations.colorIndex);
    gl.vertexAttribPointer(this.ellipseLocations.colorIndex, 1, gl.FLOAT, false, this.ellipseStride * 4, 28);
    gl.enableVertexAttribArray(this.ellipseLocations.colorIndexB);
    gl.vertexAttribPointer(this.ellipseLocations.colorIndexB, 1, gl.FLOAT, false, this.ellipseStride * 4, 32);
    gl.enableVertexAttribArray(this.ellipseLocations.ditherMix);
    gl.vertexAttribPointer(this.ellipseLocations.ditherMix, 1, gl.FLOAT, false, this.ellipseStride * 4, 36);
  }

  setupSpriteAttributes() {
    const gl = this.gl;
    this.bindArrayBuffer(this.spriteBuffer);
    gl.enableVertexAttribArray(this.spriteLocations.position);
    gl.vertexAttribPointer(this.spriteLocations.position, 2, gl.FLOAT, false, this.spriteStride * 4, 0);
    gl.enableVertexAttribArray(this.spriteLocations.uv);
    gl.vertexAttribPointer(this.spriteLocations.uv, 2, gl.FLOAT, false, this.spriteStride * 4, 8);
    gl.enableVertexAttribArray(this.spriteLocations.remapSource);
    gl.vertexAttribPointer(this.spriteLocations.remapSource, 4, gl.FLOAT, false, this.spriteStride * 4, 16);
    gl.enableVertexAttribArray(this.spriteLocations.remapTarget);
    gl.vertexAttribPointer(this.spriteLocations.remapTarget, 4, gl.FLOAT, false, this.spriteStride * 4, 32);
  }

  applyClipState() {
    const gl = this.gl;
    const rect = this.currentClipRect;
    const applied = this.appliedClipRect;
    if (
      rect === applied ||
      (rect && applied &&
        rect.x === applied.x &&
        rect.y === applied.y &&
        rect.w === applied.w &&
        rect.h === applied.h)
    ) {
      return;
    }

    if (!rect) {
      gl.disable(gl.SCISSOR_TEST);
      this.appliedClipRect = null;
      return;
    }

    const x = Math.max(0, Math.floor(rect.x));
    const y = Math.max(0, Math.floor(rect.y));
    const right = Math.min(this.width, Math.ceil(rect.x + rect.w));
    const bottom = Math.min(this.height, Math.ceil(rect.y + rect.h));
    const width = right - x;
    const height = bottom - y;

    if (width <= 0 || height <= 0) {
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(0, 0, 0, 0);
      this.appliedClipRect = { x: 0, y: 0, w: 0, h: 0 };
      return;
    }

    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(x, this.height - (y + height), width, height);
    this.appliedClipRect = { x: rect.x, y: rect.y, w: rect.w, h: rect.h };
  }

  ensureFrameCleared() {
    if (this.frameCleared) return;

    const gl = this.gl;
    const offset = this.clearIndex * 4;
    gl.clearColor(
      this.paletteRGBA[offset] / 255,
      this.paletteRGBA[offset + 1] / 255,
      this.paletteRGBA[offset + 2] / 255,
      1,
    );
    gl.disable(gl.SCISSOR_TEST);
    this.appliedClipRect = null;
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.applyClipState();
    this.frameCleared = true;
  }

  useShapeBatch(vertexCount) {
    if (this.activeBatch === 'ellipses') {
      this.flushEllipses();
    } else if (this.activeBatch === 'sprites') {
      this.flushSprites();
    }
    this.activeBatch = 'shapes';
    if (this.shapeVertexCount + vertexCount > this.maxShapeVertices) {
      this.flushShapes();
    }
  }

  useSpriteBatch(vertexCount, atlasName = this.defaultAtlasName) {
    if (this.activeBatch === 'shapes') {
      this.flushShapes();
    } else if (this.activeBatch === 'ellipses') {
      this.flushEllipses();
    }

    if (this.activeBatch === 'sprites' && this.activeSpriteAtlasName !== atlasName && this.spriteVertexCount > 0) {
      this.flushSprites();
    }

    this.activeBatch = 'sprites';
    this.activeSpriteAtlasName = atlasName;
    if (this.spriteVertexCount + vertexCount > this.maxSpriteVertices) {
      this.flushSprites();
      this.activeSpriteAtlasName = atlasName;
    }
  }

  useEllipseBatch(vertexCount) {
    if (this.activeBatch === 'shapes') {
      this.flushShapes();
    } else if (this.activeBatch === 'sprites') {
      this.flushSprites();
    }
    this.activeBatch = 'ellipses';
    if (this.ellipseVertexCount + vertexCount > this.maxEllipseVertices) {
      this.flushEllipses();
    }
  }

  pushShapeVertex(x, y, colorIndex) {
    const offset = this.shapeVertexCount * this.shapeStride;
    this.shapeVertices[offset] = x;
    this.shapeVertices[offset + 1] = y;
    this.shapeVertices[offset + 2] = colorIndex;
    this.shapeVertices[offset + 3] = colorIndex;
    this.shapeVertices[offset + 4] = 0;
    this.shapeVertexCount += 1;
  }

  pushDitheredShapeVertex(x, y, colorIndexA, colorIndexB, ditherMix) {
    const offset = this.shapeVertexCount * this.shapeStride;
    this.shapeVertices[offset] = x;
    this.shapeVertices[offset + 1] = y;
    this.shapeVertices[offset + 2] = colorIndexA;
    this.shapeVertices[offset + 3] = colorIndexB;
    this.shapeVertices[offset + 4] = ditherMix;
    this.shapeVertexCount += 1;
  }

  pushEllipseVertex(x, y, localX, localY, radiusX, radiusY, rotation, colorIndexA, colorIndexB, ditherMix) {
    const offset = this.ellipseVertexCount * this.ellipseStride;
    this.ellipseVertices[offset] = x;
    this.ellipseVertices[offset + 1] = y;
    this.ellipseVertices[offset + 2] = localX;
    this.ellipseVertices[offset + 3] = localY;
    this.ellipseVertices[offset + 4] = radiusX;
    this.ellipseVertices[offset + 5] = radiusY;
    this.ellipseVertices[offset + 6] = rotation;
    this.ellipseVertices[offset + 7] = colorIndexA;
    this.ellipseVertices[offset + 8] = colorIndexB;
    this.ellipseVertices[offset + 9] = ditherMix;
    this.ellipseVertexCount += 1;
  }

  pushSpriteVertex(x, y, u, v, remapSource, remapTarget) {
    const offset = this.spriteVertexCount * this.spriteStride;
    this.spriteVertices[offset] = x;
    this.spriteVertices[offset + 1] = y;
    this.spriteVertices[offset + 2] = u;
    this.spriteVertices[offset + 3] = v;
    this.spriteVertices[offset + 4] = remapSource[0];
    this.spriteVertices[offset + 5] = remapSource[1];
    this.spriteVertices[offset + 6] = remapSource[2];
    this.spriteVertices[offset + 7] = remapSource[3];
    this.spriteVertices[offset + 8] = remapTarget[0];
    this.spriteVertices[offset + 9] = remapTarget[1];
    this.spriteVertices[offset + 10] = remapTarget[2];
    this.spriteVertices[offset + 11] = remapTarget[3];
    this.spriteVertexCount += 1;
  }

  resolveSpriteRemap(options = {}) {
    const remapSource = this.spriteRemapSource;
    const remapTarget = this.spriteRemapTarget;
    remapSource.fill(-1);
    remapTarget.fill(0);

    let count = 0;
    if (options.replaceSource !== undefined && options.replaceTarget !== undefined) {
      remapSource[count] = this.normalizeColorIndex(options.replaceSource);
      remapTarget[count] = this.normalizeColorIndex(options.replaceTarget);
      count += 1;
    }

    if (Array.isArray(options.remap)) {
      for (let index = 0; index < options.remap.length && count < 4; index++) {
        const remap = options.remap[index];
        remapSource[count] = this.normalizeColorIndex(remap.from);
        remapTarget[count] = this.normalizeColorIndex(remap.to);
        count += 1;
      }
    }
  }

  resolveDitherOptions(colorIndex, options = null) {
    const dither = this.ditherState;
    const primaryColor = this.normalizeColorIndex(colorIndex);
    if (options?.colorB === undefined || options?.mix === undefined) {
      dither.colorA = primaryColor;
      dither.colorB = primaryColor;
      dither.mix = 0;
      return dither;
    }

    dither.colorA = primaryColor;
    dither.colorB = this.normalizeColorIndex(options.colorB);
    dither.mix = Math.max(0, Math.min(1, options.mix));
    return dither;
  }

  pushTriangleVertices(x0, y0, x1, y1, x2, y2, colorIndexA, colorIndexB, ditherMix) {
    this.pushDitheredShapeVertex(x0, y0, colorIndexA, colorIndexB, ditherMix);
    this.pushDitheredShapeVertex(x1, y1, colorIndexA, colorIndexB, ditherMix);
    this.pushDitheredShapeVertex(x2, y2, colorIndexA, colorIndexB, ditherMix);
  }

  submitTriangle(p0, p1, p2, colorIndex, ditherOptions = null, offsetX = 0, offsetY = 0) {
    const dither = this.resolveDitherOptions(colorIndex, ditherOptions);
    this.useShapeBatch(3);
    this.pushTriangleVertices(
      p0.x + offsetX, p0.y + offsetY,
      p1.x + offsetX, p1.y + offsetY,
      p2.x + offsetX, p2.y + offsetY,
      dither.colorA, dither.colorB, dither.mix,
    );
  }

  submitQuad(x0, y0, x1, y1, colorIndex, ditherOptions = null) {
    const dither = this.resolveDitherOptions(colorIndex, ditherOptions);
    this.useShapeBatch(6);
    this.pushTriangleVertices(x0, y0, x1, y0, x0, y1, dither.colorA, dither.colorB, dither.mix);
    this.pushTriangleVertices(x0, y1, x1, y0, x1, y1, dither.colorA, dither.colorB, dither.mix);
  }

  pset(x, y, colorIndex) {
    this.submitQuad(x, y, x + 1, y + 1, colorIndex);
  }

  rectFill(x0, y0, x1, y1, colorIndex, ditherOptions = null) {
    const left = Math.min(x0, x1);
    const top = Math.min(y0, y1);
    const right = Math.max(x0, x1) + 1;
    const bottom = Math.max(y0, y1) + 1;
    this.submitQuad(left, top, right, bottom, colorIndex, ditherOptions);
  }

  rect(x0, y0, x1, y1, colorIndex, thickness = 1) {
    const left = Math.min(x0, x1);
    const top = Math.min(y0, y1);
    const right = Math.max(x0, x1);
    const bottom = Math.max(y0, y1);

    this.line(left, top, right, top, colorIndex, thickness);
    this.line(right, top, right, bottom, colorIndex, thickness);
    this.line(left, bottom, right, bottom, colorIndex, thickness);
    this.line(left, top, left, bottom, colorIndex, thickness);
  }

  triFill(p0, p1, p2, colorIndex, ditherOptions = null, offsetX = 0, offsetY = 0) {
    this.submitTriangle(p0, p1, p2, colorIndex, ditherOptions, offsetX, offsetY);
  }

  polygonFill(points, colorIndex, ditherOptions = null, offsetX = 0, offsetY = 0) {
    if (!points || points.length < 3) return;

    const dither = this.resolveDitherOptions(colorIndex, ditherOptions);
    const anchor = points[0];
    const anchorX = anchor.x + offsetX;
    const anchorY = anchor.y + offsetY;
    this.useShapeBatch((points.length - 2) * 3);
    for (let index = 1; index < points.length - 1; index++) {
      const p1 = points[index];
      const p2 = points[index + 1];
      this.pushTriangleVertices(
        anchorX,
        anchorY,
        p1.x + offsetX,
        p1.y + offsetY,
        p2.x + offsetX,
        p2.y + offsetY,
        dither.colorA,
        dither.colorB,
        dither.mix,
      );
    }
  }

  regularPolygonFill(cx, cy, radius, sides, rotation = 0, colorIndex = 0, ditherOptions = null) {
    const safeSides = Math.max(3, Math.floor(sides));
    const dither = this.resolveDitherOptions(colorIndex, ditherOptions);
    const step = (Math.PI * 2) / safeSides;
    let angle0 = rotation;
    let angle1 = rotation + step;
    const anchorX = cx + Math.cos(angle0) * radius;
    const anchorY = cy + Math.sin(angle0) * radius;
    let prevX = cx + Math.cos(angle1) * radius;
    let prevY = cy + Math.sin(angle1) * radius;

    this.useShapeBatch((safeSides - 2) * 3);
    for (let index = 2; index < safeSides; index++) {
      const angle = rotation + step * index;
      const nextX = cx + Math.cos(angle) * radius;
      const nextY = cy + Math.sin(angle) * radius;
      this.pushTriangleVertices(
        anchorX,
        anchorY,
        prevX,
        prevY,
        nextX,
        nextY,
        dither.colorA,
        dither.colorB,
        dither.mix,
      );
      prevX = nextX;
      prevY = nextY;
    }
  }

  ellipseFill(cx, cy, radiusX, radiusY, colorIndex, options = null) {
    const safeRadiusX = Math.max(0.5, radiusX);
    const safeRadiusY = Math.max(0.5, radiusY);
    const rotation = options?.rotation ?? 0;
    const dither = this.resolveDitherOptions(colorIndex, options?.dither ?? null);
    const cosR = Math.cos(rotation);
    const sinR = Math.sin(rotation);
    const extentX = Math.abs(safeRadiusX * cosR) + Math.abs(safeRadiusY * sinR);
    const extentY = Math.abs(safeRadiusX * sinR) + Math.abs(safeRadiusY * cosR);
    const left = cx - extentX;
    const right = cx + extentX;
    const top = cy - extentY;
    const bottom = cy + extentY;

    this.useEllipseBatch(6);
    this.pushEllipseVertex(left, top, left - cx, top - cy, safeRadiusX, safeRadiusY, rotation, dither.colorA, dither.colorB, dither.mix);
    this.pushEllipseVertex(right, top, right - cx, top - cy, safeRadiusX, safeRadiusY, rotation, dither.colorA, dither.colorB, dither.mix);
    this.pushEllipseVertex(left, bottom, left - cx, bottom - cy, safeRadiusX, safeRadiusY, rotation, dither.colorA, dither.colorB, dither.mix);
    this.pushEllipseVertex(left, bottom, left - cx, bottom - cy, safeRadiusX, safeRadiusY, rotation, dither.colorA, dither.colorB, dither.mix);
    this.pushEllipseVertex(right, top, right - cx, top - cy, safeRadiusX, safeRadiusY, rotation, dither.colorA, dither.colorB, dither.mix);
    this.pushEllipseVertex(right, bottom, right - cx, bottom - cy, safeRadiusX, safeRadiusY, rotation, dither.colorA, dither.colorB, dither.mix);
  }

  line(x0, y0, x1, y1, colorIndex, thickness = 1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const length = Math.hypot(dx, dy);
    if (length < 0.0001) {
      this.pset(x0, y0, colorIndex);
      return;
    }

    const halfThickness = Math.max(1, thickness) * 0.5;
    const nx = (-dy / length) * halfThickness;
    const ny = (dx / length) * halfThickness;
    const dither = this.resolveDitherOptions(colorIndex, null);

    this.useShapeBatch(6);
    this.pushTriangleVertices(
      x0 - nx,
      y0 - ny,
      x1 - nx,
      y1 - ny,
      x0 + nx,
      y0 + ny,
      dither.colorA,
      dither.colorB,
      dither.mix,
    );
    this.pushTriangleVertices(
      x0 + nx,
      y0 + ny,
      x1 - nx,
      y1 - ny,
      x1 + nx,
      y1 + ny,
      dither.colorA,
      dither.colorB,
      dither.mix,
    );
  }

  drawSprite(sourceRect, destRect, options = {}) {
    return this.drawSpriteRect(sourceRect, destRect.x, destRect.y, destRect.w, destRect.h, options);
  }

  drawSpriteRect(sourceRect, x, y, w, h, options = {}) {
    this.resolveSpriteRemap(options);
    const remapSource = this.spriteRemapSource;
    const remapTarget = this.spriteRemapTarget;
    const atlas = this.getAtlas(options.atlas ?? sourceRect.atlas ?? this.defaultAtlasName);
    const flipX = options.flipX === true;
    const flipY = options.flipY === true;
    const originX = options.originX ?? 0;
    const originY = options.originY ?? 0;
    const originOffsetX = w * originX;
    const originOffsetY = h * originY;
    const sx0 = sourceRect.x / atlas.width;
    const sy0 = sourceRect.y / atlas.height;
    const sx1 = (sourceRect.x + sourceRect.w) / atlas.width;
    const sy1 = (sourceRect.y + sourceRect.h) / atlas.height;
    const u0 = flipX ? sx1 : sx0;
    const v0 = flipY ? sy1 : sy0;
    const u1 = flipX ? sx0 : sx1;
    const v1 = flipY ? sy0 : sy1;
    const dx0 = x - originOffsetX;
    const dy0 = y - originOffsetY;
    const dx1 = dx0 + w;
    const dy1 = dy0 + h;

    this.useSpriteBatch(6, atlas.name);
    this.pushSpriteVertex(dx0, dy0, u0, v0, remapSource, remapTarget);
    this.pushSpriteVertex(dx1, dy0, u1, v0, remapSource, remapTarget);
    this.pushSpriteVertex(dx0, dy1, u0, v1, remapSource, remapTarget);
    this.pushSpriteVertex(dx0, dy1, u0, v1, remapSource, remapTarget);
    this.pushSpriteVertex(dx1, dy0, u1, v0, remapSource, remapTarget);
    this.pushSpriteVertex(dx1, dy1, u1, v1, remapSource, remapTarget);
  }

  flushShapes() {
    if (this.shapeVertexCount === 0) return;

    const gl = this.gl;
    this.ensureFrameCleared();
    this.applyClipState();
    this.bindProgram(this.shapeProgram);
    this.bindTexture(gl.TEXTURE0, this.paletteTexture);
    this.bindVertexLayout('shapes');
    this.bindArrayBuffer(this.shapeBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.shapeVertices.subarray(0, this.shapeVertexCount * this.shapeStride));
    gl.drawArrays(gl.TRIANGLES, 0, this.shapeVertexCount);

    this.shapeVertexCount = 0;
  }

  flushEllipses() {
    if (this.ellipseVertexCount === 0) return;

    const gl = this.gl;
    this.ensureFrameCleared();
    this.applyClipState();
    this.bindProgram(this.ellipseProgram);
    this.bindTexture(gl.TEXTURE0, this.paletteTexture);
    this.bindVertexLayout('ellipses');
    this.bindArrayBuffer(this.ellipseBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.ellipseVertices.subarray(0, this.ellipseVertexCount * this.ellipseStride));
    gl.drawArrays(gl.TRIANGLES, 0, this.ellipseVertexCount);

    this.ellipseVertexCount = 0;
  }

  flushSprites() {
    if (this.spriteVertexCount === 0) return;

    const gl = this.gl;
    const atlas = this.getAtlas(this.activeSpriteAtlasName);
    this.ensureFrameCleared();
    this.applyClipState();
    this.bindProgram(this.spriteProgram);
    this.bindTexture(gl.TEXTURE0, this.paletteTexture);
    this.bindTexture(gl.TEXTURE1, atlas.texture);
    this.bindVertexLayout('sprites');
    this.bindArrayBuffer(this.spriteBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.spriteVertices.subarray(0, this.spriteVertexCount * this.spriteStride));
    gl.drawArrays(gl.TRIANGLES, 0, this.spriteVertexCount);

    this.spriteVertexCount = 0;
  }

  endFrame() {
    if (this.activeBatch === 'shapes') {
      this.flushShapes();
    } else if (this.activeBatch === 'ellipses') {
      this.flushEllipses();
    } else if (this.activeBatch === 'sprites') {
      this.flushSprites();
    } else {
      this.ensureFrameCleared();
    }

    if (this.vaoExt) {
      this.vaoExt.bindVertexArrayOES(null);
    }
    this.gl.disable(this.gl.SCISSOR_TEST);
    this.appliedClipRect = null;
    this.activeVertexLayout = null;
    this.activeBatch = null;
  }
}

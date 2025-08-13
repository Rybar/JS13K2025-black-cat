// RetroBuffer.js
// A modern indexed-color engine with separate screen buffer and game-data pages

export default class RetroBuffer {
  // === Private fields ===
  width;
  height;
  pageSize;
  pages;
  paletteCount;
  ram;            // Uint8Array: pages of game data (size = pageSize * pages)
  vram;           // Uint8Array: dedicated screen buffer
  screenBuffer;   // Uint8Array view currently used for drawing and rendering
  screenPage = -1;  // -1 means vram, otherwise index into ram pages
  palette32;      // Uint32Array: packed RGBA palette entries
  dither;         // Uint8Array[16] Bayer matrix

  colorTable;     // Uint8Array 2d color table, works like picotrons. can be
                  // used for blending effects, stencil effects, etc.



  // Public canvas and drawing context
  canvas;
  ctx;
  imageData;
  pixelBuffer;    // Uint32Array view into imageData
  buffer8;        // Uint8Array view into imageData

  /**
   * @param {number} width            - framebuffer width in pixels
   * @param {number} height           - framebuffer height in pixels
   * @param {HTMLImageElement|ImageBitmap} paletteImage - Image: top row is palette, remainder are sprite pixels
   * @param {number} pages            - number of 8-bit game-data pages
   */
  constructor(width, height, paletteImage, pages) {
    this.width    = width;
    this.height   = height;
    this.pageSize = width * height;
    this.pages    = pages;

    // allocate game-data RAM and screen buffer(s)
    this.ram = new Uint8Array(this.pageSize * pages);
    this.vram = new Uint8Array(this.pageSize); // dedicated screen buffer
    this.screenBuffer = this.vram;            // current drawing target
    this.screenPage = -1;                     // -1 signifies vram

    // --- extract palette from top row of image ---
    const imgW = paletteImage.width;
    const imgH = paletteImage.height;
    if (imgW < 2 || imgW > 256) 
      throw new Error(`Palette width must be between 2 and 256, got ${imgW}`);

    // draw image to temp canvas
    const tmp = document.createElement('canvas');
    tmp.width = imgW;
    tmp.height = imgH;
    const tctx = tmp.getContext('2d');
    tctx.drawImage(paletteImage, 0, 0);
    const imgData = tctx.getImageData(0, 0, imgW, imgH).data;

    // number of palette entries from top row
    this.paletteCount = imgW;
    this.palette32 = new Uint32Array(this.paletteCount);
    const paletteMap = new Map();
    for (let i = 0; i < this.paletteCount; i++) {
      const offset = i * 4;
      const r = imgData[offset];
      const g = imgData[offset + 1];
      const b = imgData[offset + 2];
      const a = imgData[offset + 3];
      const colorInt = (a << 24) | (b << 16) | (g << 8) | r;
      this.palette32[i] = colorInt;
      paletteMap.set(colorInt, i);
    }

    // --- initialize the 2D color table as a flat array ---
    //    colorTable[e * paletteCount + i] = i  (identity, “normal” overdraw)
    const n = this.paletteCount;
    // === in constructor, after computing this.paletteCount === n ===
    this.colorTable = new Uint8Array(n * n);

    //“transparent zero” identity:
    for (let e = 0; e < n; e++) {
      // when incomingIndex = 0, stay at existingIndex = e
      this.colorTable[e * n + 0] = e;

      // for all incomingIndex i ≥ 1, normal overdraw:
      for (let i = 1; i < n; i++) {
        this.colorTable[e * n + i] = i;
      }
    }


    // Determine how many rows/columns of the image actually fit in one page:
    const maxRows = Math.min(imgH - 1, this.height);   // skip the top row (palette) so start at y = 1
    const maxCols = Math.min(imgW, this.width);

    for (let yy = 0; yy < maxRows; yy++) {
      // image‐row (yy+1) because row 0 is the palette
      const srcRow = yy + 1;

      for (let xx = 0; xx < maxCols; xx++) {
        const srcOff = (srcRow * imgW + xx) * 4;
        const r = imgData[srcOff];
        const g = imgData[srcOff + 1];
        const b = imgData[srcOff + 2];
        const a = imgData[srcOff + 3];
        const colorInt = (a << 24) | (b << 16) | (g << 8) | r;
        const idx = paletteMap.get(colorInt) ?? 0;

        // Compute destination index as (row * pageWidth + col)
        const destIdx = yy * this.width + xx;
        this.ram[destIdx] = idx;
      }
    }


    // --- create visible canvas ---
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = "100%";
    this.canvas.width  = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    // prepare imageData and pixel views
    this.imageData = this.ctx.createImageData(width, height);
    this.buffer8   = new Uint8Array(this.imageData.data.buffer);
    this.pixelBuffer = new Uint32Array(this.imageData.data.buffer);

    // 4×4 Bayer matrix for ordered dithering
    this.dither = new Uint8Array([
      15, 135, 45, 165,
      195, 75, 225, 105,
      60, 180, 30, 150,
      240, 120, 210, 90
    ]);
  }

  /**
   * Select which memory page is used as the screen buffer.
   * Pass -1 to use the dedicated screen buffer (default).
   * @param {number} page
   */
  setScreenPage(page = -1) {
    if (page === -1) {
      this.screenBuffer = this.vram;
      this.screenPage = -1;
      return;
    }
    if (page >= 0 && page < this.pages) {
      const start = page * this.pageSize;
      this.screenBuffer = this.ram.subarray(start, start + this.pageSize);
      this.screenPage = page;
    } else {
      throw new Error(`Page must be in range 0..${this.pages - 1} or -1`);
    }
  }

  /**
   * Plot a pixel into the screen buffer, but look it up through the 2D color table.
   * @param {number} x       - pixel X
   * @param {number} y       - pixel Y
   * @param {number} c1      - primary palette index
   * @param {number} [c2]    - secondary index for dithering (defaults to c1)
   */
  pset(x, y, c1, c2 = c1, mix=0.5) {
    x |= 0; 
    y |= 0;
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;

    const idx = y * this.width + x;
    const slot = ((y & 3) << 2) | (x & 3);
    const th   = this.dither[slot];

    const pi = this.paletteCount;
    const i1 = ((c1 % pi) + pi) % pi;
    const i2 = ((c2 % pi) + pi) % pi;

    const threshold = Math.floor(mix * 255);
    const candidate = (th < threshold ? i1 : i2);

    // Lookup what’s already in the buffer
    const existing = this.screenBuffer[idx];

    // Final pixel = colorTable[existing][candidate]
    const finalIdx = this.colorTable[ existing * pi + candidate ];

    this.screenBuffer[idx] = finalIdx;
  }

  /**
   * Clear the screen buffer to a given palette index (default 0)
   * @param {number} colorIndex - palette index to fill
   */
  clear(colorIndex = 0) {
    const ci = ((colorIndex % this.paletteCount) + this.paletteCount) % this.paletteCount;
    this.screenBuffer.fill(ci);
  }

  /**
   * Blit a rectangle from an arbitrary RAM page (each page is width×height bytes)
   * onto the screen buffer. Assumes palette index 0 has already been made “transparent”
   * via your colorTable lookup, so we don’t need extra if-checks here.
   *
   * @param {number} p    – Which RAM page to read from (0 ≤ p < this.pages)
   * @param {number} dx   – X on screen where the top-left of the rectangle goes
   * @param {number} dy   – Y on screen where the top-left of the rectangle goes
   * @param {number} sx   – X inside that page where the source rectangle starts
   * @param {number} sy   – Y inside that page where the source rectangle starts
   * @param {number} w    – Width of the rectangle to copy (in pixels)
   * @param {number} h    – Height of the rectangle to copy (in pixels)
   */
  blitFromPage(p, dx, dy, sx, sy, w, h) {
    // 1) Check page bounds
    if (p < 0 || p >= this.pages) return;
    const pageOffset = p * this.pageSize; // start of page p in this.ram

    // 2) Loop over each row of the h×w block
    for (let yy = 0; yy < h; yy++) {
      const srcY = sy + yy;
      if (srcY < 0 || srcY >= this.height) continue;

      // 3) Loop over each column
      for (let xx = 0; xx < w; xx++) {
        const srcX = sx + xx;
        if (srcX < 0 || srcX >= this.width) continue;

        // 4) Compute the index within page p
        const srcIdx = pageOffset + srcY * this.width + srcX;
        const colorIndex = this.ram[srcIdx];

        // 5) Always call pset(), even if colorIndex===0.
        //    Your colorTable should already map (existing, 0) → existing,
        //    effectively making palette index 0 “transparent.”
        this.pset(dx + xx, dy + yy, colorIndex);
      }
    }
  }

  /**
   * Blit a rectangle from a RAM page onto the screen buffer, scaling it to a
   * destination size.
   *
   * @param {number} p         – RAM page to read from
   * @param {number} sx        – X position in the page where the source starts
   * @param {number} sy        – Y position in the page where the source starts
   * @param {number} sw        – Source width in pixels
   * @param {number} sh        – Source height in pixels
   * @param {number} dx        – X on screen for the top‑left of the dest rect
   * @param {number} dy        – Y on screen for the top‑left of the dest rect
   * @param {number} dw        – Destination width in pixels
   * @param {number} dh        – Destination height in pixels
   */
  scaledBlit(p, sx, sy, sw, sh, dx, dy, dw, dh) {
    if (p < 0 || p >= this.pages) return;
    const pageOffset = p * this.pageSize;

    for (let yy = 0; yy < dh; yy++) {
      const srcY = sy + Math.floor(yy * sh / dh);
      if (srcY < 0 || srcY >= this.height) continue;

      for (let xx = 0; xx < dw; xx++) {
        const srcX = sx + Math.floor(xx * sw / dw);
        if (srcX < 0 || srcX >= this.width) continue;

        const srcIdx = pageOffset + srcY * this.width + srcX;
        const colorIndex = this.ram[srcIdx];
        this.pset(dx + xx, dy + yy, colorIndex);
      }
    }
  }

  /**
   * Draws a 1‐pixel‐wide line from (x0,y0) to (x1,y1), inclusive,
   * using Bresenham’s algorithm. Each plotted pixel is drawn via pset().
   *
   * @param {number} x0    – starting X
   * @param {number} y0    – starting Y
   * @param {number} x1    – ending X
   * @param {number} y1    – ending Y
   * @param {number} c1    – primary palette index
   * @param {number} [c2]  – secondary palette index for dithering (defaults to c1)
   */
  line(x0, y0, x1, y1, c1, c2 = c1, mix=0.5) {
    // Force integer coordinates
    x0 |= 0;  y0 |= 0;
    x1 |= 0;  y1 |= 0;

    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);

    // Determine step direction for x and y
    let sx = x0 < x1 ? 1 : -1;
    let sy = y0 < y1 ? 1 : -1;

    // Initial error term
    let err = dx - dy;

    while (true) {
      // Plot current point
      this.pset(x0, y0, c1, c2, mix);

      // If we’ve reached the end coordinate, we’re done
      if (x0 === x1 && y0 === y1) break;

      // Double‐error trick
      let e2 = err << 1; // same as 2*err

      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

/**
 * Fill an ellipse in [x0..x1]×[y0..y1] with a dithered blend between c1/c2. using bresenham’s algorithm.
 * @param {number} x0   – left
 * @param {number} y0   – top
 * @param {number} x1   – right (inclusive)
 * @param {number} y1   – bottom (inclusive)
 * @param {number} c1   – primary palette index (the “25% color”)
 * @param {number} c2   – secondary palette index (the “75% color”)
 * @param {number} mix  – fraction of pixels that should be c1 (0.0..1.0)
 */
ellipseFill(x0, y0, x1, y1, c1, c2=c1, mix=0.5) {
  // clamp coordinates to integers
  x0 |= 0;  y0 |= 0;
  x1 |= 0;  y1 |= 0;
  // make sure x0 <= x1, y0 <= y1
  if (x1 < x0) [x0, x1] = [x1, x0];
  if (y1 < y0) [y0, y1] = [y1, y0];
  const a = (x1 - x0) / 2; // semi-major axis
  const b = (y1 - y0) / 2; // semi-minor axis
  const cx = x0 + a; // center x
  const cy = y0 + b; // center y
  const a2 = a * a; // a^2
  const b2 = b * b; // b^2
  const dither = this.dither;
  const pi = this.paletteCount;
  const threshold = Math.floor(mix * 255);  
  for (let y = 0; y <= b; y++) {
    for (let x = 0; x <= a; x++) {
      // Bresenham’s ellipse algorithm
      const d = (b2 * x * x + a2 * y * y - a2 * b2);
      if (d <= 0) {
        // Calculate the pixel coordinates
        const px = cx + x;
        const py = cy + y;
        const nx = cx - x;
        const ny = cy - y;

        // Plot the four symmetric points
        this.pset(px, py, c1, c2, mix);
        this.pset(nx, py, c1, c2, mix);
        this.pset(px, ny, c1, c2, mix);
        this.pset(nx, ny, c1, c2, mix);
      }
    }
  }
}


  /**
   * Fill a triangle defined by three points with a dithered blend between c1 and c2.
   * Each point is a tuple [x, y].
   * @param {[number, number]} p1 – first point
   * @param {[number, number]} p2 – second point
   * @param {[number, number]} p3 – third point
   * @param {number} c1           – primary palette index
   * @param {number} [c2=0]       – secondary palette index
   * @param {number} [mix=1]      – fraction of pixels that should be c1 (0.0..1.0)
   */
  triFill(p1, p2, p3, c1, c2 = 0, mix = 1) {
    const x0 = p1[0], y0 = p1[1];
    const x1 = p2[0], y1 = p2[1];
    const x2 = p3[0], y2 = p3[1];

    const minX = Math.max(Math.floor(Math.min(x0, x1, x2)), 0);
    const maxX = Math.min(Math.ceil(Math.max(x0, x1, x2)), this.width - 1);
    const minY = Math.max(Math.floor(Math.min(y0, y1, y2)), 0);
    const maxY = Math.min(Math.ceil(Math.max(y0, y1, y2)), this.height - 1);

    const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    if (area === 0) return;
    const sign = area < 0 ? -1 : 1;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const w0 = sign * ((x1 - x0) * (y - y0) - (y1 - y0) * (x - x0));
        const w1 = sign * ((x2 - x1) * (y - y1) - (y2 - y1) * (x - x1));
        const w2 = sign * ((x0 - x2) * (y - y2) - (y0 - y2) * (x - x2));
        if (w0 >= 0 && w1 >= 0 && w2 >= 0) {
          this.pset(x, y, c1, c2, mix);
        }
      }
    }
  }

  /**
   * Fill a rectangle in [x0..x1]×[y0..y1] with a dithered blend between c1/c2.
   * @param {number} x0   – left
   * @param {number} y0   – top
   * @param {number} x1   – right (inclusive)
 * @param {number} y1   – bottom (inclusive)
 * @param {number} c1   – primary palette index (the “25% color”)
 * @param {number} c2   – secondary palette index (the “75% color”)
 * @param {number} mix  – fraction of pixels that should be c1 (0.0..1.0).
 */
rectFill(x0, y0, x1, y1, c1, c2=c1, mix=0.5) {
  // clamp coordinates to integers
  x0 |= 0;  y0 |= 0;
  x1 |= 0;  y1 |= 0;

  // make sure x0 <= x1, y0 <= y1
  if (x1 < x0) [x0, x1] = [x1, x0];
  if (y1 < y0) [y0, y1] = [y1, y0];

  for (let yy = y0; yy <= y1; yy++) {
    for (let xx = x0; xx <= x1; xx++) {
      this.pset(xx, yy, c1, c2, mix);
    }
  }
}

  /**
   * Render the screen buffer into the canvas
   */
  render() {
    const buf = this.screenBuffer;
    const pal = this.palette32;
    const pix = this.pixelBuffer;
    for (let i = 0, len = buf.length; i < len; i++) {
      pix[i] = pal[buf[i]];
    }
    this.ctx.putImageData(this.imageData, 0, 0);
  }

  // === Color‐Table Helpers ===

  /**
   * Reset the color table so that colorTable[e][i] = i (i.e. “normal” overdraw).
   */
  resetColorTableToIdentity() {
    const n = this.paletteCount;
  
    for (let e = 0; e < n; e++) {
      // keep e when drawing 0 (transparent)
      this.colorTable[e * n + 0] = e;
  
      // otherwise just overwrite with incoming i
      for (let i = 1; i < n; i++) {
        this.colorTable[e * n + i] = i;
      }
    }
  }

  /**
   * Remap palette indices so that drawing any of the given source colors will
   * result in the corresponding target color.
   *
   * @param {number[]} sourceColors - colors used in sprites
   * @param {number[]} targetColors - colors to draw with
   */
  remapColors(sourceColors, targetColors) {
    if (!Array.isArray(sourceColors) ||
        !Array.isArray(targetColors) ||
        sourceColors.length !== targetColors.length) {
      throw new Error('remapColors expects two arrays of equal length');
    }

    const n = this.paletteCount;

    for (let p = 0; p < sourceColors.length; p++) {
      const src = ((sourceColors[p] % n) + n) % n;
      const tgt = ((targetColors[p] % n) + n) % n;

      for (let e = 0; e < n; e++) {
        this.colorTable[e * n + src] = tgt;
      }
    }
  }
  
  /**
   * Set one entry: when drawing “incomingIndex” over “existingIndex”,
   * force the final palette index to be “resultIndex.”
   * @param {number} existingIndex  - palette index already in the buffer
   * @param {number} incomingIndex  - palette index you want to plot
   * @param {number} resultIndex    - what should actually go into screenBuffer
   */
  setColorTableEntry(existingIndex, incomingIndex, resultIndex) {
    const n = this.paletteCount;
    if (
      existingIndex < 0 || existingIndex >= n ||
      incomingIndex < 0 || incomingIndex >= n ||
      resultIndex < 0  || resultIndex  >= n
    ) {
      throw new Error(`Color‐table indices must be in [0..${n-1}]`);
    }
    this.colorTable[ existingIndex * n + incomingIndex ] = resultIndex;
  }

  /**
   * create additive color table, for light effects, by doing additive blending on RGBA lookups and setting resultIndex to closest palette index.
   * @param {function} colorEquation - color blending function, defaults to colorEquationAdditive
    */
   createBlendTable(colorEquation = this.colorEquationAdditive) {
    // Create a new color table with additive blending
    const n = this.paletteCount;
    const newTable = new Uint8Array(n * n);
    for (let e = 0; e < n; e++) {
      for (let i = 0; i < n; i++) {
        // Get the existing color from the palette
        const existingColor = this.palette32[e];
        const incomingColor = this.palette32[i];

        // Blend the two colors using the provided color equation
        const blendedColor = colorEquation(existingColor, incomingColor);
        const { r, g, b, a } = blendedColor;

        // Find the closest palette index
        let closestIndex = 0;
        let minDistance = Infinity;
        for (let j = 0; j < n; j++) {
          const color = this.palette32[j];
          const dr = r - ((color >> 16) & 0xFF);
          const dg = g - ((color >> 8) & 0xFF);
          const db = b - (color & 0xFF);
          const da = a - ((color >> 24) & 0xFF);
          const distance = dr * dr + dg * dg + db * db + da * da;
          if (distance < minDistance) {
            minDistance = distance;
            closestIndex = j;
          }
        }

        // Set the new color table entry
        newTable[e * n + i] = closestIndex;
      }
      
    }
    return newTable;
  }

  /**
   * Adds two RGBA colors using an additive equation and clamps each channel value to 255.
   *
   * This function extracts the red, green, blue, and alpha channels from each provided
   * RGBA integer (where each channel is represented by 8 bits) using bitwise operations,
   * adds corresponding channels together, and clamps the result to a maximum of 255
   * to avoid overflow. The resulting color is returned as an object with individual channels.
   *
   * @param {number} existingRGBA - The original color represented as a 32-bit integer.
   * @param {number} incomingRGBA - The color to add represented as a 32-bit integer.
   * @returns {{a: number, r: number, g: number, b: number}} The resulting color with clamped RGBA components.
   */
  colorEquationAdditive(existingRGBA, incomingRGBA) {
    // Add the RGBA values together, clamping to 255
    const r = Math.min(((existingRGBA >> 16) & 0xFF) + ((incomingRGBA >> 16) & 0xFF), 255);
    const g = Math.min(((existingRGBA >> 8) & 0xFF) + ((incomingRGBA >> 8) & 0xFF), 255);
    const b = Math.min((existingRGBA & 0xFF) + (incomingRGBA & 0xFF), 255);
    const a = Math.min(((existingRGBA >> 24) & 0xFF) + ((incomingRGBA >> 24) & 0xFF), 255);

    // return object with color components
    return { a: a, r: r, g: g, b: b };
  }

  /**
   * Multiplies the components of two RGBA colors, clamping each to a maximum of 255.
   *
   * This function extracts the red, green, blue, and alpha components from each 32-bit RGBA integer,
   * multiplies the corresponding components together, normalizes the product by 255, and clamps the result.
   *
   * @param {number} existingRGBA - The first 32-bit integer representing an RGBA color.
   * @param {number} incomingRGBA - The second 32-bit integer representing an RGBA color.
   * @returns {{a: number, r: number, g: number, b: number}} An object containing the resulting alpha (a),
   * red (r), green (g), and blue (b) components after multiplication.
   */
  colorEquationMultiply(existingRGBA, incomingRGBA) {
    // Multiply the RGBA values together, clamping to 255
    const r = Math.min(((existingRGBA >> 16) & 0xFF) * ((incomingRGBA >> 16) & 0xFF) / 255, 255);
    const g = Math.min(((existingRGBA >> 8) & 0xFF) * ((incomingRGBA >> 8) & 0xFF) / 255, 255);
    const b = Math.min((existingRGBA & 0xFF) * (incomingRGBA & 0xFF) / 255, 255);
    const a = Math.min(((existingRGBA >> 24) & 0xFF) * ((incomingRGBA >> 24) & 0xFF) / 255, 255);

    // return object with color components
    return { a: a, r: r, g: g, b: b };
  }


  /**
   * Bulk‐load a new color table.  Accepts either:
   *  • a Uint8Array of length n*n, or
   *  • a JS array-of-arrays ([n][n]) of numbers.
   * @param {Uint8Array|number[][]} source
   */
  setColorTableFrom(source) {
    const n = this.paletteCount;
    if (source instanceof Uint8Array && source.length === n * n) {
      this.colorTable.set(source);
      return;
    }
    if (
      Array.isArray(source) &&
      source.length === n &&
      source.every(row => Array.isArray(row) && row.length === n)
    ) {
      for (let e = 0; e < n; e++) {
        for (let i = 0; i < n; i++) {
          this.colorTable[e * n + i] = source[e][i];
        }
      }
      return;
    }
    throw new Error(
      `Invalid argument to setColorTableFrom: must be a Uint8Array of length ${n*n} or a [${n}][${n}] JS array.`
    );
  }
}

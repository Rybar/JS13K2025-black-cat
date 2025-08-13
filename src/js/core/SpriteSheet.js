class SpriteSheet {
  /**
   * @param {RetroBuffer} buffer
   * @param {number} [page=0]         - RAM page containing the sheet
   * @param {number} [sheetX=0]       - x offset of the sheet within the page
   * @param {number} [sheetY=0]       - y offset of the sheet within the page
   * @param {number} spriteWidth      - width of each sprite in pixels
   * @param {number} spriteHeight     - height of each sprite in pixels
   * @param {number} sheetWidth       - width of the sheet in pixels
   */
  constructor(
    buffer,
    page = 0,
    sheetX = 0,
    sheetY = 0,
    spriteWidth = 8,
    spriteHeight = 8,
    sheetWidth = 64
  ) {
    this.buffer = buffer;
    this.page = page;
    this.sheetX = sheetX;
    this.sheetY = sheetY;
    this.spriteWidth = spriteWidth;
    this.spriteHeight = spriteHeight;
    this.sheetWidth = sheetWidth;

    this.spritesPerRow = Math.floor(this.sheetWidth / this.spriteWidth);
  }

  /**
   * Draw sprite with given index at (x, y)
   * @param {number} index
   * @param {number} x
   * @param {number} y
   */
  drawSprite(index, x, y) {
    const col = index % this.spritesPerRow;
    const row = Math.floor(index / this.spritesPerRow);
    const sx = this.sheetX + col * this.spriteWidth;
    const sy = this.sheetY + row * this.spriteHeight;

    this.buffer.blitFromPage(
      this.page,
      x,
      y,
      sx,
      sy,
      this.spriteWidth,
      this.spriteHeight
    );
  }
}

/**
 * Draw a scaled sprite from a SpriteSheet.
 *
 * @param {SpriteSheet} sheet
 * @param {number} index
 * @param {number} x
 * @param {number} y
 * @param {number} scale
 */
export function scaledSprite(sheet, index, x, y, scale = 1) {
  const col = index % sheet.spritesPerRow;
  const row = Math.floor(index / sheet.spritesPerRow);
  const sx = sheet.sheetX + col * sheet.spriteWidth;
  const sy = sheet.sheetY + row * sheet.spriteHeight;

  const dw = Math.round(sheet.spriteWidth * scale);
  const dh = Math.round(sheet.spriteHeight * scale);

  sheet.buffer.scaledBlit(
    sheet.page,
    sx,
    sy,
    sheet.spriteWidth,
    sheet.spriteHeight,
    x,
    y,
    dw,
    dh
  );
}

export default SpriteSheet;


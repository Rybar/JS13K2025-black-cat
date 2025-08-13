/**
 * SpriteFont wraps RetroBuffer.blitFromPage for a fixed‐width 4×8 font.
 */
class SpriteFont {
    /**
     * @param {RetroBuffer} buffer
     * @param {string}      indexString
     *   A string of characters, exactly in the same order as your 4×8 glyphs
     *   appear in the sprite sheet.  e.g. "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
     * @param {number}      [page=0]
     *   Which RAM page holds the font‐sheet.  (0 means page 0, etc.)
     * @param {number}      [charWidth=4] 
     * @param {number}      [charHeight=8]
     * @param {number}      [fontSheetWidth=64]
     */
    constructor(
        buffer,
        indexString= "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789`~!\"#$%&'()*+,-./:;<=>?@[\\]^_{|} ",
        page = 0, charWidth = 5, charHeight = 10, fontSheetWidth = 65,
        glyphColorIndex = 2) {
        this.buffer      = buffer;
        this.page        = page;
        this.indexString = indexString;
        this.charWidth   = charWidth;
        this.charHeight  = charHeight;
        this.fontSheetWidth = fontSheetWidth;
        this.glyphColorIndex = glyphColorIndex;
  
      // How many glyphs fit per row in the page?
      this.charsPerRow = Math.floor(this.fontSheetWidth / this.charWidth);

     
    }
  
    /**
     * Draw a single character `ch` at (dx, dy) on the screen.
     * If `ch` isn’t found in indexString, it does nothing.
     *
     * This computes:
     *   idx = indexString.indexOf(ch)
     *   sx = (idx % charsPerRow) * charWidth
     *   sy = fontRowOffset + Math.floor(idx / charsPerRow) * charHeight
     *
     * Then calls: buffer.blitFromPage(page, dx, dy, sx, sy, charWidth, charHeight)
     */
    drawChar(ch, dx, dy) {
      const idx = this.indexString.indexOf(ch);
      if (idx < 0) return; // character not in font
      
      // Calculate which column/row of the font sheet:
      const col = idx % this.charsPerRow;
      const row = Math.floor(idx / this.charsPerRow);
      
      const sx = col * this.charWidth;
      const sy = row * this.charHeight;
      
      this.buffer.blitFromPage(
        this.page,
        dx, 
        dy, 
        sx, 
        sy, 
        this.charWidth, 
        this.charHeight
      );
    }
  
    /**
     * Draw a whole string of text, left-aligned at (x, y).
     * Advances `charWidth` pixels per character horizontally.
     * If the text contains newlines, it advances `charHeight` pixels vertically
     * for each line.
     */
  drawText(text, x, y) {
      //split on newlines
      const lines = text.split('\n');
      lines.forEach((line, index) => {
        for (let i = 0; i < line.length; i++) {
          this.drawChar(line[i], x + i * this.charWidth, y + index * this.charHeight);
        }
      }
      );
  }

  /**
   * Draw text in a single color by temporarily remapping the glyph color.
   * @param {string} text
   * @param {number} x
   * @param {number} y
   * @param {number} colorIndex - palette index to render with
   */
  drawTextColored(text, x, y, colorIndex) {
    const rb = this.buffer;
    const src = this.glyphColorIndex;

    rb.remapColors([src], [colorIndex]);
    this.drawText(text, x, y);
    rb.resetColorTableToIdentity();
  }
}

export default SpriteFont;

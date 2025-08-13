class TileMap {
  /**
   * @param {SpriteSheet} sheet - spritesheet used for drawing tiles
   * @param {number} width      - map width in tiles
   * @param {number} height     - map height in tiles
   * @param {number[]} tiles    - array of tile indices (length width*height)
   */
  constructor(sheet, width, height, tiles) {
    this.sheet = sheet;
    this.width = width;
    this.height = height;
    this.tiles = tiles;
    this.tileWidth = sheet.spriteWidth;
    this.tileHeight = sheet.spriteHeight;
  }

  draw(offsetX = 0, offsetY = 0) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = this.tiles[y * this.width + x];
        if (idx >= 0) {
          this.sheet.drawSprite(idx, offsetX + x * this.tileWidth, offsetY + y * this.tileHeight);
        }
      }
    }
  }

  getTileAtPixel(px, py) {
    const tx = Math.floor(px / this.tileWidth);
    const ty = Math.floor(py / this.tileHeight);
    if (tx < 0 || ty < 0 || tx >= this.width || ty >= this.height) return -1;
    return this.tiles[ty * this.width + tx];
  }

  setTile(x, y, index) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    this.tiles[y * this.width + x] = index;
  }
}

export default TileMap;

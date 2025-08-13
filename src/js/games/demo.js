// @ts-check
// Demo showcasing RetroBuffer features
import { initAudio, playSound, randFloat, clamp, distance, rand, getMapTile } from '../core/utils.js';
import tada from '../sounds/tada.js';
import SpriteSheet, { scaledSprite } from '../core/SpriteSheet.js';
import TileMap from '../core/TileMap.js';
import ParticleSystem from '../core/ParticleSystem.js';
import Entity from '../core/Entity.js';
import SpatialGrid from '../core/SpatialGrid.js';

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.speed = 120;
  }
  update(dt) {
    const mx = (Key.isDown(Key.LEFT) ? -1 : 0) + (Key.isDown(Key.RIGHT) ? 1 : 0);
    const my = (Key.isDown(Key.UP) ? -1 : 0) + (Key.isDown(Key.DOWN) ? 1 : 0);
    this.x += mx * this.speed * (dt / 1000);
    this.y += my * this.speed * (dt / 1000);
    this.x = Math.max(0, Math.min(screenWidth - sheet.spriteWidth, this.x));
    this.y = Math.max(0, Math.min(screenHeight - sheet.spriteHeight, this.y));
  }
  draw() {
    sheet.drawSprite(1, Math.floor(this.x), Math.floor(this.y));
  }
}

let soundData, soundBank, sheet;
let player, map;
let entities, grid, particles;
let fps = 60;
const FPS_SMOOTH = 0.1;
const MAP_OX = 20;
const MAP_OY = 120;

function initGameData(){
  soundData = [{ name: 'tada', data: tada }];
  soundBank = initAudio(soundData);
}

function initSprites() {
  const page = 0;
  sheet = new SpriteSheet(r, page, 0, 79, 8, 8, 64);
}

function initTileMap() {
  const w = 30, h = 20;
  const data = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let idx = 0; // floor
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) idx = 1; // border
      else if ((x % 6 === 0 && y % 4 === 0) || (x % 7 === 3 && y > 4)) idx = 1; // obstacles
      data.push(idx);
    }
  }
  map = new TileMap(sheet, w, h, data);
}

function initPlayer() {
  player = new Player(screenWidth / 2 - 4, screenHeight / 2 - 4);
}

function initEntities() {
  particles = new ParticleSystem(r);
  grid = new SpatialGrid(screenWidth, screenHeight, 32);
  entities = [];
  for (let i = 0; i < 25; i++) {
    const e = new Entity(randFloat(0, screenWidth), randFloat(0, screenHeight), 4, 36);
    e.vx = randFloat(-40, 40);
    e.vy = randFloat(-40, 40);
    e.ax = randFloat(-10, 10);
    e.ay = randFloat(-10, 10);
    e.id = i;
    entities.push(e);
  }
}

function handleTileCollision(e){
  let bounced = false;
  const left = getMapTile(map, e.x - e.radius, e.y, MAP_OX, MAP_OY);
  if(left === 1 && e.vx < 0){
    e.vx = Math.abs(e.vx);
    e.x = Math.floor((e.x - e.radius - MAP_OX)/map.tileWidth) * map.tileWidth + MAP_OX + map.tileWidth + e.radius;
    bounced = true;
  }
  const right = getMapTile(map, e.x + e.radius, e.y, MAP_OX, MAP_OY);
  if(right === 1 && e.vx > 0){
    e.vx = -Math.abs(e.vx);
    e.x = Math.floor((e.x + e.radius - MAP_OX)/map.tileWidth) * map.tileWidth + MAP_OX - e.radius;
    bounced = true;
  }
  const top = getMapTile(map, e.x, e.y - e.radius, MAP_OX, MAP_OY);
  if(top === 1 && e.vy < 0){
    e.vy = Math.abs(e.vy);
    e.y = Math.floor((e.y - e.radius - MAP_OY)/map.tileHeight) * map.tileHeight + MAP_OY + map.tileHeight + e.radius;
    bounced = true;
  }
  const bottom = getMapTile(map, e.x, e.y + e.radius, MAP_OX, MAP_OY);
  if(bottom === 1 && e.vy > 0){
    e.vy = -Math.abs(e.vy);
    e.y = Math.floor((e.y + e.radius - MAP_OY)/map.tileHeight) * map.tileHeight + MAP_OY - e.radius;
    bounced = true;
  }
  if(bounced) particles.spawn(e.x, e.y, 5);
}

function drawChecker() {
  const size = 16;
  for (let y = 0; y < screenHeight; y += size) {
    for (let x = 0; x < screenWidth; x += size) {
      const c = ((x/size + y/size) & 1) ? 53 : 54;
      r.rectFill(x, y, x + size - 1, y + size - 1, c);
    }
  }
}

function drawPalette() {
  const n = r.paletteCount;
  const sw = Math.ceil(screenWidth / n);
  for (let i = 0; i < n; i++) {
    r.rectFill(i * sw, screenHeight - 4, i * sw + sw - 1, screenHeight - 1, i);
  }
}

function drawShapes() {
  r.line(10, 40, screenWidth - 10, 40, 3);
  r.rectFill(20, 60, 70, 100, 5, 6, 0.5);
  r.ellipseFill(90, 60, 140, 110, 7, 8, 0.5);
  r.triFill([160, 60], [140, 110], [180, 110], 9, 10, 0.5);
}

function drawSprites() {
  const x = screenWidth - 32;
  sheet.drawSprite(0, x, 16);
  sheet.drawSprite(1, x, 32);

  // demonstrate buffer.scaledBlit directly
  r.scaledBlit(
    sheet.page,
    sheet.sheetX,
    sheet.sheetY,
    sheet.spriteWidth,
    sheet.spriteHeight,
    x - 20,
    16,
    sheet.spriteWidth * 2,
    sheet.spriteHeight * 2
  );

  // demonstrate color remapping on sprites
  r.remapColors([3,4,5], [8,9,10]);
  sheet.drawSprite(0, x + 12, 16);
  sheet.drawSprite(1, x + 12, 32);
  r.resetColorTableToIdentity();

  // draw a scaled sprite using helper
  scaledSprite(sheet, 1, x - 20, 48, 2);
}

function drawFontChars() {
  font.drawText(font.indexString, 10, screenHeight - font.charHeight * 2);
  font.drawTextColored('Green Text', 10, 10, 10);
  font.drawTextColored('Blue Text', 10, 20, 22);
  
}

function drawAll() {
  drawChecker();
  map.draw(MAP_OX, MAP_OY);
  drawPalette();
  drawShapes();
  drawSprites();
  drawFontChars();
  player.draw();
  for (const e of entities) e.draw(r);
  particles.draw();
  font.drawTextColored(`FPS: ${fps.toFixed(1)}`, 4, 4, 2);
}

export default {
  init({ r:buf, Key:K, screenWidth:w, screenHeight:h, gameFont }) {
    r = buf; Key = K; font = gameFont; screenWidth = w; screenHeight = h;
    initGameData();
    initSprites();
    initTileMap();
    initPlayer();
    initEntities();
    this.over = false;
  },

  titleUpdate(dt) {},
  titleDraw() { drawAll(); },

  update(dt) {
    if (Key.justReleased(Key.r)) playSound(soundBank.tada);
    const frameFPS = 1000 / dt;
    fps = fps + (frameFPS - fps) * FPS_SMOOTH;
    player.update(dt);
    grid.reset();
    for (const e of entities) {
      e.update(dt);
      let bounced = false;
      if (e.x - e.radius < 0 || e.x + e.radius > screenWidth) {
        e.vx *= -1;
        e.x = clamp(e.x, e.radius, screenWidth - e.radius);
        bounced = true;
      }
      if (e.y - e.radius < 0 || e.y + e.radius > screenHeight) {
        e.vy *= -1;
        e.y = clamp(e.y, e.radius, screenHeight - e.radius);
        bounced = true;
      }
      handleTileCollision(e);
      if (bounced) particles.spawn(e.x, e.y, 5);
      grid.insert(e);
    }
    for (const e of entities) {
      for (const other of grid.queryNearby(e)) {
        if (other === e || other.id <= e.id) continue;
        if (distance(e.x, e.y, other.x, other.y) < e.radius + other.radius) {
          const cx = (e.x + other.x) / 2;
          const cy = (e.y + other.y) / 2;
          particles.spawn(cx, cy, rand(5,10), 4);
          e.vx *= -1; e.vy *= -1;
          other.vx *= -1; other.vy *= -1;
        }
      }
    }
    particles.update(dt);
  },

  draw() { drawAll(); },

  gameOverUpdate(dt) {},
  gameOverDraw() { drawAll(); }
};

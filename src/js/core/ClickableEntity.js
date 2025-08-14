// ClickableEntity.js
// Simple axis-aligned rectangle that can be clicked/toggled and drawn into a RetroBuffer
export default class ClickableEntity {
  constructor(x, y, w, h, colorA = 10, colorB = 12) {
    this.x = x | 0;
    this.y = y | 0;
    this.w = w | 0;
    this.h = h | 0;
    this.colorA = colorA;
    this.colorB = colorB;
    this.active = false;
  }

  contains(px, py) {
    return px >= this.x && px < this.x + this.w && py >= this.y && py < this.y + this.h;
  }

  onClick() {
    this.active = !this.active;
  }

  // draw into a RetroBuffer instance (expects rectFill API)
  draw(buf) {
    const c = this.active ? this.colorB : this.colorA;
    buf.rectFill(this.x, this.y, this.x + this.w - 1, this.y + this.h - 1, c);
  }

  // expose bounds for simple raycast/overlap checks
  getBounds() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }
}

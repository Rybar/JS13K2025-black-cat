// Mirror.js
// Axis-aligned object that reflects an incoming ray at a 45-degree angle.
// The reflected ray endpoint along the reflected direction is controlled by the cursor distance from the mirror.
export default class Mirror {
  constructor(x, y, w = 8, h = 8, color = 14) {
    this.x = x | 0;
    this.y = y | 0;
    this.w = w | 0;
    this.h = h | 0;
    this.color = color;
    // mirror angle: +45 or -45 degrees relative to horizontal. We'll allow flipping.
    this.flipped = false; // false -> reflect like /, true -> reflect like \
  this.isMirror = true;
  }

  // check if a point is inside the mirror bounds
  contains(px, py) {
    return px >= this.x && px < this.x + this.w && py >= this.y && py < this.y + this.h;
  }

  // expose bounds for raycasts
  getBounds() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  // draw the mirror as a filled box with a diagonal line indicating angle
  draw(buf) {
    // filled background
    buf.rectFill(this.x, this.y, this.x + this.w - 1, this.y + this.h - 1, this.color);
    // diagonal indicator
    const col = this.color ^ 6;
    if (this.flipped) {
      buf.line(this.x, this.y, this.x + this.w - 1, this.y + this.h - 1, col);
    } else {
      buf.line(this.x + this.w - 1, this.y, this.x, this.y + this.h - 1, col);
    }
  }

  // Reflect an incoming ray given an actual hit point and incoming direction.
  // hitX,hitY: where the ray intersects the mirror (sampled inside bounds)
  // inDx,inDy: incoming direction vector
  // tx,ty: cursor position used to control reflected endpoint distance
  // Returns { hit: {x,y,entity}, endX, endY, reflectDir }
  reflect(hitX, hitY, inDx, inDy, tx, ty, screenW = 240, screenH = 135) {
  // normal must be perpendicular to the mirror's diagonal line drawn
  // for a '/' (not flipped) diagonal the normal is (1,1)/sqrt2
  // for a '\\' (flipped) diagonal the normal is (1,-1)/sqrt2
  const n = this.flipped ? { x: 1 / Math.sqrt(2), y: -1 / Math.sqrt(2) } : { x: 1 / Math.sqrt(2), y: 1 / Math.sqrt(2) };
    const len = Math.hypot(inDx, inDy) || 1;
    const id = { x: inDx / len, y: inDy / len };
    const dot = id.x * n.x + id.y * n.y;
    const rx = id.x - 2 * dot * n.x;
    const ry = id.y - 2 * dot * n.y;

    // mirror center used for cursor distance scaling
    const mx = this.x + Math.floor(this.w / 2);
    const my = this.y + Math.floor(this.h / 2);
    const cursorDist = Math.hypot(tx - mx, ty - my) || 1;

    // project from the actual hit point along reflected direction
    const endX = Math.round(hitX + rx * cursorDist);
    const endY = Math.round(hitY + ry * cursorDist);

    const cex = Math.max(0, Math.min(screenW - 1, endX));
    const cey = Math.max(0, Math.min(screenH - 1, endY));

    return { hit: { x: hitX, y: hitY, entity: this }, endX: cex, endY: cey, reflectDir: { x: rx, y: ry } };
  }

  // toggle mirror orientation when clicked
  onClick() {
    this.flipped = !this.flipped;
  }
  // laser hits on a mirror do not toggle it
  onLaserHit() {
    // no-op
  }
}

// LaserTurret.js
// Simple turret that can draw itself and fire a beam from its center to a target point.
// Uses simple AABB intersection tests for raycast against entities that expose getBounds().

export default class LaserTurret {
  constructor(x, y, w = 8, h = 8, color = 48) {
    this.x = x | 0;
    this.y = y | 0;
    this.w = w | 0;
    this.h = h | 0;
    this.color = color;
  // last shot info for drawing beam and hit point
  // {tx, ty, endX, endY, hit: {x,y,entity}, cx, cy}
  this.lastShot = null;
  }

  center() {
    return { x: this.x + Math.floor(this.w/2), y: this.y + Math.floor(this.h/2) };
  }

  draw(buf) {
    // draw turret as filled rect
    buf.rectFill(this.x, this.y, this.x + this.w - 1, this.y + this.h - 1, this.color);

    // draw beam and hit marker if we recently fired
    if (this.lastShot) {
      const s = this.lastShot;
      // draw thin line 
      const beamColor = 36;
      // draw beam to computed end point
      buf.line(s.cx, s.cy, s.endX, s.endY, beamColor);
      // draw marker for the first hit if present
      if (s.hit && typeof s.hit.x === 'number') {
        buf.ellipseFill(s.hit.x - 2, s.hit.y - 2, s.hit.x + 2, s.hit.y + 2, beamColor);
      }
    }
  }

  // Fire towards target (tx,ty). entities is an array of objects with getBounds().
  fireAt(tx, ty, entities = []) {
    const c = this.center();
    const cx = c.x, cy = c.y;

    // normalize direction vector
    const dx = tx - cx;
    const dy = ty - cy;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;

    // step along the ray in integer increments until out of bounds or first hit
    let x = cx, y = cy;
    let hit = null;
    const maxSteps = Math.max(300, Math.ceil(dist) + 10);

    for (let i = 0; i < maxSteps; i++) {
      x = Math.round(cx + nx * i);
      y = Math.round(cy + ny * i);

      // check bounds for entities and stop at first hit
      for (let e of entities) {
        if (!e || !e.getBounds) continue;
        const b = e.getBounds();
        if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) {
          hit = { x, y, entity: e };
          break;
        }
      }
      if (hit) {
        break;
      }

      // stop if outside typical retro area (assume 0..239,0..134)
      if (x < 0 || x >= 240 || y < 0 || y >= 135) break;
    }

    // endpoint of beam is either hit point or last sampled point
    const endX = (hit ? hit.x : x);
    const endY = (hit ? hit.y : y);

    this.lastShot = { cx, cy, tx, ty, endX, endY, hit };
    return this.lastShot;
  }
}

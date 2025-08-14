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
      if (s.segments && s.segments.length) {
        for (let seg of s.segments) {
          buf.line(seg.sx, seg.sy, seg.ex, seg.ey, beamColor);
        }
      } else {
        buf.line(s.cx, s.cy, s.endX, s.endY, beamColor);
      }
      // draw markers for all hits (first hit kept for legacy behavior)
      if (s.hits && s.hits.length) {
        for (let h of s.hits) {
          if (h && typeof h.x === 'number') {
            buf.ellipseFill(h.x - 2, h.y - 2, h.x + 2, h.y + 2, beamColor);
          }
        }
      }
    }
  }

  // Fire towards target (tx,ty). entities is an array of objects with getBounds().
  // screenW/screenH are optional and default to legacy 240x135 if not provided.
  fireAt(tx, ty, entities = [], screenW = 240, screenH = 135) {
    const c = this.center();
    const cx = c.x, cy = c.y;
    // helpers: ray-AABB intersection (returns tmin,tmax or null)
    function rayAABB(origX, origY, dirX, dirY, bx, by, bw, bh) {
      const invdx = 1 / dirX;
      const invdy = 1 / dirY;
      let t1 = (bx - origX) * invdx;
      let t2 = (bx + bw - origX) * invdx;
      let tmin = Math.min(t1, t2);
      let tmax = Math.max(t1, t2);
      t1 = (by - origY) * invdy;
      t2 = (by + bh - origY) * invdy;
      tmin = Math.max(tmin, Math.min(t1, t2));
      tmax = Math.min(tmax, Math.max(t1, t2));
      if (tmax >= Math.max(0, tmin)) return { tmin, tmax };
      return null;
    }

    // helpers: ray-segment intersection (segment p1->p2). Returns t along ray and u along segment or null
    function raySegmentIntersect(ox, oy, dx, dy, x1, y1, x2, y2) {
      // Solve: ox + t*dx = x1 + u*(x2-x1); oy + t*dy = y1 + u*(y2-y1)
      const rx = dx, ry = dy;
      const sx = x2 - x1, sy = y2 - y1;
      const denom = rx * sy - ry * sx;
      if (Math.abs(denom) < 1e-6) return null; // parallel
      const t = ((x1 - ox) * sy - (y1 - oy) * sx) / denom;
      const u = ((x1 - ox) * ry - (y1 - oy) * rx) / denom;
      if (t >= 0 && u >= 0 && u <= 1) return { t, u };
      return null;
    }

    const maxReflections = 3;
    const segments = [];
    const hits = [];

    let originX = cx, originY = cy;
    let dirX = tx - cx, dirY = ty - cy;

    for (let rcount = 0; rcount <= maxReflections; rcount++) {
      // find nearest intersection among entities
      let nearest = null; // {t,x,y,entity,type,extra}
      for (let e of entities) {
        if (!e || typeof e.getBounds !== 'function') continue;
        const b = e.getBounds();
        if (!b) continue;
        if (e.isMirror) {
          // compute mirror segment endpoints (diagonal across bounds)
          let x1, y1, x2, y2;
          if (e.flipped) {
            // \ diagonal from top-left to bottom-right
            x1 = b.x; y1 = b.y; x2 = b.x + b.w; y2 = b.y + b.h;
          } else {
            // / diagonal from top-right to bottom-left
            x1 = b.x + b.w; y1 = b.y; x2 = b.x; y2 = b.y + b.h;
          }
          const isect = raySegmentIntersect(originX, originY, dirX, dirY, x1, y1, x2, y2);
          if (isect) {
            const ix = originX + dirX * isect.t;
            const iy = originY + dirY * isect.t;
            if (isect.t >= 0 && (nearest === null || isect.t < nearest.t)) {
              nearest = { t: isect.t, x: ix, y: iy, entity: e, type: 'mirror', seg: { x1, y1, x2, y2 } };
            }
          }
        } else {
          // regular AABB intersection
          const res = rayAABB(originX, originY, dirX, dirY, b.x, b.y, b.w, b.h);
          if (res && res.tmin >= 0) {
            const t = res.tmin;
            const ix = originX + dirX * t;
            const iy = originY + dirY * t;
            if (nearest === null || t < nearest.t) {
              nearest = { t, x: ix, y: iy, entity: e, type: 'aabb' };
            }
          }
        }
      }

      if (nearest) {
        // segment from origin to intersection point
        segments.push({ sx: originX, sy: originY, ex: nearest.x, ey: nearest.y });
        hits.push({ x: Math.round(nearest.x), y: Math.round(nearest.y), entity: nearest.entity });

        if (nearest.type === 'mirror') {
          // compute reflection direction based on mirror normal
          // mirror.reflect expects hitX,hitY and incoming dir (use dirX,dirY)
          const refl = nearest.entity.reflect(nearest.x, nearest.y, dirX, dirY, tx, ty, screenW, screenH);
          if (refl && refl.reflectDir) {
            // offset origin slightly along reflected dir and set new dir vector towards reflected endpoint
            const eps = 0.5;
            originX = nearest.x + refl.reflectDir.x * eps;
            originY = nearest.y + refl.reflectDir.y * eps;
            dirX = refl.endX - originX;
            dirY = refl.endY - originY;
            continue; // trace next reflection
          } else {
            break; // no reflection, stop
          }
        } else {
          // hit a normal object, stop
          break;
        }
      }

      // no intersection -> segment to target or off-screen
      // compute end as either target point or screen edge
      const endX = originX + dirX;
      const endY = originY + dirY;
      segments.push({ sx: originX, sy: originY, ex: endX, ey: endY });
      break;
    }

    const firstHit = hits.length ? hits[0] : null;
    const lastSeg = segments.length ? segments[segments.length - 1] : { ex: tx, ey: ty };
    this.lastShot = { cx, cy, tx, ty, endX: lastSeg.ex, endY: lastSeg.ey, hit: firstHit, hits, segments };
    return this.lastShot;
  }
}

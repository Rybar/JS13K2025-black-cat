export default class Entity {
  constructor(x = 0, y = 0, radius = 4, color = 36) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.ax = 0;
    this.ay = 0;
    this.radius = radius;
    this.color = color;
    this.id = 0;
  }

  update(dt) {
    const t = dt / 1000;
    this.vx += this.ax * t;
    this.vy += this.ay * t;
    this.x += this.vx * t;
    this.y += this.vy * t;
  }

  draw(buffer) {
    buffer.ellipseFill(
      this.x - this.radius,
      this.y - this.radius,
      this.x + this.radius,
      this.y + this.radius,
      this.color,
      this.color,
      0.5
    );
  }
}

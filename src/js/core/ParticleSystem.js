export default class ParticleSystem {
  constructor(buffer) {
    this.buffer = buffer;
    this.particles = [];
  }

  spawn(x, y, count = 1, color = 6) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 60,
        vy: (Math.random() - 0.5) * 60,
        life: 1,
        age: 0,
        radius: 3,
        color
      });
    }
  }

  update(dt) {
    const t = dt / 1000;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * t;
      p.y += p.vy * t;
      p.age += t;
      if (p.age >= p.life) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw() {
    for (const p of this.particles) {
      const k = 1 - p.age / p.life;
      const size = p.radius * k;
      this.buffer.ellipseFill(
        p.x - size,
        p.y - size,
        p.x + size,
        p.y + size,
        p.color,
        p.color,
        0.5
      );
    }
  }
}

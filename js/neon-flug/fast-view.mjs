import { wallIndices, wallSegment, clipNear, splitWall } from "./scenery.mjs";
import { LEVELS, routeCache, eventX, clamp, LANE_WIDTH } from "./core.mjs";

// Perspektivischer Canvas-Renderer: vorberechnete Motive statt teurer Echtzeit-Shader.
function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
function shipSprite(color) {
  const c = canvas(360, 240),
    g = c.getContext("2d");
  g.translate(180, 110);
  const hull = g.createLinearGradient(-110, -70, 90, 70);
  hull.addColorStop(0, "#f4eee0");
  hull.addColorStop(0.3, "#b6cbd2");
  hull.addColorStop(0.55, "#e4e9e7");
  hull.addColorStop(1, "#405c6b");
  const poly = (points, fill, stroke) => {
    g.beginPath();
    points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    if (stroke) {
      g.strokeStyle = stroke;
      g.lineWidth = 1;
      g.stroke();
    }
  };
  for (const side of [-1, 1]) {
    poly(
      [
        [side * 13, -75],
        [side * 30, -14],
        [side * 149, 38],
        [side * 141, 57],
        [side * 33, 33],
        [side * 21, 65],
      ],
      hull,
      "#90a8af",
    );
    poly(
      [
        [side * 35, 7],
        [side * 133, 40],
        [side * 111, 42],
        [side * 31, 22],
      ],
      "#263f4c",
    );
    poly(
      [
        [side * 42, 9],
        [side * 124, 39],
        [side * 111, 40],
        [side * 39, 16],
      ],
      color,
    );
    poly(
      [
        [side * 26, 30],
        [side * 50, 28],
        [side * 53, 62],
        [side * 28, 66],
      ],
      "#1d3542",
    );
    g.fillStyle = "#65838d";
    g.fillRect(side * 36 - 7, 40, 14, 24);
    g.fillStyle = color;
    g.fillRect(side * 36 - 6, 57, 12, 4);
    poly(
      [
        [side * 48, 12],
        [side * 57, -8],
        [side * 63, 32],
        [side * 53, 38],
      ],
      hull,
    );
  }
  poly(
    [
      [0, -87],
      [-18, -38],
      [-24, 26],
      [-14, 61],
      [14, 61],
      [24, 26],
      [18, -38],
    ],
    hull,
    "#c4d2ce",
  );
  const glass = g.createLinearGradient(0, -54, 0, 12);
  glass.addColorStop(0, "#8fb8bd");
  glass.addColorStop(0.35, "#244d67");
  glass.addColorStop(1, "#102e42");
  poly(
    [
      [0, -61],
      [-11, -30],
      [-12, 6],
      [0, 18],
      [12, 6],
      [11, -30],
    ],
    glass,
    "#a4c4c7",
  );
  g.strokeStyle = "#e8f4e7";
  g.globalAlpha = 0.7;
  g.beginPath();
  g.moveTo(0, -79);
  g.lineTo(-14, -32);
  g.stroke();
  g.globalAlpha = 1;
  for (let i = 0; i < 4; i++) {
    g.fillStyle = "#233d4c";
    g.fillRect(-9, 25 + i * 6, 18, 2);
  }
  return c;
}
export class FastFlightView {
  constructor(container) {
    this.canvas = canvas(innerWidth, innerHeight);
    this.ctx = this.canvas.getContext("2d", { alpha: false });
    if (!this.ctx) throw Error("Canvas-Darstellung ist nicht verfügbar.");
    container.append(this.canvas);
    this.backend = "Canvas2D · perspektivischer Schnellmodus";
    this.ratio = 1;
    this.reduced = false;
    this.low = false;
    this.clock = 0;
    this.level = -1;
    this.cameraX = 0;
    this.positions = [-3.2, 3.2];
    this.banks = [0, 0];
    this.effects = [];
    this.texture = null;
    this.texturePattern = null;
    this.textureSize = 512;
    this.sprite = [shipSprite("#81e9df"), shipSprite("#f9ae70")];
    this.renderer = {
      domElement: this.canvas,
      info: { render: { calls: null, triangles: null } },
      getPixelRatio: () => this.ratio,
    };
    const image = new Image();
    image.onload = () => {
      const tile = canvas(this.textureSize, this.textureSize);
      tile
        .getContext("2d")
        .drawImage(image, 0, 0, this.textureSize, this.textureSize);
      this.texture = tile;
      this.texturePattern = this.ctx.createPattern(tile, "repeat");
    };
    image.src = "/assets/neon-flug/basalt-v1.webp";
    this.resize = () => {
      this.w = innerWidth;
      this.h = innerHeight;
      this.canvas.width = Math.round(this.w * this.ratio);
      this.canvas.height = Math.round(this.h * this.ratio);
      this.background = null;
    };
    addEventListener("resize", this.resize);
    this.resize();
  }
  quality(mode) {
    const ratio = mode === "low" ? 0.8 : Math.min(devicePixelRatio, 1.25);
    this.low = mode === "low";
    if (this.ratio !== ratio) {
      this.ratio = ratio;
      this.resize();
    }
  }
  setLevel(level) {
    if (this.level !== level) {
      this.level = level;
      this.background = null;
    }
  }
  project(x, y, z) {
    const d = 13 - z;
    if (d < 2) return null;
    const f = this.h * 0.88;
    return {
      x: this.w * 0.5 + ((x - this.cameraX) * f) / d,
      y: this.h * 0.34 + ((4.3 - y) * f) / d,
      k: f / d,
    };
  }
  polygon(points, color) {
    if (points.some((p) => !p)) return;
    const g = this.ctx;
    g.beginPath();
    points.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
    g.closePath();
    g.fillStyle = color;
    g.fill();
  }
  texturedTriangle(a, b, c) {
    if (!this.texturePattern) return;
    const scale = this.textureSize / 18,
      u0 = a.u * scale,
      v0 = a.v * scale,
      u1 = b.u * scale,
      v1 = b.v * scale,
      u2 = c.u * scale,
      v2 = c.v * scale;
    const du1 = u1 - u0,
      dv1 = v1 - v0,
      du2 = u2 - u0,
      dv2 = v2 - v0,
      den = du1 * dv2 - du2 * dv1;
    if (Math.abs(den) < 1e-8) return;
    const ax = ((b.x - a.x) * dv2 - (c.x - a.x) * dv1) / den,
      bx = ((c.x - a.x) * du1 - (b.x - a.x) * du2) / den;
    const ay = ((b.y - a.y) * dv2 - (c.y - a.y) * dv1) / den,
      by = ((c.y - a.y) * du1 - (b.y - a.y) * du2) / den;
    const g = this.ctx;
    g.save();
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);
    g.lineTo(c.x, c.y);
    g.closePath();
    g.clip();
    g.transform(
      ax,
      ay,
      bx,
      by,
      a.x - ax * u0 - bx * v0,
      a.y - ay * u0 - by * v0,
    );
    g.globalAlpha = 0.63;
    g.fillStyle = this.texturePattern;
    const left = Math.min(u0, u1, u2),
      top = Math.min(v0, v1, v2);
    g.fillRect(
      left - 1,
      top - 1,
      Math.max(u0, u1, u2) - left + 2,
      Math.max(v0, v1, v2) - top + 2,
    );
    g.restore();
  }
  worldPolygon(vertices, color, textured = false) {
    const clipped = clipNear(vertices);
    if (clipped.length < 3) return;
    const projected = clipped.map((p) => ({
      ...this.project(p.x, p.y, p.z),
      u: p.u,
      v: p.v,
    }));
    if (
      projected.every((p) => p.x < 0) ||
      projected.every((p) => p.x > this.w) ||
      projected.every((p) => p.y < 0) ||
      projected.every((p) => p.y > this.h)
    )
      return;
    this.polygon(projected, color);
    if (textured)
      for (let i = 1; i < projected.length - 1; i++)
        this.texturedTriangle(projected[0], projected[i], projected[i + 1]);
  }
  sky() {
    if (!this.background) {
      const c = canvas(this.w, this.h),
        g = c.getContext("2d"),
        l = this.level,
        pal =
          l === 0
            ? ["#101e30", "#685044", "#d7a170"]
            : l === 1
              ? ["#071d30", "#335363", "#92a7a3"]
              : ["#0b102c", "#3a315c", "#82708c"];
      const gradient = g.createLinearGradient(0, 0, 0, this.h * 0.58);
      gradient.addColorStop(0, pal[0]);
      gradient.addColorStop(0.65, pal[1]);
      gradient.addColorStop(1, pal[2]);
      g.fillStyle = gradient;
      g.fillRect(0, 0, this.w, this.h);
      const sx = this.w * 0.32,
        sy = this.h * 0.34,
        r = this.h * 0.17,
        glow = g.createRadialGradient(sx, sy, 0, sx, sy, r);
      glow.addColorStop(0, l === 0 ? "#ffdda8" : "#b6d5e788");
      glow.addColorStop(0.15, l === 0 ? "#efbb78aa" : "#92a4c766");
      glow.addColorStop(1, "#d6925000");
      g.fillStyle = glow;
      g.fillRect(sx - r, sy - r, r * 2, r * 2);
      for (let band = 0; band < 3; band++) {
        g.beginPath();
        g.moveTo(0, this.h * 0.5);
        for (let x = 0; x <= this.w + 30; x += 30) {
          const y =
            this.h * (0.37 + band * 0.026) +
            Math.sin(x * 0.006 + band * 3) * this.h * 0.03 +
            Math.sin(x * 0.031 + band) * this.h * 0.012;
          g.lineTo(x, y);
        }
        g.lineTo(this.w, this.h);
        g.lineTo(0, this.h);
        g.closePath();
        g.fillStyle = ["#273543", "#20313d", "#162c39"][band];
        g.fill();
      }
      if (l === 2) {
        g.fillStyle = "#e6e4dc88";
        for (let i = 0; i < 65; i++) {
          const x = (Math.sin(i * 13.17) * 0.5 + 0.5) * this.w,
            y = (Math.cos(i * 9.7) * 0.5 + 0.5) * this.h * 0.28;
          g.fillRect(x, y, i % 5 === 0 ? 2 : 1, 1);
        }
      }
      this.background = c;
    }
    this.ctx.drawImage(this.background, 0, 0);
  }
  burst(x, color) {
    for (let i = 0; i < 10; i++)
      this.effects.push({
        x,
        y: 0.7,
        z: 0,
        vx: (Math.random() - 0.5) * 8,
        vy: Math.random() * 5,
        vz: Math.random() * 7,
        life: 1,
        color: "#" + color.toString(16).padStart(6, "0"),
      });
  }
  ring(x, z, color) {
    const p = this.project(x, 0.7, z);
    if (!p || p.k < 0.4) return;
    const r = 2 * p.k;
    if (p.x + r < 0 || p.x - r > this.w || p.y + r < 0 || p.y - r > this.h)
      return;
    const g = this.ctx;
    g.beginPath();
    g.ellipse(p.x, p.y, r, r * 0.94, 0, 0, Math.PI * 2);
    g.lineWidth = Math.max(1, r * 0.085);
    g.strokeStyle = "#152e3b";
    g.stroke();
    g.lineWidth = Math.max(1, r * 0.035);
    g.strokeStyle = color;
    g.stroke();
    g.beginPath();
    g.arc(p.x, p.y, r * 0.89, -Math.PI * 0.85, -Math.PI * 0.25);
    g.strokeStyle = "#e4e5cf";
    g.lineWidth = Math.max(1, r * 0.018);
    g.stroke();
  }
  update(s, local, mode, dt) {
    dt = clamp(dt, 0, 0.15);
    this.clock += dt;
    this.setLevel(s?.level || 0);
    const g = this.ctx;
    g.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    this.w = innerWidth;
    this.h = innerHeight;
    const playing =
        s &&
        ["playing", "paused", "result", "victory", "failed"].includes(s.phase),
      t = playing ? s.t : this.clock * 0.15,
      travel = t * 22;
    const target = s?.players[local]?.x || 0;
    this.cameraX += (target * 0.16 - this.cameraX) * Math.min(1, dt * 4);
    this.sky();
    const water = g.createLinearGradient(0, this.h * 0.34, 0, this.h);
    water.addColorStop(0, "#233c46");
    water.addColorStop(0.45, "#163340");
    water.addColorStop(1, "#0b2535");
    g.fillStyle = water;
    g.fillRect(0, this.h * 0.49, this.w, this.h * 0.51);
    g.strokeStyle = this.level === 0 ? "#cda47b38" : "#85bbcc30";
    g.lineWidth = 1;
    const waveStart = Math.floor(travel / 13);
    for (let i = 0; i < 28; i++) {
      const index = waveStart + i,
        z = travel - index * 13;
      const a = this.project(-9 + Math.sin(index * 2.3) * 4, -4.5, z),
        b = this.project(6 + Math.sin(index * 1.3) * 5, -4.5, z - 1.5);
      if (a && b) {
        g.beginPath();
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);
        g.stroke();
      }
    }
    // Stabile Weltabschnitte, gemeinsame Kanten und UVs; kein Neuformen beim Nachladen.
    const indices = wallIndices(travel, this.low ? 300 : 360);
    for (let i = indices.length - 1; i >= 0; i--) {
      for (const side of [-1, 1]) {
        const segment = wallSegment(travel, indices[i], side, this.level);
        this.worldPolygon(segment.face, side < 0 ? "#263039" : "#4a3d32");
        if (this.texturePattern && !this.low)
          for (const strip of splitWall(segment.face, 2))
            this.worldPolygon(strip, "rgba(0,0,0,0)", true);
        this.worldPolygon(segment.roof, side < 0 ? "#36434a" : "#6a5641");
        const haze = clamp(-segment.face[3].z / 430, 0, 0.8);
        this.worldPolygon(segment.face, `rgba(51,65,73,${haze * 0.65})`);
      }
    }
    const arch = this.project(0, 15, -285);
    if (arch) {
      g.strokeStyle = this.level === 2 ? "#c5a6d7" : "#789491";
      g.globalAlpha = 0.55;
      g.lineWidth = Math.max(1, arch.k * 1.4);
      g.beginPath();
      g.arc(arch.x, arch.y, arch.k * 23, Math.PI, Math.PI * 2);
      g.stroke();
      g.globalAlpha = 1;
    }
    if (playing) {
      for (const e of routeCache[this.level]) {
        const z = -(e.t - t) * 22;
        if (z > 8 || z < -340) continue;
        if (e.type === "duet") {
          this.ring(-LANE_WIDTH, z, "#9aeee0");
          this.ring(LANE_WIDTH, z, "#ffb77e");
        } else if (e.type === "ring")
          this.ring(eventX(e, t), z, e.bonus ? "#ffd786" : "#b8f2dd");
        else {
          const x = eventX(e, t),
            a = this.project(x - 1.35, -4, z),
            b = this.project(x + 1.35, 4, z);
          if (!a || !b) continue;
          const shade = g.createLinearGradient(a.x, 0, b.x, 0);
          shade.addColorStop(0, "#213039");
          shade.addColorStop(0.5, "#5b3c42");
          shade.addColorStop(1, "#1c2e38");
          g.fillStyle = shade;
          g.fillRect(a.x, b.y, b.x - a.x, a.y - b.y);
          g.strokeStyle = "#ee987e";
          g.lineWidth = Math.max(1, (b.x - a.x) * 0.035);
          for (let k = 0; k < 4; k++) {
            const y = b.y + (a.y - b.y) * (0.2 + k * 0.17);
            g.beginPath();
            g.moveTo(a.x, y);
            g.lineTo(b.x, y);
            g.stroke();
          }
        }
      }
      const goalZ = -Math.max(-12, (LEVELS[this.level].duration - t) * 22);
      if (goalZ > -340) {
        const goal = this.project(0, 8, goalZ);
        if (goal) {
          g.strokeStyle = "#f8d6a4";
          g.globalAlpha = 0.6;
          g.lineWidth = Math.max(2, goal.k * 0.4);
          g.beginPath();
          g.moveTo(goal.x, Math.max(0, goal.y - goal.k * 80));
          g.lineTo(goal.x, goal.y + goal.k * 10);
          g.stroke();
          g.globalAlpha = 1;
        }
      }
    }
    const points = [];
    for (let i = 0; i < 2; i++) {
      const p = s?.players[i],
        x = p?.x ?? (i ? 3.2 : -3.2),
        prev = this.positions[i];
      this.positions[i] += (x - this.positions[i]) * Math.min(1, dt * 18);
      this.banks[i] +=
        (clamp(
          ((this.positions[i] - prev) / Math.max(dt, 0.001)) * 0.025,
          -0.2,
          0.2,
        ) -
          this.banks[i]) *
        Math.min(1, dt * 8);
      points[i] = this.project(
        this.positions[i],
        0.65,
        i === local ? 1.2 : -4.8,
      );
    }
    if (playing && points.every(Boolean)) {
      g.strokeStyle = s.overdrive > 0 ? "#ffe2a8" : "#98e5dd";
      g.globalAlpha = 0.25 + (s.resonance || 0) * 0.005;
      g.lineWidth = s.overdrive > 0 ? 2 : 1;
      g.beginPath();
      g.moveTo(points[0].x, points[0].y);
      g.quadraticCurveTo(
        (points[0].x + points[1].x) * 0.5,
        Math.min(points[0].y, points[1].y) - 12,
        points[1].x,
        points[1].y,
      );
      g.stroke();
      g.globalAlpha = 1;
    }
    // Partner voraus, eigener Gleiter zuletzt und stets sichtbar.
    for (const i of [1 - local, local]) {
      const p = s?.players[i],
        pos = points[i];
      if (!pos) continue;
      const size = pos.k * 4.8,
        boost = p?.dash > 0 || s?.overdrive > 0;
      g.save();
      g.translate(pos.x, pos.y);
      g.rotate(p?.hp === 0 ? 0.6 : this.banks[i]);
      if (playing && p?.hp > 0) {
        const len = boost ? size * 0.8 : size * 0.35;
        for (const side of [-1, 1]) {
          const flame = g.createLinearGradient(
            0,
            size * 0.16,
            0,
            size * 0.16 + len,
          );
          flame.addColorStop(0, i ? "#ffd6a7" : "#d1fff5");
          flame.addColorStop(0.2, i ? "#eeb177aa" : "#86dddb88");
          flame.addColorStop(1, "#8abacb00");
          g.fillStyle = flame;
          g.beginPath();
          g.moveTo(side * size * 0.1 - size * 0.025, size * 0.16);
          g.lineTo(side * size * 0.1 + size * 0.025, size * 0.16);
          g.lineTo(side * size * 0.1, size * 0.16 + len);
          g.closePath();
          g.fill();
        }
      }
      g.drawImage(
        this.sprite[i],
        -size * 0.5,
        -size * 0.305,
        size,
        (size * 2) / 3,
      );
      if (p?.inv > 0 && p.hp > 0) {
        g.strokeStyle = i ? "#f7c797" : "#a5eee2";
        g.globalAlpha = 0.35;
        g.lineWidth = 1;
        g.beginPath();
        g.ellipse(0, 0, size * 0.47, size * 0.23, 0, 0, Math.PI * 2);
        g.stroke();
        g.globalAlpha = 1;
      }
      g.restore();
    }
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      e.life -= dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.z += e.vz * dt;
      const p = this.project(e.x, e.y, e.z);
      if (p) {
        g.globalAlpha = Math.max(0, e.life);
        g.fillStyle = e.color;
        g.fillRect(p.x, p.y, Math.max(1, p.k * 0.06), Math.max(1, p.k * 0.06));
        g.globalAlpha = 1;
      }
      if (e.life <= 0) this.effects.splice(i, 1);
    }
    if (this.level === 1 && !this.reduced && !this.low) {
      g.strokeStyle = "#a5d4df44";
      g.lineWidth = 1;
      g.beginPath();
      for (let i = 0; i < 28; i++) {
        const x = (i * 97 + this.clock * 80) % this.w,
          y = (i * 61 + this.clock * 380) % this.h;
        g.moveTo(x, y);
        g.lineTo(x - 4, y + 17);
      }
      g.stroke();
    }
  }
}

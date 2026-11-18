import { WORLD, clamp, ladders, num } from "./data.js";
import { createRun, step, STEP } from "./physics.js";
import { art } from "./art.js";
import { icon, coinIcon } from "./icons.js";

const loadImage = (url) =>
  new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Не удалось загрузить иллюстрацию"));
    i.src = url;
  });
let atlasImages;
async function images() {
  if (!atlasImages)
    atlasImages = Promise.all(
      [art.level, ...art.hero, art.cast, art.blue, art.rose, art.coin].map(
        loadImage,
      ),
    )
      .then(([background, ...s]) => ({
        background,
        run: s.slice(0, 7),
        cast: s[7],
        blue: s[8],
        rose: s[9],
        coin: s[10],
      }))
      .catch((e) => {
        atlasImages = null;
        throw e;
      });
  return atlasImages;
}
const bindings = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  Space: "jump",
  KeyF: "cast",
};
export class Platformer {
  constructor(sound, settings, callbacks) {
    this.canvas = document.querySelector("#game-canvas");
    this.ctx = this.canvas.getContext("2d", { alpha: false });
    this.sound = sound;
    this.settings = settings;
    this.callbacks = callbacks;
    this.held = new Set();
    this.pressed = new Set();
    this.touch = new Map();
    this.serial = 0;
    this.active = false;
    this.paused = false;
    this.frame = this.frame.bind(this);
    this.observer = new ResizeObserver(() => {
      if (this.active) {
        this.resize();
        this.draw();
      }
    });
    this.observer.observe(this.canvas);
    window.addEventListener("keydown", (e) => {
      if (!this.active || this.paused || document.querySelector("dialog[open]"))
        return;
      const action = bindings[e.code];
      if (!action) return;
      e.preventDefault();
      if (!this.held.has(e.code)) this.pressed.add(action);
      this.held.add(e.code);
    });
    window.addEventListener("keyup", (e) => this.held.delete(e.code));
    for (const b of document.querySelectorAll("[data-press]")) {
      b.addEventListener("pointerdown", (e) => {
        if (!this.active || this.paused) return;
        e.preventDefault();
        b.setPointerCapture(e.pointerId);
        this.touch.set(e.pointerId, b.dataset.press);
        this.pressed.add(b.dataset.press);
        b.classList.add("held");
      });
      const end = (e) => {
        this.touch.delete(e.pointerId);
        b.classList.remove("held");
      };
      b.addEventListener("pointerup", end);
      b.addEventListener("pointercancel", end);
      b.addEventListener("lostpointercapture", end);
    }
  }
  async start(level) {
    this.stop();
    const serial = this.serial;
    this.img = await images();
    if (this.serial !== serial) return false;
    this.run = createRun(level);
    this.active = true;
    this.paused = false;
    this.particles = [];
    this.shake = 0;
    this.hudKey = "";
    this.resize();
    this.camera(true);
    this.hud();
    this.draw();
    const intro = document.querySelector("#level-intro");
    intro.classList.remove("show");
    intro.innerHTML = `<span>УРОВЕНЬ ${num(level.id)}</span><strong>${level.name}</strong>`;
    void intro.offsetWidth;
    intro.classList.add("show");
    document.querySelector("#run-level").textContent =
      `УРОВЕНЬ ${num(level.id)}`;
    this.sound.play("start");
    this.last = performance.now();
    this.acc = 0;
    this.raf = requestAnimationFrame(this.frame);
    this.canvas.focus({ preventScroll: true });
    return true;
  }
  clearInput() {
    this.held.clear();
    this.pressed.clear();
    this.touch.clear();
    document
      .querySelectorAll("#touch-controls .held")
      .forEach((b) => b.classList.remove("held"));
  }
  stop() {
    this.active = false;
    this.serial++;
    cancelAnimationFrame(this.raf);
    this.clearInput();
    this.paused = false;
  }
  pause() {
    if (!this.active || this.paused) return;
    this.paused = true;
    cancelAnimationFrame(this.raf);
    this.clearInput();
  }
  resume() {
    if (!this.active || !this.paused || this.run.status !== "playing") return;
    this.paused = false;
    this.clearInput();
    this.acc = 0;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
    this.canvas.focus({ preventScroll: true });
  }
  resize() {
    this.w = this.canvas.clientWidth;
    this.h = this.canvas.clientHeight;
    if (!this.w || !this.h) return;
    this.dpr = Math.min(2, devicePixelRatio || 1);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.scale = Math.max(this.w / 585, this.h / 355);
    this.vw = this.w / this.scale;
    this.vh = this.h / this.scale;
    this.camera(true);
  }
  camera(snap = false, dt = STEP) {
    if (!this.run) return;
    const p = this.run.player;
    const x = clamp(
        p.x - this.vw * 0.47 + p.facing * this.vw * 0.055,
        0,
        WORLD.width - this.vw,
      ),
      y = clamp(p.y - this.vh * 0.55, 0, WORLD.height - this.vh);
    const f = snap ? 1 : 1 - Math.exp(-dt * 5.8);
    this.cx = snap ? x : this.cx + (x - this.cx) * f;
    this.cy = snap ? y : this.cy + (y - this.cy) * f;
  }
  frame(now) {
    if (!this.active || this.paused) return;
    const dt = Math.min(0.08, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.acc += dt;
    const held = new Set(
      [...this.held]
        .map((code) => bindings[code])
        .concat([...this.touch.values()]),
    );
    const input = Object.fromEntries([...held].map((a) => [a, true]));
    while (this.acc >= STEP && this.run.status === "playing") {
      input.jump = this.pressed.has("jump");
      input.cast = held.has("cast") || this.pressed.has("cast");
      step(this.run, input, STEP);
      this.pressed.clear();
      this.acc -= STEP;
      this.camera(false, STEP);
    }
    for (const e of this.run.events) this.event(e);
    this.run.events.length = 0;
    this.shake = Math.max(0, this.shake - dt * 9);
    this.particles = this.particles.filter((a) => a.life > 0);
    for (const a of this.particles) {
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.vy += a.gravity * dt;
      a.life -= dt;
    }
    this.hud();
    this.draw();
    if (this.run.status !== "playing") {
      this.paused = true;
      this.clearInput();
      this.callbacks.finish(this.run);
      return;
    }
    this.raf = requestAnimationFrame(this.frame);
  }
  event(e) {
    this.sound.play(e.type);
    if (e.type === "respawn") this.camera(true);
    if (e.type === "checkpoint")
      this.callbacks.notice("Путевая точка сохранена");
    if (e.type === "hurt" && this.settings.motion) this.shake = 1.3;
    const def = {
      coin: [11, "#ffe29a", true],
      poof: [15, "#b5c8ff", true],
      land: [5, "#e2c898", false],
      cast: [7, "#9fe8ff", true],
      jump: [4, "#d6c69e", false],
      hurt: [9, "#ecb9c7", true],
    }[e.type];
    if (!def || !this.settings.motion) return;
    for (let i = 0; i < def[0]; i++) {
      const life = 0.23 + Math.random() * 0.36;
      this.particles.push({
        x: e.x,
        y: e.y - (e.type === "cast" ? 15 : 0),
        vx: (Math.random() - 0.5) * (def[2] ? 65 : 40),
        vy: -8 - Math.random() * 34,
        life,
        max: life,
        size: 0.6 + Math.random() * 1.6,
        color: def[1],
        star: def[2],
        gravity: def[2] ? 23 : 60,
      });
    }
  }
  hud() {
    const r = this.run,
      key = `${r.hearts}-${r.coins}`;
    if (key !== this.hudKey) {
      this.hudKey = key;
      document.querySelector("#hearts").innerHTML = [0, 1, 2]
        .map((i) => icon("heart", 15, i < r.hearts ? "" : "empty"))
        .join("");
      document
        .querySelector("#hearts")
        .setAttribute("aria-label", `Здоровье: ${r.hearts} из 3`);
      document.querySelector("#run-coins").innerHTML =
        `${coinIcon(20)}${r.coins}<small>/ ${r.level.coinTarget}</small>`;
    }
    const a = Math.atan2(r.goal.y - r.player.y, r.goal.x - r.player.x);
    document.querySelector("#goal-direction").style.transform =
      `rotate(${a}rad)`;
  }
  visible(x, y, margin = 36) {
    return (
      x > this.cx - margin &&
      x < this.cx + this.vw + margin &&
      y > this.cy - margin &&
      y < this.cy + this.vh + margin
    );
  }
  shadow(x, y, r) {
    const g = this.ctx;
    g.fillStyle = "rgba(31,35,43,.27)";
    g.beginPath();
    g.ellipse(x, y + 0.3, r, 1.65, 0, 0, Math.PI * 2);
    g.fill();
  }
  spark(x, y, size, color) {
    const g = this.ctx;
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(x, y - size);
    g.lineTo(x + size * 0.26, y - size * 0.25);
    g.lineTo(x + size, y);
    g.lineTo(x + size * 0.26, y + size * 0.25);
    g.lineTo(x, y + size);
    g.lineTo(x - size * 0.26, y + size * 0.25);
    g.lineTo(x - size, y);
    g.lineTo(x - size * 0.26, y - size * 0.25);
    g.closePath();
    g.fill();
  }
  rope(l) {
    const g = this.ctx;
    if (
      l.x < this.cx - 10 ||
      l.x > this.cx + this.vw + 10 ||
      l.bottom < this.cy ||
      l.top > this.cy + this.vh
    )
      return;
    g.lineCap = "round";
    const w = 5.3;
    for (const side of [-1, 1]) {
      const x = l.x + side * w;
      g.beginPath();
      g.moveTo(x, l.top - 2.4);
      g.quadraticCurveTo(x + 1.1, (l.top + l.bottom) / 2, x, l.bottom + 0.2);
      g.lineWidth = 1.8;
      g.strokeStyle = "#4a3c30";
      g.stroke();
      g.lineWidth = 0.82;
      g.strokeStyle = "#c6a25e";
      g.stroke();
    }
    for (let y = l.top + 0.8; y < l.bottom - 1; y += 6) {
      const x = l.x - w - 1.5;
      g.fillStyle = "#513d2b";
      g.fillRect(x, y, 2 * w + 3, 1.85);
      g.fillStyle = "#b9904d";
      g.fillRect(x, y, 2 * w + 3, 0.8);
      g.fillStyle = "#dec185";
      g.fillRect(x + 0.7, y - 0.35, 0.75, 2);
      g.fillRect(x + 2 * w + 1, y - 0.35, 0.75, 2);
    }
  }
  draw() {
    if (!this.img || !this.run || !this.w || !this.h) return;
    const g = this.ctx,
      r = this.run,
      p = r.player,
      t = r.time,
      k = this.dpr * this.scale;
    const offset = this.shake ? Math.sin(t * 100) * this.shake : 0;
    g.setTransform(k, 0, 0, k, (-this.cx + offset) * k, -this.cy * k);
    g.globalAlpha = 1;
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "high";
    // Extra pixels at each edge avoid a seam during the small damage shake.
    g.drawImage(this.img.background, 0, 0, WORLD.width, WORLD.height);
    if (r.level.tint) {
      g.fillStyle =
        r.level.tint < 0 ? "rgba(91,57,125,.12)" : "rgba(255,194,115,.07)";
      g.fillRect(this.cx, this.cy, this.vw, this.vh);
    }
    for (const l of ladders) this.rope(l);
    this.portal();
    for (let i = 0; i < r.pickups.length; i++) {
      const c = r.pickups[i];
      if (c.taken || !this.visible(c.x, c.y)) continue;
      const bob = this.settings.motion ? Math.sin(t * 2.8 + i * 1.7) * 1.1 : 0;
      g.drawImage(this.img.coin, c.x - 4.1, c.y - 5.1 + bob, 8.2, 10.2);
      if (this.settings.motion && Math.sin(t * 2 + i) > 0.88)
        this.spark(c.x + 3, c.y - 4 + bob, 1.8, "#ffedc9");
    }
    for (let i = 0; i < r.enemies.length; i++) {
      const e = r.enemies[i];
      if (!e.alive || !this.visible(e.x, e.y)) continue;
      this.shadow(e.x, e.y, 7.5);
      const bounce = Math.sin(t * 5.5 + i) * 0.7;
      g.save();
      g.translate(e.x, e.y);
      g.scale(e.direction, 1);
      g.drawImage(this.img[e.kind], -9, -16 + bounce, 18, 16 - bounce);
      g.restore();
    }
    for (const s of r.shots) {
      g.save();
      g.translate(s.x, s.y);
      g.scale(Math.sign(s.vx), 1);
      const grad = g.createLinearGradient(-12, 0, 4, 0);
      grad.addColorStop(0, "#9eeaff00");
      grad.addColorStop(1, "#d6faff");
      g.fillStyle = grad;
      g.beginPath();
      g.ellipse(-4, 0, 9, 2.6, 0, 0, Math.PI * 2);
      g.fill();
      this.spark(1, 0, 4, "#bcf1ff");
      g.restore();
    }
    if (p.platform) this.shadow(p.x, p.y, 7.5);
    g.save();
    g.translate(p.x, p.y);
    g.scale(p.facing, 1);
    if (p.invulnerable > 0 && Math.floor(p.invulnerable * 9) % 2 === 0)
      g.globalAlpha = 0.45;
    let sprite =
      p.cast > 0
        ? this.img.cast
        : this.img.run[
            p.ladder !== null
              ? Math.floor(p.walk) % 2
              : p.platform
                ? Math.abs(p.vx) > 4
                  ? Math.floor(p.walk) % 7
                  : 0
                : p.vy < 0
                  ? 3
                  : 5
          ];
    const h = p.ladder !== null ? 30 : 33.5,
      w = (h * sprite.width) / sprite.height,
      bob =
        p.platform && Math.abs(p.vx) < 2 && this.settings.motion
          ? Math.sin(t * 2.2) * 0.35
          : 0;
    g.drawImage(sprite, -w * 0.5, -h + bob, w, h - bob);
    g.restore();
    for (const a of this.particles) {
      g.globalAlpha = Math.max(0, a.life / a.max);
      if (a.star) this.spark(a.x, a.y, a.size, a.color);
      else {
        g.fillStyle = a.color;
        g.beginPath();
        g.arc(a.x, a.y, a.size, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.globalAlpha = 1;
  }
  portal() {
    const g = this.ctx,
      r = this.run,
      t = r.time,
      x = r.goal.x,
      original = r.level.goal[0] === "finish",
      y = r.goal.y - (original ? 48 : 20);
    if (!this.visible(x, y, 70)) return;
    g.save();
    g.translate(x, y);
    const glow = g.createRadialGradient(0, 0, 2, 0, 0, 28);
    glow.addColorStop(0, "rgba(230,193,255,.48)");
    glow.addColorStop(0.35, "rgba(185,110,248,.28)");
    glow.addColorStop(1, "rgba(183,109,255,0)");
    g.fillStyle = glow;
    g.fillRect(-29, -29, 58, 58);
    if (!original) {
      g.fillStyle = "#634075ad";
      g.strokeStyle = "#d3a2f4";
      g.lineWidth = 1.7;
      g.beginPath();
      g.ellipse(0, 0, 11, 18, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.ellipse(0, 0, 4 + i * 2.2, 6 + i * 3.2, 0, t + i, t + i + 4);
        g.lineWidth = 0.85;
        g.stroke();
      }
    }
    for (let i = 0; i < 8; i++) {
      const phase = (t * 0.22 + i * 0.174) % 1;
      g.globalAlpha = Math.sin(phase * Math.PI) * 0.85;
      this.spark(
        Math.sin(i * 9 + t * 0.8) * 16,
        -phase * 45 + 15,
        0.7 + (i % 3) * 0.5,
        "#e9c9ff",
      );
    }
    g.restore();
  }
}

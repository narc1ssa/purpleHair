import { levels, ATLAS, num, clamp } from "./data.js";
import { isOpen, unlockedCount } from "./store.js";
import { art } from "./art.js";
import { icon } from "./icons.js";

export class Atlas {
  constructor(save, onSelect) {
    this.save = save;
    this.onSelect = onSelect;
    this.selected = unlockedCount(save);
    this.hero = this.selected;
    this.zoom = 1;
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
    this.pointers = new Map();
    this.view = document.querySelector("#map-viewport");
    this.land = document.querySelector("#map-land");
    this.layer = document.querySelector("#marker-layer");
    this.resize = new ResizeObserver(() => {
      if (this.view.clientWidth && this.view.clientHeight) this.home(false);
    });
    this.resize.observe(this.view);
    this.layer.addEventListener("click", (e) => {
      const node = e.target.closest("[data-level]");
      if (!node || performance.now() < (this.ignoreClicks || 0)) return;
      this.select(Number(node.dataset.level));
    });
    this.layer.addEventListener("focusin", (e) => {
      if (!e.target.matches(":focus-visible")) return;
      const l =
        levels[Number(e.target.closest("[data-level]")?.dataset.level) - 1];
      if (!l) return;
      const px = l.pin[0] * this.scale + this.x,
        py = l.pin[1] * this.scale + this.y;
      if (
        px < 70 ||
        py < 100 ||
        px > this.width - 70 ||
        py > this.height - 70
      ) {
        this.center(l);
        this.paint();
      }
    });
    this.view.addEventListener("pointerdown", (e) => this.down(e));
    this.view.addEventListener("pointermove", (e) => this.move(e));
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
      this.view.addEventListener(event, (e) => this.up(e));
    this.view.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const r = this.view.getBoundingClientRect();
        this.setZoom(
          this.zoom * Math.exp(-Math.sign(e.deltaY) * 0.1),
          e.clientX - r.left,
          e.clientY - r.top,
        );
      },
      { passive: false },
    );
    this.view.addEventListener("keydown", (e) => {
      const delta = {
        ArrowLeft: [48, 0],
        ArrowRight: [-48, 0],
        ArrowUp: [0, 48],
        ArrowDown: [0, -48],
      }[e.code];
      if (delta) {
        e.preventDefault();
        this.x += delta[0];
        this.y += delta[1];
        this.paint();
      }
      if (e.code === "Home") {
        e.preventDefault();
        this.home();
      }
    });
    this.render();
    this.home();
  }
  select(id, center = false) {
    if (!levels[id - 1]) return;
    this.selected = id;
    if (isOpen(this.save, id)) this.hero = id;
    this.render();
    if (center) this.center(levels[id - 1]);
    this.paint();
    this.onSelect(levels[id - 1]);
  }
  render() {
    this.layer.innerHTML = levels
      .map((l) => {
        const open = isOpen(this.save, l.id),
          here = l.id === this.hero;
        return `<button class="map-node ${here ? "hero-node" : open ? "unlocked" : "locked"} ${l.id === this.selected ? "chosen" : ""}" data-level="${l.id}" aria-pressed="${l.id === this.selected}" aria-label="Уровень ${l.id}. ${l.name}. ${open ? "Доступен" : "Закрыт"}">${here ? `<span class="hero-halo"></span><img draggable="false" class="marker-hero" src="${art.hero[0]}" alt=""><span class="hero-spark">✦</span><span class="hero-spark s2">✧</span><span class="hero-label"><b>${num(l.id)}</b>${l.name}${icon("sparkle", 8)}</span>` : `<span class="node-medal">${icon(open ? "flag" : "lock", 18)}</span><b class="node-number">${num(l.id)}</b><span class="node-tip">${l.name}</span>`}</button>`;
      })
      .join("");
    this.nodes = [...this.layer.children];
  }
  get scale() {
    return this.base * this.zoom;
  }
  home(reset = true) {
    this.width = this.view.clientWidth;
    this.height = this.view.clientHeight;
    if (!this.width || !this.height) return;
    this.base = Math.max(
      this.width / 1240,
      this.height / (this.width < 541 ? 860 : 720),
    );
    if (reset) this.zoom = 1;
    this.center(levels[this.selected - 1]);
    this.paint();
  }
  center(level) {
    this.x =
      this.width * (this.width < 541 ? 0.44 : 0.49) - level.pin[0] * this.scale;
    this.y =
      this.height * (this.width < 541 ? 0.465 : 0.5) -
      level.pin[1] * this.scale;
  }
  setZoom(value, ax = this.width / 2, ay = this.height / 2) {
    const before = this.scale;
    const min =
      Math.max(this.width / ATLAS.width, this.height / ATLAS.height) /
      this.base;
    this.zoom = clamp(value, min, 2.4);
    const ratio = this.scale / before;
    this.x = ax - (ax - this.x) * ratio;
    this.y = ay - (ay - this.y) * ratio;
    this.paint();
  }
  paint() {
    if (!this.scale) return;
    this.x = clamp(
      this.x,
      Math.min(0, this.width - ATLAS.width * this.scale),
      0,
    );
    this.y = clamp(
      this.y,
      Math.min(0, this.height - ATLAS.height * this.scale),
      0,
    );
    this.land.style.transform = `translate3d(${this.x}px,${this.y}px,0) scale(${this.scale})`;
    for (let i = 0; i < levels.length; i++) {
      const [x, y] = levels[i].pin;
      this.nodes[i].style.transform =
        `translate3d(${x * this.scale + this.x}px,${y * this.scale + this.y}px,0)`;
    }
    document.querySelector("#zoom").textContent =
      `${Math.round(this.zoom * 100)}%`;
    document.querySelector("#zoom-in").disabled = this.zoom >= 2.399;
    document.querySelector("#zoom-out").disabled =
      this.zoom <=
      Math.max(this.width / ATLAS.width, this.height / ATLAS.height) /
        this.base +
        0.001;
  }
  down(e) {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    this.pointers.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      sx: e.clientX,
      sy: e.clientY,
    });
    if (!e.target.closest("button")) this.view.setPointerCapture(e.pointerId);
    if (this.pointers.size === 2) {
      this.dragging = true;
      this.pinch = this.distance();
    }
  }
  distance() {
    const [a, b] = [...this.pointers.values()];
    return Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
  }
  move(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x,
      dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (!this.dragging && Math.hypot(p.x - p.sx, p.y - p.sy) > 4) {
      this.dragging = true;
      this.view.setPointerCapture(e.pointerId);
    }
    if (this.pointers.size === 2) {
      const distance = this.distance(),
        [a, b] = [...this.pointers.values()],
        r = this.view.getBoundingClientRect();
      this.x += dx / 2;
      this.y += dy / 2;
      this.setZoom(
        (this.zoom * distance) / this.pinch,
        (a.x + b.x) / 2 - r.left,
        (a.y + b.y) / 2 - r.top,
      );
      this.pinch = distance;
    } else if (this.dragging) {
      this.x += dx;
      this.y += dy;
      this.paint();
    }
    this.view.classList.toggle("dragging", !!this.dragging);
  }
  up(e) {
    if (!this.pointers.delete(e.pointerId)) return;
    if (this.dragging) this.ignoreClicks = performance.now() + 160;
    if (!this.pointers.size) {
      this.dragging = false;
      this.view.classList.remove("dragging");
    }
  }
}

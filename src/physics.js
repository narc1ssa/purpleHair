import {
  WORLD,
  clamp,
  platforms,
  platformById,
  surface,
  ladders,
  spawnOn,
  coinSites,
  enemySites,
} from "./data.js";

export const STEP = 1 / 120;
const approach = (value, target, amount) =>
  value < target
    ? Math.min(value + amount, target)
    : Math.max(value - amount, target);
export function createRun(level) {
  const spawn = spawnOn(level.spawn);
  return {
    level,
    status: "playing",
    time: 0,
    coins: 0,
    hearts: 3,
    hurt: false,
    player: {
      ...spawn,
      vx: 0,
      vy: 0,
      facing: 1,
      ladder: null,
      coyote: 0.1,
      buffer: 0,
      invulnerable: 0,
      cast: 0,
      cooldown: 0,
      walk: 0,
      drop: 0,
    },
    checkpoint: { ...spawn },
    goal: spawnOn(level.goal),
    shots: [],
    events: [],
    pickups: coinSites.map(([p, x], i) => ({
      x,
      y: surface(platformById[p], x) - 15 - (i % 3),
      taken: false,
    })),
    enemies: enemySites.slice(0, 10 + level.id).map(([p, x], i) => ({
      x,
      y: surface(platformById[p], x),
      platform: p,
      direction: i % 2 ? -1 : 1,
      speed: 10 + level.id * 1.4 + (i % 4) * 2,
      kind: i % 3 === 1 ? "rose" : "blue",
      alive: true,
    })),
  };
}
function emit(run, type, x = run.player.x, y = run.player.y) {
  run.events.push({ type, x, y });
}
function damage(run, fall = false, fromX = 0) {
  const p = run.player;
  if (!fall && p.invulnerable > 0) return;
  run.hearts--;
  run.hurt = true;
  emit(run, "hurt");
  if (run.hearts === 0) {
    run.status = "lost";
    return;
  }
  p.invulnerable = 1.75;
  p.ladder = null;
  p.drop = 0;
  if (fall) {
    Object.assign(p, run.checkpoint, { vx: 0, vy: 0, coyote: 0.1, buffer: 0 });
    emit(run, "respawn");
  } else {
    p.vy = -104;
    p.vx = (p.x < fromX ? -1 : 1) * 110;
    p.platform = null;
  }
}
export function advanceEnemy(e, dt) {
  const platform = platformById[e.platform],
    left = platform.left + 7,
    right = platform.right - 7;
  e.x += e.direction * e.speed * dt;
  if (e.x >= right) {
    e.x = right;
    e.direction = -1;
  }
  if (e.x <= left) {
    e.x = left;
    e.direction = 1;
  }
  e.y = surface(platform, e.x);
}
export function step(run, input = {}, dt = STEP) {
  if (run.status !== "playing") return;
  run.time += dt;
  const p = run.player,
    oldY = p.y;
  const dx = Number(!!input.right) - Number(!!input.left),
    dy = Number(!!input.down) - Number(!!input.up);
  for (const k of [
    "invulnerable",
    "buffer",
    "coyote",
    "cast",
    "cooldown",
    "drop",
  ])
    p[k] = Math.max(0, p[k] - dt);
  if (p.platform) p.coyote = 0.1;
  if (input.jump) p.buffer = 0.13;
  if (dx) p.facing = dx;
  if (dy && p.ladder === null && !p.drop) {
    const l = ladders.find(
      (l) =>
        Math.abs(p.x - l.x) < 10 &&
        p.y >= l.top - 2 &&
        p.y <= l.bottom + 2 &&
        (dy > 0 ? p.y < l.bottom - 0.3 : p.y > l.top + 0.3),
    );
    if (l) {
      p.ladder = l.id;
      p.platform = null;
      p.vx = 0;
      p.vy = 0;
      p.x = l.x;
    }
  }
  if (p.buffer && input.down && p.platform) {
    p.drop = 0.19;
    p.platform = null;
    p.coyote = 0;
    p.buffer = 0;
    p.y += 3;
    p.vy = 20;
  } else if (p.buffer && (p.platform || p.ladder !== null || p.coyote > 0)) {
    p.ladder = null;
    p.platform = null;
    p.coyote = 0;
    p.buffer = 0;
    p.vy = -223;
    emit(run, "jump");
  }
  if (p.ladder !== null) {
    const l = ladders[p.ladder];
    p.x = l.x;
    p.y += dy * 69 * dt;
    p.walk += Math.abs(dy) * dt * 5;
    p.vy = 0;
    if (p.y <= l.top) {
      p.y = l.top;
      p.platform = l.up;
      p.ladder = null;
    } else if (p.y >= l.bottom) {
      p.y = l.bottom;
      p.platform = l.down;
      p.ladder = null;
    } else if (dx) {
      p.ladder = null;
      p.vx = dx * 55;
    }
  } else {
    p.vx = approach(p.vx, dx * 103, dt * (p.platform ? 760 : 440));
    p.x = clamp(p.x + p.vx * dt, 5, WORLD.width - 5);
    const ground = platformById[p.platform];
    if (ground && p.x >= ground.left - 1 && p.x <= ground.right + 1) {
      p.y = surface(ground, p.x);
      p.vy = 0;
      p.walk += (Math.abs(p.vx) * dt) / 12;
    } else {
      p.platform = null;
      p.vy = Math.min(310, p.vy + 458 * dt);
      p.y += p.vy * dt;
      if (p.vy >= 0 && p.drop === 0) {
        let best = null,
          bestY = Infinity;
        for (const shelf of platforms) {
          if (p.x < shelf.left - 1 || p.x > shelf.right + 1) continue;
          const y = surface(shelf, p.x);
          if (oldY <= y + 0.45 && p.y >= y && y < bestY) {
            best = shelf;
            bestY = y;
          }
        }
        if (best) {
          if (p.vy > 66) emit(run, "land", p.x, bestY);
          p.platform = best.id;
          p.y = bestY;
          p.vy = 0;
        }
      }
    }
  }
  if (input.cast && p.cooldown <= 0) {
    p.cooldown = 0.4;
    p.cast = 0.21;
    run.shots.push({
      x: p.x + p.facing * 11,
      y: p.y - 16,
      vx: p.facing * 235,
      ttl: 1.2,
    });
    emit(run, "cast");
  }
  for (const shot of run.shots) {
    shot.x += shot.vx * dt;
    shot.ttl -= dt;
  }
  for (const e of run.enemies) {
    if (!e.alive) continue;
    advanceEnemy(e, dt);
    const hit = run.shots.find(
      (s) =>
        s.ttl > 0 && Math.abs(s.x - e.x) < 12 && Math.abs(s.y - (e.y - 8)) < 12,
    );
    if (hit) {
      e.alive = false;
      hit.ttl = 0;
      emit(run, "poof", e.x, e.y - 7);
      continue;
    }
    if (Math.abs(p.x - e.x) < 12 && p.y > e.y - 16 && p.y - 25 < e.y - 1) {
      if (p.vy > 15 && oldY <= e.y - 13) {
        e.alive = false;
        p.vy = -145;
        p.platform = null;
        emit(run, "poof", e.x, e.y - 7);
      } else damage(run, false, e.x);
    }
    if (run.status !== "playing") break;
  }
  run.shots = run.shots.filter((s) => s.ttl > 0);
  if (run.status !== "playing") return;
  for (const c of run.pickups)
    if (
      !c.taken &&
      Math.abs(c.x - p.x) < 13 &&
      c.y > p.y - 33 &&
      c.y < p.y + 3
    ) {
      c.taken = true;
      run.coins++;
      emit(run, "coin", c.x, c.y);
    }
  // Wide, safe landings act as checkpoints; never respawn in an enemy.
  if (
    p.platform &&
    ["gate", "forest", "westStairs", "lowRuin", "steps"].includes(p.platform) &&
    run.checkpoint.platform !== p.platform &&
    !run.enemies.some(
      (e) => e.alive && e.platform === p.platform && Math.abs(p.x - e.x) < 28,
    )
  ) {
    run.checkpoint = { x: p.x, y: p.y, platform: p.platform };
    emit(run, "checkpoint");
  }
  if (p.y > WORLD.height + 18) {
    damage(run, true);
    return;
  }
  if (
    Math.abs(p.x - run.goal.x) < 17 &&
    p.y <= run.goal.y + 2 &&
    p.y >= run.goal.y - 26
  ) {
    run.status = "won";
    emit(run, "finish");
  }
}
export function resultOf(run) {
  return {
    stars: 1 + Number(run.coins >= run.level.coinTarget) + Number(!run.hurt),
    coins: run.coins,
    time: run.time,
    undamaged: !run.hurt,
  };
}

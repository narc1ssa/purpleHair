import test from "node:test";
import assert from "node:assert/strict";
import {
  levels,
  ladders,
  platformById,
  surface,
  spawnOn,
  WORLD,
} from "../src/data.js";
import {
  createRun,
  advanceEnemy,
  step,
  STEP,
  resultOf,
} from "../src/physics.js";
import {
  readSave,
  writeSave,
  recordFinish,
  unlockedCount,
  isOpen,
  totals,
} from "../src/store.js";

const ticks = (r, n, input = {}) => {
  for (let i = 0; i < n; i++) step(r, input);
};
const fresh = () => {
  const r = createRun(levels[0]);
  r.enemies = [];
  return r;
};
const memory = () => {
  let value = null;
  return {
    getItem: () => value,
    setItem: (_, v) => {
      value = v;
    },
  };
};

test("a new journey only permits level one; records survive reload", () => {
  const storage = memory(),
    s = readSave(storage);
  assert.equal(unlockedCount(s), 1);
  assert.ok(isOpen(s, 1));
  assert.ok(!isOpen(s, 2));
  assert.ok(!recordFinish(s, 3, { stars: 3, coins: 20, time: 41 }));
  recordFinish(s, 1, { stars: 2, coins: 8, time: 34 });
  writeSave(s, storage);
  const saved = readSave(storage);
  assert.deepEqual(saved, s);
  assert.equal(unlockedCount(saved), 2);
  assert.ok(!isOpen(saved, 3));
  recordFinish(saved, 1, { stars: 3, coins: 4, time: 31 });
  assert.deepEqual(saved.records[1], { stars: 3, coins: 8, time: 31 });
  assert.deepEqual(totals(saved), { stars: 3, coins: 8, finished: 1 });
});
test("broken or unavailable storage cannot break the atlas or unlock gaps", () => {
  const storage = memory();
  for (const raw of [
    "{",
    "null",
    "false",
    '{"records":{"2":{"time":1,"stars":2}}}',
  ]) {
    storage.setItem("", raw);
    assert.equal(unlockedCount(readSave(storage)), 1);
  }
  assert.equal(unlockedCount(readSave(null)), 1);
  assert.equal(writeSave(readSave(null), null), false);
});
test("each route has a valid spawn, a supported portal and bounded ladders", () => {
  for (const l of levels)
    for (const point of [l.spawn, l.goal]) {
      const p = platformById[point[0]];
      assert.ok(p && point[1] >= p.left && point[1] <= p.right);
    }
  for (const l of ladders) {
    for (const key of ["up", "down"]) {
      const p = platformById[l[key]];
      assert.ok(l.x >= p.left && l.x <= p.right, `${l.id} ${key}`);
    }
    assert.ok(l.top < l.bottom);
  }
});
test("platforms support the feet, jumping rises and lands on the same shelf", () => {
  const r = fresh(),
    p = r.player,
    y = p.y;
  ticks(r, 240);
  assert.equal(p.y, y);
  assert.equal(p.platform, "start");
  step(r, { jump: true });
  assert.ok(p.vy < 0);
  ticks(r, 37);
  assert.ok(p.y < y - 40);
  ticks(r, 110);
  assert.equal(p.y, y);
  assert.equal(p.platform, "start");
});
test("the same ladder can be descended and climbed to both painted landings", () => {
  const r = fresh(),
    l = ladders[0],
    p = r.player;
  Object.assign(p, spawnOn([l.up, l.x]));
  ticks(r, 10, { down: true });
  assert.equal(p.ladder, l.id);
  assert.ok(p.y > l.top);
  ticks(r, 280, { down: true });
  assert.equal(p.platform, l.down);
  assert.equal(p.y, l.bottom);
  ticks(r, 280, { up: true });
  assert.equal(p.platform, l.up);
  assert.equal(p.y, l.top);
});
test("a drop-through reaches the lower platforms instead of sticking to the first", () => {
  const r = fresh(),
    p = r.player,
    y = p.y;
  step(r, { down: true, jump: true });
  ticks(r, 30);
  assert.ok(p.y > y + 5);
  assert.notEqual(p.platform, "start");
});
test("every enemy turns around without ever leaving its spawn platform", () => {
  const r = createRun(levels[7]);
  for (const e of r.enemies) {
    const id = e.platform,
      home = platformById[id];
    let turns = 0;
    for (let i = 0; i < 3000; i++) {
      const d = e.direction;
      advanceEnemy(e, 1 / 30);
      if (d !== e.direction) turns++;
      assert.equal(e.platform, id);
      assert.ok(e.x >= home.left + 7 && e.x <= home.right - 7);
      assert.equal(e.y, surface(home, e.x));
    }
    assert.ok(turns >= 1, id);
  }
});
test("coins are collected once and stars match the stated objectives", () => {
  const r = fresh();
  Object.assign(r.player, spawnOn(["start", 114]));
  ticks(r, 4);
  assert.equal(r.coins, 1);
  ticks(r, 200);
  assert.equal(r.coins, 1);
  assert.equal(resultOf(r).stars, 2);
  r.coins = r.level.coinTarget;
  assert.equal(resultOf(r).stars, 3);
  r.hurt = true;
  assert.equal(resultOf(r).stars, 2);
});
test("damage has a grace period; falling respawns and losing all hearts ends the run", () => {
  const r = createRun(levels[0]),
    e = r.enemies[0];
  Object.assign(r.player, spawnOn([e.platform, e.x]));
  step(r);
  assert.equal(r.hearts, 2);
  step(r);
  assert.equal(r.hearts, 2);
  r.player.platform = null;
  r.player.y = WORLD.height + 25;
  step(r);
  assert.equal(r.hearts, 1);
  assert.equal(r.player.platform, r.checkpoint.platform);
  r.player.platform = null;
  r.player.y = WORLD.height + 25;
  step(r);
  assert.equal(r.status, "lost");
  const t = r.time;
  step(r, { jump: true });
  assert.equal(r.time, t);
});
test("the first route can be completed by real movement, without teleporting", () => {
  const r = createRun(levels[0]);
  for (let i = 0; i < 120 * 55 && r.status === "playing"; i++) {
    step(r, { right: true, cast: true, jump: i % 137 === 30 });
    r.events.length = 0;
  }
  assert.equal(r.status, "won");
  assert.ok(r.time > 5);
  assert.ok(r.coins > 0);
  assert.ok(r.hearts > 0);
});
test("the finish trigger does not catch the player beneath the portal", () => {
  const r = fresh();
  Object.assign(r.player, {
    x: r.goal.x,
    y: r.goal.y + 12,
    platform: null,
    vy: 0,
  });
  step(r);
  assert.equal(r.status, "playing");
  Object.assign(r.player, r.goal);
  step(r);
  assert.equal(r.status, "won");
  const t = r.time;
  step(r, {}, STEP);
  assert.equal(r.time, t);
});

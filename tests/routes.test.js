import test from "node:test";
import assert from "node:assert/strict";
import { levels, platforms, ladders, spawnOn } from "../src/data.js";
import { createRun, step } from "../src/physics.js";

// Build a reachability graph by trying actual jumps, walk-offs and drops
// from sample points on each shelf. This catches disconnected portal routes
// when editing the painted collision paths without needing a browser.
test("all eight spawn platforms connect to their portals using the real physics", () => {
  const run = createRun(levels[0]);
  run.enemies = [];
  run.pickups = [];
  run.goal = { x: -1000, y: -1000 };
  const graph = new Map(platforms.map((p) => [p.id, new Set()]));
  for (const l of ladders) {
    graph.get(l.up).add(l.down);
    graph.get(l.down).add(l.up);
  }
  for (const p of platforms) {
    const launchPoints = [p.left + 1, p.right - 1];
    for (let x = p.left + 2; x < p.right; x += 12) launchPoints.push(x);
    for (const x of launchPoints)
      for (const d of [-1, 0, 1])
        for (const move of ["jump", "walk", "drop"]) {
          Object.assign(run.player, spawnOn([p.id, x]), {
            vx: 103 * d,
            vy: 0,
            ladder: null,
            drop: 0,
            buffer: 0,
            coyote: 0.1,
          });
          run.hearts = 3;
          run.status = "playing";
          for (let n = 0; n < 240; n++) {
            step(run, {
              left: d < 0,
              right: d > 0,
              jump: !n && move !== "walk",
              down: !n && move === "drop",
            });
            run.events.length = 0;
            if (run.hearts !== 3) break;
            if (run.player.platform && run.player.platform !== p.id) {
              graph.get(p.id).add(run.player.platform);
              break;
            }
          }
        }
  }
  for (const level of levels) {
    const reachable = new Set([level.spawn[0]]);
    for (const id of reachable)
      for (const next of graph.get(id)) reachable.add(next);
    assert.ok(
      reachable.has(level.goal[0]),
      `Disconnected route: ${level.name}`,
    );
  }
});

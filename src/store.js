import { levels, clamp } from "./data.js";
export const STORAGE_KEY = "aetheria.atlas.v1";
const defaults = () => ({ records: {}, sound: true, motion: true });
export function readSave(storage) {
  const out = defaults();
  try {
    const d = JSON.parse(storage.getItem(STORAGE_KEY));
    if (!d || typeof d !== "object") return out;
    out.sound = d.sound !== false;
    out.motion = d.motion !== false;
    for (const { id } of levels) {
      const r = d.records?.[id];
      if (
        !r ||
        !Number.isFinite(r.time) ||
        r.time <= 0 ||
        !Number.isInteger(r.stars) ||
        r.stars < 1 ||
        r.stars > 3
      )
        break;
      out.records[id] = {
        stars: r.stars,
        coins: clamp(Math.floor(Number(r.coins) || 0), 0, 38),
        time: r.time,
      };
    }
  } catch {
    /* Disabled storage or an old, malformed save: start fresh. */
  }
  return out;
}
export function writeSave(save, storage) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}
export const unlockedCount = (save) =>
  Math.min(levels.length, Object.keys(save.records).length + 1);
export const isOpen = (save, id) =>
  Number.isInteger(id) && id >= 1 && id <= unlockedCount(save);
export function recordFinish(save, id, result) {
  if (!isOpen(save, id)) return false;
  const old = save.records[id];
  save.records[id] = {
    stars: Math.max(old?.stars || 0, result.stars),
    coins: Math.max(old?.coins || 0, result.coins),
    time: Math.min(old?.time || Infinity, result.time),
  };
  return true;
}
export function totals(save) {
  return Object.values(save.records).reduce(
    (a, r) => ({
      coins: a.coins + r.coins,
      stars: a.stars + r.stars,
      finished: a.finished + 1,
    }),
    { coins: 0, stars: 0, finished: 0 },
  );
}
export const fmtTime = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

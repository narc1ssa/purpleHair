const shapes = {
  map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16M15 5v16"/>',
  book: '<path d="M3 4.5c3.2-1.4 6.4-1 9 1.4 2.7-2.4 5.9-2.8 9-1.4v14c-3.3-1-6.1-.5-9 1.5-2.7-2-5.8-2.5-9-1.5zM12 6v14M6 8h2M16 8h2"/>',
  volume:
    '<path d="m4 9 4 0 5-4v14l-5-4H4zM16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14"/>',
  mute: '<path d="m4 9 4 0 5-4v14l-5-4H4zM17 9l5 6m0-6-5 6"/>',
  settings:
    '<path d="m9.5 3-.6 2.4-2 .9-2.2-.8-2.1 3.6 1.7 1.7-.1 2.4-1.6 1.6 2.1 3.7 2.3-.7 2 .9.5 2.3h4.4l.6-2.3 2-.9 2.2.7 2.1-3.7-1.7-1.6v-2.4l1.7-1.7-2.1-3.6-2.3.8-2-.9-.5-2.4z"/><circle cx="11.8" cy="12" r="3.1"/>',
  lock: '<rect x="5.5" y="10" width="13" height="10.5" rx="2"/><path d="M8.5 10V7a3.5 3.5 0 0 1 7 0v3M12 14v3"/>',
  flag: '<path d="M5 21V4m0 1c4-4 8 4 14 0v10c-6 4-10-4-14 0"/>',
  play: '<path d="m7 3.8 13 8.2-13 8.2z" fill="currentColor" stroke-width="1"/>',
  pause: '<path d="M8 5v14M16 5v14" stroke-width="4"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  left: '<path d="M20 12H5m6-6-6 6 6 6"/>',
  up: '<path d="M12 20V4m-6 6 6-6 6 6"/>',
  down: '<path d="M12 4v16m-6-6 6 6 6-6"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  minus: '<path d="M5 12h14"/>',
  center:
    '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/>',
  mouse:
    '<rect x="5.5" y="2" width="13" height="20" rx="6.5"/><path d="M12 3v6m-6.5 2h13"/>',
  keys: '<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M5.5 9h.5m3 0h.5m3 0h.5m3 0h.5m1 3h.5m-5 0h.5m-5 0h.5m-5 0h.5M8 15.5h8"/>',
  star: '<path d="m12 2 3 6.3 7 .9-5.1 4.9 1.2 7L12 17.8l-6.1 3.3 1.2-7L2 9.2l7-.9z"/>',
  sparkle:
    '<path d="m12 1 2.6 8.4L23 12l-8.4 2.6L12 23l-2.6-8.4L1 12l8.4-2.6z" fill="currentColor" stroke="none"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  check: '<path d="m4.5 12 5 5 10-11"/>',
  fullscreen: '<path d="M3 9V3h6m6 0h6v6m0 6v6h-6m-6 0H3v-6"/>',
  reset: '<path d="M4 10a8 8 0 1 1 .7 7M4 4v6h6"/>',
  heart:
    '<path d="M12 21C8.8 18.4 2 13.6 2 8.5c0-5.4 6.8-7.2 10-2.6 3.2-4.6 10-2.8 10 2.6 0 5.1-6.8 9.9-10 12.5z"/>',
  time: '<circle cx="12" cy="12" r="8.7"/><path d="M12 6.5V12l3.7 2.5"/>',
  jump: '<path d="M4 18c7 1 10-3 10-12m-5 4 5-5 5 5M3 21h6"/>',
  magic:
    '<path d="m4 21 12-13m-4-1 3-5 1.5 3.5L21 7l-4.5 3-1 4-2-4-4-1zM5 3v4M3 5h4"/>',
  chevron: '<path d="m8 4 8 8-8 8"/>',
  shield:
    '<path d="M12 2 3.5 5.8v6.3c0 4.3 4.2 7.5 8.5 10 4.3-2.5 8.5-5.7 8.5-10V5.8z"/><path d="m8 12 3 3 5-6"/>',
  mountain:
    '<path d="m2 20 8.5-16L19 20zM8 8.5l2.5 2 2.3-2M16 14l2.8-5 4 11h-4"/>',
  pin: '<path d="M19 9c0 5-7 12-7 12S5 14 5 9a7 7 0 0 1 14 0z"/><circle cx="12" cy="9" r="2.4"/>',
  save: '<path d="m4 3 13 0 4 4v14H3V3zM7 3v6h9V3M7 21v-8h10v8"/>',
};
export const icon = (name, size = 20, cls = "") =>
  `<svg class="icon ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name] || ""}</svg>`;
export const coinIcon = (s = 22) =>
  `<svg width="${s}" height="${s}" class="loot-icon" viewBox="0 0 28 28" aria-hidden="true"><ellipse cx="14.9" cy="14.5" rx="10.4" ry="11.4" fill="#955421" stroke="#5c371e"/><ellipse cx="13.1" cy="13.4" rx="10.1" ry="11.1" fill="#efb444" stroke="#ffdc8d" stroke-width="1.5"/><ellipse cx="13.1" cy="13.4" rx="7" ry="8.1" fill="#e6a034" stroke="#b66b28"/><path d="m13.2 7.1 4 6.4-4 5.9-4.1-5.9z" fill="#ffe7a0"/><path d="m13.2 7.1 4 6.4-4 5.9 1.1-6z" fill="#c98428"/><path d="M5 11a9 9 0 0 1 5-6" fill="none" stroke="#fff3c6" stroke-linecap="round" stroke-width="1.7"/></svg>`;
export const gemIcon = (s = 23) =>
  `<svg class="loot-icon" width="${s}" height="${s}" viewBox="0 0 28 28" aria-hidden="true"><path d="m14 1 9.5 11.8L14 26.5 4.5 12.8z" fill="#a074e5" stroke="#dfb8ff" stroke-width="1.1"/><path d="m14 1-3.6 12.4 3.6 13.1-9.5-13.7z" fill="#7553b8"/><path d="m14 1 3.8 12.3-3.8 13.2 9.5-13.7z" fill="#b591f1"/><path d="m14 1-3.6 12.4 7.4-.1z" fill="#e7c6ff"/><path d="m10.4 13.4 7.4-.1L14 26.5z" fill="#9c6edb"/><path d="m4.5 12.8 5.9.6 7.4-.1 5.7-.5" fill="none" stroke="#f7caff" stroke-width=".8"/></svg>`;
export const emblem = `<svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="m32 1 7.5 15.8L54 11l-5.8 14L63 32l-15 6.8L53 53l-14-5-7 15-7-15-14 5 5-14L1 32l15.7-7.1L11 11l14.6 5.8z" fill="#242230" stroke="#b99a69" stroke-width="1.25"/><path d="m32 4 6.8 20.2L57 32l-18.2 6.7L32 60l-7.1-21.3L7 32l17.9-7.8z" fill="#41334e" stroke="#eed59c" stroke-width="1.3"/><path d="m32 9 5 17.5L51 32l-14.4 4.6L32 54l-4.8-17.4L13 32l14.2-5.5z" fill="#c7ad7f"/><path d="m32 10-2.5 18L14 32l15.9.1L32 54l2.4-19.3L51 32l-16.4-3.1z" fill="#615069"/><path d="m32 16 10.1 16L32 48l-10.1-16z" fill="#a67cde" stroke="#efd8b2"/><path d="m32 16-3.3 16H22z" fill="#dfbfff"/><path d="m32 16 10.1 16H35z" fill="#8156b9"/><path d="m22 32 10 16-3.3-16z" fill="#7d57b0"/><path d="m32 16-3.3 16h6.4z" fill="#e6d5ff"/><path d="m28.7 32 3.3 16 3.1-16z" fill="#bda1ec"/></svg>`;
export const compass = `<svg viewBox="0 0 100 112" aria-label="Север" role="img"><text x="50" y="13" text-anchor="middle" fill="#f4e2b8" font-size="14" font-family="Georgia">N</text><g transform="translate(50,62)"><circle r="30" fill="#151c2b" fill-opacity=".45" stroke="#c7b487" stroke-width=".7"/><circle r="27" fill="none" stroke="#cebc91" stroke-dasharray="1 5"/><g stroke="#e4cb94" stroke-width=".7"><path d="m-24-24 21 16 3 8-8-3zm48 0L8-3 0 0l3-8zm0 48L3 8 0 0l8 3zm-48 0L-8 3 0 0l-3 8z" fill="#8c806b"/><path d="m0-40 6 33 28 7-28 5L0 38l-6-33-29-5 29-7z" fill="#303340"/><path d="M0-40V0l6-7zM34 0H0l6 5zM0 38V0l-6 5zM-35 0H0l-6-7z" fill="#e2c690"/></g><circle r="4.3" fill="#e4c99b" stroke="#655746"/><circle r="2.2" fill="#8b6fa9"/></g></svg>`;

import "./style.css";
import { levels, num } from "./data.js";
import {
  readSave,
  writeSave,
  unlockedCount,
  isOpen,
  totals,
  recordFinish,
  fmtTime,
} from "./store.js";
import { icon, emblem, compass, coinIcon, gemIcon } from "./icons.js";
import { Atlas } from "./atlas.js";
import { Platformer } from "./game.js";
import { resultOf } from "./physics.js";
import { Sound } from "./sound.js";

const $ = (s) => document.querySelector(s);
let storage;
try {
  storage = window.localStorage;
} catch {
  /* Restricted browser profile. */
}
const save = readSave(storage),
  sound = new Sound(save.sound);
const dialog = $("#dialog");
let views = [],
  noticeTimer,
  starting = false,
  playToken = 0,
  lastResult = null,
  persisted = true;
const stars = (n = 0, size = 13) =>
  `<span class="stars" aria-label="Звёзд: ${n} из 3">${[1, 2, 3].map((i) => icon("star", size, i <= n ? "earned" : "")).join("")}</span>`;
function persist() {
  persisted = writeSave(save, storage);
}
function notice(text) {
  $("#notice").textContent = text;
  $("#notice").classList.add("show");
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => $("#notice").classList.remove("show"), 2200);
}
function paintStats() {
  const total = totals(save),
    xp = total.finished * 50 + total.stars * 20 + total.coins * 2;
  $("#wallet-coins").textContent = total.coins;
  $("#wallet-gems").textContent = total.stars;
  $("#hero-level").textContent = 1 + Math.floor(xp / 100);
  $("#xp-value").innerHTML = `${xp % 100} <i>/ 100</i>`;
  $("#xp-fill").style.width = `${xp % 100}%`;
  $("#open-count").innerHTML =
    `${unlockedCount(save)} <i>/</i> ${levels.length}`;
  $("#audio-toggle").innerHTML = icon(save.sound ? "volume" : "mute", 18);
  $("#audio-toggle").setAttribute("aria-pressed", String(save.sound));
  $("#audio-toggle").setAttribute(
    "aria-label",
    save.sound ? "Выключить звук" : "Включить звук",
  );
  $("#audio-toggle").title = save.sound ? "Выключить звук" : "Включить звук";
  document.documentElement.dataset.motion = save.motion ? "on" : "off";
  sound.enabled = save.sound;
}
function paintCard(l) {
  const open = isOpen(save, l.id),
    r = save.records[l.id],
    card = $("#level-card");
  card.classList.toggle("card-locked", !open);
  card.innerHTML = `<div class="card-scene" style="background-position:${50 + l.id * 2}% ${42 + l.id * 3}%"><span class="scene-label">${icon("pin", 12)}ВЫБРАННАЯ ЛОКАЦИЯ</span></div><div class="card-body"><div class="card-meta"><span class="level-kicker">УРОВЕНЬ ${num(l.id)}</span>${stars(r?.stars)}</div><h2>${l.name}</h2><p class="${open ? "" : "locked-reason"}">${open ? l.description : `Пройдите уровень ${num(l.id - 1)} «${levels[l.id - 2].name}», чтобы открыть эту тропу.`}</p><button class="primary start-level" id="start-level" ${open ? "" : "disabled"}>${icon(open ? "play" : "lock", 15)}<span>${open ? (r ? "Пройти ещё раз" : "Начать уровень") : "Уровень закрыт"}</span>${open ? icon("arrow", 17) : ""}</button></div>`;
  $("#start-level").addEventListener("click", () => startLevel(l.id));
}
$("#brand-mark").innerHTML = emblem;
$("#map-compass").innerHTML = compass;
$("#coin-icon").innerHTML = coinIcon(21);
$("#gem-icon").innerHTML = gemIcon(21);
for (const el of document.querySelectorAll("[data-icon]"))
  el.replaceWith(
    document
      .createRange()
      .createContextualFragment(
        icon(el.dataset.icon, Number(el.dataset.size) || 19),
      ),
  );
$(".map-sparks").innerHTML = Array.from(
  { length: 17 },
  (_, i) =>
    `<i class="mote" style="left:${(i * 37.1 + 5) % 99}%;top:${(i * 17.3 + 12) % 94}%;--duration:${3.8 + (i % 4)}s;--delay:-${(i * 3.1) % 7}s"></i>`,
).join("");
const atlas = new Atlas(save, (l) => {
  paintCard(l);
  sound.play("select");
});
const game = new Platformer(sound, save, { notice, finish: finishRun });
paintStats();
paintCard(levels[atlas.selected - 1]);
window.addEventListener("pointerdown", () => sound.unlock(), { once: true });
window.addEventListener("keydown", () => sound.unlock(), { once: true });

function clearDialogs() {
  views = [];
  if (dialog.open) dialog.close();
  $("#nav-journal").classList.remove("current");
  $("#nav-map").classList.toggle("current", !game.active);
}
async function startLevel(id) {
  if (starting || !isOpen(save, id)) return;
  starting = true;
  const token = ++playToken;
  sound.unlock();
  clearDialogs();
  const button = $("#start-level");
  if (button) {
    button.disabled = true;
    button.querySelector("span").textContent = "Загрузка…";
  }
  document.body.classList.add("is-playing");
  $("#atlas").hidden = true;
  $("#playfield").hidden = false;
  $("#game-loading").hidden = false;
  $("#nav-map").classList.remove("current");
  $("#nav-map").removeAttribute("aria-current");
  $("#nav-map span").textContent = "На карту";
  $("#footer-hint").innerHTML =
    `<span class="key-hint">A D</span> Движение <i class="key-dot"></i><span class="key-hint">Пробел</span> Прыжок <i class="key-dot"></i><span class="key-hint">W S</span> Лестница`;
  try {
    await game.start(levels[id - 1]);
    if (token === playToken && document.hidden && game.active) show("pause");
  } catch {
    if (token === playToken) {
      toAtlas(id);
      notice("Не удалось загрузить уровень. Попробуйте ещё раз.");
    }
  } finally {
    if (token === playToken) {
      starting = false;
      $("#game-loading").hidden = true;
    }
  }
}
function toAtlas(id = game.run?.level.id || atlas.selected) {
  playToken++;
  starting = false;
  game.stop();
  clearDialogs();
  document.body.classList.remove("is-playing");
  $("#playfield").hidden = true;
  $("#atlas").hidden = false;
  $("#game-loading").hidden = true;
  $("#nav-map").setAttribute("aria-current", "page");
  $("#nav-map span").textContent = "Карта мира";
  $("#footer-hint").innerHTML = `${icon("mouse", 17)}Перетаскивайте карту`;
  $("#notice").classList.remove("show");
  atlas.select(id);
  atlas.home();
  paintStats();
}
function finishRun(run) {
  lastResult = resultOf(run);
  if (run.status === "won") {
    recordFinish(save, run.level.id, lastResult);
    persist();
    paintStats();
  }
  show(run.status === "won" ? "won" : "lost");
}
function show(kind, data = {}, nested = false) {
  if (starting && !game.active) return;
  if (game.active) game.pause();
  if (!nested) views = [];
  views.push({ kind, data });
  paintDialog();
  if (!dialog.open) dialog.showModal();
}
function back() {
  if (!views.length) return;
  const kind = views.at(-1).kind;
  if (views.length > 1) {
    views.pop();
    paintDialog();
    return;
  }
  if (kind === "won" || kind === "lost") {
    toAtlas(kind === "won" ? unlockedCount(save) : game.run.level.id);
    return;
  }
  clearDialogs();
  if (game.active) game.resume();
}
const action = (id, label, cls = "primary", ico = "") =>
  `<button class="${cls}" data-action="${id}">${ico ? icon(ico, 16) : ""}${label}</button>`;
const modalHead = (label, title, ico = "sparkle") =>
  `<div class="modal-eyebrow">${icon(ico, 12)}${label}</div><h2 id="dialog-title">${title}</h2>`;
const closeButton = `<button class="icon-btn modal-close" aria-label="Закрыть" data-action="back">${icon("close", 16)}</button>`;
const owner = () =>
  levels[(game.active ? game.run.level.id : atlas.selected) - 1];
function paintDialog() {
  const view = views.at(-1);
  if (!view) return;
  const { kind, data } = view;
  let html = "",
    total = totals(save),
    l = owner();
  $("#nav-journal").classList.toggle("current", kind === "journal");
  $("#nav-map").classList.toggle("current", kind !== "journal" && !game.active);
  if (kind === "journal") {
    html =
      modalHead("ЗАПИСИ ИСКАТЕЛЬНИЦЫ", "Дневник путешествий", "book") +
      `<p class="modal-sub">Все открытые тропы и ваши лучшие результаты.</p><div class="journal-stats"><div class="journal-stat"><b>${icon("flag", 16)}${total.finished} / 8</b><span>Пройдено уровней</span></div><div class="journal-stat"><b>${coinIcon(19)}${total.coins}</b><span>Монеты</span></div><div class="journal-stat"><b>${gemIcon(19)}${total.stars}</b><span>Кристаллы</span></div></div><div class="rule-title">НЕБЕСНЫЕ ОСТРОВА</div><div class="journal-list">${levels
        .map((level) => {
          const r = save.records[level.id],
            open = isOpen(save, level.id);
          return `<button class="journal-row ${open ? "" : "locked"}" data-action="locate" data-id="${level.id}"><span class="journal-index">${num(level.id)}</span><span class="journal-info"><strong>${level.name}</strong><small>${r ? `Пройдено · ${fmtTime(r.time)} · ${r.coins} мон.` : open ? "Открыто для путешествия" : `После уровня ${num(level.id - 1)}`}</small></span>${r ? stars(r.stars, 11) : icon(open ? "chevron" : "lock", 15)}</button>`;
        })
        .join("")}</div>`;
  } else if (kind === "help") {
    const k = (s) => `<kbd>${s}</kbd>`,
      row = (text, key) =>
        `<div class="control-row"><span>${text}</span><span class="key-group">${key}</span></div>`;
    html =
      modalHead("ПАМЯТКА ИСКАТЕЛЬНИЦЫ", "Управление", "keys") +
      `<p class="modal-sub">Доберитесь до сияющего портала. Используйте платформы, верёвочные лестницы и магию Лиры.</p><div class="rule-title">НА УРОВНЕ</div><div class="control-list">${row("Движение", k("A") + k("D") + "<i>или</i>" + k("←") + k("→"))}${row("Вверх / вниз по лестнице", k("W") + k("S") + "<i>или</i>" + k("↑") + k("↓"))}${row("Прыжок", k("Пробел"))}${row("Спрыгнуть с платформы", k("↓") + "<i>+</i>" + k("Пробел"))}${row("Магический заряд", k("F"))}${row("Пауза", k("Esc"))}</div><div class="rule-title">ТРИ ЗВЕЗДЫ</div><p class="modal-sub">Одна звезда — за финиш, вторая — за цель по монетам, третья — за путь без урона. Каждая звезда приносит кристалл.</p><div class="rule-title">НА КАРТЕ</div><p class="modal-sub">Нажмите на метку, чтобы выбрать уровень. Перетаскивайте карту мышью или пальцем. Колесо, щипок или кнопки + и − меняют масштаб.</p><p class="subtle-note mobile-copy">На сенсорном экране используйте кнопки внизу игрового поля.</p><div class="modal-buttons">${action("back", "Всё понятно", "primary", "check")}</div>`;
  } else if (kind === "settings") {
    const setting = (title, key, value, ico) =>
      `<div class="setting-row"><span class="setting-label">${icon(ico, 17)}${title}</span><button class="switch" role="switch" aria-label="${title}" aria-checked="${value}" data-action="${key}"></button></div>`;
    html =
      modalHead("ПАРАМЕТРЫ ИГРЫ", "Настройки", "settings") +
      `<div class="settings-list">${setting("Звуковые эффекты", "sound", save.sound, "volume")}${setting("Свечение и частицы", "motion", save.motion, "sparkle")}<div class="setting-row"><span class="setting-label">${icon("fullscreen", 17)}Полный экран</span>${action("fullscreen", document.fullscreenElement ? "Выйти" : "Включить", "text-button")}</div><div class="setting-row"><span class="setting-label">${icon("save", 17)}Сохранение</span>${action("reset-confirm", "Начать заново", "text-button")}</div></div><p class="subtle-note" id="pref-note">${icon("shield", 15)}Прогресс сохраняется автоматически в этом браузере после прохождения уровня.</p><div class="modal-buttons">${action("back", "Готово", "primary", "check")}</div>`;
  } else if (kind === "reset") {
    html =
      modalHead("СОХРАНЕНИЕ", "Начать заново?", "reset") +
      `<p class="modal-sub">Открытые уровни, монеты и лучшие результаты будут сброшены. Снова будет доступна только «Лесная тропа». Отменить это действие нельзя.</p><div class="modal-buttons">${action("back", "Отмена", "secondary")}${action("reset", "Сбросить прогресс", "danger")}</div>`;
  } else if (kind === "pause") {
    html =
      modalHead(
        `УРОВЕНЬ ${num(l.id)} · ${l.name.toUpperCase()}`,
        "Путевая пауза",
        "flag",
      ) +
      `<p class="modal-sub">Путешествие подождёт. Продолжите с того же места, когда будете готовы.</p><div class="modal-buttons stack">${action("resume", "Продолжить", "primary", "play")}${action("help", "Управление", "secondary", "keys")}${action("leave-confirm", "На карту мира", "secondary", "map")}</div>`;
  } else if (kind === "leave") {
    html =
      modalHead("ВЫХОД ИЗ УРОВНЯ", "Вернуться на карту?", "map") +
      `<p class="modal-sub">Текущая попытка завершится. Уже пройденные уровни и сохранённые награды останутся в дневнике.</p><div class="modal-buttons">${action("back", "Остаться", "secondary")}${action("leave", "На карту", "primary", "map")}</div>`;
  } else if (kind === "won") {
    const r = lastResult,
      more = l.id < levels.length;
    html = `<div class="result-summary">${modalHead("ПУТЕШЕСТВИЕ ЗАВЕРШЕНО", "Уровень пройден!", "flag")}<p class="modal-sub">${l.name} · ${fmtTime(r.time)}</p><div class="result-stars">${[1, 2, 3].map((i) => icon("star", 30, i <= r.stars ? "earned" : "")).join("")}</div></div><div class="rule-title">ИТОГИ ПУТЕШЕСТВИЯ</div><div class="result-row">${icon("check", 15)}Портал найден<b>1 звезда</b></div><div class="result-row">${coinIcon(16)}Цель по монетам<b>${r.coins} / ${l.coinTarget}</b></div><div class="result-row">${icon("heart", 15)}Без потери здоровья<b>${r.undamaged ? "Да" : "Нет"}</b></div><p class="unlock-note">${more ? `Доступна тропа ${num(l.id + 1)} · ${levels[l.id].name}` : "Все тропы архипелага открыты!"}</p>${!persisted ? '<p class="modal-sub">Хранилище браузера недоступно. Результат сохранён до закрытия страницы.</p>' : ""}<div class="modal-buttons">${action("result-map", "На карту", "secondary", "map")}${action(more ? "next" : "retry", more ? "Следующий уровень" : "Ещё раз", "primary", more ? "arrow" : "reset")}</div>`;
  } else if (kind === "lost") {
    html =
      modalHead("ПОПЫТКА ЗАВЕРШЕНА", "Силы иссякли", "heart") +
      `<p class="modal-sub">Лира вернулась к началу тропы. Перепрыгивайте слизней или используйте магический заряд, чтобы расчистить путь.</p><div class="journal-stats"><div class="journal-stat"><b>${coinIcon(18)}${game.run.coins}</b><span>Монеты за попытку</span></div><div class="journal-stat"><b>${icon("time", 18)}${fmtTime(game.run.time)}</b><span>Время в пути</span></div></div><div class="modal-buttons">${action("result-map", "На карту", "secondary", "map")}${action("retry", "Ещё раз", "primary", "reset")}</div>`;
  }
  $("#dialog-content").innerHTML =
    `<div class="modal-inner">${closeButton}${html}</div>`;
}
async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
    paintDialog();
  } catch {
    const n = $("#pref-note");
    if (n)
      n.textContent = "В этом окне браузер не разрешает полноэкранный режим.";
  }
}
$("#dialog-content").addEventListener("click", (e) => {
  const b = e.target.closest("[data-action]");
  if (!b) return;
  const a = b.dataset.action;
  const view = views.at(-1);
  sound.unlock();
  switch (a) {
    case "back":
      back();
      break;
    case "sound":
      save.sound = !save.sound;
      paintStats();
      persist();
      sound.unlock();
      sound.play("select");
      paintDialog();
      break;
    case "motion":
      save.motion = !save.motion;
      paintStats();
      persist();
      paintDialog();
      break;
    case "fullscreen":
      toggleFullscreen();
      break;
    case "reset-confirm":
      show("reset", {}, true);
      break;
    case "reset":
      save.records = {};
      persist();
      toAtlas(1);
      notice("Начато новое путешествие");
      break;
    case "help":
      show("help", {}, true);
      break;
    case "resume":
      clearDialogs();
      game.resume();
      break;
    case "leave-confirm":
      show("leave", {}, true);
      break;
    case "leave":
      toAtlas(view.data.locate || game.run.level.id);
      break;
    case "locate": {
      const id = Number(b.dataset.id);
      if (game.active) show("leave", { locate: id }, true);
      else {
        clearDialogs();
        atlas.select(id, true);
      }
      break;
    }
    case "result-map":
      toAtlas(
        game.run.status === "won" ? unlockedCount(save) : game.run.level.id,
      );
      break;
    case "next":
      startLevel(game.run.level.id + 1);
      break;
    case "retry":
      startLevel(game.run.level.id);
      break;
  }
});
dialog.addEventListener("cancel", (e) => {
  e.preventDefault();
  back();
});
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      back();
  }
});
$("#nav-journal").onclick = () => show("journal");
$("#settings").onclick = () => show("settings");
$("#help").onclick = () => show("help");
$("#pause-game").onclick = () => show("pause");
$("#nav-map").onclick = () => {
  if (game.active) show("leave");
  else if (!starting) atlas.home();
};
$("#zoom-in").onclick = () => atlas.setZoom(atlas.zoom + 0.2);
$("#zoom-out").onclick = () => atlas.setZoom(atlas.zoom - 0.2);
$("#recenter").onclick = () => {
  atlas.home();
  sound.play("select");
};
$("#audio-toggle").onclick = () => {
  save.sound = !save.sound;
  paintStats();
  persist();
  sound.unlock();
  sound.play("select");
};
window.addEventListener("keydown", (e) => {
  if (dialog.open || e.repeat) return;
  if (e.code === "Escape" && game.active) {
    e.preventDefault();
    show("pause");
  } else if (e.code === "F1" || e.key === "?") {
    e.preventDefault();
    show("help");
  } else if (
    !game.active &&
    !starting &&
    ["Equal", "NumpadAdd", "Minus", "NumpadSubtract"].includes(e.code)
  ) {
    e.preventDefault();
    const zoomIn = e.code === "Equal" || e.code === "NumpadAdd";
    atlas.setZoom(atlas.zoom + (zoomIn ? 0.2 : -0.2));
  }
});
function autoPause() {
  if (game.active && !game.paused && !dialog.open) show("pause");
}
window.addEventListener("blur", autoPause);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) autoPause();
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Script } from "node:vm";

// Test the file a player actually downloads, not the Vite development server.
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("the shipped HTML contains a classic script and needs no module loader", () => {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  assert.equal(scripts.length, 1);
  const [, attributes, code] = scripts[0];
  assert.doesNotMatch(attributes, /\bsrc\s*=|\bmodule\b/i);
  assert.doesNotMatch(code, /\bimport\.meta\b|\bimport\s*\(/);
  assert.doesNotThrow(() => new Script(code));
  assert.ok(
    code.includes("data:image/webp;base64,"),
    "embed the gameplay sprites",
  );
});

test("the HTML shell, map, and fonts do not depend on neighboring files or a host", () => {
  const css = html.match(/<style>([\s\S]*?)<\/style>/i)?.[1];
  assert.ok(css, "ship a styled page even when opened via file://");
  assert.doesNotMatch(css, /@import\b/i);
  const urls = [...css.matchAll(/url\(\s*["']?([^)'"\s]+)/gi)].map((m) => m[1]);
  assert.ok(
    urls.some((url) => url.startsWith("data:image/webp;")),
    "embed the map",
  );
  assert.ok(
    urls.some((url) => url.startsWith("data:font/woff2;")),
    "embed the fonts",
  );
  assert.ok(
    urls.every((url) => url.startsWith("data:")),
    "external CSS asset in portable page",
  );

  const shell = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  const resources = [
    ...shell.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi),
  ];
  assert.ok(
    resources.every(([, url]) => url.startsWith("data:")),
    "external HTML resource in portable page",
  );
});

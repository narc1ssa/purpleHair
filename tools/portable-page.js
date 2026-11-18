import { copyFile, readFile } from "node:fs/promises";
import { join } from "node:path";

// Package the same page used by the dev server. All inputs are local. Vite's
// library build embeds the images/fonts and produces one classic script (IIFE).
export function portablePage(root) {
  return {
    name: "aetheria-portable-page",
    apply: "build",
    enforce: "post",
    generateBundle: {
      order: "post",
      async handler(_options, bundle) {
        const outputs = Object.values(bundle);
        const js = outputs.find((o) => o.type === "chunk" && o.isEntry);
        const css = outputs.find(
          (o) => o.type === "asset" && o.fileName.endsWith(".css"),
        );
        if (
          !js ||
          !css ||
          outputs.length !== 2 ||
          js.imports.length ||
          js.dynamicImports.length
        ) {
          this.error(
            "The portable game must contain exactly one JS bundle, one stylesheet and no external imports.",
          );
        }

        const [template, favicon, ...licenses] = await Promise.all([
          readFile(join(root, "src/index.html"), "utf8"),
          readFile(join(root, "src/favicon.svg"), "base64"),
          ...["lora", "manrope"].map((name) =>
            readFile(join(root, `assets/fonts/LICENSE-${name}`), "utf8"),
          ),
        ]);
        const styles = `/* Embedded font licenses:\n${licenses.join("\n\n")}\n*/\n${css.source}`;
        let html = template;
        for (const [marker, content] of [
          [
            "<!doctype html>",
            "<!doctype html>\n<!-- Автономная игра. Исходники: src/. Пересборка: npm run build. -->",
          ],
          [
            'href="./favicon.svg"',
            `href="data:image/svg+xml;base64,${favicon}"`,
          ],
          [
            "<!-- game:styles -->",
            `<style>\n${styles.replace(/<\/style/gi, "<\\/style")}\n</style>`,
          ],
          [
            '<script type="module" src="./main.js"></script>',
            `<script>\n${js.code.replace(/<\/script/gi, "<\\/script")}\n</script>`,
          ],
        ]) {
          if (!html.includes(marker))
            this.error(`Missing portable page template marker: ${marker}`);
          // A replacement function preserves dollar signs in generated JS/CSS.
          html = html.replace(marker, () => content);
        }
        delete bundle[js.fileName];
        delete bundle[css.fileName];
        this.emitFile({ type: "asset", fileName: "index.html", source: html });
      },
    },
    async writeBundle({ dir }) {
      // Ship a ready-to-open file in the checkout, not just in ignored dist/.
      await copyFile(join(dir, "index.html"), join(root, "index.html"));
    },
  };
}

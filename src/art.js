export const art = {
  world: new URL("../assets/world.webp", import.meta.url).href,
  level: new URL("../assets/level.webp", import.meta.url).href,
  preview: new URL("../assets/forest-preview.webp", import.meta.url).href,
  portrait: new URL("../assets/hero/portrait.webp", import.meta.url).href,
  hero: Object.entries(
    import.meta.glob("../assets/hero/run-*.webp", {
      eager: true,
      query: "?url",
      import: "default",
    }),
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, u]) => u),
  cast: new URL("../assets/hero/cast.webp", import.meta.url).href,
  blue: new URL("../assets/slime-blue.webp", import.meta.url).href,
  rose: new URL("../assets/slime-rose.webp", import.meta.url).href,
  coin: new URL("../assets/coin.webp", import.meta.url).href,
};

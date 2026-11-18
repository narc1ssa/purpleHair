import level from "../assets/level.webp";
import cast from "../assets/hero/cast.webp";
import blue from "../assets/slime-blue.webp";
import rose from "../assets/slime-rose.webp";
import coin from "../assets/coin.webp";

// Vite serves URLs during development and embeds these assets in the
// standalone build. No runtime requests for modules or sprite manifests.
const hero = Object.entries(
  import.meta.glob("../assets/hero/run-*.webp", {
    eager: true,
    query: "?url",
    import: "default",
  }),
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, url]) => url);

export const art = { level, hero, cast, blue, rose, coin };

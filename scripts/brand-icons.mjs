// Builds the favicon, Apple touch icon and brand exports from the mark geometry
// in components/Logo.tsx. Run: node scripts/brand-icons.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

sharp.cache(false);

const P = {
  dashed: "M25.7 40.2 C 24.2 49.5, 28.5 56.6, 37 56.6 C 42.5 56.6, 46.5 54, 48.8 51",
  solid: "M48.8 51 C 54 43.6, 59 42.6, 62.2 42.6 C 70.5 42.6, 76.2 49, 75.6 55.5 C 75.4 57.9, 75.1 59.6, 74.6 61.4",
};
const CITRINE = "#E5FF5D", CARBON = "#0B0B0B", BONE = "#F2EFE8", CREAM = "#F1EEE4";

/** bg: tile colour or null; ink: stroke colour; w/dash: stroke weight and dash for the size. */
function svg({ bg, ink, w = 2.05, dash = "1.7 3", box = "18 18 64 64", radius = 0, px = 1024 }) {
  const [x, y, s] = box.split(" ").map(Number);
  const tile = bg ? `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${radius}" fill="${bg}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" width="${px}" height="${px}">${tile}
<g fill="none" stroke="${ink}" stroke-width="${w}" stroke-linecap="round">
<circle cx="35" cy="35.4" r="9.3"/>
<path d="${P.dashed}" stroke-dasharray="${dash}"/>
<path d="${P.solid}"/>
<circle cx="65" cy="64.7" r="9.3" fill="${CITRINE}"/>
</g></svg>`;
}

// Favicon: carbon tile so it reads on light and dark browser tabs; heavier strokes for 16 px.
const favicon = svg({ bg: CARBON, ink: BONE, w: 3.4, dash: "2.6 3.6", box: "16 16 68 68", radius: 15, px: 64 });
writeFileSync("app/icon0.svg", favicon);
await sharp(Buffer.from(svg({ bg: CARBON, ink: BONE, w: 3.4, dash: "2.6 3.6", box: "16 16 68 68", radius: 15, px: 256 }))).resize(48, 48).png().toBuffer().then((b) => writeFileSync("app/icon1.png", b));
// iOS rounds the corners itself, so the touch icon is a full square.
await sharp(Buffer.from(svg({ bg: CARBON, ink: BONE, w: 2.6, dash: "2 3.2", box: "12 12 76 76", px: 720 }))).resize(180, 180).png().toBuffer().then((b) => writeFileSync("app/apple-icon.png", b));

// Brand exports for decks, socials and the press kit.
mkdirSync("public/brand", { recursive: true });
const exports = {
  "mark-on-carbon": { bg: CARBON, ink: BONE },
  "mark-on-cream": { bg: CREAM, ink: CARBON },
  "mark-carbon-transparent": { bg: null, ink: CARBON },
  "mark-bone-transparent": { bg: null, ink: BONE },
};
for (const [name, o] of Object.entries(exports)) {
  const s = svg({ ...o, box: "20 20 60 60" });
  writeFileSync(`public/brand/${name}.svg`, s);
  await sharp(Buffer.from(s)).png().toBuffer().then((b) => writeFileSync(`public/brand/${name}.png`, b));
}
await sharp(Buffer.from(svg({ bg: CARBON, ink: BONE, box: "10 10 80 80", px: 1024, radius: 18 }))).png().toBuffer().then((b) => writeFileSync("public/brand/app-icon-1024.png", b));
console.log("Wrote app/icon0.svg, app/icon1.png, app/apple-icon.png and public/brand/*");

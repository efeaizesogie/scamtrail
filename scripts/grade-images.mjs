// Carbon colour grade and upscale for the photo set.
// Keeps the citrine light, turns every other hue into neutral graphite, and
// crushes the blacks toward #0b0b0b. Reads assets/originals, writes public/images.
// Usage: node scripts/grade-images.mjs
import sharp from "sharp";
import { readdirSync, mkdirSync } from "node:fs";

const SRC = "assets/originals";
const OUT = "public/images";
mkdirSync(OUT, { recursive: true });

/** Per-image tone settings. `gamma` > 1 darkens midtones, `gain` scales the result. */
const TONE = {
  fog: { gamma: 1.45, gain: 0.72 },   // bright haze would sit behind white headline text
  aisle: { gamma: 1.05, gain: 1 },
  default: { gamma: 1.1, gain: 1 },
};

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/**
 * Output width per image, sized to how far the page zooms into it: the desk and
 * light table are zoomed by the scroll camera, the aisle and fog run full bleed.
 * Upscaling uses Lanczos after a slight de-block, then a light sharpen and a fine
 * grain so enlarged areas read as texture instead of blur. It cannot invent real
 * detail: regenerate or AI-upscale the originals for that.
 */
const WIDTH = { desk: 4096, lighttable: 4096, aisle: 3200, fog: 2880, default: 2560 };
const GRAIN = 2.2; // +/- levels of luminance noise

/** Renders handled elsewhere: the cube is keyed to alpha by scripts/cube-alpha.mjs. */
const SKIP = new Set(["cube"]);

for (const file of readdirSync(SRC).filter((f) => f.endsWith(".webp"))) {
  if (SKIP.has(file.replace(".webp", ""))) continue;
  const name = file.replace(".webp", "");
  const tone = TONE[name] ?? TONE.default;
  const width = WIDTH[name] ?? WIDTH.default;
  const { data, info } = await sharp(`${SRC}/${file}`)
    .removeAlpha()
    .blur(0.45)                                   // soften compression blocks before enlarging
    .resize({ width, kernel: "lanczos3" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let seed = 1234567;
  const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), c = max - min;
    let h = 0;
    if (c > 0) h = max === r ? 60 * (((g - b) / c) % 6) : max === g ? 60 * ((b - r) / c + 2) : 60 * ((r - g) / c + 4);
    if (h < 0) h += 360;
    const sat = max === 0 ? 0 : c / max;
    // Citrine weight: yellow-green hues with real saturation.
    const w = smooth(40, 58, h) * (1 - smooth(105, 125, h)) * smooth(0.18, 0.4, sat);
    const L0 = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const L = Math.pow(Math.max(0, (L0 - 0.015) / 0.985), tone.gamma) * tone.gain;
    const lift = 0.043; // carbon floor, about #0b0b0b
    const grey = lift + L * (1 - lift);
    // Citrine pixels keep their own colour, rescaled to the new tone; everything else goes neutral.
    const scale = L0 > 0.001 ? grey / Math.max(L0, lift) : 1;
    const src = [r, g, b];
    const n = (rand() * GRAIN) / 255;
    for (let ch = 0; ch < 3; ch++) {
      const kept = Math.min(1, src[ch] * Math.min(scale, 1.1));
      out[i + ch] = Math.round(Math.min(1, Math.max(0, grey * (1 - w) + kept * w + n)) * 255);
    }
  }
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } })
    .sharpen({ sigma: 1.1, m1: 0.5, m2: 1.6 })
    .webp({ quality: 90, effort: 5, smartSubsample: true })
    .toFile(`${OUT}/${name}.webp`);
  console.log("graded", name, `${info.width}x${info.height}`);
}

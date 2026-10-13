// Turns the cube render's black backdrop into transparency.
// Alpha is the brightest channel; colour is un-premultiplied, so the result
// over black is identical to the original, and over any other colour it
// behaves like light (a screen blend baked into the file).
// Usage: node scripts/cube-alpha.mjs
import sharp from "sharp";

const { data, info } = await sharp("assets/originals/cube.webp").removeAlpha().raw().toBuffer({ resolveWithObject: true });
const out = Buffer.alloc(info.width * info.height * 4);
for (let p = 0, q = 0; p < data.length; p += 3, q += 4) {
  const r = data[p], g = data[p + 1], b = data[p + 2];
  let a = Math.max(r, g, b);
  a = a < 6 ? 0 : a; // clean pure-black backdrop
  out[q] = a ? Math.min(255, Math.round((r * 255) / a)) : 0;
  out[q + 1] = a ? Math.min(255, Math.round((g * 255) / a)) : 0;
  out[q + 2] = a ? Math.min(255, Math.round((b * 255) / a)) : 0;
  out[q + 3] = a;
}
await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
  .webp({ quality: 90, alphaQuality: 90, effort: 6 })
  .toFile("public/images/cube.webp");
console.log("cube.webp with alpha written");

// Opaque-bodied variant for light backgrounds: the glass body keeps the
// render's own shading, and only the halo stays translucent.
{
  const out2 = Buffer.alloc(info.width * info.height * 4);
  for (let p = 0, q = 0; p < data.length; p += 3, q += 4) {
    const r = data[p], g = data[p + 1], b = data[p + 2];
    const m = Math.max(r, g, b);
    const a = Math.min(1, Math.max(0, (m - 26) / 110));
    out2[q] = a ? Math.min(255, Math.round(r / a)) : 0;
    out2[q + 1] = a ? Math.min(255, Math.round(g / a)) : 0;
    out2[q + 2] = a ? Math.min(255, Math.round(b / a)) : 0;
    out2[q + 3] = Math.round(a * 255);
  }
  await sharp(out2, { raw: { width: info.width, height: info.height, channels: 4 } })
    .resize(512, 512)
    .webp({ quality: 90, alphaQuality: 90, effort: 6 })
    .toFile("public/images/cube-solid.webp");
  console.log("cube-solid.webp written");
}

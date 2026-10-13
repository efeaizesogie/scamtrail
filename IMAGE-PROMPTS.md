# ScamTrail image and 3D prompts

One entry per section. Each one gives the image prompt, the 3D model prompt where the section uses one, where the page puts text over it (leave that area empty), and the file name the page expects.

The image prompts are written for Midjourney, Flux, Imagen, Ideogram and similar. The 3D prompts are written for text-to-3D tools such as Meshy, Tripo, Rodin or Luma Genie, or as a brief for a Blender or Spline artist.

---

## 0. Shared blocks (paste with every prompt)

### Style block: photos

```
Ultra-premium product-film still, the precision of a flagship hardware launch
film. Immaculate surfaces, no dust unless asked, perfect geometry. One
controlled key light only: a citrine lime-yellow (#E5FF5D) source, everything
else falls to deep carbon black (#0B0B0B) and neutral graphite. Crisp
specular highlights on edges, soft falloff, rich shadow detail without noise.
Shot on a medium-format camera, 50mm or 100mm macro lens, f/2.8, shallow
depth of field, very fine grain. Calm, minimal, expensive. Generous empty
negative space. No people, no hands, no faces, no readable text, no letters,
no numbers, no logos, no brand marks, no UI screenshots.
```

### Style block: 3D renders

```
Studio product render, physically based materials, ray-traced, ultra-clean
topology, beveled edges of 0.5 to 1 mm that catch a thin specular line.
Single citrine lime (#E5FF5D) emissive or key light, black studio void,
subtle rim light in neutral white at 10% strength. No floor shadow unless
asked, no text, no logos. Transparent background (alpha) where possible.
```

### Negative prompt (paste where the model supports one)

```
people, person, hands, fingers, face, silhouette, text, letters, numbers,
typography, logo, watermark, signature, brand, UI, screen content, blue light,
purple, pink, red, orange, cyan, neon, rainbow, lens flare streaks, bokeh hearts,
cartoon, illustration, anime, low poly, plastic toy look, clutter, mess,
oversaturated, HDR halo, chromatic aberration, dust specks, fingerprints
```

### Colour grade (apply after generating)

Desaturate everything except the citrine light. Crush the blacks to about #0B0B0B. Pull any green, yellow or white highlight toward #E5FF5D. If the model adds blue or purple anywhere, remove it. The page has one accent colour and the photos have to keep it.

### Export

- Photos: 16:9, generate at 2K or above. Export `-1600` and `-800` widths in both AVIF and WebP, for example `img-hero-1600.avif`, `img-hero-800.webp`. Keep the hero under 250 KB.
- 3D: export a transparent PNG at 2048 px, plus a GLB file (under 2 MB, Draco-compressed) if you want it to be interactive later.
- Put the files in `public/images/` and set `src` for the slot in `lib/images.ts`.

---

## 1. Hero — "Investigate before you trust"

**Layout on the page:** the image fills the screen. The cube, the headline and the search bar sit in the centre column, from the top down to about 70% height. The light has to land low and centred, below the search bar. Keep the top half nearly black.

### IMG-HERO — data centre aisle (photo)

```
[Style block: photos] A long, empty, immaculate data centre aisle in perfect
one-point perspective, camera at floor height looking straight down the
centre line. Tall matte-black server racks on both sides, their front panels
a precise grid of perforated metal, every indicator light off. At the far
end, a single thin strip of citrine lime light is set flush into the
polished concrete floor, as if a beacon is waiting there. Faint atmospheric
haze catches the light in a soft volumetric glow. The floor is a dark mirror
with a long, soft citrine reflection running toward the camera. The upper
55% of the frame is almost pure black: ceiling lost in shadow. Symmetrical,
silent, architectural. 16:9.
```

Mobile crop (optional): the same prompt at 9:16, with the strip of light at about 75% height.

### CUBE-HERO — Citrine Cube (3D, the logo object)

```
[Style block: 3D renders] A single perfect cube of solid citrine-lime glass,
about 10 cm, floating in black space. It glows softly from within as if lit
by a light source sealed inside, with the brightest core toward the upper
front edge. Faces are slightly frosted; the edges are polished clear glass
bevels that catch hot white-lime specular lines. Subtle internal refraction
shows faint inner edges, like a cube inside a cube. A soft spherical halo of
lime light surrounds it and fades to black within one cube-width. Isometric
three-quarter view: top face visible, left face darker, right face
brightest. No floor, no reflection, no shadow. Transparent background. 1:1.
```

3D model brief: a 1 x 1 x 1 cube with a 4% bevel. Material: transmission 0.6, roughness 0.15, IOR 1.5, emission `#E5FF5D` at strength 3 from an inner smaller cube (scale 0.7). Point light inside. Bloom in post. Animation: a slow Y-axis rotation of 360° over 24 s, loopable, exported as a 6 s WebM with alpha (VP9) at 1024 px.

---

## 2. The thread — "One name leads to the next"

**Layout on the page:** the copy sits on the left 40%, and an animated node graph covers the right 60%. Keep the right side darker and less detailed, so the lines stay readable over it.

### IMG-DESK — investigation desk (photo)

```
[Style block: photos] Overhead three-quarter view of a matte black desk in a
dark room. Several crisp sheets of printed paper are fanned out on the left
half; their printed content is a soft, unreadable blur of grey lines. A
closed, unmarked matte-black hardware wallet lies near the bottom right. A
heavy steel jeweller's loupe sits at bottom left. Fine pale-grey threads are
pulled taut between small steel pins that link the papers like an
investigator's map. In the top right corner, the edge of a slim monitor casts
a narrow citrine lime glow across the paper edges, grazing their texture.
Everything else is underexposed. Right half of the frame mostly dark desk
surface. 16:9.
```

### NODE-TOKENS — four source objects (3D, optional)

Use these if you want physical objects at the four graph nodes in place of the line icons. Generate each one separately with the same lighting.

```
[Style block: 3D renders] A small circular token, 4 cm across and 6 mm thick,
machined from matte black anodised aluminium with a polished chamfered rim
that catches a thin citrine lime highlight. On its face, a single simple
line symbol is engraved and filled with soft lime light: [SYMBOL].
Three-quarter top view, floating, transparent background, 1:1.
```

Replace `[SYMBOL]` with each of these in turn:
1. `an "@" sign made of one continuous line` (HANDLE)
2. `a minimal wallet outline: a rounded rectangle with a small tab` (WALLET)
3. `a globe made of one circle, one horizontal line and one vertical ellipse` (DOMAIN)
4. `a document outline with a folded corner and angle brackets inside` (CONTRACT)

---

## 3. Handle history — "See every name an account has used"

**Layout on the page:** the photo sits behind a list of five handles running top to bottom. The front of the stack should be lit and sharp, with each plate behind it dimmer, ending in mist.

### IMG-CARDS — glass identity plates (photo, or 3D render)

```
[Style block: photos] Five thick slabs of optical glass, each the size and
proportion of an ID card, standing upright in a row and fanned slightly in
deep perspective on a black acrylic surface. The front slab is crystal clear
with a crisp citrine lime light running along its polished edge. Each slab
behind it is progressively frostier and dimmer; the fifth is almost
dissolved into grey mist. Each slab carries fine laser-etched abstract line
patterns, never letters. Mirror-like reflections on the black acrylic.
Vast dark space around. 16:9.
```

3D model version (good for depth parallax): five boxes measuring 86 x 54 x 6 mm with a 1 mm bevel. Glass material, with roughness rising from 0.02 to 0.6 from front to back and opacity falling. A citrine emissive strip on the front plate's bottom edge only. Render as one PNG, or as five separate PNG layers (`plate-1.png` to `plate-5.png`) so the page can peel them apart.

---

## 4. Evidence spectrum — "Allegations are not findings"

**Layout on the page:** the headline sits top left. Five cards in a row sit over the middle band, with their captions below. The table and its glow need to sit in the lower 40% of the frame.

### IMG-LIGHTTABLE — forensic light table (photo)

```
[Style block: photos] Eye-level view along a long, low forensic light table
in a dark lab. The tabletop is a sheet of milky glass lit from below. Five
translucent film sheets lie on it in a neat row from left to right. The left
sheet is crisp and brightly backlit in citrine lime; each sheet to its right
is more faded, and the rightmost is almost invisible. The sheets show only
abstract line diagrams and faint grid marks. A precise brushed-steel ruler
runs along the front edge. Glossy reflections. The upper half of the frame is
dark wall. 16:9.
```

### FILM-SHEETS — five separate sheets (3D, optional)

```
[Style block: 3D renders] A single translucent film sheet, 3:4 portrait,
slightly curled at one corner, floating at a gentle tilt. It is backlit by
[LIGHT]. On it is printed a faint technical grid and one simple line graph of
three points. Transparent background.
```

Replace `[LIGHT]` with each of these, one per evidence class:
1. `a strong citrine lime light; crisp and bright` (Confirmed incident)
2. `a cool white light at 80% strength` (Credible allegation)
3. `a white light at 60% strength, the line printed dashed` (Community complaint)
4. `a dim white light at 40%, the line printed dotted` (Unverified claim)
5. `almost no light at 25%, the line broken in the middle` (Misattributed result)

---

## 5. The fog — "No reports found is not the same as safe"

**Layout on the page:** the headline and caption are centred in the upper 45%. The stones take the lower half, leading from the bottom centre toward the horizon.

### IMG-FOG — stepping stones on a black lake (photo)

```
[Style block: photos] A perfectly still black lake at night under heavy,
low-lying mist. Seven flat, dark, smooth stepping stones lead straight away
from the camera along the centre line, getting smaller toward the horizon.
The nearest stone is softly lit from just above by a small citrine lime
lantern glow, so its wet surface shines lime. The second and third stones
catch a faint trace of that light. The remaining four dissolve into dense
neutral grey mist (grey, never blue). A faint, unlit shoreline at the far
horizon. The upper half of the frame is soft dark grey haze with no detail.
Wide cinematic framing, total stillness. 16:9.
```

Layered version (for the parallax): generate the same scene three times and cut out the layers:
- `fog-lake.webp`: the lake, sky and shoreline only, with no stones and no mist.
- `fog-stones.png`: the stones only, on transparency.
- `fog-mist.png`: the mist only, on transparency.

---

## 6. On-chain constellation — "Trace the money without guessing the owner"

**Layout on the page:** the image sits inside a card on the left 60%. A graph of six hexagon nodes covers most of it, and a receipt panel covers the bottom 30%. Keep the image's centre of interest in the upper middle.

### IMG-CHAIN — fibre and hardware wallet macro (photo)

```
[Style block: photos] Extreme macro of a loose bundle of fine fibre optic
strands sweeping across a sheet of black glass in long, elegant curves.
Most strands are dark graphite; three of them carry a thin pulse of citrine
lime light travelling along them, glowing at the tips. In the lower right
corner, the rounded corner of a matte black hardware wallet with a polished
chamfer, completely unmarked. A few dust particles hang in the light beam.
Very shallow depth of field; background is soft graphite bokeh. 16:9.
```

### HARDWARE-WALLET — device (3D, optional)

```
[Style block: 3D renders] A minimal hardware crypto wallet, the size of a
small USB key, 60 x 30 x 9 mm, with softly rounded corners. Bead-blasted
matte black aluminium body with a single polished chamfer around the face,
which catches a thin citrine lime line of light. A flush, blank black glass
window on the top face with no display content. Completely unbranded, no
buttons with symbols. Three-quarter view, floating. Transparent background.
```

---

## 7. Live report — the cream band ("One report. Every source linked.")

**Layout on the page:** this is the only light section. Three or four tilted cubes sit at each side edge, partly cut off by the screen. The report mock-up in the middle is page code, not an image.

### CUBE-CLUSTER — tilted cubes on cream (3D)

```
Studio product render on a flat warm cream background (#F1EEE4), soft
diffuse daylight from the top left, no hard shadows, only a faint contact
shadow under each object. A loose cluster of four citrine-lime (#E5FF5D)
glass cubes of different sizes (large, medium, two small), each tilted at a
different angle as if frozen mid-tumble. Satin-frosted faces with polished
beveled edges. Each glows softly from within; on cream the glow reads as a
gentle lime bloom. Cluster sits against the left edge of the frame with the
largest cube partly cropped. No text, no logos. 3:4 portrait.
```

Generate a second one with the cluster on the right edge (three cubes), and save them as `cubes-left.png` and `cubes-right.png`. Use a transparent background if your tool supports it on a light scene.

---

## 8. How it works — Search, Trace, Decide

**Layout on the page:** three 16:9 frames stacked one under another. Each frame starts blurred and sharpens as you scroll to it, so each needs one clear, central subject.

### IMG-STEP1 — Search (photo)

```
[Style block: photos] Close-up, low angle, of a row of matte black low-profile
keyboard keys in the foreground, softly out of focus, all blank. Behind them,
the thin bezel edge of a dark monitor shows a single slim horizontal slit of
citrine lime light across its centre, like a search bar glowing. The light
reflects as a long lime streak across the keys and the polished desk. All
else black. 16:9.
```

### IMG-STEP2 — Trace (photo)

```
[Style block: photos] Top-down view of a large sheet of dark charcoal paper
pinned to a board. Seven small brushed-steel map pins are spread across it,
connected by fine pale threads pulled taut between them. Exactly one thread,
running diagonally through the centre, glows citrine lime along its full
length; the other threads are muted white. Each pin casts a tiny precise
shadow. 16:9.
```

### IMG-STEP3 — Decide (photo)

```
[Style block: photos] A single sheet of thick blank paper lying slightly
angled on a black desk, inside a tight pool of citrine lime light from a
narrow desk lamp just out of frame above. A slim matte black pen lies
diagonally across the paper. Outside the pool of light, everything is black.
Calm, decisive, still. 16:9.
```

---

## 9. Trust and methodology — "Corrections are public"

**Layout on the page:** a 16:10 card on the left 60%, with the copy on the right.

### IMG-ARCHIVE — card catalogue drawer (photo)

```
[Style block: photos] A long dark-steel library card-catalogue drawer pulled
fully open, seen from slightly above and in front. Rows of blank cream index
cards stand upright in perfect order, with small abstract rubber-stamp marks
that cannot be read. One card in the middle is raised a few centimetres
above the others and is lit from directly above by a thin citrine lime beam;
the rest stay in graphite shadow. Machined metal and dark wood textures.
16:10.
```

---

## 10. Final call to action — "Start with one name"

**Layout on the page:** a large cube sits in the centre, with dashed lines radiating out to small rings. The headline and search bar sit below it. The hero image repeats behind at 30% opacity, so no new background photo is needed.

### CUBE-FINAL — cube with constellation (3D)

```
[Style block: 3D renders] The citrine-lime glass cube from the hero, larger
and front-facing at a slight isometric tilt, glowing from within. Six thin
dashed lines of pale white light radiate outward from its edges to six tiny
hollow metal rings floating at different depths around it, like a
constellation with the cube at its centre. Black void, transparent
background. 16:9.
```

---

## 11. Extras

### OG / social share image (1200 x 630)

```
[Style block: photos] The citrine-lime glass cube floating at the centre of
the dark data centre aisle, the aisle's floor light directly beneath it.
Left third of the frame empty black for a title. 1200x630.
```

The title text gets added in code or Figma afterwards. Image models render text poorly.

### Favicon / app icon

```
[Style block: 3D renders] The citrine-lime glass cube alone, centred, filling
80% of a square frame, top face visible, on pure #0B0B0B. 1:1, 1024 px.
```

---

## Tips for each tool

- **Midjourney:** add `--ar 16:9 --style raw --s 50 --q 2` to the end of the prompt, and put the negative words after `--no`. `--style raw` keeps the look of a real photo rather than an illustration.
- **Flux / Imagen:** paste the style block first and the scene second. Give the hex colour in words too ("citrine lime, like a highlighter").
- **Text-to-3D (Meshy, Tripo):** ask for the shape only, then set the materials and lighting yourself in Blender or Spline. These tools rarely get glass and glow right.
- **Consistency:** generate the hero first, then use it as a style reference for every other image (`--sref` in Midjourney, or an image prompt in other tools), so the light colour and black level match across the page.

---

## 12. Motion: where video earns its place

Most of the page moves through **scroll**: the camera zooms and pans across your stills as the reader scrolls. That motion belongs to the reader, which is what makes it feel deliberate. A video that plays on its own inside one of those scenes would fight the scroll, so I'm only asking for loops where the scene itself should feel alive while the reader is still.

| Priority | Clip | Where | Why it helps |
|---|---|---|---|
| 1 | Cube turn | Hero, final call to action | The logo object is the first thing anyone sees. A slow turn makes it read as a real object, not a sticker. |
| 2 | Fibre pulses | On-chain section | Light moving along the strands is literally "following the money". A still can't show direction. |
| 3 | Fog drift | "No reports found" section | The section is a pause. Barely moving mist makes the stillness feel intentional. |
| Optional | Aisle dolly | The walk-in after the hero | Real parallax between the racks is richer than zooming a still. Only worth it if you can get a clean, steady move. |

**Don't make video for** the desk, plates, light table, archive, search or trace images. The scroll camera already moves through those, and a second motion on top would muddy it.

### Rules for every clip

- Start from the exact still on the page (image-to-video), so the first frame matches and the swap is invisible.
- **Camera locked off** unless the clip is the dolly. No handheld wobble, no zoom, no cuts.
- No new light sources, no colour shifts, no lens flares, no people, no text.
- Seamless loop: the last frame must match the first.
- Export 1920 px wide, H.264 MP4, 24 fps, no audio, under 3 MB. Also export a WebM (VP9) if your tool can.
- Tools that do this well: Runway (Gen-4 image-to-video), Kling, Luma Ray, Veo, Sora.

### V1 — Cube turn (from `cube.webp`)

```
Image-to-video. The citrine glass cube turns slowly and continuously around
its vertical axis, exactly 90 degrees over 8 seconds at a perfectly constant
speed, so the last frame is identical to the first (a cube looks the same
after a quarter turn). The inner glow stays steady: no pulsing, no
flickering, no breathing. The internal refraction lines slide naturally
across the faces as it turns. Camera completely locked. Background stays
pure flat black (#0B0B0B) with no gradient, no particles, no floor. Seamless loop.
```

Note: the background must come out as exactly `#0B0B0B` so it blends into the page, because video can't carry transparency to every browser. If it comes back pure black, send it to me anyway and I'll key it.

### V2 — Fibre pulses (from `fiber.webp`)

```
Image-to-video. Camera completely locked. Small pulses of citrine light
travel along the three lit fibre optic strands from left to right, from the
base of the curve to the cut tips, each pulse about one second long, spaced
irregularly, as if data is moving through them. When a pulse reaches a tip,
the tip glows a little brighter for a moment and settles. The dark strands
and the black device never move. Faint dust in the air drifts very slowly.
6 second seamless loop.
```

### V3 — Fog drift (from `fog.webp`)

```
Image-to-video. Camera completely locked. Low mist drifts very slowly from
left to right across the lake, thinning and thickening as it passes the
stones. The water is perfectly still except for one faint ring of ripple
spreading out from under the nearest, lit stone. The lantern light on that
stone stays constant. The far stones stay hidden in the mist the whole time
and are never revealed. Keep the haze neutral grey, never blue.
10 second seamless loop.
```

### V4 — Aisle dolly (optional, from `aisle.webp`)

```
Image-to-video. A slow, perfectly steady dolly forward down the centre line
of the data center aisle, about two meters over 5 seconds at constant speed,
camera at floor height, no tilt, no shake. The server racks slide past on
both sides with natural parallax. The citrine floor strip at the far end
grows slightly closer and the haze around it catches more light. Nothing
else lights up. Not a loop: one continuous move, start to end.
```

This one is played by scroll position, not autoplay. Export it with a keyframe on every frame (`ffmpeg -i in.mp4 -g 1 -an aisle-dolly.mp4`) so scrubbing is smooth.

### Wiring them in

- **Fibre and fog:** put the file in `public/video/` and set `video: "/video/fiber.mp4"` on that entry in `lib/images.ts`. The still stays as the poster, and anyone with reduced motion turned on keeps seeing the still.
- **Cube and aisle:** send them to me. The cube needs to replace the image in two components, and the aisle needs scroll-scrubbing code. Neither is wired yet.

---

## 13. Resolution: what to regenerate

The set you made is 1024 × 572. That's fine for images shown in a frame, but three scenes zoom into the photo and will look soft on a large or high-resolution screen:

| Image | How the page uses it | Generate at |
|---|---|---|
| `desk` | The camera zooms in 2.4× on each object | 4096 px wide (upscale ×4) |
| `lighttable` | The camera zooms in 2× along the sheets | 4096 px wide |
| `aisle` | Full screen, then dollies in 1.55× | 3072 px wide or more |
| `fog` | Full screen | 2560 px wide |
| everything else | Inside framed cards | 2048 px wide |

Upscalers that keep detail: Magnific, Topaz Gigapixel, Krea Enhance. Then put the larger file in `assets/originals/` under the same name and run `node scripts/grade-images.mjs`.

One content note: the raised card in `archive` has scribbles that read a little like handwritten numbers. If you regenerate it, add "the card is completely blank" to the prompt.


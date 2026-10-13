# ScamTrail logo and brand-material prompts

## What the three references share

| Reference | What to borrow | What not to borrow |
|---|---|---|
| taska | A small, angular, abstract symbol built from a letter, next to a calm lowercase grotesk | The purple-to-pink gradient background |
| quota | A symbol drawn as **one continuous line** with an even stroke | Bright blue, overly round type |
| firevpn | **Negative space** cut into a solid badge, and a confident heavy wordmark | The shield. ScamTrail must never look like it promises protection. |

All three use one compact symbol on the left, a lowercase wordmark on the right, and one flat brand colour. Use the same structure, in ScamTrail's palette.

## Brand palette (use these hex values in every prompt)

| Role | Name | Hex |
|---|---|---|
| Accent (the only colour) | Citrine | `#E5FF5D` |
| Primary dark | Carbon | `#0B0B0B` |
| Light text on dark | Bone | `#F2EFE8` |
| Light background | Cream | `#F1EEE4` |
| Neutral | Ash | `#6E6E6E` |

Rules: one citrine accent only, no blue, purple, red or orange, no gradients except light glowing from the cube, no shields, padlocks, checkmarks or anything that implies "safe".

## Tip before you start

Image models still misspell words. **Generate the symbol on its own**, then set the wordmark yourself in Figma or Illustrator. For the font, use Neue Haas Grotesk Display Medium (licensed), Inter Display Medium or Geist Medium (both free), with tracking about -1%. The prompts below ask for symbols only; the lockup step comes after.

---

## 1. Logo symbol prompts

Paste the **style block** first, then one concept.

### Style block

```
Minimal flat vector logo symbol, single solid colour, geometric construction
on a strict grid, even stroke weight, crisp clean edges, generous negative
space, centred on a plain background, works at 16 px and on a billboard,
timeless tech brand mark in the style of a Swiss design studio.
No text, no letters unless specified, no gradients, no shadows, no 3D, no
bevel, no glow, no mockup, no frame, no shield, no padlock, no checkmark.
```

Negative prompt (if supported): `text, words, typography, gradient, shadow, 3d, glossy, bevel, shield, lock, checkmark, eye, magnifying glass cliché, clipart, mascot, blue, purple, red, orange`

### Concept A — The Trail Cube (recommended)
Like quota's single line: an isometric cube drawn in one stroke, where the line runs on past the last corner as a trail. It carries the site's cube motif and the idea of following a thread.

```
[style block] A single continuous line drawing of an isometric cube outline:
the line traces the hexagon outline and the three inner edges without lifting,
then exits from the lower-right corner and continues as a short straight
trail that ends in a small solid dot. Line weight 8% of the mark width,
rounded line caps. Citrine #E5FF5D line on a carbon #0B0B0B background.
```

### Concept B — The Evidence Node
This shows the site's evidence styles (dashed, then solid, ending on a confirmed point) inside a compact mark.

```
[style block] Two circles joined by a path that forms an abstract letter S.
The first half of the path is dashed and the second half is solid; the
first circle is an open ring and the second circle is filled solid. Clean
geometric curves of equal radius. Carbon #0B0B0B mark on a cream #F1EEE4
background, with only the filled end circle in citrine #E5FF5D.
```

### Concept C — The Cut Hexagon
Like firevpn's solid badge with a negative-space cut, but using the cube's outline instead of a shield.

```
[style block] A solid flat hexagon (the silhouette of a cube seen from its
corner), filled citrine #E5FF5D. A thin path is cut out of the hexagon in
negative space, running from the top-left edge, turning twice at right
angles, and ending in a small round hole near the centre, like a trail
leading to a point. Carbon #0B0B0B background. The cut is 6% of the width.
```

### Concept D — The Angular "st"
Like taska's glyph: a monogram that reads as two letters only once you look twice.

```
[style block] An abstract monogram combining a lowercase "s" and "t" into
one angular glyph built from straight strokes and 90-degree turns, with one
stroke ending in a short horizontal tail like a footprint trail. Uniform
stroke weight, square cuts. Carbon #0B0B0B glyph on a cream #F1EEE4 background.
```

### Lockup (after you pick a symbol)

```
[style block] Horizontal logo lockup: the chosen symbol on the left, then
the lowercase wordmark "scamtrail" in a clean neo-grotesk sans serif, medium
weight, tight but even letter spacing, cap height equal to the symbol's
height, symbol-to-text gap equal to half the symbol width. Version 1:
bone #F2EFE8 text and citrine #E5FF5D symbol on carbon #0B0B0B.
Version 2: carbon #0B0B0B text and symbol on cream #F1EEE4.
```

Export set to make once a symbol is chosen: symbol only, horizontal lockup, stacked lockup, and each one in four colourways (citrine on carbon, bone on carbon, carbon on cream, carbon on citrine). Also make a 1024 px app icon: the symbol at 60% of a carbon square with 22% corner radius.

---

## 2. Brand-material prompts

For every material prompt, add this **materials block** after the specific prompt:

```
Premium tech brand, carbon #0B0B0B dominant with a single citrine #E5FF5D
accent, bone #F2EFE8 type, flat surfaces, no drop shadows on graphics,
generous margins, Swiss grid layout, quiet and confident, no people, no
faces, no stock-photo clichés, no hackers in hoodies, no padlocks, no
shields, no fake statistics or numbers, no blue or purple.
```

Leave text areas as **blank placeholder blocks** and set the real copy yourself. Copy lines already used on the site that you can reuse:

- INVESTIGATE BEFORE YOU TRUST.
- ALLEGATIONS ARE NOT FINDINGS.
- NO REPORTS FOUND IS NOT THE SAME AS SAFE.
- ONE REPORT. EVERY SOURCE LINKED.
- START WITH ONE NAME.
- SOURCE-LINKED · DATED · REVIEWABLE

### 2.1 Social: launch post (1080 × 1350)

```
Vertical social media poster, carbon background. Upper 55%: the glowing
citrine glass cube floating in black space, soft light around it. Lower
45%: a large blank text area for a two-line uppercase headline, and a
smaller blank line beneath it. Small logo placeholder in the bottom-left
corner, thin 1 px bone rule above it. [materials block]
```

### 2.2 Social: carousel, 5 slides (1080 × 1350 each)

```
Five matching carousel slides with one continuous dashed citrine line
running across all five, so the line connects when swiped. Slide 1: large
blank headline area. Slides 2 to 4: each has one small circular node on
the line with a simple line icon (at sign, wallet, globe) and a blank text
block. Slide 5: the line ends at a small glowing citrine cube with a blank
call-to-action area. [materials block]
```

### 2.3 X / Twitter header (1500 × 500)

```
Wide banner, carbon background. A faint constellation of small open rings
joined by thin dashed bone lines spans the full width at 20% opacity. At
the right third, one ring is filled citrine and glowing softly. The left
third stays empty for the profile photo overlap; the centre holds a blank
area for one line of text. [materials block]
```

### 2.4 LinkedIn banner (1584 × 396)

Use the same prompt as the X header, but keep the important content in the right 60%, because LinkedIn covers the bottom-left with the profile photo.

### 2.5 Open Graph / link preview (1200 × 630)

```
Link preview card, carbon background. The citrine glass cube floats at the
right third over a dark data centre aisle that fades into black. The left
half is empty for a two-line uppercase title and a small logo. [materials block]
```

### 2.6 Pitch deck cover and section dividers (16:9)

```
Presentation cover slide, carbon background, large empty space in the upper
left for a title. Lower right: an isometric citrine cube drawn as a thin
line (outline only), with one dashed line trailing out of it to the slide
edge. Thin bone footer rule with blank areas for date and logo.
[materials block]
```

Section divider variant: the same layout on a cream `#F1EEE4` background, with carbon line work and the citrine accent only on the cube.

### 2.7 Business cards (3.5 × 2 in, front and back)

```
Product photograph of two premium business cards on a dark stone surface,
one showing its front and one its back. Front: carbon card, small citrine
symbol top-left, blank area for name and role. Back: citrine #E5FF5D card,
centred carbon symbol, nothing else. Thick 32 pt paper, crisp edges, soft
top light, shallow depth of field. No readable text. [materials block]
```

### 2.8 Merch: T-shirt and sticker sheet

```
Flat lay of a heavyweight carbon-black T-shirt on a dark concrete floor.
The citrine symbol is printed small on the left chest; on the back, a large
bone outline of an isometric cube with a dashed trail running down the
spine. Next to the shirt, a sticker sheet of the symbol in four colourways
with die-cut white borders. Soft top-down light. [materials block]
```

### 2.9 Out-of-home poster / billboard

```
Large street poster in a dark underground station at night. Carbon poster
with one enormous glowing citrine cube in the upper half and a huge blank
area below for a two-line uppercase headline. The poster is the only bright
object in the scene; the surroundings are clean and empty. No people.
Photorealistic. [materials block]
```

### 2.10 Product mockup: laptop and phone

```
Photorealistic product shot of an unbranded dark laptop and an unbranded
phone on a black desk, lit by one narrow citrine lamp from the side. Both
screens show a dark investigation report interface: a ring chart with three
filled segments and one empty, a list of rows with short horizontal line
markers, and a timeline strip along the bottom. All interface text is
blurred and unreadable. No logos on the devices. [materials block]
```

Better still: screenshot the real sample report from the site and place it into a mockup in Figma, so the interface is accurate.

### 2.11 Email header (600 × 200)

```
Email header banner, carbon background, small citrine symbol on the left,
a single thin dashed bone line running from the symbol to the right edge
and ending in an open ring. Blank space above the line for one short line
of text. [materials block]
```

### 2.12 Logo reveal video (5 s, 16:9, for social and the start of videos)

```
Motion design, black background. A single thin citrine line draws itself
from the left edge, travels toward the centre with one dashed section, then
traces an isometric cube outline in one continuous stroke. As the last edge
closes, the cube fills with soft citrine light from inside and settles. The
logo wordmark area to the right fades up in bone. Smooth easing, no camera
movement, no particles, no lens flares. 5 seconds, ends on a held frame.
```

---

## 3. Quick checks before anything ships

- [ ] Only one accent colour: citrine `#E5FF5D`. No blue, purple, red or orange anywhere.
- [ ] No shields, locks, checkmarks or "safe" imagery. ScamTrail shows evidence; it doesn't guarantee safety.
- [ ] No invented numbers ("10,000 scams caught") and no real project names or logos.
- [ ] The symbol still reads at 16 px (favicon) and in one colour.
- [ ] Text set by hand, never trusted from the image model.

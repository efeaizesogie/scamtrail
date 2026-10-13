# ScamTrail landing page

Next.js 15 + TypeScript + Tailwind 3. The landing page (ten sections and a footer) and a working investigation: search an X handle, wallet, token contract, domain or project name and get an evidence-based report at `/report`.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build
npm test           # unit tests for the rules, input detection and report copy
npm run copycheck  # with the server running: extracts visible copy to copy.txt and checks the Part 3 rules
```

API keys are optional. Copy `.env.example` to `.env.local` and add what you have; anything without a key shows as NOT RUN in the report, with the reason listed under Limits.

## Where things live

| Path | What |
|---|---|
| `app/globals.css` | Tokens (dark default, `data-theme="light"` cream reversal), evidence grammar classes, CSS scroll-driven reveals, cube, reduced-motion rules |
| `tailwind.config.ts` | Semantic colors, type scale, radii, spacing |
| `components/sections/*` | One file per section (Closing.tsx holds Trust, Final CTA, Footer) |
| `components/Logo.tsx` | The ScamTrail mark (`LogoMark`) and nav/footer lockup, drawn as SVG from `assets/brand/logo-reference.png` |
| `scripts/brand-icons.mjs` | Builds the favicon (`app/icon0.svg`, `app/icon1.png`), Apple touch icon and `public/brand/` exports from the mark. Rerun after changing the mark |
| `components/Cube.tsx` | Cube render component and the flat cube line mark |
| `components/Connector.tsx` | Connector that draws by `stroke-dashoffset` through a mask, so dashed and dotted styles survive the draw |
| `lib/detect.ts` | Input-type detection and validation (HANDLE incl. pasted x.com links, EVM ADDRESS, CONTRACT, DOMAIN, PROJECT) |
| `lib/images.ts` | Photo set with alt text and optional video loops |
| `components/Media.tsx` | Still, Cover, Camera, Pin, ScrollFrame |

## Photos and motion

- Originals live in `assets/originals/`. Run `node scripts/grade-images.mjs` to upscale (Lanczos, de-block, sharpen, fine grain) and colour-grade them into `public/images/` (keeps citrine, neutralises every other hue, lifts blacks to carbon). Output widths are set per image by how far the page zooms into it.
- Zoomed scenes lay the photo out at their deepest zoom and scale it down (`Camera max`, `ScrollFrame`), so the browser always rasterises enough pixels. After changing images or `next.config.mjs`, restart dev and delete `.next/` so optimised images are regenerated.
- `node scripts/cube-alpha.mjs` turns the cube render's black backdrop into transparency, producing `cube.webp` (dark canvas) and `cube-solid.webp` (cream band).
- `next/image` serves AVIF/WebP at the right width.
- Video loops (`public/video/`: cube, fibre, fog) play through `GradedVideo` in `components/Motion.tsx`, which applies the same carbon grade live in a WebGL shader, plays only while on screen, and falls back to a graded poster (`public/images/*-poster.webp`) under reduced motion or without WebGL.
- The aisle dolly is a 90-frame graded image sequence (`public/frames/aisle/`, 2.4 MB) scrubbed by scroll through `ScrubSequence`, which crossfades neighbouring frames. The source clip is kept in `assets/originals/aisle-dolly.mp4` so it is not deployed.
- Wheel scrolling is eased by Lenis (`components/SmoothScroll.tsx`), running on GSAP's ticker; touch scrolling stays native and it is off under reduced motion.
- All motion runs through GSAP (`lib/gsap.ts`): scroll scenes read ScrollTrigger progress with scrub (`useScrollProgress`), `components/Reveals.tsx` handles `.reveal` text, `[data-media-reveal]` photo frames and `.draw-line` connectors, the hero has an intro timeline and a scrubbed exit, and captions use `SwapIn`. Reduced motion shows final states.
- Scroll scenes: `components/Media.tsx` holds the camera (`Camera`, `shotAt`, `Pin`) and `ScrollFrame`. Shot coordinates are fractions of the photo, so if you replace a photo with a different composition, update the coordinates in that section.
- Don't run `npm run build` while `npm run dev` is running: they share `.next/` and the dev server will start returning errors. Stop dev first, or delete `.next/` and restart it.

## Investigations

Searching opens `/report?q=…`. The page posts to `/api/investigate`, which streams one line of JSON per source as it runs, then the finished report. Repeat searches within ten minutes replay from memory; each client gets 12 searches a minute.

| Path | What |
|---|---|
| `lib/investigate/index.ts` | Orchestrator: works out the input type, runs sources in parallel, then follows what they point to (one X handle, one website, one contract) |
| `lib/investigate/sources/` | One adapter per data source (social, on-chain, web, reports, name search) |
| `lib/investigate/rules.ts` | Pure rules: findings and their evidence class, handle history, facts tables, trail, identity thread, coverage, limits, summary |
| `lib/investigate/http.ts` | Fetch with timeout and retry; the SSRF-guarded page fetch used to read project websites |
| `components/report/` | Report page view and the parts shared with the landing mock-up (coverage ring, finding row, trail replay) |

Sources, and what needs a key:

| Segment | Source | Key |
|---|---|---|
| Social | memory.lol name archive (handle changes) | none |
| Social | X profile: X API v2, else Scrape Creators, else Sorsa | `X_BEARER_TOKEN`, `SCRAPECREATORS_API_KEY` or `SORSA_API_KEY` |
| Social | X account details via Sorsa: X's own username-change count and latest change date, account country | `SORSA_API_KEY` |
| On-chain | Public RPC nodes for Ethereum, Base, BNB Chain, Arbitrum, Polygon | none |
| On-chain | GoPlus token analysis and address labels | none |
| On-chain | DexScreener pools; CoinGecko for name search | none (`COINGECKO_API_KEY` optional) |
| On-chain | Etherscan V2 (deployer, deploy block, verification, first and last transactions) | `ETHERSCAN_API_KEY` |
| Website | RDAP registry, Wayback Machine, crt.sh, the site itself | none |
| Reports | MetaMask and ScamSniffer blocklists, GoPlus phishing check | none |
| Reports | Chainabuse community reports | `CHAINABUSE_API_KEY` |

Evidence classes: CONFIRMED is read straight from a chain or registry; CREDIBLE comes from a named third party (GoPlus, blocklists, the name archive, DexScreener); COMPLAINT is user reports; UNVERIFIED is what a project says about itself; UNKNOWN is a source that failed, did not run or returned nothing; MISATTRIBUTED is a different token with the same name.

With a Sorsa key, the headline handle-change count comes from X itself (the account's About metadata) and is shown as CONFIRMED; the archive then supplies the earlier names it has seen. Without it, handle changes come from the memory.lol archive. It only knows names it has captured, so counts are shown as minimums, and many crypto accounts are not in it at all. With an X key the lookup is by account ID, which is exact for the accounts the archive does hold.

## Notes

- Neue Haas Grotesk is a licensed font and is not bundled. The stack falls back to Helvetica Neue / Helvetica / Arial. Add the licensed files with `@font-face` to get the intended type.
- All sample data (handles, addresses, block numbers, case ID) is fictional and labeled `ILLUSTRATIVE SAMPLE DATA ONLY`.
- All SVG stand-in scenes have been removed; every visual is one of your images.
- `npm run copycheck` is a local approximation of the SlopMonster rules, not SlopMonster itself. To run the real checker:
  `git clone https://github.com/ItsssssJack/SlopMonster && python SlopMonster/tools/deslop.py copy.txt`

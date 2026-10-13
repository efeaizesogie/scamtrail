"use client";
import { useEffect, useRef, useState } from "react";
import { Connector } from "../Connector";
import { CubeMark } from "../Cube";
import { NodeRing } from "../Node";
import type { GlyphName } from "../Glyph";
import { Camera, Cover, Pin, shotAt, Shot, Still } from "../Media";
import { span, useScrollProgress, useScrollScenes } from "@/lib/hooks";
import { SwapIn } from "../Reveals";

/**
 * A camera tour of the investigation desk. Each beat stops on the object that
 * stands for that source; the last shot pulls back and joins them.
 * Coordinates are fractions of the desk photo.
 */
const BEATS: { n: string; key: string; text: string; glyph: GlyphName; at: { x: number; y: number }; shot: Shot }[] = [
  { n: "01", key: "HANDLE", text: "Start from the account people see.", glyph: "handle", at: { x: 0.2, y: 0.12 }, shot: { x: 0.22, y: 0.16, s: 1.75 } },
  { n: "02", key: "WALLET", text: "Follow the address it points to.", glyph: "wallet", at: { x: 0.575, y: 0.41 }, shot: { x: 0.575, y: 0.42, s: 1.9 } },
  { n: "03", key: "DOMAIN", text: "Check the site that claims to own both.", glyph: "domain", at: { x: 0.2, y: 0.58 }, shot: { x: 0.22, y: 0.6, s: 1.65 } },
  { n: "04", key: "CONTRACT", text: "Match the contract to what the project published.", glyph: "contract", at: { x: 0.684, y: 0.577 }, shot: { x: 0.684, y: 0.58, s: 1.9 } },
];
const HUB = { x: 0.42, y: 0.42 };
// Centred on the four sources (x 0.2 to 0.684) so tall or narrow screens still show them all.
const OVERVIEW: Shot = { x: 0.44, y: 0.4, s: 1 };
const SHOTS = [...BEATS.map((b) => b.shot), OVERVIEW];
/** Each beat breathes in slightly while it is on screen, so every scroll moves the picture. */
const BREATHE = 0.035;
// Lay out for the deepest zoom plus the breath, so the photo stays sharp.
const MAX_ZOOM = Math.max(...SHOTS.map((sh) => sh.s)) * (1 + BREATHE);
const CLOSING = { n: "05", key: "TOGETHER", text: "Four sources on one map, with the gaps marked." };

/** Joins the four sources to the hub, in the photo's coordinate space. */
function Links({ draw }: { draw: number }) {
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
      {BEATS.map((b, i) => (
        <Connector key={b.key} d={`M${b.at.x * 1600} ${b.at.y * 900} L${HUB.x * 1600} ${HUB.y * 900}`}
          state={i === 0 ? "confirmed" : i === 2 ? "complaint" : "credible"} progress={draw} ease={0} opacity={draw > 0 ? 1 : 0} />
      ))}
      <g style={{ opacity: draw > 0 ? 1 : 0, transition: "opacity 400ms" }}>
        <CubeMark cx={HUB.x * 1600} cy={HUB.y * 900} r={26} strong={draw > 0.95} />
      </g>
    </svg>
  );
}

function Markers({ stop, overview }: { stop: number; overview: boolean }) {
  return (
    <>
      {BEATS.map((b, i) => {
        const on = overview || i === stop;
        const seen = overview || i <= stop;
        return (
          <Pin key={b.key} x={b.at.x} y={b.at.y}>
            <div className="flex flex-col items-center transition-opacity duration-500" style={{ opacity: on ? 1 : seen ? 0.6 : 0 }}>
              <NodeRing glyph={b.glyph} state={on ? "confirmed" : "credible"} />
              <span className="t-micro mt-2 hidden whitespace-nowrap rounded-tag bg-canvas/80 px-2 py-1 text-text sm:inline-block">{b.n} · {b.key}</span>
            </div>
          </Pin>
        );
      })}
    </>
  );
}

/** Frame margins before it expands to full bleed (px). Top clears the nav. */
const FRAME = { top: 76, side: 40, bottom: 20, radius: 28 };

export function Thread() {
  const ref = useRef<HTMLElement>(null);
  const scenes = useScrollScenes();
  // A short scrub: Lenis already eases the wheel, so a long one reads as lag.
  const p = useScrollProgress(ref, "pin", scenes, 0.45);

  // Timeline: four beats and the pull-back (0.02 to 0.72), the frame opens to
  // full bleed (0.68 to 0.86), the links draw in (0.8 to 0.95), then a short hold.
  // Holds are short (16% of each beat) so the camera is nearly always travelling.
  const tour = scenes ? span(p, 0.02, 0.72) : 1;
  const { shot: base, stop } = scenes ? shotAt(SHOTS, tour, 0.16, 0.55) : { shot: OVERVIEW, stop: 4 };
  const beat = (tour * (SHOTS.length - 1)) % 1;
  const shot = scenes && tour < 1 ? { ...base, s: base.s * (1 + BREATHE * Math.sin(Math.PI * beat)) } : base;
  const overview = stop === 4;
  const e = scenes ? span(p, 0.68, 0.86) : 1;
  const open = e * e * (3 - 2 * e);
  const draw = scenes ? span(p, 0.8, 0.95) : 1;
  const caption = overview ? CLOSING : BEATS[stop];

  // The hub lights once when the last link lands.
  const [pulse, setPulse] = useState(0);
  const pulsed = useRef(false);
  useEffect(() => {
    if (scenes && draw >= 1 && !pulsed.current) {
      pulsed.current = true;
      setPulse(1);
    }
  }, [draw, scenes]);

  const frame = (
    <Cover focus={shot}>
      <Camera shot={shot} max={MAX_ZOOM}>
        <Still id="desk" sizes="320vw" />
        <Links draw={draw} />
        <Pin x={HUB.x} y={HUB.y}>
          <div key={pulse} className={`h-40 w-40 rounded-full ${pulse ? "cube-halo-pulse" : "opacity-0"}`} aria-hidden="true" />
        </Pin>
        <Markers stop={stop} overview={overview} />
      </Camera>
    </Cover>
  );

  if (!scenes) {
    return (
      <section id="thread" ref={ref} aria-labelledby="thread-title" className="relative mt-section-gap">
        <div className="page">
          <p className="t-micro text-text-muted">THE THREAD</p>
          <h2 id="thread-title" className="t-heading mt-3">One name leads to the next.</h2>
          <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-media">{frame}</div>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2">
            {BEATS.map((b) => (
              <li key={b.key} className="reveal">
                <span className="t-label block">{b.n} · {b.key}</span>
                <span className="mt-1 block text-text-muted">{b.text}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    );
  }

  const m = (v: number) => v * (1 - open);
  const inset = { top: m(FRAME.top), side: m(FRAME.side), bottom: m(FRAME.bottom), radius: m(FRAME.radius) };

  return (
    <section id="thread" ref={ref} aria-labelledby="thread-title" className="relative h-[380vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* The photo always covers the viewport; the clip is what grows to full bleed. */}
        <div className="absolute inset-0"
          style={{ clipPath: `inset(${inset.top}px ${inset.side}px ${inset.bottom}px ${inset.side}px round ${inset.radius}px)` }}>
          {frame}
        </div>

        {/* Caption and progress sit inside the photo, riding its bottom edge. */}
        <div className="pointer-events-none absolute inset-x-0 flex items-end justify-between gap-6"
          style={{ bottom: inset.bottom + 24, paddingLeft: inset.side + 24, paddingRight: inset.side + 24 }}>
          <div className="w-[min(540px,62vw)] rounded-deco bg-canvas/55 px-5 py-4 backdrop-blur-md">
            <h2 id="thread-title" className="t-micro text-text-muted">THE THREAD · ONE NAME LEADS TO THE NEXT</h2>
            <div className="relative mt-3 h-[76px]" aria-live="polite">
              <SwapIn as="p" swapKey={caption.key} className="absolute inset-0">
                <span className="t-label block text-text-muted">{caption.n} · {caption.key}</span>
                <span className="mt-2 block text-[21px] leading-[1.2]">{caption.text}</span>
              </SwapIn>
            </div>
          </div>
          <ol className="flex gap-2 rounded-deco bg-canvas/55 px-4 py-4 backdrop-blur-md" aria-hidden="true">
            {[...BEATS, CLOSING].map((b, i) => (
              <li key={b.key} className={`h-[2px] w-8 rounded-full transition-colors duration-500 ${i <= stop ? "bg-accent" : "bg-line/25"}`} />
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

"use client";
import { useRef } from "react";
import { Cover, Still } from "../Media";
import { ScrubSequence } from "../Motion";
import { span, useScrollProgress, useScrollScenes } from "@/lib/hooks";

/** Where the floor light sits in the aisle photo (0..1). The dolly moves toward it. */
const BEACON = { x: 0.5, y: 0.594 };

/**
 * The walk-in. The aisle opens from a framed photo to full bleed, then the
 * camera moves down the aisle toward the light, one scroll at a time.
 */
export function Walk() {
  const ref = useRef<HTMLElement>(null);
  const scenes = useScrollScenes();
  const p = useScrollProgress(ref, "pin", scenes);

  const open = span(p, 0, 0.4);           // frame grows to full bleed
  const dolly = span(p, 0.25, 1);         // camera travels toward the light
  const inset = (1 - open) * 9;
  const radius = (1 - open) * 28;
  const scale = 1 + dolly * 0.06; // the footage carries the dolly; this adds a touch of push
  const caption = span(p, 0.35, 0.55) * (1 - span(p, 0.85, 1));

  return (
    <section id="walk" ref={ref} aria-labelledby="walk-title" className={`relative ${scenes ? "h-[240vh]" : ""}`}>
      {/* Desktop with motion: pinned scene */}
      {scenes && (
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="absolute inset-0" style={{ clipPath: `inset(${inset}% ${inset * 0.75}% round ${radius}px)` }}>
          <Cover>
            <div className="absolute inset-0 will-change-transform"
              style={{ transformOrigin: `${BEACON.x * 100}% ${BEACON.y * 100}%`, transform: `scale(${scale})` }}>
              <Still id="aisle" sizes="100vw" />
              <ScrubSequence base="/frames/aisle" count={90} progress={dolly} width={1920} height={1080} />
            </div>
          </Cover>
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-[18vh] text-center" style={{ opacity: caption, transform: `translateY(${(1 - caption) * 16}px)` }}>
          <p className="t-micro text-text-muted">WHAT A SEARCH STARTS</p>
          <h2 id="walk-title" className="t-heading mt-4">Every name pulls a thread.</h2>
        </div>
      </div>
      )}

      {/* Mobile and reduced motion: framed still */}
      {!scenes && (
      <div className="page pt-section-gap">
        <p className="t-micro text-text-muted">WHAT A SEARCH STARTS</p>
        <h2 id="walk-title" className="t-heading mt-3">Every name pulls a thread.</h2>
        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-media">
          <Still id="aisle" sizes="100vw" />
        </div>
      </div>
      )}
    </section>
  );
}

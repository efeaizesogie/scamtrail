"use client";
import Image from "next/image";
import { createContext, CSSProperties, ReactNode, useContext, useRef } from "react";
import { IMAGES, ImageId } from "@/lib/images";
import { clamp01, useReducedMotion, useScrollProgress } from "@/lib/hooks";

/* ------------------------------------------------------------------
   Still: one photo, filling its positioned parent.
   ------------------------------------------------------------------ */
export function Still({ id, priority = false, sizes = "100vw", className = "", decorative = false, style }: {
  id: ImageId; priority?: boolean; sizes?: string; className?: string; decorative?: boolean; style?: CSSProperties;
}) {
  const img = IMAGES[id];
  return (
    <Image src={img.src} alt={decorative ? "" : img.alt} fill sizes={sizes} priority={priority} quality={88}
      className={`object-cover ${className}`} style={style} />
  );
}

/* ------------------------------------------------------------------
   Cover: a 16:9 box that always covers its parent (like object-fit:
   cover), so children can be placed in the photo's own coordinates.
   `focus` slides the overflowing box so that point of the photo sits as
   near the centre as the cover allows (object-position, but live).
   ------------------------------------------------------------------ */
const BOX_W = "max(100cqw, calc(100cqh * 16 / 9))";
const BOX_H = "max(100cqh, calc(100cqw * 9 / 16))";

export function Cover({ children, className = "", focus }: { children: ReactNode; className?: string; focus?: { x: number; y: number } }) {
  const fx = focus?.x ?? 0.5, fy = focus?.y ?? 0.5;
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} style={{ containerType: "size" }}>
      <div className="absolute left-0 top-0 will-change-transform"
        style={{
          width: BOX_W, height: BOX_H,
          transform: `translate3d(clamp(calc(100cqw - ${BOX_W}), calc(50cqw - ${fx} * ${BOX_W}), 0px), clamp(calc(100cqh - ${BOX_H}), calc(50cqh - ${fy} * ${BOX_H}), 0px), 0)`,
        }}>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Camera: scroll-driven zoom and pan across a photo.
   A shot is a focus point (0..1 in photo space) and a scale. The pan is
   clamped so the frame never shows past the photo's edge.
   ------------------------------------------------------------------ */
export type Shot = { x: number; y: number; s: number };

const ScaleContext = createContext(1);
const ease = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The visible window for a shot: scale plus a translation clamped so the photo always covers the frame. */
type View = { tx: number; ty: number; s: number };
const toView = ({ x, y, s }: Shot): View => ({
  s,
  tx: Math.min(0, Math.max(1 - s, 0.5 - x * s)),
  ty: Math.min(0, Math.max(1 - s, 0.5 - y * s)),
});
const toShot = ({ tx, ty, s }: View): Shot => ({ x: (0.5 - tx) / s, y: (0.5 - ty) / s, s });
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Interpolates between shots. Each stop holds for `hold` of its segment, then
 * travels. Interpolation happens on the clamped view, so the move is continuous
 * and never snaps at the photo's edge. `dip` pulls the camera back mid-move,
 * in proportion to the distance travelled, like a real camera.
 */
export function shotAt(shots: Shot[], p: number, hold = 0.5, dip = 0): { shot: Shot; stop: number } {
  const n = shots.length - 1;
  if (n <= 0) return { shot: shots[0], stop: 0 };
  const pos = clamp01(p) * n;
  const i = Math.min(n - 1, Math.floor(pos));
  const t = easeInOut(clamp01((pos - i - hold) / (1 - hold)));
  const a = toView(shots[i]), b = toView(shots[i + 1]);
  let v: View = { tx: lerp(a.tx, b.tx, t), ty: lerp(a.ty, b.ty, t), s: lerp(a.s, b.s, t) };
  if (dip > 0) {
    const dist = Math.hypot(shots[i].x - shots[i + 1].x, shots[i].y - shots[i + 1].y);
    const k = Math.max(1 / v.s, 1 - dip * dist * Math.sin(Math.PI * t));
    // Zoom out about the frame centre, then re-clamp.
    const s2 = v.s * k;
    v = toView(toShot({ s: s2, tx: 0.5 - (0.5 - v.tx) * k, ty: 0.5 - (0.5 - v.ty) * k }));
  }
  return { shot: toShot(v), stop: t > 0.5 ? i + 1 : i };
}

/**
 * The camera. Content is laid out at `max` times the frame (the deepest zoom
 * the scene uses) and scaled *down* to the current shot. Browsers rasterise a
 * transformed layer at its layout size, so laying out large and shrinking keeps
 * the photo sharp at every zoom; scaling a small layout up would blur it.
 */
export function Camera({ shot, children, max = 1 }: { shot: Shot; children: ReactNode; max?: number }) {
  const v = toView(shot);
  const m = Math.max(1, max);
  return (
    <ScaleContext.Provider value={v.s / m}>
      <div className="absolute left-0 top-0 origin-top-left will-change-transform"
        style={{
          width: `${m * 100}%`, height: `${m * 100}%`,
          transform: `translate3d(${(v.tx / m) * 100}%, ${(v.ty / m) * 100}%, 0) scale(${v.s / m})`,
        }}>
        {children}
      </div>
    </ScaleContext.Provider>
  );
}

/** A point pinned to the photo that keeps its on-screen size while the camera zooms. */
export function Pin({ x, y, children, className = "" }: { x: number; y: number; children: ReactNode; className?: string }) {
  const s = useContext(ScaleContext);
  return (
    <div className={`absolute ${className}`} style={{ left: `${x * 100}%`, top: `${y * 100}%`, transform: `translate(-50%, -50%) scale(${1 / s})` }}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------
   ScrollFrame: a rounded media frame whose photo settles into place as
   it crosses the viewport (from `from`x to 1x, with an optional drift).
   Like the camera, the photo is laid out at its largest size and scaled
   down, so it stays sharp while it settles.
   ------------------------------------------------------------------ */
export function ScrollFrame({ children, className = "", drift = 0, from = 1.14 }: {
  children: ReactNode; className?: string; drift?: number; from?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const p = useScrollProgress(ref, "through", !reduced);
  const t = ease(clamp01(p / 0.55));
  const pad = ((from - 1) / 2) * 100;
  return (
    <div ref={ref} data-media-reveal className={`relative overflow-hidden rounded-media bg-canvas ${className}`}>
      <div className="absolute will-change-transform" style={{ inset: `-${pad}%` }}>
        <div className="absolute inset-0"
          style={reduced ? { transform: `scale(${1 / from})` } : { transform: `translate3d(${(1 - t) * drift}%, 0, 0) scale(${lerp(1, 1 / from, t)})` }}>
          {children}
        </div>
      </div>
    </div>
  );
}

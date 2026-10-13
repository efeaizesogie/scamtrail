"use client";
import { useId } from "react";
import type { Evidence } from "./Node";

type Props = {
  d: string;
  state: Evidence;
  /** 0..1, how much of the path is drawn. */
  progress?: number;
  /** Use the CSS scroll-driven .draw-line class instead of a progress value. */
  scrollDriven?: boolean;
  opacity?: number;
  /** Direction of the unknown-state fade (x1, y1, x2, y2 in user space). */
  fade?: [number, number, number, number];
  /** Smooth transition of the drawn length (ms). 0 for scroll-linked values. */
  ease?: number;
};

/**
 * A connector that draws by stroke-dashoffset while keeping its own dash pattern:
 * a solid pathLength=1 mask reveals the styled (solid, dashed, dotted or fading) stroke.
 */
export function Connector({ d, state, progress = 1, scrollDriven = false, opacity = 1, fade, ease = 120 }: Props) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const maskId = `m${id}`;
  const gradId = `g${id}`;
  return (
    <g style={{ opacity, transition: "opacity 500ms var(--ease-reveal)" }} aria-hidden="true">
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="-4000" y="-4000" width="8000" height="8000">
          <path d={d} pathLength={1} fill="none" stroke="white" strokeWidth={10} strokeLinecap="butt"
            className={scrollDriven ? "draw-line" : undefined}
            style={scrollDriven ? undefined : {
              strokeDasharray: 1,
              strokeDashoffset: 1 - progress,
              transition: ease ? `stroke-dashoffset ${ease}ms var(--ease-reveal)` : undefined,
            }} />
        </mask>
        {state === "unknown" && (
          <linearGradient id={gradId} gradientUnits="userSpaceOnUse"
            x1={fade?.[0] ?? 0} y1={fade?.[1] ?? 0} x2={fade?.[2] ?? 100} y2={fade?.[3] ?? 0}>
            <stop offset="0" stopColor="rgb(var(--text))" stopOpacity={0.7} />
            <stop offset="1" stopColor="rgb(var(--text))" stopOpacity={0} />
          </linearGradient>
        )}
      </defs>
      <path d={d} fill="none" mask={`url(#${maskId})`} className={`ev-${state}`}
        stroke={state === "unknown" ? `url(#${gradId})` : undefined} />
    </g>
  );
}

export const STATE_LABEL: Record<Evidence, string> = {
  confirmed: "CONFIRMED",
  credible: "CREDIBLE",
  complaint: "COMPLAINT",
  unverified: "UNVERIFIED",
  unknown: "UNKNOWN",
};

/** Inline sample of a grammar line, used in labels and legends. */
export function GrammarSwatch({ state, width = 32 }: { state: Evidence; width?: number }) {
  const gid = `sw-${state}-${width}`;
  return (
    <svg width={width} height={8} viewBox={`0 0 ${width} 8`} aria-hidden="true" className="shrink-0">
      <defs>
        <linearGradient id={gid} x1="0" x2="1">
          <stop offset="0" stopColor="rgb(var(--text))" stopOpacity={0.7} />
          <stop offset="1" stopColor="rgb(var(--text))" stopOpacity={0} />
        </linearGradient>
      </defs>
      <line x1={1} y1={4} x2={width - 1} y2={4} className={`ev-${state}`} stroke={state === "unknown" ? `url(#${gid})` : undefined} />
    </svg>
  );
}

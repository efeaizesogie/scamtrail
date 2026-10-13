import { Glyph, GlyphName } from "./Glyph";

export type Evidence = "confirmed" | "credible" | "complaint" | "unverified" | "unknown";

/** 40px node ring holding a 20px glyph. Ring treatment follows the evidence grammar. */
export function NodeRing({ glyph, state = "credible", className = "", size = 40 }: { glyph: GlyphName; state?: Evidence; className?: string; size?: number }) {
  const ring =
    state === "confirmed" ? "bg-accent text-on-action border-accent"
    : state === "unverified" ? "border-node-ring/25 text-text/50"
    : state === "unknown" ? "border-dashed border-node-ring/15 text-text/35"
    : "border-node-ring/45 bg-canvas text-text";
  return (
    <span className={`inline-grid shrink-0 place-items-center rounded-full border-[1.5px] ${ring} ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <Glyph name={glyph} size={size / 2} />
    </span>
  );
}

/** Node ring drawn inside an SVG constellation. */
export function SvgNode({ x, y, glyph, state = "credible", r = 20, opacity = 1, active = false }: {
  x: number; y: number; glyph: GlyphName; state?: Evidence; r?: number; opacity?: number; active?: boolean;
}) {
  const filled = state === "confirmed";
  const ringOpacity = state === "unverified" ? 0.3 : state === "unknown" ? 0.15 : 0.55;
  const ink = filled ? "rgb(var(--on-action))" : state === "unverified" ? "rgb(var(--text) / 0.5)" : state === "unknown" ? "rgb(var(--text) / 0.35)" : "rgb(var(--text))";
  return (
    <g transform={`translate(${x} ${y})`} style={{ opacity, transition: "opacity 500ms var(--ease-reveal)" }} aria-hidden="true">
      {active && <circle r={r + 7} fill="none" stroke="rgb(var(--accent))" strokeWidth={1} />}
      <circle r={r} fill={filled ? "rgb(var(--accent))" : "rgb(var(--canvas))"}
        stroke={filled ? "rgb(var(--accent))" : `rgb(var(--node-ring) / ${ringOpacity})`} strokeWidth={1.5}
        strokeDasharray={state === "unknown" ? "2 3" : undefined} />
      <g transform={`translate(${-r / 2} ${-r / 2})`} style={{ color: ink }}>
        <Glyph name={glyph} size={r} />
      </g>
    </g>
  );
}

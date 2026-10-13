/**
 * The ScamTrail mark: an open ring (where a search starts), a dashed trail that turns
 * solid as evidence firms up, and a filled citrine node (what the evidence confirms).
 * Strokes use currentColor so the mark reads on carbon and on cream; the node stays citrine.
 */
export const MARK_PATHS = {
  dashed: "M25.7 40.2 C 24.2 49.5, 28.5 56.6, 37 56.6 C 42.5 56.6, 46.5 54, 48.8 51",
  solid: "M48.8 51 C 54 43.6, 59 42.6, 62.2 42.6 C 70.5 42.6, 76.2 49, 75.6 55.5 C 75.4 57.9, 75.1 59.6, 74.6 61.4",
  ring: { cx: 35, cy: 35.4, r: 9.3 },
  node: { cx: 65, cy: 64.7, r: 9.3 },
};
export const MARK_VIEWBOX = "23 23 54 54";
export const CITRINE = "#E5FF5D";

/** Small sizes get a heavier stroke and longer dashes so the trail survives. */
const weightFor = (size: number) => (size < 24 ? 3.2 : size < 48 ? 2.6 : 2.05);
const dashFor = (size: number) => (size < 48 ? "2.2 3.4" : "1.7 3");

export function LogoMark({ size = 32, className = "", title }: { size?: number; className?: string; title?: string }) {
  const { ring, node, dashed, solid } = MARK_PATHS;
  return (
    <svg viewBox={MARK_VIEWBOX} width={size} height={size} className={`shrink-0 ${className}`}
      role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <g fill="none" stroke="currentColor" strokeWidth={weightFor(size)} strokeLinecap="round">
        <circle {...ring} />
        <path d={dashed} strokeDasharray={dashFor(size)} />
        <path d={solid} />
        <circle {...node} fill={CITRINE} />
      </g>
    </svg>
  );
}

/** Mark plus the SCAMTRAIL wordmark, as used in the nav and footer. */
export function Lockup({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-[0.55em] ${className}`}>
      <LogoMark size={size} />
      <span className="text-[20px] font-medium tracking-[0.027em]">SCAMTRAIL</span>
    </span>
  );
}

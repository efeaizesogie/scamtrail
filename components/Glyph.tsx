export type GlyphName =
  | "handle" | "wallet" | "domain" | "contract" | "project" | "search" | "trace" | "decide"
  | "archive" | "block" | "pool" | "exchange";

const P: Record<GlyphName, string> = {
  handle: "M13.5 10a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Zm0 0v1.3a2.2 2.2 0 0 0 4.4 0V10A7.9 7.9 0 1 0 14 16.8",
  wallet: "M3.5 6.5h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-11a1 1 0 0 1-1-1v-10Zm0 0 9.5-3v3M13.5 12h4",
  domain: "M10 2.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Zm-7.5 7.5h15M10 2.5c2.2 2.1 3 4.6 3 7.5s-.8 5.4-3 7.5c-2.2-2.1-3-4.6-3-7.5s.8-5.4 3-7.5Z",
  contract: "M5 2.5h7l3.5 3.5v11.5H5V2.5Zm7 0V6h3.5M8.5 10.5 7 12l1.5 1.5m3-3L13 12l-1.5 1.5",
  project: "M10 2.5 16.5 6v8L10 17.5 3.5 14V6L10 2.5Zm0 0V10m0 0 6.5-4M10 10 3.5 6M10 10v7.5",
  search: "M8.8 15.1a6.3 6.3 0 1 0 0-12.6 6.3 6.3 0 0 0 0 12.6Zm4.5-1.8 4.2 4.2",
  trace: "M4 15a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm12-7a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM5.2 12.5 14.8 7.5M4 12V4.5m12 4.5v7",
  decide: "M4 10.5 8 14.5 16 5.5",
  archive: "M3 4h14v4H3V4Zm1 4v8h12V8M8 11h4",
  block: "M10 2.5 16.5 6v8L10 17.5 3.5 14V6L10 2.5Z",
  pool: "M3 13c2 0 2-1.5 3.5-1.5S8.5 13 10 13s2-1.5 3.5-1.5S15 13 17 13M3 9c2 0 2-1.5 3.5-1.5S8.5 9 10 9s2-1.5 3.5-1.5S15 9 17 9",
  exchange: "M4 7h11l-3-3M16 13H5l3 3",
};

export function Glyph({ name, size = 20, className = "" }: { name: GlyphName; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={P[name]} />
    </svg>
  );
}

/** 2x2 pixel glyph carried by primary buttons. */
export function PixelGlyph() {
  return (
    <span aria-hidden="true" className="grid grid-cols-2 gap-[2px]">
      <span className="h-[4px] w-[4px] bg-current" />
      <span className="h-[4px] w-[4px] bg-current opacity-40" />
      <span className="h-[4px] w-[4px] bg-current opacity-40" />
      <span className="h-[4px] w-[4px] bg-current" />
    </span>
  );
}

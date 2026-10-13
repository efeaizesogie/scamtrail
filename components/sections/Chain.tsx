"use client";
import { useRef, useState } from "react";
import { Connector, GrammarSwatch, STATE_LABEL } from "../Connector";
import { Glyph, GlyphName } from "../Glyph";
import { Cover } from "../Media";
import { GradedVideo } from "../Motion";
import { useReducedMotion, useScrollProgress } from "@/lib/hooks";
import type { Evidence } from "../Node";

type N = { id: string; label: string; addr: string; glyph: GlyphName; x: number; y: number };
type E = { from: string; to: string; state: Evidence; event: string; block?: string; d: string };

/** Fictional addresses and block numbers for an illustrative graph. */
const NODES: N[] = [
  { id: "dep", label: "DEPLOYER", addr: "0x7a11…0042", glyph: "wallet", x: 110, y: 120 },
  { id: "tok", label: "TOKEN CONTRACT", addr: "0x5e1a…c0de", glyph: "contract", x: 330, y: 120 },
  { id: "lp", label: "LIQUIDITY POOL", addr: "0x9f00…1b7e", glyph: "pool", x: 520, y: 220 },
  { id: "a", label: "WALLET A", addr: "0x3c4d…77a0", glyph: "wallet", x: 380, y: 360 },
  { id: "b", label: "WALLET B", addr: "0xb2e8…0f19", glyph: "wallet", x: 150, y: 330 },
  { id: "ex", label: "EXCHANGE DEPOSIT", addr: "0xd1d1…aa03", glyph: "exchange", x: 130, y: 500 },
];

const EDGES: E[] = [
  { from: "dep", to: "tok", state: "confirmed", event: "Contract deployed", block: "21,804,113", d: "M132 120 H308" },
  { from: "tok", to: "lp", state: "confirmed", event: "Liquidity added", block: "21,804,190", d: "M350 132 C 420 150, 470 180, 500 205" },
  { from: "lp", to: "a", state: "confirmed", event: "Liquidity removed to Wallet A", block: "21,911,402", d: "M505 240 C 470 300, 440 330, 402 352" },
  { from: "a", to: "b", state: "confirmed", event: "Transfer, 180 ETH", block: "21,911,455", d: "M358 356 C 290 345, 230 336, 172 331" },
  { from: "b", to: "dep", state: "unverified", event: "Shared owner suggested by a third party. Not proven by the transfer.", d: "M146 308 C 135 240, 120 190, 112 142" },
  { from: "b", to: "ex", state: "complaint", event: "Users report this wallet paid an exchange deposit address", d: "M148 352 C 144 400, 138 440, 132 478" },
  { from: "ex", to: "out", state: "unknown", event: "Funds after the deposit address: unknown", d: "M152 506 C 260 530, 380 520, 520 500" },
];

function Hex({ n, selected, dim, onSelect }: { n: N; selected: boolean; dim: boolean; onSelect: () => void }) {
  const r = 22;
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${r * Math.cos(a)},${r * Math.sin(a)}`;
  }).join(" ");
  return (
    <g transform={`translate(${n.x} ${n.y})`} style={{ opacity: dim ? 0.35 : 1, transition: "opacity 300ms" }}>
      <g role="button" tabIndex={0} aria-label={`${n.label}, ${n.addr}`} aria-pressed={selected}
        onClick={onSelect} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect())}
        className="cursor-pointer focus:outline-none [&:focus-visible>polygon:first-child]:stroke-[rgb(229_255_93)]">
        <polygon points={pts} transform="scale(1.6)" fill="transparent" stroke={selected ? "rgb(229 255 93)" : "transparent"} strokeWidth={0.8} />
        <polygon points={pts} fill={selected ? "rgb(229 255 93)" : "#0b0b0b"} stroke={selected ? "rgb(229 255 93)" : "rgb(255 255 255 / 0.55)"} strokeWidth={1.5} />
        <g transform="translate(-10 -10)" style={{ color: selected ? "#0b0b0b" : "rgb(242 239 232)" }}>
          <Glyph name={n.glyph} size={20} />
        </g>
      </g>
      <text y={40} textAnchor="middle" className="pointer-events-none fill-text" style={{ fontSize: 10, letterSpacing: "0.06em", fontWeight: 500 }}>{n.label}</text>
    </g>
  );
}

/**
 * Fades the background clip into the page at its top and bottom edges, and
 * quietens it behind the copy column so the text reads cleanly.
 */
const FADE_Y = "linear-gradient(to bottom, transparent 0%, #000 22%, #000 78%, transparent 100%)";
const FADE_X = "linear-gradient(to right, #000 0%, #000 42%, rgb(0 0 0 / 0.3) 64%, rgb(0 0 0 / 0.3) 100%)";
const BG_MASK = {
  maskImage: `${FADE_Y}, ${FADE_X}`, WebkitMaskImage: `${FADE_Y}, ${FADE_X}`,
  maskComposite: "intersect", WebkitMaskComposite: "source-in",
} as const;

export function Chain() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const p = useScrollProgress(ref, "through", !reduced, 1);
  const [sel, setSel] = useState("a");
  const node = NODES.find((n) => n.id === sel)!;
  const edges = EDGES.filter((e) => e.from === sel || e.to === sel);
  const linked = new Set(edges.flatMap((e) => [e.from, e.to]));

  return (
    <section ref={ref} aria-labelledby="ch-title" className="relative isolate mt-section-gap overflow-hidden py-[clamp(96px,14vh,160px)]">
      {/* Background: the fibre clip, full width and dimmed, fading into the page at
          its edges and drifting slightly slower than the scroll. Decorative only. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10"
        style={BG_MASK}>
        <div className="absolute inset-0 opacity-50 will-change-transform"
          style={reduced ? undefined : { transform: `translate3d(0, ${(0.5 - p) * 60}px, 0) scale(${1.12 - Math.min(p, 0.6) * 0.2})` }}>
          <Cover focus={{ x: 0.66, y: 0.5 }}>
            <GradedVideo src="/video/fiber.mp4" poster="/images/fiber-poster.webp" startAt={5} sizes="100vw" />
          </Cover>
        </div>
      </div>

      <div className="page grid items-center gap-10 md:grid-cols-[3fr_2fr] md:gap-gutter">
        {/* Frosted panel keeps the graph legible over the moving light. */}
        <div className="reveal relative overflow-hidden rounded-media border hairline bg-canvas/55 backdrop-blur-xl">
          <svg viewBox="0 0 640 580" className="relative h-auto w-full" role="group" aria-label="Illustrative fund-flow graph. Select a node to see its receipt.">
            {EDGES.map((e, i) => {
              const on = e.from === sel || e.to === sel;
              return (
                <g key={i} style={{ opacity: on ? 1 : 0.3, transition: "opacity 300ms" }}>
                  <Connector d={e.d} state={e.state} scrollDriven fade={e.state === "unknown" ? [152, 506, 520, 500] : undefined} />
                </g>
              );
            })}
            {NODES.map((n) => (
              <Hex key={n.id} n={n} selected={n.id === sel} dim={!linked.has(n.id) && n.id !== sel} onSelect={() => setSel(n.id)} />
            ))}
          </svg>

          {/* Receipt card */}
          <div className="relative mx-4 mb-4 rounded-card bg-canvas/85 p-4 sm:mx-6 sm:mb-6" aria-live="polite">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="t-label">{node.label}</p>
              <p className="font-mono text-small text-text-muted">{node.addr}</p>
            </div>
            <ul className="mt-3 space-y-2">
              {edges.map((e, i) => (
                <li key={i} className="flex items-start gap-3 text-small">
                  <span className="mt-[7px]"><GrammarSwatch state={e.state} width={24} /></span>
                  <span className="flex-1">{e.event}</span>
                  <span className="shrink-0 text-right">
                    <span className="t-micro block text-text-muted">{STATE_LABEL[e.state]}</span>
                    {e.block && <span className="block font-mono text-[12px] text-text-muted">BLOCK {e.block}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <p className="t-micro absolute right-4 top-4 text-text-muted">ILLUSTRATIVE SAMPLE DATA ONLY</p>
        </div>

        <div>
          <h2 id="ch-title" className="t-heading reveal">Trace the money without guessing the owner.</h2>
          <p className="reveal mt-6 max-w-measure text-text-muted">
            Transfers, deployments and liquidity events are shown with block numbers and links to the explorer. A transfer between two wallets does not prove shared ownership, and the report says that too.
          </p>
          <p className="pill reveal mt-8">BLOCK-STAMPED · EXPLORER-LINKED</p>
        </div>
      </div>
    </section>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { useInView } from "@/lib/hooks";
import { CubeVideo } from "../Cube";
import { Cover, ScrollFrame, Still } from "../Media";
import { SearchBox } from "../SearchBox";
import { Connector, GrammarSwatch } from "../Connector";
import { LogoMark } from "../Logo";

const TRUST_LINKS = ["METHODOLOGY", "DATA SOURCES", "PRIVACY", "CORRECTIONS POLICY"];

export function Trust() {
  return (
    <section id="trust" aria-labelledby="tr-title" className="mt-section-gap">
      <div className="page grid items-center gap-10 md:grid-cols-[3fr_2fr] md:gap-gutter">
        <ScrollFrame drift={-8} className="aspect-[16/10]">
          <Still id="archive" sizes="(min-width: 768px) 60vw, 100vw" />
        </ScrollFrame>
        <div>
          <h2 id="tr-title" className="t-heading reveal">Corrections are public.</h2>
          <p className="reveal mt-6 max-w-measure text-text-muted">
            Every finding can be disputed. Accepted corrections are logged in a public ledger with the date and the reason.
          </p>
          <ul className="reveal mt-8 flex flex-wrap gap-2">
            {TRUST_LINKS.map((l) => (
              <li key={l}><a href="#trust" className="btn-ghost">{l}</a></li>
            ))}
          </ul>
          <p className="reveal mt-8 max-w-measure text-small text-text-muted">
            ScamTrail supports your decision. It does not guarantee that a project is safe or determine wrongdoing from a single signal.
          </p>
        </div>
      </div>
    </section>
  );
}

/** Dashed constellation around the closing cube. */
const SPOKES = [
  { d: "M500 200 L300 110", end: [300, 110] },
  { d: "M500 200 L700 110", end: [700, 110] },
  { d: "M500 200 L250 260", end: [250, 260] },
  { d: "M500 200 L750 260", end: [750, 260] },
  { d: "M500 200 L380 330", end: [380, 330] },
  { d: "M500 200 L620 330", end: [620, 330] },
];

export function FinalCta() {
  return (
    <section aria-labelledby="cta-title" className="relative isolate mt-section-gap overflow-hidden py-section-gap">
      <Cover className="-z-10 opacity-25">
        <Still id="aisle" decorative sizes="100vw" />
      </Cover>
      <div className="page text-center">
        <div className="relative mx-auto h-[260px] max-w-[760px] md:h-[360px]">
          <svg viewBox="0 0 1000 400" className="absolute inset-0 h-full w-full" aria-hidden="true">
            {SPOKES.map((s, i) => (
              <g key={i}>
                <Connector d={s.d} state={i % 3 === 2 ? "unverified" : "complaint"} scrollDriven />
                <circle cx={s.end[0]} cy={s.end[1]} r={7} fill="#0b0b0b" stroke="rgb(255 255 255 / 0.5)" strokeWidth={1.5} />
              </g>
            ))}
          </svg>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <CubeVideo size={340} className="reveal" />
          </div>
        </div>
        <h2 id="cta-title" className="t-display reveal mt-6">Start with one name.</h2>
        <div className="mx-auto mt-10 max-w-[680px]">
          <SearchBox />
        </div>
      </div>
    </section>
  );
}

const FOOTER_COLUMNS = (home: string) => [
  { title: "PRODUCT", links: [
    { label: "Investigate", href: `${home}#top` },
    { label: "How it works", href: `${home}#how` },
    { label: "Sample report", href: `${home}#report` },
    { label: "Evidence classes", href: `${home}#thread` },
  ] },
  { title: "TRUST", links: [
    { label: "Methodology", href: `${home}#trust` },
    { label: "Data sources", href: `${home}#trust` },
    { label: "Corrections", href: `${home}#trust` },
    { label: "Privacy", href: `${home}#trust` },
  ] },
  { title: "BRAND", links: [
    { label: "Mark, carbon", href: "/brand/mark-on-carbon.svg" },
    { label: "Mark, cream", href: "/brand/mark-on-cream.svg" },
    { label: "App icon", href: "/brand/app-icon-1024.png" },
  ] },
];

/** The mark, stretched: open ring, dashed trail, solid trail, citrine node. Draws once in view. */
function FooterTrail() {
  const ref = useRef<SVGSVGElement>(null);
  const on = useInView(ref, 0.6);
  // The dashed run draws first; the solid run follows once it lands.
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    if (!on) return;
    const t = setTimeout(() => setSolid(true), 1250);
    return () => clearTimeout(t);
  }, [on]);
  return (
    <svg ref={ref} viewBox="0 0 1200 60" className="h-auto w-full overflow-visible">
      <circle cx="12" cy="30" r="9" fill="none" stroke="rgb(var(--text))" strokeWidth="1.5" />
      <Connector d="M24 30 H700" state="complaint" progress={on ? 1 : 0} ease={1400} />
      <Connector d="M700 30 H1176" state="confirmed" progress={solid ? 1 : 0} ease={900} />
      <circle cx="1186" cy="30" r="9" fill="rgb(var(--accent))" stroke="rgb(var(--text))" strokeWidth="1.5"
        style={{ transition: "transform 600ms var(--ease-reveal) 800ms", transformOrigin: "1186px 30px", transform: solid ? "scale(1)" : "scale(0)" }} />
    </svg>
  );
}

/** The sources a report reads. Named so readers know where findings come from. */
const SOURCES = ["memory.lol", "X API", "Etherscan", "GoPlus", "DexScreener", "CoinGecko", "RDAP", "Wayback Machine", "crt.sh", "MetaMask list", "ScamSniffer", "Chainabuse"];

export function Footer({ home = "" }: { home?: string }) {
  return (
    <footer className="relative isolate overflow-hidden border-t hairline bg-canvas">
      {/* Statement and links */}
      <div className="page grid gap-14 pb-16 pt-20 md:pt-28 lg:grid-cols-[1.1fr_1fr] lg:gap-gutter">
        <div>
          <LogoMark size={64} />
          <p className="t-heading mt-8 max-w-[520px] [text-wrap:balance]">Follow the trail before you follow the hype.</p>
          <p className="mt-5 max-w-[420px] text-small text-text-muted">
            Evidence-based reports on Web3 projects, X handles, wallets and contracts. Every finding sourced, dated and open to correction.
          </p>
          <a href={`${home}#top`} className="btn-ghost mt-8">START AN INVESTIGATION</a>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3">
          {FOOTER_COLUMNS(home).map((col) => (
            <div key={col.title}>
              <p className="t-micro flex items-center gap-2 text-text-muted"><GrammarSwatch state="complaint" width={16} />{col.title}</p>
              <ul className="mt-5 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="group inline-flex min-h-[28px] items-center gap-2 text-small text-text/80 transition-colors hover:text-text">
                      <span aria-hidden="true" className="h-px w-0 bg-accent transition-all duration-300 group-hover:w-3 group-focus-visible:w-3" />
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      {/* Sources strip */}
      <div className="page">
        <div className="flex flex-col gap-4 border-y hairline py-6 md:flex-row md:items-baseline md:gap-10">
          <p className="t-micro shrink-0 text-text-muted">SOURCES A REPORT READS</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Data sources">
            {SOURCES.map((s) => <li key={s} className="font-mono text-[12px] text-text/70">{s}</li>)}
          </ul>
        </div>
      </div>

      {/* Signature: the mark's trail runs across the page into the wordmark */}
      <div className="relative mt-16" aria-hidden="true">
        <div className="page">
          <FooterTrail />
        </div>
        <p className="mt-4 select-none whitespace-nowrap text-center font-medium leading-[0.78] tracking-[-0.035em] text-text/[0.07]"
          style={{ fontSize: "clamp(56px, 17.6vw, 280px)", maskImage: "linear-gradient(to bottom, #000 40%, transparent 98%)", WebkitMaskImage: "linear-gradient(to bottom, #000 40%, transparent 98%)" }}>
          SCAMTRAIL
        </p>
      </div>

      {/* Legal bar */}
      <div className="page relative -mt-[2vw] flex flex-col gap-3 border-t hairline py-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="t-micro text-text-muted">© 2026 SCAMTRAIL · REPORTS SUPPORT DECISIONS, THEY DO NOT MAKE THEM</p>
        <a href={`${home}#top`} className="t-micro inline-flex min-h-[44px] items-center gap-2 text-text-muted transition-colors hover:text-text">
          BACK TO TOP
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M5 9V1M1.5 4.5L5 1l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>
        </a>
      </div>
    </footer>
  );
}

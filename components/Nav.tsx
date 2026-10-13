"use client";
import { useEffect, useState } from "react";
import { Lockup } from "./Logo";

export const NAV_LINKS = [
  { label: "PRODUCT", href: "#thread" },
  { label: "INVESTIGATE", href: "#top" },
  { label: "REPORTS", href: "#report" },
  { label: "GUIDES", href: "#how" },
  { label: "DOCS", href: "#trust" },
];

export function Wordmark({ size = 26 }: { size?: number }) {
  return <Lockup size={size} />;
}

export function Nav({ home = "" }: { home?: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header data-intro="nav" className="fixed inset-x-0 top-0 z-50 px-4 pt-3 md:px-10">
      <nav aria-label="Primary" className="mx-auto flex max-w-page items-center justify-between rounded-nav border hairline bg-canvas/90 py-1 pl-4 pr-1 backdrop-blur-md">
        <a href={`${home}#top`} className="inline-flex min-h-[44px] items-center rounded-tag" aria-label="ScamTrail home">
          <Wordmark />
        </a>
        <ul className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <li key={l.label}><a href={`${home}${l.href}`} className="nav-link">{l.label}</a></li>
          ))}
        </ul>
        <div className="flex items-center gap-1">
          <a href={`${home}#top`} className="btn-ghost hidden sm:inline-flex">INVESTIGATE</a>
          <button type="button" className="btn-ghost w-11 px-0 md:hidden" aria-expanded={open} aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((o) => !o)}>
            <span aria-hidden="true" className="flex flex-col gap-[5px]">
              <span className={`block h-px w-4 bg-current transition-transform ${open ? "translate-y-[3px] rotate-45" : ""}`} />
              <span className={`block h-px w-4 bg-current transition-transform ${open ? "-translate-y-[3px] -rotate-45" : ""}`} />
            </span>
          </button>
        </div>
      </nav>
      {open && (
        <ul id="mobile-nav" className="mx-auto mt-2 max-w-page rounded-nav border hairline bg-surface-raised p-2 md:hidden">
          {NAV_LINKS.map((l) => (
            <li key={l.label}>
              <a href={`${home}${l.href}`} className="nav-link w-full" onClick={() => setOpen(false)}>{l.label}</a>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}

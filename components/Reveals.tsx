"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { EASE_OUT, gsap, ScrollTrigger } from "@/lib/gsap";
import { flight } from "@/lib/flight";

/**
 * Page-wide GSAP entrances, driven by ScrollTrigger:
 *  - `.reveal`            rises and fades in, staggered with its neighbours
 *  - `[data-media-reveal]` photo frames open from an inset clip
 *  - `.draw-line`         SVG connectors draw as they scroll through view
 * New elements (scenes mount after hydration) are picked up as they appear.
 * Under reduced motion everything is shown in its final state.
 */
export function Reveals() {
  useEffect(() => {
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const seen = new WeakSet<Element>();
      const fresh = (selector: string) =>
        gsap.utils.toArray<HTMLElement>(selector).filter((el) => {
          if (seen.has(el)) return false;
          seen.add(el);
          return true;
        });

      const setup = () => {
        let added = 0;
        const text = fresh(".reveal");
        added += text.length;
        if (text.length) {
          gsap.set(text, { autoAlpha: 0, y: 44 });
          ScrollTrigger.batch(text, {
            start: "top 90%",
            once: true,
            onEnter: (batch) =>
              gsap.to(batch, { autoAlpha: 1, y: 0, duration: 1.2, ease: EASE_OUT, stagger: 0.09, overwrite: true }),
          });
        }

        const media = fresh("[data-media-reveal]");
        added += media.length;
        for (const el of media) {
          gsap.fromTo(el,
            { clipPath: "inset(9% 7% 9% 7% round 28px)" },
            { clipPath: "inset(0% 0% 0% 0% round 28px)", duration: 1.6, ease: EASE_OUT,
              scrollTrigger: { trigger: el, start: "top 88%", once: true } });
        }

        const lines = fresh(".draw-line");
        added += lines.length;
        for (const el of lines) {
          gsap.fromTo(el, { strokeDashoffset: 1 }, {
            strokeDashoffset: 0, ease: "none",
            scrollTrigger: { trigger: el.closest("svg") ?? el, start: "top 88%", end: "center 45%", scrub: 0.8 },
          });
        }
        if (added && !flight.active) ScrollTrigger.refresh();
      };

      setup();
      let queued = 0;
      const mo = new MutationObserver(() => {
        if (!queued) queued = requestAnimationFrame(() => { queued = 0; setup(); });
      });
      mo.observe(document.body, { childList: true, subtree: true });
      return () => {
        mo.disconnect();
        cancelAnimationFrame(queued);
      };
    });

    mm.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set(".draw-line", { strokeDashoffset: 0 });
    });

    // Pinned scenes change the page height after hydration; keep trigger positions true.
    let t = 0;
    // A refresh mid-glide would move targets under the nav scroll; wait for it to land.
    let off = () => {};
    const refresh = () => {
      off();
      if (!flight.active) return ScrollTrigger.refresh();
      off = flight.onLand(() => { off(); off = () => {}; ScrollTrigger.refresh(); });
    };
    const ro = new ResizeObserver(() => {
      clearTimeout(t);
      t = window.setTimeout(refresh, 160);
    });
    ro.observe(document.body);

    return () => {
      ro.disconnect();
      clearTimeout(t);
      off();
      mm.revert();
    };
  }, []);
  return null;
}

/** Plays a short GSAP entrance each time `swapKey` changes (captions, markers). */
export function SwapIn({ swapKey, children, className = "", as: Tag = "div" }: {
  swapKey: string | number; children: ReactNode; className?: string; as?: "div" | "p" | "span";
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const tween = gsap.fromTo(el, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: EASE_OUT });
    return () => { tween.kill(); };
  }, [swapKey]);
  return <Tag ref={ref as never} className={className}>{children}</Tag>;
}

"use client";
import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { flight } from "@/lib/flight";

/** Clears the fixed nav when landing on a section. */
const NAV_OFFSET = 72;

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Eases wheel scrolling so scroll-linked scenes glide instead of stepping
 * (Windows mouse wheels move in coarse jumps). Lenis drives the native scroll
 * position, so the scrollbar, keyboard, find-in-page and position: sticky all
 * keep working. Touch scrolling is left native. Off under reduced motion.
 * Lenis runs on GSAP's ticker so ScrollTrigger scenes and the scroll stay in step.
 *
 * In-page links (the nav, footer, "back to top") use their own glide rather than
 * Lenis's anchors: it re-measures the target every frame, so it lands exactly even
 * if something above it changes height on the way, scenes it passes stay quiet,
 * and any touch, wheel or key press hands control straight back to the reader.
 */
export function SmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lenis: Lenis | null = null;
    let tick: ((time: number) => void) | null = null;
    if (!reduced) {
      lenis = new Lenis({
        duration: 1.15,
        easing: (t) => 1 - Math.pow(1 - t, 3.2),
        wheelMultiplier: 0.9,
      });
      // One clock: Lenis advances on GSAP's ticker and tells ScrollTrigger on every move.
      lenis.on("scroll", ScrollTrigger.update);
      tick = (time: number) => lenis!.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
    }

    const setScroll = (y: number) => {
      if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
      else window.scrollTo(0, y);
    };
    const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;
    const targetOf = (el: HTMLElement) =>
      Math.max(0, Math.min(maxScroll(), el.getBoundingClientRect().top + window.scrollY - (el.id === "top" ? 0 : NAV_OFFSET)));

    let stopGlide: (() => void) | null = null;

    const glide = (el: HTMLElement) => {
      stopGlide?.();
      const from = window.scrollY;
      const distance = Math.abs(targetOf(el) - from);
      if (reduced || distance < 2) {
        setScroll(targetOf(el));
        return;
      }
      // Longer trips take a little longer, within an unhurried but never sluggish range.
      const duration = Math.min(1.6, Math.max(0.7, 0.55 + (distance / window.innerHeight) * 0.09));
      const t0 = performance.now();
      flight.start();

      const step = () => {
        const t = Math.min(1, (performance.now() - t0) / (duration * 1000));
        // Aim at where the target is now, not where it was at the click.
        setScroll(from + (targetOf(el) - from) * easeInOutCubic(t));
        if (t >= 1) finish(true);
      };
      const cancel = () => finish(false);
      const finish = (arrived: boolean) => {
        gsap.ticker.remove(step);
        window.removeEventListener("wheel", cancel);
        window.removeEventListener("touchstart", cancel);
        window.removeEventListener("keydown", cancel);
        stopGlide = null;
        flight.end();
        if (arrived) {
          // Late layout (images, fonts) can still nudge the target; settle on it.
          requestAnimationFrame(() => {
            if (Math.abs(targetOf(el) - window.scrollY) > 1) setScroll(targetOf(el));
            ScrollTrigger.update();
          });
        }
      };
      stopGlide = () => finish(false);
      window.addEventListener("wheel", cancel, { passive: true });
      window.addEventListener("touchstart", cancel, { passive: true });
      window.addEventListener("keydown", cancel);
      gsap.ticker.add(step);
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href*='#']") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank") return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || !url.hash) return;
      const el = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!el) return;
      e.preventDefault();
      glide(el);
      if (window.location.hash !== url.hash) history.pushState(null, "", url.hash);
      // Move keyboard focus with the view, without a second jump.
      if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
      el.focus({ preventScroll: true });
    };
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      stopGlide?.();
      if (tick) gsap.ticker.remove(tick);
      lenis?.destroy();
    };
  }, []);
  return null;
}

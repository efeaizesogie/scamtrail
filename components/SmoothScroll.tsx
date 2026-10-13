"use client";
import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";

/**
 * Eases wheel scrolling so scroll-linked scenes glide instead of stepping
 * (Windows mouse wheels move in coarse jumps). Lenis drives the native scroll
 * position, so the scrollbar, keyboard, find-in-page and position: sticky all
 * keep working. Touch scrolling is left native. Off under reduced motion.
 * Lenis runs on GSAP's ticker so ScrollTrigger scenes and the scroll stay in step.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => 1 - Math.pow(1 - t, 3.2),
      wheelMultiplier: 0.9,
      anchors: { offset: -72 },
    });
    // One clock: Lenis advances on GSAP's ticker and tells ScrollTrigger on every move.
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);
  return null;
}

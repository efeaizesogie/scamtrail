"use client";
import { RefObject, useEffect, useState } from "react";
import { gsap } from "./gsap";
import { flight } from "./flight";

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function useMediaQuery(query: string) {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return match;
}

/** True when pinned, scroll-linked scenes should run (desktop width, motion allowed). */
export function useScrollScenes() {
  const wide = useMediaQuery("(min-width: 768px)");
  const reduced = useReducedMotion();
  return wide && !reduced;
}

/** Fires once when the element first crosses the threshold. */
export function useInView<T extends Element>(ref: RefObject<T | null>, threshold = 0.25) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold, inView]);
  return inView;
}

type ProgressMode = "pin" | "through";

/**
 * Scroll progress 0..1 for an element, from a GSAP ScrollTrigger with scrub
 * smoothing, so every scroll-linked scene eases the same way.
 * "pin": through a tall container whose child is position: sticky.
 * "through": from the element entering the bottom of the viewport to leaving the top.
 */
export function useScrollProgress<T extends HTMLElement>(ref: RefObject<T | null>, mode: ProgressMode = "pin", enabled = true, scrub = 0.7) {
  const [p, setP] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    const proxy = { v: 0 };
    // During a nav glide the scene is only passed through: skip the per-frame renders
    // and catch up once it lands.
    const off = flight.onLand(() => setP(proxy.v));
    const tween = gsap.to(proxy, {
      v: 1,
      ease: "none",
      onUpdate: () => { if (!flight.active) setP(proxy.v); },
      scrollTrigger: {
        trigger: el,
        start: mode === "pin" ? "top top" : "top bottom",
        end: mode === "pin" ? "bottom bottom" : "bottom top",
        scrub,
        invalidateOnRefresh: true,
      },
    });
    return () => {
      off();
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [ref, mode, enabled, scrub]);
  return enabled ? p : 1;
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Maps p within [a, b] to 0..1. */
export const span = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));


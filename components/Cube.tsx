"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { GradedVideo } from "./Motion";

/** Flat line reference to the cube's geometry: an isometric hexagon with its three inner edges. */
export function CubeMark({ cx, cy, r, className = "", strong = false }: { cx: number; cy: number; r: number; className?: string; strong?: boolean }) {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
  const poly = pts.map((p) => p.join(",")).join(" ");
  return (
    <g className={className} aria-hidden="true">
      <polygon points={poly} fill={strong ? "rgb(229 255 93 / 0.14)" : "rgb(11 11 11 / 0.6)"} stroke="rgb(229 255 93)" strokeWidth={1.5} />
      <path
        d={`M${cx},${cy} L${pts[0][0]},${pts[0][1]} M${cx},${cy} L${pts[2][0]},${pts[2][1]} M${cx},${cy} L${pts[4][0]},${pts[4][1]}`}
        stroke="rgb(229 255 93)" strokeWidth={1.5} fill="none" />
    </g>
  );
}

/**
 * The photographic cube render. "light" is keyed to pure light for the dark canvas
 * (cube.webp); "solid" keeps an opaque glass body for the cream band (cube-solid.webp).
 * Both are produced by scripts/cube-alpha.mjs.
 */
export function CubeRender({ size = 220, pulseKey = 0, priority = false, variant = "light", rotate = 0, className = "" }: {
  size?: number; pulseKey?: number; priority?: boolean; variant?: "light" | "solid"; rotate?: number; className?: string;
}) {
  const [pulsing, setPulsing] = useState(false);
  useEffect(() => {
    if (!pulseKey) return;
    setPulsing(true);
    const t = setTimeout(() => setPulsing(false), 1100);
    return () => clearTimeout(t);
  }, [pulseKey]);
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size, transform: rotate ? `rotate(${rotate}deg)` : undefined }} aria-hidden="true">
      <Image src={variant === "solid" ? "/images/cube-solid.webp" : "/images/cube.webp"} alt="" width={size} height={size} priority={priority} quality={92}
        sizes={`${size}px`} className={`h-full w-full ${pulsing ? "cube-render-pulse" : ""}`} />
    </div>
  );
}

/**
 * The turning cube (public/video/cube.mp4), graded so its black backdrop lands
 * exactly on the page colour, with feathered edges so it also sits cleanly over
 * imagery. Dark canvas only.
 */
export function CubeVideo({ size = 220, priority = false, className = "" }: { size?: number; priority?: boolean; className?: string }) {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      {/* Soft light around the cube; the clip itself carries very little halo. */}
      <div className="pointer-events-none absolute inset-[-12%] rounded-full"
        style={{ background: "radial-gradient(closest-side, rgb(229 255 93 / 0.2), rgb(229 255 93 / 0.06) 55%, transparent 80%)" }} />
      <div className="absolute inset-0 overflow-hidden mix-blend-lighten"
        style={{ maskImage: "radial-gradient(closest-side, #000 62%, transparent 100%)", WebkitMaskImage: "radial-gradient(closest-side, #000 62%, transparent 100%)" }}>
        <GradedVideo src="/video/cube.mp4" poster="/images/cube-poster.webp" sizes={`${size}px`} priority={priority} />
      </div>
    </div>
  );
}

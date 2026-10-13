"use client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger, useGSAP);

/** House motion: long, soft deceleration for entrances. */
export const EASE_OUT = "expo.out";

export { gsap, ScrollTrigger, useGSAP };

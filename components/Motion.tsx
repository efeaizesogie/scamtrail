"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/hooks";

/* ------------------------------------------------------------------
   Carbon grade as a fragment shader: the same maths as
   scripts/grade-images.mjs, so video matches the graded stills.
   Citrine hues keep their colour; every other hue goes neutral; blacks
   lift to #0b0b0b so a clip's black backdrop disappears into the page.
   ------------------------------------------------------------------ */
const VERT = `attribute vec2 p; varying vec2 v;
void main(){ v = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `precision mediump float;
varying vec2 v; uniform sampler2D t; uniform float gamma; uniform float gain;
void main(){
  vec3 c = texture2D(t, v).rgb;
  float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b)), ch = mx - mn, h = 0.0;
  if (ch > 0.0) {
    if (mx == c.r) h = 60.0 * mod((c.g - c.b) / ch, 6.0);
    else if (mx == c.g) h = 60.0 * ((c.b - c.r) / ch + 2.0);
    else h = 60.0 * ((c.r - c.g) / ch + 4.0);
  }
  float sat = mx > 0.0 ? ch / mx : 0.0;
  float w = smoothstep(40.0, 58.0, h) * (1.0 - smoothstep(105.0, 125.0, h)) * smoothstep(0.18, 0.4, sat);
  float L0 = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float L = pow(max(0.0, (L0 - 0.015) / 0.985), gamma) * gain;
  float lift = 0.043;
  float grey = lift + L * (1.0 - lift);
  float sc = L0 > 0.001 ? grey / max(L0, lift) : 1.0;
  vec3 kept = min(vec3(1.0), c * min(sc, 1.1));
  gl_FragColor = vec4(mix(vec3(grey), kept, w), 1.0);
}`;

function setupGl(canvas: HTMLCanvasElement, gamma: number, gain: number) {
  const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false, alpha: false });
  if (!gl) return null;
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.uniform1f(gl.getUniformLocation(prog, "gamma"), gamma);
  gl.uniform1f(gl.getUniformLocation(prog, "gain"), gain);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  const params: [number, number][] = [
    [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE],
    [gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR],
  ];
  for (const [k, val] of params) gl.texParameteri(gl.TEXTURE_2D, k, val);
  return gl;
}

type FrameCallbackVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: () => void) => number;
  cancelVideoFrameCallback?: (id: number) => void;
};

/**
 * A muted loop, colour-graded live on the GPU. Shows the graded poster first
 * and fades the video in once its first frame is drawn. Plays only while on
 * screen. Reduced motion, or no WebGL, keeps the poster.
 */
export function GradedVideo({ src, poster, alt = "", gamma = 1.1, gain = 1, startAt = 0, sizes = "100vw", priority = false }: {
  src: string; poster: string; alt?: string; gamma?: number; gain?: number; startAt?: number; sizes?: string; priority?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const gl = setupGl(canvas, gamma, gain);
    if (!gl) return;

    const video = document.createElement("video") as FrameCallbackVideo;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "auto";
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");

    let visible = false, handle = 0, shown = false, disposed = false;
    const stop = () => {
      if (video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(handle);
      else cancelAnimationFrame(handle);
    };
    const draw = () => {
      if (disposed) return;
      if (video.readyState >= 2) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        if (!shown) {
          shown = true;
          setReady(true);
        }
      }
      if (visible) handle = video.requestVideoFrameCallback ? video.requestVideoFrameCallback(draw) : requestAnimationFrame(draw);
    };

    video.addEventListener("loadedmetadata", () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (startAt) video.currentTime = startAt;
    }, { once: true });

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      stop();
      if (visible) {
        if (!video.getAttribute("src")) video.src = src;
        video.play().catch(() => {});
        draw();
      } else {
        video.pause();
      }
    }, { rootMargin: "200px 0px" });
    io.observe(wrap);

    return () => {
      disposed = true;
      io.disconnect();
      stop();
      video.pause();
      video.removeAttribute("src");
      video.load();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [src, reduced, startAt, gamma, gain]);

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <Image src={poster} alt={alt} fill sizes={sizes} priority={priority} quality={90} className="object-cover" />
      <canvas ref={canvasRef} aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-reveal"
        style={{ opacity: ready ? 1 : 0 }} />
    </div>
  );
}

/* ------------------------------------------------------------------
   ScrubSequence: an image sequence drawn on a canvas and driven by a
   0..1 progress value, the way Apple plays scroll-linked footage.
   Neighbouring frames are crossfaded by the fractional index, so the
   motion stays continuous between frames in both scroll directions.
   ------------------------------------------------------------------ */
export function ScrubSequence({ base, count, progress, width = 1280, height = 720 }: {
  base: string; count: number; progress: number; width?: number; height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frames = useRef<(HTMLImageElement | undefined)[]>([]);
  const [loaded, setLoaded] = useState(0);

  // Coarse frames first (every 8th), then fill in, so scrubbing works early.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    const order: number[] = [];
    for (const step of [8, 4, 2, 1]) for (let i = 0; i < count; i += step) if (!order.includes(i)) order.push(i);
    let n = 0;
    const lane = async () => {
      while (!cancelled && order.length) {
        const i = order.shift()!;
        const img = new window.Image();
        img.decoding = "async";
        img.src = `${base}/${String(i).padStart(3, "0")}.webp`;
        try {
          await img.decode();
        } catch {
          continue;
        }
        if (cancelled) return;
        frames.current[i] = img;
        setLoaded(++n);
      }
    };
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      // A few parallel lanes keep the network busy without flooding it.
      for (let k = 0; k < 4; k++) lane();
    }, { rootMargin: "150% 0px" });
    io.observe(canvas);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, [base, count]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = Math.min(count - 1, Math.max(0, progress * (count - 1)));
    const find = (from: number, dir: 1 | -1) => {
      for (let k = from; k >= 0 && k < count; k += dir) if (frames.current[k]) return k;
      return -1;
    };
    let a = find(Math.floor(pos), -1);
    if (a < 0) a = find(Math.floor(pos), 1);
    if (a < 0) return;
    const b = find(Math.ceil(pos), 1);
    ctx.globalAlpha = 1;
    ctx.drawImage(frames.current[a]!, 0, 0, width, height);
    if (b > a) {
      ctx.globalAlpha = Math.min(1, Math.max(0, (pos - a) / (b - a)));
      ctx.drawImage(frames.current[b]!, 0, 0, width, height);
    }
  }, [progress, loaded, count, width, height]);

  return (
    <canvas ref={canvasRef} width={width} height={height} aria-hidden="true"
      className="absolute inset-0 h-full w-full transition-opacity duration-700 ease-reveal"
      style={{ opacity: loaded ? 1 : 0 }} />
  );
}

/**
 * Photo and render set. Originals live in assets/originals and are colour-graded
 * into public/images by `node scripts/grade-images.mjs`. next/image serves AVIF
 * and WebP at the right width for each viewport.
 *
 * Motion lives in public/video (graded live by components/Motion.tsx) and
 * public/frames/aisle (a pre-graded scroll sequence).
 */
export type ImageId =
  | "aisle" | "cube" | "desk" | "plates" | "lighttable" | "fog"
  | "fiber" | "search" | "trace" | "decide" | "archive";

export type ImageAsset = { src: string; width: number; height: number; alt: string };

export const IMAGES: Record<ImageId, ImageAsset> = {
  aisle: { src: "/images/aisle.webp", width: 1024, height: 572,
    alt: "An empty data center aisle between black server racks, with one strip of citrine light set into the floor at the far end." },
  cube: { src: "/images/cube.webp", width: 1024, height: 1024,
    alt: "" /* decorative: the ScamTrail cube */ },
  desk: { src: "/images/desk.webp", width: 1024, height: 572,
    alt: "A dark investigation desk: printouts, a closed hardware wallet, a loupe, and pale thread pinned between points, lit by a monitor." },
  plates: { src: "/images/plates.webp", width: 1024, height: 572,
    alt: "Five glass plates standing in a row. The front plate has a citrine edge; each plate behind it is fainter." },
  lighttable: { src: "/images/lighttable.webp", width: 1024, height: 572,
    alt: "A forensic light table with sheets in a row. The first sheet glows citrine and each sheet after it is darker." },
  fog: { src: "/images/fog.webp", width: 1024, height: 572,
    alt: "Stepping stones on a still lake in heavy mist. Only the nearest stone is lit." },
  fiber: { src: "/images/fiber.webp", width: 1024, height: 572,
    alt: "Fiber optic strands sweeping across dark glass, a few carrying citrine light, beside an unmarked device." },
  search: { src: "/images/search.webp", width: 1024, height: 572,
    alt: "A dark keyboard below a monitor with a thin citrine bar of light along its edge." },
  trace: { src: "/images/trace.webp", width: 1024, height: 572,
    alt: "Thread pulled between steel pins on dark paper. One thread, crossing the middle, is lit citrine." },
  decide: { src: "/images/decide.webp", width: 1024, height: 572,
    alt: "A blank sheet of paper and a black pen on a dark desk, in a pool of citrine lamp light." },
  archive: { src: "/images/archive.webp", width: 1024, height: 572,
    alt: "An open steel card-catalog drawer. One index card stands raised and lit from above." },
};

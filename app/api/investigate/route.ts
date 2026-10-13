import { investigate, normalize, type Env } from "@/lib/investigate";
import { ttlCache } from "@/lib/investigate/http";
import type { StreamEvent } from "@/lib/investigate/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** An investigation reads many slow public sources; give it room on serverless hosts. */
export const maxDuration = 60;

/** Finished event streams, replayed for repeat searches within ten minutes. */
const cache = ttlCache<StreamEvent[]>(10 * 60 * 1000, 300);

/** 12 searches per minute per client. */
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 12;
}

export async function POST(req: Request) {
  let body: { q?: unknown; type?: unknown; chainId?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Send JSON with a q field." }, { status: 400 });
  }
  const q = typeof body.q === "string" ? body.q.trim().slice(0, 200) : "";
  if (q.length < 2) return Response.json({ error: "Enter at least two characters." }, { status: 400 });
  const type = typeof body.type === "string" ? body.type : null;
  const chainId = typeof body.chainId === "number" && Number.isFinite(body.chainId) ? body.chainId : null;

  const key = `${JSON.stringify(normalize({ q, type }))}|${chainId ?? ""}`;
  const cached = cache.get(key);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!cached && limited(ip)) return Response.json({ error: "Too many searches in a minute. Wait a moment and try again." }, { status: 429 });

  const env: Env = {
    etherscan: process.env.ETHERSCAN_API_KEY || undefined,
    x: process.env.X_BEARER_TOKEN || undefined,
    sorsa: process.env.SORSA_API_KEY || undefined,
    chainabuse: process.env.CHAINABUSE_API_KEY || undefined,
    coingecko: process.env.COINGECKO_API_KEY || undefined,
  };

  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: StreamEvent) => {
        try { controller.enqueue(enc.encode(`${JSON.stringify(e)}\n`)); } catch { /* client went away */ }
      };
      if (cached) {
        for (const e of cached) send(e);
        controller.close();
        return;
      }
      const log: StreamEvent[] = [];
      try {
        await investigate({ q, type, chainId }, env, (e) => { log.push(e); send(e); });
        cache.set(key, log);
      } catch {
        send({ t: "error", message: "The investigation stopped unexpectedly. Try again." });
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}

import { pipeline } from "@xenova/transformers";
// Importing the backends module directly gives us the exact same module
// instance that @xenova/transformers uses internally (the runtime caches by
// resolved path). This lets us neutralize the fragile `wasm` fallback, which
// under Bun/Node intermittently resolves against the browser registry and
// either crashes with ERR_WORKER_PATH or hangs forever.
import { ONNX } from "@xenova/transformers/src/backends/onnx.js";
import type { EmbeddingPort } from "../../../ports/outbound/embedding.port.ts";
import { EmbeddingCache } from "../../../config/embedding-cache.ts";

/**
 * Force the native `cpu` execution provider on every session creation.
 * Without this, a transient backend mis-resolution silently degrades to
 * ort-web's `wasm` runtime whose blob-worker cannot be constructed, which
 * rejects the very first embed call (or never resolves).
 */
function forceNativeCpuBackend() {
  const IS: any = (ONNX as any)?.InferenceSession;
  if (!IS || IS.__raggaiCpuPatched) return;
  const originalCreate = IS.create.bind(IS);
  IS.create = (buffer: unknown, options?: Record<string, unknown>) =>
    originalCreate(buffer, { ...(options || {}), executionProviders: ["cpu"] });
  IS.__raggaiCpuPatched = true;
}
forceNativeCpuBackend();

export interface XenovaAdapterOptions {
  cache?: boolean;
  model?: string;
  cacheName?: string;
}

export class XenovaAdapter implements EmbeddingPort {
  private pipe: any = null;
  private initPromise: Promise<void> | null = null;
  private cache: EmbeddingCache | null = null;
  private model: string;

  constructor(opts?: XenovaAdapterOptions) {
    this.model = opts?.model || "Xenova/all-MiniLM-L6-v2";
    if (opts?.cache !== false) {
      this.cache = new EmbeddingCache(opts?.cacheName || "default");
    }
  }

  private async init() {
    if (this.initPromise) return this.initPromise;
    // Bounded, retriable model load: the embedding backend infrequently
    // fails to initialize (ORT backend resolution hiccup) and the wasm
    // fallback cannot run under Node/Bun. Failure here resets initPromise
    // so the next call tries fresh instead of reusing a broken pipeline.
    const attempt = async (): Promise<any> => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          pipeline("feature-extraction", this.model),
          new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error("Timed out loading the embedding model")), 60_000);
          }),
        ]);
      } finally {
        if (timer) clearTimeout(timer);
      }
    };
    const p = (async () => {
      let lastErr: unknown;
      for (let i = 0; i < 3; i++) {
        try {
          this.pipe = await attempt();
          return;
        } catch (err) {
          lastErr = err;
          console.warn(`[raggai] Embedding model load failed (attempt ${i + 1}/3):`, (err as Error)?.message ?? err);
        }
      }
      throw new Error(`Failed to load the embedding model after 3 attempts. Last error: ${(lastErr as Error)?.message ?? lastErr}`);
    })();
    this.initPromise = p;
    // If initialization ultimately fails, allow later calls to retry.
    p.catch(() => { if (this.initPromise === p) this.initPromise = null; });
    return p;
  }

  async generate(text: string): Promise<number[]> {
    const cached = this.cache?.get(text, this.model);
    if (cached) return cached;
    await this.init();
    const output = await this.pipe(text, { pooling: "mean", normalize: true });
    const vec = Array.from(output.data as Float32Array | number[]);
    this.cache?.set(text, vec, this.model);
    return vec;
  }

  async generateMany(texts: string[], opts?: { batchSize?: number }): Promise<number[][]> {
    const batchSize = Math.max(1, opts?.batchSize || 8);
    const results: number[][] = new Array(texts.length);
    // fill cached first
    const pending: Array<{ i: number; text: string }> = [];
    for (let i = 0; i < texts.length; i++) {
      const c = this.cache?.get(texts[i], this.model);
      if (c) results[i] = c; else pending.push({ i, text: texts[i] });
    }
    if (!pending.length) return results;
    await this.init();
    for (let start = 0; start < pending.length; start += batchSize) {
      const slice = pending.slice(start, start + batchSize);
      // process in parallel within batch (transformers pipeline handles sequentially internally in many cases, but Promise.all is fine for small batches)
      const vecs = await Promise.all(slice.map(async (p) => {
        const output = await this.pipe(p.text, { pooling: "mean", normalize: true });
        const vec = Array.from(output.data as Float32Array | number[]);
        this.cache?.set(p.text, vec, this.model);
        return { i: p.i, vec };
      }));
      for (const v of vecs) results[v.i] = v.vec;
    }
    return results;
  }

  getCacheStats() { return this.cache ? this.cache.stats() : null; }
  flushCache() { this.cache?.flush(); }
}

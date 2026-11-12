import * as crypto from "crypto";
import type { EmbeddingPort } from "../../ports/outbound/embedding.port.ts";
import type { VectorStorePort } from "../../ports/outbound/vector-store.port.ts";

export interface IngestEmbedItem {
  /** Chunk text used for embedding (raw content). */
  text: string;
  /** Text stored in the vector store (e.g. prefixed with context). */
  saveText: string;
  /** Metadata attached to the stored record. */
  meta: Record<string, unknown>;
  /** Optional pre-generated record id (a UUID is generated otherwise). */
  id?: string;
}

export interface IngestEmbedResult {
  /** Number of chunks embedded and saved. */
  count: number;
  /** Milliseconds spent embedding (model calls + cache fill). */
  embedMs: number;
  /** Milliseconds spent writing records to the vector store. */
  writeMs: number;
}

/** Canonical batch size used by all ingestion flows (CLI, plugin, API). */
export const INGEST_BATCH_SIZE = 16;

/**
 * Embed a batch of chunk texts (reusing the embedding cache when available,
 * falling back to per-text generate when the port does not implement
 * generateMany) and persist each resulting record to the vector store.
 *
 * Single source of truth for the embed+save step so CLI and plugin paths
 * behave identically (same batching, same cache usage, same metrics).
 */
export async function embedAndSaveChunks(
  ports: { embeddingPort: EmbeddingPort; vectorPort: VectorStorePort },
  items: IngestEmbedItem[],
  opts?: { batchSize?: number }
): Promise<IngestEmbedResult> {
  if (!items.length) return { count: 0, embedMs: 0, writeMs: 0 };
  const batchSize = Math.max(1, opts?.batchSize ?? INGEST_BATCH_SIZE);
  const { embeddingPort, vectorPort } = ports;

  const e0 = Date.now();
  const vecs = embeddingPort.generateMany
    ? await embeddingPort.generateMany(items.map(i => i.text), { batchSize })
    : await Promise.all(items.map(i => embeddingPort.generate(i.text)));
  const embedMs = Date.now() - e0;

  const w0 = Date.now();
  for (let i = 0; i < items.length; i++) {
    await vectorPort.save({
      id: items[i].id ?? crypto.randomUUID(),
      text: items[i].saveText,
      embedding: vecs[i],
      meta: items[i].meta,
    });
  }
  return { count: items.length, embedMs, writeMs: Date.now() - w0 };
}

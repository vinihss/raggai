import type { GraphStorePort } from "../../ports/outbound/graph-store.port.ts";
import type { GraphExtractionPort } from "../../ports/outbound/graph-extraction.port.ts";
import type { ExtractionInput } from "../models/graph-fact.ts";

export interface GraphIngestMetrics {
  extracted: number;
  upserted: number;
  created: number;
  merged: number;
  /** Facts dropped from previous versions of re-indexed sources. */
  prunedEdges: number;
  /** Orphan nodes dropped after pruning. */
  prunedNodes: number;
  /** Facts dropped below the confidence threshold. */
  rejected: number;
  byMethod: Record<string, number>;
}

export function emptyGraphIngestMetrics(): GraphIngestMetrics {
  return { extracted: 0, upserted: 0, created: 0, merged: 0, prunedEdges: 0, prunedNodes: 0, rejected: 0, byMethod: {} };
}

export function addGraphIngestMetrics(acc: GraphIngestMetrics, m: GraphIngestMetrics): GraphIngestMetrics {
  acc.extracted += m.extracted;
  acc.upserted += m.upserted;
  acc.created += m.created;
  acc.merged += m.merged;
  acc.prunedEdges += m.prunedEdges;
  acc.prunedNodes += m.prunedNodes;
  acc.rejected += m.rejected;
  for (const [k, v] of Object.entries(m.byMethod)) acc.byMethod[k] = (acc.byMethod[k] || 0) + v;
  return acc;
}

/** Compact one-line suffix for CLI summaries, e.g. ` facts=3 created=2 merged=1 pruned=0`. */
export function formatGraphIngestMetrics(m: GraphIngestMetrics): string {
  return `, facts=${m.extracted} created=${m.created} merged=${m.merged} rejected=${m.rejected} pruned=${m.prunedEdges}`;
}

const DEFAULT_MIN_CONFIDENCE = 0.5;

function resolveMinConfidence(explicit?: number): number {
  if (typeof explicit === "number" && Number.isFinite(explicit)) return explicit;
  const fromEnv = Number(process.env.RAGGAI_GRAPH_MIN_CONFIDENCE);
  if (Number.isFinite(fromEnv) && process.env.RAGGAI_GRAPH_MIN_CONFIDENCE !== undefined && process.env.RAGGAI_GRAPH_MIN_CONFIDENCE !== "") {
    return Math.min(1, Math.max(0, fromEnv));
  }
  return DEFAULT_MIN_CONFIDENCE;
}

/**
 * Idempotent graph ingest for a single source file.
 *
 * Order of operations:
 *  1. Drop provenance from previous versions of this source (keepHash = current hash).
 *     For new files this is a no-op.
 *  2. Extract facts deterministically (or via configured extractor).
 *  3. Filter by confidence threshold, upsert with merge/dedupe.
 */
export function graphIngestForFile(
  graph: GraphStorePort,
  extractor: GraphExtractionPort,
  input: ExtractionInput,
  opts?: { minConfidence?: number },
): GraphIngestMetrics {
  const minConfidence = resolveMinConfidence(opts?.minConfidence);
  const metrics = emptyGraphIngestMetrics();

  const prune = graph.removeFactsBySource(input.path, input.hash ? { keepHash: input.hash } : undefined);
  metrics.prunedEdges += prune.removedEdges;
  metrics.prunedNodes += prune.removedNodes;

  const result = extractor.extract(input);
  const accepted = result.facts.filter((f) => Number.isFinite(f.confidence) && f.confidence >= minConfidence);
  metrics.rejected = result.facts.length - accepted.length;
  metrics.extracted = accepted.length;
  for (const f of accepted) metrics.byMethod[f.method] = (metrics.byMethod[f.method] || 0) + 1;

  const up = graph.upsertFacts(accepted);
  metrics.upserted = up.upserted;
  metrics.created = up.created;
  metrics.merged = up.merged;

  return metrics;
}

/** Prune all facts originating from a removed source file. */
export function graphPruneForRemovedSource(graph: GraphStorePort, sourcePath: string): { removedEdges: number; removedNodes: number } {
  return graph.removeFactsBySource(sourcePath);
}

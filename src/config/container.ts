import { JsonGraphAdapter } from "../adapters/outbound/graphology/json-graph.adapter.ts";
import { LanceDBAdapter } from "../adapters/outbound/lancedb/lancedb.adapter.ts";
import { XenovaAdapter } from "../adapters/outbound/transformers/xenova.adapter.ts";
import { DeterministicExtractionAdapter } from "../adapters/outbound/extraction/deterministic.extraction.ts";
import { HybridOrchestrator } from "../domain/services/hybrid-orchestrator.ts";
import { resolveContext } from "./raggai-paths.ts";

export interface ContainerOptions {
  cache?: boolean;
}

export function createContainer(domain?: string, opts?: ContainerOptions) {
  const ctx = resolveContext();
  const active = domain || ctx.activeDomain || "global";
  const embeddingPort = new XenovaAdapter({ cache: opts?.cache ?? ctx.embeddingCache ?? true, cacheName: "global" });
  const vectorPort = new LanceDBAdapter(embeddingPort, { domain: active });
  const graphPort = new JsonGraphAdapter({ domain: active });
  // Extraction pipeline: deterministic rules first (Phase 1). Optional
  // model-assisted extraction can be layered behind GraphExtractionPort later.
  const extractionPort = new DeterministicExtractionAdapter();
  const ragOps = new HybridOrchestrator(vectorPort, graphPort);
  return { ragOps, embeddingPort, vectorPort, graphPort, extractionPort, domain: active, context: ctx };
}

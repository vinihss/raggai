import { JsonGraphAdapter } from "../adapters/outbound/graphology/json-graph.adapter.ts";
import { LanceDBAdapter } from "../adapters/outbound/lancedb/lancedb.adapter.ts";
import { XenovaAdapter } from "../adapters/outbound/transformers/xenova.adapter.ts";
import { HybridOrchestrator } from "../domain/services/hybrid-orchestrator.ts";

export function createContainer() {
  const embeddingPort = new XenovaAdapter();
  const vectorPort = new LanceDBAdapter(embeddingPort);
  const graphPort = new JsonGraphAdapter();
  const ragOps = new HybridOrchestrator(vectorPort, graphPort);
  return { ragOps, embeddingPort, vectorPort, graphPort };
}

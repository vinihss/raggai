import type { RagOperationsPort } from "../../ports/inbound/rag-operations.port.ts";
import type { VectorStorePort } from "../../ports/outbound/vector-store.port.ts";

export class HybridOrchestrator implements RagOperationsPort {
  constructor(
    private vectorPort: VectorStorePort,
    private graphPort: unknown, // Outbound Port para grafo (Graphology/JSON adapter)
  ) {}

  async consultar(query: string, keywords?: string[]) {
    // Pure orchestration: vector + graph -> hybrid fusion (RRF / confidence).
    throw new Error("Not implemented: HybridOrchestrator.consultar");
  }

  async memorizar(fato: string, meta?: Record<string, unknown>) {
    throw new Error("Not implemented: HybridOrchestrator.memorizar");
  }

  async importarCodebase(path: string) {
    throw new Error("Not implemented: HybridOrchestrator.importarCodebase");
  }
}

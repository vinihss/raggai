import type { RagOperationsPort } from "../../ports/inbound/rag-operations.port.ts";
import type { VectorStorePort } from "../../ports/outbound/vector-store.port.ts";

export class HybridOrchestrator implements RagOperationsPort {
  constructor(
    private vectorPort: VectorStorePort,
    private graphPort: unknown, // Outbound Port para grafo (Graphology/JSON adapter)
  ) {}

  async consultar(query: string, keywords?: string[]) {
    // Orquestração pura: vetor + grafo -> fusão híbrida (RRF / confiança).
    throw new Error("Implementar: HybridOrchestrator.consultar");
  }

  async memorizar(fato: string, meta?: Record<string, unknown>) {
    throw new Error("Implementar: HybridOrchestrator.memorizar");
  }

  async importarCodebase(path: string) {
    throw new Error("Implementar: HybridOrchestrator.importarCodebase");
  }
}

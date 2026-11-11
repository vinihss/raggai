export interface RagOperationsPort {
  consultar(query: string, keywords?: string[]): Promise<{ graph: unknown[]; vector: unknown[] }>;
  memorizar(fato: string, meta?: Record<string, unknown>): Promise<void>;
  importarCodebase(path: string): Promise<void>;
}

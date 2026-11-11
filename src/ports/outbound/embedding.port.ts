export interface EmbeddingPort {
  generate(text: string): Promise<number[]>;
  generateMany?(texts: string[], opts?: { batchSize?: number }): Promise<number[][]>;
  getCacheStats?(): { hits: number; misses: number; size: number } | null;
  flushCache?(): void;
}

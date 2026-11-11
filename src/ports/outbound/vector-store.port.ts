export interface VectorStorePort {
  save(chunk: {
    id: string;
    text: string;
    embedding: number[];
    meta?: Record<string, unknown>;
  }): Promise<void>;
  search(
    queryEmbedding: number[],
    k?: number,
  ): Promise<{ id: string; score: number; meta?: Record<string, unknown> }[]>;
  clear(): Promise<void>;
  deleteByPath?(filePath: string): Promise<void | { deleted: boolean; method?: string; error?: string }>;
  count?(): Promise<number | null>;
}

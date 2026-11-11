import * as lancedb from "@lancedb/lancedb";
import * as path from "path";
import type { VectorStorePort } from "../../ports/outbound/vector-store.port.ts";

const VECTOR_DIR = path.resolve("./data/vector_store");

export class LanceDBAdapter implements VectorStorePort {
  private db: lancedb.Db | null = null;
  private table: lancedb.Table | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(private embeddingPort?: { generate(text: string): Promise<number[]> }) {}

  private async init() {
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      this.db = await lancedb.connect(VECTOR_DIR);
      try {
        this.table = await this.db.openTable("memoria_vetorial");
      } catch {
        const dummy = this.embeddingPort
          ? await this.embeddingPort.generate("init")
          : new Array(384).fill(0);
        this.table = await this.db.createTable("memoria_vetorial", [
          { vector: dummy, text: "Inicialização do sistema", type: "system", path: "none" },
        ]);
      }
    })();
    return this.initPromise;
  }

  async save(
    chunk:
      | { id: string; text: string; embedding: number[]; meta?: Record<string, unknown> }
      | { id: string; text: string; embedding: number[]; meta?: Record<string, unknown> }[],
  ): Promise<void> {
    await this.init();
    const items = Array.isArray(chunk) ? chunk : [chunk];
    for (const c of items) {
      const record = {
        vector: c.embedding,
        text: c.text,
        ...c.meta,
      };
      await this.table!.add([record]);
    }
  }

  async search(queryEmbedding: number[], k = 4) {
    await this.init();
    const hits = await this.table!.search(queryEmbedding).distanceType("cosine").limit(k).toArray();
    return hits.map((h: any) => ({
      id: h.text ?? "",
      score: 1 - (h._distance ?? 0),
      meta: { path: h.path, type: h.type },
    }));
  }

  async clear() {
    // Reset físico via file-system (alinha com reset_indexes.ts)
    const fs = await import("fs");
    if (fs.existsSync(VECTOR_DIR)) fs.rmSync(VECTOR_DIR, { recursive: true, force: true });
    this.table = null;
    this.db = null;
    this.initPromise = null;
  }
}

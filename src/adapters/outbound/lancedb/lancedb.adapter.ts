import * as fs from "fs";
import * as lancedb from "@lancedb/lancedb";
import * as path from "path";
import type { VectorStorePort } from "../../../ports/outbound/vector-store.port.ts";
import { getVectorDir, ensureDomain } from "../../../config/raggai-paths.ts";

export interface LanceDBAdapterOptions {
  domain?: string;
  vectorDir?: string;
}

export class LanceDBAdapter implements VectorStorePort {
  private db: lancedb.Db | null = null;
  private table: lancedb.Table | null = null;
  private initPromise: Promise<void> | null = null;
  private vectorDir: string;
  private domain: string;

  constructor(private embeddingPort?: { generate(text: string): Promise<number[]> }, opts?: LanceDBAdapterOptions) {
    this.domain = opts?.domain || process.env.RAGGAI_DOMAIN || "global";
    this.vectorDir = opts?.vectorDir || getVectorDir(this.domain);
  }

  private async init() {
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      ensureDomain(this.domain, this.domain === "global" ? "global" : "custom");
      fs.mkdirSync(this.vectorDir, { recursive: true });
      this.db = await lancedb.connect(this.vectorDir);
      try {
        this.table = await this.db.openTable("memoria_vetorial");
      } catch {
        const dummy = this.embeddingPort
          ? await this.embeddingPort.generate("init")
          : new Array(384).fill(0);
        this.table = await this.db.createTable("memoria_vetorial", [
          { vector: dummy, text: "Inicialização do sistema", type: "system", path: "none", domain: this.domain },
        ]);
      }
    })();
    return this.initPromise;
  }

  async deleteByPath(filePath: string): Promise<{ deleted: boolean; method?: string; error?: string }> {
    await this.init();
    const escaped = filePath.replace(/'/g, "''");
    const attempts = [
      { name: "sql-path", run: () => (this.table as any).delete(`path = '${escaped}'`) },
      { name: "sql-quoted", run: () => (this.table as any).delete(`"path" = '${escaped}'`) },
      { name: "where-path", run: () => (this.table as any).delete({ where: `path = '${escaped}'` }) },
    ];
    let lastErr = "";
    for (const a of attempts) {
      try {
        await a.run();
        return { deleted: true, method: a.name };
      } catch (e: any) {
        lastErr = e?.message || String(e);
      }
    }
    return { deleted: false, error: lastErr };
  }

  async count(): Promise<number | null> {
    await this.init();
    try {
      if (typeof (this.table as any).countRows === "function") return await (this.table as any).countRows();
      if (typeof (this.table as any).count_rows === "function") return await (this.table as any).count_rows();
    } catch {}
    try {
      const rows = await this.table!.query().select(["id"]).limit(100000).toArray();
      return rows.length;
    } catch { return null; }
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
        domain: this.domain,
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
      meta: { path: h.path, type: h.type, domain: h.domain || this.domain, text: h.text },
    }));
  }

  async clear() {
    if (fs.existsSync(this.vectorDir)) fs.rmSync(this.vectorDir, { recursive: true, force: true });
    this.table = null;
    this.db = null;
    this.initPromise = null;
  }
}

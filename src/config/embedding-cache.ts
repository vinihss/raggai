import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { getCacheDir } from "./raggai-paths";

export class EmbeddingCache {
  private cacheFile: string;
  private map: Record<string, number[]> = {};
  private dirty = false;
  private hits = 0;
  private misses = 0;

  constructor(name = "embeddings") {
    const dir = path.join(getCacheDir(), "embeddings");
    fs.mkdirSync(dir, { recursive: true });
    this.cacheFile = path.join(dir, `${name}.json`);
    try { if (fs.existsSync(this.cacheFile)) this.map = JSON.parse(fs.readFileSync(this.cacheFile, "utf-8")); } catch { this.map = {}; }
  }

  private key(text: string, model = "default") {
    return crypto.createHash("sha256").update(model + "\n" + text).digest("hex");
  }

  get(text: string, model?: string): number[] | undefined {
    const v = this.map[this.key(text, model)];
    if (v) this.hits++; else this.misses++;
    return v;
  }

  set(text: string, embedding: number[], model?: string) {
    this.map[this.key(text, model)] = embedding;
    this.dirty = true;
  }

  stats() { return { hits: this.hits, misses: this.misses, size: Object.keys(this.map).length }; }

  flush() {
    if (!this.dirty) return;
    try { fs.writeFileSync(this.cacheFile, JSON.stringify(this.map)); this.dirty = false; } catch {}
  }
}

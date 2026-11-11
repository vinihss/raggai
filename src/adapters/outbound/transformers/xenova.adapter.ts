import { pipeline } from "@xenova/transformers";
import type { EmbeddingPort } from "../../ports/outbound/embedding.port.ts";

export class XenovaAdapter implements EmbeddingPort {
  private pipe: any = null;
  private initPromise: Promise<void> | null = null;

  private async init() {
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      this.pipe = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    })();
    return this.initPromise;
  }

  async generate(text: string): Promise<number[]> {
    await this.init();
    const output = await this.pipe(text, { pooling: "mean", normalize: true });
    return Array.from(output.data);
  }
}

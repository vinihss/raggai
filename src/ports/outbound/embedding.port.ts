export interface EmbeddingPort {
  generate(text: string): Promise<number[]>;
}

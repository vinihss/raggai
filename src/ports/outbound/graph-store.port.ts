import type { EnrichedFact, RemoveBySourceResult, UpsertFactsResult } from "../../domain/models/graph-fact.ts";

export interface RemoveFactsBySourceOptions {
  /**
   * When provided, only provenance entries whose sourceHash differs from
   * keepHash are removed (used on re-index to drop stale facts from a
   * previous version of the same file while keeping current ones).
   * Omit to remove all provenance originating from sourcePath.
   */
  keepHash?: string;
}

export interface GraphStorePort {
  /** Legacy/manual fact creation. Equivalent to upsertFacts with method=manual, confidence=1. */
  addFact(source: string, relation: string, target: string): void;
  /** Insert or merge facts (dedupe natural key: subject × predicate × object). */
  upsertFacts(facts: EnrichedFact[]): UpsertFactsResult;
  /** Remove facts (and now-orphan nodes) originating from sourcePath. */
  removeFactsBySource(sourcePath: string, opts?: RemoveFactsBySourceOptions): RemoveBySourceResult;
  searchConnections(keyword: string): string[];
  auditAndExportTree(): { relatorio: string; arvoreVisual: string };
  exportInteractiveHtml(outputPath: string): void;
  clear(): void;
}

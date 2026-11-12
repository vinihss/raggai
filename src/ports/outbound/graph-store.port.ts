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

/** Raw snapshot as exported by graphology's Graph class (multi-graph). */
export interface GraphRawNode {
  key: string;
  attributes?: Record<string, unknown>;
}

/** Raw edge as exported by graphology's Graph class. */
export interface GraphRawEdge {
  key?: string;
  source: string;
  target: string;
  attributes?: Record<string, unknown>;
}

/** Full raw graph export (options, attributes, nodes, edges). */
export interface GraphRawSnapshot {
  options?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
  nodes: GraphRawNode[];
  edges: GraphRawEdge[];
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
  /** Return the raw graph snapshot (nodes & edges) for analytics / UI. */
  getRaw(): GraphRawSnapshot;
}

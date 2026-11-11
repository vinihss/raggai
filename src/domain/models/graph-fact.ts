/**
 * Enriched graph fact model.
 *
 * Facts carry confidence and provenance so the pipeline can merge duplicates,
 * dedupe across sources, and prune stale facts by origin when a source file
 * changes or is removed.
 */

export type GraphFactMethod =
  | "rule" // deterministic line/pattern rule (e.g. "- [A] rel [B]")
  | "heading" // structural extraction from document headings
  | "link" // extraction from links/references
  | "symbol" // deterministic code symbol extraction
  | "llm" // model-assisted extraction (opt-in)
  | "manual"; // user-provided fact (e.g. memorize_personal_fact)

export interface EnrichedFact {
  /** Raw subject entity (canonicalized by the store). */
  subject: string;
  /** Predicate / relation (normalized to lower_snake_case by the store). */
  predicate: string;
  /** Raw object entity (canonicalized by the store). */
  object: string;
  /** 0..1 confidence score. */
  confidence: number;
  /** Which extractor produced this fact. */
  method: GraphFactMethod | (string & {});
  /** Absolute path of the source file (undefined for manual facts). */
  sourcePath?: string;
  /** sha256 hash of the source content at extraction time. */
  sourceHash?: string;
  /** Short human-readable evidence (e.g. the matched line). */
  evidence?: string;
}

/** Provenance entry persisted on the edge as a list of evidences. */
export interface FactProvenance {
  sourcePath?: string;
  sourceHash?: string;
  method: string;
  confidence: number;
  evidence?: string;
  /** ISO-8601 timestamp of when this evidence was extracted/merged. */
  extractedAt: string;
}

export interface UpsertFactsResult {
  /** Total facts processed (created + merged). */
  upserted: number;
  /** Facts that created a new edge. */
  created: number;
  /** Facts merged into an existing edge (dedupe/evidence refresh). */
  merged: number;
}

export interface RemoveBySourceResult {
  removedEdges: number;
  removedNodes: number;
}

export interface ExtractionDiagnostics {
  extracted: number;
  rejectedLowConfidence: number;
}

export interface ExtractionResult {
  facts: EnrichedFact[];
  diagnostics?: ExtractionDiagnostics;
}

export interface ExtractionInput {
  /** Document kind drives extractor selection. */
  kind: "note" | "code";
  /** Absolute file path. */
  path: string;
  /** Full text content. */
  text: string;
  /** sha256 hash of the content (used for provenance and incremental prune). */
  hash?: string;
  /** Language hint for code extraction (e.g. "ts", "py"). */
  language?: string;
}

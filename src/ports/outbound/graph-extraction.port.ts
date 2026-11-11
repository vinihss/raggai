import type { ExtractionInput, ExtractionResult } from "../../domain/models/graph-fact.ts";

/**
 * Outbound contract for graph fact extractors.
 *
 * Implementations must be deterministic-friendly (pure functions of the input)
 * so the pipeline stays incremental and testable. Optional model-assisted
 * extractors plug in behind the same contract.
 */
export interface GraphExtractionPort {
  extract(input: ExtractionInput): ExtractionResult;
}

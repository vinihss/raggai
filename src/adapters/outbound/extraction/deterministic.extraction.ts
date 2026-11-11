import type { GraphExtractionPort } from "../../../ports/outbound/graph-extraction.port.ts";
import type { ExtractionInput, ExtractionResult, EnrichedFact } from "../../../domain/models/graph-fact.ts";

/**
 * Legacy note line: `- [Subject] predicate [Object]`
 * Kept as high-confidence deterministic rule (method: "rule").
 */
const LEGACY_FACT_LINE = /-\s*\[([^\]]+)\]\s+([^\[\]\n]+?)\s+\[([^\]]+)\]/;

/**
 * Phase 1 deterministic extractor.
 *
 * - notes (markdown/text): parity with the previous inline regex, now with
 *   provenance (sourcePath + sourceHash), confidence and evidence.
 * - code: intentional no-op in Phase 1 — code extraction (imports/symbols)
 *   lands in Phase 3 behind this same contract. The import pipeline still
 *   benefits from source-based prune of stale facts.
 *
 * Phase 2 will extend the note rules (frontmatter, headings, links, tables).
 */
export class DeterministicExtractionAdapter implements GraphExtractionPort {
  extract(input: ExtractionInput): ExtractionResult {
    const facts: EnrichedFact[] = [];

    if (input.kind === "note") {
      for (const rawLine of input.text.split("\n")) {
        const line = rawLine.trim();
        if (!line) continue;
        const m = line.match(LEGACY_FACT_LINE);
        if (!m) continue;
        const subject = m[1].trim();
        const predicate = m[2].trim();
        const object = m[3].trim();
        if (!subject || !predicate || !object) continue;
        facts.push({
          subject,
          predicate,
          object,
          confidence: 0.9,
          method: "rule",
          sourcePath: input.path,
          sourceHash: input.hash,
          evidence: line.slice(0, 200),
        });
      }
    }

    return {
      facts,
      diagnostics: { extracted: facts.length, rejectedLowConfidence: 0 },
    };
  }
}

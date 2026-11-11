import type { GraphExtractionPort } from "../../../ports/outbound/graph-extraction.port.ts";
import type { ExtractionInput, ExtractionResult, EnrichedFact } from "../../../domain/models/graph-fact.ts";
import { canonicalPredicate, isKnownPredicate } from "../../../domain/services/predicate-vocab.ts";
import { docEntityName, isValidEntity, normalizeEntityText } from "../../../domain/services/entity-utils.ts";
import { extractCodeFacts } from "./code.extraction.ts";

/**
 * Phase 2 deterministic extractor (notes / markdown).
 *
 * Rules, in priority order, all incremental and provenance-aware.
 *
 *  1. Legacy line rule (method `rule`, confidence 0.9): `- [A] rel [B]`.
 *  2. YAML frontmatter (`frontmatter`, 0.85): keys that map to the canonical
 *     predicate vocabulary emit `<doc> <pred> <value>`; lists, flow or
 *     block, are supported.
 *  3. Bullets under a predicate heading (`heading`, 0.75): a heading whose
 *     text maps to a canonical predicate (e.g. "## Dependencies") makes each
 *     bullet below it a fact.
 *  4. Links (`link`): Obsidian wikilinks `[[Target]]` / `[[Target|Alias]]`
 *     (0.8) and local markdown links to markdown files (0.75) become
 *     `<doc> references <Target>`.
 *  5. Simple tables (`table`, 0.8): header cells matching the canonical
 *     vocabulary become predicates (`| Doc | Uses |`); or, when the header
 *     matches an entity/relation/target triple, every row is a fact triple.
 *
 * Code fences (``` / ~~~) are ignored entirely so examples and samples
 * never produce facts.
 *
 * `kind: "code"` delegates to `./code.extraction.ts` (Phase 3).
 */
const LEGACY_FACT_LINE = /-\s*\[([^\]]+)\]\s+([^\[\]\n]+?)\s+\[([^\]]+)\]/;
const CONFIDENCE = { rule: 0.9, frontmatter: 0.85, table: 0.8, wiki: 0.8, md: 0.75, heading: 0.75 } as const;

const WIKILINK = /\[\[([^\]|#]+)(#[^\]|]*)?(\|[^\]]*)?\]\]/g;
const MD_LINK = /(?<!!)\[([^\]]*)\]\(([^)\s]+)(#[^)\s]*)?\)/g;

const TRIPLE_HEADERS: Record<string, "subject" | "predicate" | "object"> = {
  entity: "subject", subject: "subject", source: "subject", from: "subject",
  relation: "predicate", predicate: "predicate", rel: "predicate",
  target: "object", object: "object", to: "object", dest: "object",
};

function parseTableCells(line: string): string[] {
  const inner = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return inner.split("|").map((c) => normalizeEntityText(c));
}
function isSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c.trim()) || /^-+$/.test(c.trim()));
}
function splitFrontmatterList(value: string): string[] {
  let v = value.trim();
  if (v.startsWith("[") && v.endsWith("]")) v = v.slice(1, -1);
  return v.split(",").map((s) => normalizeEntityText(s.replace(/^["']|["']$/g, ""))).filter(Boolean);
}

export class DeterministicExtractionAdapter implements GraphExtractionPort {
  extract(input: ExtractionInput): ExtractionResult {
    const facts = input.kind === "note" ? this.extractNote(input) : extractCodeFacts(input);
    return { facts, diagnostics: { extracted: facts.length, rejectedLowConfidence: 0 } };
  }

  private extractNote(input: ExtractionInput): EnrichedFact[] {
    const facts: EnrichedFact[] = [];
    const doc = docEntityName(input.path);
    const push = (subject: string, predicate: string, object: string, confidence: number, method: EnrichedFact["method"], evidence: string) => {
      const s = normalizeEntityText(subject), o = normalizeEntityText(object);
      if (!isValidEntity(s) || !isValidEntity(o)) return;
      const p = canonicalPredicate(predicate);
      if (!p) return;
      facts.push({ subject: s, predicate: p, object: o, confidence, method, sourcePath: input.path, sourceHash: input.hash, evidence: evidence.slice(0, 200) });
    };

    const lines = input.text.split("\n");
    let inFrontmatter = false, frontmatterSeen = false, inFence = false;
    let headingPredicate: string | null = null;
    let pendingFmPredicate: string | null = null;
    let tableHeader: string[] | null = null, tableRows: string[][] = [];

    const flushTable = () => {
      if (tableHeader) {
        const norm = tableHeader.map((c) => c.toLowerCase().replace(/[^a-z_]/g, "_").replace(/^_+|_+$/g, ""));
        const roles = norm.map((c) => TRIPLE_HEADERS[c]);
        const triple = roles.length >= 3 && roles[0] === "subject" && roles[1] === "predicate" && roles[2] === "object";
        const predCols = tableHeader.map((c, i) => (i > 0 && isKnownPredicate(c) ? { i, pred: canonicalPredicate(c) } : null)).filter(Boolean) as { i: number; pred: string }[];
        for (const row of tableRows) {
          if (triple) {
            push(row[0], row[1], row[2], CONFIDENCE.table, "table", `| ${row.join(" | ")} |`);
          } else {
            for (const { i, pred } of predCols) push(row[0], pred, row[i], CONFIDENCE.table, "table", `| ${row.join(" | ")} |`);
          }
        }
      }
      tableHeader = null; tableRows = [];
    };

    for (let idx = 0; idx < lines.length; idx++) {
      const trimmed = lines[idx].trim();

      // --- Frontmatter (file start) ---
      if (idx === 0 && trimmed === "---") { inFrontmatter = true; frontmatterSeen = true; continue; }
      if (inFrontmatter) {
        if (trimmed === "---" || trimmed === "...") { inFrontmatter = false; continue; }
        const kv = trimmed.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
        if (kv) {
          const key = kv[1], val = kv[2].trim();
          pendingFmPredicate = isKnownPredicate(key) ? canonicalPredicate(key) : null;
          if (val !== "" && pendingFmPredicate) {
            for (const item of splitFrontmatterList(val)) push(doc, pendingFmPredicate, item, CONFIDENCE.frontmatter, "frontmatter", trimmed);
            pendingFmPredicate = null;
          }
        } else if (pendingFmPredicate && /^-\s+/.test(trimmed)) {
          push(doc, pendingFmPredicate, trimmed.replace(/^-\s+/, ""), CONFIDENCE.frontmatter, "frontmatter", trimmed);
        } else if (trimmed !== "" && !/^-\s+/.test(trimmed)) {
          pendingFmPredicate = null;
        }
        continue;
      }
      if (frontmatterSeen && idx === 0) { /* unreachable, kept for clarity */ }

      // --- Code fences ---
      if (/^(```|~~~)/.test(trimmed)) { inFence = !inFence; flushTable(); continue; }
      if (inFence) continue;

      // --- Tables ---
      if (/^\|.*\|$/.test(trimmed)) {
        const cells = parseTableCells(trimmed);
        if (isSeparatorRow(cells)) continue;
        if (!tableHeader) tableHeader = cells; else tableRows.push(cells);
        continue;
      }
      flushTable();

      // --- Headings ---
      const h = trimmed.match(/^#{1,6}\s+(.+)$/);
      if (h) {
        const text = normalizeEntityText(h[1]);
        headingPredicate = isKnownPredicate(text) ? canonicalPredicate(text) : null;
        continue;
      }

      // --- Bullets under predicate heading ---
      const b = trimmed.match(/^(?:[-*+]|\d+[.)])\s+(.+)$/);
      if (b && headingPredicate && !/[\[\]]/.test(b[1])) {
        push(doc, headingPredicate, b[1], CONFIDENCE.heading, "heading", trimmed);
      }

      // --- Wikilinks ---
      for (const m of trimmed.matchAll(WIKILINK)) push(doc, "references", m[1], CONFIDENCE.wiki, "link", trimmed);

      // --- Local markdown links ---
      for (const m of trimmed.matchAll(MD_LINK)) {
        const target = m[2];
        if (/^https?:\/\//i.test(target)) continue;
        const pathOnly = target.split("#")[0];
        if (!/\.(md|mdx|markdown|txt)$/i.test(pathOnly)) continue;
        push(doc, "references", docEntityName(pathOnly), CONFIDENCE.md, "link", trimmed);
      }

      // --- Legacy line rule ---
      const legacy = trimmed.match(LEGACY_FACT_LINE);
      if (legacy) push(legacy[1], legacy[2], legacy[3], CONFIDENCE.rule, "rule", trimmed);
    }
    flushTable();
    return facts;
  }
}

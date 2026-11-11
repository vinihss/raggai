/**
 * Canonical predicate vocabulary + alias normalization.
 *
 * One graph should speak one language for relations. Aliases (raw synonyms,
 * any case, underscores/hyphens treated as spaces) are folded onto a small
 * canonical set before facts reach the store. Unknown predicates pass
 * through normalized (lower_snake_case) so nothing is silently dropped.
 */

export type CanonicalPredicate =
  | "uses" | "depends_on" | "contains" | "defines" | "references"
  | "implements" | "calls" | "extends" | "part_of";

export const CANONICAL_PREDICATES: readonly CanonicalPredicate[] = [
  "uses", "depends_on", "contains", "defines", "references",
  "implements", "calls", "extends", "part_of",
] as const;

const RAW_ALIASES: Record<CanonicalPredicate, string[]> = {
  uses: ["use", "uses", "using", "usage", "utilise", "utilises", "utilising", "utilize", "utilizes", "utilizing"],
  depends_on: [
    "depend", "depends", "depending", "depends on", "depend on",
    "dependency", "dependencies",
    "require", "requires", "required", "requirement", "requirements", "need", "needs",
  ],
  contains: [
    "contain", "contains", "containing",
    "include", "includes", "including",
    "comprise", "comprises", "comprising", "consists of", "consisting of",
  ],
  defines: [
    "define", "defines", "defining", "definition", "definitions",
    "declare", "declares", "declaring", "declaration", "declarations",
  ],
  references: [
    "reference", "references", "referencing",
    "refer", "refers", "referring", "refer to", "refers to",
    "related", "related to", "related links", "related docs",
    "see", "see also", "link", "links", "mention", "mentions",
    "veja", "ver", "consulte",
  ],
  implements: ["implement", "implements", "implementing", "implementation", "implementations", "implementa"],
  calls: ["call", "calls", "calling", "invoke", "invokes", "invoking", "invocation", "chama", "invoca"],
  extends: ["extend", "extends", "extending", "inherit", "inherits", "inheritance", "inherit from", "inherits from"],
  part_of: ["part of", "belongs to", "belong to", "belongs", "member of", "faz parte de", "pertence a", "pertence"],
};

/** Lowercase, treat `_ - /` as spaces, collapse whitespace. */
export function normalizePredicate(raw: string): string {
  return String(raw ?? "").trim().toLowerCase().replace(/[_\-/]+/g, " ").replace(/\s+/g, " ").trim();
}

const ALIAS_INDEX: Map<string, CanonicalPredicate> = (() => {
  const m = new Map<string, CanonicalPredicate>();
  for (const canonical of CANONICAL_PREDICATES) {
    m.set(normalizePredicate(canonical.replace(/_/g, " ")), canonical);
    for (const alias of RAW_ALIASES[canonical]) m.set(normalizePredicate(alias), canonical);
  }
  return m;
})();

/**
 * Resolve any raw relation string to its canonical predicate.
 * Unknown relations pass through as lower_snake_case.
 */
export function canonicalPredicate(raw: string): string {
  const norm = normalizePredicate(raw);
  const hit = ALIAS_INDEX.get(norm);
  return hit ?? norm.replace(/\s+/g, "_");
}

/** True when `raw` resolves to a canonical predicate (not an unknown pass-through). */
export function isKnownPredicate(raw: string): boolean {
  return ALIAS_INDEX.has(normalizePredicate(raw));
}

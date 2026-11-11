/**
 * Deterministic extraction pipeline checks (Phase 1 + Phase 2).
 * Run: bun test_graph_extraction.ts
 */
import { DeterministicExtractionAdapter } from "./src/adapters/outbound/extraction/deterministic.extraction.ts";
import { canonicalPredicate, isKnownPredicate } from "./src/domain/services/predicate-vocab.ts";

const adapter = new DeterministicExtractionAdapter();
const input = (text: string, path = "/proj/docs/Note.md") => ({
  kind: "note" as const, path, text, hash: "hash_" + Math.abs([...text].reduce((a, c) => a + c.charCodeAt(0), 0)),
});

let failures = 0;
const check = (label: string, ok: boolean) => { console.log(`${ok ? "✓" : "✗"} ${label}`); if (!ok) failures++; };
const factsOf = (text: string) => adapter.extract(input(text)).facts.map((f) => `${f.subject}|${f.predicate}|${f.object}|${f.method}|${f.confidence}`);

// --- predicate vocabulary ---
check("alias: depends on → depends_on", canonicalPredicate("Depends on") === "depends_on");
check("alias: utilizes → uses", canonicalPredicate("utilizes") === "uses");
check("alias: try → passthrough lower_snake", canonicalPredicate("Some Thing") === "some_thing");
check("isKnownPredicate(Dependencies)", isKnownPredicate("Dependencies"));
check("isKnownPredicate(Notes) is false", !isKnownPredicate("Notes"));

// --- legacy rule ---
console.log(JSON.stringify(factsOf("- [alpha] depends_on [beta]"), null, 0));
check("legacy rule extracted", factsOf("- [alpha] depends_on [beta]").length === 1);

// --- frontmatter ---
const fm = factsOf(`---\ntitle: Example\nuses: [React, Bun]\nrequires:\n  - LanceDB\n  - Graphology\ntags: [ignored]\n---\nbody`);
console.log("frontmatter facts:", fm);
check("frontmatter flow list", fm.some((f) => f.startsWith("Note|uses|React|frontmatter")) && fm.some((f) => f.startsWith("Note|uses|Bun|frontmatter")));
check("frontmatter block list", fm.some((f) => f.startsWith("Note|depends_on|LanceDB|frontmatter")) && fm.some((f) => f.startsWith("Note|depends_on|Graphology|frontmatter")));
check("frontmatter ignores unknown keys", !fm.some((f) => f.includes("|ignored|")));

// --- headings + bullets ---
const hb = factsOf("## Dependencies\n- graphology\n- **LanceDB**\n\n## Usage\n- cli tools");
check("heading bullets → depends_on/uses", hb.some((f) => f.startsWith("Note|depends_on|graphology|heading")) && hb.some((f) => f.startsWith("Note|depends_on|LanceDB|heading")) && hb.some((f) => f.startsWith("Note|uses|cli tools|heading")));

// --- wikilinks + local md links ---
const ln = factsOf("See [[System Design]] and [[API|the API]]. Also [setup](./setup.md) and [ext](https://x.y).");
console.log("link facts:", ln);
check("wikilinks (incl. alias target)", ln.some((f) => f.includes("|references|System Design|link|0.8")) && ln.some((f) => f.includes("|references|API|link|0.8")));
check("local md link", ln.some((f) => f.includes("|references|setup|link|0.75")));
const enc = factsOf("[doc](./2.%20Decis%C3%B5es.md)");
check("percent-encoded link decoded", enc.some((f) => f.includes("|references|2. Decisões|link|")));
check("external link ignored", !ln.some((f) => f.includes("|references|x.y|")));

// --- tables ---
const tb = factsOf("| Doc | Uses | Depends_on |\n|-----|------|------------|\n| Core | React | Bun |\n| Web | Vite | Bun |");
console.log("table facts:", tb);
check("predicate-header table", tb.some((f) => f.startsWith("Core|uses|React|table|0.8")) && tb.some((f) => f.startsWith("Web|depends_on|Bun|table|0.8")));
const triple = factsOf("| Entity | Relation | Target |\n|--------|----------|--------|\n| Core | uses | React |");
check("triple-header table", triple.some((f) => f.startsWith("Core|uses|React|table|0.8")));

// --- code fences are ignored ---
check("fenced code yields no facts", factsOf("```\n- [a] uses [b]\n## Dependencies\n- graphology\n```").length === 0);

// --- diagnostics shape ---
const res = adapter.extract(input("hello"));
check("diagnostics present", !!res.diagnostics && typeof res.diagnostics.extracted === "number");

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);

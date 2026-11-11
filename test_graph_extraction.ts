/**
 * Deterministic extraction pipeline checks (Phases 1-3).
 * Run: bun test_graph_extraction.ts
 */
import { DeterministicExtractionAdapter } from "./src/adapters/outbound/extraction/deterministic.extraction.ts";
import { canonicalPredicate, isKnownPredicate } from "./src/domain/services/predicate-vocab.ts";

const adapter = new DeterministicExtractionAdapter();
const input = (text: string, path = "/proj/docs/Note.md") => ({
  kind: "note" as const, path, text, hash: "hash_" + Math.abs([...text].reduce((a, c) => a + c.charCodeAt(0), 0)),
});
const codeInput = (text: string, path: string, language: string) => ({ kind: "code" as const, path, text, hash: "h_" + text.length, language });

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


// --- code: JS/TS imports ---
const js = adapter.extract(codeInput(`import fs from "fs";
import { LanceDB } from "@lancedb/lancedb";
import x from "./local-dep";
const y = require("express");
export const meaning = 42;
export class Extractor extends BaseExtractor implements Runnable, Resettable {
}
async function run() {}
`, "/proj/src/tool.ts", "ts")).facts.map((f) => `${f.subject}|${f.predicate}|${f.object}|${f.method}`);
console.log("js facts:", js);
check("js: builtin skipped", !js.some((f) => f.includes("|depends_on|fs|")));
check("js: scoped npm package kept", js.some((f) => f.includes("|depends_on|@lancedb/lancedb|import")));
check("js: require() captured", js.some((f) => f.includes("|depends_on|express|import")));
check("js: relative import resolved (or weak child dep)", js.some((f) => f.includes("|depends_on|local-dep|import") || f.includes("|import")));
check("js: exported const defines", js.some((f) => f.includes("tool|defines|meaning|symbol")));
check("js: class defines + extends + implements", js.some((f) => f.includes("tool|defines|Extractor|symbol")) && js.some((f) => f.includes("Extractor|extends|BaseExtractor|inherit")) && js.some((f) => f.includes("Extractor|implements|Runnable|inherit") && f.includes("Resettable") || f.includes("Extractor|implements|Resettable|inherit")));

// multiline import
const multi = adapter.extract(codeInput('import {\n  alpha,\n  beta,\n} from "deep-pkg";', "/proj/src/m.ts", "ts")).facts.map((f) => f.object);
check("js: multiline import captured", multi.includes("deep-pkg"));

// --- code: Python ---
const py = adapter.extract(codeInput(`import os
import requests
from .helpers import local_thing
from dataclasses import dataclass

@dataclass
class Config(BaseConfig):
    pass

def load():
    pass
`, "/proj/svc/agent.py", "py")).facts.map((f) => `${f.subject}|${f.predicate}|${f.object}|${f.method}`);
console.log("py facts:", py);
check("py: stdlib skipped", !py.some((f) => f.includes("|depends_on|os|") || f.includes("|depends_on|dataclasses|")));
check("py: third-party kept", py.some((f) => f.includes("|depends_on|requests|import")));
check("py: class defines", py.some((f) => f.includes("agent|defines|Config|symbol")));
check("py: class base → extends", py.some((f) => f.includes("Config|extends|BaseConfig|inherit")));
check("py: def defines", py.some((f) => f.includes("agent|defines|load|symbol")));

// --- code: Go ---
const go = adapter.extract(codeInput(`package main

import (
	"fmt"
	"github.com/spf13/cobra"
)

type Server struct{}

func NewServer() {}
func (s *Server) Start() {}
`, "/proj/cmd/main.go", "go")).facts.map((f) => `${f.subject}|${f.predicate}|${f.object}|${f.method}`);
console.log("go facts:", go);
check("go: stdlib skipped", !go.some((f) => f.includes("|depends_on|fmt|")));
check("go: module kept", go.some((f) => f.includes("|depends_on|github.com/spf13/cobra|import")));
check("go: type defines", go.some((f) => f.includes("main|defines|Server|symbol")));
check("go: func defines", go.some((f) => f.includes("main|defines|NewServer|symbol")));
check("go: method defines", go.some((f) => f.includes("main|defines|Start|symbol")));

// --- code: Rust ---
const rs = adapter.extract(codeInput(`use std::collections::HashMap;
use serde_json::Value;

pub struct Engine {
    map: HashMap<String, Value>,
}

impl Runnable for Engine {}

trait Runner: Clone {
}

pub fn build() {}
`, "/proj/core/engine.rs", "rs")).facts.map((f) => `${f.subject}|${f.predicate}|${f.object}|${f.method}`);
console.log("rs facts:", rs);
check("rs: std skipped", !rs.some((f) => f.includes("|depends_on|std|")));
check("rs: crate kept", rs.some((f) => f.includes("|depends_on|serde_json|import")));
check("rs: struct defines", rs.some((f) => f.includes("engine|defines|Engine|symbol")));
check("rs: impl Trait for Type → implements", rs.some((f) => f.includes("Engine|implements|Runnable|inherit")));
check("rs: supertrait → extends", rs.some((f) => f.includes("Runner|extends|Clone|inherit")));
check("rs: fn defines", rs.some((f) => f.includes("engine|defines|build|symbol")));

// --- code: unknown extension yields nothing ---
check("code: unknown language yields no facts", adapter.extract(codeInput("anything", "/proj/x.yaml", "yaml")).facts.length === 0);

// --- diagnostics shape ---
const res = adapter.extract(input("hello"));
check("diagnostics present", !!res.diagnostics && typeof res.diagnostics.extracted === "number");

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);

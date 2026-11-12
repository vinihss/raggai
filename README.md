# raggai — Local Hybrid RAG (Vector + Graph) for AI Agents

`raggai` is a local-first hybrid memory system for coding agents (OpenCode, APIs, frameworks). It combines **vector search** (LanceDB + local embeddings) with a **knowledge graph** (Graphology/JSON) and supports **multi-domain** storage, project-level context/overlay, a CLI, and a web UI.

## Highlights

- **Hybrid retrieval**: semantic vector search + graph connections/keywords.
- **Multi-domain architecture**: isolated stores per domain with overlay search across domains (e.g. project + global), writing to the active domain.
- **Global + project config (TOML)**:
  - Global: `~/.config/raggai/` (`config.toml`, `domains.toml`, `domains/<name>/{vector_store,graph_store.json}`, `cache/embeddings`, `versions/`)
  - Project: `.raggai/config.toml` (`domain`, `include` overlay, exclusions, `embeddingCache`)
- **CLI (`raggai`)**: domain management, OpenCode install/init, search/import/export, diagnostics.
- **OpenCode integration**: plugin (`dist/index.js`) + skill (`rag-memory.md`) with hybrid memory tools.
- **Web UI + API**: domain-aware dashboard, search, records browser, graph view/audit/export, snapshots (`web-server.ts` + `src/web`).

## Architecture

```text
[Agent / CLI / Web UI]
        │
        ▼
[Orchestrator & Ports/Adapters]
        │
  ┌─────┴─────┐
  ▼           ▼
[Vector]    [Graph]
LanceDB     Graphology/JSON
(per domain, overlay on reads)
```

- **Embeddings**: local Transformers.js model (`Xenova/all-MiniLM-L6-v2`, ONNX/CPU) with persistent embedding cache and batching support.
- **Hexagonal structure** (`src/`): `domain/`, `ports/`, `adapters/`, `config/`.

## Quick setup

Requires **Bun**.

```bash
bun install.ts
bun test_graph_extraction.ts
```

- `bun install.ts`: prepares data/build artifacts and builds plugin assets.
- `bun build ./src/index.ts --outdir ./dist --target node`: rebuild plugin after `src/` changes.

## CLI

The CLI entrypoint is `bin/raggai` (also `bun src/cli/index.ts ...` in development).

Common commands:

```bash
raggai doctor
raggai domain list|create|use|delete <name>
raggai opencode install
raggai init opencode [--domain <name>]
raggai search "<query>" [--domain <name>] [--domains a,b] [--limit N] [--json]
raggai import <path> [--domain <name>] [--mode notes|code|auto] [--force]
raggai export <name|all> [--format json|md|graph-html|audit|bundle] [--out <path>]
```

Notes:
- `import` supports incremental indexing (hash manifest), configurable exclusions/sensitive-file filtering, batched embeddings, and orphan pruning (best-effort vector cleanup).
- `search` can run over an overlay of domains and reports timing/cache stats.

## Use cases — this repository indexed as the `raggai` domain

Everything below was executed against the real stores of this repository (`domain = "raggai"` from `.raggai/config.toml`, overlay `["raggai", "global"]`). The numbers are live outputs, not hypotheticals.

### 1. Index the project docs and code

```bash
$ ./bin/raggai import . --mode notes --force
Import (notes): 9 files, 9 updated, 0 unchanged, 0 orphans removed, 110 chunks, facts=8 created=2 merged=6 rejected=0 pruned=2 [domain raggai] in 6638ms, cache hits=105 misses=5 (scan 3ms, embed 542ms, write 729ms, prune 0ms)

$ ./bin/raggai import . --mode code --force
Import (code): 80 files, 80 updated, 0 unchanged, 0 orphans removed, 436 chunks, facts=429 created=5 merged=424 rejected=0 pruned=3 [domain raggai] in 44623ms, cache hits=432 misses=4 (scan 2ms, embed 621ms, write 2871ms, prune 0ms)
```

- Markdown (9 files) is ingested by the notes pipeline — chunked with 25-word overlap, stored as `type=note`, and fed to the deterministic extractor (links, frontmatter, tables, legacy lines).
- Source files (80 files: ts/tsx/py/go/rs/json/yaml/css/toml/sql/sh/…) are ingested by the code pipeline — chunked by file structure, stored as `type=code`, extracted for imports/defines/extends/implements. Markdown is **not** double-indexed by the code pipeline.
- Incremental re-imports skip unchanged files instantly; `--force` re-extracts unchanged files (used after extractor upgrades):

```bash
$ ./bin/raggai import . --mode code
Import (code): 80 files, 0 updated, 80 unchanged, 0 orphans removed, 0 chunks, facts=0 created=0 merged=0 rejected=0 pruned=0 [domain raggai] in 224ms, cache hits=0 misses=0
```

Resulting state (checked via API): `vectorCount: 547` (436 `type=code` + 110 `type=note` + 1 `type=system`), graph `nodes: 371, edges: 430`, zero exact `(type,path,text)` duplicates.

### 2. Ask the memory — hybrid (vector + graph) search

```bash
$ ./bin/raggai search "graph extraction pipeline" --domains raggai,global --limit 6
Results for: "graph extraction pipeline" (domains: raggai, global, 522ms, cache hits=0 misses=1)
- [68.0%] (raggai) .../src/ports/outbound/graph-extraction.port.ts
- [62.1%] (raggai) .../README.md
- [61.2%] (raggai) .../README.md
- [60.3%] (raggai) .../src/domain/models/graph-fact.ts
- [57.8%] (raggai) .../src/domain/services/graph-ingest.ts
- [57.4%] (raggai) .../AGENTS.md
Graph:
  [raggai] Structured fact: [graph] -> (depends_on) -> [graph-analytics]
  [raggai] Structured fact: [graph] -> (defines) -> [getFlag]
```

Natural-language questions land on docs and code together (the vector hit is a `[Note: …]`/`[File: …]` chunk; the graph section shows structured facts from the same domains):

```bash
$ ./bin/raggai search "stale vectors LanceDB" --domains raggai --limit 2
Results for: "stale vectors LanceDB" (domains: raggai, 400ms, cache hits=0 misses=1)
- [56.0%] (raggai) .../AGENTS.md   # points to pending item #3 — physical LanceDB vector cleanup still open
- [43.2%] (raggai) .../README.md
```

`--json` exposes the full payload (`vector` hits with scores/domain/path, `graph` facts, `timingMs`, `cache`) for tooling:

```json
{ "query": "graph extraction", "domains": ["raggai", "global"],
  "vector": [ { "score": 0.59, "relevance": "59.2%", "path": ".../README.md", "type": "note", "domain": "raggai" } ],
  "graph": ["[raggai] Structured fact: [graph] -> (depends_on) -> [graph-analytics]"],
  "timingMs": 131 }
```

### 3. Inspect the knowledge graph

```bash
$ ./bin/raggai graph raggai
{
  "domain": "raggai",
  "stats": {
    "nodes": 371, "edges": 430, "orphans": 0,
    "byMethod":   { "symbol": 307, "import": 108, "inherit": 8, "link": 6, "rule": 1 },
    "byPredicate":{ "defines": 307, "depends_on": 108, "implements": 7, "references": 6, "extends": 1, "rel": 1 },
    "mostConnected": [ { "node": "raggai-paths", "degree": 38 } ]
  }
}
```

### 4. Export — markdown report, JSON, interactive HTML, full bundle

```bash
$ ./bin/raggai export raggai --format md --out /tmp/export-raggai.md
Exported md: /tmp/export-raggai.md
# Domain export: raggai
## Report
Orphan nodes removed: 0. Active: 371. Edges: 430 (provenance-tracked: 430, occurrences: 432; by method: symbol=309, import=108, inherit=8, link=6, rule=1).
## Tree
[raggai-paths]
├── ──(depends_on)──> [smol-toml]
├── ──(defines)──> [DomainType] …

$ ./bin/raggai export raggai --format json --out /tmp/export-raggai.json
Exported JSON: /tmp/export-raggai.json     # { options, attributes, nodes, edges } graph_store.json as-is

$ ./bin/raggai export raggai --format graph-html --out /tmp/export-raggai.html
Exported graph HTML: /tmp/export-raggai.html   # self-contained interactive map (vis)
```

`bundle` writes all of it (graph JSON + audit + HTML + manifest) into a directory; `audit` writes only the audit report. (Method counts differ slightly between the two by design: `raggai graph` reports distinct facts — 307 `symbol` — while the audit counts provenance occurrences, i.e. merged evidence entries — 309 `symbol`, 432 total.)

### 5. Web UI & API probes (localhost:3000/5173)

```bash
$ curl -s 'http://localhost:3000/api/status?domain=raggai'
{"activeLayer":"raggai","overlay":["raggai","global"],"project":{"dir":"/home/vinicius/raggai","domain":"raggai"},"vectorCount":547,"graph":{"nodes":371,"edges":430},…}

$ curl -s 'http://localhost:3000/api/records?domain=raggai&type=code&q=LanceDB&limit=2'   # server-side filters
{"records":[ …2 records… ],"total":10,"filter":{"type":"code","q":"LanceDB"},…}
```

Web UI highlights: **Dashboard** (per-domain counts + overlay totals), **Records** (`type`/text filters, `Page X of Y` pagination), **Graph** (vis-network render — click any relation or node to open the details panel: relation/confidence/provenance with source paths and evidence, or node degree/in-out/neighbors with all edges passing through it; Audit + export available from the same tab), **Search** (overlay toggle, domains searched), **Context strip** (overlay pills + project pill), **Snapshots** (inline two-step rollback confirm). Note: the Graph tab loads vis-network from the unpkg CDN at runtime (requires network access); the rest of the UI works offline.

## OpenCode integration

```bash
raggai opencode install
raggai init opencode --domain <project-domain>
```

- `opencode install`: registers the plugin/skill globally for OpenCode.
- `init opencode`: configures the current project (`.raggai/config.toml`, `opencode.json`) and links to the installed plugin/skill (global or local fallback).

## Plugin tools

Exported from `dist/index.js` (domain/context aware):

| Tool | Purpose |
|---|---|
| `consult_memory_personal` | Hybrid search (vector + graph) across overlay domains |
| `memorize_personal_fact` | Store text and optional structured fact in active domain |
| `import_markdown_notes` | Import `.md` notes with chunk overlap and graph extraction |
| `index_local_codebase` | Incremental codebase indexing into active domain |
| `search_semantic_codebase` | Semantic code search across overlay domains |
| `audit_and_visualize_graph` | Audit graph and produce structured report/tree |
| `export_visual_graph_map` | Export interactive HTML graph map |
| `reset_local_memory` | Clear active domain indexes (requires `confirm: true`) |

## Web UI & API

```bash
bun ./web-server.ts                 # API on http://localhost:3000
cd src/web && bun run dev --host 0.0.0.0 --port 5173
```

Main API endpoints:
- `/api/status`, `/api/domains`, `/api/records`, `/api/search`, `/api/graph`, `/api/graph/audit`, `/api/graph/export`, `/api/snapshots`, `/api/snapshot`, `/api/rollback`

## Current status (multi-domain / CLI / Web UI)

- **Global storage**: `~/.config/raggai/` with `config.toml`, `domains.toml`, per-domain stores, embedding cache, and global versions/snapshots.
- **Project config**: `.raggai/config.toml` (`domain`, `include`/overlay, exclusions) and OpenCode integration via `opencode.json`/plugin+skill.
- **CLI `raggai`**: `doctor`, domain management, OpenCode install/init, search/import/export, context/overlay resolution, incremental hash manifests, configurable exclusions, and timing/cache metrics.
- **Core/Plugin**: per-domain ports/adapters, vector+graph overlay search, writes to active domain, persistent embedding cache with batching, and best-effort stale/orphan vector cleanup.
- **Web UI + API**: dashboard, search, records, graph, and snapshots with domain selection, real counts (vector/graph), overlay totals, overlay/context indicators, action feedback notices, and filtered/paginated records (server-side `type`/text filters with truthful totals).
- **Graph extraction pipeline (Phases 1–4)**: enriched fact model (`confidence`, `method`, `sourcePath`, `sourceHash`, `evidence`) persisted as edge provenance; `GraphStorePort` gained `upsertFacts` (merge/dedupe by subject × predicate × object, cross-source evidence accumulation) and `removeFactsBySource` (prune stale facts on reindex/delete, orphan-node cleanup); extraction runs through `GraphExtractionPort` with deterministic markdown rules — legacy line parity, plus frontmatter keys, bullets under predicate headings, wikilinks/local markdown links (`<doc> references <Target>`), and simple tables; predicates are normalized onto a canonical vocabulary with an alias map. Import output and plugin tools report fact metrics (`facts/created/merged/rejected/pruned`). `raggai import --force` re-extracts unchanged files. Code extraction (Phase 3: ES/Python/Go/Rust imports, symbol definitions, extends/implements — e.g. `XenovaAdapter implements EmbeddingPort`) is implemented behind the same port; graph analytics (`raggai graph <name>`, Phase 4) expose nodes/edges, facts by method/predicate/confidence, orphans, most-connected nodes, and a confidence histogram as JSON. Model-assisted enrichment will be strictly opt-in (Phase 5).

## Pending items (roadmap)

1. ~~**Complete embedding cache/batching in indexing**~~ — **done**: all ingestion flows share `embedAndSaveChunks` (batch 16, cache-aware `generateMany` with per-text fallback, `timing_ms`/`embedding_cache` reporting in CLI/plugin).
2. **End-to-end validation/security and exclusions**
   - Honor `excludeDirs/excludePatterns` from TOML in all commands, web endpoints, and tools; harden path/domain/output validation across the entire surface and expose clear defaults/diagnostics. (Fresh global+project install was revalidated manually — `doctor`/`search`/API/UI OK — but automated coverage is missing.)
3. **Incremental, orphans, and vector performance**
   - Make physical cleanup of stale/orphan **vectors** in LanceDB robust (beyond best-effort/API-dependent behavior) and reindexing safe. Graph-side stale-fact pruning by source is done since Phase 1 (`removeFactsBySource`); vector-side deletion and per-stage metrics are the remaining work.
4. ~~**Multi-domain UI/API management**~~ — **done**: server-side `type`/`text` filters on `/api/records` with truthful totals; header Context strip (overlay pills + project pill); Dashboard overlay totals; inline action feedback (Notice) replacing native alerts/confirms; `Page X of Y` pagination with real totals; `project` context in `/api/status`.
5. **Multi-domain snapshots/versioning**
   - Evolve to domain-scoped snapshot/restore for the new model (`~/.config/raggai/domains/*`) with safe confirmations, selectable scope, and consistent CLI/UI/API integration.
6. **Fully autonomous global distribution**
   - Ensure `raggai` is on PATH in global installs (`bun link`/install) and runs autonomously outside the repo (assets, native deps, `dist/src`), validating `raggai opencode install|init` in a clean environment/project.
7. **E2E and OpenCode integration**
   - Full external end-to-end tests: `init` → `import` → `search` → plugin/OpenCode and UI, covering global vs local, project context, overlay, and write isolation.
8. **Graph extraction pipeline — remaining phases**
   - (Phases 1–4 done — see "Graph extraction pipeline" in AGENTS.md: enriched facts with provenance/confidence, idempotent upsert/prune, import-time metrics; deterministic markdown rules: legacy lines, frontmatter, predicate headings, wikilinks/local links, tables; code rules: imports/defines/extends/implements for TS/JS, Python, Go, Rust; canonical predicate vocabulary with alias map; Phase 4 = graph analytics via `raggai graph <name>` + `/api/graph` (facts by method/predicate/confidence, orphans, degree ranking, confidence histogram).)
   - Phase 5: opt-in model-assisted extraction (`rules` default; `hybrid`/`llm` behind config), schema-validated output, thresholds, budget/timeout limits.
   - Phase 6: optional AST/tree-sitter adapters behind `GraphExtractionPort`; `minConfidence` configurable via TOML (`graph.extraction.*`) instead of env.

## License

Open-source project focused on data privacy, local infrastructure optimization, and advanced AI agent engineering.

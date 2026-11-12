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
bun test_rag.ts
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

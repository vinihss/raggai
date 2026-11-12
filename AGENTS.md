# raggai — Hybrid Local RAG for Agents (OpenCode)

Repo: Bun + TypeScript. Plugin entry `dist/index.js` (built from `src/index.ts`).

## Setup & rebuild
- `bun install.ts` — Creates `data/`, runs `bun install`, builds `dist/` + `.node`
- `bun build ./src/index.ts --outdir ./dist --target node` — Required after any `src/` change
- **Never edit `dist/index.js` directly**; always rebuild from `src/`

## OpenCode plugin registration
- `bun install-opencode.ts` — Registers plugin + skill (no `system.prompt` copy)
  - Copies `rag-memory.md` → `~/.opencode/skills/rag-memory.md`
  - Creates `~/.opencode/plugin/raggai.json` pointing to `dist/index.js`

## Validation & maintenance
- `bun test_rag.ts` — Validates embeddings + LanceDB (proven: ~19% confidence search)
- `bun reset_indexes.ts` — Clears `data/vector_store/`, `data/test_store/`, `data/graph_store.json`

## Data directories
- `data/vector_store/` — LanceDB embeddings persistence
- `data/graph_store.json` — Graph of logical connections (JSON, Graphology adapter)
- `auditoria_grafo.md` — Generated audit report

## Architecture: Hexagonal (Ports/Adapters) in `src/`
- `domain/` — core services (HybridOrchestrator, text-splitter)
- `ports/` — inbound/outbound contracts (RagOperationsPort, VectorStorePort, GraphStorePort, EmbeddingPort)
- `adapters/` — tech-specific implementations (LanceDB, Xenova/Transformers, Graphology/JSON, plugin-handlers, Express)
- `config/container.ts` — Manual DI (Vanilla, no container); **never couple to LanceDB/Graphology directly**; go through ports

## Plugin tools (exported from `dist/index.js`)
- `consult_memory_personal` — Hybrid search: vector (LanceDB) + graph (keywords)
- `memorize_personal_fact` — Stores structured fact + text in vector
- `import_markdown_notes` — .md ingestion with 25-word overlap + auto graph extraction
- `index_local_codebase` — Indexes source code (TS, JS, PY, GO, RS, JSON/YAML/CSS)
- `search_semantic_codebase` — Pre-LLM filter: semantic code search via cosine
- `audit_and_visualize_graph` — Cleans orphan nodes + structured tree report
- `export_visual_graph_map` — Exports interactive 2D HTML map (groups by color)
- `reset_local_memory` — Deletes all indexes (Vector + Graph); requires `confirm: true`

## Execution flow
- Agent invokes `/rag-memory` → plugin calls tool exports → container uses DI to wire adapters → orchestrator merges vector + graph results
- REST API: `web-server.ts` → `http://localhost:3000` (`/api/status`, `/api/domains`, `/api/records`, `/api/graph`, `/api/search`, `/api/snapshots`, ...); UI in `src/web` (`:5173`).
- CLI `raggai` (`bin/raggai`, `src/cli/`): domain management, OpenCode init/install, import/search/export with context/overlay.

## Data & config (multi-domain)
- Global: `~/.config/raggai/` (`config.toml`, `domains.toml`, `domains/<name>/{vector_store,graph_store.json}`, `cache/embeddings`, `versions/`).
- Project: `.raggai/config.toml` (`domain`, `include` overlay, exclusions) and `opencode.json`/plugin+skill as configured.

## Graph extraction pipeline (in progress)

Phases 1–3 (foundation, markdown rules, code rules) are implemented in `src/`:
- **Model**: `src/domain/models/graph-fact.ts` (`EnrichedFact`, `FactProvenance`, extraction/upsert/remove contracts).
- **Ports**: `src/ports/outbound/graph-store.port.ts` (`upsertFacts`, `removeFactsBySource`), `src/ports/outbound/graph-extraction.port.ts`.
- **Extraction** (`src/adapters/outbound/extraction/deterministic.extraction.ts`):
  - `rule` (0.9): legacy `- [A] rel [B]` line parity.
  - `frontmatter` (0.85): YAML frontmatter keys mapping to the canonical vocabulary (flow and block lists), e.g. `uses: [React, Bun]`.
  - `heading` (0.75): bullets under a predicate heading (e.g. `## Dependencies`) become facts (`<doc> <pred> <bullet>`).
  - `link`: Obsidian wikilinks `[[Target]]` / `[[Target|Alias]]` (0.8) and local markdown links (0.75) become `<doc> references <Target>`; percent-decoded.
  - `table` (0.8): predicate-header tables and entity/relation/target triple tables.
  - Code fences (` ``` `) are ignored; code files use `./code.extraction.ts` (Phase 3).
  - `code.extraction.ts` (Phase 3): `import` (0.8, weak relative 0.6) — ES/CommonJS/multiline imports for TS/JS (relative specifiers resolved to file doc-entities), Python `import`/`from … import` (stdlib skipped), Go `import` (single-segment stdlib skipped), Rust `use`/`extern crate` (`std|core|alloc|crate|self|super` skipped); `defines` (0.8) — TS/JS exported classes/interfaces/types/enums/functions + exported consts, Python `def`/`class`, Go `func` (incl. methods) and `type`, Rust `fn`/`struct|enum|trait|mod`; `inherit` (0.85) — TS `extends`/`implements` (generics stripped), Python class bases (`object|ABC|Generic|Protocol` skipped, `[...]`/kwargs stripped), Rust `impl Trait for Type` → `Type implements Trait`, trait supertraits → `extends`. Node builtins / Go std prefixes skipped; subject is the file doc-entity (e.g. `xenova.adapter`), inherit edges use the symbol as subject (e.g. `XenovaAdapter`).
  - Predicate normalization + alias map (`src/domain/services/predicate-vocab.ts`): canonical set `uses, depends_on, contains, defines, references, implements, calls, extends, part_of`; unknown predicates pass through as lower_snake_case.
- **Ingest**: `src/domain/services/graph-ingest.ts` (prune-stale by `sourceHash` → extract → confidence filter → upsert; aggregate CLI/plugin metrics).
- **Store**: `src/adapters/outbound/graphology/json-graph.adapter.ts` persists provenance/confidence/occurrences on edges (backward-compatible with legacy edges; first-open persists the empty graph file). Entity typo-merge requires a matching first character (avoids merging distinct entities like `delta` → `beta`).
- Import flows (`raggai import` and plugin `import_markdown_notes`/`index_local_codebase`) are idempotent w.r.t. graph facts; deleted sources prune their facts and orphan nodes. `raggai import --force` re-extracts unchanged files (needed after extractor upgrades).
- `bun test_graph_extraction.ts` — extraction regression checks (run after touching the extractor/vocab).

### Phase 4 — UI/CLI graph analytics (implemented)

- **Service**: `src/domain/services/graph-analytics.ts`
  - `GraphStats` / `GraphAnalysis` — raw snapshot-based analytics: nodes, edges, facts by method (with avg confidence), facts by predicate, orphan nodes, most-connected nodes (degree + in/out degree), confidence distribution histogram (>=0.9 / 0.7–0.9 / 0.5–0.7 / <0.5).
  - `readGraph` helper + `searchGraphByMethod` / `filterGraph` (predicate / method / minConfidence filtered `FactEdge` view).
- **Port**: `GraphStorePort.getRaw(): GraphRawSnapshot` — exposes the raw multi-graph export for analytics consumers.
- **CLI**: `raggai graph <name> [--domain <name>]` — prints the full analysis as JSON (`analyzeGraph`); warns when orphan nodes are found.
- **UI**: `GraphPage` exposes `/api/graph` (nodes/edges) and `/api/graph/audit` (audit report + tree) — unchanged; verified live: 203 nodes / 245 edges for the `raggai` domain.
- **Web API**: `web-server.ts` — `/api/graph` maps raw snapshot to `{id, from, to, …attrs}` for vis.js and `/api/graph/audit` delegates to `auditAndExportTree()`.

Roadmap: Phase 5 = opt-in model-assisted extraction (validated JSON, thresholds) · Phase 6 = optional AST adapters behind `GraphExtractionPort`.

## Pending items (documented)
1. **Complete embedding cache/batching in indexing**: apply `generateMany`/batching and cache metrics consistently across all ingestion flows (CLI/plugin/API).
2. **End-to-end validation/security and exclusions**: honor `excludeDirs/excludePatterns` and validate paths/domains/outputs across the entire surface (CLI, web, tools). Fresh global+project install was revalidated manually (`doctor`/`search`/API/UI OK), but automated coverage is missing.
3. **Incremental/orphans/vector performance**: make physical cleanup of stale/orphan **vectors** in LanceDB robust (beyond best-effort) and safe reindexing. Graph-side stale-fact pruning by source is done (`removeFactsBySource` since Phase 1); vector-side deletion and per-stage metrics are the remaining work.
4. **Multi-domain UI/API management**: complete UX/operations (filters, action feedback, overlay/context indicators, robust totals/pagination in all scenarios).
5. **Multi-domain snapshots/versioning**: domain-scoped snapshot/restore with scope/confirmations and consistent CLI/UI/API integration.
6. **Fully autonomous global distribution**: `raggai` on PATH in global installs and fully autonomous execution outside the repo (assets/native deps), with `opencode install|init` validated in a clean environment.
7. **E2E and OpenCode integration**: full external tests (`init` → `import` → `search` → plugin/OpenCode/UI) covering global vs local, project context, overlay, and write isolation.
8. **Graph extraction pipeline — remaining phases** (Phases 1–4 done, see section above):
   - Phase 5: opt-in model-assisted extraction (`rules` default; `hybrid`/`llm` behind config), schema-validated JSON output, thresholds, selective scope, budget/timeout limits.
   - Phase 6: optional AST/tree-sitter adapters behind `GraphExtractionPort` for prioritized languages; move `minConfidence` from env into TOML (`graph.extraction.*`);
     note: pure markdown yields mostly `references` facts (e.g. Knowledges doc graph); code extraction (Phase 3) populates the `raggai` domain with dependency/definition/implements edges (240 facts on `./src`).
     Also: `JsonGraphAdapter` now uses a graphology **multi** graph (distinct relations between the same collapsed node pair coexist), fuzzy entity typo-merge only applies to plain word-like names (structured module/symbol names are exact-match), and the code import path logs per-file failures instead of swallowing them.
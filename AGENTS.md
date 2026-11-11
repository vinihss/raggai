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

Phase 1 (foundation) is implemented in `src/`:
- **Model**: `src/domain/models/graph-fact.ts` (`EnrichedFact`, `FactProvenance`, extraction/upsert/remove contracts).
- **Ports**: `src/ports/outbound/graph-store.port.ts` (`upsertFacts`, `removeFactsBySource`), `src/ports/outbound/graph-extraction.port.ts`.
- **Extraction**: `src/adapters/outbound/extraction/deterministic.extraction.ts` (markdown legacy line rule, method `rule`, confidence 0.9; code kind is an intentional no-op stub until Phase 3).
- **Ingest**: `src/domain/services/graph-ingest.ts` (prune-stale by `sourceHash` → extract → confidence filter → upsert; aggregate CLI/plugin metrics).
- **Store**: `src/adapters/outbound/graphology/json-graph.adapter.ts` persists provenance/confidence/occurrences on edges (backward-compatible with legacy edges, which stay source-untracked). Entity typo-merge now requires a matching first character (avoids merging distinct entities like `delta` → `beta`).
- Import flows (`raggai import` and plugin `import_markdown_notes`/`index_local_codebase`) are idempotent w.r.t. graph facts; deleted sources prune their facts and orphan nodes.

Roadmap: Phase 2 = markdown rules (frontmatter/headings/links/tables) · Phase 3 = code extraction (imports/symbols) · Phase 4 = UI/CLI graph analytics · Phase 5 = opt-in model-assisted extraction (validated JSON, thresholds) · Phase 6 = optional AST adapters behind `GraphExtractionPort`.

## Pending items (documented)
1. **Complete embedding cache/batching in indexing**: apply `generateMany`/batching and cache metrics consistently across all ingestion flows (CLI/plugin/API).
2. **End-to-end validation/security and exclusions**: honor `excludeDirs/excludePatterns` and validate paths/domains/outputs across the entire surface (CLI, web, tools). Fresh global+project install was revalidated manually (`doctor`/`search`/API/UI OK), but automated coverage is missing.
3. **Incremental/orphans/vector performance**: make physical cleanup of stale/orphan **vectors** in LanceDB robust (beyond best-effort) and safe reindexing. Graph-side stale-fact pruning by source is done (`removeFactsBySource` since Phase 1); vector-side deletion and per-stage metrics are the remaining work.
4. **Multi-domain UI/API management**: complete UX/operations (filters, action feedback, overlay/context indicators, robust totals/pagination in all scenarios).
5. **Multi-domain snapshots/versioning**: domain-scoped snapshot/restore with scope/confirmations and consistent CLI/UI/API integration.
6. **Fully autonomous global distribution**: `raggai` on PATH in global installs and fully autonomous execution outside the repo (assets/native deps), with `opencode install|init` validated in a clean environment.
7. **E2E and OpenCode integration**: full external tests (`init` → `import` → `search` → plugin/OpenCode/UI) covering global vs local, project context, overlay, and write isolation.
8. **Graph extraction pipeline — remaining phases** (Phase 1 foundation done, see section above):
   - Phase 2: richer markdown rules (frontmatter/metadata, headings/lists, links, simple tables/KB rows), canonical predicate vocabulary (`uses`, `depends_on`, `contains`, `defines`, `references`, `implements`, `calls`…) with alias map, entity alias handling.
   - Phase 3: code extraction (imports, symbol definitions `class|interface|type|function|def|func|struct|impl`, extends/implements) replacing the `kind: "code"` stub.
   - Phase 4: graph analytics in UI/CLI (facts by method/confidence, filters, actionable audit).
   - Phase 5: opt-in model-assisted extraction (`rules` default; `hybrid`/`llm` behind config), schema-validated JSON output, thresholds, selective scope, budget/timeout limits.
   - Phase 6: optional AST/tree-sitter adapters behind `GraphExtractionPort` for prioritized languages; move `minConfidence` from env into TOML (`graph.extraction.*`);
     note: the `raggai` domain graph is currently empty (existing content has no legacy-format fact lines) and will only be populated once Phase 2/3 rules (or manual `memorize_personal_fact`) produce facts.
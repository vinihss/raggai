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
- REST API via `bun run src/server.ts` → `localhost:3000` (`/query`, `/save`)
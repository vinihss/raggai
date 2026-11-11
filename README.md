# raggai — RAG Híbrido Local (Vetor + Grafo) para Agentes de IA

Repositório com especificação técnica e implementação em **TypeScript/Bun** de uma memória de longo prazo híbrida e modular para agentes (OpenCode, LangChain, CrewAI, AutoGen, APIs). Opera 100% localmente, eliminando custos de APIs externas e filtrando contexto de forma cirúrgica.

Current state (2026-10-27): complete. `dist/index.js` + `.node` construídos. Skill (`rag-memory.md`) no formato SKILL.md criada. `test_rag.ts` validado (19,08% confiança, `errorHandler.ts`). No `system.prompt` copied — works via skill (`/rag-memory`) + plugin.

---

## 🏗️ System Architecture

Duas camadas independentes que se complementam em tempo de execução:

1. **Camada Vetorial (LanceDB + Transformers.js):** Modelo `Xenova/all-MiniLM-L6-v2` executado diretamente na CPU (ONNX). Buscas por proximidade semântica (notas livres, códigos, desabafos).
2. **Camada de Grafo (Graphology / JSON):** Mapeia conexões lógicas exatas (`[João] -> (trabalha_em) -> [OpenCode]`). Impede alucinações ao cruzar entidades.

```text
[Agente] ──(Pergunta)──> [Orquestrador Híbrido — src/index.ts / dist/index.js]
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
          [Grafo: data/graph_store.json]      [Vetor: data/vector_store/]
          (relações exatas + keywords)        (embeddings semânticos)
                    │                               │
                    └───────────────┬───────────────┘
                                    ▼
[Agente] <──(Contexto Consolidado Cirúrgico)──┘
```

---

## 📂 Directory Structure

```text
~/raggai/
├── data/
│   ├── vector_store/       # LanceDB (embeddings persistidos)
│   └── graph_store.json    # Grafo de conhecimento
├── src/
│   ├── index.ts            # Ferramentas + chunking poliglota + grafo + vetor
│   └── server.ts           # API REST local (:3000, /query, /save)
├── dist/
│   ├── index.js            # Build Bun (--target node, 2,66 MB)
│   └── lancedb.*.node      # Asset nativo (75,8 MB)
├── rag-memory.md           # Skill padrão (SKILL.md: name, usage, module)
├── system-prompt-rag.md    # Referência de prompt (não obrigatório)
├── install-opencode.ts     # Registro automático do plugin + skill
├── install.ts              # Build automatizado (corrigido: sem import {Bun})
├── test_rag.ts             # Pipeline de validação (embeddings + LanceDB)
├── reset_indexes.ts        # Limpeza de índices
├── AGENTS.md               # Instruções de integração OpenCode
├── README.md               # Este arquivo
└── package.json            # Dependências Bun
```

---

## 🚀 Quick Setup (Local)

Requires **Bun** (1.4.4+ confirmed). At repo root:

```bash
bun install.ts
```

The script does:
1. Creates `./data/`
2. `bun install`
3. `bun build ./src/index.ts --outdir ./dist --target node`
4. Confirms `dist/index.js` + `.node`

Then validate:
```bash
bun test_rag.ts
```

Expected result (proven): search "Where is the logic that generates server errors?" returns `src/middleware/errorHandler.ts` with ~19% confidence.

---

## 🔌 Automatic OpenCode Installation (Skill + Plugin, no prompt copy)

The system works via **skill** (`rag-memory.md`) and **plugin** (`dist/index.js`), not `system.prompt`. No instruction content is copied.

```bash
bun install-opencode.ts
```

What it does (reference only, does not edit `opencode.json`):
- Confirms `dist/index.js`
- Copies `rag-memory.md` → `~/.opencode/skills/rag-memory.md`
- Creates `~/.opencode/plugin/raggai.json` pointing to the module
- **Does not** copy `system-prompt-rag.md`

Agent usage: invoke `/rag-memory` (or let personal context trigger the skill). Tools run in the background via plugin.

---

## 🧪 Validate with Test Script

Before integrating, validate locally:

```bash
bun test_rag.ts
```

Validates:
- Modelo `Transformers.js` local (`all-MiniLM-L6-v2`)
- Métrica de cosseno (distância vetorial)
- Persistência física (`data/test_store/` + LanceDB)

---

## 🛠️ Native Tools Catalog

When plugin `dist/index.js` is registered, the agent gains these tools (exported from `src/index.ts`):

| Tool | Function |
|---|---|
| `consult_memory_personal` | Hybrid search: vector (LanceDB) + graph (keywords) |
| `memorize_personal_fact` | Stores structured fact + text in vector |
| `import_markdown_notes` | `.md` ingestion with overlap (25 words) + auto graphs |
| `index_local_codebase` | Indexes source code (TS, JS, PY, GO, RS, JSON/YAML/CSS) |
| `search_semantic_codebase` | Semantic search in indexed code (pre-LLM filter) |
| `index_local_codebase` | Indexes full repository |
| `audit_and_visualize_graph` | Cleans orphan nodes + structured tree report |
| `export_visual_graph_map` | Exports interactive 2D HTML map (groups by color) |
| `reset_local_memory` | Deletes indexes (`Vector` + `Graph`) — requires `confirm: true` |

Polyglot chunking (`chunkCodebase()` + `LANGUAGE_RULES`): recognizes `ts/js`, `py`, `go`, `rs`, `json/yaml/css/md`; isolates blocks by signature (`def`, `func`, `class`, etc.).

---

## 🌐 How to Use Outside OpenCode (Frameworks / APIs)

Exponha via API REST local:

```bash
bun run src/server.ts
# Port 3000; endpoints /query (POST) and /save (POST)
```

Python example (pure):
```python
import requests
res = requests.post("http://localhost:3000/query",
  json={"query":"erro interno do servidor","keywords":["João"]})
print(res.json())  # {graph:[...], vector:[...]}
```

Exemplo LangChain (`@tool`):
```python
from langchain_core.tools import tool
import requests

@tool
def memento_hibrido_local(query: str, palavras_chave: list) -> dict:
    res = requests.post("http://localhost:3000/query",
                        json={"query": query, "keywords": palavras_chave})
    return res.json()
```

---

## 🧹 Maintenance and Index Reset

If switching test repos or wanting to start fresh:

```bash
bun reset_indexes.ts
```

Clears: `data/vector_store/` + `data/test_store/` + `data/graph_store.json`. Recreates `data/` if needed.

---

## ⚖️ License

Open-source project developed strictly for data privacy, local infrastructure optimization, and advanced AI agent engineering.

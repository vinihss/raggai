# raggai — RAG Híbrido Local (Vetor + Grafo) para Agentes de IA

Repositório com especificação técnica e implementação em **TypeScript/Bun** de uma memória de longo prazo híbrida e modular para agentes (OpenCode, LangChain, CrewAI, AutoGen, APIs). Opera 100% localmente, eliminando custos de APIs externas e filtrando contexto de forma cirúrgica.

Estado atual (2026-10-27): completo. `dist/index.js` + `.node` construídos. Skill (`rag-memory.md`) no formato SKILL.md criada. `test_rag.ts` validado (19,08% confiança, `errorHandler.ts`). Nenhum `system.prompt` copiado — funciona por skill (`/rag-memory`) + plugin.

---

## 🏗️ Arquitetura do Sistema

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

## 📂 Estrutura de Diretórios

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

## 🚀 Instalação Rápida (Local)

Requer **Bun** (1.4.4+ confirmado). Na raiz do repositório:

```bash
bun install.ts
```

O script faz:
1. Cria `./data/`
2. `bun install`
3. `bun build ./src/index.ts --outdir ./dist --target node`
4. Confirma `dist/index.js` + `.node`

Depois valide:
```bash
bun test_rag.ts
```

Resultado esperado (comprovado): busca "Onde fica a lógica que gera os erros do servidor?" retorna `src/middleware/errorHandler.ts` com ~19% confiança.

---

## 🔌 Instalação Automática para OpenCode (Skill + Plugin, sem copiar prompt)

O sistema funciona por **skill** (`rag-memory.md`) e **plugin** (`dist/index.js`), não por `system.prompt`. Nenhum conteúdo de instrução é copiado.

```bash
bun install-opencode.ts
```

O que faz (apenas referência, não edita `opencode.json`):
- Confirma `dist/index.js`
- Copia `rag-memory.md` → `~/.opencode/skills/rag-memory.md`
- Cria `~/.opencode/plugin/raggai.json` apontando para o módulo
- **Não** copia `system-prompt-rag.md`

Uso no agente: invocar `/rag-memory` (ou deixar o contexto pessoal acionar a skill). As ferramentas executam no background via plugin.

---

## 🧪 Validar com Script de Teste

Antes de integrar, valide localmente:

```bash
bun test_rag.ts
```

Valida:
- Modelo `Transformers.js` local (`all-MiniLM-L6-v2`)
- Métrica de cosseno (distância vetorial)
- Persistência física (`data/test_store/` + LanceDB)

---

## 🛠️ Catálogo de Ferramentas Nativas

Quando o plugin `dist/index.js` é registrado, o agente ganha estas ferramentas (exportadas de `src/index.ts`):

| Ferramenta | Função |
|---|---|
| `consultar_memoria_pessoal` | Busca híbrida: vetor (LanceDB) + grafo (keywords) |
| `memorizar_facto_pessoal` | Grava fato estruturado + texto no vetor |
| `importar_notas_markdown` | Ingestão `.md` com overlap (25 palavras) + grafos automáticos |
| `importar_codebase_local` | Indexa código (TS, JS, PY, GO, RS, JSON/YAML/CSS) |
| `buscar_semantica_codebase` | Busca semântica em código indexado (filtro pré-LLM) |
| `indexar_codebase_local` | Indexa repositório completo |
| `auditar_e_visualizar_grafo` | Limpa nós órfãos + relatório em árvore |
| `exportar_mapa_visual_grafo` | Exporta HTML interativo (física 2D, grupos por cor) |
| `resetar_memoria_local` | Apaga índices (`Vetor` + `Grafo`) — requer `confirmar: true` |

Chunking poliglota (`chunkCodebase()` + `LANGUAGE_RULES`): reconhece `ts/js`, `py`, `go`, `rs`, `json/yaml/css/md`; isola blocos por assinatura (`def`, `func`, `class`, etc.).

---

## 🌐 Como Utilizar Fora do OpenCode (Frameworks / APIs)

Exponha via API REST local:

```bash
bun run src/server.ts
# Porta 3000; endpoints /query (POST) e /save (POST)
```

Exemplo Python (puro):
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

## 🧹 Manutenção e Reset dos Índices

Se mudar de repositório de testes ou quiser começar do zero:

```bash
bun reset_indexes.ts
```

Limpa: `data/vector_store/` + `data/test_store/` + `data/graph_store.json`. Recria `data/` se necessário.

---

## ⚖️ Licença

Projeto de código aberto desenvolvido estritamente para fins de privacidade de dados, otimização de infraestrutura local e engenharia avançada de agentes de inteligência artificial.

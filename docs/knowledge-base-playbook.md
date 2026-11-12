# Knowledge Base Playbook — raggai (memória híbrida local)

Como extrair o máximo do raggai: o que ele resolve, o que não resolve, e como manter uma base de conhecimento **enxuta** que o agente consulta de verdade.

> Verificado contra o que está implementado (extração determinística, sem LLM assistindo). Limites honestos no final.

---

## 1. Para que ele serve (e para que não serve)

| Problema | Serve? | Por quê |
|---|---|---|
| "Já decidimos isso?" — decisões arquiteturais, preferências do usuário, lições de bugs | ✅ | Vector captura similaridade semântica; o agente consulta antes de agir |
| "Quem depende/o que implementa/quem importa X?" — consultas estruturais | ✅ | Grafo com predicados tipados + confiança 0–1 |
| Cold start em projeto grande | ✅ | `index_local_codebase` + `search_semantic_codebase` dão mapa topológico sem ler tudo |
| Instituição à deriva (fato velho sobrevive à mudança) | ✅ | Prune por `sourceHash`: a fonte mudou, o fato morre junto |
| Pergunta pontual sobre o código aberto na tela | ❌ | grep/git grep/leitura direta são melhores |
| Conteúdo volátil (CI falhando agora, branch quente) | ❌ | O índice fica atrás; só memória do *stale-able* |
| Raciocinar no lugar do agente | ❌ | Ele recupera contexto; não decide arquitetura |
| Curadoria zero ("indexe tudo") | ❌ | Lixo entra, lixo sai — com confiança de 0.9 |

Regra de bolso: **o KB enxuto responde o que o agente perguntaria de novo em toda sessão. Nada além disso.**

---

## 2. O loop correto

```
import (notes/code, incremental)  →  consult antes de agir  →  memorizar ao concluir
              ↑____________ reindexar no git checkout / merge / mudança relevante _________↓
```

1. **`import` incremental** — `raggai import <path> --mode notes|code|auto [--domain <d>] [--force]` ou as tools `import_markdown_notes` / `index_local_codebase`.
2. **`consult_memory_personal` antes de agir** — se a skill `rag-memory` estiver instalada, o agente faz isso sozinho para contexto pessoal; mantenha o hábito também em tarefas de código.
3. **`memorize_personal_fact` ao concluir** — destile 1–3 fatos duráveis (nunca o relatório inteiro).
4. **Reindexe no checkout/merge** — o índice é regenerível; o KB de notas é seu, preserve-o no git.

Memória é uma ferramenta de *antes e depois* da tarefa, não durante o micro-lookup.

---

## 3. Estratégia de domínios

- **`global`** — só o que vale em todo projeto: preferências do usuário, lições transversais (ex.: "sharp 0.32 quebra no bun → override ^0.35.5"), vocabulário pessoal.
- **Um domínio por projeto** (`raggai init opencode --domain <proj>`) — isola o grafo e o índice vetorial do projeto.
- **Overlay na leitura**: config do projeto com `include: [<proj>, "global"]` — busca/leitura cobrem os dois sem misturar a escrita.
- **Nunca use global como lixeira**: fato de projeto no domínio errado contamina todo mundo.
- Snapshot antes de grande reindexação (`raggai export <name> --format bundle`) para poder voltar.

```bash
# um projeto novo, em ~30–60 min
raggai init opencode --domain <proj>
raggai import <repo> --mode auto --domain <proj>
# escrever 5–10 notas curadas (ver templates)
raggai search "por que <escolha-chave>?" --json
raggai graph <proj>
```

---

## 4. Notas que alimentam o grafo

A extração é determinística (parser + regras). A qualidade dos fatos depende **da estrutura da nota**, não do volume.

Valores de confiança por método: `rule` 0.9 > `inherit` 0.85 > `frontmatter` 0.85 > `table` 0.8 > `link` 0.8 > `defines` 0.8 > `import` 0.8 (relativo fraco 0.6) > `heading` 0.75 > `md-link` 0.75. Fatos abaixo do `minConfidence` (default 0.5) são descartados.

### Faça

```markdown
---
title: Driver LanceDB
uses: [LanceDB]
depends_on: [apache-arrow]
---

# Driver LanceDB

- [LanceDB adapter] uses [@lancedb/lancedb]
- [LanceDB adapter] implements [VectorStorePort]
- [LanceDB adapter] depends_on [apache-arrow]

## Dependencies
- LanceDB 0.11
- Apache Arrow

Ver também: [[VectorStorePort]]
```

- **Título da nota = entidade canônica** ("LanceDB adapter", não "Notas do banco").
- **1 fato por linha/bullet**; predicados no vocabulário canônico:
  `uses, depends_on, implements, defines, calls, extends, references, contains, part_of` (desconhecidos passam como lower_snake_case — evite criar espontaneamente).
- **Frontmatter com listas** (`uses: [A, B]`) e **headings-predicado** (`## Dependencies`) geram fatos de maior valor.
- **Wikilinks** `[[Alvo]]` / `[[Alvo|alias]]` → `references` (0.8); links markdown locais → `references` (0.75), percent-decoded.
- **Tabelas** com header de predicado ou triplas (entidade | relação | alvo).
- Code fences são ignorados em notas; código usa `index_local_codebase` (imports/defines/extends/implements).

### Não faça

- Parágrafos de prosa sem estrutura (viram ~0 fatos, ou fatos lixo com baixa confiança);
- Notas "misc" com fatos misturados;
- Duas grafias para a mesma entidade (o merge fuzzy exige primeiro caractere igual — "beta"/"delta" não funde);
- Predicados ad-hoc (`ajuda_com`, `fala_de`) — fora do vocabulário, nada consome bem.

---

## 5. Templates

### Decision note — `decision-<tema>.md`
```markdown
# Decision: <escolha>

- [<projeto>] uses [<tecnologia>] porque <razão objetiva>; rejeitado [<alternativa>] porque <trade-off>.
- [<projeto>] depends_on [<contrato>] (invariante: <regra>).

## Links
[[<arquivo-ou-módulo>]]
```

### Invariant — `invariant-<tema>.md`
```markdown
# Invariant: <o que nunca muda>

- [<módulo A>] never <verbo> [<módulo B>]; <reversível? como>.
- [<porta X>] defines [<contrato Y>] — qualquer mudança exige <teste/ADR>.
```

### Gotcha — `gotcha-<tema>.md`
```markdown
# Gotcha: <sintoma>

- [<sintoma>] causa [<raiz>] (diagnosticado em <data>, <link/commit>); fix: [<correção>].
```

### Runbook curto — `runbook-<tema>.md`
```markdown
# Runbook: <operação>

1. Pré-requisito: <…>
2. Comando: `<…>`
3. Verificar: `<…>` (saída esperada)
4. Rollback: `<…>`
```

### Glossário de domínio — `glossary.md`
```markdown
# Glossário

- [<termo>] defines [<definição curta>].
- [<termo>] part_of [<contexto maior>].
```

Toda nota começa com verbo/entidade certa — o parser não entende metáfora.

---

## 6. O que manter e o que podar (regra de enxutez)

**Inclua (alto ROI):** decisões com trade-off, invariants, gotchas caros, vocabulário, mapa de dependências inter-módulo, procedimentos curtos verificados.

**Não inclua:** dumps de código/log/CI, exports, `data/`, duplicatas semânticas (o fato existe no git), docs públicos estáveis, TODO/backlog (vai no issue tracker), notas comconfiança < 0.75 não revisadas.

**Orçamento prático:** revise o KB a cada marco/semanal — 15 minutos batendo `raggai graph <domínio>`.

---

## 7. Higiene periódica

```bash
raggai graph <dominio>          # #nós, #edges, byMethod, órfãos, histograma de confiança
raggai export <dom|all> --format bundle   # snapshot completo antes de podar
```

No plugin OpenCode: `audit_and_visualize_graph` (remove órfãos + relatório) e `export_visual_graph_map` (HTML interativo para hol-review).

Frequência sugerida: após grande reindexação, antes de release/marco, ou quando a busca trouxer fatos que você sabe que estão errados.

Sinais de que o grafo degradou:
- `confidenceHistogram["< 0.5"]` crescendo — fontes prosa demais ou predicados ad-hoc;
- Muitos órfãos (`degree == 0`) — notas sem links/predicados;
- `mostConnected` com nós genéricos ("file", "note", "test") — títulos de nota mal escolhidos;
- Fato duplicado — delete a nota-fonte e reimporte (o prune por `sourceHash` limpa as arestas velhas).

Prune por `sourceHash` limpa sozinho o que sumiu da fonte — **edite a fonte em vez de criar nota nova**.

---

## 8. Checklist de revisão semanal (15 min)

Rode toda semana, ou após qualquer reindexação grande:

```bash
raggai doctor                    # 1) sanidade do ambiente
raggai graph <dom>               # 2) delta de nós/edges + histograma vs. semana passada
raggai export <dom> --format bundle   # 3) snapshot antes de podar (cai em data/, não commite)
raggai search "<pergunta-chave>" --json   # 4) a resposta certa ainda sai no top-3?
```

- [ ] Fato novo da semana: está correto e na nota-fonte certa? Predicado canônico (`uses/depends_on/implements/defines/calls/extends/references/contains/part_of`)?
- [ ] Nenhum fato de projeto específico vazou para o domínio `global`;
- [ ] Órfãos (`degree == 0`) podados — via `audit_and_visualize_graph` no agente, ou deletando a nota órfã;
- [ ] Hits repetidos de fatos < 0.5 de confiança — corrija a nota-fonte e reimporte;
- [ ] Glossário atualizado com o termo novo da semana;
- [ ] Se o extractor mudou, reindexou com `--force` onde fez sentido.

Regra: **dois ou mais itens "não" → esta semana é de curadoria, não de indexação.**

---

## 9. Métricas de que está funcionando

- Perguntas-chave do projeto retornam a nota certa no top-3 (`raggai search "<pergunta-chave>" --json`);
- `raggai graph` mostra `edges > nodes / 2` (grafo vivo, não nuvem de pontos);
- Histograma ≥0.7 concentra a maior parte dos fatos;
- O agente cita decisão passada **com confiança** sem você colar o doc no prompt;
- Você gasta mais tempo podando do que indexando.

---

## 10. Limites honestos (o que NÃO esperar)

1. **Extração não é LLM**: semântica fina de prosa livre escapa; tabelas e bullets estruturados são o caminho. (Extração assistida = Phase 5, não entregue.)
2. **Embeddings locais** (MiniLM-L6-v2): bom o bastante para parágrafos curtos; sinônimos raros e códigos aleatórios confundem. Search híbrido ajuda, não faz milagre.
3. **Indexação custa CPU** no primeiro import (embeddings em CPU); o cache (`~/.cache/raggai/embeddings`) torna reimport quase grátis (`embed 0ms`).
4. **Não é verdade factual**: fato com proveniência ≠ verificação. Fatos de `import` (0.8) descrevem dependência, não intenção.
5. **Não substitui git/docs**: decisão = nota *e* commit message; o KB é o índice, não a fonte.

---

## 11. Cola de comandos

```bash
raggai doctor                          # sanidade do ambiente
raggai init opencode [--domain <proj>] # projeto
raggai import <path> [--mode notes|code|auto] [--domain <d>] [--force]
raggai search "<query>" [--domain <d>] [--domains a,b] [--json]
raggai graph <dom>                     # análise (nós, órfãos, histograma)
raggai domain list|create|use|delete
raggai export <name> --format bundle|json|md|graph-html|audit
raggai reset_local_memory              # apaga tudo (com confirm)
```

No agente OpenCode (skill `rag-memory`): `consult_memory_personal` → `memorize_personal_fact` → `import_markdown_notes` / `index_local_codebase` / `search_semantic_codebase` / `audit_and_visualize_graph` / `export_visual_graph_map` / `reset_local_memory`.

---

**Resumo em uma linha**: curate pouco, estruture muito, podar sempre — e deixe o histograma de confiança dizer quando o KB virou eco.

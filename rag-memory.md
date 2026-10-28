name: rag-memory
description: "RAG Híbrido Local (vetor + grafo). Use quando o utilizador menciona preferências, tarefas passadas, nomes, rotinas, projetos em andamento, ou quando precisa de contexto histórico. Sempre invoque consultar_memoria_pessoal antes de responder com contexto pessoal; se novos factos surgirem, use memorizar_facto_pessoal. Nunca invente dados além do retorno das ferramentas. Para busca em código, use buscar_semantica_codebase."
usage: "/rag-memory                                        # ativar memória híbrida local; invocar consultar_memoria_pessoal para contexto pessoal
type: memory-tool
module: /home/vinicius/raggai/dist/index.js
tools:
  - consultar_memoria_pessoal
  - memorizar_facto_pessoal
  - importar_notas_markdown
  - auditar_e_visualizar_grafo
  - exportar_mapa_visual_grafo
  - buscar_semantica_codebase
  - indexar_codebase_local
  - resetar_memoria_local
configuration:
  vector_db: /home/vinicius/raggai/data/vector_store (LanceDB)
  graph_db: /home/vinicius/raggai/data/graph_store.json (Graphology)
  embeddings_model: Xenova/all-MiniLM-L6-v2

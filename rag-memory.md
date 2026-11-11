name: rag-memory
description: "Hybrid Local RAG (vector + graph). Use when the user mentions preferences, past tasks, names, routines, ongoing projects, or when historical context is needed. Always invoke consult_memory_personal before answering with personal context; if new facts emerge, use memorize_personal_fact. Never invent data beyond tool returns. For code search, use search_semantic_codebase."
usage: "/rag-memory                                        # activate local hybrid memory; invoke consult_memory_personal for personal context
type: memory-tool
module: /home/vinicius/raggai/dist/index.js
tools:
  - consult_memory_personal
  - memorize_personal_fact
  - import_markdown_notes
  - audit_and_visualize_graph
  - export_visual_graph_map
  - search_semantic_codebase
  - index_local_codebase
  - reset_local_memory
configuration:
  vector_db: /home/vinicius/raggai/data/vector_store (LanceDB)
  graph_db: /home/vinicius/raggai/data/graph_store.json (Graphology)
  embeddings_model: Xenova/all-MiniLM-L6-v2

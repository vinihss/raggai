
src/
├── domain/                         # O NÚCLEO (Core) - Lógica pura de RAG
│   ├── entities/                   # Modelos de dados puros
│   │   ├── document.ts             # Estrutura do Chunk, Metadados e Código
│   │   └── graph.ts                # Definição de Nós e Arestas
│   └── services/                   # Algoritmos independentes de biblioteca
│       ├── hybrid-orchestrator.ts  # Mescla os resultados do Vetor + Grafo (Reciprocal Rank Fusion)
│       └── text-splitter.ts        # Chunking poliglota (regras de linguagem puras)
│
├── ports/                          # AS INTERFACES (Contratos de comunicação)
│   ├── inbound/                    # Portas de Entrada (O que o sistema faz)
│   │   └── rag-operations.port.ts  # Interface para consultar, memorizar e importar codebase
│   └── outbound/                   # Portas de Saída (O que o sistema precisa)
│       ├── vector-store.port.ts    # Interface para salvar/buscar embeddings
│       ├── graph-store.port.ts     # Interface para manipular nós/conexões
│       └── embedding.port.ts       # Interface para gerar vetores a partir de texto
│
├── adapters/                       # AS IMPLEMENTAÇÕES TECNOLÓGICAS
│   ├── inbound/                    # Adaptadores de Entrada (Drivers)
│   │   ├── http/                   # Servidor REST (Substitui o server.ts atual)
│   │   │   └── express-server.ts
│   │   └── agent-plugin/           # Funções exportadas para a skill do agente
│   │       └── plugin-handlers.ts  # Converte chamadas do agente para a porta RAG
│   └── outbound/                   # Adaptadores de Saída (Driven)
│       ├── lancedb/                # Implementação específica do LanceDB
│       │   └── lancedb.adapter.ts
│       ├── graphology/             # Implementação específica do Graphology/JSON
│       │   └── json-graph.adapter.ts
│       └── transformers/           # Geração de embeddings local via ONNX
│           └── xenova.adapter.ts
│
├── config/                         # Inicialização e Injeção de Dependência
│   └── container.ts                # Instancia os adaptadores e monta o orquestrador
└── index.ts                        # Ponto de entrada que exporta o plugin construído
Use o código com cuidado.

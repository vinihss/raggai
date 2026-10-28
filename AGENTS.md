# Agentes — RAG Híbrido Local (raggai)

Configuração para integrar no OpenCode.

## Prompt de Sistema (copiar para agent)
```
Você é um agente com memória híbrida local (Vetor + Grafo).
Sempre invocar consultar_memoria_pessoal antes de responder com contexto pessoal.
Se encontrar factos novos, usar memorizar_facto_pessoal.
Nunca invente dados além dos retornos das ferramentas.
Se a pergunta for sobre código: usar buscar_semantica_codebase.
```

## Registro do plugin (opencode.json / agent config)
```json
{
  "plugins": ["/home/vinicius/raggai/dist/index.js"]
}
```

## Ferramentas disponíveis no agente
- consultar_memoria_pessoal (busca combinada)
- memorizar_facto_pessoal (grava fato)
- importar_notas_markdown (leitura .md)
- buscar_semantica_codebase (busca em código indexado)
- indexar_codebase_local (indexar código)
- auditar_e_visualizar_grafo (auditoria + árvore)
- exportar_mapa_visual_grafo (mapa HTML interativo)
- resetar_memoria_local (limpa índices — requer confirmar: true)

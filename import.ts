// import_now.ts
import { index_local_codebase, import_markdown_notes } from "./src/index";
import * as path from "path";

async function iniciarImportacao() {
  console.log("📥 A carregar a própria pasta do raggai para a base local...");

  // Força o caminho absoluto para a pasta atual (.) onde o comando está a ser rodado
  const caminhoAbsoluto = path.resolve("."); 
  console.log(`📂 Caminho resolvido: ${caminhoAbsoluto}`);

  // 1. Testa a Codebase
  const resultadoCodigo = await index_local_codebase.execute({ 
    repoPath: caminhoAbsoluto 
  });
  console.log("✅ Codebase processada:", resultadoCodigo);

  // 2. Testa as Notas (Pegando o README.md e AGENTS.md da raiz)
  const resultadoNotas = await import_markdown_notes.execute({ 
    targetPath: caminhoAbsoluto 
  });
  console.log("✅ Notas processadas:", resultadoNotas);
}

iniciarImportacao().catch(console.error);

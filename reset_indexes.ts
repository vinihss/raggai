import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.resolve('./data');
const VECTOR_DIR = path.join(DATA_DIR, 'vector_store');
const GRAPH_FILE = path.join(DATA_DIR, 'graph_store.json');
const TEST_DIR = path.join(DATA_DIR, 'test_store');

function removeDirectoryOrFile(targetPath: string) {
  if (fs.existsSync(targetPath)) {
    const stats = fs.statSync(targetPath);
    if (stats.isDirectory()) {
      fs.rmSync(targetPath, { recursive: true, force: true });
      console.log(`🗑️ [Removido] Diretório apagado: ${path.basename(targetPath)}`);
    } else {
      fs.unlinkSync(targetPath);
      console.log(`🗑️ [Removido] Ficheiro apagado: ${path.basename(targetPath)}`);
    }
  }
}

async function runResetPipeline() {
  console.log("⚠️ Iniciando a limpeza dos Índices Locais de Memória...");
  console.log("\n[Passo 1] Limpando a base vetorial LanceDB...");
  removeDirectoryOrFile(VECTOR_DIR);
  removeDirectoryOrFile(TEST_DIR);
  console.log("\n[Passo 2] Limpando o Grafo de Conhecimento...");
  removeDirectoryOrFile(GRAPH_FILE);
  console.log("\n[Passo 3] Reestruturando diretórios limpos...");
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log("\n✨ [Sucesso] Todos os índices locais foram resetados!");
}

runResetPipeline().catch((err) => console.error("❌ Erro ao resetar:", err));

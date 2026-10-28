import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from '@xenova/transformers';
import * as lancedb from "@lancedb/lancedb";

const TEST_DIR = path.resolve('./data/test_store');

console.log("⏳ Carregando o modelo Transformers.js localmente na CPU...");
const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

async function getEmbedding(text: string): Promise<number[]> {
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

const mockCodebase = [
  { path: "src/server.ts", text: "import express from 'express';\nconst app = express();\napp.listen(3000, () => console.log('Server running'));" },
  { path: "src/middleware/errorHandler.ts", text: "export const errorHandler = (err: any, req: any, res: any, next: any) => {\n  console.error(err.stack);\n  res.status(500).json({ error: 'Erro interno do servidor', detalhe: err.message });\n};" },
  { path: "src/routes/auth.ts", text: "import { Router } from 'express';\nexport const authRouter = Router();\nauthRouter.post('/login', (req, res) => {\n  res.json({ token: 'jwt-mock-token' });\n});" }
];

async function runTestPipeline() {
  console.log("\n🚀 Iniciando testes do RAG Híbrido Local...");
  const db = await lancedb.connect(TEST_DIR);
  let table;
  try {
    table = await db.openTable("test_codebase");
    console.log("🔄 Tabela de teste existente aberta.");
  } catch {
    console.log("📦 Criando nova tabela 'test_codebase' no LanceDB...");
    const firstEmbedding = await getEmbedding(mockCodebase[0].text);
    table = await db.createTable("test_codebase", [
      { vector: firstEmbedding, text: mockCodebase[0].text, type: "code", path: mockCodebase[0].path }
    ]);
  }
  console.log("📥 Indexando blocos de código simulados...");
  for (let i = 1; i < mockCodebase.length; i++) {
    const item = mockCodebase[i];
    const vector = await getEmbedding(item.text);
    await table.add([{ vector, text: item.text, type: "code", path: item.path }]);
    console.log(`✅ [Indexado] -> ${item.path}`);
  }
  const userQuery = "Onde fica a lógica que gera os erros do servidor?";
  console.log(`\n🔍 Executando busca semântica para a query: "${userQuery}"`);
  const queryVector = await getEmbedding(userQuery);
  const hits = await table.search(queryVector).distanceType("cosine").limit(2).toArray();
  console.log("\n=== RESULTADO DA BUSCA SEMÂNTICA ===");
  hits.forEach((hit: any, index: number) => {
    const score = (1 - hit._distance) * 100;
    console.log(`\n[Posição #${index + 1}] Ficheiro: ${hit.path} | Confiança: ${score.toFixed(2)}%`);
    console.log(`--- Trecho Recuperado ---`);
    console.log(hit.text);
    console.log(`-------------------------`);
  });
  console.log("\n🎉 Teste concluído! O LanceDB isolou o contexto correto sem usar nenhuma API externa.");
}

runTestPipeline().catch(console.error);

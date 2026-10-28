import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

const PROJECT_DIR = path.resolve('.');
const DATA_DIR = path.join(PROJECT_DIR, 'data');
const DIST_DIR = path.join(PROJECT_DIR, 'dist');

function run(cmd: string, args: string[]): Promise<number> {
  return new Promise((res) => {
    const p = spawn(cmd, args, { cwd: PROJECT_DIR, stdio: 'inherit' });
    p.on('close', (code) => res(code ?? 0));
  });
}

async function main() {
  console.log("⚙️ Instalação automatizada RAG Híbrido Local (funcional)\n");

  console.log("[1] Criando pastas...");
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(DIST_DIR, { recursive: true });

  console.log("[2] bun install...");
  const installCode = await run('bun', ['install']);
  if (installCode !== 0) { console.error("❌ Falha install"); process.exit(1); }

  console.log("[3] bun build (target node)...");
  const buildCode = await run('bun', ['build', './src/index.ts', '--outdir', './dist', '--target', 'node']);
  if (buildCode !== 0) { console.error("❌ Falha build (verifique .node nativo)"); process.exit(1); }

  console.log("\n✅ Feito. Arquivo: " + path.join(DIST_DIR, "index.js"));
  console.log("📋 Para ativar no OpenCode:");
  console.log("  - Adicione ao agent: plugin = '" + path.join(DIST_DIR, "index.js") + "'");
  console.log("  - Copie system-prompt-rag.md para system.prompt");
}

main().catch(console.error);

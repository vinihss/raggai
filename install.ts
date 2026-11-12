import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawn } from 'child_process';

const PROJECT_DIR = path.resolve('.');
const DATA_DIR = path.join(PROJECT_DIR, 'data');
const DIST_DIR = path.join(PROJECT_DIR, 'dist');

const SKIP_PATH = process.argv.includes('--no-path');
const FORCE = process.argv.includes('--force');

function run(cmd: string, args: string[]): Promise<number> {
  return new Promise((res) => {
    const p = spawn(cmd, args, { cwd: PROJECT_DIR, stdio: 'inherit' });
    p.on('close', (code) => res(code ?? 0));
  });
}

function linkRaggaiOnPath(): void {
  const source = path.join(PROJECT_DIR, 'bin', 'raggai');
  if (!fs.existsSync(source)) {
    console.error('❌ bin/raggai not found:', source);
    process.exit(1);
  }
  const binDir = process.env.RAGGAI_BIN_DIR
    || process.env.XDG_BIN_HOME
    || path.join(os.homedir(), '.local', 'bin');
  const dest = path.join(binDir, 'raggai');
  fs.mkdirSync(binDir, { recursive: true });

  let existing: fs.Stats | null = null;
  try { existing = fs.lstatSync(dest); } catch { existing = null; }

  if (existing) {
    const ours = existing.isSymbolicLink() && (() => {
      try { return fs.realpathSync(dest) === fs.realpathSync(source); } catch { return false; }
    })();
    if (ours) {
      console.log('[4] PATH: raggai já aponta para esta instalação:', dest);
    } else if (FORCE) {
      fs.rmSync(dest, { force: true, recursive: existing.isDirectory() });
      fs.symlinkSync(source, dest);
      console.log('[4] PATH: substituiu arquivo existente (--force):', dest);
    } else {
      console.error(`❌ ${dest} já existe e não aponta para esta instalação.`);
      console.error('   Use --force para substituir, ou ajuste RAGGAI_BIN_DIR/XDG_BIN_HOME.');
      process.exit(1);
    }
  } else {
    fs.symlinkSync(source, dest);
    console.log('[4] PATH: symlink criado:', dest, '->', source);
  }

  const pathEntries = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
  if (!pathEntries.includes(binDir)) {
    console.log('   ⚠️  ' + binDir + ' não está no PATH. Adicione ao seu shell profile:');
    console.log('       export PATH="' + binDir + ':$PATH"');
  }
}

async function main() {
  console.log("⚙️ Instalação automatizada RAG Híbrido Local (funcional)\n");

  console.log("[1] Criando pastas...");
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(DIST_DIR, { recursive: true });

  console.log("[2] bun install...");
  const installCode = await run('bun', ['install']);
  if (installCode !== 0) { console.error("❌ Falha install"); process.exit(1); }

  console.log("[3] bun run build (plugin + CLI)...");
  const buildCode = await run('bun', ['run', 'build']);
  if (buildCode !== 0) { console.error("❌ Falha build (verifique .node nativo)"); process.exit(1); }

  if (SKIP_PATH) {
    console.log("[4] PATH: pulado (--no-path)");
  } else {
    linkRaggaiOnPath();
  }

  console.log("\n✅ Feito. Arquivo: " + path.join(DIST_DIR, "index.js"));
  console.log("📋 Próximos passos:");
  console.log("  - Valide a CLI:  raggai doctor");
  console.log("  - Registre no OpenCode (skill + plugin V2):  raggai opencode install");
  console.log("  - Em um projeto:  raggai init opencode");
}

main().catch(console.error);

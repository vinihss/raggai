import * as fs from 'fs';
import * as path from 'path';

const DIST = path.resolve('./dist/index.js');
const SKILL_SRC = path.resolve('./rag-memory.md');
const SKILL_DST_DIR = '/home/vinicius/.opencode/skills';
const SKILL_DST = path.join(SKILL_DST_DIR, 'rag-memory.md');
const PLUGIN_REF = '/home/vinicius/.opencode/plugin/raggai.json';

async function main() {
  console.log("⚙️ Instalação automática OpenCode (raggai) — sem cópia de prompt\n");

  // 1. Confirma build
  if (!fs.existsSync(DIST)) {
    console.error("❌ Plugin não encontrado:", DIST);
    console.error("   Execute 'bun install.ts' primeiro.");
    process.exit(1);
  }
  console.log("✅ Plugin encontrado:", DIST);

  // 2. Copia skill (apenas arquivo de metadados)
  if (fs.existsSync(SKILL_SRC)) {
    fs.mkdirSync(SKILL_DST_DIR, { recursive: true });
    fs.copyFileSync(SKILL_SRC, SKILL_DST);
    console.log("✅ Skill registrada:", SKILL_DST);
  } else {
    console.error("❌ Skill não encontrada:", SKILL_SRC);
    process.exit(1);
  }

  // 3. Registra referência do plugin (arquivo auxiliar, não edita opencode.json)
  fs.mkdirSync(path.dirname(PLUGIN_REF), { recursive: true });
  fs.writeFileSync(PLUGIN_REF, JSON.stringify({
    plugin: DIST,
    module_path: DIST,
    skill: SKILL_DST,
    installed_at: new Date().toISOString(),
    note: "Referência de instalação automática. Nenhum system.prompt copiado."
  }, null, 2));
  console.log("✅ Referência do plugin criada:", PLUGIN_REF);

  console.log("\n🎉 Instalação concluída. Nenhum conteúdo de prompt copiado.");
  console.log("   Plugin:", DIST);
  console.log("   Skill:", SKILL_DST);
  console.log("   Uso: invocar /rag-memory no agente; as ferramentas estão no plugin.");
}

main().catch(console.error);

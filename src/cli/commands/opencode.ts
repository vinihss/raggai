import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { getRaggaiInstallRoot, resolveRaggaiAsset } from "../../config/install-root";

export async function opencodeCommand(sub: string | undefined, _rest: string[]) {
  if (sub !== "install") {
    console.log("Usage: raggai opencode install");
    return;
  }
  const installRoot = getRaggaiInstallRoot();
  const dist = resolveRaggaiAsset("dist/index.js");
  const skillSrc = resolveRaggaiAsset("rag-memory.md");
  const skillDstDir = path.join(os.homedir(), ".opencode", "skills");
  const skillDst = path.join(skillDstDir, "rag-memory.md");
  const pluginRef = path.join(os.homedir(), ".opencode", "plugin", "raggai.json");

  if (!fs.existsSync(dist)) throw new Error(`Build not found: ${dist} (root: ${installRoot}). Run the build in the raggai installation.`);
  if (!fs.existsSync(skillSrc)) throw new Error(`Skill not found: ${skillSrc}`);

  fs.mkdirSync(skillDstDir, { recursive: true });
  fs.copyFileSync(skillSrc, skillDst);
  fs.mkdirSync(path.dirname(pluginRef), { recursive: true });
  fs.writeFileSync(pluginRef, JSON.stringify({ plugin: dist, module_path: dist, skill: skillDst, installed_at: new Date().toISOString(), install_root: installRoot }, null, 2));
  console.log("✓ Global OpenCode installation completed");
  console.log(`  raggai root: ${installRoot}`);
  console.log(`  Skill: ${skillDst}`);
  console.log(`  Plugin: ${dist}`);
}

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { bootstrapDefaults, ensureDomain, saveProjectConfig, slugifyDomainName } from "../../config/raggai-paths";
import { resolveRaggaiAsset } from "../../config/install-root";

function hasGlobalOpenCodeInstall() {
  const skill = path.join(os.homedir(), ".opencode", "skills", "rag-memory.md");
  const ref = path.join(os.homedir(), ".opencode", "plugin", "raggai.json");
  return fs.existsSync(skill) || fs.existsSync(ref);
}

export async function initCommand(sub: string | undefined, rest: string[]) {
  if (sub !== "opencode") {
    console.log("Usage: raggai init opencode [--domain <name>]");
    return;
  }
  bootstrapDefaults();
  const cwd = process.cwd();
  const domainFlagIdx = rest.indexOf("--domain");
  const domain = domainFlagIdx >= 0 ? rest[domainFlagIdx + 1] : slugifyDomainName(path.basename(cwd));
  ensureDomain(domain, "project", `Project ${path.basename(cwd)}`);
  saveProjectConfig(cwd, { domain, include: [domain, "global"], agent: "opencode" });

  const global = hasGlobalOpenCodeInstall();
  const localDist = path.resolve(cwd, "dist/index.js");
  const localSkill = path.resolve(cwd, "rag-memory.md");
  const installDist = resolveRaggaiAsset("dist/index.js");
  const installSkill = resolveRaggaiAsset("rag-memory.md");

  if (!global) console.log("Global installation not detected: configuring local mode for this project.");
  else console.log("Global installation detected: configuring project only.");

  const opencodeJsonPath = path.join(cwd, "opencode.json");
  let opencodeCfg: any = {};
  if (fs.existsSync(opencodeJsonPath)) { try { opencodeCfg = JSON.parse(fs.readFileSync(opencodeJsonPath, "utf-8")); } catch {} }

  const globalRef = path.join(os.homedir(), ".opencode", "plugin", "raggai.json");
  let pluginPath = fs.existsSync(installDist) ? installDist : localDist;
  if (global && fs.existsSync(globalRef)) {
    try { const ref = JSON.parse(fs.readFileSync(globalRef, "utf-8")); pluginPath = ref.plugin || ref.module_path || pluginPath; } catch {}
  }
  opencodeCfg.plugins = Array.isArray(opencodeCfg.plugins) ? opencodeCfg.plugins : [];
  if (pluginPath && fs.existsSync(pluginPath) && !opencodeCfg.plugins.includes(pluginPath)) opencodeCfg.plugins.unshift(pluginPath);

  const skillPath = fs.existsSync(localSkill) ? localSkill : (fs.existsSync(installSkill) ? installSkill : null);
  if (skillPath) {
    opencodeCfg.skills = Array.isArray(opencodeCfg.skills) ? opencodeCfg.skills : [];
    if (!opencodeCfg.skills.includes(skillPath)) opencodeCfg.skills.unshift(skillPath);
  }
  opencodeCfg.raggai = { domain, include: [domain, "global"] };
  fs.writeFileSync(opencodeJsonPath, JSON.stringify(opencodeCfg, null, 2));

  console.log(`✓ Project configured for OpenCode`);
  console.log(`  Domain: ${domain}`);
  console.log(`  Config: ${path.join(cwd, ".raggai/config.toml")}`);
  console.log(`  Plugin: ${pluginPath || "(not found)"}`);
  console.log(`  opencode.json updated`);
}

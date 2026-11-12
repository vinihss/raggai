import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { bootstrapDefaults, ensureDomain, saveProjectConfig, slugifyDomainName } from "../../config/raggai-paths";
import { getRaggaiInstallRoot, resolveRaggaiAsset } from "../../config/install-root";

function hasGlobalOpenCodeInstall() {
  const home = os.homedir();
  const checks = [
    path.join(home, ".config", "opencode", "skills", "rag-memory.md"),
    path.join(home, ".config", "opencode", "plugins", "opencode-hybrid-rag"),
    path.join(home, ".opencode", "skills", "rag-memory.md"),
    path.join(home, ".opencode", "plugin", "raggai.json"),
  ];
  return checks.some((p) => fs.existsSync(p));
}

function globalInstallRootFromMarker(): string | null {
  try {
    const marker = path.join(os.homedir(), ".opencode", "plugin", "raggai.json");
    if (!fs.existsSync(marker)) return null;
    const ref = JSON.parse(fs.readFileSync(marker, "utf-8"));
    const root = ref.install_root || (ref.module_path ? path.dirname(path.dirname(ref.module_path)) : null);
    if (root && fs.existsSync(path.join(root, "package.json"))) return root;
    return null;
  } catch {
    return null;
  }
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
  const installRoot = globalInstallRootFromMarker() ?? getRaggaiInstallRoot();
  const installSkill = resolveRaggaiAsset("rag-memory.md");

  if (!global) console.log("Global installation not detected: configuring project-local skill fallback.");
  else console.log("Global installation detected: plugin and skill come from the global install.");

  const opencodeJsonPath = path.join(cwd, "opencode.json");
  let opencodeCfg: any = {};
  if (fs.existsSync(opencodeJsonPath)) { try { opencodeCfg = JSON.parse(fs.readFileSync(opencodeJsonPath, "utf-8")); } catch {} }

  // OpenCode V2: `plugins` entries must be package *directories* (a path to a
  // single file is skipped). Point at the install root, not dist/index.js.
  opencodeCfg.plugins = Array.isArray(opencodeCfg.plugins) ? opencodeCfg.plugins : [];
  // Drop legacy entries that pointed at the bundle file itself.
  const legacyBundlePath = path.join(installRoot, "dist", "index.js");
  opencodeCfg.plugins = opencodeCfg.plugins.filter((p: string) => p !== legacyBundlePath);
  if (fs.existsSync(path.join(installRoot, "package.json")) && !opencodeCfg.plugins.includes(installRoot)) {
    opencodeCfg.plugins.unshift(installRoot);
  }

  // Skills: a directory or URL per entry — never a bare markdown file path.
  // With the global install, ~/.config/opencode/skills is auto-discovered and no
  // project entry is needed; otherwise install the skill project-locally where
  // OpenCode auto-discovers it (.opencode/skills/<name>.md).
  let skillMode = "global (auto-discovered)";
  if (!global && fs.existsSync(installSkill)) {
    const projectSkillsDir = path.join(cwd, ".opencode", "skills");
    fs.mkdirSync(projectSkillsDir, { recursive: true });
    fs.copyFileSync(installSkill, path.join(projectSkillsDir, "rag-memory.md"));
    skillMode = ".opencode/skills/rag-memory.md (project-local copy)";
  }
  // Remove invalid legacy file-path skills entries pointing at rag-memory.md.
  if (Array.isArray(opencodeCfg.skills)) {
    opencodeCfg.skills = opencodeCfg.skills.filter((p: string) => !String(p).endsWith("rag-memory.md"));
    if (opencodeCfg.skills.length === 0) delete opencodeCfg.skills;
  }

  opencodeCfg.raggai = { domain, include: [domain, "global"] };
  fs.writeFileSync(opencodeJsonPath, JSON.stringify(opencodeCfg, null, 2));

  console.log(`✓ Project configured for OpenCode`);
  console.log(`  Domain: ${domain}`);
  console.log(`  Config: ${path.join(cwd, ".raggai/config.toml")}`);
  console.log(`  Plugin: ${installRoot}`);
  console.log(`  Skill: ${skillMode}`);
  console.log(`  opencode.json updated`);
}

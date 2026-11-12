import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { getRaggaiInstallRoot } from "./install-root";

export interface OpenCodeGlobalInstall {
  installRoot: string;
  dist: string;
  skillSource: string;
  skillDestination: string;
  pluginLink: string;
  pluginLinkAction: "created" | "repointed" | "kept";
  pluginsDir: string;
  markerFile: string;
  legacySkillRemoved: boolean;
  legacySkillKept: boolean;
}

export interface OpenCodeGlobalInstallOptions {
  /** Override the home directory (tests / clean-environment validation). */
  home?: string;
  /** Override the install root (defaults to the repo root resolved from this file). */
  installRoot?: string;
}

function sameFileContent(a: string, b: string): boolean {
  try {
    return fs.readFileSync(a).equals(fs.readFileSync(b));
  } catch {
    return false;
  }
}

function resolveLinkTarget(p: string): string | null {
  try {
    return fs.realpathSync(p);
  } catch {
    return null;
  }
}

/**
 * Registers raggai globally for OpenCode V2 without editing the user's
 * opencode.json(c): the OpenCode config directory auto-discovers
 * `~/.config/opencode/plugins/<dir>` (package directories with `exports`
 * are loaded like published packages) and `~/.config/opencode/skills/*.md`.
 */
export function installGlobalOpenCode(options: OpenCodeGlobalInstallOptions = {}): OpenCodeGlobalInstall {
  const home = options.home ?? os.homedir();
  const installRoot = path.resolve(options.installRoot ?? getRaggaiInstallRoot());
  const dist = path.join(installRoot, "dist", "index.js");
  const skillSource = path.join(installRoot, "rag-memory.md");

  if (!fs.existsSync(dist)) {
    throw new Error(`Build not found: ${dist}. Run the build (bun install.ts or bun run build:plugin) in the raggai installation first.`);
  }
  if (!fs.existsSync(skillSource)) {
    throw new Error(`Skill not found: ${skillSource}`);
  }

  // 1) Skill: canonical global discovery location (~/.config/opencode/skills).
  const skillsDir = path.join(home, ".config", "opencode", "skills");
  const skillDestination = path.join(skillsDir, "rag-memory.md");
  fs.mkdirSync(skillsDir, { recursive: true });
  fs.copyFileSync(skillSource, skillDestination);

  // 2) Plugin: package-directory symlink under the auto-discovered plugins/ dir.
  const pluginsDir = path.join(home, ".config", "opencode", "plugins");
  const pluginLink = path.join(pluginsDir, "opencode-hybrid-rag");
  fs.mkdirSync(pluginsDir, { recursive: true });
  let pluginLinkAction: OpenCodeGlobalInstall["pluginLinkAction"] = "created";
  let existing: fs.Stats | null = null;
  try {
    existing = fs.lstatSync(pluginLink);
  } catch {
    existing = null;
  }
  if (existing) {
    const target = resolveLinkTarget(pluginLink);
    if (existing.isSymbolicLink()) {
      // Repoint stale/foreign symlinks so reinstalls fix moved checkouts.
      if (target !== installRoot) {
        fs.unlinkSync(pluginLink);
        fs.symlinkSync(installRoot, pluginLink, "dir");
        pluginLinkAction = "repointed";
      } else {
        pluginLinkAction = "kept";
      }
    } else {
      throw new Error(
        `Plugin path already exists and is not a symlink we manage: ${pluginLink}. ` +
          `Remove it or move it aside, then re-run the install.`,
      );
    }
  } else {
    fs.symlinkSync(installRoot, pluginLink, "dir");
  }

  // 3) Marker file (kept for backward compatibility with older installs/init).
  const markerFile = path.join(home, ".opencode", "plugin", "raggai.json");
  fs.mkdirSync(path.dirname(markerFile), { recursive: true });
  fs.writeFileSync(
    markerFile,
    JSON.stringify(
      {
        plugin: dist,
        module_path: dist,
        install_root: installRoot,
        skill: skillDestination,
        plugins_dir: pluginsDir,
        plugin_link: pluginLink,
        installed_at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  // 4) Retire the legacy skill location (~/.opencode/skills) when we can prove it is ours.
  const legacySkill = path.join(home, ".opencode", "skills", "rag-memory.md");
  let legacySkillRemoved = false;
  let legacySkillKept = false;
  if (fs.existsSync(legacySkill)) {
    if (sameFileContent(legacySkill, skillSource)) {
      fs.unlinkSync(legacySkill);
      legacySkillRemoved = true;
    } else {
      legacySkillKept = true;
    }
  }

  return {
    installRoot,
    dist,
    skillSource,
    skillDestination,
    pluginLink,
    pluginLinkAction,
    pluginsDir,
    markerFile,
    legacySkillRemoved,
    legacySkillKept,
  };
}

export function describeOpenCodeGlobalInstall(result: OpenCodeGlobalInstall): string[] {
  const lines = [
    `Plugin (V2 auto-discovery): ${result.pluginLink} -> ${result.installRoot} (${result.pluginLinkAction})`,
    `Skill: ${result.skillDestination}`,
    `Marker: ${result.markerFile}`,
  ];
  if (result.legacySkillRemoved) lines.push("Legacy skill (~/.opencode/skills/rag-memory.md) removed — identical to current asset.");
  if (result.legacySkillKept) lines.push("Note: ~/.opencode/skills/rag-memory.md differs from the current asset; left in place.");
  return lines;
}

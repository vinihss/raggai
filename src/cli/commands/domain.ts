import { bootstrapDefaults, ensureDomain, loadDomainsRegistry, saveDomainsRegistry, resolveContext, getDomainDir } from "../../config/raggai-paths";
import * as fs from "fs";
import * as path from "path";

export async function domainCommand(sub: string | undefined, rest: string[]) {
  bootstrapDefaults();
  const reg = loadDomainsRegistry();
  switch (sub) {
    case "list":
    case "ls": {
      const rows = Object.values(reg.domains);
      if (!rows.length) { console.log("No domains."); return; }
      for (const d of rows) {
        const exists = fs.existsSync(d.path);
        console.log(`- ${d.name} (${d.type}) ${exists ? "" : "[missing]"}  ${d.path}`);
      }
      return;
    }
    case "create": {
      const name = rest[0];
      if (!name) throw new Error("Usage: raggai domain create <name>");
      ensureDomain(name, "custom");
      console.log(`Domain created: ${name}`);
      return;
    }
    case "use": {
      const name = rest[0];
      if (!name) throw new Error("Usage: raggai domain use <name>");
      if (!reg.domains[name]) ensureDomain(name, "custom");
      const { findProjectConfig, saveProjectConfig, loadGlobalConfig, saveGlobalConfig } = await import("../../config/raggai-paths");
      const proj = findProjectConfig();
      if (proj) {
        const include = Array.from(new Set([name, ...(proj.config.include || []), "global"]));
        saveProjectConfig(proj.dir, { ...proj.config, domain: name, include });
        console.log(`Active project domain updated: ${name} (${path.join(proj.dir, ".raggai/config.toml")})`);
      } else {
        const g = loadGlobalConfig();
        const overlay = Array.from(new Set([name, ...(g.overlay || []), "global"]));
        saveGlobalConfig({ ...g, defaultDomain: name, overlay });
        console.log(`Active global domain updated: ${name}`);
      }
      return;
    }
    case "delete": {
      const name = rest[0];
      const confirm = rest.includes("--confirm");
      if (!name) throw new Error("Usage: raggai domain delete <name> --confirm");
      if (name === "global") throw new Error("The global domain is protected.");
      if (!confirm) throw new Error("Destructive operation: add --confirm");
      const d = reg.domains[name];
      if (d && fs.existsSync(d.path)) fs.rmSync(d.path, { recursive: true, force: true });
      delete reg.domains[name];
      saveDomainsRegistry(reg);
      console.log(`Domain removed: ${name}`);
      return;
    }
    default:
      console.log("Usage: raggai domain <list|create|use|delete>");
  }
}

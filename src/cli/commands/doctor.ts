import * as fs from "fs";
import * as path from "path";
import { getRaggaiHome, bootstrapDefaults, loadDomainsRegistry, getDomainsRegistryPath, getGlobalConfigPath, resolveContext, getDomainDir } from "../../config/raggai-paths";
import { getRaggaiInstallRoot, resolveRaggaiAsset } from "../../config/install-root";

export async function doctorCommand(_args: string[]) {
  const { reg } = bootstrapDefaults();
  const ctx = resolveContext();
  const home = getRaggaiHome();
  const checks = [
    { name: "RAGGAI_HOME", ok: fs.existsSync(home), detail: home },
    { name: "config.toml", ok: fs.existsSync(getGlobalConfigPath()), detail: getGlobalConfigPath() },
    { name: "domains.toml", ok: fs.existsSync(getDomainsRegistryPath()), detail: getDomainsRegistryPath() },
    { name: "Global domain", ok: !!reg.domains["global"], detail: reg.domains["global"]?.path || "missing" },
  ];
  console.log("raggai doctor\n");
  for (const c of checks) console.log(`${c.ok ? "✓" : "✗"} ${c.name}: ${c.detail}`);
  const dist = resolveRaggaiAsset("dist/index.js");
  console.log(`${fs.existsSync(dist) ? "✓" : "✗"} Plugin build: ${dist}`);
  console.log(`Install root: ${getRaggaiInstallRoot()}`);
  console.log(`Domains: ${Object.keys(reg.domains).join(", ") || "(none)"}`);
  console.log(`Context: active=${ctx.activeDomain} overlay=[${ctx.overlay.join(", ")}] project=${ctx.project?.dir || "none"}`);
  for (const name of ctx.overlay) {
    const ddir = getDomainDir(name);
    const hasVec = fs.existsSync(path.join(ddir, "vector_store"));
    const hasGraph = fs.existsSync(path.join(ddir, "graph_store.json"));
    // A missing graph file is a valid state: the adapter treats it as an empty
    // graph and recreates it on first write.
    console.log(`  - ${name}: vector=${hasVec ? "ok" : "missing"} graph=${hasGraph ? "ok" : "empty"} (${ddir})`);
  }
}

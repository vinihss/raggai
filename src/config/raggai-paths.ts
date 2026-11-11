import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { parse as parseToml, stringify as stringifyToml } from "smol-toml";

export type DomainType = "global" | "project" | "custom";

export interface DomainEntry {
  name: string;
  type: DomainType;
  path: string; // absolute path to domain dir
  description?: string;
  createdAt?: string;
}

export interface DomainsRegistry {
  domains: Record<string, DomainEntry>;
  defaultDomain?: string;
}

export interface GlobalConfig {
  defaultDomain?: string;
  overlay?: string[]; // default overlay domains for search
  embeddingModel?: string;
  excludeDirs?: string[];
  excludePatterns?: string[]; // regex strings matched against basename/path
  embeddingCache?: boolean;
}

export interface ProjectConfig {
  domain?: string;
  include?: string[]; // overlay domains
  agent?: string;
  excludeDirs?: string[];
  excludePatterns?: string[];
  embeddingCache?: boolean;
}

export function getRaggaiHome(): string {
  const env = process.env.RAGGAI_HOME;
  if (env && env.trim()) return path.resolve(env);
  return path.join(os.homedir(), ".config", "raggai");
}

export function getGlobalConfigPath() { return path.join(getRaggaiHome(), "config.toml"); }
export function getDomainsRegistryPath() { return path.join(getRaggaiHome(), "domains.toml"); }
export function getDomainsDir() { return path.join(getRaggaiHome(), "domains"); }
export function getCacheDir() { return path.join(getRaggaiHome(), "cache"); }

export function ensureRaggaiHome() {
  const home = getRaggaiHome();
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(getDomainsDir(), { recursive: true });
  fs.mkdirSync(getCacheDir(), { recursive: true });
}

function readTomlFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, "utf-8");
    return (parseToml(raw) as unknown as T) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeTomlFile(filePath: string, data: any) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, stringifyToml(data), "utf-8");
}

export function loadGlobalConfig(): GlobalConfig {
  return readTomlFile<GlobalConfig>(getGlobalConfigPath(), { defaultDomain: "global", overlay: ["global"] });
}

export function saveGlobalConfig(cfg: GlobalConfig) {
  writeTomlFile(getGlobalConfigPath(), cfg);
}

export function loadDomainsRegistry(): DomainsRegistry {
  const reg = readTomlFile<DomainsRegistry>(getDomainsRegistryPath(), { domains: {} });
  if (!reg.domains) reg.domains = {};
  return reg;
}

export function saveDomainsRegistry(reg: DomainsRegistry) {
  writeTomlFile(getDomainsRegistryPath(), reg);
}

export function getDomainDir(domainName: string): string {
  const reg = loadDomainsRegistry();
  const entry = reg.domains[domainName];
  if (entry?.path) return entry.path;
  return path.join(getDomainsDir(), domainName);
}

export function getVectorDir(domainName: string): string {
  return path.join(getDomainDir(domainName), "vector_store");
}

export function getGraphFile(domainName: string): string {
  return path.join(getDomainDir(domainName), "graph_store.json");
}

export function ensureDomain(domainName: string, type: DomainType = "custom", description?: string): DomainEntry {
  ensureRaggaiHome();
  if (!/^[a-zA-Z0-9._-]+$/.test(domainName)) throw new Error(`Invalid domain name: ${domainName}`);
  const reg = loadDomainsRegistry();
  const dir = path.join(getDomainsDir(), domainName);
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, "vector_store"), { recursive: true });
  const entry: DomainEntry = reg.domains[domainName] || {
    name: domainName,
    type,
    path: dir,
    description,
    createdAt: new Date().toISOString(),
  };
  entry.path = dir;
  entry.type = type;
  if (description) entry.description = description;
  reg.domains[domainName] = entry;
  if (!reg.defaultDomain) reg.defaultDomain = "global";
  saveDomainsRegistry(reg);
  return entry;
}

export function bootstrapDefaults() {
  ensureRaggaiHome();
  const reg = loadDomainsRegistry();
  if (!reg.domains["global"]) {
    ensureDomain("global", "global", "Global/universal domain");
  } else {
    ensureDomain("global", "global", reg.domains["global"].description);
  }
  const cfg = loadGlobalConfig();
  if (!fs.existsSync(getGlobalConfigPath())) saveGlobalConfig({ defaultDomain: "global", overlay: ["global"], ...cfg });
  if (!fs.existsSync(getDomainsRegistryPath())) saveDomainsRegistry(reg);
  return { cfg: loadGlobalConfig(), reg: loadDomainsRegistry() };
}

export function findProjectConfig(startDir?: string): { dir: string; config: ProjectConfig } | null {
  let dir = path.resolve(startDir || process.cwd());
  const root = path.parse(dir).root;
  while (true) {
    const p = path.join(dir, ".raggai", "config.toml");
    if (fs.existsSync(p)) {
      return { dir, config: readTomlFile<ProjectConfig>(p, {}) };
    }
    if (dir === root) break;
    dir = path.dirname(dir);
  }
  return null;
}

export function saveProjectConfig(projectDir: string, cfg: ProjectConfig) {
  const p = path.join(projectDir, ".raggai", "config.toml");
  writeTomlFile(p, cfg);
}

export function slugifyDomainName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "project";
}

export function resolveContext(cwd?: string) {
  bootstrapDefaults();
  const project = findProjectConfig(cwd);
  const globalCfg = loadGlobalConfig();
  const envDomain = process.env.RAGGAI_DOMAIN;
  const envDomains = process.env.RAGGAI_DOMAINS?.split(",").map(s=>s.trim()).filter(Boolean);
  const activeDomain = envDomain || project?.config.domain || globalCfg.defaultDomain || "global";
  const overlay = envDomains && envDomains.length ? envDomains : (project?.config.include || globalCfg.overlay || [activeDomain, "global"].filter((v,i,a)=>a.indexOf(v)===i));
  const excludeDirs = Array.from(new Set([...(globalCfg.excludeDirs||[]), ...(project?.config.excludeDirs||[])]));
  const excludePatterns = Array.from(new Set([...(globalCfg.excludePatterns||[]), ...(project?.config.excludePatterns||[])]));
  const embeddingCache = project?.config.embeddingCache ?? globalCfg.embeddingCache ?? true;
  return { project, globalCfg, activeDomain, overlay: Array.from(new Set(overlay)), home: getRaggaiHome(), excludeDirs, excludePatterns, embeddingCache };
}

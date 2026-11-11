import * as fs from "fs";
import * as path from "path";

const DEFAULT_EXCLUDE_DIRS = new Set(["node_modules", ".git", "dist", "data", ".opencode", ".idea", "build", "coverage", ".next", ".turbo", ".cache"]);
const DEFAULT_EXCLUDE_FILES = [/\.env(\.|$)/i, /secret/i, /credential/i, /\.pem$/i, /\.key$/i, /id_rsa/i, /\.sqlite$/i, /\.db$/i, /token/i];

export interface WalkOptions {
  exts?: Set<string>;
  excludeDirs?: string[];
  excludePatterns?: string[];
}

function compilePatterns(patterns?: string[]): RegExp[] {
  const out: RegExp[] = [];
  for (const p of patterns || []) {
    try { out.push(new RegExp(p, "i")); } catch {}
  }
  return out;
}

export function isSensitivePath(p: string, extraPatterns?: RegExp[]): boolean {
  const base = path.basename(p);
  const all = [...DEFAULT_EXCLUDE_FILES, ...(extraPatterns || [])];
  return all.some(r => r.test(base) || r.test(p));
}

export function shouldExcludeDir(name: string, extraDirs?: Set<string>): boolean {
  return DEFAULT_EXCLUDE_DIRS.has(name) || !!extraDirs?.has(name);
}

export function assertSafePath(inputPath: string, allowedBase?: string): string {
  const resolved = path.resolve(inputPath);
  if (inputPath.includes("\0")) throw new Error("Invalid path");
  if (allowedBase) {
    const base = path.resolve(allowedBase);
    if (resolved !== base && !resolved.startsWith(base + path.sep)) {
      throw new Error(`Path outside allowed directory: ${resolved}`);
    }
  }
  return resolved;
}

export function walkFiles(root: string, opts?: WalkOptions): string[] {
  const out: string[] = [];
  const exts = opts?.exts;
  const extraDirs = opts?.excludeDirs?.length ? new Set(opts.excludeDirs) : undefined;
  const extraPatterns = compilePatterns(opts?.excludePatterns);
  const st = fs.statSync(root);
  if (st.isFile()) {
    const fp = path.resolve(root);
    if (isSensitivePath(fp, extraPatterns)) return [];
    const ext = path.basename(fp).split(".").pop()?.toLowerCase() || "";
    if (exts && !exts.has(ext)) return [];
    return [fp];
  }
  const walk = (dir: string) => {
    let entries: fs.Dirent[] = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const fp = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (shouldExcludeDir(e.name, extraDirs)) continue;
        walk(fp);
      } else if (e.isFile()) {
        if (isSensitivePath(fp, extraPatterns)) continue;
        const ext = e.name.split(".").pop()?.toLowerCase() || "";
        if (exts && !exts.has(ext)) continue;
        out.push(fp);
      }
    }
  };
  walk(path.resolve(root));
  return out;
}

export function walkCodeFiles(root: string, opts?: Omit<WalkOptions, "exts">): string[] {
  return walkFiles(root, { ...opts, exts: new Set(["ts","tsx","js","jsx","py","go","rs","json","yaml","yml","css","md","toml","sql","sh","java","rb","php","c","cpp","h","cs"]) });
}

export function walkMarkdownFiles(root: string, opts?: Omit<WalkOptions, "exts">): string[] {
  return walkFiles(root, { ...opts, exts: new Set(["md"]) });
}

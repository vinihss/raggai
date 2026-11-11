import * as path from "path";

export function sanitizeDomainName(name: string): string {
  const n = (name || "").trim();
  if (!n || !/^[a-zA-Z0-9._-]+$/.test(n)) throw new Error(`Invalid domain name: ${name}`);
  if (n === "." || n === ".." || n.includes("/") || n.includes("\\")) throw new Error(`Invalid domain name: ${name}`);
  return n;
}

export function assertSafeInputPath(input: string): string {
  const resolved = path.resolve(input);
  // basic: must exist check done by caller when needed; prevent obvious null bytes
  if (input.includes("\0")) throw new Error("Invalid path");
  return resolved;
}

export function assertSafeOutputPath(out: string, baseDir = process.cwd()): string {
  const base = path.resolve(baseDir);
  const resolved = path.resolve(out);
  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    throw new Error(`Output path outside allowed directory: ${resolved}`);
  }
  return resolved;
}

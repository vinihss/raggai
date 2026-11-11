import * as path from "path";
import * as fs from "fs";

export function getRaggaiInstallRoot(): string {
  // src/config/install-root.ts -> repo root
  const fromHere = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
  if (fs.existsSync(path.join(fromHere, "package.json"))) return fromHere;
  return process.cwd();
}

export function resolveRaggaiAsset(...segments: string[]): string {
  return path.join(getRaggaiInstallRoot(), ...segments);
}

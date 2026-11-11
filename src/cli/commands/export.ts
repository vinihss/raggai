import * as fs from "fs";
import * as path from "path";
import { resolveContext, getGraphFile, ensureDomain, getDomainDir } from "../../config/raggai-paths";
import { createContainer } from "../../config/container";

function getFlag(args: string[], name: string): string | undefined { const i=args.indexOf(name); return i>=0?args[i+1]:undefined; }

export async function exportCommand(sub: string | undefined, rest: string[]) {
  const args = [sub, ...rest].filter(Boolean) as string[];
  const target = args[0];
  if (!target) throw new Error("Usage: raggai export <name|all> [--format json|md|graph-html|audit|bundle] [--out <path>]");
  const ctx = resolveContext();
  const domain = target === "all" ? (ctx.activeDomain || "global") : target;
  const format = getFlag(args, "--format") || "graph-html";
  const out = getFlag(args, "--out");
  ensureDomain(domain, domain === "global" ? "global" : "custom");

  if (format === "graph-html") {
    const c = createContainer(domain);
    const outPath = path.resolve(out || `./data/export-${domain}-graph.html`);
    c.graphPort.exportInteractiveHtml(outPath);
    console.log(`Exported graph HTML: ${outPath}`);
    return;
  }
  if (format === "audit" || format === "md") {
    const c = createContainer(domain);
    const audit = c.graphPort.auditAndExportTree();
    const outPath = path.resolve(out || `./data/export-${domain}-audit.md`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const body = format === "md"
      ? `# Domain export: ${domain}\n\n## Report\n${audit.relatorio}\n\n## Tree\n\`\`\`text\n${audit.arvoreVisual}\n\`\`\`\n`
      : `# Audit ${domain}\n\n${audit.relatorio}\n\n\`\`\`text\n${audit.arvoreVisual}\n\`\`\`\n`;
    fs.writeFileSync(outPath, body);
    console.log(`Exported ${format}: ${outPath}`);
    return;
  }
  if (format === "json") {
    const gf = getGraphFile(domain);
    const outPath = path.resolve(out || `./data/export-${domain}-graph.json`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    if (fs.existsSync(gf)) fs.copyFileSync(gf, outPath); else fs.writeFileSync(outPath, "{}");
    console.log(`Exported JSON: ${outPath}`);
    return;
  }
  if (format === "bundle") {
    const outDir = path.resolve(out || `./data/export-${domain}-bundle`);
    fs.mkdirSync(outDir, { recursive: true });
    const gf = getGraphFile(domain);
    if (fs.existsSync(gf)) fs.copyFileSync(gf, path.join(outDir, "graph_store.json"));
    const c = createContainer(domain);
    const audit = c.graphPort.auditAndExportTree();
    fs.writeFileSync(path.join(outDir, "audit.md"), `# Audit ${domain}\n\n${audit.relatorio}\n\n\`\`\`text\n${audit.arvoreVisual}\n\`\`\`\n`);
    c.graphPort.exportInteractiveHtml(path.join(outDir, "graph.html"));
    fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify({ domain, exportedAt: new Date().toISOString(), sourceDir: getDomainDir(domain) }, null, 2));
    console.log(`Exported bundle: ${outDir}`);
    return;
  }
  throw new Error(`Unsupported format: ${format}`);
}

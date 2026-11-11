import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { createContainer } from "../../config/container";
import { resolveContext, ensureDomain, getDomainDir } from "../../config/raggai-paths";
import { chunkCodebase, chunkTextWithOverlap } from "../../domain/services/text-splitter";
import { graphIngestForFile, emptyGraphIngestMetrics, addGraphIngestMetrics, formatGraphIngestMetrics } from "../../domain/services/graph-ingest";
import { walkCodeFiles, walkMarkdownFiles } from "../../config/fs-utils";

function getFlag(args: string[], name: string): string | undefined { const i=args.indexOf(name); return i>=0?args[i+1]:undefined; }
const hash = (s:string)=>crypto.createHash("sha256").update(s).digest("hex");
const manifestPath = (d:string)=>path.join(getDomainDir(d), "index-manifest.json");
const loadManifest = (d:string):Record<string,string>=>{ try{return JSON.parse(fs.readFileSync(manifestPath(d),"utf-8"));}catch{return{}} };
const saveManifest = (d:string,m:Record<string,string>)=>{ fs.mkdirSync(getDomainDir(d),{recursive:true}); fs.writeFileSync(manifestPath(d), JSON.stringify(m,null,2)); };

export async function importCommand(sub: string | undefined, rest: string[]) {
  const t0 = Date.now();
  const args = [sub, ...rest].filter(Boolean) as string[];
  const target = args[0];
  if (!target) throw new Error("Usage: raggai import <path> [--domain <name>] [--mode notes|code|auto] [--force]");
  const ctx = resolveContext();
  const domain = getFlag(args, "--domain") || ctx.activeDomain || "global";
  const mode = getFlag(args, "--mode") || "auto";
  const force = args.includes("--force");
  ensureDomain(domain, domain === "global" ? "global" : "custom");
  const c = createContainer(domain);
  const p = path.resolve(target);
  if (!fs.existsSync(p)) throw new Error(`Path not found: ${p}`);
  const stat = fs.statSync(p);
  const manifest = loadManifest(domain);
  const walkOpts = { excludeDirs: ctx.excludeDirs, excludePatterns: ctx.excludePatterns };
  let count=0, processed=0, skipped=0, pruned=0, deleteFailures=0;
  let tScan=0, tEmbed=0, tWrite=0, tPrune=0;
  const graphStats = emptyGraphIngestMetrics();

  const batchSize = 16;
  async function embedAndSave(items: Array<{ text: string; saveText: string; meta: Record<string, unknown> }>) {
    if (!items.length) return;
    const texts = items.map(i => i.text);
    const e0 = Date.now();
    const vecs = c.embeddingPort.generateMany ? await c.embeddingPort.generateMany(texts, { batchSize }) : await Promise.all(texts.map(t => c.embeddingPort.generate(t)));
    tEmbed += Date.now() - e0;
    const w0 = Date.now();
    for (let i = 0; i < items.length; i++) {
      await c.vectorPort.save({ id: crypto.randomUUID(), text: items[i].saveText, embedding: vecs[i], meta: items[i].meta });
      count++;
    }
    tWrite += Date.now() - w0;
  }
  async function safeDeletePath(fp: string) {
    if (!c.vectorPort.deleteByPath) return;
    try {
      const r: any = await c.vectorPort.deleteByPath(fp);
      if (r && r.deleted === false) deleteFailures++;
    } catch { deleteFailures++; }
  }

  if (mode === "notes" || (mode === "auto" && (stat.isFile() ? p.endsWith(".md") : true))) {
    const s0 = Date.now();
    const files = stat.isFile() ? [p] : walkMarkdownFiles(p, walkOpts);
    tScan += Date.now() - s0;
    const seen = new Set(files);
    for (const f of files) {
      const content = fs.readFileSync(f, "utf-8"); const h = hash(content);
      if (!force && manifest[f] === h) { skipped++; continue; }
      if (manifest[f]) await safeDeletePath(f);
      const chunks = chunkTextWithOverlap(content);
      const items = chunks.map(chunk => ({ text: chunk, saveText: `[Note: ${path.basename(f)}] ${chunk}`, meta: { type: "note", path: f, fileHash: h } as Record<string, unknown> }));
      await embedAndSave(items);
      addGraphIngestMetrics(graphStats, graphIngestForFile(c.graphPort, c.extractionPort, { kind: "note", path: f, text: content, hash: h }));
      manifest[f]=h; processed++;
    }
    const p0 = Date.now();
    for (const old of Object.keys(manifest)) {
      if (old.startsWith(p) && !seen.has(old) && !fs.existsSync(old)) {
        await safeDeletePath(old);
        const g = c.graphPort.removeFactsBySource(old);
        graphStats.prunedEdges += g.removedEdges; graphStats.prunedNodes += g.removedNodes;
        delete manifest[old]; pruned++;
      }
    }
    tPrune += Date.now() - p0;
    saveManifest(domain, manifest);
    c.embeddingPort.flushCache?.();
    const cacheStats = c.embeddingPort.getCacheStats?.();
    const cacheInfo = cacheStats ? `, cache hits=${cacheStats.hits} misses=${cacheStats.misses}` : "";
    const delInfo = deleteFailures ? `, delete_fail=${deleteFailures}` : "";
    console.log(`Import (notes): ${files.length} files, ${processed} updated, ${skipped} unchanged, ${pruned} orphans removed, ${count} chunks${formatGraphIngestMetrics(graphStats)} [domain ${domain}] in ${Date.now()-t0}ms${cacheInfo}${delInfo} (scan ${tScan}ms, embed ${tEmbed}ms, write ${tWrite}ms, prune ${tPrune}ms)`);
    return;
  }

  const s0 = Date.now();
  const files = stat.isFile() ? [p] : walkCodeFiles(p, walkOpts);
  tScan += Date.now() - s0;
  const seen = new Set(files);
  for (const f of files) {
    try {
      const content = fs.readFileSync(f, "utf-8"); const h = hash(content);
      if (!force && manifest[f] === h) { skipped++; continue; }
      if (manifest[f]) await safeDeletePath(f);
      const chunks = chunkCodebase(content, f);
      const items = chunks.map(chunk => ({ text: chunk, saveText: chunk, meta: { type: "code", path: f, fileHash: h } as Record<string, unknown> }));
      await embedAndSave(items);
      addGraphIngestMetrics(graphStats, graphIngestForFile(c.graphPort, c.extractionPort, { kind: "code", path: f, text: content, hash: h, language: f.split(".").pop() }));
      manifest[f]=h; processed++;
    } catch {}
  }
  const p0 = Date.now();
  for (const old of Object.keys(manifest)) {
    if (old.startsWith(p) && !seen.has(old) && !fs.existsSync(old)) {
      await safeDeletePath(old);
      const g = c.graphPort.removeFactsBySource(old);
      graphStats.prunedEdges += g.removedEdges; graphStats.prunedNodes += g.removedNodes;
      delete manifest[old]; pruned++;
    }
  }
  tPrune += Date.now() - p0;
  saveManifest(domain, manifest);
  c.embeddingPort.flushCache?.();
  const cacheStats = c.embeddingPort.getCacheStats?.();
  const cacheInfo = cacheStats ? `, cache hits=${cacheStats.hits} misses=${cacheStats.misses}` : "";
  const delInfo = deleteFailures ? `, delete_fail=${deleteFailures}` : "";
  console.log(`Import (code): ${files.length} files, ${processed} updated, ${skipped} unchanged, ${pruned} orphans removed, ${count} chunks${formatGraphIngestMetrics(graphStats)} [domain ${domain}] in ${Date.now()-t0}ms${cacheInfo}${delInfo} (scan ${tScan}ms, embed ${tEmbed}ms, write ${tWrite}ms, prune ${tPrune}ms)`);
}

import { tool } from "@opencode-ai/plugin";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { createContainer } from "@/config/container.ts";
import { resolveContext, ensureDomain, getDomainDir } from "@/config/raggai-paths.ts";
import { chunkCodebase, chunkTextWithOverlap } from "@/domain/services/text-splitter.ts";
import { graphIngestForFile, emptyGraphIngestMetrics, addGraphIngestMetrics } from "@/domain/services/graph-ingest.ts";
import { embedAndSaveChunks } from "@/domain/services/ingest-embed.ts";
import { DeterministicExtractionAdapter } from "@/adapters/outbound/extraction/deterministic.extraction.ts";
import { XenovaAdapter } from "@/adapters/outbound/transformers/xenova.adapter.ts";
import { LanceDBAdapter } from "@/adapters/outbound/lancedb/lancedb.adapter.ts";
import { JsonGraphAdapter } from "@/adapters/outbound/graphology/json-graph.adapter.ts";
import { walkCodeFiles, walkMarkdownFiles } from "@/config/fs-utils.ts";

let sharedEmbedding: XenovaAdapter | null = null;
function getEmbedding() {
  if (!sharedEmbedding) {
    const ctx = resolveContext();
    sharedEmbedding = new XenovaAdapter({ cache: ctx.embeddingCache ?? true, cacheName: "global" });
  }
  return sharedEmbedding;
}
const sharedExtraction = new DeterministicExtractionAdapter();
function getDomainContainer(domain: string) {
  const emb = getEmbedding();
  return { embeddingPort: emb, vectorPort: new LanceDBAdapter(emb, { domain }), graphPort: new JsonGraphAdapter({ domain }), extractionPort: sharedExtraction, domain };
}
function hashContent(s: string) { return crypto.createHash("sha256").update(s).digest("hex"); }
function manifestPath(domain: string) { return path.join(getDomainDir(domain), "index-manifest.json"); }
function loadManifest(domain: string): Record<string,string> { try { return JSON.parse(fs.readFileSync(manifestPath(domain),"utf-8")); } catch { return {}; } }
function saveManifest(domain: string, m: Record<string,string>) { fs.mkdirSync(getDomainDir(domain),{recursive:true}); fs.writeFileSync(manifestPath(domain), JSON.stringify(m,null,2)); }

export const consult_memory_personal = tool({
  name: "consult_memory_personal",
  description: "Hybrid search: vector (LanceDB) + graph (keywords) across project/global overlay",
  inputSchema: { type: "object", properties: { query: { type: "string" }, keywords: { type: "array", items: { type: "string" } } }, required: ["query"] },
  execute: async ({ query, keywords }: any) => {
    const ctx = resolveContext();
    const domains = ctx.overlay.length ? ctx.overlay : [ctx.activeDomain];
    const emb = getEmbedding();
    const qEmb = await emb.generate(query);
    let graphResults: string[] = [];
    let vectorResults: string[] = [];
    const all = await Promise.all(domains.map(async (d) => {
      ensureDomain(d, d === "global" ? "global" : "custom");
      const c = getDomainContainer(d);
      const hits = await c.vectorPort.search(qEmb, 4);
      const kws = (keywords && keywords.length ? keywords : query.split(/\s+/).filter((w:string)=>w.length>3).slice(0,3));
      let g: string[] = [];
      for (const kw of kws) g = g.concat(c.graphPort.searchConnections(kw).map(x=>`[${d}] ${x}`));
      return { d, hits, g };
    }));
    const mergedHits = all.flatMap(x => x.hits.map((h:any)=>({ ...h, domain: x.d }))).sort((a,b)=>(b.score||0)-(a.score||0)).slice(0, 6);
    vectorResults = mergedHits.map((h:any)=>`[${h.domain}|${h.meta?.type||""}|${h.meta?.path||""}|${((h.score||0)*100).toFixed(1)}%] ${h.meta?.text ?? h.id}`);
    graphResults = all.flatMap(x=>x.g);
    return { dados_grafo: graphResults, dados_vetor: vectorResults, domains };
  },
}) as any;

export const memorize_personal_fact = tool({
  name: "memorize_personal_fact",
  description: "Stores structured fact + text in active project domain",
  inputSchema: { type: "object", properties: { rawText: { type: "string" }, entity: { type: "string" }, relation: { type: "string" }, target: { type: "string" } }, required: ["rawText"] },
  execute: async ({ rawText, entity, relation, target }: any) => {
    const t0 = Date.now();
    try {
      const ctx = resolveContext();
      const d = ctx.activeDomain;
      ensureDomain(d, d === "global" ? "global" : "project");
      const c = getDomainContainer(d);
      await c.vectorPort.save({ id: crypto.randomUUID(), text: rawText, embedding: await c.embeddingPort.generate(rawText), meta: { type: "general", path: "none" } });
      if (entity && relation && target) c.graphPort.upsertFacts([{ subject: entity, predicate: relation, object: target, confidence: 1, method: "manual" }]);
      c.embeddingPort.flushCache?.();
      return { status: "Success", domain: d, timing_ms: Date.now()-t0, embedding_cache: c.embeddingPort.getCacheStats?.() || undefined };
    } catch (e: any) { return { status: "Error", detail: e.message }; }
  },
}) as any;

export const import_markdown_notes = tool({
  name: "import_markdown_notes",
  description: ".md ingestion with overlap + auto graph into active domain (incremental by hash)",
  inputSchema: { type: "object", properties: { targetPath: { type: "string" } }, required: ["targetPath"] },
  execute: async ({ targetPath }: any) => {
    const t0 = Date.now();
    const pResolved = path.resolve(targetPath);
    if (!fs.existsSync(pResolved)) return { error: "Path not found" };
    const ctx = resolveContext(); const d = ctx.activeDomain; ensureDomain(d, d === "global" ? "global" : "project");
    const c = getDomainContainer(d); const manifest = loadManifest(d);
    const files = fs.statSync(pResolved).isFile() && pResolved.endsWith(".md") ? [pResolved] : walkMarkdownFiles(pResolved, { excludeDirs: ctx.excludeDirs, excludePatterns: ctx.excludePatterns });
    const seen = new Set(files);
    let processed=0, skipped=0, chunksTotal=0, pruned=0, deleteFailures=0;
    const graphStats = emptyGraphIngestMetrics();
    const safeDelete = async (fp:string)=>{ if(!c.vectorPort.deleteByPath) return; try{ const r:any=await c.vectorPort.deleteByPath(fp); if(r&&r.deleted===false) deleteFailures++; }catch{ deleteFailures++; } };
    const embedSave = async (items: Array<{text:string, saveText:string, meta:any}>) => {
      const r = await embedAndSaveChunks(c, items);
      chunksTotal += r.count;
    };
    for (const f of files) {
      const content = fs.readFileSync(f,"utf-8"); const h = hashContent(content);
      if (manifest[f] === h) { skipped++; continue; }
      if (manifest[f]) await safeDelete(f);
      const chunks = chunkTextWithOverlap(content);
      await embedSave(chunks.map(chunk => ({ text: chunk, saveText: `[Note: ${path.basename(f)}] ${chunk}`, meta: { type: "note", path: f, fileHash: h } })));
      addGraphIngestMetrics(graphStats, graphIngestForFile(c.graphPort, c.extractionPort, { kind: "note", path: f, text: content, hash: h }));
      manifest[f]=h; processed++;
    }
    for (const old of Object.keys(manifest)) {
      if (old.startsWith(pResolved) && !seen.has(old) && !fs.existsSync(old)) { await safeDelete(old); const g = c.graphPort.removeFactsBySource(old); graphStats.prunedEdges += g.removedEdges; graphStats.prunedNodes += g.removedNodes; delete manifest[old]; pruned++; }
    }
    saveManifest(d, manifest);
    c.embeddingPort.flushCache?.();
    return { status: "Success", domain: d, files_processed: processed, files_skipped: skipped, blocks_indexed: chunksTotal, orphans_pruned: pruned, delete_failures: deleteFailures, graph: graphStats, timing_ms: Date.now()-t0, embedding_cache: c.embeddingPort.getCacheStats?.() || undefined };
  },
}) as any;

export const index_local_codebase = tool({
  name: "index_local_codebase",
  description: "Indexes source code into active domain (incremental by hash)",
  inputSchema: { type: "object", properties: { repoPath: { type: "string" } }, required: ["repoPath"] },
  execute: async ({ repoPath }: any) => {
    const t0 = Date.now();
    const pAbsoluto = path.resolve(repoPath);
    if (!fs.existsSync(pAbsoluto)) return { error: "Path not found" };
    const ctx = resolveContext(); const d = ctx.activeDomain; ensureDomain(d, d === "global" ? "global" : "project");
    const c = getDomainContainer(d); const manifest = loadManifest(d);
    const files = walkCodeFiles(pAbsoluto, { excludeDirs: ctx.excludeDirs, excludePatterns: ctx.excludePatterns });
    const seen = new Set(files);
    let total=0, processed=0, skipped=0, pruned=0, deleteFailures=0;
    const graphStats = emptyGraphIngestMetrics();
    const safeDelete = async (fp:string)=>{ if(!c.vectorPort.deleteByPath) return; try{ const r:any=await c.vectorPort.deleteByPath(fp); if(r&&r.deleted===false) deleteFailures++; }catch{ deleteFailures++; } };
    const embedSave = async (items: Array<{text:string, saveText:string, meta:any}>) => {
      const r = await embedAndSaveChunks(c, items);
      total += r.count;
    };
    for (const f of files) {
      try {
        const content = fs.readFileSync(f,"utf-8"); const h = hashContent(content);
        if (manifest[f] === h) { skipped++; continue; }
        if (manifest[f]) await safeDelete(f);
        const chunks = chunkCodebase(content, f);
        await embedSave(chunks.map(chunk => ({ text: chunk, saveText: chunk, meta: { type: "code", path: f, fileHash: h } })));
        addGraphIngestMetrics(graphStats, graphIngestForFile(c.graphPort, c.extractionPort, { kind: "code", path: f, text: content, hash: h, language: f.split(".").pop() }));
        manifest[f]=h; processed++;
      } catch {}
    }
    for (const old of Object.keys(manifest)) {
      if (old.startsWith(pAbsoluto) && !seen.has(old) && !fs.existsSync(old)) { await safeDelete(old); const g = c.graphPort.removeFactsBySource(old); graphStats.prunedEdges += g.removedEdges; graphStats.prunedNodes += g.removedNodes; delete manifest[old]; pruned++; }
    }
    saveManifest(d, manifest);
    c.embeddingPort.flushCache?.();
    return { status: "Success", domain: d, files_processed: processed, files_skipped: skipped, blocks_indexed: total, orphans_pruned: pruned, delete_failures: deleteFailures, graph: graphStats, timing_ms: Date.now()-t0, embedding_cache: c.embeddingPort.getCacheStats?.() || undefined };
  },
}) as any;

export const search_semantic_codebase = tool({
  name: "search_semantic_codebase",
  description: "Semantic code search across overlay domains",
  inputSchema: { type: "object", properties: { query: { type: "string" }, limit: { type: "number", default: 4 } }, required: ["query"] },
  execute: async ({ query, limit = 4 }: any) => {
    const ctx = resolveContext(); const domains = ctx.overlay.length ? ctx.overlay : [ctx.activeDomain]; const emb = getEmbedding(); const qEmb = await emb.generate(query);
    const all = await Promise.all(domains.map(async (d)=>{ ensureDomain(d,d==="global"?"global":"custom"); const c=getDomainContainer(d); const hits=await c.vectorPort.search(qEmb, limit); return hits.filter((h:any)=>h.meta?.type==="code").map((h:any)=>({ ...h, domain:d })); }));
    const merged = all.flat().sort((a:any,b:any)=>(b.score||0)-(a.score||0)).slice(0, limit);
    return { context_recovered: merged.map((h: any, i: number) => ({ result_number: i + 1, file_path: h.meta?.path ?? "", relevance: `${((h.score ?? 0) * 100).toFixed(2)}%`, domain: h.domain, code_snippet: h.meta?.text ?? h.id })) };
  },
}) as any;

export const audit_and_visualize_graph = tool({
  name: "audit_and_visualize_graph",
  description: "Cleans orphan nodes + structured tree report for active domain",
  inputSchema: { type: "object", properties: {} },
  execute: async () => {
    const ctx = resolveContext(); const d = ctx.activeDomain; const c = getDomainContainer(d);
    const { relatorio, arvoreVisual } = c.graphPort.auditAndExportTree();
    const out = path.join(getDomainDir(d), "auditoria_grafo.md");
    fs.writeFileSync(out, `# Audit ${d}\n${relatorio}\n\`\`\`text\n${arvoreVisual}\n\`\`\``, "utf-8");
    return { domain: d, report: relatorio, visualization: arvoreVisual, path: out };
  },
}) as any;

export const export_visual_graph_map = tool({
  name: "export_visual_graph_map",
  description: "Exports interactive 2D HTML map for active domain",
  inputSchema: { type: "object", properties: {} },
  execute: async () => {
    const ctx = resolveContext(); const d = ctx.activeDomain; const c = getDomainContainer(d);
    const out = path.join(getDomainDir(d), "mapa_interativo.html");
    c.graphPort.exportInteractiveHtml(out);
    return { status: "Success", domain: d, path: out };
  },
}) as any;

export const reset_local_memory = tool({
  name: "reset_local_memory",
  description: "Deletes indexes for active domain (Vector + Graph) — requires confirm: true",
  inputSchema: { type: "object", properties: { confirm: { type: "boolean" } }, required: ["confirm"] },
  execute: async ({ confirm }: any) => {
    if (!confirm) return { error: "Not authorized." };
    const ctx = resolveContext(); const d = ctx.activeDomain; const c = getDomainContainer(d);
    await c.vectorPort.clear(); c.graphPort.clear();
    try { fs.unlinkSync(manifestPath(d)); } catch {}
    return { status: "Success", domain: d };
  },
}) as any;

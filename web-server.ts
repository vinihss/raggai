import { listVersions, addSnapshot, resetToSnapshot } from "./src/config/versions.ts";
import { resolveContext, getVectorDir, getGraphFile, loadDomainsRegistry, ensureDomain } from "./src/config/raggai-paths.ts";
import * as fs from "fs";
import * as path from "path";
import * as lancedb from "@lancedb/lancedb";

let containerCache = new Map<string, Promise<any>>();
async function getContainer(domain?: string) {
  const ctx = resolveContext();
  const d = domain || ctx.activeDomain || "global";
  if (!containerCache.has(d)) {
    containerCache.set(d, import("./src/config/container.ts").then(m => m.createContainer(d)));
  }
  return containerCache.get(d)!;
}

function readGraphRaw(domain?: string) {
  const ctx = resolveContext();
  const d = domain || ctx.activeDomain || "global";
  const file = getGraphFile(d);
  if (!fs.existsSync(file)) return { nodes: [], edges: [] };
  try { return JSON.parse(fs.readFileSync(file, "utf-8")); } catch { return { nodes: [], edges: [] }; }
}

async function listVectorRecords(domain?: string, limit = 50, offset = 0, type?: string, q?: string) {
  try {
    const ctx = resolveContext();
    const d = domain || ctx.activeDomain || "global";
    const dir = getVectorDir(d);
    if (!fs.existsSync(dir)) return { records: [], total: 0, domain: d, limit, offset, filter: { type: type ?? null, q: q ?? null } };
    const db = await lancedb.connect(dir);
    const table = await db.openTable("memoria_vetorial");
    const esc = (s: string) => s.replace(/'/g, "''");
    const clauses: string[] = [];
    if (type) clauses.push(`type = '${esc(type)}'`);
    if (q) clauses.push(`text LIKE '%${esc(q)}%'`);
    const where = clauses.length ? clauses.join(" AND ") : undefined;
    let total: number | null = null;
    try {
      total = where ? await (table as any).countRows(where) : await (table as any).countRows();
    } catch {
      try {
        if (where) {
          // Fallback: count matching ids in JS (bounded to 100k rows).
          const ids = await (table as any).query().select(["text"]).where(where).limit(100000).toArray();
          total = ids.length;
        } else {
          total = await (table as any).countRows();
        }
      } catch { total = null; }
    }
    let query = (table as any).query().select(["text", "type", "path"]);
    if (where) query = query.where(where);
    const rows = await query.offset(offset).limit(limit).toArray();
    const records = rows.map((r: any, i: number) => ({
      idx: offset + i + 1,
      text: r.text || "",
      type: r.type || "unknown",
      path: r.path || "",
    }));
    return { records, total, limit, offset, domain: d, filter: { type: type ?? null, q: q ?? null } };
  } catch (e: any) {
    return { records: [], total: null, error: e?.message || String(e), domain, limit, offset };
  }
}

async function getDomainStats(domain: string) {
  const g = readGraphRaw(domain);
  let vectorCount: number | null = null;
  let vectorStoreExists = false;
  try {
    const dir = getVectorDir(domain);
    vectorStoreExists = fs.existsSync(dir);
    if (vectorStoreExists) {
      const db = await lancedb.connect(dir);
      const table = await db.openTable("memoria_vetorial");
      if (typeof (table as any).countRows === "function") vectorCount = await (table as any).countRows();
      else if (typeof (table as any).count_rows === "function") vectorCount = await (table as any).count_rows();
    }
  } catch {}
  return {
    domain,
    vectorStoreExists,
    vectorCount,
    graph: { nodes: (g.nodes||[]).length, edges: (g.edges||[]).length },
  };
}

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: { ...headers, "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
    }
    try {
      const ctx = resolveContext();
      const domainParam = url.searchParams.get("domain") || undefined;

      if (req.method === "GET" && url.pathname === "/api/status") {
        const versions = listVersions();
        const reg = loadDomainsRegistry();
        const d = domainParam || ctx.activeDomain;
        const stats = await getDomainStats(d);
        const all = url.searchParams.get("all") === "1";
        let domainsStats: any = undefined;
        if (all) {
          domainsStats = await Promise.all(Object.keys(reg.domains || {}).map(name => getDomainStats(name)));
        }
        return Response.json({
          activeLayer: d,
          overlay: ctx.overlay,
          domains: Object.keys(reg.domains || {}),
          project: ctx.project ? { dir: ctx.project.dir, domain: ctx.project.config?.domain ?? null } : null,
          totalVersions: versions.length,
          versions,
          graph: stats.graph,
          vectorStoreExists: stats.vectorStoreExists,
          vectorCount: stats.vectorCount,
          domainsStats,
        }, { headers });
      }

      if (req.method === "GET" && url.pathname === "/api/snapshots") return Response.json(listVersions(), { headers });

      if (req.method === "POST" && url.pathname === "/api/snapshot") {
        const body = await req.json().catch(() => ({}));
        return Response.json({ versionId: addSnapshot(body.description || "Automatic snapshot"), success: true }, { headers });
      }

      if (req.method === "POST" && url.pathname === "/api/rollback") {
        const body = await req.json().catch(() => ({}));
        if (!body.versionId) return Response.json({ error: "versionId required" }, { status: 400, headers });
        return Response.json({ success: resetToSnapshot(body.versionId) }, { headers });
      }

      if (req.method === "GET" && url.pathname === "/api/domains") {
        return Response.json(loadDomainsRegistry(), { headers });
      }

      if (req.method === "GET" && url.pathname === "/api/graph") {
        const g = readGraphRaw(domainParam);
        const nodes = (g.nodes || []).map((n: any) => ({ id: n.key, ...(n.attributes||{}) }));
        const edges = (g.edges || []).map((e: any) => ({ id: e.key, from: e.source, to: e.target, ...(e.attributes||{}) }));
        return Response.json({ nodes, edges, domain: domainParam || ctx.activeDomain }, { headers });
      }

      if (req.method === "GET" && url.pathname === "/api/graph/audit") {
        const c = await getContainer(domainParam);
        return Response.json(c.graphPort.auditAndExportTree(), { headers });
      }

      if (req.method === "POST" && url.pathname === "/api/graph/export") {
        const body = await req.json().catch(() => ({}));
        const safeOut = body.out ? path.resolve(body.out) : path.resolve(`./data/mapa_interativo-${domainParam || ctx.activeDomain}.html`);
        const allowed = path.resolve(".");
        if (safeOut !== allowed && !safeOut.startsWith(allowed + path.sep)) {
          return Response.json({ error: "Output path outside allowed directory" }, { status: 400, headers });
        }
        const c = await getContainer(domainParam);
        c.graphPort.exportInteractiveHtml(safeOut);
        return Response.json({ success: true, path: safeOut }, { headers });
      }

      if (req.method === "GET" && url.pathname === "/api/records") {
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
        const offset = parseInt(url.searchParams.get("offset") || "0");
        const type = url.searchParams.get("type") || undefined;
        const q = url.searchParams.get("q") || undefined;
        return Response.json(await listVectorRecords(domainParam, limit, offset, type, q), { headers });
      }

      if (req.method === "POST" && url.pathname === "/api/search") {
        const body = await req.json().catch(() => ({}));
        const query = body.query || "";
        const keywords: string[] = body.keywords || [];
        const limit = body.limit || 8;
        const domains: string[] = body.domains || ctx.overlay || [ctx.activeDomain];
        if (!query && keywords.length === 0) return Response.json({ error: "query or keywords required" }, { status: 400, headers });

        const results = await Promise.all(domains.map(async (d) => {
          try {
            ensureDomain(d, d === "global" ? "global" : "custom");
            const c = await getContainer(d);
            let vector: any[] = [];
            let graph: string[] = [];
            if (query) {
              const emb = await c.embeddingPort.generate(query);
              const hits = await c.vectorPort.search(emb, limit);
              vector = hits.map((h: any) => ({ text: h.meta?.text || h.id, score: h.score, relevance: `${(h.score * 100).toFixed(1)}%`, path: h.meta?.path, type: h.meta?.type, domain: d }));
            }
            const kws = keywords.length ? keywords : query.split(/\s+/).filter(w=>w.length>3).slice(0,3);
            for (const kw of kws) graph = graph.concat(c.graphPort.searchConnections(kw).map((g:string)=>`[${d}] ${g}`));
            return { domain: d, vector, graph };
          } catch (e: any) {
            return { domain: d, vector: [], graph: [], error: e?.message || String(e) };
          }
        }));

        const mergedVector = results.flatMap(r => r.vector).sort((a,b)=>b.score-a.score).slice(0, limit);
        const mergedGraph = results.flatMap(r => r.graph);
        return Response.json({ vector: mergedVector, graph: mergedGraph, byDomain: results }, { headers });
      }

      return new Response("Not Found", { status: 404, headers });
    } catch (e: any) {
      return Response.json({ error: e?.message || String(e) }, { status: 500, headers });
    }
  },
});

console.log(`API running at http://localhost:${server.port}`);

import { resolveContext, ensureDomain } from "../../config/raggai-paths";
import { createContainer } from "../../config/container";

function getFlag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}
function hasFlag(args: string[], name: string) { return args.includes(name); }

export async function searchCommand(sub: string | undefined, rest: string[]) {
  const t0 = Date.now();
  const args = [sub, ...rest].filter(Boolean) as string[];
  const json = hasFlag(args, "--json");
  const query = args.find(a => !a.startsWith("--") && (args.indexOf(a) === 0 || !["--domain","--domains","--limit","--keywords"].includes(args[args.indexOf(a)-1] || ""))) || args[0] || "";
  const domain = getFlag(args, "--domain");
  const domainsArg = getFlag(args, "--domains");
  const limit = parseInt(getFlag(args, "--limit") || "5", 10);
  const keywordsArg = getFlag(args, "--keywords");
  if (!query) throw new Error('Usage: raggai search "query" [--domain d] [--domains a,b] [--limit N] [--json]');
  const ctx = resolveContext();
  const domains = domainsArg ? domainsArg.split(",").map(s=>s.trim()).filter(Boolean) : (domain ? [domain] : (ctx.overlay.length ? ctx.overlay : [ctx.activeDomain]));
  const keywords = keywordsArg ? keywordsArg.split(",").map(s=>s.trim()).filter(Boolean) : [];

  const { XenovaAdapter } = await import("../../adapters/outbound/transformers/xenova.adapter");
  const { LanceDBAdapter } = await import("../../adapters/outbound/lancedb/lancedb.adapter");
  const { JsonGraphAdapter } = await import("../../adapters/outbound/graphology/json-graph.adapter");
  const embPort = new XenovaAdapter({ cache: ctx.embeddingCache ?? true, cacheName: "global" });
  const qEmb = await embPort.generate(query);

  const results = await Promise.all(domains.map(async (d) => {
    ensureDomain(d, d === "global" ? "global" : "custom");
    const vectorPort = new LanceDBAdapter(embPort, { domain: d });
    const graphPort = new JsonGraphAdapter({ domain: d });
    const hits = await vectorPort.search(qEmb, limit);
    let graph: string[] = [];
    const kws = keywords.length ? keywords : query.split(/\s+/).filter(w=>w.length>3).slice(0,3);
    for (const kw of kws) graph = graph.concat(graphPort.searchConnections(kw).map(g => `[${d}] ${g}`));
    return { domain: d, vector: hits.map((h: any) => ({ score: h.score, relevance: `${(h.score*100).toFixed(1)}%`, path: h.meta?.path, type: h.meta?.type, text: h.meta?.text || h.id })) , graph };
  }));
  const merged = results.flatMap(r => r.vector.map(v => ({ ...v, domain: r.domain }))).sort((a,b)=>b.score-a.score).slice(0, limit);
  embPort.flushCache?.();
  const cacheStats = embPort.getCacheStats?.() || null;
  const out = { query, domains, vector: merged, graph: results.flatMap(r => r.graph), timingMs: Date.now() - t0, cache: cacheStats };
  if (json) { console.log(JSON.stringify(out, null, 2)); return; }
  const cinfo = cacheStats ? `, cache hits=${cacheStats.hits} misses=${cacheStats.misses}` : "";
  console.log(`Results for: "${query}" (domains: ${domains.join(", ")}, ${out.timingMs}ms${cinfo})\n`);
  for (const v of out.vector) console.log(`- [${v.relevance}] (${v.domain}) ${v.path || v.type || ""}\n  ${(v.text||"").slice(0,200).replace(/\n/g," ")}\n`);
  if (out.graph.length) { console.log("Graph:"); for (const g of out.graph) console.log(`  ${g}`); }
}

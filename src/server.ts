import { generateEmbedding, getVectorTable, LocalGraph } from "./index";

const graph = new LocalGraph();

console.log("🚀 Servidor de Memória Híbrida iniciando na porta 3000...");

Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/query" && req.method === "POST") {
      const { query, keywords } = await req.json() as any;
      let graphResults: string[] = [];
      if (keywords?.length) keywords.forEach((kw: string) => graphResults = graphResults.concat(graph.searchConnections(kw)));
      let vectorResults: string[] = [];
      try {
        const table = await getVectorTable();
        const qv = await generateEmbedding(query);
        const hits = await table.search(qv).distanceType("cosine").limit(5).toArray() as any[];
        vectorResults = hits.map(h => h.text);
      } catch (e) { console.error("Erro vetor:", e); }
      return Response.json({ graph: graphResults, vector: vectorResults, instrucao: "Sintetize com precisão." });
    }
    if (url.pathname === "/save" && req.method === "POST") {
      const { rawText, entity, relation, target } = await req.json() as any;
      try { const table = await getVectorTable(); await table.add([{ vector: await generateEmbedding(rawText), text: rawText, type: "general", path: "manual" }]); } catch (e) { console.error("Falha vetorial:", e); }
      if (entity && relation && target) graph.addFact(entity, relation, target);
      return Response.json({ status: "Sucesso", mensagem: "Memória guardada." });
    }
    return new Response("Not Found", { status: 404 });
  }
});

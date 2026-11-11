// view_memory.ts
import { audit_and_visualize_graph, export_visual_graph_map } from "./src/index";
import * as path from "path";

async function gerarVisualizacao() {
  console.log("🧠 Alimentando o Grafo via plugin...");
  console.log("\n=== AUDITORIA ===");
  const auditoria = await audit_and_visualize_graph.execute({});
  console.log("✅ Relatório de auditoria salvo em ./data/auditoria_grafo.md");

  console.log("🌐 Gerando mapa interativo 2D...");
  const mapa = await export_visual_graph_map.execute({});
  console.log(`✅ Mapa HTML exportado com sucesso para: ${mapa.caminho}`);
}

gerarVisualizacao().catch(console.error);

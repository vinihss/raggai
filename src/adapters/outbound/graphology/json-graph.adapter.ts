import * as fs from "fs";
import Graph from "graphology";
import * as path from "path";
import type { GraphStorePort } from "../../ports/outbound/graph-store.port.ts";

const GRAPH_FILE = path.resolve("./data/graph_store.json");

function getLevenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = new Array(a.length + 1).fill(0);
    matrix[i][0] = i;
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export class JsonGraphAdapter implements GraphStorePort {
  private graph: Graph;

  constructor() {
    this.graph = new Graph();
    this.load();
  }

  private validateAndFindEntity(name: string): string {
    const cleanName = name.trim();
    if (!cleanName) return "EntidadeVazia";
    const normalizedTarget = cleanName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    for (const node of this.graph.nodes()) {
      const normalizedNode = node
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      if (normalizedTarget === normalizedNode) return node;
      if (
        cleanName.length > 4 &&
        getLevenshteinDistance(cleanName.toLowerCase(), node.toLowerCase()) <= 2
      ) {
        return node;
      }
    }
    return cleanName;
  }

  addFact(source: string, relation: string, target: string) {
    const validSource = this.validateAndFindEntity(source);
    const validTarget = this.validateAndFindEntity(target);
    const validRelation = relation.trim().toLowerCase().replace(/\s+/g, "_");
    if (!this.graph.hasNode(validSource)) this.graph.addNode(validSource);
    if (!this.graph.hasNode(validTarget)) this.graph.addNode(validTarget);
    const edgeKey = `${validSource}-${validRelation}-${validTarget}`;
    if (!this.graph.hasEdge(edgeKey)) {
      this.graph.addEdgeWithKey(edgeKey, validSource, validTarget, { relation: validRelation });
    }
    this.save();
  }

  searchConnections(keyword: string): string[] {
    if (!this.graph.hasNode(keyword)) return [];
    return this.graph.neighbors(keyword).map((neighbor) => {
      const edgeKey = this.graph.edge(keyword, neighbor);
      if (!edgeKey) return `Facto Estruturado: [${keyword}] -> (?) -> [${neighbor}]`;
      const attrs = this.graph.getEdgeAttributes(edgeKey);
      return `Facto Estruturado: [${keyword}] -> (${attrs?.relation ?? "?"}) -> [${neighbor}]`;
    }).filter(Boolean) as string[];
  }

  auditAndExportTree(): { relatorio: string; arvoreVisual: string } {
    let nosRemovidos = 0;
    this.graph.nodes().forEach((node) => {
      if (this.graph.degree(node) === 0) {
        this.graph.dropNode(node);
        nosRemovidos++;
      }
    });
    if (nosRemovidos > 0) this.save();
    let visualTree = "=== ÁRVORE DE AUDITORIA DO GRAFO ===\n\n";
    const visited = new Set<string>();
    const roots = this.graph
      .nodes()
      .sort((a, b) => this.graph.outDegree(b) - this.graph.outDegree(a));
    roots.forEach((root) => {
      if (!visited.has(root)) {
        visualTree += `📁 [${root}]\n`;
        visited.add(root);
        const edges = this.graph.outEdges(root);
        edges.forEach((edge, index) => {
          const target = this.graph.target(edge);
          const attrs = this.graph.getEdgeAttributes(edge);
          visualTree += `${index === edges.length - 1 ? "└── " : "├── "}──(${attrs.relation})──> 📄 [${target}]\n`;
          visited.add(target);
        });
        visualTree += "\n";
      }
    });
    return {
      relatorio: `Nós órfãos removidos: ${nosRemovidos}. Ativos: ${this.graph.order()}.\n`,
      arvoreVisual: visualTree,
    };
  }

  exportInteractiveHtml(outputPath: string) {
    const colorMap = {
      pessoa: { bg: "#a6e3a1", border: "#94e2d5" },
      tarefa: { bg: "#89b4fa", border: "#74c7ec" },
      projeto: { bg: "#cba6f7", border: "#f38ba8" },
      geral: { bg: "#fab387", border: "#f9e2af" },
    };
    const inferType = (n: string) => {
      const s = n.toLowerCase();
      if (["maria", "joao", "antonio", "chefe"].some((p) => s.includes(p))) return "pessoa";
      if (["treino", "reuniao", "estudar", "fazer"].some((t) => s.includes(t))) return "tarefa";
      if (["projeto", "opencode", "rag"].some((pr) => s.includes(pr))) return "projeto";
      return "geral";
    };
    const nodes = this.graph.nodes().map((node) => {
      const t = inferType(node);
      return {
        id: node,
        label: node,
        shape: "dot",
        size: t === "projeto" ? 25 : 20,
        color: { background: colorMap[t].bg, border: colorMap[t].border },
        font: { color: "#11111b", size: 14 },
      };
    });
    const edges = this.graph.edges().map((e) => ({
      from: this.graph.source(e),
      to: this.graph.target(e),
      label: this.graph.getEdgeAttributes(e).relation,
      arrows: "to",
      font: { align: "top", color: "#a6adc8", size: 11, background: "rgba(30,30,46,0.7)" },
      color: { color: "#585b70", highlight: "#f38ba8" },
    }));
    const html = `<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8"><title>Grafo Híbrido</title><script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script><style>body { margin:0; background:#1e1e2e; color:#cdd6f4; font-family:sans-serif; } #mynetwork { width:100vw; height:100vh; background:#181825; } #panel { position:absolute; top:15px; left:15px; z-index:10; background:rgba(30,30,46,0.95); padding:15px; border-radius:12px; border:1px solid #45475a; } .box { width:100%; padding:8px; background:#313244; border:1px solid #45475a; border-radius:6px; color:#cdd6f4; outline:none; }</style></head><body><div id="panel"><h1>Memória do Agente</h1><input type="text" id="sb" class="box" placeholder="Filtrar..." oninput="f()"/></div><div id="mynetwork"></div><script>const oNodes=${JSON.stringify(nodes)}, oEdges=${JSON.stringify(edges)}, nDS=new vis.DataSet(oNodes), eDS=new vis.DataSet(oEdges), net=new vis.Network(document.getElementById('mynetwork'), {nodes:nDS, edges:eDS}, {physics:{stabilization:{iterations:150}}}); function f(){ const s=document.getElementById('sb').value.toLowerCase().trim(); if(!s){ nDS.update(oNodes); eDS.clear(); eDS.add(oEdges); return; } const m=oNodes.filter(n=>n.id.toLowerCase().includes(s)).map(n=>n.id), v=new Set(m), e=[]; oEdges.forEach(eg=>{ if(v.has(eg.from)||v.has(eg.to)){ e.push(eg); v.add(eg.from); v.add(eg.to); } }); nDS.update(oNodes.map(n=>({...n, hidden: !v.has(n.id)}))); eDS.clear(); eDS.add(e); }</script></body></html>`;
    fs.writeFileSync(outputPath, html, "utf-8");
  }

  clear() {
    this.graph.clear();
    if (fs.existsSync(GRAPH_FILE)) fs.unlinkSync(GRAPH_FILE);
  }

  private save() {
    fs.writeFileSync(GRAPH_FILE, JSON.stringify(this.graph.export(), null, 2));
  }
  private load() {
    if (fs.existsSync(GRAPH_FILE)) {
      try {
        this.graph.import(JSON.parse(fs.readFileSync(GRAPH_FILE, "utf-8")));
      } catch {
        /* vazio */
      }
    }
  }
}

import * as fs from 'fs';
import * as path from 'path';
import { tool } from "@opencode-ai/plugin";
import { pipeline } from '@xenova/transformers';
import * as lancedb from "@lancedb/lancedb";
import { glob } from "glob";
import Graph from 'graphology';

// =========================================================================
// CONFIGURAÇÕES DE DIRETÓRIOS E CONSTANTES
// =========================================================================
const DATA_DIR = path.resolve('./data');
const GRAPH_FILE = path.join(DATA_DIR, 'graph_store.json');
const VECTOR_DIR = path.join(DATA_DIR, 'vector_store');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// =========================================================================
// 1. CAMADA DE EMBEDDINGS (100% Local via Transformers.js na CPU)
// =========================================================================
let embedder: any = null;

async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedder;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const pipe = await getEmbedder();
  const output = await pipe(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

// =========================================================================
// 2. CAMADA VETORIAL (LanceDB Local)
// =========================================================================
let vectorTable: lancedb.Table | null = null;

export async function getVectorTable() {
  if (!vectorTable) {
    const db = await lancedb.connect(VECTOR_DIR);
    try {
      vectorTable = await db.openTable("memoria_vetorial");
    } catch {
      const dummyEmbedding = await generateEmbedding("init");
      vectorTable = await db.createTable("memoria_vetorial", [
        { vector: dummyEmbedding, text: "Inicialização do sistema", type: "system", path: "none" }
      ]);
    }
  }
  return vectorTable;
}

// =========================================================================
// 3. AUXILIARES DE PROCESSAMENTO: CHUNKING & DISTÂNCIA FUZZY
// =========================================================================

function getLevenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
  }
  return matrix[b.length][a.length];
}

const LANGUAGE_RULES: Record<string, { startMarkers: RegExp[]; endMarkers: string[] }> = {
  bracketBased: {
    startMarkers: [/export\s+(const|class|function|interface)/, /class\s+\w+/, /(public|private|protected|async)\s+/, /function\s+\w+/],
    endMarkers: ["}", "};"]
  },
  py: {
    startMarkers: [/^def\s+\w+/, /^class\s+\w+/, /^@\w+/],
    endMarkers: ["#", "def ", "class "]
  },
  compiled: {
    startMarkers: [/^func\s+/, /^fn\s+/, /^pub\s+fn\s+/, /^type\s+\w+\s+struct/],
    endMarkers: ["}"]
  }
};

export function chunkCodebase(fileContent: string, filePath: string): string[] {
  const lines = fileContent.split('
');
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase().replace('.', '');

  let ruleType = "bracketBased";
  if (["py"].includes(ext)) ruleType = "py";
  if (["go", "rs"].includes(ext)) ruleType = "compiled";
  
  if (["json", "yaml", "yml", "toml", "md", "css"].includes(ext)) {
    for (let i = 0; i < lines.length; i += 40) {
      const slice = lines.slice(i, i + 45);
      chunks.push(`[Ficheiro: ${fileName}] [Config/Estático]\n${slice.join('\n')}`);
    }
    return chunks;
  }

  const rules = LANGUAGE_RULES[ruleType];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    const isNewComponent = rules.startMarkers.some(regex => regex.test(trimmedLine));

    if (isNewComponent && currentChunk.length >= 20) {
      chunks.push(`[Ficheiro: ${fileName}] [Linguagem: ${ext}] [Linhas: ${i - currentChunk.length + 1}-${i}]\n${currentChunk.join('\n')}`);
      currentChunk = currentChunk.slice(-4);
    }
    currentChunk.push(line);

    if (ruleType !== "py") {
      const isEndMarker = rules.endMarkers.includes(trimmedLine) || currentChunk.length >= 80;
      if (isEndMarker && currentChunk.length >= 15) {
        chunks.push(`[Ficheiro: ${fileName}] [Linguagem: ${ext}] [Linhas: ${i - currentChunk.length + 1}-${i}]\n${currentChunk.join('\n')}`);
        currentChunk = [];
      }
    } else if (currentChunk.length >= 60) {
      chunks.push(`[Ficheiro: ${fileName}] [Python] [Linhas: ${i - currentChunk.length + 1}-${i}]\n${currentChunk.join('\n')}`);
      currentChunk = [];
    }
  }
  if (currentChunk.length > 0) {
    chunks.push(`[Ficheiro: ${fileName}] [Linguagem: ${ext}]\n${currentChunk.join('\n')}`);
  }
  return chunks;
}

export function chunkTextWithOverlap(text: string, chunkSize = 120, overlap = 25): string[] {
  const words = text.trim().split(/\s+/);
  const chunks: string[] = [];
  if (words.length <= chunkSize) return [text];
  let i = 0;
  while (i < words.length) {
    const end = Math.min(i + chunkSize, words.length);
    chunks.push(words.slice(i, end).join(" "));
    i += (chunkSize - overlap);
  }
  return chunks;
}

// =========================================================================
// 4. CLASSE DO GRAFO DE CONHECIMENTO (Graphology)
// =========================================================================
export class LocalGraph {
  private graph: Graph;

  constructor() {
    this.graph = new Graph();
    this.load();
  }

  private validateAndFindEntity(name: string): string {
    const cleanName = name.trim();
    if (!cleanName) return "EntidadeVazia";
    const normalizedTarget = cleanName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const existingNodes = this.graph.nodes();

    for (const node of existingNodes) {
      const normalizedNode = node.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (normalizedTarget === normalizedNode) return node;
      if (cleanName.length > 4 && getLevenshteinDistance(cleanName.toLowerCase(), node.toLowerCase()) <= 2) {
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
    return this.graph.neighbors(keyword).map(neighbor => {
      const edge = this.graph.edge(keyword, neighbor);
      const attrs = this.graph.getEdgeAttributes(edge!);
      return `Facto Estruturado: [${keyword}] -> (\${attrs.relation}) -> [\${neighbor}]`;
    });
  }

  auditAndExportTree(): { relatorio: string; arvoreVisual: string } {
    let nosRemovidos = 0;
    this.graph.nodes().forEach(node => {
      if (this.graph.degree(node) === 0) {
        this.graph.dropNode(node);
        nosRemovidos++;
      }
    });
    if (nosRemovidos > 0) this.save();

    let visualTree = "=== ÁRVORE DE AUDITORIA DO GRAFO ===\n\n";
    const visited = new Set<string>();
    const roots = this.graph.nodes().sort((a, b) => this.graph.outDegree(b) - this.graph.outDegree(a));

    roots.forEach(root => {
      if (!visited.has(root)) {
        visualTree += `📁 [\${root}]\n`;
        visited.add(root);
        const edges = this.graph.outEdges(root);
        edges.forEach((edge, index) => {
          const target = this.graph.target(edge);
          const attrs = this.graph.getEdgeAttributes(edge);
          visualTree += `\${index === edges.length - 1 ? "└── " : "├── "}──(\${attrs.relation})──> 📄 [\${target}]\n`;
          visited.add(target);
        });
        visualTree += "\n";
      }
    });
    return { relatorio: `Nós órfãos removidos: \${nosRemovidos}. Ativos: \${this.graph.order()}.\n`, arvoreVisual: visualTree };
  }

  exportInteractiveHtml(outputPath: string) {
    const colorMap = {
      pessoa: { bg: "#a6e3a1", border: "#94e2d5" },
      tarefa: { bg: "#89b4fa", border: "#74c7ec" },
      projeto: { bg: "#cba6f7", border: "#f38ba8" },
      geral: { bg: "#fab387", border: "#f9e2af" }
    };
    const inferType = (n: string) => {
      const s = n.toLowerCase();
      if (["maria","joao","antonio","chefe"].some(p=>s.includes(p))) return "pessoa";
      if (["treino","reuniao","estudar","fazer"].some(t=>s.includes(t))) return "tarefa";
      if (["projeto","opencode","rag"].some(pr=>s.includes(pr))) return "projeto";
      return "geral";
    };

    const nodes = this.graph.nodes().map(node => {
      const t = inferType(node);
      return { id: node, label: node, shape: "dot", size: t==="projeto"?25:20, color: { background: colorMap[t].bg, border: colorMap[t].border }, font: { color: "#11111b", size: 14 } };
    });
    const edges = this.graph.edges().map(e => ({
      from: this.graph.source(e), to: this.graph.target(e), label: this.graph.getEdgeAttributes(e).relation, arrows: "to",
      font: { align: "top", color: "#a6adc8", size: 11, background: "rgba(30,30,46,0.7)" }, color: { color: "#585b70", highlight: "#f38ba8" }
    }));

    const html = `<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8"><title>Grafo Híbrido</title><script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script><style>body { margin:0; background:#1e1e2e; color:#cdd6f4; font-family:sans-serif; } #mynetwork { width:100vw; height:100vh; background:#181825; } #panel { position:absolute; top:15px; left:15px; z-index:10; background:rgba(30,30,46,0.95); padding:15px; border-radius:12px; border:1px solid #45475a; } .box { width:100%; padding:8px; background:#313244; border:1px solid #45475a; border-radius:6px; color:#cdd6f4; outline:none; }</style></head><body><div id="panel"><h1>Memória do Agente</h1><input type="text" id="sb" class="box" placeholder="Filtrar..." oninput="f()"/></div><div id="mynetwork"></div><script>const oNodes=\${JSON.stringify(nodes)}, oEdges=\${JSON.stringify(edges)}, nDS=new vis.DataSet(oNodes), eDS=new vis.DataSet(oEdges), net=new vis.Network(document.getElementById('mynetwork'), {nodes:nDS, edges:eDS}, {physics:{stabilization:{iterations:150}}}); function f(){ const s=document.getElementById('sb').value.toLowerCase().trim(); if(!s){ nDS.update(oNodes); eDS.clear(); eDS.add(oEdges); return; } const m=oNodes.filter(n=>n.id.toLowerCase().includes(s)).map(n=>n.id), v=new Set(m), e=[]; oEdges.forEach(eg=>{ if(v.has(eg.from)||v.has(eg.to)){ e.push(eg); v.add(eg.from); v.add(eg.to); } }); nDS.update(oNodes.map(n=>({...n, hidden: !v.has(n.id)}))); eDS.clear(); eDS.add(e); }</script></body></html>`;
    fs.writeFileSync(outputPath, html, 'utf-8');
  }

  private save() { fs.writeFileSync(GRAPH_FILE, JSON.stringify(this.graph.export(), null, 2)); }
  private load() { if (fs.existsSync(GRAPH_FILE)) { try { this.graph.import(JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf-8'))); } catch {} } }
}

const localGraph = new LocalGraph();

// =========================================================================
// 5. EXPORTAÇÃO COMPLETA DO CATÁLOGO DE FERRAMENTAS (Tools Nativas)
// =========================================================================

export const consultar_memoria_pessoal = tool({
  name: "consultar_memoria_pessoal",
  description: "Busca combinada no banco vetorial (semântica) e no grafo (relações exatas) para apoio ao contexto do utilizador.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Frase ou pergunta de busca semântica." },
      keywords: { type: "array", items: { type: "string" }, description: "Termos exatos para varrer o grafo." }
    },
    required: ["query"]
  },
  execute: async ({ query, keywords }) => {
    let graphResults: string[] = [];
    if (keywords) keywords.forEach(kw => { graphResults = graphResults.concat(localGraph.searchConnections(kw)); });
    
    let vectorResults: string[] = [];
    try {
      const table = await getVectorTable();
      const hits = await table.search(await generateEmbedding(query)).distanceType("cosine").limit(4).toArray();
      vectorResults = hits.map((h: any) => h.text);
    } catch {}
    return { dados_grafo: graphResults, dados_vetor: vectorResults };
  }
});

export const memorizar_facto_pessoal = tool({
  name: "memorizar_facto_pessoal",
  description: "Grava um novo facto textual no vetor e opcionalmente uma relação explícita estruturada no grafo.",
  inputSchema: {
    type: "object",
    properties: {
      rawText: { type: "string", description: "Texto corrido para indexação semântica." },
      entity: { type: "string" }, relation: { type: "string" }, target: { type: "string" }
    },
    required: ["rawText"]
  },
  execute: async ({ rawText, entity, relation, target }) => {
    try {
      const table = await getVectorTable();
      await table.add([{ vector: await generateEmbedding(rawText), text: rawText, type: "general", path: "none" }]);
      if (entity && relation && target) localGraph.addFact(entity, relation, target);
      return { status: "Sucesso" };
    } catch (e: any) { return { status: "Erro", detalhe: e.message }; }
  }
});

export const importar_notas_markdown = tool({
  name: "importar_notas_markdown",
  description: "Ingere notas em ficheiros Markdown locais aplicando fatiamento com sobreposição e extração relacional.",
  inputSchema: {
    type: "object",
    properties: { targetPath: { type: "string", description: "Caminho da pasta ou do ficheiro .md." } },
    required: ["targetPath"]
  },
  execute: async ({ targetPath }) => {
    const pResolved = path.resolve(targetPath);
    if (!fs.existsSync(pResolved)) return { erro: "Caminho inexistente" };
    
    const table = await getVectorTable();
    const processFile = async (f: string) => {
      const content = fs.readFileSync(f, 'utf-8');
      const chunks = chunkTextWithOverlap(content);
      for (const chunk of chunks) {
        await table.add([{ vector: await generateEmbedding(chunk), text: `[Nota: \${path.basename(f)}] \${chunk}`, type: "note", path: f }]);
      }
      content.split('\n').forEach(line => {
        const m = line.match(/-\s*\[(.*?)\]\s+(.*?)\s+\[(.*?)\]/);
        if (m) localGraph.addFact(m[1], m[2], m[3]);
      });
    };

    if (fs.statSync(pResolved).isFile() && pResolved.endsWith('.md')) {
      await processFile(pResolved);
    } else {
      const files = glob.sync(`\${pResolved}/**/*.md`);
      for (const f of files) await processFile(f);
    }
    return { status: "Sucesso" };
  }
});

export const importar_codebase_local = tool({
  name: "importar_codebase_local",
  description: "Varre pastas de código-fonte aplicando o algoritmo de chunking poliglota e indexando blocos no LanceDB.",
  inputSchema: {
    type: "object",
    properties: { repoPath: { type: "string", description: "Caminho da pasta da codebase." } },
    required: ["repoPath"]
  },
  execute: async ({ repoPath }) => {
    const table = await getVectorTable();
    const files = glob.sync(`\${path.resolve(repoPath)}/**/*.{ts,js,py,go,rs,json,yaml,css}`, { ignore: '**/node_modules/**' });
    let total = 0;

    for (const f of files) {
      const chunks = chunkCodebase(fs.readFileSync(f, 'utf-8'), f);
      for (const chunk of chunks) {
        await table.add([{ vector: await generateEmbedding(chunk), text: chunk, type: "code", path: f }]);
        total++;
      }
    }
    return { ficheiros_processados: files.length, blocos_vetorizados: total };
  }
});

// Alias estrito para manter paridade absoluta com a assinatura registrada no raggai
export const indexar_codebase_local = importar_codebase_local;

export const buscar_semantica_codebase = tool({
  name: "buscar_semantica_codebase",
  description: "Filtro Pré-LLM: Localiza trechos lógicos de código por intenção na base indexada usando cosseno.",
  inputSchema: {
    type: "object",
    properties: { query: { type: "string" }, limit: { type: "number", default: 4 } },
    required: ["query"]
  },
  execute: async ({ query, limit = 4 }) => {
    const table = await getVectorTable();
    const hits = await table.search(await generateEmbedding(query)).distanceType("cosine").where("type = 'code'").limit(limit).toArray();
    return {
      contexto_recuperado: hits.map((h: any, i: number) => ({
        resultado_numero: i + 1, caminho_ficheiro: h.path, grau_relevancia: `\${((1 - h._distance) * 100).toFixed(2)}%`, trecho_codigo: h.text
      }))
    };
  }
});

export const auditar_e_visualizar_grafo = tool({
  name: "auditar_e_visualizar_grafo",
  description: "Limpador de nós órfãos e exportador de relatório hierárquico estruturado em árvore de texto.",
  inputSchema: { type: "object", properties: {} },
  execute: async () => {
    const { relatorio, arvoreVisual } = localGraph.auditAndExportTree();
    fs.writeFileSync(path.resolve('./data/auditoria_grafo.md'), `# Auditoria\n\${relatorio}\n\`\`\`text\n\${arvoreVisual}\`\`\``, 'utf-8');
    return { relatorio, visualizacao: arvoreVisual };
  }
});

export const exportar_mapa_visual_grafo = tool({
  name: "exportar_mapa_visual_grafo",
  description: "Gera a árvore de rede interativa 2D HTML com grupos de cores e barra de filtragem em tempo real.",
  inputSchema: { type: "object", properties: {} },
  execute: async () => {
    const out = path.resolve('./data/mapa_interativo.html');
    localGraph.exportInteractiveHtml(out);
    return { status: "Sucesso", caminho: out };
  }
});

export const resetar_memoria_local = tool({
  name: "resetar_memoria_local",
  description: "Purga física e permanente de todos os índices do LanceDB e ficheiros relacionais do grafo.",
  inputSchema: {
    type: "object",
    properties: { confirmar: { type: "boolean", description: "Confirmação estrita de purga dos dados." } },
    required: ["confirmar"]
  },
  execute: async ({ confirmar }) => {
    if (!confirmar) return { erro: "Ação não autorizada." };
    if (fs.existsSync(VECTOR_DIR)) fs.rmSync(VECTOR_DIR, { recursive: true, force: true });
    if (fs.existsSync(GRAPH_FILE)) fs.unlinkSync(GRAPH_FILE);
    return { status: "Sucesso", joke: "Índices destruídos." };
  }
});
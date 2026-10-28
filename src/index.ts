// RAG Híbrido Local - OpenCode (COM MELHORIAS DO extras-rag.md)
import * as fs from 'fs';
import * as path from 'path';
import { tool } from "@opencode-ai/plugin";
import { pipeline } from '@xenova/transformers';
import * as lancedb from "@lancedb/lancedb";
import Graph from 'graphology';

const DATA_DIR = path.resolve('./data');
const GRAPH_FILE = path.join(DATA_DIR, 'graph_store.json');
const VECTOR_DIR = path.join(DATA_DIR, 'vector_store');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// === #3 CHUNKING COM OVERLAP ===
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

export function chunkTextWithOverlap(text: string, chunkSize = 150, overlap = 30): string[] {
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

export function chunkCodebase(fileContent: string, filePath: string): string[] {
  const lines = fileContent.split('\n');
  const chunks: string[] = [];
  const fileName = filePath.split('/').pop() || 'file';
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  let currentChunk: string[] = [];
  if (["json","yaml","yml","toml","md","css"].includes(ext)) {
    for (let i = 0; i < lines.length; i += 40) {
      const slice = lines.slice(i, i + 45);
      chunks.push(`[Ficheiro: ${fileName}] [Config/Estático]\n${slice.join('\n')}`);
    }
    return chunks;
  }
  let ruleType = "bracketBased";
  if (["py"].includes(ext)) ruleType = "py";
  if (["go","rs"].includes(ext)) ruleType = "compiled";
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
    } else {
      if (currentChunk.length >= 60) {
        chunks.push(`[Ficheiro: ${fileName}] [Python] [Linhas: ${i - currentChunk.length + 1}-${i}]\n${currentChunk.join('\n')}`);
        currentChunk = [];
      }
    }
  }
  if (currentChunk.length > 0) {
    chunks.push(`[Ficheiro: ${fileName}] [Linguagem: ${ext}]\n${currentChunk.join('\n')}`);
  }
  return chunks;
}

// === #1 EMBEDDINGS ===
let embedder: any = null;
async function getEmbedder() {
  if (!embedder) embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  return embedder;
}
async function generateEmbedding(text: string): Promise<number[]> {
  const pipe = await getEmbedder();
  const output = await pipe(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

// === #2 CAMADA VETORIAL ===
let vectorTable: lancedb.Table | null = null;
async function getVectorTable() {
  if (!vectorTable) {
    const db = await lancedb.connect(VECTOR_DIR);
    try { vectorTable = await db.openTable("memoria_vetorial"); }
    catch {
      vectorTable = await db.createTable("memoria_vetorial", [
        { vector: await generateEmbedding("init"), text: "Inicialização" }
      ]);
    }
  }
  return vectorTable;
}

// === #4 DISTÂNCIA DE LEVENSHTEIN ===
function getLevenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
      else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

// === #4 VALIDADOR NO GRAFO ===
export class LocalGraph {
  private graph: Graph;

  constructor() { this.graph = new Graph(); this.load(); }

  private validateAndFindEntity(name: string): string {
    const cleanName = name.trim();
    if (!cleanName) return "EntidadeVazia";
    const normalizedTarget = cleanName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    for (const node of this.graph.nodes()) {
      const normalizedNode = node.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (normalizedTarget === normalizedNode) return node;
      if (cleanName.length > 4 && getLevenshteinDistance(cleanName.toLowerCase(), node.toLowerCase()) <= 2) {
        console.log(`[Grafo] Fusão: '${cleanName}' -> '${node}'`);
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
    if (!this.graph.hasEdge(edgeKey)) this.graph.addEdgeWithKey(edgeKey, validSource, validTarget, { relation: validRelation });
    this.save();
  }

  searchConnections(keyword: string): string[] {
    if (!this.graph.hasNode(keyword)) return [];
    return this.graph.neighbors(keyword).map(n => {
      const attr = this.graph.getEdgeAttributes(keyword, n);
      return `Facto: [${keyword}] -> (${attr.relation}) -> [${n}]`;
    });
  }

  private save() { fs.writeFileSync(GRAPH_FILE, JSON.stringify(this.graph.export(), null, 2)); }

  private load() {
    if (fs.existsSync(GRAPH_FILE)) {
      try { this.graph.import(JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf-8'))); }
      catch (e) { console.error("Erro a carregar grafo:", e); }
    }
  }

  // === #6 AUDITORIA ===
  auditAndExportTree(): { relatorio: string; arvoreVisual: string } {
    const nodes = this.graph.nodes();
    let nosRemovidos = 0;
    nodes.forEach(node => { if (this.graph.degree(node) === 0) { this.graph.dropNode(node); nosRemovidos++; } });
    if (nosRemovidos > 0) this.save();
    let visualTree = "=== ÁRVORE DO GRAFO ===\n\n";
    const visited = new Set<string>();
    const roots = this.graph.nodes().sort((a, b) => this.graph.outDegree(b) - this.graph.outDegree(a));
    roots.forEach(root => {
      if (!visited.has(root)) {
        visualTree += `📁 [${root}]\n`;
        visited.add(root);
        const edges = this.graph.outEdges(root);
        edges.forEach((edge, idx) => {
          const target = this.graph.target(edge);
          const attr = this.graph.getEdgeAttributes(edge);
          const prefix = idx === edges.length - 1 ? "└── " : "├── ";
          visualTree += `${prefix}──(${attr.relation})──> 📄 [${target}]\n`;
          visited.add(target);
        });
        visualTree += "\n";
      }
    });
    return { relatorio: `[Auditoria] Nós removidos: ${nosRemovidos}. Ativos: ${this.graph.order()}.`, arvoreVisual: visualTree };
  }

  // === CATEGORIZAÇÃO DE ENTIDADES ===
  private getEntityType(nodeName: string): "pessoa" | "tarefa" | "projeto" | "geral" {
    const name = nodeName.toLowerCase();
    const pessoas = ["maria", "joão", "antónio", "chefe", "cliente", "utilizador", "pai", "mãe"];
    const tarefas = ["treino", "reunião", "estudar", "comprar", "entregar", "fazer", "limpar", "correr"];
    const projetos = ["projeto", "opencode", "rag", "desenvolvimento", "site", "app"];
    if (pessoas.some(p => name.includes(p))) return "pessoa";
    if (tarefas.some(t => name.includes(t))) return "tarefa";
    if (projetos.some(pr => name.includes(pr))) return "projeto";
    return "geral";
  }

  // === #6 EXPORTAÇÃO HTML COM CATEGORIAS E FILTRO ===
  exportInteractiveHtml(outputPath: string): string {
    const colorMap = {
      pessoa: { background: "#a6e3a1", border: "#94e2d5", font: "#11111b" },
      tarefa: { background: "#89b4fa", border: "#74c7ec", font: "#11111b" },
      projeto: { background: "#cba6f7", border: "#f38ba8", font: "#11111b" },
      geral: { background: "#fab387", border: "#f9e2af", font: "#11111b" }
    };
    const nodes = this.graph.nodes().map(node => {
      const type = this.getEntityType(node);
      const style = colorMap[type];
      return { id: node, label: node, group: type, shape: "dot", size: type === "projeto" ? 25 : 20, color: { background: style.background, border: style.border }, font: { color: style.font, size: 14, face: "sans-serif" } };
    });
    const edges = this.graph.edges().map(edge => {
      const source = this.graph.source(edge); const target = this.graph.target(edge); const attributes = this.graph.getEdgeAttributes(edge);
      return { from: source, to: target, label: attributes.relation, arrows: "to", font: { align: "top", color: "#a6adc8", size: 11, background: "rgba(30,30,46,0.7)" }, color: { color: "#585b70", highlight: "#f38ba8", hover: "#89b4fa" } };
    });
    const htmlContent = `<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8"><title>Visualizador de Memória do Agente (Grafo Híbrido)</title><script type="text/javascript" src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script><style type="text/css">body{margin:0;padding:0;background-color:#1e1e2e;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#cdd6f4;overflow:hidden;}#mynetwork{width:100vw;height:100vh;background-color:#181825;}#control-panel{position:absolute;top:15px;left:15px;z-index:10;background:rgba(30,30,46,0.95);padding:15px 25px;border-radius:12px;border:1px solid #45475a;box-shadow:0 4px 15px rgba(0,0,0,0.5);}h1{margin:0 0 5px 0;font-size:18px;color:#cba6f7;}p{margin:0 0 15px 0;font-size:12px;color:#a6adc8;}.search-box{width:100%;padding:8px 12px;font-size:14px;background:#313244;border:1px solid #45475a;border-radius:6px;color:#cdd6f4;box-sizing:border-box;outline:none;}.search-box:focus{border-color:#89b4fa;}.legend{display:flex;gap:12px;margin-top:15px;font-size:12px;}.legend-item{display:flex;align-items:center;gap:6px;}.dot{width:12px;height:12px;border-radius:50%;display:inline-block;}</style></head><body><div id="control-panel"><h1>Memória Local do Agente</h1><p>Nós ativos: ${nodes.length} | Conexões: ${edges.length}</p><input type="text" id="searchNodes" class="search-box" placeholder="Filtrar nós por nome..." oninput="filterGraph()" /><div class="legend"><div class="legend-item"><span class="dot" style="background:${colorMap.pessoa.background}"></span> Pessoas</div><div class="legend-item"><span class="dot" style="background:${colorMap.tarefa.background}"></span> Tarefas</div><div class="legend-item"><span class="dot" style="background:${colorMap.projeto.background}"></span> Projetos</div><div class="legend-item"><span class="dot" style="background:${colorMap.geral.background}"></span> Geral</div></div></div><div id="mynetwork"></div><script type="text/javascript">const container=document.getElementById('mynetwork');const originalNodes=${JSON.stringify(nodes)};const originalEdges=${JSON.stringify(edges)};const nodesDataSet=new vis.DataSet(originalNodes);const edgesDataSet=new vis.DataSet(originalEdges);const data={nodes:nodesDataSet,edges:edgesDataSet};const options={interaction:{hover:true},physics:{stabilization:{iterations:150},barnesHut:{gravitationalConstant:-1800,centralGravity:0.25,springLength:95}}};const network=new vis.Network(container,data,options);function filterGraph(){const searchTerm=document.getElementById('searchNodes').value.toLowerCase().trim();if(searchTerm===""){nodesDataSet.update(originalNodes);edgesDataSet.update(originalEdges);return;}const matchingNodeIds=originalNodes.filter(n=>n.id.toLowerCase().includes(searchTerm)).map(n=>n.id);const visibleNodeIds=new Set(matchingNodeIds);const visibleEdges=[];originalEdges.forEach(edge=>{if(visibleNodeIds.has(edge.from)||visibleNodeIds.has(edge.to)){visibleEdges.push(edge);visibleNodeIds.add(edge.from);visibleNodeIds.add(edge.to);}});const updatedNodes=originalNodes.map(node=>{if(visibleNodeIds.has(node.id)){return{...node,hidden:false};}else{return{...node,hidden:true};}});nodesDataSet.update(updatedNodes);edgesDataSet.clear();edgesDataSet.add(visibleEdges);}</script></body></html>`;
    fs.writeFileSync(outputPath, htmlContent, 'utf-8');
    return outputPath;
  }
}

export const localGraph = new LocalGraph();

// === #2 INGESTÃO MARKDOWN ===
async function ingressMarkdownFile(filePath: string) {
  if (!fs.existsSync(filePath)) return { erro: "Ficheiro não encontrado" };
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const table = await getVectorTable();

  // #5 CHUNKING COM OVERLAP PARA VETOR
  const chunks = chunkTextWithOverlap(content, 120, 25);
  for (const chunk of chunks) {
    await table.add([{ vector: await generateEmbedding(chunk), text: `[Fonte: ${path.basename(filePath)}] ${chunk}` }]);
  }

  let entityCount = 0;
  for (const line of lines) {
    const match = line.match(/-\s*\[(.*?)\]\s+(.*?)\s+\[(.*?)\]/);
    if (match) {
      const [_, s, r, t] = match;
      localGraph.addFact(s.trim(), r.trim(), t.trim());
      entityCount++;
    }
  }
  return { status: "Sucesso", chunks_vetorizados: chunks.length, relacoes_grafo: entityCount };
}

export const importMarkdownFolderTool = tool({
  name: "importar_notas_markdown",
  description: "Lê ficheiros .md para treinar RAG local.",
  inputSchema: { type: "object", properties: { targetPath: { type: "string" } }, required: ["targetPath"] },
  execute: async ({ targetPath }) => {
    const p = path.resolve(targetPath);
    if (!fs.existsSync(p)) return { erro: "Caminho não existe" };
    const stats = fs.statSync(p);
    if (stats.isFile() && p.endsWith('.md')) {
      const res = await ingressMarkdownFile(p);
      return { mensagem: "Ficheiro processado", detalhe: res };
    }
    if (stats.isDirectory()) {
      const files = fs.readdirSync(p).filter(f => f.endsWith('.md'));
      let total = 0;
      for (const f of files) { const r = await ingressMarkdownFile(path.join(p, f)); if (r.status === "Sucesso") total += r.relacoes_grafo; }
      return { mensagem: "Diretório processado", ficheiros: files.length, relacoes: total };
    }
    return { erro: "Caminho inválido" };
  }
});

// === #1 CONSULTA VETORIAL COM COSINE (LIMITE 5) ===
export const queryMemoryTool = tool({
  name: "consultar_memoria_pessoal",
  description: "Consulta combinada vetorial e grafo. Usa cosine distance.",
  inputSchema: { type: "object", properties: { query: { type: "string" }, keywords: { type: "array", items: { type: "string" } } }, required: ["query"] },
  execute: async ({ query, keywords }) => {
    let graphResults: string[] = [];
    if (keywords?.length) keywords.forEach(kw => graphResults = graphResults.concat(localGraph.searchConnections(kw)));
    let vectorResults: string[] = [];
    try {
      const table = await getVectorTable();
      const qv = await generateEmbedding(query);
      // #1 DISTÂNCIA DE COSSENO + LIMITE 5
      const hits = await table.search(qv).distanceType("cosine").limit(5).toArray();
      vectorResults = hits.map((h: any) => h.text);
    } catch (err) { console.error("Erro vetorial:", err); }
    return { dados_exatos_do_grafo: graphResults, contextos_similares_do_vetor: vectorResults, instrucao: "Sintetize com precisão." };
  }
});

export const saveMemoryTool = tool({
  name: "memorizar_facto_pessoal",
  description: "Grava facto em ambas as camadas.",
  inputSchema: { type: "object", properties: { rawText: { type: "string" }, entity: { type: "string" }, relation: { type: "string" }, target: { type: "string" } }, required: ["rawText"] },
  execute: async ({ rawText, entity, relation, target }) => {
    try { const table = await getVectorTable(); await table.add([{ vector: await generateEmbedding(rawText), text: rawText }]); } catch (e) { console.error("Falha vetorial:", e); }
    if (entity && relation && target) localGraph.addFact(entity, relation, target);
    return { status: "Sucesso", mensagem: "Conhecimento integrado." };
  }
});

// === #6 AUDITORIA ===
export const auditGraphTool = tool({
  name: "auditar_e_visualizar_grafo",
  description: "Audita grafo, remove órfãos, exporta árvore.",
  inputSchema: { type: "object", properties: { saveToFile: { type: "boolean" } } },
  execute: async ({ saveToFile = true }) => {
    const { relatorio, arvoreVisual } = localGraph.auditAndExportTree();
    if (saveToFile) {
      fs.writeFileSync(path.resolve('./data/auditoria_grafo.md'), `# Auditoria\n\n${relatorio}\n\n\`\`\`text\n${arvoreVisual}\n\`\`\``, 'utf-8');
      return { resultado: relatorio, visualizacao: arvoreVisual, mensagem: "Exportado para ./data/auditoria_grafo.md" };
    }
    return { resultado: relatorio, visualizacao: arvoreVisual };
  }
});

// === #7 MAPA VISUAL INTERATIVO ===
export const exportVisualGraphTool = tool({
  name: "exportar_mapa_visual_grafo",
  description: "Gera mapa HTML interativo do grafo.",
  inputSchema: { type: "object", properties: { fileName: { type: "string" } } },
  execute: async ({ fileName = "mapa_interativo.html" }) => {
    try {
      const out = path.resolve(`./data/${fileName}`);
      localGraph.exportInteractiveHtml(out);
      return { status: "Sucesso", mensagem: "Mapa criado.", caminho: out, instrucao: "Abra no browser." };
    } catch (err: any) { return { erro: err.message }; }
  }
});

// === INDEXADOR DE CODEBASE ===
export async function indexCodeFile(filePath: string) {
  if (!fs.existsSync(filePath)) return { erro: "Arquivo não encontrado", path: filePath };
  const content = fs.readFileSync(filePath, 'utf-8');
  const table = await getVectorTable();
  const chunks = chunkTextWithOverlap(content, 120, 25);
  let inseridos = 0;
  for (const chunk of chunks) {
    await table.add([{
      vector: await generateEmbedding(chunk),
      text: chunk,
      type: "code",
      path: filePath
    }]);
    inseridos++;
  }
  return { status: "Sucesso", arquivo: filePath, chunks_vetorizados: inseridos };
}

export const indexCodeFolderTool = tool({
  name: "indexar_codebase_local",
  description: "Indexa arquivos .ts/.py/.js para busca semântica de código.",
  inputSchema: { type: "object", properties: { folderPath: { type: "string" }, extensions: { type: "array", items: { type: "string" } } }, required: ["folderPath"] },
  execute: async ({ folderPath, extensions = [".ts", ".js", ".py"] }) => {
    const dir = path.resolve(folderPath);
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return { erro: "Diretório inválido" };
    const files = fs.readdirSync(dir, { recursive: true })
      .filter((f: string) => extensions.some(ext => f.endsWith(ext)))
      .map((f: string) => path.join(dir, f));
    let total = 0;
    for (const f of files) {
      const res = await indexCodeFile(f);
      if (res.status === "Sucesso") total += res.chunks_vetorizados;
    }
    return { mensagem: "Codebase indexada.", arquivos: files.length, chunks_total: total };
  }
});

// === RESET MEMORY TOOL (OPCIONAL) ===
export const resetMemoryTool = tool({
  name: "resetar_memoria_local",
  description: "Apaga permanentemente todos os índices locais (Vetor e Grafo) para iniciar nova indexação.",
  inputSchema: { type: "object", properties: { confirmar: { type: "boolean" } }, required: ["confirmar"] },
  execute: async ({ confirmar }) => {
    if (!confirmar) return { erro: "Operação cancelada. Confirme com confirmar: true." };
    try {
      if (fs.existsSync(VECTOR_DIR)) fs.rmSync(VECTOR_DIR, { recursive: true, force: true });
      if (fs.existsSync(GRAPH_FILE)) fs.unlinkSync(GRAPH_FILE);
      return { status: "Sucesso", mensagem: "Memória local apagada. Pronto para novo treino." };
    } catch (err: any) { return { erro: "Falha ao limpar", detalhe: err.message }; }
  }
});

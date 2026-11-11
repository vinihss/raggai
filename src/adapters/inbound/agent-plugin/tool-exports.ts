import { tool } from "@opencode-ai/plugin";
import * as fs from "fs";
import * as path from "path";
import { createContainer } from "@/config/container.ts";
import { chunkCodebase, chunkTextWithOverlap } from "@/domain/services/text-splitter.ts";

const container = createContainer();

export const consult_memory_personal = tool({
  name: "consult_memory_personal",
  description: "Hybrid search: vector (LanceDB) + graph (keywords)",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string" },
      keywords: { type: "array", items: { type: "string" } },
    },
    required: ["query"],
  },
  execute: async ({ query, keywords }: any) => {
    let graphResults: string[] = [];
    if (keywords)
      keywords.forEach((kw: string) => {
        graphResults = graphResults.concat(container.graphPort.searchConnections(kw));
      });
    let vectorResults: string[] = [];
    try {
      const hits = await container.vectorPort.search(
        await container.embeddingPort.generate(query),
        4,
      );
      vectorResults = hits.map((h: any) => h.meta?.text ?? h.id);
    } catch {}
    return { dados_grafo: graphResults, dados_vetor: vectorResults };
  },
}) as any;

export const memorize_personal_fact = tool({
  name: "memorize_personal_fact",
  description: "Stores structured fact + text in vector",
  inputSchema: {
    type: "object",
    properties: {
      rawText: { type: "string" },
      entity: { type: "string" },
      relation: { type: "string" },
      target: { type: "string" },
    },
    required: ["rawText"],
  },
  execute: async ({ rawText, entity, relation, target }: any) => {
    try {
      await container.vectorPort.save({
        text: rawText,
        embedding: await container.embeddingPort.generate(rawText),
        meta: { type: "general", path: "none" },
      });
      if (entity && relation && target) container.graphPort.addFact(entity, relation, target);
      return { status: "Success" };
    } catch (e: any) {
      return { status: "Error", detail: e.message };
    }
  },
}) as any;

export const import_markdown_notes = tool({
  name: "import_markdown_notes",
  description: ".md ingestion with overlap (25 words) + auto graphs",
  inputSchema: {
    type: "object",
    properties: { targetPath: { type: "string" } },
    required: ["targetPath"],
  },
  execute: async ({ targetPath }: any) => {
    const pResolved = path.resolve(targetPath);
    if (!fs.existsSync(pResolved)) return { error: "Path not found" };
    const processFile = async (f: string) => {
      const content = fs.readFileSync(f, "utf-8");
      const chunks = chunkTextWithOverlap(content);
      for (const chunk of chunks) {
        await container.vectorPort.save({
          text: `[Note: ${path.basename(f)}] ${chunk}`,
          embedding: await container.embeddingPort.generate(chunk),
          meta: { type: "note", path: f },
        });
      }
      content.split("\n").forEach((line) => {
        const m = line.match(/-\s*\[(.*?)\]\s+(.*?)\s+\[(.*?)\]/);
        if (m) container.graphPort.addFact(m[1], m[2], m[3]);
      });
    };
    if (fs.statSync(pResolved).isFile() && pResolved.endsWith(".md")) {
      await processFile(pResolved);
    } else {
      const globScanner = new Bun.Glob("**/*.md");
      const files = Array.from(globScanner.scanSync({ cwd: pResolved, absolute: true })).filter(
        (f: string) => !f.includes("node_modules"),
      );
      for (const f of files) await processFile(f);
    }
    return { status: "Success" };
  },
}) as any;

export const index_local_codebase = tool({
  name: "index_local_codebase",
  description: "Indexes source code (TS, JS, PY, GO, RS, JSON/YAML/CSS)",
  inputSchema: {
    type: "object",
    properties: { repoPath: { type: "string" } },
    required: ["repoPath"],
  },
  execute: async ({ repoPath }: any) => {
    const pAbsoluto = path.resolve(repoPath);
    const globScanner = new Bun.Glob("**/*.{ts,js,py,go,rs,json,yaml,css}");
    const files = Array.from(globScanner.scanSync({ cwd: pAbsoluto, absolute: true })).filter(
      (f: string) => !f.includes("node_modules"),
    );
    let total = 0;
    for (const f of files) {
      const chunks = chunkCodebase(fs.readFileSync(f, "utf-8"), f);
      for (const chunk of chunks) {
        await container.vectorPort.save({
          text: chunk,
          embedding: await container.embeddingPort.generate(chunk),
          meta: { type: "code", path: f },
        });
        total++;
      }
    }
    return { status: "Success", files_processed: files.length, blocks_indexed: total };
  },
}) as any;

export const search_semantic_codebase = tool({
  name: "search_semantic_codebase",
  description: "Pre-LLM filter: semantic code search via cosine",
  inputSchema: {
    type: "object",
    properties: { query: { type: "string" }, limit: { type: "number", default: 4 } },
    required: ["query"],
  },
  execute: async ({ query, limit = 4 }: any) => {
    const hits = await container.vectorPort.search(
      await container.embeddingPort.generate(query),
      limit,
    );
    const filtered = hits.filter((h: any) => h.meta?.type === "code");
    return {
      context_recovered: filtered.map((h: any, i: number) => ({
        result_number: i + 1,
        file_path: h.meta?.path ?? "",
        relevance: `${((1 - (h.score ?? 0)) * 100).toFixed(2)}%`,
        code_snippet: h.meta?.text ?? h.id,
      })),
    };
  },
}) as any;

export const audit_and_visualize_graph = tool({
  name: "audit_and_visualize_graph",
  description: "Cleans orphan nodes + structured tree report",
  inputSchema: { type: "object", properties: {} },
  execute: async () => {
    const { relatorio, arvoreVisual } = container.graphPort.auditAndExportTree();
    fs.writeFileSync(
      path.resolve("./data/auditoria_grafo.md"),
      `# Audit\n${relatorio}\n\`\`\`text\n${arvoreVisual}\n\`\`\``,
      "utf-8",
    );
    return { report: relatorio, visualization: arvoreVisual };
  },
}) as any;

export const export_visual_graph_map = tool({
  name: "export_visual_graph_map",
  description: "Exports interactive 2D HTML map (groups by color)",
  inputSchema: { type: "object", properties: {} },
  execute: async () => {
    const out = path.resolve("./data/mapa_interativo.html");
    container.graphPort.exportInteractiveHtml(out);
    return { status: "Success", path: out };
  },
}) as any;

export const reset_local_memory = tool({
  name: "reset_local_memory",
  description: "Deletes all indexes (Vector + Graph) — requires confirm: true",
  inputSchema: {
    type: "object",
    properties: { confirm: { type: "boolean" } },
    required: ["confirm"],
  },
  execute: async ({ confirm }: any) => {
    if (!confirm) return { error: "Not authorized." };
    await container.vectorPort.clear();
    container.graphPort.clear();
    return { status: "Success", joke: "Indexes destroyed." };
  },
}) as any;

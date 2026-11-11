import * as fs from "fs";
import * as path from "path";
import { createContainer } from "./src/config/container.ts";
import { chunkCodebase, chunkTextWithOverlap } from "./src/domain/services/text-splitter.ts";

async function main() {
  const c = createContainer();
  console.log("Indexando Knowledges (markdown)...");
  const know = path.resolve("./Knowledges");
  const mdFiles: string[] = [];
  function walk(dir: string) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".md")) mdFiles.push(p);
    }
  }
  if (fs.existsSync(know)) walk(know);
  let noteChunks = 0;
  for (const f of mdFiles) {
    const content = fs.readFileSync(f, "utf-8");
    const chunks = chunkTextWithOverlap(content);
    for (const chunk of chunks) {
      await c.vectorPort.save({
        id: crypto.randomUUID(),
        text: `[Nota: ${path.basename(f)}] ${chunk}`,
        embedding: await c.embeddingPort.generate(chunk),
        meta: { type: "note", path: f },
      });
      noteChunks++;
    }
    content.split("\n").forEach((line) => {
      const m = line.match(/-\s*\[(.*?)\]\s+(.*?)\s+\[(.*?)\]/);
      if (m) c.graphPort.addFact(m[1], m[2], m[3]);
    });
  }
  console.log(`Notas: ${mdFiles.length} arquivos, ${noteChunks} chunks`);

  console.log("Indexando código (src/)...");
  const srcDir = path.resolve("./src");
  const exts = new Set(["ts","js","py","go","rs","json","yaml","yml","css","md"]);
  const codeFiles: string[] = [];
  function walkCode(dir: string) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== "node_modules") walkCode(p); }
      else {
        const ext = e.name.split(".").pop()?.toLowerCase() || "";
        if (exts.has(ext)) codeFiles.push(p);
      }
    }
  }
  if (fs.existsSync(srcDir)) walkCode(srcDir);
  let codeChunks = 0;
  for (const f of codeFiles) {
    try {
      const content = fs.readFileSync(f, "utf-8");
      const chunks = chunkCodebase(content, f);
      for (const chunk of chunks) {
        await c.vectorPort.save({
          id: crypto.randomUUID(),
          text: chunk,
          embedding: await c.embeddingPort.generate(chunk),
          meta: { type: "code", path: f },
        });
        codeChunks++;
      }
    } catch (e) {
      console.warn("skip", f, e);
    }
  }
  console.log(`Código: ${codeFiles.length} arquivos, ${codeChunks} chunks`);

  // fatos de exemplo para o grafo
  c.graphPort.addFact("raggai", "usa", "LanceDB");
  c.graphPort.addFact("raggai", "usa", "Graphology");
  c.graphPort.addFact("raggai", "usa", "Transformers.js");
  c.graphPort.addFact("raggai", "implementa", "RAG Híbrido");
  c.graphPort.addFact("RAG Híbrido", "combina", "Busca Vetorial");
  c.graphPort.addFact("RAG Híbrido", "combina", "Grafo de Conhecimento");
  c.graphPort.addFact("OpenCode", "integra", "raggai");
  console.log("Fatos de grafo adicionados.");

  console.log("Concluído.");
}

main().catch(e => { console.error(e); process.exit(1); });

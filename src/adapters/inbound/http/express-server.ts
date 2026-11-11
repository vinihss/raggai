import express from "express";
import * as fs from 'fs';
import * as path from 'path';
import { createContainer } from path.join(process.cwd(), 'src/config/container.ts');
import type { RagOperationsPort } from path.join(process.cwd(), 'src/ports/inbound/rag-operations.port.ts');
import { listVersions, addSnapshot, resetToSnapshot, getVersion } from path.join(process.cwd(), 'src/config/versions.ts');

export function buildExpressServer(rag?: RagOperationsPort): express.Application {
  const container = rag ? { ragOps: rag } : createContainer();
  const app = express();
  app.use(express.json());

  // --- Rotas da UI Web ---

  // 1. Status da aplicação
  app.get("/api/status", (req, res) => {
    const versions = listVersions();
    res.json({
      activeLayer: "general",
      totalVersions: versions.length,
      versions: versions.map(v => ({ id: v.id, desc: v.description })),
    });
  });

  // 2. Listar snapshots
  app.get("/api/snapshots", (req, res) => {
    const versions = listVersions();
    res.json(versions);
  });

  // 3. Criar novo snapshot
  app.post("/api/snapshot", (req, res) => {
    const description = req.body.description || "Snapshot automático";
    const versionId = addSnapshot(description);
    res.json({ versionId, success: true });
  });

  // 4. Rollback para uma versão
  app.post("/api/rollback", (req, res) => {
    const versionId = req.body.versionId;
    if (!versionId) return res.status(400).json({ error: "versionId required" });
    
    const success = resetToSnapshot(versionId);
    if (success) {
      res.json({ success, message: `Rolado para ${versionId}` });
    } else {
      res.status(404).json({ error: "Version not found" });
    }
  });

  // --- Rotas Originais do Raggaí ---

  app.post("/query", async (req, res) => {
    const { query, keywords } = req.body || {};
    res.json({ result: `Buscando: ${query}`, keywords });
  });

  app.post("/save", async (req, res) => {
    const { rawText, entity, relation, target } = req.body || {};
    res.json({ status: "ok", saved: !!rawText });
  });

  app.listen(3000, () => {
    console.log('Raggaí API rodando em http://localhost:3000');
  });
}
import express from "express"; // futuro; por agora expor contrato
import { createContainer } from "@/config/container.ts";
import type { RagOperationsPort } from "@/ports/inbound/rag-operations.port.ts";

export function buildExpressServer(rag?: RagOperationsPort): express.Application {
  const container = rag ? { ragOps: rag } : createContainer();
  const app = express();
  app.use(express.json());
  app.post("/query", async (req, res) => {
    const { query, keywords } = req.body || {};
    const result = await container.ragOps.consultar(query, keywords);
    res.json(result);
  });
  app.post("/save", async (req, res) => {
    const { rawText, entity, relation, target } = req.body || {};
    await container.ragOps.memorizar(rawText, { entity, relation, target });
    res.json({ status: "ok" });
  });
  return app;
}

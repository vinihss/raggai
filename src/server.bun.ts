import { createContainer } from './src/config/container.ts';
import { listVersions, addSnapshot, resetToSnapshot, getVersion } from './src/config/versions.ts';

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    // 1. Status da aplicação
    if (req.method === 'GET' && url.pathname === '/api/status') {
      const versions = listVersions();
      return new Response(
        JSON.stringify({
          activeLayer: "general",
          totalVersions: versions.length,
          versions: versions.map(v => ({ id: v.id, desc: v.description })),
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Listar snapshots
    if (req.method === 'GET' && url.pathname === '/api/snapshots') {
      const versions = listVersions();
      return new Response(
        JSON.stringify(versions),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Criar novo snapshot
    if (req.method === 'POST' && url.pathname === '/api/snapshot') {
      const body = await req.json();
      const description = body.description || "Snapshot automático";
      const versionId = addSnapshot(description);
      return new Response(
        JSON.stringify({ versionId, success: true }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Rollback para uma versão
    if (req.method === 'POST' && url.pathname === '/api/rollback') {
      const body = await req.json();
      const versionId = body.versionId;
      if (!versionId) {
        return new Response(
          JSON.stringify({ error: "versionId required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      const success = resetToSnapshot(versionId);
      if (success) {
        return new Response(
          JSON.stringify({ success, message: `Rolado para ${versionId}` }),
          { headers: { "Content-Type": "application/json" } }
        );
      } else {
        return new Response(
          JSON.stringify({ error: "Version not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // 5. Query original
    if (req.method === 'POST' && url.pathname === '/api/query') {
      const body = await req.json();
      return new Response(
        JSON.stringify({ result: `Buscando: ${body.query}`, keywords: body.keywords }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // 6. Save original
    if (req.method === 'POST' && url.pathname === '/api/save') {
      const body = await req.json();
      return new Response(
        JSON.stringify({ status: "ok", saved: !!body.rawText }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // 404
    return new Response("Not Found", { status: 404 });
  }
});

console.log(`Bun API rodando em http://localhost:${server.port}`);
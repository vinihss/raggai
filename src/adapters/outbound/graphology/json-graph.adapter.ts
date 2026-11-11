import * as fs from "fs";
import Graph from "graphology";
import * as path from "path";
import type { GraphStorePort, RemoveFactsBySourceOptions } from "../../../ports/outbound/graph-store.port.ts";
import type { EnrichedFact, FactProvenance, RemoveBySourceResult, UpsertFactsResult } from "../../../domain/models/graph-fact.ts";
import { getGraphFile, getDomainDir, ensureDomain } from "../../../config/raggai-paths.ts";

function getLevenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) { matrix[i] = new Array(a.length + 1).fill(0); matrix[i][0] = i; }
  for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
      else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);
const normalizePredicate = (relation: string) => relation.trim().toLowerCase().replace(/\s+/g, "_");
const nowIso = () => new Date().toISOString();

export interface JsonGraphAdapterOptions { domain?: string; graphFile?: string }

export class JsonGraphAdapter implements GraphStorePort {
  private graph: Graph;
  private graphFile: string;
  private domain: string;

  constructor(opts?: JsonGraphAdapterOptions) {
    this.domain = opts?.domain || process.env.RAGGAI_DOMAIN || "global";
    this.graphFile = opts?.graphFile || getGraphFile(this.domain);
    // Multi graph: one edge per (subject × predicate × object); distinct
    // relations between the same collapsed node pair must coexist.
    this.graph = new Graph({ multi: true });
    this.load();
    // Persist an (empty) graph file on first open so health checks and the
    // web UI can consistently distinguish "empty" from "missing store".
    if (!fs.existsSync(this.graphFile)) this.save();
  }

  private validateAndFindEntity(name: string): string {
    const cleanName = name.trim();
    if (!cleanName) return "EmptyEntity";
    const normalizedTarget = cleanName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const wordLike = /^[a-z0-9]+$/i.test(cleanName.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
    for (const node of this.graph.nodes()) {
      const normalizedNode = node.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (normalizedTarget === normalizedNode) return node;
      // Typo tolerance only for plain word-like entities (e.g. "Graphology").
      // Structured names (dots, dashes, spaces, mixed case identifiers) are
      // exact-match only — fuzzy merging folds code symbols into modules otherwise.
      const nodeWordLike = /^[a-z0-9]+$/i.test(node.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
      if (
        wordLike && nodeWordLike &&
        cleanName.length > 4 &&
        normalizedTarget.charAt(0) === normalizedNode.charAt(0) &&
        getLevenshteinDistance(cleanName.toLowerCase(), node.toLowerCase()) <= 2
      ) return node;
    }
    return cleanName;
  }

  addFact(source: string, relation: string, target: string) {
    this.upsertFacts([{ subject: source, predicate: relation, object: target, confidence: 1, method: "manual" }]);
  }

  /**
   * Insert or merge facts. Natural key: (subject × predicate × object).
   * Re-adding the same fact from the same source refreshes its evidence
   * (no duplicates); the same fact from other sources adds provenance to the
   * same edge. Confidence is the max across evidences; occurrences tracks
   * how many evidences back the edge.
   */
  upsertFacts(facts: EnrichedFact[]): UpsertFactsResult {
    const result: UpsertFactsResult = { upserted: 0, created: 0, merged: 0 };
    let touched = false;

    for (const fact of facts) {
      if (!fact) continue;
      const subject = this.validateAndFindEntity(String(fact.subject ?? ""));
      const object = this.validateAndFindEntity(String(fact.object ?? ""));
      const relation = normalizePredicate(String(fact.predicate ?? ""));
      if (!subject || !object || !relation) continue;

      if (!this.graph.hasNode(subject)) this.graph.addNode(subject);
      if (!this.graph.hasNode(object)) this.graph.addNode(object);

      const extractedAt = nowIso();
      const evidence: FactProvenance = {
        sourcePath: fact.sourcePath,
        sourceHash: fact.sourceHash,
        method: String(fact.method || "rule"),
        confidence: clamp01(fact.confidence),
        evidence: fact.evidence ? String(fact.evidence).slice(0, 200) : undefined,
        extractedAt,
      };

      const edgeKey = `${subject}-${relation}-${object}`;
      if (this.graph.hasEdge(edgeKey)) {
        const attrs = (this.graph.getEdgeAttributes(edgeKey) as any) || {};
        const provenance: FactProvenance[] = Array.isArray(attrs.provenance) ? [...attrs.provenance] : [];
        // Dedupe evidence by (sourcePath, method); refresh in place.
        const idx = provenance.findIndex(
          (p) => (p.sourcePath ?? "") === (evidence.sourcePath ?? "") && p.method === evidence.method,
        );
        if (idx >= 0) provenance[idx] = evidence;
        else provenance.push(evidence);
        const merged = this.withMergedAttributes(attrs, relation, provenance, extractedAt);
        this.graph.replaceEdgeAttributes(edgeKey, merged);
        result.merged++;
      } else {
        this.graph.addEdgeWithKey(edgeKey, subject, object, {
          relation,
          domain: this.domain,
          confidence: evidence.confidence,
          occurrences: 1,
          updatedAt: extractedAt,
          provenance: [evidence],
        });
        result.created++;
      }
      result.upserted++;
      touched = true;
    }

    if (touched) this.save();
    return result;
  }

  private withMergedAttributes(
    attrs: any,
    relation: string,
    provenance: FactProvenance[],
    updatedAt: string,
  ): Record<string, unknown> {
    const confidence = provenance.length ? Math.max(...provenance.map((p) => clamp01(p.confidence))) : clamp01(attrs.confidence ?? 1);
    return {
      ...attrs,
      relation,
      domain: this.domain,
      confidence,
      occurrences: provenance.length,
      updatedAt,
      provenance,
    };
  }

  /**
   * Remove facts (edges) whose provenance originates from sourcePath.
   * With opts.keepHash, provenance entries matching keepHash are kept
   * (used on re-index to drop only stale versions of the file).
   * Orphaned nodes are dropped afterwards. Legacy edges without
   * provenance are never removed by this operation.
   */
  removeFactsBySource(sourcePath: string, opts?: RemoveFactsBySourceOptions): RemoveBySourceResult {
    let removedEdges = 0;
    const keepHash = opts?.keepHash;

    for (const edge of [...this.graph.edges()]) {
      const attrs = (this.graph.getEdgeAttributes(edge) as any) || {};
      const provenance: FactProvenance[] = Array.isArray(attrs.provenance) ? attrs.provenance : [];
      if (!provenance.length) continue; // legacy/manual edge without source info: keep

      const remaining = provenance.filter(
        (p) => !(p.sourcePath === sourcePath && (!keepHash || p.sourceHash !== keepHash)),
      );
      if (remaining.length === provenance.length) continue;

      if (remaining.length === 0) {
        this.graph.dropEdge(edge);
        removedEdges++;
      } else {
        this.graph.replaceEdgeAttributes(
          edge,
          this.withMergedAttributes(attrs, attrs.relation ?? "uses", remaining, nowIso()),
        );
      }
    }

    let removedNodes = 0;
    for (const node of [...this.graph.nodes()]) {
      if (this.graph.degree(node) === 0) { this.graph.dropNode(node); removedNodes++; }
    }

    if (removedEdges || removedNodes) this.save();
    return { removedEdges, removedNodes };
  }

  searchConnections(keyword: string): string[] {
    if (!this.graph.hasNode(keyword)) return [];
    const lines: string[] = [];
    const render = (from: string, to: string, edgeKey: string) => {
      const attrs = this.graph.getEdgeAttributes(edgeKey);
      lines.push(`Structured fact: [${from}] -> (${attrs?.relation ?? "?"}) -> [${to}]`);
    };
    for (const edge of this.graph.outEdges(keyword)) render(keyword, this.graph.target(edge), edge);
    for (const edge of this.graph.inEdges(keyword)) render(this.graph.source(edge), keyword, edge);
    return lines;
  }

  auditAndExportTree(): { relatorio: string; arvoreVisual: string } {
    let nosRemovidos = 0;
    this.graph.nodes().forEach((node) => {
      if (this.graph.degree(node) === 0) { this.graph.dropNode(node); nosRemovidos++; }
    });
    if (nosRemovidos > 0) this.save();

    // Provenance summary across edges.
    let tracked = 0, occurrences = 0;
    const byMethod: Record<string, number> = {};
    for (const edge of this.graph.edges()) {
      const attrs = (this.graph.getEdgeAttributes(edge) as any) || {};
      const prov: FactProvenance[] = Array.isArray(attrs.provenance) ? attrs.provenance : [];
      if (!prov.length) continue;
      tracked++;
      occurrences += prov.length;
      for (const p of prov) byMethod[p.method] = (byMethod[p.method] || 0) + 1;
    }
    const methodSummary = Object.entries(byMethod).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(", ") || "none";

    let visualTree = "=== GRAPH AUDIT TREE ===\n\n";
    const visited = new Set<string>();
    const roots = this.graph.nodes().sort((a, b) => this.graph.outDegree(b) - this.graph.outDegree(a));
    roots.forEach((root) => {
      if (!visited.has(root)) {
        visualTree += `[${root}]\n`; visited.add(root);
        const edges = this.graph.outEdges(root);
        edges.forEach((edge, index) => {
          const target = this.graph.target(edge);
          const attrs = this.graph.getEdgeAttributes(edge);
          visualTree += `${index === edges.length - 1 ? "└── " : "├── "}──(${attrs.relation})──> [${target}]\n`;
          visited.add(target);
        });
        visualTree += "\n";
      }
    });
    const ativos = typeof (this.graph as any).order === "function" ? (this.graph as any).order() : (this.graph as any).order;
    return {
      relatorio: `Orphan nodes removed: ${nosRemovidos}. Active: ${ativos}. Edges: ${this.graph.edges().length} (provenance-tracked: ${tracked}, occurrences: ${occurrences}; by method: ${methodSummary}).\n`,
      arvoreVisual: visualTree,
    };
  }

  exportInteractiveHtml(outputPath: string) {
    const nodes = this.graph.nodes().map((node) => ({ id: node, label: node, shape: "dot", size: 20 }));
    const edges = this.graph.edges().map((e) => ({ from: this.graph.source(e), to: this.graph.target(e), label: this.graph.getEdgeAttributes(e).relation, arrows: "to" }));
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Knowledge Graph</title><script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script><style>body{margin:0}#m{width:100vw;height:100vh}</style></head><body><div id="m"></div><script>new vis.Network(document.getElementById('m'),{nodes:new vis.DataSet(${JSON.stringify(nodes)}),edges:new vis.DataSet(${JSON.stringify(edges)})},{physics:{stabilization:true}})</script></body></html>`;
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, html, "utf-8");
  }

  clear() {
    this.graph.clear();
    if (fs.existsSync(this.graphFile)) fs.unlinkSync(this.graphFile);
  }

  getRaw() { return this.graph.export(); }

  private save() {
    ensureDomain(this.domain, this.domain === "global" ? "global" : "custom");
    fs.mkdirSync(path.dirname(this.graphFile), { recursive: true });
    fs.writeFileSync(this.graphFile, JSON.stringify(this.graph.export(), null, 2));
  }
  private load() {
    if (fs.existsSync(this.graphFile)) {
      try { this.graph.import(JSON.parse(fs.readFileSync(this.graphFile, "utf-8"))); } catch {}
    }
  }
}

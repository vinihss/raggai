import { createContainer } from "../../config/container.ts";
import type { GraphStorePort } from "../../ports/outbound/graph-store.port.ts";

export interface GraphStats {
  nodes: number;
  edges: number;
  byMethod: Record<string, number>;
  byPredicate: Record<string, number>;
  orphans: number;
  mostConnected: Array<{ node: string; degree: number }>;
  confidenceDistribution: {
    high: number;      // >= 0.9
    medium: number;    // 0.7 - 0.9
    low: number;       // 0.5 - 0.7
    veryLow: number;   // < 0.5
  };
}

export interface GraphAnalysis {
  domain: string;
  stats: GraphStats;
  factsByMethod: Array<{ method: string; count: number; confidenceAvg: number }>;
  factsByPredicate: Array<{ predicate: string; count: number }>;
  orphanNodes: string[];
  mostConnectedNodes: Array<{ node: string; degree: number; outDegree: number; inDegree: number }>;
  confidenceHistogram: Array<{ range: string; count: number }>;
}

export interface FactEdge {
  subject: string;
  predicate: string;
  object: string;
  confidence: number;
  method?: string;
  evidence?: string;
  sourcePath?: string;
}

/** Helper to read a domain's raw graph snapshot. */
export function readGraph(domain: string): { graph: GraphStorePort; snapshot: ReturnType<GraphStorePort["getRaw"]> } {
  const container = createContainer(domain);
  const graph = container.graphPort;
  return { graph, snapshot: graph.getRaw() };
}

function edgeMethod(edge: any): string | undefined {
  const prov = edge.attributes?.provenance;
  return prov?.[0]?.method;
}
function edgeConfidence(edge: any): number {
  return edge.attributes?.confidence ?? 0;
}

/** Get comprehensive graph statistics for a domain. */
export function getGraphStats(domain: string): GraphStats {
  const { graph, snapshot } = readGraph(domain);
  const stats: GraphStats = {
    nodes: 0,
    edges: 0,
    byMethod: {},
    byPredicate: {},
    orphans: 0,
    mostConnected: [],
    confidenceDistribution: { high: 0, medium: 0, low: 0, veryLow: 0 },
  };

  stats.nodes = snapshot.nodes?.length || 0;
  stats.edges = snapshot.edges?.length || 0;

  for (const edge of snapshot.edges || []) {
    const attrs = edge.attributes || {};
    const relation = attrs.relation;
    const method = edgeMethod(edge);
    const confidence = edgeConfidence(edge);

    if (method) stats.byMethod[method] = (stats.byMethod[method] || 0) + 1;
    if (relation) stats.byPredicate[relation] = (stats.byPredicate[relation] || 0) + 1;

    if (confidence >= 0.9) stats.confidenceDistribution.high++;
    else if (confidence >= 0.7) stats.confidenceDistribution.medium++;
    else if (confidence >= 0.5) stats.confidenceDistribution.low++;
    else stats.confidenceDistribution.veryLow++;
  }

  // Degree bookkeeping per node (multi-graph edge count).
  const degree: Record<string, number> = {};
  for (const node of snapshot.nodes || []) degree[node.key] = 0;
  for (const edge of snapshot.edges || []) {
    degree[edge.source] = (degree[edge.source] || 0) + 1;
    degree[edge.target] = (degree[edge.target] || 0) + 1;
  }

  // Orphan nodes (degree 0).
  stats.orphans = snapshot.nodes?.filter((n) => !degree[n.key]).length ?? 0;

  // Most connected nodes (by total degree).
  const connected = snapshot.nodes?.map((n) => ({ node: n.key, degree: degree[n.key] || 0 })) || [];
  connected.sort((a, b) => b.degree - a.degree);
  stats.mostConnected = connected.slice(0, 10);

  return stats;
}

/** Get detailed graph analysis including facts by method, predicate, and node connectivity. */
export function analyzeGraph(domain: string): GraphAnalysis {
  const { graph, snapshot } = readGraph(domain);
  const stats = getGraphStats(domain);

  const analysis: GraphAnalysis = {
    domain,
    stats,
    factsByMethod: [],
    factsByPredicate: [],
    orphanNodes: [],
    mostConnectedNodes: [],
    confidenceHistogram: [],
  };

  // Facts by method (with avg confidence per method).
  const methodCounts: Record<string, { count: number; totalConfidence: number }> = {};
  for (const edge of snapshot.edges || []) {
    const attrs = edge.attributes || {};
    const method = edgeMethod(edge);
    if (!method) continue;
    if (!methodCounts[method]) methodCounts[method] = { count: 0, totalConfidence: 0 };
    methodCounts[method].count++;
    methodCounts[method].totalConfidence += edgeConfidence(edge);
  }
  analysis.factsByMethod = Object.entries(methodCounts)
    .map(([method, { count, totalConfidence }]) => ({
      method,
      count,
      confidenceAvg: count > 0 ? totalConfidence / count : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Facts by predicate.
  const predicateCounts: Record<string, number> = {};
  for (const edge of snapshot.edges || []) {
    const relation = edge.attributes?.relation;
    if (relation) predicateCounts[relation] = (predicateCounts[relation] || 0) + 1;
  }
  analysis.factsByPredicate = Object.entries(predicateCounts)
    .map(([predicate, count]) => ({ predicate, count }))
    .sort((a, b) => b.count - a.count);

  // Orphan nodes list.
  const degree: Record<string, number> = {};
  for (const node of snapshot.nodes || []) degree[node.key] = 0;
  for (const edge of snapshot.edges || []) {
    degree[edge.source] = (degree[edge.source] || 0) + 1;
    degree[edge.target] = (degree[edge.target] || 0) + 1;
  }
  analysis.orphanNodes = snapshot.nodes?.filter((n) => !degree[n.key]).map((n) => n.key) || [];

  // Most connected nodes with in/out degree (multi-graph edge counting).
  const detailedConnected: Array<{ node: string; degree: number; outDegree: number; inDegree: number }> = [];
  const outDegree: Record<string, number> = {};
  const inDegree: Record<string, number> = {};
  for (const node of snapshot.nodes || []) { outDegree[node.key] = 0; inDegree[node.key] = 0; }
  for (const edge of snapshot.edges || []) {
    outDegree[edge.source] = (outDegree[edge.source] || 0) + 1;
    inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
  }
  for (const node of snapshot.nodes || []) {
    const nodeKey = node.key;
    const out = outDegree[nodeKey] || 0;
    const inc = inDegree[nodeKey] || 0;
    detailedConnected.push({ node: nodeKey, degree: out + inc, outDegree: out, inDegree: inc });
  }
  detailedConnected.sort((a, b) => b.degree - a.degree);
  analysis.mostConnectedNodes = detailedConnected.slice(0, 10);

  // Confidence histogram buckets.
  const histogram = [
    { range: ">= 0.9", count: stats.confidenceDistribution.high },
    { range: "0.7 - 0.9", count: stats.confidenceDistribution.medium },
    { range: "0.5 - 0.7", count: stats.confidenceDistribution.low },
    { range: "< 0.5", count: stats.confidenceDistribution.veryLow },
  ];
  analysis.confidenceHistogram = histogram.filter((h) => h.count > 0);

  return analysis;
}

/** Return edge facts grouped/readonly for search-by-method and filter paths. */
function collectEdges(snapshot: ReturnType<GraphStorePort["getRaw"]>): FactEdge[] {
  const facts: FactEdge[] = [];
  for (const edge of snapshot.edges || []) {
    const attrs = edge.attributes || {};
    facts.push({
      subject: edge.source,
      predicate: attrs.relation ?? "",
      object: edge.target,
      confidence: edgeConfidence(edge),
      method: edgeMethod(edge),
      evidence: attrs.provenance?.[0]?.evidence,
      sourcePath: attrs.provenance?.[0]?.sourcePath,
    });
  }
  return facts;
}

/** Search graph by method (e.g. "symbol", "import", "inherit"). */
export function searchGraphByMethod(domain: string, method: string): FactEdge[] {
  const { snapshot } = readGraph(domain);
  return collectEdges(snapshot).filter((f) => f.method === method);
}

/** Filter graph by predicate, method, and minimum confidence. */
export function filterGraph(
  domain: string,
  options: { predicate?: string; method?: string; minConfidence?: number }
): FactEdge[] {
  const { snapshot } = readGraph(domain);
  return collectEdges(snapshot).filter((f) => {
    if (options.predicate !== undefined && f.predicate !== options.predicate) return false;
    if (options.method !== undefined && f.method !== options.method) return false;
    if (options.minConfidence !== undefined && f.confidence < options.minConfidence) return false;
    return true;
  });
}

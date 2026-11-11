export interface GraphStorePort {
  addFact(source: string, relation: string, target: string): void;
  searchConnections(keyword: string): string[];
  auditAndExportTree(): { relatorio: string; arvoreVisual: string };
  exportInteractiveHtml(outputPath: string): void;
  clear(): void;
}

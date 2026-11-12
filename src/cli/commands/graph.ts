import { analyzeGraph } from "../../domain/services/graph-analytics";

function getFlag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

export async function graphCommand(sub: string | undefined, rest: string[]) {
  const args = [sub, ...rest].filter(Boolean) as string[];
  const target = args[0];
  if (!target) throw new Error("Usage: raggai graph <name> [--domain <name>]");

  const domain = getFlag(args, "--domain") || target;

  const analysis = analyzeGraph(domain);

  if (analysis.orphanNodes.length > 0) {
    console.warn(`Warning: ${analysis.orphanNodes.length} orphan node(s) found in domain "${domain}"`);
  }

  console.log(JSON.stringify(analysis, null, 2));
}

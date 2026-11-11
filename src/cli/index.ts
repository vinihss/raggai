#!/usr/bin/env bun
import { doctorCommand } from "./commands/doctor";
import { domainCommand } from "./commands/domain";
import { opencodeCommand } from "./commands/opencode";
import { initCommand } from "./commands/init";
import { searchCommand } from "./commands/search";
import { importCommand } from "./commands/import";
import { exportCommand } from "./commands/export";

const args = process.argv.slice(2);
const [cmd, sub, ...rest] = args;

function help() {
  console.log(`raggai - Universal hybrid RAG (vector + graph)\n
Usage:
  raggai doctor
  raggai opencode install
  raggai init opencode [--domain <name>]
  raggai domain list|create|use|delete <name>
  raggai search "<query>" [--domain <name>] [--domains a,b] [--limit N] [--json]
  raggai import <path> [--domain <name>] [--mode notes|code|auto]
  raggai export <name|all> [--format json|md|graph-html|audit|bundle] [--out <path>]
`);
}

async function main() {
  try {
    switch (cmd) {
      case "doctor": return await doctorCommand(rest);
      case "domain": return await domainCommand(sub, rest);
      case "opencode": return await opencodeCommand(sub, rest);
      case "init": return await initCommand(sub, rest);
      case "search": return await searchCommand(sub, rest);
      case "import": return await importCommand(sub, rest);
      case "export": return await exportCommand(sub, rest);
      case "-h":
      case "--help":
      case undefined:
        return help();
      default:
        console.error(`Unknown command: ${cmd}`);
        help();
        process.exit(1);
    }
  } catch (e: any) {
    console.error("Error:", e?.message || e);
    process.exit(1);
  }
}

main();

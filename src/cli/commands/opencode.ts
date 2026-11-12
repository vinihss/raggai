import { describeOpenCodeGlobalInstall, installGlobalOpenCode } from "../../config/opencode-install";

export async function opencodeCommand(sub: string | undefined, _rest: string[]) {
  if (sub !== "install") {
    console.log("Usage: raggai opencode install");
    return;
  }
  try {
    const result = installGlobalOpenCode();
    console.log("OpenCode global install complete (no prompt content copied).\n");
    for (const line of describeOpenCodeGlobalInstall(result)) console.log(`  ${line}`);
    console.log("\nThe raggai tools load in OpenCode V2 via the plugins/ directory above.");
    console.log("Restart OpenCode (or run: opencode service restart) to pick up the plugin.");
  } catch (error) {
    console.error(`opencode install failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

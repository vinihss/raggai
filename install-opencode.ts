import { describeOpenCodeGlobalInstall, installGlobalOpenCode } from "./src/config/opencode-install";

async function main() {
  console.log("⚙️ Automatic OpenCode install (raggai) — no prompt copy\n");
  try {
    const result = installGlobalOpenCode();
    for (const line of describeOpenCodeGlobalInstall(result)) console.log(`✅ ${line}`);
    console.log("\n🎉 Installation complete. No prompt content copied.");
    console.log("   Invocation: ask the agent to use the raggai tools (see the skill); the plugin provides them.");
  } catch (error) {
    console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌", error);
  process.exit(1);
});

// Entrada limpa — ferramentas (inglês) + plugin de servidor OpenCode V2.
import { Plugin } from "@opencode/plugin";
import {
  audit_and_visualize_graph,
  consult_memory_personal,
  export_visual_graph_map,
  import_markdown_notes,
  index_local_codebase,
  memorize_personal_fact,
  reset_local_memory,
  search_semantic_codebase,
} from "./adapters/inbound/agent-plugin/tool-exports.ts";

export {
  audit_and_visualize_graph,
  consult_memory_personal,
  export_visual_graph_map,
  import_markdown_notes,
  index_local_codebase,
  memorize_personal_fact,
  reset_local_memory,
  search_semantic_codebase,
};

const raggaiTools = [
  consult_memory_personal,
  memorize_personal_fact,
  import_markdown_notes,
  index_local_codebase,
  search_semantic_codebase,
  audit_and_visualize_graph,
  export_visual_graph_map,
  reset_local_memory,
] as const;

// OpenCode V2 auto-discovery (`~/.config/opencode/plugins/<pkg>`) or an
// explicit `plugins` entry pointing at this package directory load this part.
// The default export is the server part: id + setup, which registers the tools.
export default Plugin.define({
  id: "raggai",
  async setup(ctx: { tool: { transform: (fn: (editor: { add: (t: unknown) => void }) => void) => Promise<unknown> } }) {
    await ctx.tool.transform((editor) => {
      for (const raggaiTool of raggaiTools) editor.add(raggaiTool);
    });
    return () => undefined;
  },
});

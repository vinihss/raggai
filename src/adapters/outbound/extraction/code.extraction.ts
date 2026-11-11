/**
 * Deterministic code extraction (Phase 3).
 *
 * Syntactic (regex over lines/text), no AST — AST adapters are Phase 6.
 * Covers the languages this repo ingests: TS/JS, Python, Go, Rust.
 * JSON/YAML/CSS yield nothing.
 *
 * Facts (subject = file doc-entity, e.g. `xenova.adapter`):
 *   - `depends_on`  import/require/use statements (method `import`)
 *   - `defines`     top-level symbol definitions (method `symbol`)
 *   - `extends` / `implements`  inheritance edges (method `inherit`);
 *                      subject is the symbol itself, not the file
 *
 * Confidence: import 0.8 (unresolvable relative TS import 0.6),
 * symbol 0.8, inherit 0.85. Function calls are deliberately NOT
 * extracted. Stdlib/builtin noise is filtered with skip-lists.
 */
import * as fs from "fs";
import * as path from "path";
import type { EnrichedFact, ExtractionInput } from "../../../domain/models/graph-fact.ts";
import { docEntityName, isValidEntity, normalizeEntityText } from "../../../domain/services/entity-utils.ts";

const CONF = { import: 0.8, importWeak: 0.6, symbol: 0.8, inherit: 0.85 } as const;
type Method = EnrichedFact["method"];
type Emit = (subject: string, predicate: string, object: string, confidence: number, method: Method, evidence: string) => void;

const NODE_BUILTINS = new Set([
  "fs", "path", "crypto", "url", "http", "https", "os", "stream", "events",
  "util", "buffer", "child_process", "worker_threads", "assert", "zlib", "net",
  "tty", "vm", "readline", "async_hooks", "perf_hooks", "bun", "node:test",
]);
const PY_STDLIB = new Set([
  "os", "sys", "re", "json", "pathlib", "typing", "dataclasses", "collections",
  "itertools", "functools", "logging", "datetime", "math", "io", "enum", "abc",
  "subprocess", "shutil", "glob", "argparse", "asyncio", "copy", "hashlib",
  "importlib", "inspect", "uuid", "time", "unittest", "textwrap", "warnings",
  "string", "random", "threading", "multiprocessing", "queue", "signal", "socket",
  "struct", "csv", "sqlite3", "pickle", "tempfile", "traceback", "contextlib",
  "operator", "numbers", "decimal", "fractions", "secrets", "base64", "binascii",
]);
const GO_STD_FIRST = new Set([
  "fmt", "os", "io", "strings", "sync", "time", "errors", "context", "math",
  "sort", "bytes", "bufio", "strconv", "unicode", "regexp", "flag", "log",
  "embed", "maps", "slices", "log/slog",
]);
const GO_STD_PREFIX = ["net/", "net", "encoding/", "crypto/", "database/", "debug/", "expvar", "mime/", "path/", "text/", "html/", "runtime/", "testing", "unsafe", "syscall"];

/** Strip repeated generic parameter lists, e.g. `A<B<C>>` → `A`. */
function stripGenerics(s: string): string {
  let t = s, prev: string;
  do { prev = t; t = t.replace(/<[^<>]*>/g, ""); } while (t !== prev);
  return t.trim();
}
/** Last identifier-ish segment of a dotted/slashed name. */
function lastSegment(s: string): string {
  const segs = s.split(/[./]/).filter(Boolean);
  return segs.length ? segs[segs.length - 1] : s;
}
/** Root module/package of a (possibly scoped) specifier. */
function rootPackage(spec: string): string {
  if (spec.startsWith("@")) {
    const [scope, name] = spec.split("/");
    return name ? `${scope}/${name}` : scope;
  }
  return spec.split("/")[0];
}
function snippet(s: string): string { return s.replace(/\s+/g, " ").trim().slice(0, 120); }

/** Resolve a relative JS/TS specifier to a doc-entity; flag weak guesses. */
function resolveRelativeModule(fromFile: string, spec: string): { name: string; resolved: boolean } {
  const base = path.resolve(path.dirname(fromFile), spec);
  const exts = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"];
  const candidates = [base, ...exts.map((e) => base + e), ...exts.map((e) => path.join(base, "index" + e))];
  for (const c of candidates) {
    try { if (fs.statSync(c).isFile()) return { name: docEntityName(c), resolved: true }; } catch { /* keep looking */ }
  }
  const name = spec.replace(/^(\.\/|\.\.\/)+/, "").replace(/\.(ts|tsx|js|jsx|mjs|cjs|json)$/i, "").replace(/\/index$/i, "");
  return { name, resolved: false };
}

/** Emit an import fact for a specifier (handles skip-lists + relative resolution). */
function emitImport(spec: string, evidence: string, input: ExtractionInput, doc: string, emit: Emit): void {
  const clean = spec.trim().replace(/^node:/, "");
  if (!clean) return;
  if (clean.startsWith(".")) {
    const { name, resolved } = resolveRelativeModule(input.path, clean);
    if (isValidEntity(name)) emit(doc, "depends_on", name, resolved ? CONF.import : CONF.importWeak, "import", snippet(evidence));
    return;
  }
  if (clean.startsWith("/") || clean.startsWith("~") || clean.startsWith("@/") || clean.startsWith("#")) return; // aliases/abs paths: not graph-worthy
  if (NODE_BUILTINS.has(clean.split("/")[0])) return;
  const pkg = rootPackage(clean);
  if (isValidEntity(pkg)) emit(doc, "depends_on", pkg, CONF.import, "import", snippet(evidence));
}

const TOP_ANCHOR = /^\S/; // non-whitespace first column == top level

function scanJsLike(input: ExtractionInput, doc: string, emit: Emit): void {
  const text = input.text;
  // --- imports (whole-text regexes: handles multiline imports) ---
  const spans: Array<{ m: RegExpMatchArray; spec: string }> = [];
  for (const m of text.matchAll(/(?:import|export)\s+[^'"]*\bfrom\s*['"]([^'"]+)['"]/gs)) spans.push({ m, spec: m[1] });
  for (const m of text.matchAll(/(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g)) spans.push({ m, spec: m[1] });
  for (const m of text.matchAll(/\brequire\(\s*['"]([^'"]+)['"]\s*\)/g)) spans.push({ m, spec: m[1] });
  for (const m of text.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)) spans.push({ m, spec: m[1] });
  spans.sort((a, b) => (a.m.index ?? 0) - (b.m.index ?? 0));
  for (const { m, spec } of spans) emitImport(spec, m[0], input, doc, emit);

  // --- top-level symbols + inheritance (line anchored, column 0) ---
  const lines = text.split("\n");
  for (const raw of lines) {
    if (!TOP_ANCHOR.test(raw)) continue;
    const line = raw.trim();
    if (line.startsWith("//") || line.startsWith("/*") || line.startsWith("*")) continue;
    // symbol definition
    const sym = line.match(/^(?:export\s+)?(?:default\s+)?(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?(class|interface|type|enum|function)\s+([A-Za-z_$][\w$]*)/);
    const arrowConst = line.match(/^export\s+(?:declare\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*[:=]/);
    if (sym) emit(doc, "defines", sym[2], CONF.symbol, "symbol", snippet(line));
    else if (arrowConst) emit(doc, "defines", arrowConst[1], CONF.symbol, "symbol", snippet(line));
    // class / interface inheritance
    if (sym && (sym[1] === "class" || sym[1] === "interface")) {
      const name = sym[2];
      const ext = line.match(/\bextends\s+([A-Za-z0-9_$.,\s<>]+?)(?=\s+implements\s|\s*\{|\s*$)/);
      const impl = line.match(/\bimplements\s+([A-Za-z0-9_$.,\s<>]+?)(?=\s*\{|\s*$)/);
      const strip = (part: string) => stripGenerics(part).split(",")
        .map((t) => t.trim().replace(/^readonly\s+/, ""))
        .filter((t) => /^[A-Za-z_$][\w$.]*$/.test(t));
      for (const t of ext ? strip(ext[1]) : []) emit(name, "extends", t, CONF.inherit, "inherit", snippet(line));
      for (const t of impl ? strip(impl[1]) : []) emit(name, "implements", t, CONF.inherit, "inherit", snippet(line));
    }
  }
}

function scanPython(input: ExtractionInput, doc: string, emit: Emit): void {
  const lines = input.text.split("\n");
  let inTriple = false;
  for (const raw of lines) {
    // toggle triple-quoted strings/docstrings
    const tripleCount = (raw.match(/"""|'''/g) || []).length;
    const wasInTriple = inTriple;
    if (tripleCount % 2 === 1) inTriple = !inTriple;
    if (wasInTriple || (tripleCount % 2 === 1 && !wasInTriple && raw.trim().startsWith('"""'))) continue;
    if (inTriple) continue;

    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (/^\s/.test(raw)) continue; // nested code: top level only

    // from x import y  |  import x[, y]
    const fromM = trimmed.match(/^from\s+(\.*[\w.]+)\s+import\b/);
    if (fromM) {
      const mod = fromM[1];
      if (mod.startsWith(".")) { // relative: leading dots = package levels up
        const dots = mod.match(/^\.+/)![0].length;
        const rest = mod.slice(dots).replace(/\./g, "/");
        if (rest) {
          let target = path.dirname(input.path);
          for (let i = 1; i < dots; i++) target = path.dirname(target);
          const base = path.join(target, rest);
          for (const c of [base + ".py", path.join(base, "__init__.py")]) {
            try { if (fs.statSync(c).isFile()) { const name = docEntityName(c); if (isValidEntity(name)) emit(doc, "depends_on", name, CONF.import, "import", snippet(trimmed)); break; } } catch { /* no match */ }
          }
        }
      } else {
        const root = mod.split(".")[0];
        if (!PY_STDLIB.has(root) && isValidEntity(root)) emit(doc, "depends_on", root, CONF.import, "import", snippet(trimmed));
      }
      continue;
    }
    const impM = trimmed.match(/^import\s+([\w.]+)/);
    if (impM) {
      const root = impM[1].split(".")[0];
      if (!PY_STDLIB.has(root) && isValidEntity(root)) emit(doc, "depends_on", root, CONF.import, "import", snippet(trimmed));
      continue;
    }

    // symbols
    const sym = trimmed.match(/^(?:async\s+)?def\s+([A-Za-z_]\w*)/) ?? trimmed.match(/^class\s+([A-Za-z_]\w*)/);
    if (sym) {
      emit(doc, "defines", sym[1], CONF.symbol, "symbol", snippet(trimmed));
      const cls = trimmed.match(/^class\s+\w+\s*\(([^)]*)\)/);
      if (cls && sym[1] && trimmed.startsWith("class")) {
        for (let base of cls[1].split(",")) {
          base = base.trim().replace(/=.*$/, ""); // drop kwargs (metaclass=...)
          base = stripGenerics(base.replace(/\[[^\]]*\]/g, "")); // drop [Generic[T]] params
          base = lastSegment(base).trim();
          if (!base || /^(object|ABC|Generic|Protocol)$/.test(base)) continue;
          if (/^[A-Za-z_]\w*$/.test(base)) emit(sym[1], "extends", base, CONF.inherit, "inherit", snippet(trimmed));
        }
      }
    }
  }
}

function isGoStdlib(spec: string): boolean {
  const first = spec.split("/")[0];
  if (GO_STD_FIRST.has(first)) return true;
  if (GO_STD_PREFIX.some((p) => spec === p || spec.startsWith(p))) return true;
  return !spec.includes(".") && !spec.includes("/"); // single-segment: stdlib by convention
}

function scanGo(input: ExtractionInput, doc: string, emit: Emit): void {
  const lines = input.text.split("\n");
  let inImportBlock = false;
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (trimmed.startsWith("//")) continue;
    if (/^import\s*\($/.test(trimmed)) { inImportBlock = true; continue; }
    if (inImportBlock) {
      if (trimmed.startsWith(")")) { inImportBlock = false; continue; }
      const m = trimmed.match(/(?:^[\w.]+\s+)?["]([^"]+)["]/);
      if (m && !isGoStdlib(m[1]) && isValidEntity(m[1])) emit(doc, "depends_on", m[1], CONF.import, "import", snippet(trimmed));
      continue;
    }
    const single = trimmed.match(/^import\s+["]([^"]+)["]/);
    if (single) { if (!isGoStdlib(single[1]) && isValidEntity(single[1])) emit(doc, "depends_on", single[1], CONF.import, "import", snippet(trimmed)); continue; }

    if (!/^\S/.test(raw)) continue; // nested only: top level
    const fn = trimmed.match(/^func\s+(?:\([^)]*\)\s*)?([A-Za-z_]\w*)\s*\(/);
    if (fn) { emit(doc, "defines", fn[1], CONF.symbol, "symbol", snippet(trimmed)); continue; }
    const ty = trimmed.match(/^type\s+([A-Za-z_]\w*)\s/);
    if (ty) emit(doc, "defines", ty[1], CONF.symbol, "symbol", snippet(trimmed));
  }
}

function scanRust(input: ExtractionInput, doc: string, emit: Emit): void {
  const lines = input.text.split("\n");
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (trimmed.startsWith("//")) continue;
    if (!/^\S/.test(raw)) continue;

    const useM = trimmed.match(/^(?:pub\s+)?use\s+([A-Za-z_][\w]*)(?:::|\s*;)/);
    if (useM) {
      const root = useM[1];
      if (!/^(std|core|alloc|crate|self|super)$/.test(root) && isValidEntity(root)) emit(doc, "depends_on", root, CONF.import, "import", snippet(trimmed));
      continue;
    }
    const extCrate = trimmed.match(/^extern\s+crate\s+([A-Za-z_]\w*)/);
    if (extCrate && isValidEntity(extCrate[1])) { emit(doc, "depends_on", extCrate[1], CONF.import, "import", snippet(trimmed)); continue; }

    const sym = trimmed.match(/^(?:pub\s+)?(?:unsafe\s+)?(?:async\s+)?fn\s+([A-Za-z_]\w*)/)
      ?? trimmed.match(/^(?:pub\s+)?(?:union\s+|type\s+|const\s+|static\s+)?(struct|enum|trait|mod)\s+([A-Za-z_]\w*)/);
    // second pattern has two groups; normalize
    if (sym) { const name = sym[1] && /^(struct|enum|trait|mod)$/.test(sym[1]) ? sym[2] : sym[1]; emit(doc, "defines", name, CONF.symbol, "symbol", snippet(trimmed)); }

    // trait inheritance: trait A: B + C {
    const traitM = trimmed.match(/^(?:pub\s+)?trait\s+[A-Za-z_]\w*[^:{]*:\s*([^{]+)/);
    if (traitM) {
      const traitName = trimmed.match(/^(?:pub\s+)?trait\s+([A-Za-z_]\w*)/)![1];
      for (const sup of traitM[1].split("+")) {
        const t = stripGenerics(sup).trim();
        if (/^[A-Za-z_]\w*$/.test(t)) emit(traitName, "extends", t, CONF.inherit, "inherit", snippet(trimmed));
      }
    }
    // impl Trait for Type {  →  Type implements Trait
    const implM = trimmed.match(/^impl(?:<[^>]*>)?\s+([A-Za-z_][\w:]*(?:<[^>]*>)?)\s+for\s+([A-Za-z_][\w:]*(?:<[^>]*>)?)/);
    if (implM) {
      const trait = stripGenerics(implM[1]).split("::").pop()!;
      const type = stripGenerics(implM[2]).split("::").pop()!;
      if (/^[A-Za-z_]\w*$/.test(trait) && /^[A-Za-z_]\w*$/.test(type)) emit(type, "implements", trait, CONF.inherit, "inherit", snippet(trimmed));
    }
  }
}

/** Code extractor entry point (GraphExtractionPort handles dispatch). */
export function extractCodeFacts(input: ExtractionInput): EnrichedFact[] {
  const facts: EnrichedFact[] = [];
  const seen = new Set<string>();
  const doc = docEntityName(input.path);
  const emit: Emit = (subject, predicate, object, confidence, method, evidence) => {
    const s = normalizeEntityText(subject), o = normalizeEntityText(object);
    if (!isValidEntity(s) || !isValidEntity(o)) return;
    const key = `${predicate}|${s}|${o}`;
    if (seen.has(key)) return;
    seen.add(key);
    facts.push({ subject: s, predicate, object: o, confidence, method, sourcePath: input.path, sourceHash: input.hash, evidence: evidence.slice(0, 200) });
  };
  const ext = String(input.language ?? path.extname(input.path).slice(1)).toLowerCase();
  if (["ts", "tsx", "mts", "cts", "js", "jsx", "mjs", "cjs"].includes(ext)) scanJsLike(input, doc, emit);
  else if (ext === "py") scanPython(input, doc, emit);
  else if (ext === "go") scanGo(input, doc, emit);
  else if (ext === "rs") scanRust(input, doc, emit);
  return facts;
}

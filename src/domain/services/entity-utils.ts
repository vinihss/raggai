/**
 * Small, dependency-free helpers to normalize and validate entities
 * extracted from markdown before they reach the graph store.
 */

/** Strip inline markdown formatting; collapse whitespace; drop wrapping noise. */
export function normalizeEntityText(raw: string): string {
  let s = String(raw ?? "");
  s = s.replace(/`([^`]*)`/g, "$1");
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1");
  s = s.replace(/~~([^~]+)~~/g, "$1");
  s = s.trim().replace(/\s+/g, " ");
  // Strip wrapping brackets/quotes when they wrap the whole value.
  s = s.replace(/^["'\(\[]+|["'\)\]]+$/g, "").trim();
  s = s.replace(/[.,;:]+$/, "").trim();
  return s;
}

/** Entity must be reasonably short, contain a letter/digit, and not be a URL. */
export function isValidEntity(s: string): boolean {
  if (!s) return false;
  if (s.length > 80) return false;
  if (!/[A-Za-zÀ-ÿ0-9]/.test(s)) return false;
  if (/^https?:\/\//i.test(s)) return false;
  return true;
}

/** URI-decode a path segment safely (malformed sequences pass through). */
export function safeDecodeUri(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}

/** Document-as-entity name: file basename without extension. */
export function docEntityName(sourcePath: string): string {
  const base = sourcePath.split(/[\\/]/).pop() || sourcePath;
  const dot = base.lastIndexOf(".");
  return safeDecodeUri(dot > 0 ? base.slice(0, dot) : base);
}

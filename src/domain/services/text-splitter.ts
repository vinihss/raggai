export interface ChunkingRule {
  startMarkers: RegExp[];
  endMarkers: string[];
}

export const LANGUAGE_RULES: Record<string, ChunkingRule> = {
  bracketBased: {
    startMarkers: [
      /export\s+(const|class|function|interface)/,
      /class\s+\w+/,
      /(public|private|protected|async)\s+/,
      /function\s+\w+/,
    ],
    endMarkers: ["}", "};"],
  },
  py: {
    startMarkers: [/^def\s+\w+/, /^class\s+\w+/, /^@\w+/],
    endMarkers: ["#", "def ", "class "],
  },
  compiled: {
    startMarkers: [/^func\s+/, /^fn\s+/, /^pub\s+fn\s+/, /^type\s+\w+\s+struct/],
    endMarkers: ["}"],
  },
};

export function chunkCodebase(fileContent: string, filePath: string): string[] {
  const lines = fileContent.split("\n");
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  const fileName = filePath.split(/[\\/]/).pop() ?? "";
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";

  let ruleType = "bracketBased";
  if (["py"].includes(ext)) ruleType = "py";
  if (["go", "rs"].includes(ext)) ruleType = "compiled";

  if (["json", "yaml", "yml", "toml", "md", "css"].includes(ext)) {
    for (let i = 0; i < lines.length; i += 40) {
      const slice = lines.slice(i, i + 45);
      chunks.push(`[Ficheiro: ${fileName}] [Config/Estático]\n${slice.join("\n")}`);
    }
    return chunks;
  }

  const rules = LANGUAGE_RULES[ruleType];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    const isNewComponent = rules.startMarkers.some((regex) => regex.test(trimmedLine));

    if (isNewComponent && currentChunk.length >= 20) {
      chunks.push(
        `[Ficheiro: ${fileName}] [Linguagem: ${ext}] [Linhas: ${i - currentChunk.length + 1}-${i}]\n${currentChunk.join("\n")}`,
      );
      currentChunk = currentChunk.slice(-4);
    }
    currentChunk.push(line);

    if (ruleType !== "py") {
      const isEndMarker = rules.endMarkers.includes(trimmedLine) || currentChunk.length >= 80;
      if (isEndMarker && currentChunk.length >= 15) {
        chunks.push(
          `[Ficheiro: ${fileName}] [Linguagem: ${ext}] [Linhas: ${i - currentChunk.length + 1}-${i}]\n${currentChunk.join("\n")}`,
        );
        currentChunk = [];
      }
    } else if (currentChunk.length >= 60) {
      chunks.push(
        `[Ficheiro: ${fileName}] [Python] [Linhas: ${i - currentChunk.length + 1}-${i}]\n${currentChunk.join("\n")}`,
      );
      currentChunk = [];
    }
  }
  if (currentChunk.length > 0) {
    chunks.push(`[Ficheiro: ${fileName}] [Linguagem: ${ext}]\n${currentChunk.join("\n")}`);
  }
  return chunks;
}

export function chunkTextWithOverlap(text: string, chunkSize = 120, overlap = 25): string[] {
  const words = text.trim().split(/\s+/);
  const chunks: string[] = [];
  if (words.length <= chunkSize) return [text];
  let i = 0;
  while (i < words.length) {
    const end = Math.min(i + chunkSize, words.length);
    chunks.push(words.slice(i, end).join(" "));
    i += chunkSize - overlap;
  }
  return chunks;
}

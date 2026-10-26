export function normalize(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\uFF10-\uFF19]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[ｘＸ]/g, "x")
    .replace(/[ｙＹ]/g, "y")
    .replace(/[ａＡ]/g, "a")
    .replace(/＝/g, "=")
    .replace(/＋/g, "+")
    .replace(/[－—–−]/g, "-")
    .replace(/[×·]/g, "*")
    .replace(/÷/g, "/")
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .replace(/[，,。．、]/g, "")
    .replace(/\s+/g, "")
    .replace(/所以/g, "")
    .replace(/解[:：]?/g, "")
    .replace(/得/g, "")
    .replace(/答案[:：]?/g, "");
}

export function splitAnswerLines(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function lineHasAnswer(line: string, token: string): boolean {
  if (!token) return false;
  let from = 0;
  while (from <= line.length) {
    const index = line.indexOf(token, from);
    if (index < 0) return false;
    const before = index === 0 ? "" : line[index - 1];
    const after = line[index + token.length] ?? "";
    const beforeOk = before === "" || !/[0-9a-z.]/.test(before);
    const afterOk = after === "" || !/[0-9a-z.]/.test(after);
    if (beforeOk && afterOk) return true;
    from = index + token.length;
  }
  return false;
}

export function hasFragment(text: string, token: string): boolean {
  const normalized = normalize(token);
  if (!normalized) return false;
  const lines = splitAnswerLines(text).map((line) => normalize(line));
  const haystacks = lines.length ? lines : [normalize(text)];
  if (normalized.includes("=")) {
    return haystacks.some((line) => lineHasAnswer(line, normalized));
  }
  return haystacks.some((line) => line.includes(normalized));
}

export function answerMatches(text: string, accept: string[]): boolean {
  const lines = splitAnswerLines(text).map((line) => normalize(line));
  if (!lines.length) return false;
  return accept.some((token) => {
    const normalized = normalize(token);
    if (!normalized) return false;
    if (lines.some((line) => line === normalized || lineHasAnswer(line, normalized))) return true;
    const parts = normalized.match(/[a-z]+=-?\d+(?:\/\d+)?/g) ?? [];
    if (parts.length >= 2) {
      return parts.every((part) => lines.some((line) => lineHasAnswer(line, part)));
    }
    return false;
  });
}

export function equationsOf(text: string): string[] {
  return normalize(text).match(/[0-9a-z()]+=[0-9a-z()+\-*/]+/g) ?? [];
}

export function addsEquation(draft: string, rewritten: string): boolean {
  const allowed = new Set(equationsOf(draft));
  return equationsOf(rewritten).some((equation) => !allowed.has(equation));
}

export function problemKey(stem: string): string {
  const parts = stem.split("：");
  return normalize(parts[parts.length - 1] ?? stem);
}

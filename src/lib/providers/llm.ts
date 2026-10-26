import { addsEquation, lineHasAnswer, normalize } from "@/lib/text";
import { speak } from "@/lib/teaching/persona";
import type { TeachingDecision } from "@/lib/types";

/**
 * 口气渲染。
 * 教学动作在调用之前已经由 engine 决定。
 * 没有 OPENAI_API_KEY 时，直接用 persona 模板。
 * 有钥匙时，只允许模型改写草稿的口气；新增式子或最终答案会被丢掉。
 */
export async function renderTutorLine(decision: TeachingDecision, forbidden: string[] = []): Promise<{ text: string; source: "template" | "llm" }> {
  const draft = speak(decision);
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return { text: draft, source: "template" };
  try {
    const rewritten = await rephrase(draft, key);
    if (!acceptsRephrase(draft, rewritten, forbidden)) return { text: draft, source: "template" };
    return { text: rewritten, source: "llm" };
  } catch {
    return { text: draft, source: "template" };
  }
}

export function acceptsRephrase(draft: string, rewritten: string, forbidden: string[]): boolean {
  const next = rewritten.trim();
  if (!next || next.length > 500) return false;
  if (addsEquation(draft, next)) return false;
  const draftNorm = normalize(draft);
  const nextNorm = normalize(next);
  for (const token of forbidden) {
    const normalized = normalize(token);
    if (!normalized || /^\d+$/.test(normalized)) continue;
    if (lineHasAnswer(nextNorm, normalized) && !lineHasAnswer(draftNorm, normalized)) return false;
  }
  return true;
}

async function rephrase(draft: string, key: string): Promise<string> {
  const base = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "你是语气层，不是出题老师。把草稿改写成孙悟空对初中生说话的口气。必须保留草稿里的全部数字和式子，不能新增解题步骤，不能给出草稿里没有的结果。只输出改写后的一段话。",
        },
        { role: "user", content: draft },
      ],
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("llm failed");
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("empty");
  return text.replace(/^["「]|["」]$/g, "");
}

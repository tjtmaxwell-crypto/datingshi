import type { Problem } from "@/lib/types";
import type { TierInput } from "@/lib/teaching/plan";
import { sampleStem } from "@/lib/teaching/select";

export interface OcrResult {
  text: string;
  source: "stub" | "remote";
  note: string;
}

/**
 * 识别入口。
 * 没有 OCR_API_URL 时走桩，返回题库示例，不访问网络。
 * 接真实 OCR：实现 recognizeRemote，让它返回 { text }。
 * 教学引擎不在这里，识别结果会再交给 classifyPhotoText。
 */
export async function recognizeHomework(input: {
  mode: "default" | "beyond";
  learner: TierInput;
  problems: Problem[];
  photoSampleId: string;
}): Promise<OcrResult> {
  const remote = await recognizeRemote();
  if (remote) return remote;
  return {
    text: sampleStem(input.learner, input.problems, input.mode, input.photoSampleId),
    source: "stub",
    note: "没有配置 OCR。这是内置示例文字，不是对照片的识别。",
  };
}

async function recognizeRemote(): Promise<OcrResult | null> {
  const url = process.env.OCR_API_URL?.trim();
  if (!url) return null;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.OCR_API_KEY ? { Authorization: `Bearer ${process.env.OCR_API_KEY}` } : {}),
      },
      body: JSON.stringify({ image: null, note: "MVP 没有上传真实图片" }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { text?: unknown };
    if (typeof data.text !== "string" || !data.text.trim()) return null;
    return { text: data.text.trim(), source: "remote", note: "文字来自 OCR_API_URL。" };
  } catch {
    return null;
  }
}

import { getLearner, listProblems } from "@/lib/db";
import { recognizeHomework } from "@/lib/providers/ocr";
import { bindRequest, fail, json, readJson } from "@/lib/route";
import { PHOTO_SAMPLE_ID } from "@/lib/teaching/catalog";

export async function POST(request: Request) {
  try {
    await bindRequest();
    const body = await readJson<{ mode?: string }>(request);
    const mode = body.mode === "beyond" ? "beyond" : "default";
    return json(await recognizeHomework({ mode, learner: getLearner(), problems: listProblems(), photoSampleId: PHOTO_SAMPLE_ID }));
  } catch (error) {
    return fail(error);
  }
}

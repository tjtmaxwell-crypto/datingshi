import { gradeSession } from "@/lib/session-service";
import { bindRequest, fail, json, readJson } from "@/lib/route";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await bindRequest();
    const { id } = await context.params;
    const body = await readJson<{ answerText?: string }>(request);
    return json(gradeSession(id, body.answerText ?? ""));
  } catch (error) {
    return fail(error);
  }
}

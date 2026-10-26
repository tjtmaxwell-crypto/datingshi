import { updateLearner } from "@/lib/session-service";
import { bindRequest, fail, json, readJson } from "@/lib/route";

export async function PATCH(request: Request) {
  try {
    await bindRequest();
    const body = await readJson<{ grade?: number; scoreBand?: string; lastStuckPoint?: string; languageComplexity?: string }>(request);
    return json(updateLearner(body));
  } catch (error) {
    return fail(error);
  }
}

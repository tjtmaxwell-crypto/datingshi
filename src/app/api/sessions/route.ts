import { createSession } from "@/lib/session-service";
import { bindRequest, fail, json, readJson } from "@/lib/route";

export async function POST(request: Request) {
  try {
    await bindRequest();
    const body = await readJson<{ source?: string; recognizedText?: string }>(request);
    return json(createSession(body));
  } catch (error) {
    return fail(error);
  }
}

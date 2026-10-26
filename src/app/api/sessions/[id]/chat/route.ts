import { chatSession } from "@/lib/session-service";
import { bindRequest, fail, json, readJson } from "@/lib/route";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await bindRequest();
    const { id } = await context.params;
    const body = await readJson<{ text?: string; opener?: boolean }>(request);
    return json(await chatSession(id, body));
  } catch (error) {
    return fail(error);
  }
}

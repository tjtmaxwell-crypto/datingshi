import { wrapSession } from "@/lib/session-service";
import { bindRequest, fail, json } from "@/lib/route";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await bindRequest();
    const { id } = await context.params;
    return json(wrapSession(id));
  } catch (error) {
    return fail(error);
  }
}

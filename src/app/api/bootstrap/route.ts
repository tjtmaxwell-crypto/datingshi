import { getBootstrap } from "@/lib/session-service";
import { bindRequest, fail, json } from "@/lib/route";

export async function GET() {
  try {
    await bindRequest();
    return json(getBootstrap());
  } catch (error) {
    return fail(error);
  }
}

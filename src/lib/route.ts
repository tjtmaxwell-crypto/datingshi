import { connection } from "next/server";

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** better-sqlite3 是同步驱动，先声明这是一次真实请求，避免被预渲染缓存住。 */
export async function bindRequest() {
  await connection();
}

export function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

export async function readJson<T extends object>(request: Request): Promise<Partial<T>> {
  try {
    const value = (await request.json()) as Partial<T>;
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

export function fail(error: unknown) {
  const status = error instanceof HttpError ? error.status : 500;
  if (status === 500) console.error(error);
  const message = status === 500 ? "服务器暂时没有完成这件事" : error instanceof Error ? error.message : "请求没有成功";
  return json({ error: message }, status);
}

import { SaveFailure } from "../../ports/SavePorts";
class ApiError extends SaveFailure {
  constructor(
    message: string,
    status: number,
    public code?: string,
  ) {
    super(
      message,
      status === 409 ? "conflict" : status === 401 ? "expired" : "offline",
    );
  }
}
export async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
  keepalive = false,
): Promise<T> {
  const controller = new AbortController(),
    timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch("/api" + path, {
      method,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-FarmScript-Request": "1",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      keepalive,
    });
    if (response.status === 204) return undefined as T;
    let data;
    try {
      data = await response.json();
    } catch {
      throw new ApiError(
        "API indisponible. La copie locale est conservée.",
        503,
      );
    }
    if (!response.ok)
      throw new ApiError(
        data.error ?? "Connexion au serveur impossible.",
        response.status,
        data.code,
      );
    return data as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(
      "Serveur inaccessible. La copie locale est conservée.",
      503,
    );
  } finally {
    clearTimeout(timeout);
  }
}

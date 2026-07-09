export interface ApiRequestOptions extends RequestInit {
  token?: string;
  json?: unknown;
  expectEmpty?: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiRequest<TResponse>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<TResponse> {
  const headers = new Headers(options.headers);

  if (options.json !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.json !== undefined ? JSON.stringify(options.json) : options.body
  });

  if (!response.ok) {
    const errorBody = await parseJsonResponse<{ error?: { code?: string; message?: string; details?: unknown } }>(
      response
    );
    throw new ApiRequestError(
      response.status,
      errorBody?.error?.message ?? `API request failed: ${response.status}`,
      errorBody?.error?.code,
      errorBody?.error?.details
    );
  }

  if (options.expectEmpty || response.status === 204) {
    return undefined as TResponse;
  }

  return response.json() as Promise<TResponse>;
}

async function parseJsonResponse<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("Content-Type");
  if (!contentType?.includes("application/json")) {
    return null;
  }

  return response.json() as Promise<T>;
}

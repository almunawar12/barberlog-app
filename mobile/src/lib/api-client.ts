import * as tokenStorage from '@/lib/token-storage';

const TIMEOUT_MS = 15_000;

/** The server answered with an error status. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** No usable response (offline, timeout, dropped connection): the outcome of a write is unknown. */
export class NetworkError extends Error {
  constructor() {
    super('network');
    this.name = 'NetworkError';
  }
}

export class ConfigError extends Error {
  constructor() {
    super('EXPO_PUBLIC_API_URL is not set');
    this.name = 'ConfigError';
  }
}

type Query = Record<string, string | number | null | undefined>;

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Query;
  idempotencyKey?: string;
  /** Set false for endpoints that need no token (login, forgot password). */
  auth?: boolean;
};

let unauthorizedHandler: (() => void) | undefined;

/** Called when an authenticated request is rejected with 401, so the app can drop the session. */
export function setUnauthorizedHandler(handler: (() => void) | undefined) {
  unauthorizedHandler = handler;
}

export function apiUrl(path: string, query?: Query): string {
  const base = process.env.EXPO_PUBLIC_API_URL;

  if (!base) {
    throw new ConfigError();
  }

  const search = Object.entries(query ?? {})
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');

  return `${base.replace(/\/$/, '')}${path}${search ? `?${search}` : ''}`;
}

export async function authHeaders(): Promise<Record<string, string>> {
  const token = await tokenStorage.getToken();

  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, idempotencyKey, auth = true } = options;
  const url = apiUrl(path, query);

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }
  if (auth) {
    Object.assign(headers, await authHeaders());
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  let text: string;

  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    // Reading the body can also fail or time out after the status arrived.
    text = response.status === 204 ? '' : await response.text();
  } catch {
    throw new NetworkError();
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 401 && auth) {
    unauthorizedHandler?.();
  }

  let payload: unknown = undefined;
  if (text !== '') {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = undefined;
    }
  }

  if (!response.ok) {
    const data = (payload ?? {}) as { message?: string; code?: string; errors?: Record<string, string[]> };

    throw new ApiError(response.status, data.message ?? '', data.code, data.errors);
  }

  return payload as T;
}

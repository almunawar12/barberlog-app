import { ApiError, ConfigError, NetworkError, request, setUnauthorizedHandler } from '@/lib/api-client';
import * as tokenStorage from '@/lib/token-storage';

jest.mock('@/lib/token-storage', () => ({
  getToken: jest.fn(),
  saveToken: jest.fn(),
  clearToken: jest.fn(),
}));

const getToken = tokenStorage.getToken as jest.Mock;
const fetchMock = jest.fn();

function jsonResponse(status: number, body?: unknown) {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  };
}

beforeEach(() => {
  jest.resetAllMocks();
  getToken.mockResolvedValue('secret-token');
  global.fetch = fetchMock as unknown as typeof fetch;
  setUnauthorizedHandler(undefined);
});

it('sends the Bearer token, JSON body and Idempotency-Key', async () => {
  fetchMock.mockResolvedValue(jsonResponse(201, { data: { id: 1 } }));

  const result = await request<{ data: { id: number } }>('/transactions', {
    method: 'POST',
    body: { note: 'x' },
    idempotencyKey: 'key-1',
  });

  expect(result).toEqual({ data: { id: 1 } });
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('https://barberlog.test/api/v1/transactions');
  expect(init.method).toBe('POST');
  expect(init.headers).toMatchObject({
    Authorization: 'Bearer secret-token',
    'Idempotency-Key': 'key-1',
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });
  expect(init.body).toBe('{"note":"x"}');
});

it('builds a query string and skips empty values', async () => {
  fetchMock.mockResolvedValue(jsonResponse(200, {}));

  await request('/history', { query: { date_from: '2026-10-01', type: undefined, page: 2, empty: '' } });

  expect(fetchMock.mock.calls[0][0]).toBe('https://barberlog.test/api/v1/history?date_from=2026-10-01&page=2');
});

it('sends no token when auth is off', async () => {
  fetchMock.mockResolvedValue(jsonResponse(200, {}));

  await request('/auth/login', { method: 'POST', body: {}, auth: false });

  expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
});

it('returns undefined for 204', async () => {
  fetchMock.mockResolvedValue(jsonResponse(204));

  await expect(request('/auth/logout', { method: 'POST' })).resolves.toBeUndefined();
});

it('turns a 422 into an ApiError with field errors', async () => {
  fetchMock.mockResolvedValue(jsonResponse(422, { message: 'Harga wajib diisi.', errors: { price: ['Harga wajib diisi.'] } }));

  const error = await request('/services', { method: 'POST', body: {} }).catch((e) => e);

  expect(error).toBeInstanceOf(ApiError);
  expect(error).toMatchObject({ status: 422, errors: { price: ['Harga wajib diisi.'] } });
});

it('keeps the stable error code of a 409', async () => {
  fetchMock.mockResolvedValue(jsonResponse(409, { message: 'Data sudah diubah.', code: 'version_conflict' }));

  const error = await request('/transactions/1', { method: 'PUT', body: {} }).catch((e) => e);

  expect(error).toMatchObject({ status: 409, code: 'version_conflict' });
});

it('reports a dropped connection as NetworkError, not as a failed write', async () => {
  fetchMock.mockRejectedValue(new TypeError('Network request failed'));

  await expect(request('/transactions', { method: 'POST', body: {} })).rejects.toBeInstanceOf(NetworkError);
});

it('reports a body that cannot be read as NetworkError', async () => {
  fetchMock.mockResolvedValue({ status: 200, ok: true, text: async () => Promise.reject(new Error('aborted')) });

  await expect(request('/dashboard')).rejects.toBeInstanceOf(NetworkError);
});

it('aborts a request that takes too long and reports NetworkError', async () => {
  jest.useFakeTimers();
  fetchMock.mockImplementation(
    (_url: string, init: { signal: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(new Error('aborted')));
      }),
  );

  const pending = request('/dashboard').catch((e) => e);
  await jest.advanceTimersByTimeAsync(15_001);

  expect(await pending).toBeInstanceOf(NetworkError);
  jest.useRealTimers();
});

it('calls the unauthorized handler on 401 for authenticated requests only', async () => {
  const handler = jest.fn();
  setUnauthorizedHandler(handler);
  fetchMock.mockResolvedValue(jsonResponse(401, { message: 'Unauthenticated.' }));

  await request('/dashboard').catch(() => undefined);
  expect(handler).toHaveBeenCalledTimes(1);

  await request('/auth/login', { method: 'POST', body: {}, auth: false }).catch(() => undefined);
  expect(handler).toHaveBeenCalledTimes(1);
});

it('fails clearly when the API URL is not configured', async () => {
  const original = process.env.EXPO_PUBLIC_API_URL;
  delete process.env.EXPO_PUBLIC_API_URL;

  await expect(request('/dashboard')).rejects.toBeInstanceOf(ConfigError);

  process.env.EXPO_PUBLIC_API_URL = original;
});

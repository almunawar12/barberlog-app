import { ApiError, NetworkError } from '@/lib/api-client';
import { describeWriteError } from '@/lib/errors';
import { id } from '@/locales/id';

it('treats a network failure as an uncertain outcome, never as "not saved"', () => {
  const failure = describeWriteError(new NetworkError());

  expect(failure.kind).toBe('uncertain');
  expect(failure.message).toBe(id.errors.uncertain);
  expect(failure.message).not.toMatch(/gagal/i);
});

it('treats a 5xx as uncertain too', () => {
  expect(describeWriteError(new ApiError(500, '')).kind).toBe('uncertain');
  expect(describeWriteError(new ApiError(503, '')).kind).toBe('uncertain');
});

it('lets a delete use its own uncertain wording', () => {
  expect(describeWriteError(new NetworkError(), id.errors.uncertainDelete).message).toBe(id.errors.uncertainDelete);
});

it('maps 422 to the first message per field', () => {
  const failure = describeWriteError(
    new ApiError(422, 'x', undefined, { 'items.0.quantity': ['Jumlah minimal 1.', 'lain'], items: [] }),
  );

  expect(failure.kind).toBe('validation');
  expect(failure.fieldErrors).toEqual({ 'items.0.quantity': 'Jumlah minimal 1.' });
});

it('keeps the code and message of a 409', () => {
  const failure = describeWriteError(new ApiError(409, 'Data berubah.', 'version_conflict'));

  expect(failure).toMatchObject({ kind: 'conflict', code: 'version_conflict', message: 'Data berubah.' });
});

it('maps 429, 401 and anything else', () => {
  expect(describeWriteError(new ApiError(429, '')).message).toBe(id.errors.rateLimited);
  expect(describeWriteError(new ApiError(401, '')).kind).toBe('unauthorized');
  expect(describeWriteError(new Error('boom')).kind).toBe('unknown');
  expect(describeWriteError(new Error('boom')).message).toBe(id.errors.unknown);
});

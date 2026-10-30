import { ApiError, NetworkError } from '@/lib/api-client';
import { id } from '@/locales/id';

export type WriteFailure = {
  kind: 'validation' | 'conflict' | 'uncertain' | 'rate_limited' | 'unauthorized' | 'unknown';
  /** Indonesian text safe to show to the owner. */
  message: string;
  /** Stable English code from the server (version_conflict, idempotency_key_conflict). */
  code?: string;
  /** First validation message per field path, e.g. "items.0.quantity". */
  fieldErrors: Record<string, string>;
};

/**
 * Turns a failed write into something the UI can act on. A timeout or 5xx never means
 * "not saved": the request may have been committed, so those are reported as uncertain
 * and the caller must retry with the same Idempotency-Key.
 */
export function describeWriteError(error: unknown, uncertainMessage: string = id.errors.uncertain): WriteFailure {
  if (error instanceof NetworkError || (error instanceof ApiError && error.status >= 500)) {
    return { kind: 'uncertain', message: uncertainMessage, fieldErrors: {} };
  }

  if (error instanceof ApiError) {
    switch (error.status) {
      case 401:
        return { kind: 'unauthorized', message: '', fieldErrors: {} };
      case 409:
        return { kind: 'conflict', message: error.message || id.errors.unknown, code: error.code, fieldErrors: {} };
      case 422:
        return {
          kind: 'validation',
          message: error.message,
          fieldErrors: Object.fromEntries(
            Object.entries(error.errors ?? {}).flatMap(([field, messages]) => (messages[0] ? [[field, messages[0]]] : [])),
          ),
        };
      case 429:
        return { kind: 'rate_limited', message: id.errors.rateLimited, fieldErrors: {} };
    }
  }

  return { kind: 'unknown', message: id.errors.unknown, fieldErrors: {} };
}

// ==============================================================================
// IconHub Provider Errors
// Strongly typed errors distinguishing rate limits, missing collections, and network failures.
// ==============================================================================

export type ProviderErrorCode =
  | 'RATE_LIMITED'
  | 'NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'INVALID_RESPONSE'
  | 'INVALID_INPUT'
  | 'ABORTED'
  | 'UPSTREAM_BATCH_FAILURE'
  | 'UNKNOWN';

export class ProviderError extends Error {
  public readonly code: ProviderErrorCode;
  public readonly status?: number;
  public readonly url?: string;

  constructor(
    message: string,
    options: {
      code: ProviderErrorCode;
      status?: number;
      url?: string;
      cause?: unknown;
    }
  ) {
    super(message);
    this.name = 'ProviderError';
    this.code = options.code;
    this.status = options.status;
    this.url = options.url;
    if (options.cause) {
      this.cause = options.cause;
    }
  }
}

export class RateLimitError extends ProviderError {
  public readonly retryAfterSeconds?: number;

  constructor(url: string, retryAfter?: number) {
    super(`Rate limit reached (429 Too Many Requests) when accessing ${url}`, {
      code: 'RATE_LIMITED',
      status: 429,
      url,
    });
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfter;
  }
}

export class NotFoundError extends ProviderError {
  constructor(resource: string, url: string) {
    super(`Resource not found: ${resource} (${url})`, {
      code: 'NOT_FOUND',
      status: 404,
      url,
    });
    this.name = 'NotFoundError';
  }
}

export class NetworkError extends ProviderError {
  constructor(message: string, url?: string, cause?: unknown) {
    super(message, {
      code: 'NETWORK_ERROR',
      url,
      cause,
    });
    this.name = 'NetworkError';
  }
}

export class InvalidResponseError extends ProviderError {
  constructor(details: string, url: string) {
    super(`Invalid provider response payload from ${url}: ${details}`, {
      code: 'INVALID_RESPONSE',
      url,
    });
    this.name = 'InvalidResponseError';
  }
}


// ==============================================================================
// IconHub Bounded Cache & In-Flight Deduplication
// Manages memory limits, TTL expiration, and reference-counted request cancellation.
// ==============================================================================

import { ProviderError } from './errors';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface InFlightEntry<T> {
  sharedController: AbortController;
  callers: Set<{
    onAbort?: () => void;
  }>;
  underlyingPromise: Promise<T>;
}

export class BoundedCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly inFlight = new Map<string, InFlightEntry<T>>();
  private readonly maxEntries: number;
  private readonly defaultTtlMs: number;

  constructor(options?: { maxEntries?: number; defaultTtlMs?: number }) {
    this.maxEntries = options?.maxEntries ?? 200;
    this.defaultTtlMs = options?.defaultTtlMs ?? 10 * 60 * 1000; // 10 minutes default
  }

  /**
   * Retrieves a value from the cache if present and unexpired.
   * Touches the key to preserve LRU ordering.
   */
  public get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    // Refresh LRU position
    this.store.delete(key);
    this.store.set(key, entry);

    return entry.value;
  }

  /**
   * Stores a value in the cache with bounded capacity and TTL.
   */
  public set(key: string, value: T, ttlMs?: number): void {
    const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);

    // Evict oldest entry if capacity reached
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) {
        this.store.delete(oldestKey);
      }
    }

    this.store.set(key, { value, expiresAt });
  }

  /**
   * Executes a fetcher with in-flight deduplication and reference-counted cancellation.
   *
   * Cancellation Semantics:
   * - Each caller may pass its own AbortSignal.
   * - If a caller aborts, its individual returned promise is rejected with ProviderError('ABORTED').
   * - Other callers awaiting the same shared in-flight request are NOT affected and continue to await the result.
   * - The underlying fetcher's shared AbortController is aborted ONLY when ALL active registered callers have aborted.
   */
  public async dedupe(
    key: string,
    fetcher: (signal: AbortSignal) => Promise<T>,
    callerSignal?: AbortSignal
  ): Promise<T> {
    // If this caller's signal is already aborted, fail fast
    if (callerSignal?.aborted) {
      throw new ProviderError('Request was aborted by caller', {
        code: 'ABORTED',
      });
    }

    // 1. Check cache first
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    // 2. Obtain or create the in-flight entry
    let entry = this.inFlight.get(key);

    if (!entry) {
      const sharedController = new AbortController();
      const callers = new Set<{ onAbort?: () => void }>();

      const underlyingPromise = fetcher(sharedController.signal)
        .then((result) => {
          this.set(key, result);
          this.inFlight.delete(key);
          return result;
        })
        .catch((err) => {
          this.inFlight.delete(key);
          throw err;
        });

      entry = {
        sharedController,
        callers,
        underlyingPromise,
      };

      this.inFlight.set(key, entry);
    }

    // 3. Register this caller and manage per-caller cancellation
    const currentEntry = entry;

    return new Promise<T>((resolve, reject) => {
      const callerRecord: { onAbort?: () => void } = {};

      const cleanup = () => {
        currentEntry.callers.delete(callerRecord);
        if (callerSignal && callerRecord.onAbort) {
          callerSignal.removeEventListener('abort', callerRecord.onAbort);
        }
      };

      if (callerSignal) {
        callerRecord.onAbort = () => {
          cleanup();
          reject(
            new ProviderError('Request was aborted by caller', {
              code: 'ABORTED',
            })
          );

          // If no active callers remain awaiting this request, abort underlying request
          if (currentEntry.callers.size === 0) {
            currentEntry.sharedController.abort();
          }
        };

        callerSignal.addEventListener('abort', callerRecord.onAbort, { once: true });
      }

      currentEntry.callers.add(callerRecord);

      currentEntry.underlyingPromise
        .then((result) => {
          cleanup();
          resolve(result);
        })
        .catch((err) => {
          cleanup();
          reject(err);
        });
    });
  }

  /**
   * Remove an entry from the cache.
   */
  public delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Clear all cached values and in-flight records.
   */
  public clear(): void {
    this.store.clear();
    this.inFlight.clear();
  }

  /**
   * Total number of currently cached valid entries.
   */
  public get size(): number {
    return this.store.size;
  }
}

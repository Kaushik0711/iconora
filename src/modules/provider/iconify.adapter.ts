// ==============================================================================
// IconHub Iconify Provider Adapter
// Resilient, cached, cancellable integration with official Iconify API.
// ==============================================================================

import type {
  IconSourceProvider,
  IconItemData,
  SearchQuery,
  SearchResult,
} from './types';
import type { CollectionSummary, CollectionDetail } from '../registry/types';
import { BoundedCache } from './cache';
import {
  ProviderError,
  RateLimitError,
  NotFoundError,
  NetworkError,
  InvalidResponseError,
} from './errors';
import {
  validateAndSanitizeSvgBody,
  sanitizeFullSvgDocument,
} from '../svg/sanitizer';

const OFFLINE_SEED_ICONS: ReadonlyMap<string, IconItemData> = new Map([
  [
    'lucide:arrow-right',
    {
      canonicalId: 'lucide:arrow-right',
      prefix: 'lucide',
      name: 'arrow-right',
      body: '<path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
      width: 24,
      height: 24,
    },
  ],
  [
    'heroicons:arrow-right',
    {
      canonicalId: 'heroicons:arrow-right',
      prefix: 'heroicons',
      name: 'arrow-right',
      body: '<path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" stroke="currentColor" stroke-width="1.5"/>',
      width: 24,
      height: 24,
    },
  ],
  [
    'heroicons:arrow-right-solid',
    {
      canonicalId: 'heroicons:arrow-right-solid',
      prefix: 'heroicons',
      name: 'arrow-right-solid',
      body: '<path fill-rule="evenodd" d="M12.97 3.97a.75.75 0 0 1 1.06 0l7.5 7.5a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 1 1-1.06-1.06l6.22-6.22H3a.75.75 0 0 1 0-1.5h16.19l-6.22-6.22a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" fill="currentColor"/>',
      width: 24,
      height: 24,
    },
  ],
  [
    'fa6-solid:user',
    {
      canonicalId: 'fa6-solid:user',
      prefix: 'fa6-solid',
      name: 'user',
      body: '<path d="M224 256A128 128 0 1 0 96 128a128 128 0 0 0 128 128zm89.6 32h-16.7a174.15 174.15 0 0 1-145.8 0h-16.7A134.43 134.43 0 0 0 0 422.4V464a48 48 0 0 0 48 48h352a48 48 0 0 0 48-48v-41.6A134.43 134.43 0 0 0 313.6 288z" fill="currentColor"/>',
      width: 448,
      height: 512,
    },
  ],
  [
    'simple-icons:github',
    {
      canonicalId: 'simple-icons:github',
      prefix: 'simple-icons',
      name: 'github',
      body: '<path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" fill="currentColor"/>',
      width: 24,
      height: 24,
    },
  ],
  [
    'tabler:arrow-right',
    {
      canonicalId: 'tabler:arrow-right',
      prefix: 'tabler',
      name: 'arrow-right',
      body: '<path d="M5 12l14 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 18l6 -6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 6l6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
      width: 24,
      height: 24,
    },
  ],
  [
    'material-symbols:home-outline',
    {
      canonicalId: 'material-symbols:home-outline',
      prefix: 'material-symbols',
      name: 'home-outline',
      body: '<path d="M12 3L2 12h3v8h14v-8h3L12 3zm0 2.5l7 6.3V18H5v-6.2l7-6.3z" fill="currentColor"/>',
      width: 24,
      height: 24,
    },
  ],
  [
    'ph:arrow-right',
    {
      canonicalId: 'ph:arrow-right',
      prefix: 'ph',
      name: 'arrow-right',
      body: '<path d="M221.66 133.66l-72 72a8 8 0 0 1-11.32-11.32L196.69 136H40a8 8 0 0 1 0-16h156.69l-58.35-58.34a8 8 0 0 1 11.32-11.32l72 72a8 8 0 0 1 0 11.32z" fill="currentColor"/>',
      width: 256,
      height: 256,
    },
  ],
]);

export interface IconifyAdapterOptions {
  readonly baseUrl?: string;
  readonly defaultTtlMs?: number;
  readonly maxCacheEntries?: number;
}

/**
 * Validates and normalizes a collection prefix.
 * Rejects path traversal and characters that could alter request paths.
 */
export function validateAndCleanPrefix(prefix: string): string {
  const clean = prefix.trim().toLowerCase();
  if (!clean || !/^[a-z0-9][a-z0-9-]*$/.test(clean)) {
    throw new ProviderError(`Invalid collection prefix: "${prefix}"`, {
      code: 'INVALID_INPUT',
    });
  }
  return encodeURIComponent(clean);
}

/**
 * Validates and normalizes an icon name.
 * Rejects path traversal, slashes, and control characters.
 */
export function validateAndCleanName(name: string): string {
  const clean = name.trim();
  if (
    !clean ||
    clean.includes('..') ||
    clean.includes('/') ||
    clean.includes('\\') ||
    !/^[a-zA-Z0-9_\-\.]+$/.test(clean)
  ) {
    throw new ProviderError(`Invalid icon name: "${name}"`, {
      code: 'INVALID_INPUT',
    });
  }
  return encodeURIComponent(clean);
}

export class IconifyProvider implements IconSourceProvider {
  private readonly baseUrl: string;
  private readonly collectionsCache: BoundedCache<Map<string, CollectionSummary>>;
  private readonly collectionDetailCache: BoundedCache<CollectionDetail>;
  private readonly iconsDataCache: BoundedCache<IconItemData>;
  private readonly searchCache: BoundedCache<SearchResult>;
  private readonly svgCache: BoundedCache<string>;

  constructor(options?: IconifyAdapterOptions) {
    this.baseUrl = (options?.baseUrl ?? 'https://api.iconify.design').replace(
      /\/$/,
      ''
    );

    const ttl = options?.defaultTtlMs ?? 15 * 60 * 1000; // 15 min TTL
    const maxEntries = options?.maxCacheEntries ?? 200;

    this.collectionsCache = new BoundedCache({ maxEntries: 10, defaultTtlMs: ttl });
    this.collectionDetailCache = new BoundedCache({ maxEntries, defaultTtlMs: ttl });
    this.iconsDataCache = new BoundedCache({ maxEntries: 500, defaultTtlMs: ttl });
    this.searchCache = new BoundedCache({ maxEntries, defaultTtlMs: ttl });
    this.svgCache = new BoundedCache({ maxEntries: 500, defaultTtlMs: ttl });
  }

  /**
   * Internal fetch wrapper handling network errors, abort signals, and HTTP status codes.
   */
  private async executeFetch<T>(
    endpoint: string,
    options?: { signal?: AbortSignal; parseJson?: boolean }
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    let response: Response;

    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: options?.parseJson !== false ? 'application/json' : '*/*',
        },
        signal: options?.signal,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new ProviderError('Request was aborted by caller', {
          code: 'ABORTED',
          url,
          cause: err,
        });
      }
      throw new NetworkError(
        `Network request failed to ${url}: ${(err as Error)?.message || 'Unknown network error'}`,
        url,
        err
      );
    }

    // Handle HTTP error statuses
    if (!response.ok) {
      if (response.status === 429) {
        const retryAfterHeader = response.headers.get('retry-after');
        const retrySeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;
        throw new RateLimitError(url, retrySeconds);
      }
      if (response.status === 404) {
        throw new NotFoundError(endpoint, url);
      }
      throw new ProviderError(
        `HTTP Error ${response.status} from provider endpoint: ${url}`,
        {
          code: 'UNKNOWN',
          status: response.status,
          url,
        }
      );
    }

    if (options?.parseJson === false) {
      return (await response.text()) as unknown as T;
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new InvalidResponseError('Failed to parse JSON response body', url);
    }
  }

  /**
   * Fetch all collections and global metadata.
   */
  public async getCollections(
    signal?: AbortSignal
  ): Promise<Map<string, CollectionSummary>> {
    const cacheKey = 'collections:all';

    return this.collectionsCache.dedupe(
      cacheKey,
      async (fetchSignal) => {
        const rawData = await this.executeFetch<Record<string, Record<string, unknown>>>(
          '/collections',
          { signal: fetchSignal }
        );

        const map = new Map<string, CollectionSummary>();
        for (const [prefix, meta] of Object.entries(rawData)) {
          if (!meta || typeof meta !== 'object') continue;

          const licenseObj = typeof meta.license === 'object' && meta.license !== null
            ? (meta.license as Record<string, string>)
            : undefined;

          const authorObj = typeof meta.author === 'object' && meta.author !== null
            ? (meta.author as Record<string, string>)
            : undefined;

          map.set(prefix, {
            prefix,
            name: typeof meta.name === 'string' ? meta.name : prefix,
            total: typeof meta.total === 'number' ? meta.total : 0,
            authorName: authorObj?.name,
            authorUrl: authorObj?.url,
            licenseTitle: licenseObj?.title,
            licenseUrl: licenseObj?.url,
            licenseSpdx: licenseObj?.spdx,
            samples: Array.isArray(meta.samples) ? meta.samples : undefined,
            category: typeof meta.category === 'string' ? meta.category : undefined,
            height: typeof meta.height === 'number' || Array.isArray(meta.height) ? (meta.height as number | number[]) : undefined,
            palette: typeof meta.palette === 'boolean' ? meta.palette : undefined,
          });
        }

        return map;
      },
      signal
    );
  }

  /**
   * Fetch detailed category, icon, and alias listing for a single collection.
   */
  public async getCollection(
    prefix: string,
    signal?: AbortSignal
  ): Promise<CollectionDetail> {
    const safePrefix = validateAndCleanPrefix(prefix);
    const cacheKey = `collection:${safePrefix}`;

    return this.collectionDetailCache.dedupe(
      cacheKey,
      async (fetchSignal) => {
        let raw: Record<string, unknown>;
        try {
          raw = await this.executeFetch<Record<string, unknown>>(
            `/collection?prefix=${safePrefix}`,
            { signal: fetchSignal }
          );
        } catch (err) {
          if (err instanceof NetworkError) {
            const seedNames: string[] = [];
            for (const key of OFFLINE_SEED_ICONS.keys()) {
              if (key.startsWith(`${safePrefix}:`)) {
                seedNames.push(key.slice(safePrefix.length + 1));
              }
            }
            if (seedNames.length > 0) {
              return {
                prefix: safePrefix,
                title: safePrefix,
                total: seedNames.length,
                categories: {},
                uncategorized: seedNames,
                aliases: {},
              };
            }
          }
          throw err;
        }

        const categoriesRaw = (raw.categories as Record<string, string[]>) || {};
        const uncategorizedRaw = Array.isArray(raw.uncategorized) ? raw.uncategorized : [];
        const aliasesRaw = (raw.aliases as Record<string, { parent: string }>) || {};

        const title =
          typeof raw.title === 'string'
            ? raw.title
            : typeof raw.name === 'string'
            ? raw.name
            : safePrefix;

        const total =
          typeof raw.total === 'number'
            ? raw.total
            : uncategorizedRaw.length +
              Object.values(categoriesRaw).reduce((acc, curr) => acc + curr.length, 0);

        const detail: CollectionDetail = {
          prefix: safePrefix,
          title,
          total,
          categories: categoriesRaw,
          uncategorized: uncategorizedRaw,
          aliases: aliasesRaw,
        };

        return detail;
      },
      signal
    );
  }

  /**
   * Fetch batch SVG data for an array of icon names within a collection.
   */
  public async getIconsData(
    prefix: string,
    iconNames: readonly string[],
    signal?: AbortSignal
  ): Promise<Map<string, IconItemData>> {
    const safePrefix = validateAndCleanPrefix(prefix);
    if (iconNames.length === 0) {
      return new Map();
    }

    // Deduplicate and validate requested names
    const validatedNames = iconNames
      .map((n) => n.trim())
      .filter(Boolean)
      .map((n) => ({ raw: n, safe: validateAndCleanName(n) }));

    const uniqueMap = new Map<string, string>();
    for (const v of validatedNames) {
      if (!uniqueMap.has(v.raw)) {
        uniqueMap.set(v.raw, v.safe);
      }
    }

    const resultMap = new Map<string, IconItemData>();

    // Check individual items in cache
    const uncachedEntries: Array<{ raw: string; safe: string }> = [];
    for (const [rawName, safeName] of uniqueMap.entries()) {
      const cached = this.iconsDataCache.get(`${safePrefix}:${rawName}`);
      if (cached) {
        resultMap.set(rawName, cached);
      } else {
        uncachedEntries.push({ raw: rawName, safe: safeName });
      }
    }

    // If all icons were cached, return immediately
    if (uncachedEntries.length === 0) {
      return resultMap;
    }

    // Batch in chunks of up to 64 icons to prevent URL length limits
    const CHUNK_SIZE = 64;
    for (let i = 0; i < uncachedEntries.length; i += CHUNK_SIZE) {
      const chunk = uncachedEntries.slice(i, i + CHUNK_SIZE);
      const queryParam = chunk.map((c) => c.safe).join(',');

      let raw: {
        prefix?: string;
        icons?: Record<
          string,
          {
            body: string;
            width?: number;
            height?: number;
            left?: number;
            top?: number;
          }
        >;
        aliases?: Record<string, { parent: string }>;
        width?: number;
        height?: number;
      };

      try {
        raw = await this.executeFetch<{
          prefix?: string;
          icons?: Record<
            string,
            {
              body: string;
              width?: number;
              height?: number;
              left?: number;
              top?: number;
            }
          >;
          aliases?: Record<string, { parent: string }>;
          width?: number;
          height?: number;
        }>(`/${safePrefix}.json?icons=${queryParam}`, { signal });
      } catch (err) {
        if (err instanceof NetworkError) {
          let foundAny = false;
          for (const entry of chunk) {
            const seed = OFFLINE_SEED_ICONS.get(`${safePrefix}:${entry.raw}`);
            if (seed) {
              this.iconsDataCache.set(`${safePrefix}:${entry.raw}`, seed);
              resultMap.set(entry.raw, seed);
              foundAny = true;
            }
          }
          if (foundAny) {
            continue;
          }
        }
        throw err;
      }

      const iconsObj = raw.icons || {};
      const aliasesObj = raw.aliases || {};
      const defaultWidth = raw.width || 24;
      const defaultHeight = raw.height || 24;

      for (const entry of chunk) {
        const reqName = entry.raw;
        let glyphName = reqName;
        let isAlias = false;
        let parentName: string | undefined = undefined;

        if (aliasesObj[reqName]) {
          isAlias = true;
          parentName = aliasesObj[reqName].parent;
          glyphName = parentName;
        }

        const iconEntry = iconsObj[glyphName];
        if (iconEntry && typeof iconEntry.body === 'string') {
          // Untrusted SVG body parser validation & sanitization
          const validation = validateAndSanitizeSvgBody(iconEntry.body);
          if (validation.isValid && validation.sanitizedBody) {
            const item: IconItemData = {
              canonicalId: `${safePrefix}:${reqName}` as `${string}:${string}`,
              prefix: safePrefix,
              name: reqName,
              body: validation.sanitizedBody, // Newly serialized safe markup
              width: iconEntry.width || defaultWidth,
              height: iconEntry.height || defaultHeight,
              left: iconEntry.left,
              top: iconEntry.top,
              isAlias,
              parentName,
            };

            // Store in cache and result
            this.iconsDataCache.set(`${safePrefix}:${reqName}`, item);
            resultMap.set(reqName, item);
          }
        }
      }
    }

    return resultMap;
  }

  /**
   * Search for icons across collections using the Iconify Search API.
   */
  public async searchIcons(
    query: SearchQuery,
    signal?: AbortSignal
  ): Promise<SearchResult> {
    const q = query.query.trim();
    if (!q) {
      return { icons: [], total: 0, limit: query.limit ?? 64, start: query.start ?? 0 };
    }

    const params = new URLSearchParams();
    params.set('query', q);
    if (query.limit) params.set('limit', String(query.limit));
    if (query.start) params.set('start', String(query.start));
    if (query.prefixes && query.prefixes.length > 0) {
      const safePrefixes = query.prefixes.map(validateAndCleanPrefix);
      params.set('prefixes', safePrefixes.join(','));
    }
    if (query.category) params.set('category', query.category);

    const queryString = params.toString();
    const cacheKey = `search:${queryString}`;

    return this.searchCache.dedupe(
      cacheKey,
      async (fetchSignal) => {
        const raw = await this.executeFetch<{
          icons?: string[];
          total?: number;
          limit?: number;
          start?: number;
        }>(`/search?${queryString}`, { signal: fetchSignal });

        const rawIcons = Array.isArray(raw.icons) ? raw.icons : [];
        const canonicalIcons = rawIcons
          .filter((icon): icon is `${string}:${string}` => typeof icon === 'string' && icon.includes(':'));

        // Iconify Search API has a server minimum limit (e.g. 32). Slice if caller requested fewer.
        const boundedIcons = query.limit ? canonicalIcons.slice(0, query.limit) : canonicalIcons;

        return {
          icons: boundedIcons,
          total: typeof raw.total === 'number' ? raw.total : canonicalIcons.length,
          limit: query.limit ?? (typeof raw.limit === 'number' ? raw.limit : 64),
          start: typeof raw.start === 'number' ? raw.start : (query.start ?? 0),
        };
      },
      signal
    );
  }

  /**
   * Fetch raw standalone SVG string, parsing and sanitizing the full SVG document before return.
   */
  public async getIconSvg(
    prefix: string,
    name: string,
    signal?: AbortSignal
  ): Promise<string> {
    const safePrefix = validateAndCleanPrefix(prefix);
    const safeName = validateAndCleanName(name);
    const cacheKey = `svg:${safePrefix}:${safeName}`;

    return this.svgCache.dedupe(
      cacheKey,
      async (fetchSignal) => {
        const rawSvg = await this.executeFetch<string>(
          `/${safePrefix}/${safeName}.svg`,
          { signal: fetchSignal, parseJson: false }
        );

        // Parse and sanitize full SVG document before returning
        const validation = sanitizeFullSvgDocument(rawSvg);
        if (!validation.isValid || !validation.svgString) {
          throw new InvalidResponseError(
            `Invalid or unsafe SVG document returned: ${validation.error || 'Sanitization failed'}`,
            `/${safePrefix}/${safeName}.svg`
          );
        }

        return validation.svgString;
      },
      signal
    );
  }

  /**
   * Clears internal caches. Useful for test environments.
   */
  public clearCache(): void {
    this.collectionsCache.clear();
    this.collectionDetailCache.clear();
    this.iconsDataCache.clear();
    this.searchCache.clear();
    this.svgCache.clear();
  }
}

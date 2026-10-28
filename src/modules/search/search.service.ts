// ==============================================================================
// IconHub Search Service
// Orchestrates multi-collection querying, category mapping, filtering, and paging.
// Applies source, category, style, and license constraints BEFORE pagination.
// Implements cursor-based continuation for filtered searches without skipping candidates.
// ==============================================================================

import { SourceRegistry } from '../registry';
import { IconifyProvider } from '../provider';
import { ProviderError } from '../provider/errors';
import { TaxonomyService } from '../taxonomy';
import {
  isStyleSupportedByPrefix,
  matchesStyleFilter,
  classifyIconStyle,
} from './style-classifier';
import type {
  SearchParams,
  SearchResponse,
  SearchIconItem,
  StyleFilter,
  LicenseFilter,
} from './types';

export class SearchService {
  private static defaultProvider = new IconifyProvider();

  /**
   * Execute an icon discovery search query across verified collections with active filters.
   */
  public static async search(
    params: SearchParams,
    optionsOrSignal?: { provider?: IconifyProvider; signal?: AbortSignal } | AbortSignal
  ): Promise<SearchResponse> {
    const isSignal = optionsOrSignal instanceof AbortSignal;
    const provider = (!isSignal && optionsOrSignal?.provider) ? optionsOrSignal.provider : this.defaultProvider;
    const signal = isSignal ? optionsOrSignal : optionsOrSignal?.signal;

    const rawCategory = (params.category || 'all').toLowerCase();
    const catDef = TaxonomyService.getById(rawCategory);
    const activeCategory = catDef?.id ?? 'all';
    const activeStyle: StyleFilter = params.style || 'all';
    const activeLicense: LicenseFilter = params.license || 'all';

    const userQuery = (params.query || '').trim();

    // 1. Single collection browsing without search query
    if (!userQuery && activeCategory === 'all' && params.sources && params.sources.length === 1) {
      const targetPrefix = params.sources[0].toLowerCase();
      if (!SourceRegistry.isVerifiedPrefix(targetPrefix)) {
        return {
          icons: [],
          total: 0,
          page: 1,
          limit: params.limit ?? 32,
          totalPages: 0,
          query: '',
          activeCategory: 'all',
          isInitialDiscovery: false,
          activeStyle,
          activeLicense,
          hasMore: false,
        };
      }

      // Check license filter compatibility
      const source = SourceRegistry.getByPrefix(targetPrefix);
      if (source && activeLicense !== 'all') {
        if (activeLicense === 'commercial' && source.license.commercialUse !== 'allowed') {
          return {
            icons: [],
            total: 0,
            page: 1,
            limit: params.limit ?? 32,
            totalPages: 0,
            query: '',
            activeCategory: 'all',
            isInitialDiscovery: false,
            activeStyle,
            activeLicense,
            hasMore: false,
          };
        }
        if (activeLicense === 'no-attribution' && source.license.attributionTerms !== 'not_required') {
          return {
            icons: [],
            total: 0,
            page: 1,
            limit: params.limit ?? 32,
            totalPages: 0,
            query: '',
            activeCategory: 'all',
            isInitialDiscovery: false,
            activeStyle,
            activeLicense,
            hasMore: false,
          };
        }
        if (activeLicense === 'trademark-safe' && Boolean(source.trademarkNotice)) {
          return {
            icons: [],
            total: 0,
            page: 1,
            limit: params.limit ?? 32,
            totalPages: 0,
            query: '',
            activeCategory: 'all',
            isInitialDiscovery: false,
            activeStyle,
            activeLicense,
            hasMore: false,
          };
        }
      }

      // Check style filter compatibility
      if (activeStyle !== 'all' && !isStyleSupportedByPrefix(targetPrefix, activeStyle)) {
        return {
          icons: [],
          total: 0,
          page: 1,
          limit: params.limit ?? 32,
          totalPages: 0,
          query: '',
          activeCategory: 'all',
          isInitialDiscovery: false,
          activeStyle,
          activeLicense,
          hasMore: false,
        };
      }

      const colDetail = await provider.getCollection(targetPrefix, signal);
      const allNamesSet = new Set<string>();
      if (colDetail.categories) {
        for (const names of Object.values(colDetail.categories)) {
          for (const n of names) allNamesSet.add(n);
        }
      }
      if (colDetail.uncategorized) {
        for (const n of colDetail.uncategorized) allNamesSet.add(n);
      }

      let iconNames = Array.from(allNamesSet);
      if (activeStyle !== 'all') {
        iconNames = iconNames.filter((name) => classifyIconStyle(targetPrefix, name) === activeStyle);
      }

      const page = Math.max(1, params.page ?? 1);
      const limit = Math.min(64, Math.max(1, params.limit ?? 32));
      const total = iconNames.length;
      const totalPages = Math.ceil(total / limit);
      const start = (page - 1) * limit;
      const pagedNames = iconNames.slice(start, start + limit);

      const iconsDataMap = await provider.getIconsData(targetPrefix, pagedNames, signal);
      const icons: SearchIconItem[] = [];
      for (const name of pagedNames) {
        const itemData = iconsDataMap.get(name);
        if (itemData) {
          const width = itemData.width || 24;
          const height = itemData.height || 24;
          icons.push({
            canonicalId: `${targetPrefix}:${name}` as `${string}:${string}`,
            prefix: targetPrefix,
            name,
            body: itemData.body,
            width,
            height,
            viewBox: `0 0 ${width} ${height}`,
            collectionName: source?.displayName || targetPrefix,
            licenseSpdx: source?.license.spdxId,
            attributionRequired: source?.license.attributionTerms === 'required',
            hasTrademarkCaveat: Boolean(source?.trademarkNotice),
            styleVariant: classifyIconStyle(targetPrefix, name),
          });
        }
      }

      return {
        icons,
        total,
        page,
        limit,
        totalPages,
        query: '',
        activeCategory: 'all',
        isInitialDiscovery: false,
        activeStyle,
        activeLicense,
        hasMore: page < totalPages,
        nextCursor: start + pagedNames.length,
      };
    }

    // 2. Default browse mode: enumerate verified collections instead of leaving
    // the initial Icon Sets page empty until a visitor submits a query.
    if (!userQuery && activeCategory === 'all') {
      let browseSources = SourceRegistry.getAllSources();

      if (params.sources?.length) {
        const selected = new Set(params.sources.map((prefix) => prefix.toLowerCase()));
        browseSources = browseSources.filter((source) => selected.has(source.canonicalPrefix));
      }

      if (activeStyle !== 'all') {
        browseSources = browseSources.filter((source) =>
          isStyleSupportedByPrefix(source.canonicalPrefix, activeStyle)
        );
      }

      if (activeLicense === 'commercial') {
        browseSources = browseSources.filter((source) => source.license.commercialUse === 'allowed');
      } else if (activeLicense === 'no-attribution') {
        browseSources = browseSources.filter((source) => source.license.attributionTerms === 'not_required');
      } else if (activeLicense === 'trademark-safe') {
        browseSources = browseSources.filter((source) => !source.trademarkNotice);
      }

      const failedPrefixes: string[] = [];
      const collections = await Promise.all(
        browseSources.map(async (source) => {
          try {
            const detail = await provider.getCollection(source.canonicalPrefix, signal);
            const names = new Set<string>();
            for (const categoryNames of Object.values(detail.categories)) {
              for (const name of categoryNames) names.add(name);
            }
            for (const name of detail.uncategorized) names.add(name);
            for (const alias of Object.keys(detail.aliases)) names.add(alias);

            const filteredNames = Array.from(names)
              .filter((name) => activeStyle === 'all' || classifyIconStyle(source.canonicalPrefix, name) === activeStyle)
              .sort((a, b) => a.localeCompare(b));

            return { source, names: filteredNames };
          } catch (error) {
            if (signal?.aborted) throw error;
            const errObj = error as { message?: string; code?: string; status?: number };
            failedPrefixes.push(source.canonicalPrefix);
            console.warn(
              `[SearchService] Collection "${source.canonicalPrefix}" failed upstream load (${errObj.code || errObj.status || 'ERROR'}): ${errObj.message || 'unknown error'}`
            );
            return { source, names: [] as string[] };
          }
        })
      );

      if (signal?.aborted) {
        throw new DOMException('The operation was aborted', 'AbortError');
      }
      if (failedPrefixes.length === browseSources.length && browseSources.length > 0) {
        throw new ProviderError(
          `Failed to load verified icon collections: ${failedPrefixes.join(', ')}`,
          { code: 'UPSTREAM_BATCH_FAILURE' }
        );
      }

      // Interleave sorted names so the first view represents all eligible libraries
      // instead of being dominated by whichever collection sorts first.
      const orderedItems: Array<{ prefix: string; name: string }> = [];
      const maxCollectionLength = collections.reduce((max, collection) => Math.max(max, collection.names.length), 0);
      for (let index = 0; index < maxCollectionLength; index++) {
        for (const collection of collections) {
          const name = collection.names[index];
          if (name) orderedItems.push({ prefix: collection.source.canonicalPrefix, name });
        }
      }

      const page = Math.max(1, params.page ?? 1);
      const limit = Math.min(64, Math.max(1, params.limit ?? 32));
      const start = Math.max(0, params.cursor ?? (page - 1) * limit);
      const pageItems = orderedItems.slice(start, start + limit);
      const namesByPrefix = new Map<string, string[]>();
      for (const item of pageItems) {
        const names = namesByPrefix.get(item.prefix) ?? [];
        names.push(item.name);
        namesByPrefix.set(item.prefix, names);
      }

      const iconBatches = await Promise.all(
        Array.from(namesByPrefix, async ([prefix, names]) => {
          try {
            return { prefix, data: await provider.getIconsData(prefix, names, signal) };
          } catch (error) {
            if (signal?.aborted) throw error;
            const errObj = error as { message?: string; code?: string; status?: number };
            failedPrefixes.push(prefix);
            console.warn(
              `[SearchService] Icon batch for "${prefix}" failed upstream (${errObj.code || errObj.status || 'ERROR'}): ${errObj.message || 'unknown error'}`
            );
            return { prefix, data: new Map() };
          }
        })
      );
      const dataByPrefix = new Map(iconBatches.map((batch) => [batch.prefix, batch.data]));
      const sourceByPrefix = new Map(browseSources.map((source) => [source.canonicalPrefix, source]));
      const icons: SearchIconItem[] = [];

      for (const item of pageItems) {
        const source = sourceByPrefix.get(item.prefix);
        const icon = dataByPrefix.get(item.prefix)?.get(item.name);
        if (!source || !icon?.body) continue;
        const width = icon.width || source.defaultViewBox.width;
        const height = icon.height || source.defaultViewBox.height;
        icons.push({
          canonicalId: `${item.prefix}:${item.name}` as `${string}:${string}`,
          prefix: item.prefix,
          name: item.name,
          body: icon.body,
          width,
          height,
          viewBox: `0 0 ${width} ${height}`,
          collectionName: source.displayName,
          licenseSpdx: source.license.spdxId,
          attributionRequired: source.license.attributionTerms === 'required',
          hasTrademarkCaveat: Boolean(source.trademarkNotice),
          styleVariant: classifyIconStyle(item.prefix, item.name),
        });
      }

      const total = orderedItems.length;
      const totalPages = Math.ceil(total / limit);
      const nextCursor = start + pageItems.length;
      return {
        icons,
        total,
        page,
        limit,
        totalPages,
        query: '',
        activeCategory: 'all',
        isInitialDiscovery: false,
        activeStyle,
        activeLicense,
        hasMore: nextCursor < total,
        nextCursor: nextCursor < total ? nextCursor : undefined,
        partialFailures: failedPrefixes.length ? Array.from(new Set(failedPrefixes)) : undefined,
      };
    }

    // 2. Base eligible collections
    let eligibleSources = SourceRegistry.getAllSources();

    // 3. Filter by explicit sources
    if (params.sources && params.sources.length > 0) {
      const allowedSet = new Set(params.sources.map((s) => s.toLowerCase()));
      eligibleSources = eligibleSources.filter((s) => allowedSet.has(s.canonicalPrefix));
    }

    // 4. Filter by category-supported prefixes
    if (activeCategory !== 'all' && catDef?.supportedPrefixes) {
      const catPrefixSet = new Set(catDef.supportedPrefixes);
      eligibleSources = eligibleSources.filter((s) => catPrefixSet.has(s.canonicalPrefix));
    }

    // 5. Filter by style prefix support
    if (activeStyle !== 'all') {
      eligibleSources = eligibleSources.filter((s) =>
        isStyleSupportedByPrefix(s.canonicalPrefix, activeStyle)
      );
    }

    // 6. Filter by license conditions
    if (activeLicense !== 'all') {
      if (activeLicense === 'commercial') {
        eligibleSources = eligibleSources.filter((s) => s.license.commercialUse === 'allowed');
      } else if (activeLicense === 'no-attribution') {
        eligibleSources = eligibleSources.filter((s) => s.license.attributionTerms === 'not_required');
      } else if (activeLicense === 'trademark-safe') {
        eligibleSources = eligibleSources.filter((s) => !s.trademarkNotice);
      }
    }

    const prefixes = eligibleSources.map((s) => s.canonicalPrefix);

    if (prefixes.length === 0) {
      return {
        icons: [],
        total: 0,
        page: params.page ?? 1,
        limit: params.limit ?? 32,
        totalPages: 0,
        query: userQuery,
        activeCategory,
        activeStyle,
        activeLicense,
        hasMore: false,
      };
    }

    // 7. Effective query string
    let effectiveQuery = userQuery;
    if (!effectiveQuery && activeCategory !== 'all') {
      effectiveQuery = catDef?.queryKeyword || activeCategory;
    }

    // 8. Pagination bounds
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(64, Math.max(1, params.limit ?? 32));
    const providerCategory = catDef?.providerCategory;

    // Check if post-filtering is required
    const isPostFiltered = activeCategory !== 'all' || activeStyle !== 'all';

    const pageCanonicalItems: Array<{ prefix: string; name: string }> = [];
    let hasMore = false;
    let nextCursor: number | undefined = undefined;
    let total: number | undefined = undefined;
    let totalPages: number | undefined = undefined;

    if (!isPostFiltered) {
      // Unfiltered search: provider's exact total and offset semantics apply directly
      const start = (page - 1) * limit;
      const searchResult = await provider.searchIcons(
        {
          query: effectiveQuery,
          prefixes,
          limit,
          start,
        },
        signal
      );

      total = searchResult.total;
      totalPages = Math.ceil(total / limit);
      hasMore = page < totalPages;
      nextCursor = start + searchResult.icons.length;

      for (const canonicalId of searchResult.icons) {
        const parsed = SourceRegistry.parseCanonicalId(canonicalId);
        if (parsed && SourceRegistry.isVerifiedPrefix(parsed.prefix)) {
          pageCanonicalItems.push(parsed);
        }
      }
    } else {
      // Filtered search: cursor-based sequential scanning
      // Continuation cursor points to the first unreturned candidate (never skips candidates)
      const CHUNK_SIZE = 64;
      const MAX_CHUNKS_PER_REQUEST = 4; // Bounded upstream fetch budget per continuation step

      let currentRawOffset = typeof params.cursor === 'number' && params.cursor >= 0 ? params.cursor : 0;
      let chunksScanned = 0;
      let upstreamExhausted = false;
      let foundWithheldMatch = false;

      while (
        pageCanonicalItems.length < limit &&
        !upstreamExhausted &&
        chunksScanned < MAX_CHUNKS_PER_REQUEST
      ) {
        chunksScanned++;

        const chunkResult = await provider.searchIcons(
          {
            query: effectiveQuery,
            prefixes,
            category: providerCategory,
            limit: CHUNK_SIZE,
            start: currentRawOffset,
          },
          signal
        );

        if (chunkResult.icons.length === 0) {
          upstreamExhausted = true;
          break;
        }

        // Process raw candidates in order
        for (let i = 0; i < chunkResult.icons.length; i++) {
          const canonicalId = chunkResult.icons[i];
          const rawIndex = currentRawOffset + i;

          const parsed = SourceRegistry.parseCanonicalId(canonicalId);
          if (!parsed || !SourceRegistry.isVerifiedPrefix(parsed.prefix)) continue;

          // Token-safe category constraint
          if (activeCategory !== 'all') {
            const matchesCat = TaxonomyService.matchesCategory(parsed.name, activeCategory);
            if (!matchesCat) continue;
          }

          // Concrete style variant constraint
          if (activeStyle !== 'all') {
            const matchesStyle = matchesStyleFilter(parsed.prefix, parsed.name, activeStyle);
            if (!matchesStyle) continue;
          }

          // Candidate matches!
          if (pageCanonicalItems.length < limit) {
            pageCanonicalItems.push(parsed);
          } else {
            // Page is full. This is the first unreturned matching candidate.
            // Set nextCursor to its raw provider index so it is fetched on next request!
            nextCursor = rawIndex;
            hasMore = true;
            foundWithheldMatch = true;
            break;
          }
        }

        if (foundWithheldMatch) {
          break;
        }

        currentRawOffset += chunkResult.icons.length;

        if (chunkResult.icons.length < CHUNK_SIZE || currentRawOffset >= chunkResult.total) {
          upstreamExhausted = true;
          break;
        }
      }

      // If we did not hit a withheld match in the current window:
      if (!foundWithheldMatch) {
        if (!upstreamExhausted) {
          // Upstream results still remain, so next request continues from currentRawOffset
          nextCursor = currentRawOffset;
          hasMore = true;
        } else {
          nextCursor = undefined;
          hasMore = false;
        }
      }

      // Never expose upstream unfiltered total as filtered total
      total = undefined;
      totalPages = undefined;
    }

    if (pageCanonicalItems.length === 0) {
      return {
        icons: [],
        total: total ?? 0,
        page,
        limit,
        totalPages: totalPages ?? 0,
        query: userQuery,
        activeCategory,
        activeStyle,
        activeLicense,
        hasMore,
        nextCursor,
        isFilteredContinuation: isPostFiltered,
      };
    }

    // 9. Batch SVG retrieval
    const groupedNamesByPrefix = new Map<string, string[]>();
    for (const item of pageCanonicalItems) {
      const names = groupedNamesByPrefix.get(item.prefix) || [];
      names.push(item.name);
      groupedNamesByPrefix.set(item.prefix, names);
    }

    const batchPromises: Array<
      Promise<{ prefix: string; data: Map<string, unknown>; error?: string }>
    > = [];

    for (const [prefix, names] of groupedNamesByPrefix.entries()) {
      batchPromises.push(
        provider
          .getIconsData(prefix, names, signal)
          .then((data) => ({ prefix, data }))
          .catch((err) => {
            const errorMsg = (err as Error)?.message || `Failed to fetch icons for ${prefix}`;
            return { prefix, data: new Map(), error: errorMsg };
          })
      );
    }

    const batchResults = await Promise.all(batchPromises);
    const failedPrefixes = batchResults
      .filter((r) => r.error)
      .map((r) => r.prefix);

    if (failedPrefixes.length > 0 && failedPrefixes.length === groupedNamesByPrefix.size) {
      throw new ProviderError(
        `Failed to retrieve icon data from upstream provider for: ${failedPrefixes.join(', ')}`,
        { code: 'UPSTREAM_BATCH_FAILURE' }
      );
    }

    const dataByPrefix = new Map<string, Map<string, unknown>>(
      batchResults.map((r) => [r.prefix, r.data])
    );

    // 10. Assemble sanitized icon items in stable result order (zero duplicates)
    const icons: SearchIconItem[] = [];
    const sourceMap = new Map(SourceRegistry.getAllSources().map((s) => [s.canonicalPrefix, s]));
    const assembledIds = new Set<string>();

    for (const item of pageCanonicalItems) {
      const canonicalId = `${item.prefix}:${item.name}`;
      if (assembledIds.has(canonicalId)) continue;
      assembledIds.add(canonicalId);

      const prefixData = dataByPrefix.get(item.prefix);
      const iconData = prefixData?.get(item.name) as
        | { body?: string; width?: number; height?: number }
        | undefined;

      if (iconData && typeof iconData.body === 'string') {
        const sourceMeta = sourceMap.get(item.prefix);
        const width = iconData.width ?? 24;
        const height = iconData.height ?? 24;
        const styleVariant = classifyIconStyle(item.prefix, item.name);

        icons.push({
          canonicalId: canonicalId as `${string}:${string}`,
          prefix: item.prefix,
          name: item.name,
          body: iconData.body,
          width,
          height,
          viewBox: `0 0 ${width} ${height}`,
          collectionName: sourceMeta?.displayName ?? item.prefix,
          licenseSpdx: sourceMeta?.license.spdxId,
          attributionRequired: sourceMeta?.license.attributionTerms === 'required',
          hasTrademarkCaveat: !!sourceMeta?.trademarkNotice,
          styleVariant,
        });
      }
    }

    return {
      icons,
      total,
      page,
      limit,
      totalPages,
      query: userQuery,
      activeCategory,
      activeStyle,
      activeLicense,
      hasMore,
      nextCursor,
      isFilteredContinuation: isPostFiltered,
      partialFailures: failedPrefixes.length > 0 ? failedPrefixes : undefined,
    };
  }
}

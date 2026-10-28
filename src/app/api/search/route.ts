// ==============================================================================
// IconHub Search API Route Handler
// GET /api/search
// Bridges client exploration interactions to verified Iconify provider data.
// ==============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { SearchService } from '@/modules/search';
import { RateLimitError, ProviderError } from '@/modules/provider/errors';

export async function GET(request: NextRequest) {
  const url = request.nextUrl || new URL(request.url);
  const searchParams = url.searchParams;

  const q = searchParams.get('q') || undefined;
  const category = searchParams.get('category') || undefined;
  const sourceParam = searchParams.get('source');
  const sources = sourceParam ? sourceParam.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
  const style = (searchParams.get('style') as 'all' | 'outline' | 'solid' | 'duotone') || undefined;
  const license = (searchParams.get('license') as 'all' | 'commercial' | 'no-attribution' | 'trademark-safe') || undefined;
  const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 32;
  const cursorParam = searchParams.get('cursor');
  const cursor = cursorParam && Number.isFinite(parseInt(cursorParam, 10)) ? parseInt(cursorParam, 10) : undefined;

  try {
    const result = await SearchService.search(
      {
        query: q,
        category,
        sources,
        style,
        license,
        page: Number.isFinite(page) && page > 0 ? page : 1,
        limit: Number.isFinite(limit) && limit > 0 ? limit : 32,
        cursor,
      },
      { signal: request.signal }
    );

    return NextResponse.json(result);
  } catch (err: unknown) {
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        {
          error: 'Rate limit reached from icon provider. Please wait a moment.',
          retryAfter: err.retryAfterSeconds,
          code: 'RATE_LIMITED',
        },
        { status: 429 }
      );
    }

    if (err instanceof ProviderError) {
      return NextResponse.json(
        {
          error: err.message,
          code: err.code,
        },
        { status: err.status || 500 }
      );
    }

    return NextResponse.json(
      {
        error: (err as Error)?.message || 'An unexpected search error occurred',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/shell/Container';
import { SourceRegistry } from '@/modules/registry';
import { IconifyProvider, validateAndCleanName } from '@/modules/provider';
import { analyzeIconArtwork } from '@/modules/customizer/analyzer';
import { IconCustomizer } from '@/components/customizer/IconCustomizer';
import type { SiblingVariant } from '@/modules/customizer/types';

interface PageProps {
  params: Promise<{ prefix: string; name: string }>;
}

export const instant = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { prefix, name } = await params;
  const source = SourceRegistry.getByPrefix(prefix);

  if (!source) {
    return {
      title: 'Icon Not Found — IconHub',
      description: 'The requested icon collection is not recognized or verified.',
    };
  }

  return {
    title: `${name} (${prefix}) — Icon Details & Customizer — IconHub`,
    description: `Inspect, customize, and export ${name} from ${source.displayName}. Licensed under ${source.license.title}. Free for commercial use.`,
  };
}

/**
 * Probes for style sibling variants based on collection naming conventions.
 */
async function findSiblingVariants(
  provider: IconifyProvider,
  prefix: string,
  name: string
): Promise<SiblingVariant[]> {
  const variants: SiblingVariant[] = [];

  // 1. Remix Icon (-line vs -fill)
  if (prefix === 'ri') {
    if (name.endsWith('-line')) {
      const base = name.slice(0, -5);
      variants.push({ name, label: 'Line (Outline)', style: 'outline', isCurrent: true });
      variants.push({ name: `${base}-fill`, label: 'Fill (Solid)', style: 'solid', isCurrent: false });
    } else if (name.endsWith('-fill')) {
      const base = name.slice(0, -5);
      variants.push({ name: `${base}-line`, label: 'Line (Outline)', style: 'outline', isCurrent: false });
      variants.push({ name, label: 'Fill (Solid)', style: 'solid', isCurrent: true });
    }
  }

  // 2. Phosphor (-bold, -fill, -light, -thin, -duotone)
  else if (prefix === 'ph') {
    const suffixes = [
      { suffix: '-bold', label: 'Bold', style: 'outline' as const },
      { suffix: '-fill', label: 'Fill', style: 'solid' as const },
      { suffix: '-light', label: 'Light', style: 'outline' as const },
      { suffix: '-thin', label: 'Thin', style: 'outline' as const },
      { suffix: '-duotone', label: 'Duotone', style: 'duotone' as const },
    ];

    let base = name;
    let currentSuffix = '';
    for (const s of suffixes) {
      if (name.endsWith(s.suffix)) {
        base = name.slice(0, -s.suffix.length);
        currentSuffix = s.suffix;
        break;
      }
    }

    variants.push({
      name: base,
      label: 'Regular',
      style: 'outline',
      isCurrent: currentSuffix === '',
    });

    for (const s of suffixes) {
      variants.push({
        name: `${base}${s.suffix}`,
        label: s.label,
        style: s.style,
        isCurrent: currentSuffix === s.suffix,
      });
    }
  }

  // 3. Heroicons (-solid vs default outline)
  else if (prefix === 'heroicons') {
    if (name.endsWith('-solid') || name.endsWith('-20-solid')) {
      const base = name.replace(/-(20-)?solid$/, '');
      variants.push({ name: base, label: 'Outline (24px)', style: 'outline', isCurrent: false });
      variants.push({ name, label: 'Solid', style: 'solid', isCurrent: true });
    } else {
      variants.push({ name, label: 'Outline (24px)', style: 'outline', isCurrent: true });
      variants.push({ name: `${name}-solid`, label: 'Solid', style: 'solid', isCurrent: false });
    }
  }

  if (variants.length <= 1) {
    return [];
  }

  // Verify candidate variants actually exist in collection
  try {
    const candidateNames = variants.filter((v) => !v.isCurrent).map((v) => v.name);
    const results = await provider.getIconsData(prefix, candidateNames);
    return variants.filter((v) => v.isCurrent || results.has(v.name));
  } catch {
    return variants.filter((v) => v.isCurrent);
  }
}

export default async function IconDetailPage({ params }: PageProps) {
  const { prefix, name } = await params;

  // 1. Verify prefix against curated source registry
  if (!SourceRegistry.isVerifiedPrefix(prefix)) {
    notFound();
  }

  const source = SourceRegistry.getByPrefix(prefix);
  if (!source) {
    notFound();
  }

  // 2. Validate icon name
  try {
    validateAndCleanName(name);
  } catch {
    notFound();
  }

  // 3. Fetch icon data via provider
  const provider = new IconifyProvider();
  let iconData;

  try {
    const batch = await provider.getIconsData(prefix, [name]);
    iconData = batch.get(name);
  } catch {
    // If upstream provider fails with rate limit or network error, show friendly error state
    return (
      <div className="py-16 sm:py-24">
        <Container>
          <div className="max-w-xl mx-auto text-center">
            <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 text-amber-600 mb-4 font-mono text-2xl">
              ⚠
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-heading)] mb-2">
              Failed to load icon
            </h1>
            <p className="text-sm text-[var(--color-text-body)] mb-6 leading-relaxed">
              We encountered an issue communicating with the upstream icon registry. Please try again in a few moments.
            </p>
            <div className="flex justify-center gap-3">
              <Link
                href={`/search?collection=${prefix}`}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]"
              >
                Browse {source.displayName}
              </Link>
              <Link
                href="/search"
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-heading)]"
              >
                Icon Search
              </Link>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  if (!iconData || !iconData.body) {
    notFound();
  }

  // 4. Analyze icon artwork for customizer parameters
  const analysis = analyzeIconArtwork(
    iconData.body,
    source,
    {
      width: iconData.width,
      height: iconData.height,
      left: iconData.left,
      top: iconData.top,
    },
    { prefix, name }
  );

  // 5. Look up sibling style variants if available
  const siblingVariants = await findSiblingVariants(provider, prefix, name);

  return (
    <div className="py-8 sm:py-12">
      <Container>
        <IconCustomizer
          iconData={iconData}
          source={source}
          analysis={analysis}
          siblingVariants={siblingVariants}
        />
      </Container>
    </div>
  );
}

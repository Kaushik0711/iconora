# IconHub

An open-source icon discovery, exploration, and real-time vector customization platform built with Next.js App Router, React 19, TypeScript, Tailwind CSS, Sass, and Motion for React.

IconHub unifies 14 curated, evidence-backed open-source icon libraries into a unified interface with live multi-format code generation (SVG, React JSX, HTML, CSS, PNG), intelligent artwork geometry analysis, persistent user preferences, accessible keyboard navigation, and theme synchronization.

---

## Table of Contents

- [Features](#features)
- [Architecture & Tech Stack](#architecture--tech-stack)
- [Route Structure](#route-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation & Setup](#installation--setup)
  - [Development Workflow](#development-workflow)
- [Verification & Quality Scripts](#verification--quality-scripts)
- [Supported Icon Sources (Curated Registry)](#supported-icon-sources-curated-registry)
  - [Curated Source Directory](#curated-source-directory)
  - [Source Detail Breakdown](#source-detail-breakdown)
- [Adding a New Icon Source](#adding-a-new-icon-source)
- [Design System & Tokens](#design-system--tokens)
- [Known Limitations & Architecture Considerations](#known-limitations--architecture-considerations)
- [Project Phases Completion Status](#project-phases-completion-status)

---

## Features

- **Unified Icon Search & Streaming Continuation:** Search across tens of thousands of icons with keyword search, category taxonomy, visual style filters (Outline, Solid, Duotone), and curated source filtering. Streaming cursor-based continuation ensures smooth infinite pagination without duplicate items.
- **Intelligent Vector Artwork Analyzer:** Deeply inspects SVG vector geometry before applying styles. Distinguishes between stroke-based outlines (enabling stroke width sliders) and fill-based visual outlines (e.g., Material Symbols, Remix Icon), disabling stroke controls when geometry does not support it to prevent broken rendering.
- **Real-Time Customizer & Multi-Format Exporters:** Live preview with controls for dimensions (16px–128px), color picking, rotation (0°–270°), container shapes (none, circle, rounded square, square), padding, and border. Generates copyable, downloadable assets in:
  - Clean, standalone SVG (with XML header, comments, and sanitized tags)
  - Production-ready React JSX component (with kebab-to-camelCase conversion and props forwarding)
  - Inline HTML snippet
  - CSS background-image Data URI and CSS mask rules
  - High-resolution rasterized PNG via canvas rendering
- **Attribution & Trademark Notice Integration:** Automatically detects licenses with mandatory attribution terms (e.g., CC BY 4.0 for Font Awesome Free Solid) or trademark caveats (e.g., Simple Icons, GitHub Octicons), rendering prominent UI attribution notices and embedding required legal header comments in exported code snippets.
- **Libraries Directory & Collection Exploration:** Browse libraries with live search, collection-level licensing badges, and direct links to upstream repositories.
- **Local Persistence & Favorites:** Save favorite collections and icons, and track recently viewed items with ordered deduplication, backed by `localStorage` with silent in-memory fallback.
- **Responsive & Accessible Design:** WCAG AA compliant with minimum 4.5:1 text contrast and 3:1 non-text focus indicator contrast in both Light and Dark modes. Fully navigable via keyboard (`/` or `Ctrl+K`/`Cmd+K` for search, `Escape` to dismiss overlays and restore focus, roving tab indexing) and compliant mobile touch targets ($\ge 44\text{px}$).
- **Smooth Motion & Theme Switching:** Seamless dark/light theme switching with system OS synchronization, zero layout flash, and strict support for `prefers-reduced-motion`.

---

## Architecture & Tech Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Framework** | Next.js 16.4.3 (App Router) | Webpack bundler, Partial Prerendering (PPR), static generation |
| **UI Library** | React 19.3.0 | Server and Client Components with React Suspense boundaries |
| **Language** | TypeScript 5 (Strict Mode) | Strict type contracts across domain, registry, and provider models |
| **Styling** | Tailwind CSS v4 & Sass | Semantic CSS custom properties via centralized design tokens |
| **Motion** | Motion for React 14.6.0 | Animated state transitions with reduced-motion fallbacks |
| **Typography** | Plus Jakarta Sans | Variable font bundled locally via `@fontsource-variable` (0 network hops) |
| **XML / SVG Engine** | `@xmldom/xmldom` | Safe XML DOM parsing, attribute mutation, and fail-closed sanitization |
| **Upstream Provider** | Iconify REST API | Structured vector glyph data retrieval with timeout resilience |
| **Verification** | Node.js Test Runner & Puppeteer | Native ES test runner (`node --test`) and headless Chrome automation |

---

## Route Structure

All routes are fully implemented with responsive layouts across mobile, tablet, and desktop viewports:

| Route | Type | Description |
| :--- | :--- | :--- |
| `/` | Static | Homepage featuring hero search, curated category pills, featured collections, and interactive customizer preview |
| `/search` | Static + Client Explorer | Unified search interface with keyword debounce, faceted filters, and cursor continuation |
| `/collections` | Static | Comprehensive directory of all 14 curated icon sources with keyword filtering and favorite stars |
| `/collection/[prefix]` | Partial Prerender (PPR) | Single library explorer (e.g., `/collection/lucide`) with metadata banner, license details, and collection-scoped search |
| `/icon/[prefix]/[name]` | Partial Prerender (PPR) | Icon detail and customization studio (e.g., `/icon/lucide/arrow-right`) with live SVG editing, artwork inspector, and code exporters |
| `/about` | Static | Architecture overview, licensing philosophy, verified registry documentation, and technical principles |
| `/api/search` | Dynamic API Route Handler | Search proxy with query normalization, faceted post-filtering, bounded scanning, and cursor continuation |
| `not-found.tsx` | Error Boundary | Accessible 404 page with recovery navigation links |
| `error.tsx` | Error Boundary | Graceful runtime error boundary with retry triggers |

---

## Getting Started

### Prerequisites

- **Node.js:** v20.x or higher (tested on Node v20.x and v24.x)
- **npm:** v10.x or higher (tested on npm 12.x)
- **Google Chrome:** Required for running headless browser verification scripts (`puppeteer-core`)

### Installation & Setup

1. Clone the repository and enter the workspace:
   ```bash
   git clone <repo-url> iconhub
   cd iconhub
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development Workflow

Start the local development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Verification & Quality Scripts

| Command | Scope / Purpose |
| :--- | :--- |
| `npm run typecheck` | Validates TypeScript types across the entire project (`tsc --noEmit`) with 0 errors |
| `npm run lint` | Runs ESLint across all app, component, and module code with 0 errors/warnings |
| `npm test` | Runs the full unit and integration test suite across all modules (106 tests) |
| `npm run build` | Compiles an optimized production build using Webpack and Partial Prerendering |
| `npm run start` | Serves the compiled production build locally |

### Browser Automation Verification Scripts

Located in `scripts/`, these scripts launch headless Chrome and test production behavior against actual compiled assets:

```bash
# Comprehensive Phase 9 audit (multi-viewport responsiveness, touch targets, contrast ratios, bundle sizes, continuation, debounce, and error fallbacks):
node scripts/verify-phase-9.mjs

# Advanced UX, theme persistence, keyboard shortcuts, accessible toasts, and reduced motion:
node scripts/verify-ux-motion.mjs

# Collections directory, library detail pages, favorites, and not-found fallbacks:
node scripts/verify-collections.mjs

# Icon customizer, geometry analysis, stroke/fill controls, and code exporters:
node scripts/verify-customizer.mjs

# Homepage responsive layout and category navigation:
node scripts/verify-homepage.mjs

# Search explorer, filter drawer, and query results:
node scripts/verify-search.mjs
```

*Note: All browser verification scripts cleanly terminate the Next.js server and headless Chrome on completion or failure, exiting with code 0 on success and non-zero on assertion failure.*

---

## Supported Icon Sources (Curated Registry)

All icon collections in IconHub are backed by authoritative evidence verified directly against primary upstream repositories (`src/modules/registry/sources.config.ts`). IconHub strictly refuses to display unverified or synthetic sources.

### Curated Source Directory

| Prefix | Library Name | License (SPDX) | Attribution | Trademark Caveats | Supported Styles | Verified Total | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `lucide` | Lucide | `ISC` | Not Required | None | Outline | 1,903 | Verified |
| `heroicons` | Heroicons | `MIT` | Not Required | None | Outline, Solid | 1,288 | Verified |
| `tabler` | Tabler Icons | `MIT` | Not Required | None | Outline, Solid | 6,238 | Verified |
| `ph` | Phosphor Icons | `MIT` | Not Required | None | Outline, Solid, Duotone | 9,072 | Verified |
| `ri` | Remix Icon | `Apache-2.0` | Not Required | None | Outline, Solid | 3,188 | Verified |
| `feather` | Feather Icons | `MIT` | Not Required | None | Outline | 286 | Verified |
| `bi` | Bootstrap Icons | `MIT` | Not Required | None | Outline, Solid | 2,078 | Verified |
| `simple-icons` | Simple Icons | `CC0-1.0` | Not Required | Brand trademarks apply | Solid | 3,467 | Verified |
| `material-symbols`| Material Symbols | `Apache-2.0` | Not Required | None | Outline, Solid | 15,744 | Verified |
| `carbon` | Carbon Icons | `Apache-2.0` | Not Required | None | Outline, Solid | 2,638 | Verified |
| `octicon` | Octicons | `MIT` | Not Required | GitHub logo policy applies | Solid, Outline | 780 | Verified |
| `fluent` | Fluent UI Icons | `MIT` | Not Required | None | Outline, Solid | 19,900 | Verified |
| `ion` | Ionicons | `MIT` | Not Required | None | Outline, Solid | 1,357 | Verified |
| `fa6-solid` | Font Awesome Free Solid | `CC-BY-4.0` | **Required** | None | Solid | 1,402 | Verified |

### Source Detail Breakdown

#### 1. Lucide (`lucide`)
- **Upstream:** [lucide.dev](https://lucide.dev) | **Repository:** [github.com/lucide-icons/lucide](https://github.com/lucide-icons/lucide)
- **License:** ISC License (`ISC`) — [License Text](https://github.com/lucide-icons/lucide/blob/main/LICENSE)
- **Attribution:** Not required in UI. Notice preserved in source code.
- **Capabilities:** Native stroke-based outlines (`paintMode: stroke`, default viewBox `0 0 24 24`). Stroke-width controls enabled.

#### 2. Heroicons (`heroicons`)
- **Upstream:** [heroicons.com](https://heroicons.com) | **Repository:** [github.com/tailwindlabs/heroicons](https://github.com/tailwindlabs/heroicons)
- **License:** MIT License (`MIT`) — [License Text](https://github.com/tailwindlabs/heroicons/blob/master/LICENSE)
- **Attribution:** Not required. Free for personal and commercial projects.
- **Capabilities:** Outline variants (`paintMode: stroke`) support stroke width; solid variants (`paintMode: fill`) disable stroke width to preserve geometry. Default viewBox `0 0 24 24`.

#### 3. Tabler Icons (`tabler`)
- **Upstream:** [tabler.io/icons](https://tabler.io/icons) | **Repository:** [github.com/tabler/tabler-icons](https://github.com/tabler/tabler-icons)
- **License:** MIT License (`MIT`) — [License Text](https://github.com/tabler/tabler-icons/blob/master/LICENSE)
- **Attribution:** Not required.
- **Capabilities:** Highly customizable 24x24 icons across outline and solid variants.

#### 4. Phosphor Icons (`ph`)
- **Upstream:** [phosphoricons.com](https://phosphoricons.com) | **Repository:** [github.com/phosphor-icons/core](https://github.com/phosphor-icons/core)
- **License:** MIT License (`MIT`) — [License Text](https://github.com/phosphor-icons/core/blob/main/LICENSE)
- **Attribution:** Not required.
- **Capabilities:** Multi-weight collection (regular, bold, fill, duotone). Stroke width supported on stroke-based weights. Default viewBox `0 0 24 24`.

#### 5. Remix Icon (`ri`)
- **Upstream:** [remixicon.com](https://remixicon.com) | **Repository:** [github.com/Remix-Design/RemixIcon](https://github.com/Remix-Design/RemixIcon)
- **License:** Apache 2.0 (`Apache-2.0`) — [License Text](https://github.com/Remix-Design/RemixIcon/blob/master/License)
- **Attribution:** Not required.
- **Capabilities:** Outlines are fill-based vectors (`paintMode: fill`). Stroke-width slider is disabled with a "Fill-Based" indicator to prevent visual corruption.

#### 6. Feather Icons (`feather`)
- **Upstream:** [feathericons.com](https://feathericons.com) | **Repository:** [github.com/feathericons/feather](https://github.com/feathericons/feather)
- **License:** MIT License (`MIT`) — [License Text](https://github.com/feathericons/feather/blob/main/LICENSE)
- **Attribution:** Not required.
- **Capabilities:** Classic stroke-based foundation set (viewBox `0 0 24 24`). Maintained in archive status.

#### 7. Bootstrap Icons (`bi`)
- **Upstream:** [icons.getbootstrap.com](https://icons.getbootstrap.com) | **Repository:** [github.com/twbs/icons](https://github.com/twbs/icons)
- **License:** MIT License (`MIT`) — [License Text](https://github.com/twbs/icons/blob/main/LICENSE.md)
- **Attribution:** Not required.
- **Capabilities:** Compact 16x16 default viewBox. Fill-based glyphs across outline and solid variants.

#### 8. Simple Icons (`simple-icons`)
- **Upstream:** [simpleicons.org](https://simpleicons.org) | **Repository:** [github.com/simple-icons/simple-icons](https://github.com/simple-icons/simple-icons)
- **License:** CC0 1.0 Universal (`CC0-1.0`) — [License Text](https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md)
- **Attribution:** Not required for code.
- **Trademark Caveat:** CC0 covers SVG path code only. Brand names and logos are trademarks of their respective owners and may not be used without trademark authorization or endorsement.
- **Capabilities:** Solid brand glyphs (default viewBox `0 0 24 24`).

#### 9. Material Symbols (`material-symbols`)
- **Upstream:** [fonts.google.com/icons](https://fonts.google.com/icons) | **Repository:** [github.com/google/material-design-icons](https://github.com/google/material-design-icons)
- **License:** Apache 2.0 (`Apache-2.0`) — [License Text](https://github.com/google/material-design-icons/blob/master/LICENSE)
- **Attribution:** Not required.
- **Capabilities:** Outlines are drawn via filled compound paths (`paintMode: fill`). Stroke controls disabled automatically by artwork analyzer.

#### 10. Carbon Icons (`carbon`)
- **Upstream:** [carbondesignsystem.com](https://carbondesignsystem.com) | **Repository:** [github.com/carbon-design-system/carbon](https://github.com/carbon-design-system/carbon)
- **License:** Apache 2.0 (`Apache-2.0`) — [License Text](https://github.com/carbon-design-system/carbon/blob/main/LICENSE)
- **Attribution:** Not required.
- **Capabilities:** Built to IBM Carbon 32x32 pixel grid standards.

#### 11. Octicons (`octicon`)
- **Upstream:** [primer.style/foundations/icons](https://primer.style/foundations/icons) | **Repository:** [github.com/primer/octicons](https://github.com/primer/octicons)
- **License:** MIT License (`MIT`) — [License Text](https://github.com/primer/octicons/blob/main/LICENSE)
- **Attribution:** Not required.
- **Trademark Caveat:** General glyphs are MIT. GitHub mark and logo (`mark-github`, `logo-github`) are protected by GitHub trademark guidelines.

#### 12. Fluent UI Icons (`fluent`)
- **Upstream:** [fluenticons.co](https://fluenticons.co) | **Repository:** [github.com/microsoft/fluentui-system-icons](https://github.com/microsoft/fluentui-system-icons)
- **License:** MIT License (`MIT`) — [License Text](https://github.com/microsoft/fluentui-system-icons/blob/main/LICENSE)
- **Attribution:** Not required. Microsoft trademarks excluded.
- **Capabilities:** Comprehensive design system icons with dual visual styles (24x24 viewBox).

#### 13. Ionicons (`ion`)
- **Upstream:** [ionic.io/ionicons](https://ionic.io/ionicons) | **Repository:** [github.com/ionic-team/ionicons](https://github.com/ionic-team/ionicons)
- **License:** MIT License (`MIT`) — [License Text](https://github.com/ionic-team/ionicons/blob/main/LICENSE)
- **Attribution:** Not required.
- **Capabilities:** Designed for web, iOS, Android, and desktop apps.

#### 14. Font Awesome Free Solid (`fa6-solid`)
- **Upstream:** [fontawesome.com](https://fontawesome.com) | **Repository:** [github.com/FortAwesome/Font-Awesome](https://github.com/FortAwesome/Font-Awesome)
- **License:** Creative Commons Attribution 4.0 International (`CC-BY-4.0`) — [License Text](https://creativecommons.org/licenses/by/4.0/)
- **Attribution: Strictly Required.** Redistribution, embedding, or customized exports must include attribution credit to Font Awesome. IconHub enforces an attribution banner in the customizer and prepends legal attribution comments to exported SVG and code snippets.
- **Capabilities:** Solid filled geometry (`paintMode: fill`, 24x24 viewBox).

---

## Adding a New Icon Source

To integrate a new icon source, follow this 5-step checklist to ensure metadata accuracy and security:

### Step 1: Upstream Investigation & Authoritative Licensing Audit
1. Verify the official upstream repository, organization, and maintenance status.
2. Inspect the repository's primary `LICENSE` file. Confirm:
   - SPDX License Identifier
   - Copyright holder and publication year
   - Commercial use permissions (`allowed` vs. `restricted`)
   - Attribution requirements (`required` vs. `not_required`)
   - Any trademark caveats on logos or brand marks
3. Determine geometry constraints: default `viewBox` (e.g., 24x24 vs. 16x16) and whether artwork is drawn via strokes (`paintMode: stroke`) or filled outlines (`paintMode: fill`).

### Step 2: Register in Curated Source Registry
Add the new library entry to `src/modules/registry/sources.config.ts`:

```typescript
{
  id: 'my-new-lib',
  canonicalPrefix: 'my-new-lib',
  displayName: 'My New Library',
  upstreamUrl: 'https://example.com',
  repositoryUrl: 'https://github.com/example/my-new-lib',
  verificationStatus: 'verified',
  verificationDate: '2026-10-28',
  license: {
    id: 'MIT',
    title: 'MIT License',
    spdxId: 'MIT',
    url: 'https://github.com/example/my-new-lib/blob/main/LICENSE',
    verificationStatus: 'verified',
    attributionTerms: 'not_required',
    commercialUse: 'allowed',
    verificationDate: '2026-10-28',
    notes: 'Permissive open-source terms verified directly in repository root.',
  },
  integrationMethod: 'iconify_api',
  supportedStyles: ['outline'],
  defaultViewBox: { width: 24, height: 24 },
  verifiedTotal: 500,
  description: 'Concise, informative description of the library.',
  visualTag: '24px • Outline',
  maintenanceStatus: 'active',
  featured: false,
}
```

### Step 3: Provider & Search Integration
If the library uses distinctive variant naming conventions (e.g., `-filled`, `-outline`, or weight suffixes), configure mapping rules in:
- `src/modules/search/style-classifier.ts` (maps icon identifiers to concrete styles: `outline`, `solid`, `duotone`)
- `src/modules/provider/iconify.adapter.ts` (ensures the prefix is enabled in batch queries)

### Step 4: Attribution & Trademark Enforcement
If the library requires attribution (e.g. `CC-BY-4.0`) or carries trademark restrictions:
- In `src/modules/customizer/attribution.ts`, verify attribution comments format appropriately.
- Ensure `trademarkPolicy` or `attributionTerms: 'required'` is accurately set on the registry entry.

### Step 5: Verification Suite
Run validation tests to ensure the new source does not break existing contracts:
```bash
npm run typecheck
npm test
npm run build
```

---

## Design System & Tokens

Centralized SCSS variables in `src/styles/tokens.scss` export semantic CSS custom properties used across the application:

| CSS Variable | Light Theme | Dark Theme | Role |
| :--- | :---: | :---: | :--- |
| `--color-primary` | `#6045FF` | `#7551FF` | Brand purple accent; interactive active states |
| `--color-primary-hover` | `#4E34E8` | `#8666FF` | Button hover and pressed states |
| `--color-primary-light` | `#F0EDFF` | `rgba(117, 81, 255, 0.16)` | Subtle badge backgrounds & focus rings |
| `--color-heading` | `#111831` | `#F8FAFC` | Headings, titles, high-emphasis text |
| `--color-text-body` | `#53617D` | `#94A3B8` | Body paragraphs, standard text |
| `--color-text-muted` | `#5E6C84` | `#8295AB` | Subtitles, breadcrumbs, captions ($\ge 4.5:1$ contrast) |
| `--color-bg-main` | `#FFFFFF` | `#0B0F19` | Main page canvas surface |
| `--color-bg-secondary`| `#F8F9FF` | `#111827` | Card surfaces, chips, secondary panels |
| `--color-border` | `#E8EAF3` | `#1E293B` | Subtle borders, dividers, inputs |
| `--focus-ring` | `0 0 0 3px rgba(96, 69, 255, 0.35)` | `0 0 0 3px rgba(117, 81, 255, 0.5)` | Non-text keyboard focus ring ($\ge 3:1$ contrast) |
| `--shadow-subtle` | `0 1px 3px rgba(17, 24, 49, 0.05)` | `0 1px 3px rgba(0, 0, 0, 0.35)` | Subtle card elevation |
| `--shadow-card` | `0 4px 20px -2px rgba(17, 24, 49, 0.06)` | `0 4px 20px -2px rgba(0, 0, 0, 0.45)` | Prominent elevated container shadow |

---

## Known Limitations & Architecture Considerations

1. **Upstream Network Dependencies & Rate Limiting:**
   Icon data and SVG path definitions are retrieved on demand from the Iconify public API. While the server-side API proxy implements request caching and retry logic, rapid successive queries may trigger HTTP 429 rate limits from upstream providers. The client UI intercepts 429 and 500 status codes cleanly, displaying actionable retry alerts without crashing.
2. **Stroke Width vs. Fill-Based Geometry:**
   Many modern icon libraries (Material Symbols, Remix Icon, Bootstrap Icons) draw visual "outlines" using closed fill paths rather than SVG `stroke` attributes. IconHub's SVG analyzer detects this geometry and intentionally disables stroke-width controls for these icons. This is by design: attempting to apply stroke width to fill-based paths distorts their geometry.
3. **Headless Browser Test Environment:**
   Running Puppeteer browser verification scripts requires network port binding (`PORT 3012`) and should be run with elevated network permissions (`BypassSandbox: true`) in sandboxed terminal environments.
4. **Trademark Caveats on Public Domain SVG Paths:**
   For collections like `simple-icons`, the SVG code is released under CC0 (public domain), but the underlying company logos and brand marks remain registered trademarks of their respective owners. IconHub explicitly marks these restrictions in exports and detail pages.

---

## Project Phases Completion Status

All ten development phases of IconHub are complete, verified, and audited:

- [x] **Phase 1:** Repository audit and technical research
- [x] **Phase 2:** Project foundation and design system
- [x] **Phase 3:** Homepage UI
- [x] **Phase 4:** Icon source integration
- [x] **Phase 5:** Search, categories, filters, and pagination
- [x] **Phase 6:** Icon details and customizer
- [x] **Phase 7:** Library pages and collections
- [x] **Phase 8:** Advanced UX and motion
- [x] **Phase 9:** Responsive QA, accessibility, and performance
- [x] **Phase 10:** Final audit and documentation

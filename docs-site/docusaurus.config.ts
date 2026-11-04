import type { Config } from '@docusaurus/types'
import type * as Preset from '@docusaurus/preset-classic'

/**
 * Wicket's documentation site.
 *
 * Three sources, none written here:
 *
 *   • Guides    → docs/*.md               → docs-site/docs/guides/ → /guides/...
 *   • Wiki      → corpus/wiki/*.md, log.md → docs-site/docs/wiki/   → /wiki/...
 *   • Reference → TypeDoc over shared/     → static/reference/      → /reference/
 *
 * scripts/sync-corpus.mjs renders the first two on every build; edit the
 * sources, never the rendered copies. The landing page (docs/index.mdx) is the
 * only page written for the site itself.
 *
 * The site lives in `docs-site/` because `docs/` already holds the guides the
 * README links to. It is its own npm package with its own lockfile, not a
 * workspace: the API's image runs `npm ci` over every workspace, and the docs
 * toolchain has no business in that build.
 */

// The deployed base path, baked in. vps-deploy ships what is already built and
// checks this base rather than setting it, so a wrong base fails the deploy by
// name instead of shipping a page whose every asset 404s. DOCS_BASE overrides
// it for a copy served somewhere else.
const baseUrl = process.env.DOCS_BASE ?? '/wicket/docs/'

const config: Config = {
  title: 'Wicket',
  tagline: 'One queue for every LLM call, one call at a time.',
  // Only used for absolute URLs (sitemap, og tags). A placeholder: the docs
  // never name the production host.
  url: 'https://example.org',
  baseUrl,
  // Directory-style URLs (/wiki/api/ → wiki/api/index.html), which is what a
  // sub-path static deploy serves.
  trailingSlash: true,
  // The v4 behaviour now, so the v4 upgrade is a version bump.
  future: { v4: true },
  onBrokenLinks: 'throw',
  onBrokenAnchors: 'warn',
  markdown: {
    // The synced .md pages parse as CommonMark, the landing .mdx as MDX. MDX for
    // everything breaks on prose: a bare `<` or `{` is JSX.
    format: 'detect',
    hooks: { onBrokenMarkdownLinks: 'throw' },
  },
  i18n: { defaultLocale: 'en', locales: ['en'] },
  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/', // docs-only site: no /docs/ prefix under the base
          sidebarPath: './sidebars.ts',
        },
        blog: false,
        theme: { customCss: './src/css/custom.css' },
      } satisfies Preset.Options,
    ],
  ],
  // Local, offline search.
  themes: [
    [
      '@easyops-cn/docusaurus-search-local',
      { hashed: true, docsRouteBasePath: '/', indexBlog: false, indexPages: false },
    ],
  ],
  themeConfig: {
    // Light only, like the queue page's default. With disableSwitch the mode is
    // fixed: no toggle, and a stored preference is never read.
    colorMode: { defaultMode: 'light', disableSwitch: true, respectPrefersColorScheme: false },
    navbar: {
      title: 'Wicket',
      items: [{ href: 'pathname:///reference/', label: 'API reference', position: 'right' }],
    },
  } satisfies Preset.ThemeConfig,
}

export default config

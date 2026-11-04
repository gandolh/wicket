import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

// Doc items are checked at build time: an entry for a page that does not exist
// fails the build instead of rendering a dead link. Doc ids are paths under
// docs/ without the extension (docs/wiki/status.md → 'wiki/status'). The pages
// are listed by hand because their order and labels are curated; a new wiki
// page still builds and is linked from the pages that mention it.
const sidebars: SidebarsConfig = {
  docs: [
    {
      type: 'category',
      label: 'Start here',
      collapsible: false,
      items: [
        { type: 'doc', id: 'index', label: 'What Wicket is' },
        { type: 'doc', id: 'wiki/overview', label: 'Overview' },
        { type: 'doc', id: 'guides/getting-started', label: 'Getting started' },
        { type: 'doc', id: 'guides/architecture', label: 'Architecture at a glance' },
      ],
    },
    {
      type: 'category',
      label: 'Calling it',
      collapsible: false,
      items: [
        { type: 'doc', id: 'wiki/api', label: 'The API contract' },
        { type: 'doc', id: 'wiki/providers', label: 'Cloud and backup' },
        { type: 'doc', id: 'wiki/sign-in', label: 'Sign-in and routes' },
        // Generated HTML in static/, not a Docusaurus route: `pathname://` makes
        // it a plain link (baseUrl still applied) instead of a router
        // navigation that would 404.
        { type: 'link', label: '@wicket/shared (TypeDoc)', href: 'pathname:///reference/' },
      ],
    },
    {
      type: 'category',
      label: 'Running it',
      collapsible: false,
      items: [{ type: 'doc', id: 'guides/owner-setup', label: 'Owner setup (VPS)' }],
    },
    {
      type: 'category',
      label: 'Maintainer, from the corpus',
      collapsible: false,
      items: [
        { type: 'doc', id: 'wiki/architecture', label: 'Architecture' },
        { type: 'doc', id: 'wiki/decisions', label: 'Decisions' },
        { type: 'doc', id: 'wiki/glossary', label: 'Glossary' },
        { type: 'doc', id: 'wiki/open-questions', label: 'Open questions' },
        { type: 'doc', id: 'wiki/status', label: 'Status' },
        { type: 'doc', id: 'wiki/log', label: 'Change log' },
      ],
    },
  ],
}

export default sidebars

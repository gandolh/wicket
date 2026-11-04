// Render the repo's two hand-written source trees into the Docusaurus docs tree.
// Both stay the single source of truth; this script only renders them and never
// writes back.
//
//   corpus/wiki/*.md, corpus/log.md ─►  docs-site/docs/wiki/<slug>.md
//   docs/*.md (not README.md)       ─►  docs-site/docs/guides/<name>.md
//   docs/images/*.{svg,webp,...}    ─►  docs-site/docs/guides/images/<name>
//
// Corpus pages are discovered, not listed: every *.md under corpus/wiki/, plus
// log.md at the corpus root, minus the DENY set. A list would drift silently.
// docs/README.md is the folder's index for GitHub readers; the site has its
// own landing and sidebar, so it is not rendered.
//
// Frontmatter is rewritten to Docusaurus's keys: the first `# H1` becomes the
// title (and is stripped), `summary:` becomes the description, and a note says
// where the page came from.
//
// Links are resolved against the SOURCE file's directory, as GitHub resolves
// them, then re-expressed from the page's OUTPUT position:
//   - a link to another rendered page becomes a relative file link to its
//     output, which Docusaurus resolves under any baseUrl and checks at build;
//   - an image under docs/images/ points at its copy beside the guides;
//   - a link to anything else in the repo (source code, a brief, a todo) becomes
//     a GitHub link when DOCS_REPO_URL names the repository, and plain text
//     otherwise. The repo never writes its own address down: it would name an
//     account, and the corpus names no usernames.
//
// The generated files carry a "do not edit" note and are gitignored. Run with
// `npm run sync-corpus` (also before `start` and `docs`).

const GITHUB_REPO = (process.env.DOCS_REPO_URL ?? '').replace(/\/+$/, '')
const BRANCH = 'main'
// Corpus pages deliberately NOT published, by slug. A new page is published by
// default; keeping one back is a decision someone wrote down here.
const DENY = new Set([])

import { readFile, writeFile, mkdir, rm, readdir, stat, copyFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, resolve, basename, posix } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const siteDir = resolve(here, '..')
const outRoot = resolve(siteDir, 'docs')

/** The nearest ancestor of the site that holds a corpus/, with no hard-coded depth. */
function findRepoRoot(from) {
  for (let dir = from; ; dir = dirname(dir)) {
    if (existsSync(resolve(dir, 'corpus'))) return dir
    if (dirname(dir) === dir) return undefined
  }
}

const repoRoot = findRepoRoot(siteDir)

/** Corpus pages to render, as repo-relative sources and docs-relative outputs. */
async function discoverCorpus() {
  const corpus = resolve(repoRoot, 'corpus')
  const pages = []
  const wikiDir = resolve(corpus, 'wiki')
  if (existsSync(wikiDir)) {
    const files = (await readdir(wikiDir)).filter((f) => f.endsWith('.md')).sort()
    for (const f of files) pages.push({ slug: basename(f, '.md'), src: `corpus/wiki/${f}` })
  }
  for (const root of ['status.md', 'log.md']) {
    // This corpus keeps status in wiki/, so it already has a `status` slug.
    const slug = basename(root, '.md')
    if (existsSync(resolve(corpus, root)) && !pages.some((p) => p.slug === slug)) {
      pages.push({ slug, src: `corpus/${root}` })
    }
  }
  return pages
    .filter((p) => !DENY.has(p.slug))
    .map(({ slug, src }) => ({ kind: 'wiki', src, out: `wiki/${slug}.md` }))
}

/** The guides: docs/*.md, one level, without the folder's README. */
async function discoverGuides() {
  const dir = resolve(repoRoot, 'docs')
  if (!existsSync(dir)) return []
  return (await readdir(dir))
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .sort()
    .map((f) => ({ kind: 'guides', src: `docs/${f}`, out: `guides/${f}` }))
}

/** Copy the pictures in docs/images/ (not its notes or scripts) beside the rendered guides. */
async function copyImages() {
  const dir = resolve(repoRoot, 'docs/images')
  if (!existsSync(dir)) return 0
  const target = resolve(outRoot, 'guides/images')
  await mkdir(target, { recursive: true })
  let n = 0
  for (const f of await readdir(dir)) {
    if (!/\.(svg|webp|png|jpe?g|gif)$/i.test(f)) continue
    await copyFile(resolve(dir, f), resolve(target, f))
    n++
  }
  return n
}

/** Split leading `--- ... ---` frontmatter from a markdown body. */
function splitFrontmatter(raw) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw)
  if (!m) return { fm: {}, body: raw }
  const fm = {}
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_-]+):\s*(.*)$/.exec(line)
    if (kv) fm[kv[1]] = kv[2].trim()
  }
  return { fm, body: raw.slice(m[0].length) }
}

/** Pull the first `# H1` as the title, and strip it from the body. */
function extractTitle(body, fallback) {
  const m = /^#\s+(.+?)\s*$/m.exec(body)
  if (m && body.slice(0, m.index).trim() === '') {
    return { title: m[1].trim(), body: body.slice(m.index + m[0].length).replace(/^\r?\n/, '') }
  }
  return { title: fallback, body }
}

/**
 * Rewrite the relative links in one page. Fenced code blocks are left alone:
 * a `[x](y)` in an example is not a link.
 */
async function rewriteLinks(body, page, known, warnings) {
  // Prose is matched as a whole, not line by line, because link text wraps.
  const blocks = []
  let fence = null
  for (const line of body.split('\n')) {
    const open = /^\s*(`{3,}|~{3,})/.exec(line)
    const inCode = fence !== null || open !== null
    if (open) fence = fence === null ? open[1][0] : open[1][0] === fence ? null : fence
    const last = blocks.at(-1)
    if (last && last.code === inCode) last.lines.push(line)
    else blocks.push({ code: inCode, lines: [line] })
  }

  const out = []
  for (const { code, lines } of blocks) {
    let text = lines.join('\n')
    if (!code) {
      const matches = [...text.matchAll(/(!?)\[([^\]]*)\]\(([^)\s]+)(\s+"[^"]*")?\)/g)]
      for (const [whole, bang, label, target, title = ''] of matches) {
        const next = await rewriteTarget(target, page, known, bang === '!', warnings)
        if (next === null) text = text.replace(whole, () => label)
        else if (next !== target) text = text.replace(whole, () => `${bang}[${label}](${next}${title})`)
      }
    }
    out.push(text)
  }
  return out.join('\n')
}

/** A link from one output page to another, as a relative file link. */
function fileLink(fromOut, toOut, hash) {
  let rel = posix.relative(posix.dirname(fromOut), toOut)
  if (!rel.startsWith('.')) rel = `./${rel}`
  return `${rel}${hash}`
}

async function rewriteTarget(target, page, known, isImage, warnings) {
  if (/^([a-z][a-z0-9+.-]*:|#|\/)/i.test(target)) return target
  const [pathPart, anchor] = target.split('#')
  const hash = anchor ? `#${anchor}` : ''
  const repoRel = posix.normalize(posix.join(posix.dirname(page.src), decodeURI(pathPart))).replace(/\/$/, '')

  if (repoRel.startsWith('..')) {
    warnings.push(`${page.src}: link leaves the repo, kept as text: ${target}`)
    return null
  }

  if (isImage && repoRel.startsWith('docs/images/')) {
    return fileLink(page.out, `guides/images/${repoRel.slice('docs/images/'.length)}`, '')
  }
  if (!isImage && known.has(repoRel)) return fileLink(page.out, known.get(repoRel), hash)

  const abs = resolve(repoRoot, repoRel)
  let kind = 'blob'
  try {
    if ((await stat(abs)).isDirectory()) kind = 'tree'
  } catch {
    warnings.push(`${page.src}: link target does not exist: ${target}`)
  }
  if (!GITHUB_REPO) return null
  // An image needs the raw bytes, not GitHub's page for the file.
  if (isImage) return `${GITHUB_REPO}/raw/${BRANCH}/${repoRel}`
  return `${GITHUB_REPO}/${kind}/${BRANCH}/${repoRel}${hash}`
}

const yamlEscape = (s) => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'

async function render(page, known, warnings) {
  const raw = await readFile(resolve(repoRoot, page.src), 'utf8')
  const { fm, body: afterFm } = splitFrontmatter(raw)
  const stem = basename(page.out, '.md')
  const fallbackTitle = stem.replace(/(^|-)([a-z])/g, (_, s, c) => (s ? ' ' : '') + c.toUpperCase())
  const { title, body } = extractTitle(afterFm, fallbackTitle)
  const description = (fm.summary || '').replace(/\s+/g, ' ').slice(0, 160)
  const updated = fm.updated ? ` · updated ${fm.updated}` : ''
  const source = page.kind === 'wiki' ? '`corpus/`' : '`docs/`'
  const banner = [
    `:::note[Rendered from ${page.src}${updated}]`,
    `Generated on every docs build. Edit the source in ${source}, not here.`,
    ':::',
  ]

  const front = [
    '---',
    `title: ${yamlEscape(title)}`,
    description ? `description: ${yamlEscape(description)}` : null,
    'toc_max_heading_level: 3',
    '---',
    '',
    ...banner,
    '',
  ]
    .filter((l) => l !== null)
    .join('\n')

  const rendered = await rewriteLinks(body, page, known, warnings)
  const outFile = resolve(outRoot, page.out)
  await mkdir(dirname(outFile), { recursive: true })
  await writeFile(outFile, front + rendered.trimStart(), 'utf8')
}

async function main() {
  if (!repoRoot) {
    console.error(`sync-corpus: no corpus/ above ${siteDir}`)
    process.exit(1)
  }
  const wiki = await discoverCorpus()
  const guides = await discoverGuides()
  // Repo-relative source → docs-relative output, so a guide can link into the
  // wiki and the wiki into a guide.
  const known = new Map([...wiki, ...guides].map((p) => [p.src, p.out]))

  // Fresh output each run, so a deleted source page doesn't linger.
  for (const dir of ['wiki', 'guides']) {
    const abs = resolve(outRoot, dir)
    if (existsSync(abs)) await rm(abs, { recursive: true, force: true })
    await mkdir(abs, { recursive: true })
  }

  const warnings = []
  for (const page of [...wiki, ...guides]) await render(page, known, warnings)
  const images = await copyImages()
  for (const w of warnings) console.warn(`  ! ${w}`)
  console.log(`sync-corpus: wrote ${wiki.length} wiki page(s), ${guides.length} guide(s), ${images} image(s)`)
  if (!GITHUB_REPO) console.log('sync-corpus: DOCS_REPO_URL unset, so links to source files render as text')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

#!/usr/bin/env node
// Renders docs/*.md into a static site in site/.
// Markdown is the single source of truth; this script owns presentation only.
//
// Bilingual convention the markdown must follow:
//   headings   `## 中文標題 / English heading`   (split on the LAST " / ")
//   prose      a Chinese paragraph followed by its English counterpart
//   list/cells `**中文 / English** — 中文說明<br>English explanation`

import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises'
import { join, basename, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { marked } from 'marked'
import { parse } from 'node-html-parser'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const OUT = join(ROOT, 'site')
const REPO = 'https://github.com/yushan8412/traversee'

// ── language detection ────────────────────────────────────────────────────────
// A CJK character carries roughly as much meaning as an English word, so weight
// it accordingly. The 3x factor keeps "Coverage beyond 北北基" classified as
// English while still catching Chinese sentences dense with product names.
const cjk = (s) => (s.match(/[㐀-鿿豈-﫿]/g) || []).length
const latin = (s) => (s.match(/[A-Za-z]/g) || []).length

function langOf(text) {
  const c = cjk(text)
  if (c === 0) return latin(text) ? 'en' : 'both'
  return c * 3 > latin(text) ? 'zh' : 'en'
}

const wrap = (html, lang) => (lang === 'both' ? html : `<span data-lang="${lang}">${html}</span>`)

// Splits on the last " / " so that headings containing "CI/CD" survive intact.
function splitSlash(text) {
  const i = text.lastIndexOf(' / ')
  if (i === -1) return null
  const zh = text.slice(0, i)
  const en = text.slice(i + 3)
  if (!cjk(zh) || cjk(en)) return null
  return [zh, en]
}

// ── block transformation ──────────────────────────────────────────────────────
function localiseHeading(el) {
  const pair = splitSlash(el.textContent.trim())
  if (!pair) return
  // Keep a leading section number outside the language spans so it survives
  // in English mode, where the Chinese half is hidden.
  const num = pair[0].match(/^(\d+(\.\d+)*\.?\s+)/)
  const zh = num ? pair[0].slice(num[0].length) : pair[0]
  el.set_content(`${num ? num[0] : ''}${wrap(zh, 'zh')}${wrap(pair[1], 'en')}`)
}

// `<strong>中文 / English</strong> — body` keeps the label visible in both modes
// by splitting the label itself rather than hiding it with the Chinese half.
function localiseBlock(el) {
  const html = el.innerHTML
  const parts = html.split(/<br\s*\/?>/i)
  if (parts.length !== 2) {
    const lang = langOf(el.textContent)
    if (lang !== 'both') el.setAttribute('data-lang', lang)
    return
  }

  let [a, b] = parts
  let label = ''
  const lead = a.match(/^\s*<strong>([\s\S]*?)<\/strong>\s*(—|–|-)?\s*/i)
  if (lead) {
    const pair = splitSlash(lead[1].trim())
    label = pair
      ? `<strong>${wrap(pair[0], 'zh')}${wrap(pair[1], 'en')}</strong>${lead[2] ? ' — ' : ' '}`
      : `<strong>${lead[1]}</strong>${lead[2] ? ' — ' : ' '}`
    a = a.slice(lead[0].length)
  }
  b = b.replace(/^\s*(—|–|-)\s*/, '')
  el.set_content(label + wrap(a.trim(), 'zh') + wrap(b.trim(), 'en'))
}

// Table cells are too short to carry a <br> pair, so they use "中文 / English".
// Only split when the left side is unmistakably a short Chinese label —
// otherwise "Azure Static Web Apps — Free 方案 / Free plan" would lose its
// product name in English mode.
function localiseCell(el) {
  if (el.querySelector('code, a')) return false
  const pair = splitSlash(el.textContent.trim())
  if (!pair) return false
  const [zh, en] = pair
  if (zh.length > 16 || cjk(zh) * 3 <= latin(zh)) return false
  el.set_content(wrap(zh, 'zh') + wrap(en, 'en'))
  return true
}

function localise(root) {
  root.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(localiseHeading)
  root.querySelectorAll('td, th').forEach(localiseCell)
  root.querySelectorAll('p, li, td, th').forEach((el) => {
    if (el.querySelector('p, li, ul, ol, table, pre')) return // containers only
    if (el.querySelector('span[data-lang]')) return // already localised
    localiseBlock(el)
  })
}

// ── table of contents ─────────────────────────────────────────────────────────
const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^\w㐀-鿿]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section'

function buildToc(root) {
  const seen = new Map()
  const items = []
  root.querySelectorAll('h2, h3').forEach((el) => {
    const base = slugify(el.textContent.trim())
    const n = (seen.get(base) ?? 0) + 1
    seen.set(base, n)
    const id = n > 1 ? `${base}-${n}` : base
    el.setAttribute('id', id)
    items.push({ id, level: el.tagName === 'H2' ? 2 : 3, html: el.innerHTML })
  })
  return items.map((i) => `<a class="toc-l${i.level}" href="#${i.id}">${i.html}</a>`).join('\n')
}

// The leading blockquote is document metadata, not a quotation. Markdown
// collapses its lines into one paragraph, so split it back into rows at each
// bold label and style it as a card in place.
function styleMeta(root) {
  const bq = root.querySelector('blockquote')
  if (!bq || root.childNodes.indexOf(bq) > 4) return
  // Label and value each need a single wrapping element: bare text nodes would
  // otherwise become grid items of their own and shatter the row.
  const rows = bq.innerHTML
    .split(/(?=<strong>)/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((r) => {
      const m = r.match(/^<strong>([\s\S]*?)<\/strong>\s*[:：]?\s*([\s\S]*)$/i)
      return m ? `<div><span class="k">${m[1]}</span><span class="v">${m[2]}</span></div>` : `<div>${r}</div>`
    })
  if (rows.length > 1) bq.set_content(rows.join(''))
  bq.setAttribute('class', 'meta')
  bq.tagName = 'div'
}

// ── page shell ────────────────────────────────────────────────────────────────
const page = ({ title, toc, body, source, siblings }) => `<!doctype html>
<html lang="zh-Hant" data-lang="both">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>${CSS}</style>
</head>
<body>
<a class="skip" href="#doc">跳至內容 / Skip to content</a>

<nav id="sidebar">
  <div class="brand"><a href="${relative(source.dir, OUT) || '.'}/index.html">Traversee</a><span>docs</span></div>

  <div class="controls">
    <div class="seg" role="group" aria-label="Language">
      <button data-set-lang="zh">中文</button>
      <button data-set-lang="en">EN</button>
      <button data-set-lang="both" class="on">對照</button>
    </div>
    <button id="theme" aria-label="Toggle theme"></button>
  </div>

  ${siblings}
  <div class="toc-head">目錄 <span>Contents</span></div>
  <div class="toc">${toc}</div>
  <a class="src" href="${source.url}">在 GitHub 檢視原始碼 <span>View source</span></a>
</nav>

<main id="doc">
  <article>${body}</article>
  <footer>
    由 <code>scripts/render-docs.mjs</code> 從 Markdown 自動產生 · Generated from Markdown
  </footer>
</main>

<button id="menu" aria-label="Menu">☰</button>
<script>${JS}</script>
</body>
</html>
`

const CSS = String.raw`
:root {
  --bg: #fbfbf9; --panel: #f3f3ef; --line: #e2e2db;
  --ink: #1b1e1c; --dim: #6a706b; --faint: #9aa09b;
  --accent: #2f6b4f; --accent-soft: #e6f0ea;
  --code-bg: #f5f5f1; --mark: #fff6d8;
  --sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  --cjk: "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif;
  --mono: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace;
  --sidebar: 300px;
}
html[data-theme="dark"] {
  --bg: #14171a; --panel: #1b1f23; --line: #2a2f34;
  --ink: #e4e6e3; --dim: #98a09a; --faint: #6d756f;
  --accent: #6cc39a; --accent-soft: #1d2c25;
  --code-bg: #1a1e21; --mark: #3a3520;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: 2rem; }
body {
  margin: 0; background: var(--bg); color: var(--ink);
  font-family: var(--sans), var(--cjk);
  font-size: 16.5px; line-height: 1.8;
  -webkit-font-smoothing: antialiased;
}
:lang(zh-Hant) { font-family: var(--cjk); }

.skip { position: absolute; left: -9999px; }
.skip:focus { left: 1rem; top: 1rem; z-index: 99; background: var(--accent); color: #fff; padding: .6rem 1rem; border-radius: 6px; }

/* ── language toggle ─────────────────────────────────── */
html[data-lang="zh"] [data-lang="en"],
html[data-lang="en"] [data-lang="zh"] { display: none; }
/* In single-language mode the counterpart paragraph is gone, so the survivor
   should read as body text rather than as a dimmed translation. */
html[data-lang="en"] p[data-lang="en"],
html[data-lang="en"] li span[data-lang="en"],
html[data-lang="en"] td span[data-lang="en"] { color: var(--ink); }
html[data-lang="en"] h1 span[data-lang="en"],
html[data-lang="en"] h2 span[data-lang="en"],
html[data-lang="en"] h3 span[data-lang="en"],
html[data-lang="en"] h4 span[data-lang="en"] { color: inherit; font-weight: inherit; }
html[data-lang="en"] .toc a span[data-lang="en"] { opacity: 1; }
/* The " / " separator belongs to the pair, not to the English half — drop it
   when the Chinese half is hidden, or headings read as "1. / Context". */
html[data-lang="en"] span[data-lang="zh"] + span[data-lang="en"]::before { content: none; }

/* ── sidebar ─────────────────────────────────────────── */
#sidebar {
  position: fixed; inset: 0 auto 0 0; width: var(--sidebar);
  background: var(--panel); border-right: 1px solid var(--line);
  padding: 1.6rem 1.1rem 1.4rem 1.5rem;
  display: flex; flex-direction: column; gap: 1rem; overflow-y: auto;
}
.brand { display: flex; align-items: baseline; gap: .5rem; }
.brand a { font-weight: 700; font-size: 1.15rem; letter-spacing: -.02em; color: var(--ink); text-decoration: none; }
.brand span { font-size: .7rem; text-transform: uppercase; letter-spacing: .12em; color: var(--faint); }

.controls { display: flex; gap: .5rem; align-items: center; }
.seg { display: flex; background: var(--bg); border: 1px solid var(--line); border-radius: 8px; padding: 2px; flex: 1; }
.seg button {
  flex: 1; border: 0; background: none; color: var(--dim); cursor: pointer;
  font: inherit; font-size: .78rem; padding: .3rem .1rem; border-radius: 6px; transition: .15s;
}
.seg button:hover { color: var(--ink); }
.seg button.on { background: var(--accent); color: #fff; }
#theme {
  width: 34px; height: 34px; flex: none; border: 1px solid var(--line); border-radius: 8px;
  background: var(--bg); cursor: pointer; font-size: .95rem; line-height: 1; color: var(--dim);
}
#theme::after { content: "◐"; }

.siblings { display: flex; flex-direction: column; gap: .1rem; }
.siblings a {
  font-size: .82rem; color: var(--dim); text-decoration: none;
  padding: .3rem .55rem; border-radius: 6px; border-left: 2px solid transparent;
}
.siblings a:hover { background: var(--bg); color: var(--ink); }
.siblings a.here { color: var(--accent); font-weight: 600; border-left-color: var(--accent); background: var(--accent-soft); }

.toc-head { font-size: .7rem; text-transform: uppercase; letter-spacing: .12em; color: var(--faint); padding-top: .4rem; border-top: 1px solid var(--line); }
.toc-head span { opacity: .65; }
.toc { display: flex; flex-direction: column; gap: .05rem; overflow-y: auto; flex: 1; min-height: 0; }
.toc a {
  font-size: .8rem; line-height: 1.45; color: var(--dim); text-decoration: none;
  padding: .28rem .55rem; border-radius: 6px; border-left: 2px solid transparent;
}
.toc a.toc-l3 { padding-left: 1.4rem; font-size: .76rem; }
.toc a span[data-lang="en"] { opacity: .72; }
.toc a span[data-lang="zh"] + span[data-lang="en"]::before { content: " / "; }
.toc a:hover { background: var(--bg); color: var(--ink); }
.toc a.active { color: var(--accent); background: var(--accent-soft); border-left-color: var(--accent); font-weight: 600; }
.src { font-size: .76rem; color: var(--faint); text-decoration: none; padding-top: .7rem; border-top: 1px solid var(--line); }
.src:hover { color: var(--accent); }
.src span { opacity: .7; }

/* ── document ────────────────────────────────────────── */
#doc { margin-left: var(--sidebar); padding: 4.5rem 3rem 6rem; }
article { max-width: 46rem; margin: 0 auto; }

h1 { font-size: 2.1rem; line-height: 1.3; letter-spacing: -.025em; margin: 0 0 1.5rem; }
h2 {
  font-size: 1.42rem; letter-spacing: -.015em; margin: 4rem 0 1.2rem;
  padding-top: 1.6rem; border-top: 1px solid var(--line);
}
h3 { font-size: 1.1rem; margin: 2.6rem 0 .9rem; }
h4 { font-size: .95rem; margin: 2rem 0 .7rem; color: var(--dim); }
h1 span[data-lang="en"], h2 span[data-lang="en"], h3 span[data-lang="en"], h4 span[data-lang="en"] { color: var(--faint); font-weight: 400; }
h1 span[data-lang="zh"] + span[data-lang="en"]::before,
h2 span[data-lang="zh"] + span[data-lang="en"]::before,
h3 span[data-lang="zh"] + span[data-lang="en"]::before,
h4 span[data-lang="zh"] + span[data-lang="en"]::before { content: " / "; }

p { margin: 0 0 1.15rem; }
p[data-lang="en"] { color: var(--dim); }
a { color: var(--accent); text-underline-offset: .18em; }
strong { font-weight: 650; }
hr { border: 0; border-top: 1px solid var(--line); margin: 3rem 0; }

ul, ol { padding-left: 1.35rem; margin: 0 0 1.15rem; }
li { margin: .4rem 0; }
li span[data-lang="en"] { color: var(--dim); }
li span[data-lang="zh"] + span[data-lang="en"]::before { content: ""; display: block; height: .25rem; }

.meta {
  background: var(--panel); border: 1px solid var(--line); border-left: 3px solid var(--accent);
  border-radius: 8px; padding: .9rem 1.2rem; margin: -.6rem 0 3rem;
  font-size: .84rem; line-height: 1.7; color: var(--dim);
  display: grid; gap: .28rem;
}
.meta > div { display: grid; grid-template-columns: 11rem 1fr; gap: .9rem; align-items: baseline; }
.meta .k { color: var(--ink); font-weight: 600; }
@media (max-width: 640px) { .meta > div { grid-template-columns: 1fr; gap: 0; } }

code {
  font-family: var(--mono); font-size: .86em;
  background: var(--code-bg); border: 1px solid var(--line);
  padding: .1em .35em; border-radius: 4px;
}
pre {
  background: var(--code-bg); border: 1px solid var(--line); border-radius: 10px;
  padding: 1.1rem 1.25rem; overflow-x: auto; margin: 0 0 1.5rem;
  font-size: .8rem; line-height: 1.6;
}
pre code { background: none; border: 0; padding: 0; font-size: inherit; }
.cm { color: var(--faint); font-style: italic; }
.str { color: var(--accent); }
.key { color: var(--ink); font-weight: 600; }

table { border-collapse: collapse; width: 100%; margin: 0 0 1.6rem; font-size: .88rem; display: block; overflow-x: auto; }
th, td { text-align: left; padding: .6rem .75rem; border-bottom: 1px solid var(--line); vertical-align: top; }
th { font-size: .72rem; text-transform: uppercase; letter-spacing: .07em; color: var(--faint); font-weight: 600; border-bottom-width: 2px; white-space: nowrap; }
tbody tr:hover { background: var(--panel); }
td span[data-lang="en"], th span[data-lang="en"] { color: var(--dim); }
td span[data-lang="zh"] + span[data-lang="en"]::before { content: ""; display: block; height: .2rem; }

blockquote { margin: 0 0 1.4rem; padding: .1rem 0 .1rem 1.1rem; border-left: 3px solid var(--line); color: var(--dim); }

footer { max-width: 46rem; margin: 5rem auto 0; padding-top: 1.5rem; border-top: 1px solid var(--line); font-size: .76rem; color: var(--faint); }

#menu {
  display: none; position: fixed; right: 1rem; bottom: 1rem; z-index: 20;
  width: 46px; height: 46px; border-radius: 50%; border: 1px solid var(--line);
  background: var(--panel); color: var(--ink); font-size: 1.1rem; cursor: pointer;
  box-shadow: 0 4px 16px rgb(0 0 0 / .14);
}

@media (max-width: 1000px) {
  #sidebar { transform: translateX(-100%); transition: transform .22s ease; z-index: 15; width: min(86vw, var(--sidebar)); box-shadow: 0 0 40px rgb(0 0 0 / .18); }
  body.nav-open #sidebar { transform: none; }
  #doc { margin-left: 0; padding: 2.5rem 1.35rem 5rem; }
  #menu { display: block; }
  h1 { font-size: 1.7rem; }
  h2 { font-size: 1.25rem; margin-top: 3rem; }
}
@media print {
  #sidebar, #menu, .skip { display: none; }
  #doc { margin: 0; padding: 0; }
  h2 { page-break-after: avoid; }
  pre, table { page-break-inside: avoid; }
}
`

const JS = String.raw`
(() => {
  const html = document.documentElement
  const store = (k, v) => { try { localStorage.setItem(k, v) } catch {} }
  const load = (k) => { try { return localStorage.getItem(k) } catch { return null } }

  const setLang = (l) => {
    html.dataset.lang = l
    html.lang = l === 'en' ? 'en' : 'zh-Hant'
    document.querySelectorAll('[data-set-lang]').forEach(b => b.classList.toggle('on', b.dataset.setLang === l))
    store('traversee-lang', l)
  }
  document.querySelectorAll('[data-set-lang]').forEach(b =>
    b.addEventListener('click', () => setLang(b.dataset.setLang)))
  setLang(load('traversee-lang') || 'both')

  const setTheme = (t) => { html.dataset.theme = t; store('traversee-theme', t) }
  setTheme(load('traversee-theme') ||
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
  document.getElementById('theme').addEventListener('click', () =>
    setTheme(html.dataset.theme === 'dark' ? 'light' : 'dark'))

  const menu = document.getElementById('menu')
  menu.addEventListener('click', () => document.body.classList.toggle('nav-open'))
  document.querySelectorAll('.toc a, .siblings a').forEach(a =>
    a.addEventListener('click', () => document.body.classList.remove('nav-open')))

  const links = new Map()
  document.querySelectorAll('.toc a').forEach(a => links.set(a.getAttribute('href').slice(1), a))
  const seen = new Set()
  const spy = new IntersectionObserver((entries) => {
    entries.forEach(e => e.isIntersecting ? seen.add(e.target.id) : seen.delete(e.target.id))
    const ids = [...links.keys()].filter(id => seen.has(id))
    if (!ids.length) return
    links.forEach(a => a.classList.remove('active'))
    links.get(ids[0])?.classList.add('active')
  }, { rootMargin: '0px 0px -70% 0px' })
  links.forEach((_, id) => { const el = document.getElementById(id); if (el) spy.observe(el) })
})()
`

// Lightweight highlighting for the JSON-with-comments blocks in the specs.
function highlight(root) {
  root.querySelectorAll('pre code').forEach((code) => {
    const cls = code.getAttribute('class') || ''
    if (!/jsonc|json/.test(cls)) return
    code.set_content(
      code.innerHTML
        .replace(/(\/\/[^\n]*)/g, '<span class="cm">$1</span>')
        .replace(/(&quot;[^&]*?&quot;)(\s*:)/g, '<span class="key">$1</span>$2')
        .replace(/:\s*(&quot;[^&]*?&quot;)/g, ': <span class="str">$1</span>')
    )
  })
}

// ── build ─────────────────────────────────────────────────────────────────────
async function render(file, all) {
  const md = await readFile(file.abs, 'utf8')
  const root = parse(marked.parse(md, { mangle: false, headerIds: false }))

  const h1 = root.querySelector('h1')
  const title = h1 ? h1.textContent.trim() : file.name

  styleMeta(root)
  localise(root)
  highlight(root)
  const toc = buildToc(root)

  const siblings = `<div class="siblings">${all
    .map((d) => {
      const href = relative(file.dir, d.out) || basename(d.out)
      return `<a href="${href}" class="${d.out === file.out ? 'here' : ''}">${d.nav}</a>`
    })
    .join('')}</div>`

  const html = page({
    title,
    toc,
    siblings,
    body: root.toString(),
    source: { url: `${REPO}/blob/main/${file.rel}`, dir: file.dir },
  })

  await mkdir(file.dir, { recursive: true })
  await writeFile(file.out, html)
  return title
}

const docs = []
docs.push({
  rel: 'docs/design.md',
  abs: join(ROOT, 'docs/design.md'),
  out: join(OUT, 'index.html'),
  dir: OUT,
  name: 'Design',
  nav: '設計文件 <span style="opacity:.6">Design</span>',
})

for (const f of (await readdir(join(ROOT, 'docs/specs'))).filter((f) => f.endsWith('.md')).sort()) {
  docs.push({
    rel: `docs/specs/${f}`,
    abs: join(ROOT, 'docs/specs', f),
    out: join(OUT, 'specs', f.replace(/\.md$/, '.html')),
    dir: join(OUT, 'specs'),
    name: f,
    nav: '技術架構規格 <span style="opacity:.6">Architecture</span>',
  })
}

await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })
await writeFile(join(OUT, '.nojekyll'), '')

for (const d of docs) {
  const title = await render(d, docs)
  console.log(`  ${relative(ROOT, d.out).padEnd(46)} ${title}`)
}
console.log(`\n${docs.length} pages → site/`)

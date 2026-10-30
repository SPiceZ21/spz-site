// Docs SPA: hash routing (#/page-id), searchable sidebar, "on this page" outline,
// and a small markdown renderer for the generated DOCS data (js/docs-data.js).

/* ── Markdown ───────────────────────────────────────────────
   ## / ### headings, - and 1. lists (with indented code), | tables,
   ``` fences, > callouts, `code`, **bold**, [text](url). */

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, t, u) => {
      const ext = /^https?:/.test(u) ? ' target="_blank" rel="noopener"' : ''
      return `<a href="${u}"${ext}>${t}</a>`
    })
}

const slug = (s) => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function codeBlock(lang, code) {
  // Diagrams: rendered by mermaid after the page is drawn (see drawDiagrams).
  if (lang === 'mermaid') return `<figure class="diagram"><pre class="mermaid">${esc(code)}</pre></figure>`
  return `<div class="code"><div class="code-bar"><span>${esc(lang || 'text')}</span>` +
    `<button class="copy" type="button">Copy</button></div><pre><code>${esc(code)}</code></pre></div>`
}

function renderMd(md) {
  const lines = md.split('\n')
  const out = []
  const toc = []
  let i = 0

  // A list item, possibly followed by an indented fenced block.
  function listItems(re) {
    const items = []
    while (i < lines.length && re.test(lines[i])) {
      let html = inline(lines[i].replace(re, ''))
      i++
      while (i < lines.length && /^\s{2,}```/.test(lines[i])) {
        const lang = lines[i].trim().slice(3)
        const buf = []
        i++
        while (i < lines.length && !/^\s*```/.test(lines[i])) { buf.push(lines[i].replace(/^\s{2,3}/, '')); i++ }
        i++
        html += codeBlock(lang, buf.join('\n'))
      }
      items.push(`<li>${html}</li>`)
    }
    return items.join('')
  }

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const buf = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) { buf.push(lines[i]); i++ }
      i++
      out.push(codeBlock(lang, buf.join('\n')))
      continue
    }

    if (line.startsWith('|')) {
      const rows = []
      while (i < lines.length && lines[i].startsWith('|')) { rows.push(lines[i]); i++ }
      const parse = (r) => r.split('|').slice(1, -1).map((c) => c.trim())
      const head = parse(rows[0])
      const body = rows.slice(2).map(parse)
      out.push('<div class="table-wrap"><table><thead><tr>' +
        head.map((h) => `<th>${inline(h)}</th>`).join('') + '</tr></thead><tbody>' +
        body.map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') +
        '</tbody></table></div>')
      continue
    }

    if (line.startsWith('> ')) {
      const buf = []
      while (i < lines.length && lines[i].startsWith('>')) { buf.push(lines[i].replace(/^>\s?/, '')); i++ }
      out.push(`<div class="callout">${inline(buf.join(' '))}</div>`)
      continue
    }

    if (/^- /.test(line)) { out.push(`<ul>${listItems(/^- /)}</ul>`); continue }
    if (/^\d+\. /.test(line)) { out.push(`<ol>${listItems(/^\d+\. /)}</ol>`); continue }

    if (line.startsWith('### ')) {
      const t = inline(line.slice(4)); const id = slug(t)
      toc.push({ id, t, lvl: 3 }); out.push(`<h3 id="${id}">${t}</h3>`); i++; continue
    }
    if (line.startsWith('## ')) {
      const t = inline(line.slice(3)); const id = slug(t)
      toc.push({ id, t, lvl: 2 }); out.push(`<h2 id="${id}"><a class="anchor" href="#" data-id="${id}">#</a>${t}</h2>`); i++; continue
    }
    if (/^---\s*$/.test(line)) { out.push('<hr>'); i++; continue }
    const img = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/)
    if (img) {
      out.push(`<figure class="shot"><img src="${img[2]}" alt="${esc(img[1])}" loading="lazy">${img[1] ? `<figcaption>${esc(img[1])}</figcaption>` : ''}</figure>`)
      i++; continue
    }
    if (line.trim() === '') { i++; continue }

    const buf = [line]
    i++
    while (i < lines.length && lines[i].trim() !== '' && !/^(##|- |\d+\. |\||```|> |---)/.test(lines[i])) {
      buf.push(lines[i]); i++
    }
    out.push(`<p>${inline(buf.join(' '))}</p>`)
  }

  return { html: out.join('\n'), toc }
}

/* ── Router + render ───────────────────────────────────────── */

const sidebar = document.getElementById('sidebar')
const navEl   = document.getElementById('docsNav')
const search  = document.getElementById('docsSearch')
const content = document.getElementById('content')
const tocEl   = document.getElementById('toc')
const menuBtn = document.getElementById('menuBtn')

const ORDER = DOCS.groups.flatMap((g) => g.pages)

function currentPage() {
  const h = location.hash.replace(/^#\//, '').split('#')[0]
  return DOCS.pages[h] ? h : ORDER[0]
}

function buildSidebar(filter = '') {
  const q = filter.trim().toLowerCase()
  const match = (id) => {
    if (!q) return true
    const p = DOCS.pages[id]
    return (p.title + ' ' + p.tagline + ' ' + p.body).toLowerCase().includes(q)
  }
  const html = DOCS.groups.map((g) => {
    const pages = g.pages.filter(match)
    if (!pages.length) return ''
    return `<div class="docs-group">
      <button class="docs-group-title" type="button">${g.title}<span class="chev">▾</span></button>
      <div class="docs-group-links">
        ${pages.map((id) => {
          const p = DOCS.pages[id]
          const v = p.source && p.badges[0] ? `<span class="v">${p.badges[0]}</span>` : ''
          return `<a class="docs-link" data-page="${id}" href="#/${id}">${p.title}${v}</a>`
        }).join('')}
      </div>
    </div>`
  }).join('')
  navEl.innerHTML = html || '<p class="docs-empty">No pages match.</p>'
  navEl.querySelectorAll('.docs-group-title').forEach((b) =>
    b.addEventListener('click', () => b.parentElement.classList.toggle('collapsed')))
  markActive()
}

function markActive() {
  const id = currentPage()
  navEl.querySelectorAll('.docs-link').forEach((a) => a.classList.toggle('active', a.dataset.page === id))
}

let spy = null

function render() {
  const id = currentPage()
  const page = DOCS.pages[id]
  const { html, toc } = renderMd(page.body)
  document.title = `${page.title} — SPiceZ-Core Docs`

  const idx = ORDER.indexOf(id)
  const prev = idx > 0 ? ORDER[idx - 1] : null
  const next = idx < ORDER.length - 1 ? ORDER[idx + 1] : null
  const group = DOCS.groups.find((g) => g.pages.includes(id))

  content.innerHTML = `
    <div class="doc-crumb">${group ? group.title : ''}</div>
    <h1>${page.title}</h1>
    ${page.tagline ? `<p class="doc-tagline">${inline(page.tagline)}</p>` : ''}
    <div class="doc-meta">
      ${page.badges.map((b, n) => `<span class="doc-badge ${n === 0 ? 'accent' : ''}">${esc(b)}</span>`).join('')}
      ${page.source ? `<a class="doc-source" href="${page.source}" target="_blank" rel="noopener">View on GitHub ↗</a>` : ''}
    </div>
    <article class="doc-body">${html}</article>
    <div class="doc-nav">
      ${prev ? `<a href="#/${prev}"><span class="dn-label">← Previous</span>${DOCS.pages[prev].title}</a>` : '<span></span>'}
      ${next ? `<a class="next" href="#/${next}"><span class="dn-label">Next →</span>${DOCS.pages[next].title}</a>` : '<span></span>'}
    </div>`

  tocEl.innerHTML = toc.length > 1
    ? '<div class="toc-title">On this page</div>' +
      toc.map((h) => `<a class="toc-link lvl${h.lvl}" href="#" data-id="${h.id}">${h.t}</a>`).join('')
    : ''

  // in-page links: scroll without breaking the hash router
  document.querySelectorAll('[data-id]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault()
    const el = document.getElementById(a.dataset.id)
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' })
  }))

  content.querySelectorAll('.copy').forEach((b) => b.addEventListener('click', () => {
    navigator.clipboard.writeText(b.closest('.code').querySelector('code').innerText).then(() => {
      b.textContent = 'Copied'
      setTimeout(() => { b.textContent = 'Copy' }, 1200)
    })
  }))

  // highlight the section in view
  if (spy) spy.disconnect()
  const links = tocEl.querySelectorAll('.toc-link')
  spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) links.forEach((l) => l.classList.toggle('active', l.dataset.id === en.target.id))
    })
  }, { rootMargin: '-80px 0px -70% 0px' })
  content.querySelectorAll('h2[id], h3[id]').forEach((h) => spy.observe(h))

  drawDiagrams()

  content.style.animation = 'none'
  void content.offsetHeight
  content.style.animation = ''

  markActive()
  window.scrollTo({ top: 0 })
  sidebar.classList.remove('open')
}

// Mermaid is loaded with defer from docs.html; theme it to the site once.
let mermaidReady = false
function drawDiagrams() {
  if (!window.mermaid || !content.querySelector('.mermaid')) return
  if (!mermaidReady) {
    window.mermaid.initialize({
      startOnLoad: false, theme: 'base', securityLevel: 'strict',
      fontFamily: 'Inter, sans-serif',
      themeVariables: {
        darkMode: true, background: '#0d0d11',
        primaryColor: '#1a1a21', primaryTextColor: '#e8e8ec', primaryBorderColor: '#ff6200',
        lineColor: '#9a9aa5', secondaryColor: '#121218', tertiaryColor: '#121218',
        actorBkg: '#1a1a21', actorBorder: '#ff6200', actorTextColor: '#e8e8ec',
        signalColor: '#c8c8d0', signalTextColor: '#e8e8ec', labelBoxBkgColor: '#1a1a21',
        noteBkgColor: '#2a1608', noteTextColor: '#e8e8ec', noteBorderColor: '#ff6200',
      },
    })
    mermaidReady = true
  }
  window.mermaid.run({ nodes: content.querySelectorAll('.mermaid') })
}

buildSidebar()
window.addEventListener('load', () => drawDiagrams())
render()
window.addEventListener('hashchange', render)
search.addEventListener('input', () => buildSidebar(search.value))
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement !== search) { e.preventDefault(); search.focus() }
})
menuBtn.addEventListener('click', () => sidebar.classList.toggle('open'))

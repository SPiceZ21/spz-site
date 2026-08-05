// Docs SPA: hash routing (#/page-id) + sidebar + mini-markdown renderer.

/* ── Mini-markdown ──────────────────────────────────────────
   Supports: ## h2, ### h3, - lists, | tables, ``` fences,
   `inline code`, **bold**, [text](url). Enough for module docs. */

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, t, u) => {
      const ext = u.startsWith('http') ? ' target="_blank" rel="noopener"' : ''
      return `<a href="${u}" style="color: var(--accent)"${ext}>${t}</a>`
    })
}

function renderMd(md) {
  const lines = md.split('\n')
  const out = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // code fence
    if (line.startsWith('```')) {
      const buf = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        buf.push(lines[i])
        i++
      }
      i++ // closing fence
      out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`)
      continue
    }

    // table
    if (line.startsWith('|')) {
      const rows = []
      while (i < lines.length && lines[i].startsWith('|')) {
        rows.push(lines[i])
        i++
      }
      const parse = (r) => r.split('|').slice(1, -1).map((c) => c.trim())
      const head = parse(rows[0])
      const body = rows.slice(2).map(parse) // skip separator row
      out.push(
        '<table><thead><tr>' +
        head.map((h) => `<th>${inline(h)}</th>`).join('') +
        '</tr></thead><tbody>' +
        body.map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') +
        '</tbody></table>'
      )
      continue
    }

    // list
    if (line.startsWith('- ')) {
      const items = []
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].slice(2))
        i++
      }
      out.push('<ul>' + items.map((it) => `<li>${inline(it)}</li>`).join('') + '</ul>')
      continue
    }

    if (line.startsWith('### ')) { out.push(`<h3>${inline(line.slice(4))}</h3>`); i++; continue }
    if (line.startsWith('## '))  { out.push(`<h2>${inline(line.slice(3))}</h2>`);  i++; continue }
    if (line.trim() === '')      { i++; continue }

    // paragraph: merge consecutive plain lines
    const buf = [line]
    i++
    while (
      i < lines.length && lines[i].trim() !== '' &&
      !/^(##|###|- |\||```)/.test(lines[i])
    ) {
      buf.push(lines[i])
      i++
    }
    out.push(`<p>${inline(buf.join(' '))}</p>`)
  }

  return out.join('\n')
}

/* ── Router + render ───────────────────────────────────────── */

const sidebar = document.getElementById('sidebar')
const content = document.getElementById('content')
const menuBtn = document.getElementById('menuBtn')

const ORDER = DOCS.groups.flatMap((g) => g.pages)

function currentPage() {
  const h = location.hash.replace(/^#\//, '')
  return DOCS.pages[h] ? h : ORDER[0]
}

function buildSidebar() {
  sidebar.innerHTML = DOCS.groups.map((g) => `
    <div class="docs-group">
      <div class="docs-group-title">${g.title}</div>
      ${g.pages.map((id) => `
        <a class="docs-link" data-page="${id}" href="#/${id}">${DOCS.pages[id].title}</a>
      `).join('')}
    </div>
  `).join('')
}

function render() {
  const id = currentPage()
  const page = DOCS.pages[id]

  document.title = `${page.title} — SPiceZ-Core Docs`

  const idx = ORDER.indexOf(id)
  const prev = idx > 0 ? ORDER[idx - 1] : null
  const next = idx < ORDER.length - 1 ? ORDER[idx + 1] : null

  content.innerHTML = `
    <h1>${page.title}</h1>
    <p class="doc-tagline">${page.tagline}</p>
    <div class="doc-badges">
      ${page.badges.map((b, i) => `<span class="doc-badge ${i === 0 ? 'accent' : ''}">${b}</span>`).join('')}
    </div>
    ${renderMd(page.body)}
    <div class="doc-nav">
      ${prev
        ? `<a href="#/${prev}"><span class="dn-label">← Previous</span>${DOCS.pages[prev].title}</a>`
        : '<span style="flex:1"></span>'}
      ${next
        ? `<a class="next" href="#/${next}"><span class="dn-label">Next →</span>${DOCS.pages[next].title}</a>`
        : '<span style="flex:1"></span>'}
    </div>
  `

  // restart the fade animation
  content.style.animation = 'none'
  void content.offsetHeight
  content.style.animation = ''

  sidebar.querySelectorAll('.docs-link').forEach((a) => {
    a.classList.toggle('active', a.dataset.page === id)
  })

  window.scrollTo({ top: 0 })
  sidebar.classList.remove('open')
}

buildSidebar()
render()
window.addEventListener('hashchange', render)
menuBtn.addEventListener('click', () => sidebar.classList.toggle('open'))

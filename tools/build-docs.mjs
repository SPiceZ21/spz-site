// tools/build-docs.mjs — js/docs-data.js from the Docs repo.
//
//   node tools/build-docs.mjs [path/to/Docs]     (default: ../Docs)
//
// Each Docs page is `# title`, an optional `> tagline`, optional shields badges,
// then the body. Links between pages become `#/<page>`; images hosted in the
// Docs repo become `Assets/docs/<file>`, and those files are copied here.
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..')
const DOCS = process.argv[2] || join(SITE, '..', 'Docs')
const RAW = 'https://raw.githubusercontent.com/SPiceZ21/Docs/main/images/'

// Sidebar groups: page ids in order. Module pages are modules/<id>.md.
const GROUPS = [
  ['Get Started', ['overview', 'beta', 'installation', 'first-time-setup', 'architecture']],
  ['Gameplay', ['race-flow', 'progression']],
  ['Modules', ['modules']],
  ['Core', ['spz-core', 'spz-identity', 'spz-spawn', 'spz-appearance', 'spz-loading']],
  ['Interface', ['spz-hud', 'spz-speedometer', 'spz-pausemenu', 'spz-nametag', 'spz-chat', 'spz-emotes']],
  ['Racing', ['spz-races', 'spz-progression', 'spz-spectate', 'spz-replay', 'spz-speedcam', 'spz-raceline']],
  ['Vehicles', ['spz-vehicles']],
  ['Social', ['spz-crew', 'spz-discord']],
  ['Minigames', ['spz-minigames', 'spz-colorrush', 'spz-cyclone', 'spz-bomb', 'spz-demolition', 'spz-pursuit']],
  ['Platform', ['spz-admin', 'spz-analytics', 'spz-fpscap', 'spz-txrecipe']],
  ['Reference', ['keybinds', 'commands', 'database', 'ui-gallery']],
]

const FILES = {
  overview: 'README.md', beta: 'beta.md', architecture: 'architecture.md',
  installation: 'get-started/installation.md', 'first-time-setup': 'get-started/first-time-setup.md',
  'race-flow': 'gameplay/race-flow.md', progression: 'gameplay/progression.md',
  modules: 'modules/README.md',
  keybinds: 'reference/keybinds.md', commands: 'reference/commands.md',
  database: 'reference/database.md', 'ui-gallery': 'reference/ui-gallery.md',
}
const fileOf = id => FILES[id] || `modules/${id}.md`

// Pages whose markdown has no tagline / badges keep these.
// Pages for parts merged into another resource: their source is that resource.
const PART_OF = { 'spz-progression': 'spz-races', 'spz-spectate': 'spz-races', 'spz-replay': 'spz-races', 'spz-speedcam': 'spz-races', 'spz-speedometer': 'spz-hud', 'spz-pausemenu': 'spz-hud' }

const META = {
  overview: { tagline: 'An open-source, racing-only framework for FiveM.', badges: ['Public beta', 'Lua 5.4', 'FiveM'] },
  beta: { tagline: 'What is in the public beta, what to expect, and how to report issues.' },
  installation: { tagline: 'Deploy a full server with the txAdmin recipe, or install by hand.' },
  'first-time-setup': { tagline: 'What to configure once the server boots cleanly.' },
  architecture: { tagline: 'Layers, rules, boot sequence and the events that tie modules together.' },
  'race-flow': { tagline: 'How a race runs, from queue to results.' },
  progression: { tagline: 'XP, rank points, licences, records and rivals.' },
  modules: { tagline: 'Every module in the beta, grouped by area.' },
  commands: { tagline: 'Every chat command, by who can use it.' },
  database: { tagline: 'The tables spz-core creates and what they hold.' },
  keybinds: { tagline: 'Every default key, who owns it, and what is free.' },
  'ui-gallery': { tagline: 'Every screen in the beta, in one place.' },
}

// Any .md path in a link -> page id
const idOfPath = (path) => {
  const file = path.replace(/^(\.\.\/|\.\/)+/, '').replace(/#.*$/, '')
  if (/(^|\/)modules\/README\.md$/.test(file) || file === 'README.md' && false) return 'modules'
  for (const [id, f] of Object.entries(FILES)) if (f.endsWith(file) || basename(f) === file && file !== 'README.md') return id
  if (file === 'README.md') return 'overview'
  return basename(file, '.md')
}

const images = new Set()

function convert(id, md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  let i = 0
  let title = id
  if (lines[i]?.startsWith('# ')) { title = lines[i].slice(2).trim(); i++ }
  while (lines[i] !== undefined && lines[i].trim() === '') i++
  let tagline = null
  if (lines[i]?.startsWith('> ') && !lines[i].startsWith('> **')) { tagline = lines[i].slice(2).trim(); i++ }
  while (lines[i] !== undefined && lines[i].trim() === '') i++
  const badges = []
  if (lines[i]?.includes('img.shields.io')) {
    const v = lines[i].match(/badge\/version-([\d.]+)-/)
    if (v) badges.push(`v${v[1]}`)
    i++
  }
  let body = lines.slice(i).join('\n').trim()
  // The page footer ("---" then "Source: <repo>"): the site shows the source itself.
  body = body.replace(/\n+---\n+Source: [^\n]*\s*$/, '').trim()
  // images hosted in the Docs repo -> Assets/docs
  body = body.replace(/\]\((https:\/\/raw\.githubusercontent\.com\/SPiceZ21\/Docs\/main\/images\/|(?:\.\.\/)*images\/)([^)\s]+)\)/g,
    (_, __, file) => { images.add(file); return `](Assets/docs/${file})` })
  // links to other pages
  body = body.replace(/\]\((?!https?:|#|Assets\/)([^)\s]+\.md)(#[^)\s]*)?\)/g, (_, path) => `](#/${idOfPath(path)})`)
  return { title, tagline, badges, body }
}

const pages = {}
for (const [, ids] of GROUPS) for (const id of ids) {
  const file = join(DOCS, fileOf(id))
  if (!existsSync(file)) { console.warn(`missing: ${fileOf(id)}`); continue }
  const p = convert(id, readFileSync(file, 'utf8'))
  const meta = META[id] || {}
  pages[id] = {
    title: p.title,
    tagline: p.tagline ?? meta.tagline ?? null,
    badges: p.badges.length ? p.badges : (meta.badges || []),
    body: p.body,
    source: id.startsWith('spz-') ? `https://github.com/SPiceZ21/${PART_OF[id] || id}` : null,
  }
}

const data = { groups: GROUPS.map(([title, ids]) => ({ title, pages: ids.filter(id => pages[id]) })), pages }
writeFileSync(join(SITE, 'js', 'docs-data.js'),
  '// GENERATED from the Docs repo (SPiceZ21/Docs) by tools/build-docs.mjs — do not edit by hand.\n' +
  '// `body` is markdown rendered by docs.js.\n\nconst DOCS = ' + JSON.stringify(data, null, 1) + '\n')

mkdirSync(join(SITE, 'Assets', 'docs'), { recursive: true })
let copied = 0
for (const f of images) {
  const src = join(DOCS, 'images', f)
  if (existsSync(src)) { copyFileSync(src, join(SITE, 'Assets', 'docs', f)); copied++ } else console.warn(`image missing: ${f}`)
}
console.log(`${Object.keys(pages).length} pages, ${copied} images`)

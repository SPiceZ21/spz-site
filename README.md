# spz-website

> Static marketing and documentation site

## Overview

The public site for SPiceZ-Core. Plain HTML, CSS and vanilla JS — no build step, no
framework. `index.html` is the landing page; `docs.html` is a single-page docs browser
driven by a JS data file.

## Structure

| Path | Purpose |
|---|---|
| `index.html` | Landing page — features, install, modules |
| `docs.html` | Docs browser shell |
| `js/main.js` | Landing page interactions |
| `js/docs.js` | Docs navigation, search, rendering |
| `js/docs-data.js` | Docs content and sidebar structure |
| `css/style.css` | Shared styles |
| `css/home.css` | Landing page styles |
| `Assets/` | Logos and images |

## Local preview

Any static server works:

```bash
npx serve .
```

## Editing docs

Content lives in `js/docs-data.js`. Keep it in step with [Docs/](../Docs) — that directory
is the canonical source; the website mirrors it for the public site.

---

Part of [SPiceZ-Core](../README.md) · GPL-3.0

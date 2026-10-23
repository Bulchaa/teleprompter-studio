# Architecture

Teleprompter Studio is a single-page, local-first application. There is no build step — the browser
loads ES modules directly. Styling is hand-written CSS (no framework), organized around design tokens so
light/dark theming is a single `data-theme` attribute flip.

## Core layers

### 1. Storage layer (`js/db.js`)
A tiny promise wrapper around IndexedDB with three stores: `scripts`, `recordings`, and `settings`.
Scripts and recordings use `id` as key; settings use `key`.

### 2. Reading engine (`js/reader.js`)
The `Reader` class extends `EventTarget`. It splits text into paragraphs and words, renders each word as a
`<span>` inside `#stage`, and drives a smooth scroll loop via `requestAnimationFrame`. It exposes:

- `load(text)` — parse and render text.
- `play()` / `pause()` / `toggle()` / `restart()`.
- `setSpeed(v)` — wpm-ish scroll speed.
- `jump(px)` — nudge the viewport.
- `setStyle({size, width})` — font size and column width (auto-caps on narrow screens).
- Events: `state` (playing/speed/progress) and `progress`.

### 3. UI layer (`js/app.js`, `index.html`, `css/`)
`app.js` is the glue: theme persistence, responsive sidebar/drawer navigation, script CRUD, auto-save,
toasts, reader open/close, keyboard shortcuts, and module lifecycle. `index.html` is the single shell;
`css/theme.css` holds tokens and `css/app.css` holds component styles.

### 4. Optional modules (`js/modules/`)
Voice following, recording, same-device remote, and cross-device web remote. Each registers itself with
`ctx.addButton(...)` so it appears in the reader dock. Modules are persisted in IndexedDB under `settings`
and restored on boot.

## Theming

- `html[data-theme="light"]` / `html[data-theme="dark"]` drive CSS custom properties.
- The toggle reads `localStorage` key `tp-theme`; falls back to `prefers-color-scheme`.
- Theme color meta tag updates to match (`#f3f0e9` light / `#0d0c0a` dark).

## Responsive breakpoints

- `max-width: 900px` — mobile: collapsible library drawer, compact action menu, stacked reader dock.
- `max-width: 600px` — tighter reader controls.
- `max-width: 420px` — compact header, smaller brand text.
- `max-height: 500px` — short screens: reduced topbar, smaller editor padding.

## Keyboard shortcuts

Reader-only (global): `Space`, `↑`, `↓`, `←`, `→`, `R`, `M`, `Esc`.
App-wide: `Ctrl/Cmd + K` focuses script search.

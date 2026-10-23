# Contributing to Teleprompter Studio

Thanks for wanting to contribute! Teleprompter Studio is a local-first, vanilla-JS teleprompter.
The codebase is intentionally small and dependency-free so it's easy to read and modify.

## How to contribute

1. **Fork & clone** the repo, then create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes (see [Code style](#code-style)).
3. Test on desktop and mobile (responsive breakpoints at 900px, 600px, 420px).
4. Commit with a clear message and open a pull request.

## Project structure

```
css/theme.css      Design tokens, light/dark themes, base styles, shared toggle
css/app.css        App shell, sidebar, editor, reader overlay, responsive rules
css/remote.css     Phone-friendly remote layout
index.html         Main app shell
remote.html        Same-device remote control page
js/app.js          UI glue: themes, navigation, reader controls, module lifecycle
js/reader.js       Reading engine (scroll, speed, word index, anchor line, mirror)
js/db.js           IndexedDB wrapper (scripts, recordings, settings)
js/importer.js     Import/export for txt/md/html/docx/pdf/json/zip
js/libs.js         Optional CDN import-library loader
js/modules/
  voice.js         Voice following (Web Speech API)
  recorder.js      Camera/mic recording (MediaRecorder)
  remote.js        Same-device remote (BroadcastChannel)
  webremote.js     Cross-device remote (WebSocket relay)
scripts/relay-server.js  WebSocket relay for phone remote control
```

## Module system

Optional features live in `js/modules/` and are toggled from the library sidebar.
Every module exports a default object with:

- `name` — module identifier (matches `data-mod` attribute).
- `init(ctx)` — called when enabled. Receives a context object:
  - `ctx.reader` — the `Reader` instance.
  - `ctx.toast(msg)` — show a temporary notification.
  - `ctx.current()` — returns the currently selected script.
  - `ctx.size(delta)` — adjust reader text size.
  - `ctx.addButton(label, fn)` — add a button to the reader dock.
  Returns `true` on success, `false` if the module can't run here.
- `destroy()` — called when disabled; clean up listeners, buttons, and connections.

The reader dispatches `state` and `progress` CustomEvents. Modules listen to these to stay in sync.

## Code style

- Vanilla JS, ES modules (`type: "module"`).
- 2-space indentation, single quotes, semicolons.
- Prefer `const`/`let`; avoid `var`.
- Small, focused functions; keep DOM manipulation in `app.js` where possible.
- New modules: follow the `init(ctx)/destroy()` contract above.

## Running a local server

ES modules require `http`, not `file://`:

```bash
python3 -m http.server 8000
# or
npx serve .
```

## Testing checklist

Before opening a PR, verify:

- [ ] Light and dark theme toggle persists on reload.
- [ ] Sidebar opens/closes on mobile (`Ctrl/Cmd + K` focuses search).
- [ ] Reader opens, plays/pauses, and exits cleanly (`Esc`).
- [ ] Text size/width sliders work and scale long words on narrow screens.
- [ ] Import/export works for at least one format.
- [ ] Optional modules toggle on/off without errors.
- [ ] No console errors.

## License

By contributing, you agree your contributions are licensed under the [MIT License](LICENSE).

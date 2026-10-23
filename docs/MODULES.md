# Module system

Optional features live in `js/modules/` and are toggled from the Advanced Modules section of the library
sidebar. Every module follows the same contract:

```js
export default {
  name: 'modulename',        // must match data-mod="modulename" in index.html
  init(ctx) {
    // return true to enable, false if the module cannot run here
    return true
  },
  destroy() {
    // cleanup: remove buttons, close connections, remove listeners
  }
}
```

## Context (`ctx`) passed to `init`

| Property | Description |
|----------|-------------|
| `ctx.reader` | The `Reader` instance. Listen to its `state`/`progress` events. |
| `ctx.toast(msg)` | Show a temporary bottom-center notification. |
| `ctx.current()` | Returns the currently selected script object (or null). |
| `ctx.size(delta)` | Adjust reader text size by `delta` pixels. |
| `ctx.addButton(label, fn)` | Append a button to the reader dock; returns the button element. |

## Built-in modules

| Module | `data-mod` | What it does |
|--------|------------|--------------|
| Voice following | `voice` | Moves the reader to where you speak (Web Speech API). |
| Recording | `recorder` | Records camera + mic while reading; saves clips locally. |
| Remote control | `remote` | Same-device control from another tab via `BroadcastChannel`. |
| Web remote | `webremote` | Cross-device control from a phone via WebSocket relay. |

## Adding a new module

1. Create `js/modules/yourmodule.js` exporting the default object above.
2. Add a `<label class="switch-row">` with `<input class="switch-input" data-mod="yourmodule">` to
   `#modules` in `index.html`.
3. Register the import in `js/app.js`:
   ```js
   const MODS = { ..., yourmodule: () => import('./modules/yourmodule.js') }
   ```
4. Document it in `CONTRIBUTING.md` and `README.md`.

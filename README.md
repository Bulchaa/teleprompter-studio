# Teleprompter Studio

A modern, local-first teleprompter built with vanilla JavaScript (ES modules) and hand-crafted CSS.
No backend, no accounts — your scripts never leave your browser. Works on desktop, tablet, and phone,
with a built-in day/night theme toggle and an optional phone remote.

## Features

- **Modern, clean UI** — responsive design that adapts to desktop, tablet, and mobile.
- **Day / night theme toggle** — switch between light and dark modes; your choice is remembered.
- **Local-first** — scripts are saved in IndexedDB; nothing is uploaded anywhere.
- **Script library** — search, create, import, export, and delete scripts.
- **Rich text editor** — title, body, words-per-minute setting, auto-save, live word count.
- **Teleprompter reader** — smooth scrolling, play/pause, speed control, text size/width, mirror mode,
  countdown, on-air indicator, and optional camera preview.
- **Optional modules** — voice following, local recording, and tab/remote control.
- **Phone remote** — control playback from a phone on the same network via a WebSocket relay.
- **Keyboard shortcuts** — Space (play/pause), arrow keys (speed/nudge), `R` (restart), `M` (mirror),
  `Esc` (exit), `Ctrl/Cmd + K` (search).

## Quick start

You need a local HTTP server (ES modules do not work from `file://`).

### Option 1: Python (built-in)

```bash
# macOS / Linux
python3 -m http.server 8000

# Windows (PowerShell)
python -m http.server 8000
```

Then open **http://localhost:8000** in your browser.

### Option 2: Node.js (`npx serve`)

```bash
npx serve .
# open http://localhost:5000 (or the port shown)
```

### Option 3: VS Code

Install the **Live Server** extension, right-click `index.html`, and choose "Open with Live Server."

## Using the app

### Editor

1. Click **New script** or select an existing script from the library.
2. Type or paste your script into the editor. Blank lines start new paragraphs.
3. Set the **Words/min** (default 150) for the estimated reading time.
4. Click **Start reading** to open the reader overlay.

### Reader controls

| Control | Action |
|---------|--------|
| `Space` | Play / pause |
| `↑` / `↓` | Faster / slower |
| `←` / `→` | Nudge back / forward |
| `R` | Restart |
| `M` | Mirror text (for glass rigs) |
| `Esc` | Exit reader |

The reader dock shows speed, text size, text width, mirror, and countdown. Click the **settings** gear to
reveal text size/width sliders and optional module buttons (voice, recorder, web remote).

### Advanced modules (sidebar)

Toggle these on/off in the library sidebar:

- **Voice following** — moves the reader to where you're speaking (Web Speech API; Chrome/Edge/Safari).
- **Recording** — records camera + microphone while you read; clips saved locally.
- **Remote control** — control the reader from another tab/window on the same device (`remote.html`).
- **Web remote** — control the reader from a phone on another device via a WebSocket relay
  (see [Web remote setup](#web-remote-phone-control-from-another-device)).

## Web remote — phone control from another device

The built-in `remote.html` works between tabs on the same browser/device. To control from a **phone on a
different device**, enable the **Web remote** module and run the included WebSocket relay server.

### 1. Install the relay dependency

```bash
npm install
```

### 2. Start the relay server

```bash
node scripts/relay-server.js
```

It listens on `ws://localhost:8098/signaling` by default. Set `PORT` to change the port.

### 3. Connect

- Open Teleprompter Studio on your computer, enable **Web remote** in the sidebar, and start reading.
- The module button in the reader dock turns yellow when online.
- Open `remote.html` on your phone, pointed at your computer's IP (e.g. `http://192.168.1.42:8000/remote.html`).
- The phone page connects to the same relay URL and can play/pause, adjust speed, mirror text, and change text size.

The relay only passes control messages and reader state — it never stores your scripts.

## Project structure

```
teleprompter-studio/
├── index.html              # Main app (editor + library + reader overlay)
├── remote.html             # Same-device remote control page
├── README.md               # This file
├── CONTRIBUTING.md         # Guide for developers
├── LICENSE                 # MIT license
├── package.json            # Node metadata + relay dependency
├── .gitignore
├── css/
│   ├── theme.css           # Design tokens, light/dark themes, shared toggle
│   ├── app.css             # App shell, sidebar, editor, reader, responsive rules
│   └── remote.css          # Phone-friendly remote layout
├── js/
│   ├── app.js              # UI glue: themes, navigation, reader controls, modules
│   ├── reader.js           # Reading engine: scroll, speed, word index, mirror
│   ├── db.js               # IndexedDB (scripts, recordings, settings)
│   ├── importer.js         # Import/export: txt, md, html, docx, pdf, json, zip
│   ├── libs.js             # Optional import library loader
│   └── modules/
│       ├── voice.js        # Voice following (Web Speech API)
│       ├── recorder.js     # Camera/mic recording (MediaRecorder)
│       ├── remote.js       # Same-device remote (BroadcastChannel)
│       └── webremote.js    # Cross-device remote (WebSocket relay)
└── scripts/
    └── relay-server.js     # WebSocket relay for phone remote control
```

## Browser support

Works in modern evergreen browsers (Chrome, Edge, Firefox, Safari). Some features depend on
browser APIs:

- **Voice following** — Web Speech API (Chrome, Edge, Safari).
- **Recording** — `MediaRecorder` + `getUserMedia` (secure contexts / HTTPS or localhost).
- **Fullscreen reader** — Fullscreen API.
- **Web remote** — WebSockets.

## License

[MIT](LICENSE) — free to use, modify, and distribute.

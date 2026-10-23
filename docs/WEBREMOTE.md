# Web remote — phone control from another device

The built-in `remote.html` works between tabs on the same browser and device. To control Teleprompter
Studio from a **phone on a different device**, use the **Web remote** module with the included WebSocket
relay server.

## How it works

1. The computer running the reader opens a WebSocket to the relay and identifies as role `reader`.
2. The phone opens `remote.html`, connects to the same relay, and identifies as role `controller`.
3. The relay passes controller commands (play, pause, speed, mirror, text size) to the reader, and
   broadcasts reader state (playing, speed, progress) back to controllers.
4. The relay never stores scripts or media — it only forwards control messages.

## Setup

### 1. Install the relay dependency

```bash
npm install
```

This installs the `ws` WebSocket library (listed in `package.json`).

### 2. Start the relay server

```bash
node scripts/relay-server.js
```

Default: `ws://localhost:8098/signaling`. Change the port with `PORT=8099 node scripts/relay-server.js`.

### 3. Enable Web remote in the app

Open Teleprompter Studio, go to the library sidebar → **Advanced modules**, and toggle **Web remote** on.
Start reading. The module button in the reader dock turns yellow when connected to the relay.

### 4. Open the controller on your phone

On the same network, open `remote.html` on your phone, pointed at your computer's IP:

```
http://<your-computer-ip>:8000/remote.html
```

The phone page connects to the relay URL (`ws://localhost:8098/signaling` by default). If your relay is on
a different host or port, edit the `url` in `js/modules/webremote.js` or persist a custom URL in
`localStorage` key `tp-webremote-url`.

## Phone remote controls

The phone page shows the same command set as the reader:

- Play / Pause
- Restart
- Back 10s / Forward 10s
- Slower / Faster
- Text − / Text +
- Mirror

A status line shows Playing/Paused, speed, and progress percentage, updated live from the reader.

## Security notes

- The relay is an open WebSocket endpoint. Run it on localhost or a trusted network only.
- No authentication is implemented; anyone who can reach the relay port can send control commands.
- For production use, add WSS (TLS), token-based authentication, and origin checks.

## Files

| File | Purpose |
|------|---------|
| `js/modules/webremote.js` | Reader-side module: connects to relay, forwards state, executes commands. |
| `remote.html` | Phone/tablet controller UI (same file as same-device remote). |
| `scripts/relay-server.js` | Minimal WebSocket signaling/relay server (`ws` library). |
| `package.json` | Declares the `ws` dependency. |

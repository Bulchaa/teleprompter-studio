const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// SPA fallback (serves index.html for non-asset routes)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/signaling')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/signaling' });

// sessionId => { reader: WebSocket|null, controllers: Set<WebSocket> }
const sessions = new Map();

function getSession(sessionId, create = false) {
  let s = sessions.get(sessionId);
  if (!s && create) {
    s = { reader: null, controllers: new Set() };
    sessions.set(sessionId, s);
  }
  return s;
}

function send(ws, payload) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(payload));
}

function broadcast(sessionId, payload, excludeWs) {
  const s = getSession(sessionId);
  if (!s) return;
  for (const c of s.controllers) {
    if (c !== excludeWs && c.readyState === 1) c.send(JSON.stringify(payload));
  }
}

wss.on('connection', (ws, req) => {
  // Parse ?session=ID from the WebSocket URL
  const url = new URL(req.url, `http://${req.headers.host}`);
  const sessionId = url.searchParams.get('session');

  if (!sessionId) {
    ws.close(1008, 'Missing session ID');
    return;
  }

  let role = null;

  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }

    if (m.role === 'reader') {
      role = 'reader';
      const s = getSession(sessionId, true);
      s.reader = ws;
      if (m.state) broadcast(sessionId, { role: 'reader', state: m.state }, ws);
    } else if (m.role === 'controller') {
      role = 'controller';
      const s = getSession(sessionId, true);
      s.controllers.add(ws);
      if (m.cmd && s.reader && s.reader.readyState === 1) {
        s.reader.send(JSON.stringify({ role: 'controller', cmd: m.cmd }));
      }
    }
  });

  ws.on('close', () => {
    const s = getSession(sessionId);
    if (!s) return;
    if (role === 'reader') s.reader = null;
    if (role === 'controller') s.controllers.delete(ws);
    // Clean up empty sessions
    if (!s.reader && s.controllers.size === 0) sessions.delete(sessionId);
  });

  ws.on('error', () => {
    const s = getSession(sessionId);
    if (!s) return;
    if (role === 'reader') s.reader = null;
    if (role === 'controller') s.controllers.delete(ws);
  });
});

server.listen(PORT, () => {
  console.log(`Teleprompter Studio + WebSocket relay listening on port ${PORT}`);
});

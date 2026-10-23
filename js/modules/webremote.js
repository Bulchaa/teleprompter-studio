// Web remote: unique WebSocket session per reader instance.
// Each reader gets its own session ID; phones connect to
// /signaling?session=<that-id> to control only that reader.
export default {
  name: 'webremote',
  init(ctx) {
    if (!window.WebSocket) {
      ctx.toast('WebSockets are not supported in this browser.');
      return false;
    }

    const r = ctx.reader;

    // Create or reuse a unique session ID for this reader
    let sessionId = localStorage.getItem('tp-webremote-session');
    if (!sessionId) {
      sessionId = (crypto.randomUUID && crypto.randomUUID()) ||
                  Math.random().toString(36).slice(2, 10);
      localStorage.setItem('tp-webremote-session', sessionId);
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/signaling?session=${encodeURIComponent(sessionId)}`;
    const ws = new WebSocket(url);

    let connected = false;

    const broadcast = () => {
      if (connected) {
        ws.send(JSON.stringify({
          role: 'reader',
          state: {
            playing: r.playing,
            speed: Math.round(r.speed),
            progress: r.progress()
          }
        }));
      }
    };

    const acts = {
      toggle: () => r.toggle(),
      restart: () => r.restart(),
      faster: () => r.setSpeed(r.speed + 10),
      slower: () => r.setSpeed(r.speed - 10),
      back: () => r.jump(-Math.max(1, r.speed) * 10),
      fwd: () => r.jump(Math.max(1, r.speed) * 10),
      bigger: () => ctx.size(+4),
      smaller: () => ctx.size(-4),
      hello: () => {},
      mirror: () => {
        const el = document.getElementById('rMirror');
        if (el) { el.checked = !el.checked; el.dispatchEvent(new Event('change')); }
      }
    };

    ws.onopen = () => { connected = true; };
    ws.onmessage = (e) => {
      let m;
      try { m = JSON.parse(e.data); } catch { return; }
      if (m.role !== 'controller') return;
      if (acts[m.cmd]) { acts[m.cmd](); broadcast(); }
    };
    ws.onerror = () => { connected = false; ctx.toast('Web remote connection error.'); };
    ws.onclose = () => { connected = false; };

    r.addEventListener('state', broadcast);

    // Expose session ID so the app can display the shareable remote URL
    ctx.webremoteSessionId = sessionId;
    this.sessionId = sessionId;
    this.ws = ws;

    const btn = ctx.addButton('Web remote', () => {});
    btn.textContent = 'Web remote: offline';
    btn.classList.add('webremote-btn');
    const update = () => {
      btn.textContent = connected ? 'Web remote: online' : 'Web remote: offline';
      btn.classList.toggle('is-live', connected);
    };
    ws.addEventListener('open', update);
    ws.addEventListener('close', update);
    ws.addEventListener('error', update);

    return true;
  },
  destroy() {
    this.ws?.close();
    this.btn?.remove();
  }
};

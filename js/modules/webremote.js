// Web remote: WebSocket relay transport.
// Lets a phone/tablet on another device control this reader through a small
// signaling/relay server (see scripts/relay-server.js). Uses the same command
// set as the built-in BroadcastChannel remote (remote.js).
export default {
  name:'webremote',
  init(ctx){
    if(!window.WebSocket){ctx.toast('WebSockets are not supported in this browser.');return false}
    const r=ctx.reader;
    const url=localStorage.getItem('tp-webremote-url')||'ws://localhost:8098/signaling';
    let connected=false;
    const ws=this.ws=new WebSocket(url);
    const broadcast=()=>{
      if(connected)ws.send(JSON.stringify({role:'reader',state:{playing:r.playing,speed:Math.round(r.speed),progress:r.progress()}}));
    };
    const act={
      toggle:()=>r.toggle(),
      restart:()=>r.restart(),
      faster:()=>r.setSpeed(r.speed+10),
      slower:()=>r.setSpeed(r.speed-10),
      back:()=>r.jump(-Math.max(1,r.speed)*10),
      fwd:()=>r.jump(Math.max(1,r.speed)*10),
      bigger:()=>ctx.size(+4),
      smaller:()=>ctx.size(-4),
      hello:()=>{},
      mirror:()=>{const m=document.getElementById('rMirror');if(m){m.checked=!m.checked;m.dispatchEvent(new Event('change'))}}
    };
    ws.onopen=()=>{connected=true;ws.send(JSON.stringify({role:'reader',cmd:'hello'}))};
    ws.onmessage=e=>{
      let m;try{m=JSON.parse(e.data)}catch{return}
      if(m.role!=='controller')return;
      if(act[m.cmd]){act[m.cmd]();broadcast()}
    };
    ws.onerror=()=>{connected=false;ctx.toast('Web remote relay unreachable: '+url);};
    ws.onclose=()=>{connected=false;};
    r.addEventListener('state',broadcast);
    this.btn=ctx.addButton('Web remote',()=>{});
    this.btn.textContent='Web remote: offline';
    this.btn.classList.add('webremote-btn');
    const update=()=>{this.btn.textContent=connected?'Web remote: online':'Web remote: offline';this.btn.classList.toggle('is-live',connected)};
    ws.addEventListener('open',update);
    ws.addEventListener('close',update);
    ws.addEventListener('error',update);
    return true;
  },
  destroy(){
    this.ws?.close();
    this.btn?.remove();
  }
};

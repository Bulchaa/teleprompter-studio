// Remote control over BroadcastChannel: any other tab/window of this app (e.g. remote.html) on the same browser.
export default {
  name:'remote',
  init(ctx){
    const r=ctx.reader,ch=this.ch=new BroadcastChannel('tp-remote');
    const send=()=>ch.postMessage({state:{playing:r.playing,speed:Math.round(r.speed),progress:r.progress()}});
    const act={toggle:()=>r.toggle(),restart:()=>r.restart(),faster:()=>r.setSpeed(r.speed+10),slower:()=>r.setSpeed(r.speed-10),
      back:()=>r.jump(-r.speed*10),fwd:()=>r.jump(r.speed*10),bigger:()=>ctx.size(+4),smaller:()=>ctx.size(-4),hello:()=>{},
      mirror:()=>{const m=document.getElementById('rMirror');if(m){m.checked=!m.checked;m.dispatchEvent(new Event('change'))}}};
    ch.onmessage=e=>{act[e.data.cmd]?.();send()};
    r.addEventListener('state',this.h=send);
    this.btn=ctx.addButton('Open remote',()=>window.open('remote.html','tp-remote-win','width=360,height=520'));
    return true},
  destroy(){this.ch?.close();this.btn?.remove()}
};

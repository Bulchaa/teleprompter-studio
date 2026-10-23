// Reading engine: smooth scroll, word index, anchor line. Modules plug in via events + public API.
export class Reader extends EventTarget{
  constructor(){super();
    this.vp=document.getElementById('viewport');this.stage=document.getElementById('stage');
    this.words=[];this.spans=[];this.pos=0;this.target=null;this.playing=false;this.speed=80;this.cur=-1;this.last=0}
  load(text){
    this.stage.innerHTML='';this.words=[];this.spans=[];
    text.split(/\n{2,}/).forEach(par=>{const p=document.createElement('p');
      par.split(/(\s+)/).forEach(tok=>{
        if(!tok)return;
        if(/^\s+$/.test(tok)){p.append(tok.includes('\n')?document.createElement('br'):' ');return}
        const s=document.createElement('span');s.className='w';s.textContent=tok;s.dataset.i=this.spans.length;
        this.spans.push(s);this.words.push(tok);p.append(s)});
      this.stage.append(p)});
    this.probeWords=[...new Set(this.words.filter(w=>w.length>2))].sort((a,b)=>b.length-a.length).slice(0,8);
    this.restart()}
  get anchor(){return this.vp.clientHeight*.38}
  max(){return this.stage.scrollHeight-this.vp.clientHeight}
  setStyle({size,width}){
    if(width)this.stage.style.width=width+'%';
    if(size){
      let fs=+size;
      this.stage.style.fontSize=fs+'px';
      const cs=getComputedStyle(this.stage);
      const content=this.stage.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);
      if(this.probeWords?.length&&content>0){
        const probe=document.createElement('span');
        probe.style.cssText='position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap;';
        this.stage.append(probe);
        let widest=0;
        for(const word of this.probeWords){probe.textContent=word;widest=Math.max(widest,probe.getBoundingClientRect().width)}
        probe.remove();
        if(widest>content)fs*=content/widest*.97;
      }
      this.stage.style.fontSize=Math.max(18,Math.min(+size,fs))+'px';
    }
  }
  play(){if(this.playing)return;this.playing=true;this.last=performance.now();requestAnimationFrame(t=>this.tick(t));this.emit()}
  pause(){this.playing=false;this.emit()}
  toggle(){this.playing?this.pause():this.play()}
  restart(){this.pos=0;this.target=null;this.vp.scrollTop=0;this.mark(0);this.emit()}
  setSpeed(v){this.speed=Math.max(10,Math.min(400,v));this.emit()}
  jump(px){this.pos=Math.max(0,Math.min(this.max(),this.pos+px));this.vp.scrollTop=this.pos}
  scrollToWord(i){const s=this.spans[i];if(!s)return;this.target=s.offsetTop-this.anchor+s.offsetHeight/2;this.mark(i)}
  mark(i){
    if(i===this.cur)return;
    const a=Math.min(i,this.cur<0?i:this.cur);
    this.spans[this.cur]?.classList.remove('cur');
    if(i>this.cur)for(let k=Math.max(0,this.cur);k<i;k++)this.spans[k].classList.add('read');
    else for(let k=i;k<=this.cur;k++)this.spans[k]?.classList.remove('read');
    this.spans[i]?.classList.add('cur');this.cur=i}
  wordAtAnchor(){ // binary search by offsetTop
    const y=this.pos+this.anchor;let lo=0,hi=this.spans.length-1;
    while(lo<hi){const m=(lo+hi+1)>>1;this.spans[m].offsetTop<=y?lo=m:hi=m-1}return lo}
  tick(t){
    if(!this.playing&&this.target==null)return;
    const dt=Math.min(100,t-this.last);this.last=t;
    if(this.playing)this.pos+=this.speed*dt/1000;
    if(this.target!=null){const d=this.target-this.pos;this.pos+=d*Math.min(1,dt/220);if(Math.abs(d)<1)this.target=null}
    this.pos=Math.max(0,Math.min(this.max(),this.pos));this.vp.scrollTop=this.pos;
    if(this.playing&&!this.followMode)this.mark(this.wordAtAnchor());
    if(this.playing&&this.pos>=this.max()-1){this.pause();this.dispatchEvent(new Event('end'))}
    this.emit(true);
    if(this.playing||this.target!=null)requestAnimationFrame(t=>this.tick(t))}
  progress(){const m=this.max();return m>0?Math.round(this.pos/m*100):0}
  emit(soft){this.dispatchEvent(new CustomEvent(soft?'progress':'state',{detail:{playing:this.playing,speed:Math.round(this.speed),progress:this.progress()}}))}
}

// Voice following: Web Speech API (Chrome/Edge/Safari). Moves the reader to where you are speaking.
const norm=s=>s.toLowerCase().replace(/[^\p{L}\p{N}']/gu,'');
export default {
  name:'voice',
  init(ctx){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){ctx.toast('Voice following needs Chrome, Edge or Safari.');return false}
    const btn=ctx.addButton('Voice: off',()=>this.on?this.stop():this.start());
    Object.assign(this,{ctx,btn,on:false,idx:0,SR});
    this.onReaderStart=()=>{this.norms=ctx.reader.words.map(norm);this.idx=ctx.reader.cur<0?0:ctx.reader.cur};
    return true},
  start(){
    const {ctx,SR}=this;this.onReaderStart();ctx.reader.followMode=true;
    const r=this.rec=new SR();r.continuous=true;r.interimResults=true;r.lang=navigator.language||'en-US';
    r.onresult=e=>{const t=e.results[e.results.length-1][0].transcript;this.match(t)};
    r.onend=()=>{if(this.on)try{r.start()}catch{}};
    r.onerror=e=>{if(e.error==='not-allowed'){ctx.toast('Microphone permission denied.');this.stop()}};
    this.on=true;r.start();this.btn.textContent='Voice: listening';ctx.reader.pause()},
  stop(){this.on=false;this.rec?.stop();this.ctx.reader.followMode=false;this.btn.textContent='Voice: off'},
  match(text){
    const heard=text.split(/\s+/).map(norm).filter(Boolean).slice(-4);if(!heard.length)return;
    const W=this.norms;let best=-1,bestScore=0;
    for(let i=Math.max(0,this.idx-3);i<Math.min(W.length,this.idx+40);i++){
      let s=0;for(let k=1;k<=heard.length;k++){if(W[i-k+1]===heard[heard.length-k])s++;else break}
      if(s>bestScore||(s===bestScore&&s>0&&Math.abs(i-this.idx)<Math.abs(best-this.idx))){bestScore=s;best=i}}
    if(best>=0&&(bestScore>=2||heard.length===1)){this.idx=best;this.ctx.reader.scrollToWord(Math.min(best+1,W.length-1))}},
  onReaderOpen(){this.on&&this.onReaderStart()},
  destroy(){this.stop();this.btn?.remove()}
};

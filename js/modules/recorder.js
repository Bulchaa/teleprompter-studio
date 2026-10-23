// Recording: camera+mic via MediaRecorder; clips are stored in IndexedDB.
import * as db from '../db.js';
export default {
  name:'recorder',
  init(ctx){
    if(!navigator.mediaDevices||!window.MediaRecorder){ctx.toast('Recording is not supported here.');return false}
    this.ctx=ctx;this.rec=null;this.btn=ctx.addButton('Record',()=>this.rec?this.stop():this.start());
    this.list=document.getElementById('recList');this.list.classList.remove('hidden');this.render();
    ctx.reader.addEventListener('end',this.onEnd=()=>this.rec&&this.stop());return true},
  async start(){
    try{this.stream=await navigator.mediaDevices.getUserMedia({video:true,audio:true})}
    catch{this.ctx.toast('Camera or microphone permission denied.');return}
    const cam=document.getElementById('cam');cam.srcObject=this.stream;cam.classList.remove('hidden');cam.play();
    const chunks=[];const mime=['video/webm;codecs=vp9,opus','video/webm','video/mp4'].find(m=>MediaRecorder.isTypeSupported(m));
    this.rec=new MediaRecorder(this.stream,mime?{mimeType:mime}:{});
    this.rec.ondataavailable=e=>e.data.size&&chunks.push(e.data);
    this.t0=Date.now();
    this.rec.onstop=async()=>{
      this.stream.getTracks().forEach(t=>t.stop());cam.classList.add('hidden');cam.srcObject=null;
      const blob=new Blob(chunks,{type:this.rec.mimeType});
      await db.put('recordings',{id:db.uid(),scriptId:this.ctx.current()?.id,title:this.ctx.current()?.title||'Untitled',created:Date.now(),duration:Date.now()-this.t0,blob});
      this.rec=null;this.btn.textContent='Record';this.render();this.ctx.toast('Recording saved.')};
    this.rec.start(1000);this.btn.textContent='Stop recording';this.btn.classList.add('is-recording')},
  stop(){this.rec?.stop();this.btn.classList.remove('is-recording')},
  async render(){
    this.urls?.forEach(u=>URL.revokeObjectURL(u));this.urls=[];
    const rs=(await db.all('recordings')).sort((a,b)=>b.created-a.created);
    this.list.classList.toggle('hidden',!rs.length);
    this.list.innerHTML=rs.length?'<div class="rec-head">Recordings</div>':'';
    rs.forEach(r=>{
      const url=URL.createObjectURL(r.blob);this.urls.push(url);
      const ext=r.blob.type.includes('mp4')?'mp4':'webm';
      const row=document.createElement('div');row.className='rec-item';
      row.innerHTML='<div class="rec-info"><span class="rec-name"></span><span class="rec-meta"></span></div>'+
        '<div class="rec-actions"><a class="rec-link" target="_blank" rel="noopener">Play</a>'+
        '<a class="rec-link" download>Download</a><button class="rec-del" type="button">Delete</button></div>';
      row.querySelector('.rec-name').textContent=r.title||'Untitled';
      row.querySelector('.rec-meta').textContent=`${new Date(r.created).toLocaleString()} · ${Math.round(r.duration/1000)}s`;
      const links=row.querySelectorAll('a');
      links[0].href=url;links[1].href=url;links[1].download=`${r.title||'recording'}.${ext}`;
      row.querySelector('.rec-del').onclick=async()=>{await db.del('recordings',r.id);this.render()};
      this.list.append(row);
    })},
  destroy(){this.urls?.forEach(u=>URL.revokeObjectURL(u));this.rec&&this.stop();this.btn?.remove();this.list.classList.add('hidden');this.ctx.reader.removeEventListener('end',this.onEnd)}
};

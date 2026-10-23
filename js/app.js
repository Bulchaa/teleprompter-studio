import * as db from './db.js';
import {importFiles,exportScript,exportBackup} from './importer.js';
import {Reader} from './reader.js';

const $=id=>document.getElementById(id);
const MODS={voice:()=>import('./modules/voice.js'),recorder:()=>import('./modules/recorder.js'),remote:()=>import('./modules/remote.js'),webremote:()=>import('./modules/webremote.js')};
const mobile=matchMedia('(max-width: 900px)');
const root=document.documentElement;
const themeMeta=document.querySelector('meta[name="theme-color"]');
const store={
  get:k=>{try{return localStorage.getItem(k)}catch{return null}},
  set:(k,v)=>{try{localStorage.setItem(k,v)}catch{}}
};
let scripts=[],cur=null,timer,pendingId=null,countdownToken=0;
const reader=new Reader(),active={};

/* ---------- theme ---------- */
function setTheme(theme,persist=true){
  theme=theme==='dark'?'dark':'light';
  root.dataset.theme=theme;
  if(persist)store.set('tp-theme',theme);
  themeMeta?.setAttribute('content',theme==='dark'?'#0d0c0a':'#f3f0e9');
  const btn=$('themeToggle');
  if(btn){
    const next=theme==='dark'?'light':'dark';
    btn.setAttribute('aria-label',`Switch to ${next} mode`);
    btn.title=`Switch to ${next} mode`;
    btn.setAttribute('aria-pressed',String(theme==='dark'));
  }
}
setTheme(root.dataset.theme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'),false);
$('themeToggle')?.addEventListener('click',()=>setTheme(root.dataset.theme==='dark'?'light':'dark'));
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',e=>{
  if(!store.get('tp-theme'))setTheme(e.matches?'dark':'light',false);
});

const toast=m=>{
  document.querySelectorAll('.tp-toast').forEach(n=>n.remove());
  const d=document.createElement('div');
  d.textContent=m;d.className='tp-toast';d.setAttribute('role','status');
  document.body.append(d);setTimeout(()=>d.remove(),3800);
};

const ctx={
  reader,toast,current:()=>cur,
  size:d=>{$('rSize').value=+$('rSize').value+d;applyStyle()},
  addButton:(t,fn)=>{
    const b=document.createElement('button');
    b.className='btn';b.type='button';b.textContent=t;b.onclick=fn;
    $('modBar').append(b);return b;
  }
};

/* ---------- mobile navigation & menus ---------- */
const sidebar=$('sidebar'),backdrop=$('backdrop'),menuBtn=$('menuBtn'),sidebarClose=$('sidebarClose');
function setSidebar(open){
  sidebar.classList.toggle('open',open);
  backdrop.classList.toggle('show',open);
  menuBtn.setAttribute('aria-expanded',String(open));
}
menuBtn.addEventListener('click',()=>setSidebar(!sidebar.classList.contains('open')));
sidebarClose.addEventListener('click',()=>setSidebar(false));
backdrop.addEventListener('click',()=>setSidebar(false));
mobile.addEventListener?.('change',e=>{
  if(!e.matches)setSidebar(false);
  setActions(false);
});

const headerActions=$('headerActions'),actionsBtn=$('actionsBtn');
function setActions(open){
  headerActions.classList.toggle('open',open);
  actionsBtn.setAttribute('aria-expanded',String(open));
}
actionsBtn.addEventListener('click',e=>{
  e.stopPropagation();
  setActions(!headerActions.classList.contains('open'));
});
document.addEventListener('click',e=>{
  if(!headerActions.contains(e.target)&&!actionsBtn.contains(e.target))setActions(false);
});

addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){
    e.preventDefault();
    if(!$('reader').classList.contains('hidden'))return;
    if(mobile.matches)setSidebar(true);
    $('search').focus();$('search').select();
  }
  if(e.key==='Escape'){
    if(sidebar.classList.contains('open')){setSidebar(false);return}
    if(headerActions.classList.contains('open'))setActions(false);
  }
});

/* ---------- script management ---------- */
const trashIcon='<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg>';

async function refresh(){
  scripts=(await db.all('scripts')).sort((a,b)=>b.updated-a.updated);
  const q=$('search').value.trim().toLowerCase();
  const list=$('list');
  list.innerHTML='';
  $('scriptCount').textContent=scripts.length;
  const filtered=scripts.filter(s=>(s.title+' '+s.body).toLowerCase().includes(q));

  if(!filtered.length){
    const li=document.createElement('li');
    li.className='list-empty';
    li.innerHTML=scripts.length?'<strong>No matches</strong>Try a different search term.':'<strong>No scripts yet</strong>Create a new script or import a file to get started.';
    list.append(li);
    return;
  }

  filtered.forEach(s=>{
    const li=document.createElement('li');
    li.className='script-item'+(cur?.id===s.id?' on':'');
    li.tabIndex=0;
    li.innerHTML=`<button class="script-delete" type="button" aria-label="Delete script" title="Delete script">${trashIcon}</button>
      <div class="script-title"></div>
      <div class="script-meta"><span class="script-date"></span><span class="script-words"></span></div>`;
    li.querySelector('.script-title').textContent=s.title||'Untitled script';
    li.querySelector('.script-date').textContent=new Date(s.updated).toLocaleDateString(undefined,{month:'short',day:'numeric'});
    const words=(s.body.match(/\S+/g)||[]).length;
    li.querySelector('.script-words').textContent=words?`${words} words`:'Empty';
    li.addEventListener('click',()=>select(s.id));
    li.addEventListener('keydown',e=>{
      if(e.target!==li)return;
      if(e.key==='Enter'||e.key===' '){e.preventDefault();select(s.id)}
    });
    li.querySelector('.script-delete').addEventListener('click',async e=>{
      e.stopPropagation();
      if(!confirm(`Delete "${s.title||'Untitled'}"?`))return;
      if(pendingId===s.id){clearTimeout(timer);pendingId=null}
      await db.del('scripts',s.id);
      if(cur?.id===s.id)cur=null;
      toast('Script deleted.');
      await boot();
    });
    list.append(li);
  });
}

function select(id){
  cur=scripts.find(s=>s.id===id)||null;
  $('title').value=cur?.title||'';
  $('body').value=cur?.body||'';
  $('saved').textContent='Saved';
  stats();refresh();
  if(mobile.matches)setSidebar(false);
}

async function create(o={}){
  const s={id:db.uid(),title:'Untitled script',body:'',updated:Date.now(),...o};
  await db.put('scripts',s);
  await refresh();select(s.id);
  if(!mobile.matches){$('title').focus();$('title').select()}
}

function stats(){
  const w=($('body').value.match(/\S+/g)||[]).length;
  $('stats').textContent=`${w} ${w===1?'word':'words'} · about ${(w/(+$('wpm').value||150)).toFixed(1)} min`;
}

function autosave(){
  stats();
  if(!cur)return;
  const s=cur,title=$('title').value,body=$('body').value;
  $('saved').textContent='Saving…';
  pendingId=s.id;
  clearTimeout(timer);
  timer=setTimeout(async()=>{
    pendingId=null;
    s.title=title;s.body=body;s.updated=Date.now();
    try{await db.put('scripts',s)}
    catch{toast('Could not save this script.')}
    if(cur===s)$('saved').textContent='Saved';
    refresh();
  },400);
}

['title','body'].forEach(i=>$(i).addEventListener('input',autosave));
$('wpm').addEventListener('input',stats);
$('search').addEventListener('input',refresh);

$('btnNew').addEventListener('click',()=>{setActions(false);create()});
$('btnImport').addEventListener('click',()=>{setActions(false);$('fileIn').click()});

$('fileIn').addEventListener('change',async e=>{
  const {res,errors}=await importFiles([...e.target.files]);
  e.target.value='';
  for(const s of res)await db.put('scripts',s);
  await refresh();
  if(res[0])select(res[0].id);
  toast(`Imported ${res.length} script(s).`+(errors.length?' Errors: '+errors.join('; '):''));
});

addEventListener('dragover',e=>e.preventDefault());
addEventListener('drop',async e=>{
  e.preventDefault();
  if(!e.dataTransfer.files.length)return;
  $('fileIn').files=e.dataTransfer.files;
  $('fileIn').dispatchEvent(new Event('change'));
});

$('exportSel').addEventListener('change',async e=>{
  const f=e.target.value;
  e.target.value='';
  setActions(false);
  if(!f)return;
  try{
    if(f==='zip')await exportBackup(scripts);
    else if(cur){
      cur.title=$('title').value;cur.body=$('body').value;
      await exportScript(cur,f);
    }else toast('Select a script first.');
  }catch(err){toast(err.message)}
});

/* ---------- reader UI ---------- */
const readerEl=$('reader'),extras=$('readerExtras'),settingsBtn=$('rSettingsBtn'),appShell=document.querySelector('.app');
const remoteUrlBox=$('remoteUrlBox');
const remoteUrlInput=$('remoteUrlInput');
const remoteUrlCopy=$('remoteUrlCopy');

function syncOutputs(){
  $('rSpeedVal').textContent=$('rSpeed').value;
  $('rSizeVal').textContent=$('rSize').value;
  $('rWidthVal').textContent=$('rWidth').value+'%';
}

function applyStyle(){
  const s={speed:+$('rSpeed').value,size:+$('rSize').value,width:+$('rWidth').value,mirror:$('rMirror').checked,count:+$('rCount').value};
  reader.setStyle({size:s.size,width:s.width});
  syncOutputs();
  db.saveSetting('reader',s).catch(()=>{});
}

function setExtras(open){
  extras.classList.toggle('show',open);
  settingsBtn.classList.toggle('is-active',open);
  settingsBtn.setAttribute('aria-expanded',String(open));
}
settingsBtn.addEventListener('click',()=>setExtras(!extras.classList.contains('show')));

function setProgress(p){
  p=Math.max(0,Math.min(100,Math.round(p||0)));
  $('rProg').textContent=p+'%';
  $('rProgressFill').style.width=p+'%';
}

function present(){
  if(!cur){toast('Select or create a script first.');return}
  cur.body=$('body').value;
  cur.title=$('title').value;
  $('readerDoc').textContent=cur.title||'Untitled script';
  reader.load(cur.body||' ');
  readerEl.classList.remove('hidden');
  appShell.inert=true;
  setExtras(false);
  applyStyle();
  $('viewport').classList.toggle('mirror',$('rMirror').checked);
  Object.values(active).forEach(m=>m.onReaderOpen?.());
  try{
    const p=readerEl.requestFullscreen?.();
    if(p?.catch)p.catch(()=>{});
  }catch{}
  requestAnimationFrame(()=>$('rPlay').focus({preventScroll:true}));
}

function close(){
  countdownToken++;
  reader.pause();
  readerEl.classList.add('hidden');
  appShell.inert=false;
  setExtras(false);
  if(document.fullscreenElement){
    try{const p=document.exitFullscreen();if(p?.catch)p.catch(()=>{})}catch{}
  }
  $('btnPresent').focus({preventScroll:true});
  setTimeout(()=>{if(readerEl.classList.contains('hidden'))$('btnPresent').focus({preventScroll:true})},120);
}

async function start(){
  const token=++countdownToken;
  let n=+$('rCount').value;
  const c=$('countdown');
  while(n>0){
    if(token!==countdownToken)return;
    c.textContent=n--;
    c.classList.remove('hidden');
    await new Promise(r=>setTimeout(r,1000));
  }
  if(token!==countdownToken)return;
  c.classList.add('hidden');
  reader.play();
}

$('btnPresent').addEventListener('click',()=>{setActions(false);setSidebar(false);present()});
$('rClose').addEventListener('click',close);
$('rPlay').addEventListener('click',()=>reader.playing?reader.pause():start());
$('rRestart').addEventListener('click',()=>reader.restart());
$('rSpeed').addEventListener('input',e=>{reader.setSpeed(+e.target.value);applyStyle()});
['rSize','rWidth'].forEach(i=>$(i).addEventListener('input',applyStyle));
$('rMirror').addEventListener('change',e=>{
  $('viewport').classList.toggle('mirror',e.target.checked);
  applyStyle();
});
$('rCount').addEventListener('change',applyStyle);

reader.addEventListener('state',e=>{
  const {playing,speed,progress}=e.detail;
  $('rPlay').classList.toggle('is-playing',playing);
  $('rPlayLabel').textContent=playing?'Pause':'Play';
  $('rPlay').setAttribute('aria-label',playing?'Pause (Space)':'Play (Space)');
  $('rSpeed').value=speed;
  if(progress!=null)setProgress(progress);
  syncOutputs();
});
reader.addEventListener('progress',e=>setProgress(e.detail.progress));

addEventListener('keydown',e=>{
  if(readerEl.classList.contains('hidden'))return;
  if(e.key==='Escape'){e.preventDefault();close();return}
  const tag=e.target.tagName;
  if((tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT')&&!['range','checkbox'].includes(e.target.type))return;
  const k={
    ' ':()=>$('rPlay').click(),
    ArrowUp:()=>reader.setSpeed(reader.speed+10),
    ArrowDown:()=>reader.setSpeed(reader.speed-10),
    ArrowLeft:()=>reader.jump(-120),
    ArrowRight:()=>reader.jump(120),
    r:()=>reader.restart(),
    m:()=>$('rMirror').click()
  }[e.key.length===1?e.key.toLowerCase():e.key];
  if(k){e.preventDefault();k()}
});

let resizeTimer;
addEventListener('resize',()=>{
  clearTimeout(resizeTimer);
  resizeTimer=setTimeout(()=>{
    if(!readerEl.classList.contains('hidden'))reader.setStyle({size:+$('rSize').value,width:+$('rWidth').value});
  },120);
});

/* ---------- independent advanced modules ---------- */
function updateRemoteUrl(){
  const m=active['webremote'];
  if(m&&m.sessionId){
    remoteUrlInput.value=`${location.origin}/remote.html?session=${encodeURIComponent(m.sessionId)}`;
    remoteUrlBox.classList.remove('hidden');
  }else{
    remoteUrlBox.classList.add('hidden');
  }
}

remoteUrlCopy.addEventListener('click',()=>{
  remoteUrlInput.select();
  document.execCommand('copy');
  remoteUrlCopy.textContent='Copied!';
  setTimeout(()=>{remoteUrlCopy.textContent='Copy';},1200);
});

async function toggleMod(name,on){
  if(on&&!active[name]){
    const m=(await MODS[name]()).default;
    if(m.init(ctx)===false){
      document.querySelector(`[data-mod=${name}]`).checked=false;
      return;
    }
    active[name]=m;
  }else if(!on&&active[name]){
    active[name].destroy();
    delete active[name];
  }
  db.saveSetting('modules',Object.keys(active)).catch(()=>{});
  updateRemoteUrl();
}
document.querySelectorAll('[data-mod]').forEach(c=>c.addEventListener('change',()=>toggleMod(c.dataset.mod,c.checked)));

/* ---------- boot ---------- */
async function boot(){
  await refresh();
  if(!scripts.length)await create({title:'Welcome',body:'Welcome to Teleprompter Studio.\n\nPaste or import a script on the left, then press Start reading. Use Space to play, the arrow keys to change speed, and M to mirror the text for a glass rig.'});
  else if(!cur)select(scripts[0].id);
}

(async()=>{
  const s=await db.setting('reader');
  if(s){
    $('rSpeed').value=s.speed;
    $('rSize').value=s.size;
    $('rWidth').value=s.width;
    $('rMirror').checked=s.mirror;
    $('rCount').value=s.count;
    reader.speed=+s.speed;
  }
  syncOutputs();
  setProgress(0);
  await boot();
  for(const n of await db.setting('modules',[])){
    const c=document.querySelector(`[data-mod=${n}]`);
    if(c){c.checked=true;await toggleMod(n,true)}
  }
})();

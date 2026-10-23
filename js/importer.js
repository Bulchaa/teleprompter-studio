import {lib} from './libs.js';
import {uid} from './db.js';
const clean=t=>t.replace(/\r\n?/g,'\n').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
const stripMd=t=>t.replace(/^#{1,6}\s+/gm,'').replace(/(\*\*|__|\*|_|`)/g,'').replace(/!?\[([^\]]*)\]\([^)]*\)/g,'$1').replace(/^>\s?/gm,'').replace(/^[-*+]\s+/gm,'');
export async function readFile(file){
  const ext=file.name.split('.').pop().toLowerCase(),title=file.name.replace(/\.[^.]+$/,'');
  let text='';
  if(ext==='docx'){const m=await lib('mammoth');text=(await m.extractRawText({arrayBuffer:await file.arrayBuffer()})).value}
  else if(ext==='pdf'){
    const p=await lib('pdfjsLib'),pdf=await p.getDocument({data:await file.arrayBuffer()}).promise,out=[];
    for(let i=1;i<=pdf.numPages;i++){const c=await (await pdf.getPage(i)).getTextContent();
      let line='',lastY=null;
      for(const it of c.content.items){if(lastY!==null&&Math.abs(it.transform[5]-lastY)>2)line+='\n';line+=it.str+(it.hasEOL?'\n':' ');lastY=it.transform[5]}
      out.push(line)}
    text=out.join('\n\n')}
  else if(ext==='html'||ext==='htm'){
    const d=new DOMParser().parseFromString(await file.text(),'text/html');
    d.querySelectorAll('script,style').forEach(n=>n.remove());
    d.querySelectorAll('p,div,br,h1,h2,h3,h4,h5,h6,li').forEach(n=>n.after('\n\n'));text=d.body.textContent}
  else if(ext==='json'){
    const j=JSON.parse(await file.text());const arr=Array.isArray(j)?j:j.scripts||[j];
    return arr.filter(s=>s.body!=null).map(s=>({id:uid(),title:s.title||title,body:s.body,updated:Date.now()}))}
  else{text=await file.text();if(ext==='md'||ext==='markdown')text=stripMd(text)}
  return [{id:uid(),title,body:clean(text),updated:Date.now()}]}
export async function importFiles(files){
  const res=[],errors=[];
  for(const f of files){try{res.push(...await readFile(f))}catch(e){errors.push(`${f.name}: ${e.message}`)}}
  return {res,errors}}

const esc=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const dl=(blob,name)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1e3)};
const safe=s=>(s||'script').replace(/[^\w\- ]+/g,'').trim()||'script';
export async function exportScript(s,fmt){
  const n=safe(s.title);
  if(fmt==='txt')dl(new Blob([s.body],{type:'text/plain'}),n+'.txt');
  else if(fmt==='md')dl(new Blob([`# ${s.title}\n\n${s.body}\n`],{type:'text/markdown'}),n+'.md');
  else if(fmt==='html')dl(new Blob([`<!doctype html><meta charset=utf-8><title>${esc(s.title)}</title><h1>${esc(s.title)}</h1>${s.body.split(/\n{2,}/).map(p=>`<p>${esc(p).replace(/\n/g,'<br>')}</p>`).join('')}`],{type:'text/html'}),n+'.html');
  else if(fmt==='json')dl(new Blob([JSON.stringify({scripts:[s]},null,2)],{type:'application/json'}),n+'.json');
  else if(fmt==='docx'){
    const Z=await lib('JSZip'),z=new Z(),ns='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
    const para=t=>`<w:p><w:r><w:t xml:space="preserve">${esc(t)}</w:t></w:r></w:p>`;
    z.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
    z.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    z.file('word/document.xml',`<?xml version="1.0" encoding="UTF-8"?><w:document ${ns}><w:body>${para(s.title)}${s.body.split(/\n/).map(para).join('')}</w:body></w:document>`);
    dl(await z.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}),n+'.docx')}}
export async function exportBackup(scripts){
  const Z=await lib('JSZip'),z=new Z();
  z.file('scripts.json',JSON.stringify({scripts},null,2));
  scripts.forEach(s=>z.file(`${safe(s.title)}-${s.id}.txt`,s.body));
  dl(await z.generateAsync({type:'blob'}),'teleprompter-backup.zip')}

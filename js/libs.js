// Loads vendor libs from ./vendor first (fully offline), then falls back to CDN.
const LIBS={
  mammoth:['vendor/mammoth.browser.min.js','https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js'],
  pdfjsLib:['vendor/pdf.min.js','https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'],
  JSZip:['vendor/jszip.min.js','https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js']};
const WORKER=['vendor/pdf.worker.min.js','https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'];
const tag=src=>new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error(src));document.head.append(s)});
export async function lib(name){
  if(window[name])return window[name];
  for(const src of LIBS[name]){try{await tag(src);if(window[name])break}catch{}}
  if(!window[name])throw new Error(`Could not load ${name}. Put it in /vendor or go online once.`);
  if(name==='pdfjsLib'){
    const local=await fetch(WORKER[0],{method:'HEAD'}).then(r=>r.ok).catch(()=>false);
    window.pdfjsLib.GlobalWorkerOptions.workerSrc=local?WORKER[0]:WORKER[1]}
  return window[name]}

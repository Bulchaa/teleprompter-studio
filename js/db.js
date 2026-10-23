const NAME='teleprompter-studio',STORES=['scripts','recordings','settings'];
let _db;
export function open(){return _db||(_db=new Promise((res,rej)=>{
  const r=indexedDB.open(NAME,1);
  r.onupgradeneeded=()=>{STORES.forEach(s=>r.result.createObjectStore(s,{keyPath:s==='settings'?'key':'id'}))};
  r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}))}
async function tx(store,mode,fn){const db=await open();return new Promise((res,rej)=>{
  const t=db.transaction(store,mode),rq=fn(t.objectStore(store));
  t.oncomplete=()=>res(rq&&rq.result);t.onerror=()=>rej(t.error)})}
export const put=(s,o)=>tx(s,'readwrite',x=>x.put(o));
export const get=(s,k)=>tx(s,'readonly',x=>x.get(k));
export const all=s=>tx(s,'readonly',x=>x.getAll());
export const del=(s,k)=>tx(s,'readwrite',x=>x.delete(k));
export const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
export const setting=async(k,d)=>{const r=await get('settings',k);return r?r.value:d};
export const saveSetting=(k,v)=>put('settings',{key:k,value:v});

/* 교사 네비 오프라인 저장: 한 번 연 파일·'모두 저장'한 파일은 인터넷 없이 열린다 */
const C='bible-nav-a123636b36e2';const CORE=['./'].concat(["index.html", "manifest.webmanifest", "nav/app.js", "nav/app.css", "nav/data.json", "activity/1.html", "activity/2.html", "activity/3.html", "activity/6.html", "activity/4.html", "activity/5.html", "activity/7.html"]);
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(CORE.map(f=>new Request(f,{cache:'reload'})))).catch(()=>{}));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C&&/^bible-/.test(k)).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);if(u.origin!==location.origin)return;
  e.respondWith((async()=>{
    const c=await caches.open(C);
    const hit=await c.match(r,{ignoreSearch:true});if(hit)return hit;
    try{
      const res=await fetch(r);
      if(res.ok&&res.status===200&&!r.headers.get('range'))c.put(r,res.clone());
      return res;
    }catch(err){
      if(r.mode==='navigate'){const s=await c.match('./');if(s)return s;}
      throw err;
    }
  })());
});

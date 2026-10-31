const CACHE='labpc-desenha-v27-shell';
const SHELL=['./desenha-adivinha-v27.html','./index.html'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('labpc-desenha-')&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim()})())});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 const url=new URL(req.url);
 if(!url.pathname.endsWith('/desenha-adivinha-v27.html')&&!url.pathname.endsWith('/aprender/')&&!url.pathname.endsWith('/aprender/index.html'))return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);
 try{const response=await fetch(req);if(response.ok)await cache.put(req,response.clone());return response}catch(e){const saved=await cache.match(req,{ignoreSearch:true});return saved||await cache.match('./desenha-adivinha-v27.html')||Response.error()}})());
});
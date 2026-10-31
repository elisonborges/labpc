const CACHE='labpc-desenha-v28-shell',AI='labpc-desenha-v28-ai';
const SHELL=['./desenha-adivinha-v28.html','./index.html'];
const ASSETS=[
'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js',
'https://raw.githubusercontent.com/yining1023/doodleNet/master/model-tfjs/model.json',
'https://raw.githubusercontent.com/yining1023/doodleNet/master/model-tfjs/group1-shard1of1.bin'
];
self.addEventListener('install',e=>e.waitUntil((async()=>{
 await (await caches.open(CACHE)).addAll(SHELL);
 const cache=await caches.open(AI);
 await Promise.allSettled(ASSETS.map(async u=>{const r=await fetch(u,{mode:'cors'});if(r.ok)await cache.put(u,r)}));
 await self.skipWaiting();
})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{
 const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('labpc-desenha-')&&![CACHE,AI].includes(k)).map(k=>caches.delete(k)));await self.clients.claim();
})()));
self.addEventListener('message',e=>{
 if(e.data?.type==='LABPC_AI_STATUS')e.waitUntil((async()=>{
 const cache=await caches.open(AI),found=await Promise.all(ASSETS.map(u=>cache.match(u).then(Boolean)));
 e.source?.postMessage({type:'LABPC_AI_STATUS',ready:found.every(Boolean),cached:found.filter(Boolean).length,total:ASSETS.length});
 })());
});
self.addEventListener('fetch',e=>{
 const req=e.request;if(req.method!=='GET')return;
 const url=new URL(req.url),isAi=ASSETS.includes(url.href),isShell=url.origin===self.location.origin&&(url.pathname.endsWith('/desenha-adivinha-v28.html')||url.pathname.endsWith('/aprender/')||url.pathname.endsWith('/aprender/index.html'));
 if(!isAi&&!isShell)return;
 e.respondWith((async()=>{
 const cache=await caches.open(isAi?AI:CACHE);
 if(isAi){const saved=await cache.match(req);if(saved)return saved;try{const response=await fetch(req);if(response.ok)await cache.put(req,response.clone());return response}catch{return Response.error()}}
 try{const response=await fetch(req);if(response.ok)await cache.put(req,response.clone());return response}catch{return await cache.match(req,{ignoreSearch:true})||await cache.match('./desenha-adivinha-v28.html')||Response.error()}
 })());
});
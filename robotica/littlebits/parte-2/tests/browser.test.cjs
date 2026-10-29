/* PLAYWRIGHT_MODULE can point to a local installation outside this repository.
   BROWSER_PATH can point to a system Chromium/Chrome/Edge executable. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const assert=require('node:assert/strict');
const lab=require('../data.js');
const root=path.resolve(__dirname,'..');
const out=process.env.SCREENSHOT_DIR||path.join(root,'test-results');
fs.mkdirSync(out,{recursive:true});
let checks=0;const check=(v,label)=>{assert.ok(v,label);checks++;};
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try {
  const context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // File URLs exercise the downloaded activity without a web server or internet.
  await context.setOffline(true);
  const url=n=>pathToFileURL(path.join(root,'missao-'+n,'index.html')).href;
  async function input(id,value){await page.locator('#'+id).evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},value);}
  async function fill(n){for(const [r,c]of lab.missions[n].chains.entries())for(const[i,kind]of c.order.entries()){await page.locator('[data-kind="'+kind+'"]').click();await page.locator('[data-row="'+r+'"][data-slot="'+i+'"]').click();}for(const el of await page.locator('[data-link]').all())await el.click();}
  async function test(){await page.locator('#test').click();}
  async function complete(n){check((await page.locator('#status').innerText()).includes('Missão '+n+' concluída'),'mission '+n+' completed');check(await page.locator('#next').isVisible(),'next link '+n);}
  for(let n=2;n<=9;n++){
   await page.goto(url(n));await page.locator('[data-slot]').first().waitFor();
   await test();check(!(await page.locator('#status').innerText()).includes('concluída'),'empty mission '+n+' rejects');
   await fill(n);
   if(n===2){await input('sun',80);await input('volume',70);}
   if(n===3)await page.locator('#valve').check();
   if(n===4){await input('charge',50);await input('fuel',60);}
   if(n===6){await test();check((await page.locator('#observed').innerText()).includes('dia'),'day observation shown');check(!(await page.locator('#effect0').getAttribute('class')).includes('active'),'day lamp off');await input('ambient',20);}
   if(n===7)await input('wind',80);
   if(n===8){await page.locator('#step').click();check((await page.locator('#reserveValue').innerText())==='25/100','reserve charged');await input('sun',0);await page.locator('#step').click();}
   if(n===9){await page.locator('#step').click();await input('sun',0);await input('ambient',0);await page.locator('#step').click();}
   await test();await complete(n);
   const overflow=await page.evaluate(()=>({body:document.documentElement.scrollHeight>innerHeight+1,horizontal:document.documentElement.scrollWidth>innerWidth+1,controls:(()=>{const r=document.querySelector('.controls').getBoundingClientRect();return r.bottom<=innerHeight&&r.top>=0;})()}));
   check(!overflow.body&&!overflow.horizontal&&overflow.controls,'desktop compact mission '+n+' '+JSON.stringify(overflow));
   await page.screenshot({path:path.join(out,'mission-'+n+'-desktop.png'),fullPage:true});
   // Reload persists that mission's completion even from a local file origin.
   await page.reload();check((await page.locator('[data-n="'+n+'"]').getAttribute('class')).includes('done'),'saved completion '+n);
  }
  // Real browser mouse drag and touch-event placement, plus rewiring invalidation.
  await page.goto(url(2));await page.locator('[data-kind="solar"]').dragTo(page.locator('[data-row="0"][data-slot="0"]'));
  check((await page.locator('[data-slot="0"]').getAttribute('aria-label')).includes('Painel solar'),'native mouse drag');
  const target=await page.locator('[data-row="0"][data-slot="1"]').boundingBox();
  await page.locator('[data-kind="volume"]').evaluate((el,t)=>{el.dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',pointerId:1,clientX:10,clientY:10,bubbles:true}));el.dispatchEvent(new PointerEvent('pointerup',{pointerType:'touch',pointerId:1,clientX:t.x+t.width/2,clientY:t.y+t.height/2,bubbles:true}));},target);
  check((await page.locator('[data-slot="1"]').getAttribute('aria-label')).includes('Volume'),'touch event places component');
  await page.locator('[data-slot="0"]').click();await page.locator('#remove').click();check((await page.locator('[data-slot="0"]').getAttribute('aria-label')).includes('vazio'),'remove via real controls');
  await page.locator('#reset').click();await fill(2);await input('sun',80);await input('volume',80);await test();
  await page.locator('[data-link="0"]').click();check(!(await page.locator('#effect0').getAttribute('class')).includes('active'),'disconnect removes effect');await test();check(!(await page.locator('#status').innerText()).includes('concluída'),'disconnect invalidates test');
  // Mission 1 must merge existing 2–9 progress on the shared online origin.
  await page.goto(url(1));await page.evaluate(()=>localStorage.setItem('labpc-littlebits-parte2-v1',JSON.stringify({completed:[2,3,4,5,6,7,8,9]})));
  for(const[i,k]of ['usina','transmissao','transformador','lampada'].entries()){await page.locator('[data-kind="'+k+'"]').click();await page.locator('[data-slot="'+i+'"]').click();}for(const el of await page.locator('[data-link]').all())await el.click();await test();
  check((await page.evaluate(()=>JSON.parse(localStorage.getItem('labpc-littlebits-parte2-v1')).completed)).length===9,'replaying mission 1 preserves all progress');
  // A shared HTTP origin is checked separately by the test's temporary local server.
  const http=require('node:http');
  const server=http.createServer((req,res)=>{const requested=decodeURIComponent((req.url||'/').split('?')[0]);const resolved=path.resolve(root,'.'+requested);if(!resolved.startsWith(root+path.sep)&&resolved!==root){res.writeHead(403);return res.end();}let file=resolved;if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');if(!fs.existsSync(file)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(fs.readFileSync(file));});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
   await context.setOffline(false);const base='http://127.0.0.1:'+server.address().port;
   await page.goto(base+'/');
   await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));});
   await page.evaluate(()=>{localStorage.setItem('labpc-littlebits-parte2-v1',JSON.stringify({completed:[1,2,3,4,5,6,7,8,9]}));localStorage.setItem('labpc-littlebits-missions-v1','[1,2,3]');});
   await page.reload();check((await page.locator('#journeyStatus').innerText()).includes('9 de 9'),'journey reports all nine');await page.locator('[data-card="9"]').click();check(await page.locator('body').getAttribute('data-mission')==='9','journey navigation opens mission');check(await page.evaluate(()=>localStorage.getItem('labpc-littlebits-missions-v1'))==='[1,2,3]','Part 1 storage preserved');
   await context.setOffline(true);
   for(let n=1;n<=9;n++){await page.goto(base+'/missao-'+n+'/');await page.locator('[data-slot]').first().waitFor();check((await page.locator('[data-n="'+n+'"]').getAttribute('class')).includes('done'),'cached offline mission '+n+' shares progress');}
   await page.goto(base+'/');check((await page.locator('#journeyStatus').innerText()).includes('9 de 9'),'offline journey retains completion');
   await context.setOffline(false);
  }
  finally {await new Promise(resolve=>server.close(resolve));}
  for(const viewport of [{width:1024,height:768},{width:1366,height:610},{width:390,height:844}]){
   await page.setViewportSize(viewport);for(const n of [5,9]){await page.goto(url(n));const width=await page.evaluate(()=>document.documentElement.scrollWidth);check(width<=viewport.width+1,'no horizontal overflow '+n+' at '+viewport.width);if(viewport.width>850){const rect=await page.locator('.controls').boundingBox();check(rect.y+rect.height<=viewport.height,'controls fit '+n+' '+JSON.stringify(viewport));const fits=await page.locator('.multi-board').evaluate(el=>el.scrollHeight<=el.clientHeight+2);check(fits,'all networks fit without scrolling '+n+' '+JSON.stringify(viewport));}await page.screenshot({path:path.join(out,'mission-'+n+'-'+viewport.width+'x'+viewport.height+'.png'),fullPage:true});}
  }
  check(errors.length===0,'no browser errors: '+errors.join('; '));
  await context.close();console.log(checks+' browser checks passed; screenshots in '+out);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

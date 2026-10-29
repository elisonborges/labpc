/* Run: node robotica/littlebits/parte-2/tests/mission-1.test.cjs
   Event tests use a small DOM double; they do not replace browser/visual QA. */
const fs = require('node:fs');
const path = require('node:path');
const APP = fs.readFileSync(path.join(__dirname, '../missao-1/app.js'), 'utf8');

function createHarness(options={}){
 class El{
 constructor(data={}){this.dataset=data;this.listeners={};this.attrs={};this.classes=new Set();this.textContent='';this.innerHTML='';this.draggable=false;}
 set className(v){this.classes=new Set(v.split(' ').filter(Boolean));}
 get className(){return [...this.classes].join(' ');}
 get classList(){return {add:(x)=>this.classes.add(x),remove:(x)=>this.classes.delete(x),toggle:(x,force)=>{if(force===undefined)force=!this.classes.has(x);if(force)this.classes.add(x);else this.classes.delete(x);return force;},contains:x=>this.classes.has(x)};}
 setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,f){(this.listeners[k]??=[]).push(f);}
 fire(k,e={}){for(const f of this.listeners[k]||[])f({preventDefault(){},...e});}
 setPointerCapture(){}getBoundingClientRect(){let i=Number(this.dataset.slot);return {left:i*100,right:i*100+99,top:0,bottom:99};}
 }
 const slots=Array.from({length:4},(_,i)=>new El({slot:String(i)})),links=Array.from({length:3},(_,i)=>new El({link:String(i)}));
 const pieces=['lampada','transmissao','usina','transformador'].map(kind=>new El({kind})),ids=Object.fromEntries(['status','board','effect','effectText','componentInfo','test','remove','reset'].map(x=>[x,new El()]));
 const dot=new El();const data={ 'labpc-littlebits-missions-v1':'[1,2,3]'};
 if(options.corrupt)data['labpc-littlebits-parte2-v1']='{"completed":7}';
 const document={getElementById:id=>ids[id],querySelectorAll:s=>s==='[data-slot]'?slots:s==='[data-link]'?links:pieces,querySelector:()=>dot};
 const localStorage={getItem:k=>{if(options.denied)throw Error('denied');return data[k]??null;},setItem:(k,v)=>{if(options.denied)throw Error('denied');data[k]=v;}};
 new Function('document','localStorage','setTimeout',APP)(document,localStorage,f=>f());
 const clickKind=k=>pieces.find(p=>p.dataset.kind===k).fire('click');
 const place=(k,i)=>{clickKind(k);slots[i].fire('click');};
 const fill=()=>['usina','transmissao','transformador','lampada'].forEach(place);
 const connect=()=>links.forEach(l=>l.fire('click'));
 const test=()=>ids.test.fire('click');
 const assert=(condition,label)=>{if(!condition)throw Error(label);};
 return {slots,links,pieces,ids,dot,data,clickKind,place,fill,connect,test,assert};
}

const a=createHarness(),{assert}=a;
a.test();assert(a.ids.status.textContent.includes('incompleta'),'empty rejects');
a.links[0].fire('click');assert(a.links[0].attrs['aria-pressed']==='false','empty link rejects');
a.place('lampada',0);a.place('usina',1);a.place('transmissao',2);a.place('transformador',3);a.connect();a.test();assert(a.ids.status.classList.contains('bad'),'wrong order rejects');
a.ids.reset.fire('click');a.fill();a.test();assert(a.ids.status.textContent.includes('elos'),'unconnected rejects');
a.connect();a.test();assert(a.ids.effect.classList.contains('active'),'correct chain lights');
assert(a.dot.classList.contains('done'),'progress saved');assert(a.data['labpc-littlebits-missions-v1']==='[1,2,3]','Part 1 storage untouched');
a.links[1].fire('click');assert(!a.ids.effect.classList.contains('active'),'disconnect switches off');a.test();assert(a.ids.status.classList.contains('bad'),'broken chain rejects');
a.links[1].fire('click');a.test();a.slots[0].fire('click');a.slots[1].fire('click');assert(a.slots[1].attrs['aria-label'].includes('Usina')&&a.slots[0].attrs['aria-label'].includes('Transmissão'),'click swap works');assert(!a.ids.effect.classList.contains('active'),'move invalidates power');
a.slots[1].fire('click');a.ids.remove.fire('click');assert(a.slots[1].attrs['aria-label'].includes('vazio'),'remove works');
a.ids.reset.fire('click');assert(a.dot.classList.contains('done'),'reset preserves completed progress');
const b=createHarness();b.pieces.find(p=>p.dataset.kind==='usina').fire('dragstart',{dataTransfer:{setData(){}}});b.slots[0].fire('drop');assert(b.slots[0].attrs['aria-label'].includes('Usina'),'desktop drag places piece');
b.slots[0].fire('dragstart',{dataTransfer:{setData(){}}});b.slots[2].fire('drop');assert(b.slots[2].attrs['aria-label'].includes('Usina')&&b.slots[0].attrs['aria-label'].includes('vazio'),'desktop drag moves piece');
b.pieces.find(p=>p.dataset.kind==='lampada').fire('pointerdown',{pointerType:'touch',pointerId:1,clientX:10,clientY:200});
b.pieces.find(p=>p.dataset.kind==='lampada').fire('pointerup',{pointerType:'touch',pointerId:1,clientX:350,clientY:50});
assert(b.slots[3].attrs['aria-label'].includes('Lâmpada'),'touch drag places piece');
const c=createHarness({denied:true});c.fill();c.connect();c.test();assert(c.ids.effect.classList.contains('active')&&c.ids.status.textContent.includes('não permitiu'),'storage denied remains playable');
const d=createHarness({corrupt:true});d.fill();d.connect();d.test();assert(d.ids.effect.classList.contains('active'),'malformed storage recovers');

console.log('18 assertions passed. Browser layout is not covered by this test.');

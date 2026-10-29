/* Parte 2: progresso independente; nenhum acesso ao armazenamento da Parte 1. */
(()=>{'use strict';
const info={"usina":{"name":"Usina","description":"Gera energia elétrica a partir de uma fonte de energia.","art":"<svg viewBox=\"0 0 110 58\" aria-hidden=\"true\"><rect x=\"5\" y=\"10\" width=\"100\" height=\"39\" rx=\"6\" fill=\"#157bc5\" stroke=\"#244a62\" stroke-width=\"1.5\"/><rect x=\"0\" y=\"21\" width=\"10\" height=\"17\" rx=\"2\" fill=\"#cbd8e1\" stroke=\"#637a8a\"/><rect x=\"100\" y=\"21\" width=\"10\" height=\"17\" rx=\"2\" fill=\"#cbd8e1\" stroke=\"#637a8a\"/><path d=\"M16 18h78M16 41h78\" stroke=\"#ffffff88\" stroke-width=\"2\"/><rect x=\"33\" y=\"13\" width=\"44\" height=\"32\" rx=\"6\" fill=\"#e6eef5\" stroke=\"#51718b\"/><text x=\"55\" y=\"36\" font-size=\"21\" text-anchor=\"middle\">🏭</text></svg>"},"transmissao":{"name":"Transmissão","description":"Transporta energia por longas distâncias.","art":"<svg viewBox=\"0 0 110 58\" aria-hidden=\"true\"><rect x=\"5\" y=\"10\" width=\"100\" height=\"39\" rx=\"6\" fill=\"#ed9138\" stroke=\"#244a62\" stroke-width=\"1.5\"/><rect x=\"0\" y=\"21\" width=\"10\" height=\"17\" rx=\"2\" fill=\"#cbd8e1\" stroke=\"#637a8a\"/><rect x=\"100\" y=\"21\" width=\"10\" height=\"17\" rx=\"2\" fill=\"#cbd8e1\" stroke=\"#637a8a\"/><path d=\"M16 18h78M16 41h78\" stroke=\"#ffffff88\" stroke-width=\"2\"/><rect x=\"33\" y=\"13\" width=\"44\" height=\"32\" rx=\"6\" fill=\"#e6eef5\" stroke=\"#51718b\"/><text x=\"55\" y=\"36\" font-size=\"21\" text-anchor=\"middle\">🗼</text></svg>"},"transformador":{"name":"Transformador","description":"Nesta cadeia, reduz a tensão para o uso na cidade.","art":"<svg viewBox=\"0 0 110 58\" aria-hidden=\"true\"><rect x=\"5\" y=\"10\" width=\"100\" height=\"39\" rx=\"6\" fill=\"#ad68d6\" stroke=\"#244a62\" stroke-width=\"1.5\"/><rect x=\"0\" y=\"21\" width=\"10\" height=\"17\" rx=\"2\" fill=\"#cbd8e1\" stroke=\"#637a8a\"/><rect x=\"100\" y=\"21\" width=\"10\" height=\"17\" rx=\"2\" fill=\"#cbd8e1\" stroke=\"#637a8a\"/><path d=\"M16 18h78M16 41h78\" stroke=\"#ffffff88\" stroke-width=\"2\"/><rect x=\"33\" y=\"13\" width=\"44\" height=\"32\" rx=\"6\" fill=\"#e6eef5\" stroke=\"#51718b\"/><text x=\"55\" y=\"36\" font-size=\"21\" text-anchor=\"middle\">⚡</text></svg>"},"lampada":{"name":"Lâmpada","description":"Transforma energia elétrica em luz e calor.","art":"<svg viewBox=\"0 0 110 58\" aria-hidden=\"true\"><rect x=\"5\" y=\"10\" width=\"100\" height=\"39\" rx=\"6\" fill=\"#43b76b\" stroke=\"#244a62\" stroke-width=\"1.5\"/><rect x=\"0\" y=\"21\" width=\"10\" height=\"17\" rx=\"2\" fill=\"#cbd8e1\" stroke=\"#637a8a\"/><rect x=\"100\" y=\"21\" width=\"10\" height=\"17\" rx=\"2\" fill=\"#cbd8e1\" stroke=\"#637a8a\"/><path d=\"M16 18h78M16 41h78\" stroke=\"#ffffff88\" stroke-width=\"2\"/><rect x=\"33\" y=\"13\" width=\"44\" height=\"32\" rx=\"6\" fill=\"#e6eef5\" stroke=\"#51718b\"/><text x=\"55\" y=\"36\" font-size=\"21\" text-anchor=\"middle\">💡</text></svg>"}};
const order=['usina','transmissao','transformador','lampada'];
const key='labpc-littlebits-parte2-v1';
const slots=Array(4).fill(null),links=Array(3).fill(false);
const $=id=>document.getElementById(id);
const slotEls=[...document.querySelectorAll('[data-slot]')];
const linkEls=[...document.querySelectorAll('[data-link]')];
const pieces=[...document.querySelectorAll('[data-kind]')];
let selected=null,source=null,drag=null,suppressClick=false;
function message(text,type=''){ $('status').textContent=text;$('status').className='top-status '+type; }
function progress(){
 let completed=false;try{const saved=JSON.parse(localStorage.getItem(key)||'{}');completed=saved?.completed?.includes(1)===true;}catch{}
 if(globalThis.EnergyProgress) globalThis.EnergyProgress();
 const dot=document.querySelector('[data-n="1"]');dot.classList.toggle('done',completed);
 dot.title=completed?'Missão 1 concluída — jogar novamente':'O caminho da energia';
}
function off(){
 $('effect').classList.remove('active');$('board').classList.remove('powered');
 $('effectText').textContent='Lâmpada apagada';
}
function draw(){
 pieces.forEach(p=>p.setAttribute('aria-pressed',String(selected===p.dataset.kind&&source===null)));
 slotEls.forEach((el,i)=>{
 const kind=slots[i];el.className='slot'+(kind?' filled':'')+(source===i?' selected':'');
 el.draggable=!!kind;el.innerHTML=kind?info[kind].art+'<small>'+info[kind].name+'</small>':'<span>＋</span><small>Espaço '+(i+1)+'</small>';
 el.setAttribute('aria-label','Espaço '+(i+1)+(kind?': '+info[kind].name: ' vazio'));
 el.setAttribute('aria-pressed',String(source===i));
 });
 linkEls.forEach((el,i)=>{el.classList.toggle('connected',links[i]);el.textContent=links[i]?'◆':'◇';el.setAttribute('aria-pressed',String(links[i]));el.setAttribute('aria-label',(links[i]?'Desconectar':'Conectar')+' espaços '+(i+1)+' e '+(i+2));});
}
function select(kind,index=null){
 selected=kind;source=index;draw();$('componentInfo').textContent=info[kind].name+': '+info[kind].description;
 message(info[kind].name+' selecionado. Clique em um espaço para colocar ou mover.');
}
function invalidate(indices){
 indices.forEach(i=>{if(i>0)links[i-1]=false;if(i<3)links[i]=false;});off();
}
function put(kind,to,from=null){
 if(!Object.hasOwn(info,kind)||!Number.isInteger(to)||to<0||to>3)return;
 if(from!==null&&(!Number.isInteger(from)||slots[from]!==kind))return;
 if(from===to){selected=null;source=null;draw();return;}
 const existing=slots.indexOf(kind);
 const origin=from===null?(existing<0?null:existing):from;
 const touched=[to];
 if(origin!==null){slots[origin]=slots[to];touched.push(origin);}
 slots[to]=kind;invalidate(touched);selected=null;source=null;draw();
 message(info[kind].name+' colocado. Conecte novamente os elos ao redor da peça.');
}
function dragPayload(e,kind,from){
 drag={kind,from};e.dataTransfer.setData('text/plain',kind);e.dataTransfer.effectAllowed='move';
}
pieces.forEach(el=>{
 el.addEventListener('click',()=>{if(!suppressClick)select(el.dataset.kind);});
 el.addEventListener('dragstart',e=>dragPayload(e,el.dataset.kind,null));
});
slotEls.forEach((el,i)=>{
 el.addEventListener('click',()=>{if(suppressClick)return;if(selected)put(selected,i,source);else if(slots[i])select(slots[i],i);else message('Selecione primeiro um componente.','bad');});
 el.addEventListener('dragstart',e=>{if(slots[i])dragPayload(e,slots[i],i);else e.preventDefault();});
 el.addEventListener('dragover',e=>{e.preventDefault();el.classList.add('over');});
 el.addEventListener('dragleave',()=>el.classList.remove('over'));
 el.addEventListener('drop',e=>{e.preventDefault();el.classList.remove('over');if(drag)put(drag.kind,i,drag.from);drag=null;});
});
[...pieces,...slotEls].forEach(el=>{
 el.addEventListener('dragend',()=>{drag=null;slotEls.forEach(s=>s.classList.remove('over'));});
 let start=null;
 el.addEventListener('pointerdown',e=>{
 if(e.pointerType==='mouse')return;
 const from=el.dataset.slot===undefined?null:Number(el.dataset.slot);
 const kind=from===null?el.dataset.kind:slots[from];if(!kind)return;
 start={x:e.clientX,y:e.clientY,id:e.pointerId,kind,from};el.setPointerCapture(e.pointerId);
 });
 el.addEventListener('pointerup',e=>{
 if(!start||start.id!==e.pointerId)return;const s=start;start=null;
 if(Math.hypot(e.clientX-s.x,e.clientY-s.y)<=12)return;
 suppressClick=true;setTimeout(()=>{suppressClick=false;},0);
 const target=slotEls.find(t=>{const r=t.getBoundingClientRect();return e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;});
 if(target)put(s.kind,Number(target.dataset.slot),s.from);
 });
 el.addEventListener('pointercancel',()=>{start=null;});
});
linkEls.forEach((el,i)=>el.addEventListener('click',()=>{
 if(!slots[i]||!slots[i+1]){message('Coloque uma peça em cada lado antes de conectar.','bad');return;}
 links[i]=!links[i];off();draw();message(links[i]?'Elo conectado. Teste a cadeia quando terminar.':'Elo desconectado. A energia não passa por este trecho.');
}));
$('test').addEventListener('click',()=>{
 off();
 if(slots.some(k=>!k)){message('Cadeia incompleta: preencha os quatro espaços.','bad');return;}
 const wrong=order.findIndex((kind,i)=>slots[i]!==kind);
 if(wrong!==-1){message('Revise o espaço '+(wrong+1)+': '+(wrong===0?'a geração começa na usina.':wrong===1?'a transmissão transporta energia por longas distâncias.':wrong===2?'o transformador adapta a tensão antes do consumo.':'a lâmpada recebe a energia no final.'),'bad');return;}
 if(!links.every(Boolean)){message('Falta conectar os elos. Clique nos losangos entre os componentes.','bad');return;}
 $('effect').classList.add('active');$('board').classList.add('powered');$('effectText').textContent='Lâmpada acesa!';
 let saved=true;try{let completed=[];try{const previous=JSON.parse(localStorage.getItem(key)||'{}');if(Array.isArray(previous?.completed))completed=previous.completed.filter(x=>Number.isInteger(x)&&x>=1&&x<=9);}catch{}localStorage.setItem(key,JSON.stringify({completed:[...new Set([...completed,1])].sort((a,b)=>a-b)}));}catch{saved=false;}
 progress();if(document.getElementById('next'))document.getElementById('next').hidden=false;message('✓ Missão 1 concluída! Geração → transmissão → transformação → consumo. A lâmpada transforma energia elétrica em luz e calor.'+(saved?'':' Seu navegador não permitiu salvar o progresso.'),'good');
});
$('remove').addEventListener('click',()=>{
 if(source===null){message('Clique em uma peça montada para selecioná-la e remover.','bad');return;}
 const i=source;slots[i]=null;selected=null;source=null;invalidate([i]);draw();message('Componente removido. Monte novamente esse trecho.');
});
$('reset').addEventListener('click',()=>{
 slots.fill(null);links.fill(false);selected=null;source=null;drag=null;off();draw();message('Atividade reiniciada. Seu progresso concluído foi mantido.');
 $('componentInfo').textContent='Quatro componentes, um caminho de energia.';
});
draw();progress();
})();
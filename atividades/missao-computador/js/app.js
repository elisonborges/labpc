const MISSOES=[
["🖥️","Conheça o computador","Descoberta"],["🔎","Quem é quem?","Descoberta"],["💡","Para que serve?","Prática"],["🧩","Monte o computador","Prática"],
["✋","Posso tocar?","Desafio"],["💻","E o programa?","Desafio"],["↔️","Hardware ou Software?","Desafio"],["🚀","Desafio do Explorador","Consolidação"]];
const KEY="labpc_missao_computador_proto_v10";
let state=JSON.parse(localStorage.getItem(KEY)||'{"m1":{"etapa":0,"erros":0,"dicas":0,"concluida":false},"m2":{"etapa":0,"erros":0,"dicas":0,"concluida":false}}');
if(!state.m1) state.m1={etapa:0,erros:0,dicas:0,concluida:false};
if(!state.m2) state.m2={etapa:0,erros:0,dicas:0,concluida:false};
if(!state.m3) state.m3={etapa:0,erros:0,dicas:0,concluida:false};
if(!state.m4) state.m4={etapa:0,erros:0,dicas:0,concluida:false};
if(!state.m5) state.m5={etapa:0,erros:0,dicas:0,concluida:false};
if(!state.m6) state.m6={etapa:0,erros:0,dicas:0,concluida:false};
if(!state.m7) state.m7={etapa:0,erros:0,dicas:0,concluida:false};
if(!state.m8) state.m8={etapa:0,erros:0,dicas:0,concluida:false};
let etapa=state.m1.etapa||0, errosEtapa=0;

const svg={
monitor:`<svg viewBox="0 0 180 120" aria-label="monitor"><rect x="20" y="10" width="140" height="80" rx="8" fill="#143e67"/><rect x="28" y="18" width="124" height="64" rx="4" fill="#59c8ff"/><rect x="82" y="90" width="16" height="14" fill="#75879a"/><rect x="60" y="104" width="60" height="8" rx="4" fill="#536779"/></svg>`,
teclado:`<svg viewBox="0 0 180 120" aria-label="teclado"><path d="M18 40h144l10 55H8z" fill="#dbe5ec" stroke="#607789" stroke-width="3"/><g fill="#71889a">${Array.from({length:28},(_,i)=>{let r=Math.floor(i/10),c=i%10;return `<rect x="${20+c*14+(r?5:0)}" y="${50+r*14}" width="10" height="8" rx="2"/>`}).join("")}<rect x="55" y="91" width="70" height="7" rx="3"/></g></svg>`,
mouse:`<svg viewBox="0 0 180 120" aria-label="mouse"><path d="M60 105c-8-13-11-32-7-52C57 30 70 17 90 17s33 13 37 36c4 20 1 39-7 52z" fill="#e8eef3" stroke="#607789" stroke-width="3"/><path d="M90 18v36" stroke="#607789" stroke-width="3"/><rect x="84" y="31" width="12" height="20" rx="6" fill="#1e90ff"/></svg>`,
impressora:`<svg viewBox="0 0 180 120" aria-label="impressora"><rect x="45" y="12" width="90" height="45" rx="4" fill="#f6f8fa" stroke="#607789" stroke-width="3"/><rect x="25" y="45" width="130" height="55" rx="12" fill="#cfdbe5" stroke="#607789" stroke-width="3"/><rect x="45" y="70" width="90" height="40" fill="#fff" stroke="#607789" stroke-width="3"/><circle cx="135" cy="60" r="5" fill="#4caf50"/></svg>`,
microfone:`<svg viewBox="0 0 180 120" aria-label="microfone"><rect x="72" y="10" width="36" height="65" rx="18" fill="#34495e"/><path d="M58 55v7c0 19 14 31 32 31s32-12 32-31v-7" fill="none" stroke="#607789" stroke-width="7"/><path d="M90 93v17M68 110h44" stroke="#607789" stroke-width="7"/></svg>`,
camera:`<svg viewBox="0 0 180 120" aria-label="webcam"><rect x="48" y="22" width="84" height="62" rx="22" fill="#34495e"/><circle cx="90" cy="53" r="20" fill="#1e90ff"/><circle cx="90" cy="53" r="9" fill="#0b3c91"/><path d="M90 84v15M60 103h60" stroke="#607789" stroke-width="7"/></svg>`,
caixasom:`<svg viewBox="0 0 180 120" aria-label="caixa de som"><rect x="48" y="10" width="84" height="100" rx="14" fill="#34495e"/><circle cx="90" cy="43" r="14" fill="#8bdcff"/><circle cx="90" cy="79" r="23" fill="#1e90ff"/><circle cx="90" cy="79" r="9" fill="#0b3c91"/></svg>`
};

function save(){state.m1.etapa=etapa;localStorage.setItem(KEY,JSON.stringify(state))}
function go(id){document.querySelectorAll(".tela").forEach(x=>x.classList.remove("ativa"));document.getElementById(id).classList.add("ativa")}
function cards(){let g=document.getElementById("cards");g.innerHTML="";MISSOES.forEach((m,i)=>{let b=document.createElement("button");b.className="card"+((i<=7)?" pronta":"")+((i===0&&state.m1.concluida)||(i===1&&state.m2.concluida)||(i===2&&state.m3.concluida)||(i===3&&state.m4.concluida)||(i===4&&state.m5.concluida)||(i===5&&state.m6.concluida)||(i===6&&state.m7.concluida)||(i===7&&state.m8.concluida)?" done":"");b.innerHTML=`<span class="num">${i+1}</span><span class="emo">${m[0]}</span><strong>${m[1]}</strong><small>${m[2]}</small>`;b.onclick=()=>i===0?startM1():(i===1?startM2():(i===2?startM3():(i===3?startM4():(i===4?startM5():(i===5?startM6():(i===6?startM7():(i===7?startM8():placeholder(i))))))));g.appendChild(b)})}
function placeholder(i){document.getElementById("phTitulo").textContent=`MISSÃO ${i+1} DE 8`;document.getElementById("phEmoji").textContent=MISSOES[i][0];document.getElementById("phNome").textContent=MISSOES[i][1];go("placeholder")}
document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{if(b.dataset.go==="central")cards();go(b.dataset.go)});
document.querySelectorAll(".som").forEach(b=>b.onclick=()=>b.textContent=b.textContent==="🔊"?"🔇":"🔊");
document.getElementById("reset").onclick=()=>{if(confirm("Reiniciar somente o progresso deste protótipo?")){state={m1:{etapa:0,erros:0,dicas:0,concluida:false},m2:{etapa:0,erros:0,dicas:0,concluida:false},m3:{etapa:0,erros:0,dicas:0,concluida:false},m4:{etapa:0,erros:0,dicas:0,concluida:false},m5:{etapa:0,erros:0,dicas:0,concluida:false},m6:{etapa:0,erros:0,dicas:0,concluida:false},m7:{etapa:0,erros:0,dicas:0,concluida:false},m8:{etapa:0,erros:0,dicas:0,concluida:false}};etapa=0;save();cards()}};
document.getElementById("sairM1").onclick=()=>document.getElementById("modal").classList.add("open");
document.getElementById("ficar").onclick=()=>document.getElementById("modal").classList.remove("open");
document.getElementById("voltar").onclick=()=>{document.getElementById("modal").classList.remove("open");save();cards();go("central")};
document.getElementById("btnDica").onclick=()=>{state.m1.dicas++;save();document.getElementById("fala").textContent=dicaAtual()};

const etapas=[
{nome:"Descoberta",alvo:null},
{nome:"Monitor",alvo:"monitor",op:["mouse","monitor","teclado"]},
{nome:"Teclado",alvo:"teclado",op:["teclado","impressora","monitor"]},
{nome:"Mouse",alvo:"mouse",op:["microfone","mouse","camera"]},
{nome:"Revisão",alvo:"monitor",op:["teclado","monitor","mouse"]},
{nome:"Conclusão",alvo:null}
];
function startM1(){etapa=Math.min(state.m1.etapa||0,5);errosEtapa=0;go("missao1");render()}
function dots(){let d=document.getElementById("dots");d.innerHTML="";for(let i=0;i<5;i++){let s=document.createElement("span");s.className="dot"+(i<Math.min(etapa,5)?" ok":"");d.appendChild(s)}}
function render(){dots();let c=document.getElementById("conteudo"),f=document.getElementById("fala"),d=document.getElementById("btnDica");d.style.display=etapa>0&&etapa<5?"block":"none";
 if(etapa===0){f.textContent="Antes de procurar, vamos conhecer três partes importantes.";c.innerHTML=`<div class="painel-intro"><h2>Conheça o computador</h2><p>Observe três partes que usamos todos os dias.</p><div class="computador-cena">
 <div class="obj">${svg.monitor}<b>MONITOR</b><span>Mostra imagens e informações.</span></div>
 <div class="obj">${svg.teclado}<b>TECLADO</b><span>Tem teclas que usamos para digitar.</span></div>
 <div class="obj">${svg.mouse}<b>MOUSE</b><span>Ajuda a apontar, clicar e escolher.</span></div></div>
 <button class="btn azul" id="continuarM1">JÁ OBSERVEI →</button></div>`;document.getElementById("continuarM1").onclick=()=>avancar();return}
 if(etapa===5){state.m1.concluida=true;save();f.textContent="Você investigou três partes importantes do computador!";c.innerHTML=`<div class="feedback"><div class="check">🎉</div><h2>Missão concluída!</h2><p>Você reconheceu monitor, teclado e mouse.</p><div class="minirow"><span class="tag">🖥️ Monitor</span><span class="tag">⌨️ Teclado</span><span class="tag">🖱️ Mouse</span></div><button class="btn azul" id="fim">VOLTAR ÀS MISSÕES</button></div>`;document.getElementById("fim").onclick=()=>{cards();go("central")};return}
 let e=etapas[etapa];f.textContent=etapa===4?"Último desafio! Observe com atenção.":`Encontre o ${e.alvo}.`;
 c.innerHTML=`<div class="pergunta"><h2>${etapa===4?"Desafio final":"Agora é sua vez!"}</h2><p>Clique no <b>${e.alvo.toUpperCase()}</b>.</p><div class="opcoes">${opcoesEstaveis("m1-"+etapa,e.op).map(k=>`<button class="opcao" data-k="${k}" aria-label="${k}">${svg[k]}<b>${label(k)}</b></button>`).join("")}</div></div>`;
 c.querySelectorAll(".opcao").forEach(b=>b.onclick=()=>responder(b,b.dataset.k,e.alvo));
}
function label(k){return {monitor:"MONITOR",teclado:"TECLADO",mouse:"MOUSE",impressora:"IMPRESSORA",microfone:"MICROFONE",camera:"WEBCAM",caixasom:"CAIXA DE SOM"}[k]}
function responder(btn,k,alvo){if(k===alvo){btn.classList.add("certa");document.getElementById("fala").textContent=`Isso! Este é o ${label(alvo).toLowerCase()}.`;setTimeout(avancar,650)}else{errosEtapa++;state.m1.erros++;save();btn.classList.add("errada");setTimeout(()=>btn.classList.remove("errada"),300);document.getElementById("fala").textContent=errosEtapa===1?"Quase! Observe os objetos e tente outra vez.":errosEtapa===2?dicaAtual():"Vou ajudar: procure o objeto destacado pelo nome da pergunta."}}
function dicaAtual(){if(etapa===1||etapa===4)return"💡 O monitor parece uma tela e mostra imagens.";if(etapa===2)return"💡 O teclado tem muitas teclas com letras e números.";if(etapa===3)return"💡 O mouse cabe na mão e usamos para apontar e clicar.";return"💡 Observe o nome e o formato do objeto."}
function avancar(){delete ordemQuestoes["m1-"+etapa];etapa++;errosEtapa=0;save();render()}
cards();


// ===== MISSÃO 2 — QUEM É QUEM? =====
let missaoAtual=1, etapaM2=state.m2.etapa||0, errosM2=0, etapaM3=state.m3.etapa||0, errosM3=0, etapaM4=state.m4.etapa||0, errosM4=0, etapaM5=state.m5.etapa||0, errosM5=0, etapaM6=state.m6.etapa||0, errosM6=0, etapaM7=state.m7.etapa||0, errosM7=0, etapaM8=state.m8.etapa||0, errosM8=0;
const ordemQuestoes={};
function embaralhar(lista){
  const a=[...lista];
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
function opcoesEstaveis(chave, lista){
  if(!ordemQuestoes[chave]) ordemQuestoes[chave]=embaralhar(lista);
  return ordemQuestoes[chave];
}


const etapasM2=[
 {tipo:"intro"},
 {tipo:"novo", alvo:"impressora", texto:"IMPRESSORA", desc:"Ela coloca no papel textos e imagens do computador."},
 {tipo:"novo", alvo:"caixasom", texto:"CAIXA DE SOM", desc:"Ela permite ouvir sons do computador."},
 {tipo:"novo", alvo:"microfone", texto:"MICROFONE", desc:"Ele capta a nossa voz e outros sons."},
 {tipo:"novo", alvo:"camera", texto:"WEBCAM", desc:"Ela captura imagens para o computador."},
 {tipo:"quiz", alvo:"impressora", op:["camera","impressora","mouse"]},
 {tipo:"quiz", alvo:"caixasom", op:["teclado","caixasom","microfone"]},
 {tipo:"quiz", alvo:"microfone", op:["monitor","camera","microfone"]},
 {tipo:"quiz", alvo:"camera", op:["impressora","camera","teclado"]},
 {tipo:"mistura", alvo:"teclado", op:["caixasom","teclado","camera"]},
 {tipo:"mistura", alvo:"impressora", op:["mouse","impressora","microfone"]},
 {tipo:"fim"}
];

function saveAll(){
 state.m1.etapa=etapa;
 state.m2.etapa=etapaM2;
 state.m3.etapa=etapaM3;
 state.m4.etapa=etapaM4;
 state.m5.etapa=etapaM5;
 state.m6.etapa=etapaM6;
 state.m7.etapa=etapaM7;
 state.m8.etapa=etapaM8;
 localStorage.setItem(KEY,JSON.stringify(state));
}
function startM2(){
 missaoAtual=2; etapaM2=Math.min(state.m2.etapa||0,11); errosM2=0;
 go("missao1");
 document.querySelector("#missao1 .topbar b").textContent="MISSÃO 2 DE 8";
 document.querySelector("#missao1 .topbar small").textContent="Quem é quem?";
 renderM2();
}
const oldStartM1=startM1;
startM1=function(){
 missaoAtual=1;
 document.querySelector("#missao1 .topbar b").textContent="MISSÃO 1 DE 8";
 document.querySelector("#missao1 .topbar small").textContent="Conheça o computador";
 oldStartM1();
};
function dotsM2(){
 let d=document.getElementById("dots"); d.innerHTML="";
 for(let i=0;i<6;i++){let s=document.createElement("span");s.className="dot"+(i<Math.min(Math.floor(etapaM2/2),6)?" ok":"");d.appendChild(s)}
}
function renderM2(){
 dotsM2();
 const c=document.getElementById("conteudo"), f=document.getElementById("fala"), dica=document.getElementById("btnDica");
 const e=etapasM2[etapaM2];
 dica.style.display=(e.tipo==="quiz"||e.tipo==="mistura")?"block":"none";

 if(e.tipo==="intro"){
   f.textContent="Na primeira missão você conheceu três partes. Agora vamos conhecer outras!";
   c.innerHTML=`<div class="painel-intro"><h2>Quem é quem?</h2><p>Vamos ampliar nossa equipe de componentes.</p>
   <div class="minirow"><span class="tag">🖨️ Impressora</span><span class="tag">🔊 Caixa de som</span><span class="tag">🎙️ Microfone</span><span class="tag">📷 Webcam</span></div>
   <button class="btn azul" id="m2next">VAMOS CONHECER →</button></div>`;
   document.getElementById("m2next").onclick=avancarM2; return;
 }
 if(e.tipo==="novo"){
   f.textContent=`Este é o ${e.texto.toLowerCase()}. Observe o formato e o nome.`;
   c.innerHTML=`<div class="painel-intro"><h2>${e.texto}</h2><div class="obj" style="max-width:360px;margin:25px auto">${svg[e.alvo]}<b>${e.texto}</b><span>${e.desc}</span></div>
   <button class="btn azul" id="m2next">ENTENDI →</button></div>`;
   document.getElementById("m2next").onclick=avancarM2; return;
 }
 if(e.tipo==="fim"){
   state.m2.concluida=true; saveAll();
   f.textContent="Muito bem! Agora você conhece ainda mais componentes.";
   c.innerHTML=`<div class="feedback"><div class="check">🎉</div><h2>Missão concluída!</h2>
   <p>Você reconheceu componentes novos e revisou os que já conhecia.</p>
   <div class="minirow"><span class="tag">🖨️ Impressora</span><span class="tag">🔊 Caixa de som</span><span class="tag">🎙️ Microfone</span><span class="tag">📷 Webcam</span></div>
   <button class="btn azul" id="m2fim">VOLTAR ÀS MISSÕES</button></div>`;
   document.getElementById("m2fim").onclick=()=>{cards();go("central")}; return;
 }
 f.textContent=e.tipo==="mistura"?"Agora misturamos componentes novos e conhecidos.":`Encontre: ${label(e.alvo)}.`;
 c.innerHTML=`<div class="pergunta"><h2>${e.tipo==="mistura"?"Desafio misturado":"Quem é quem?"}</h2>
 <p>Clique em <b>${label(e.alvo)}</b>.</p><div class="opcoes">${opcoesEstaveis("m2-"+etapaM2,e.op).map(k=>`<button class="opcao" data-k="${k}">${svg[k]}<b>${label(k)}</b></button>`).join("")}</div></div>`;
 c.querySelectorAll(".opcao").forEach(b=>b.onclick=()=>responderM2(b,b.dataset.k,e.alvo));
}
function responderM2(btn,k,alvo){
 if(k===alvo){
   btn.classList.add("certa"); document.getElementById("fala").textContent=`Isso! Você encontrou: ${label(alvo)}.`;
   setTimeout(avancarM2,650);
 }else{
   errosM2++; state.m2.erros++; saveAll(); btn.classList.add("errada"); setTimeout(()=>btn.classList.remove("errada"),300);
   document.getElementById("fala").textContent=errosM2===1?"Quase! Compare o nome e o desenho. Tente novamente.":dicaM2(alvo);
 }
}
function dicaM2(alvo){
 return {impressora:"💡 A impressora costuma ter uma folha de papel.",caixasom:"💡 A caixa de som tem círculos por onde o som sai.",microfone:"💡 O microfone é usado perto da voz para captar sons.",camera:"💡 A webcam tem uma lente, parecida com um olho.",teclado:"💡 O teclado tem muitas teclas."}[alvo]||"💡 Observe o formato e o nome.";
}
function avancarM2(){delete ordemQuestoes["m2-"+etapaM2];etapaM2++;errosM2=0;saveAll();renderM2()}

// Dica e saída passam a respeitar a missão atual.
document.getElementById("btnDica").onclick=()=>{
 if(missaoAtual===2){state.m2.dicas++;saveAll();let e=etapasM2[etapaM2];document.getElementById("fala").textContent=dicaM2(e.alvo)}
 else {state.m1.dicas++;saveAll();document.getElementById("fala").textContent=dicaAtual()}
};
document.getElementById("voltar").onclick=()=>{
 document.getElementById("modal").classList.remove("open");saveAll();cards();go("central")
};


// ===== MISSÃO 3 — PARA QUE SERVE? =====
const funcoes={
 monitor:{titulo:"MOSTRAR",texto:"Mostra imagens, textos e informações.",icone:"👀"},
 teclado:{titulo:"DIGITAR",texto:"Usamos as teclas para escrever e dar comandos.",icone:"⌨️"},
 mouse:{titulo:"APONTAR E CLICAR",texto:"Move o ponteiro e ajuda a escolher.",icone:"👆"},
 impressora:{titulo:"IMPRIMIR",texto:"Coloca no papel textos e imagens.",icone:"📄"},
 caixasom:{titulo:"OUVIR",texto:"Permite ouvir sons do computador.",icone:"🔊"},
 microfone:{titulo:"CAPTAR SONS",texto:"Capta a voz e outros sons.",icone:"🎙️"},
 camera:{titulo:"CAPTURAR IMAGENS",texto:"Captura imagens para o computador.",icone:"📷"}
};
const etapasM3=[
 {tipo:"intro"},
 {tipo:"dem",alvo:"monitor"},{tipo:"dem",alvo:"teclado"},{tipo:"dem",alvo:"mouse"},
 {tipo:"quiz",alvo:"monitor",op:["monitor","microfone","impressora"],pergunta:"Qual componente MOSTRA imagens e informações?"},
 {tipo:"quiz",alvo:"teclado",op:["camera","teclado","caixasom"],pergunta:"Qual componente usamos para DIGITAR?"},
 {tipo:"quiz",alvo:"mouse",op:["impressora","mouse","monitor"],pergunta:"Qual componente ajuda a APONTAR E CLICAR?"},
 {tipo:"quiz",alvo:"impressora",op:["microfone","impressora","camera"],pergunta:"Qual componente coloca textos e imagens NO PAPEL?"},
 {tipo:"quiz",alvo:"caixasom",op:["teclado","caixasom","mouse"],pergunta:"Qual componente usamos para OUVIR sons?"},
 {tipo:"quiz",alvo:"microfone",op:["camera","monitor","microfone"],pergunta:"Qual componente CAPTA nossa voz?"},
 {tipo:"quiz",alvo:"camera",op:["camera","impressora","teclado"],pergunta:"Qual componente CAPTURA imagens?"},
 {tipo:"fim"}
];
function startM3(){
 missaoAtual=3; etapaM3=Math.min(state.m3.etapa||0,11); errosM3=0;
 go("missao1");
 document.querySelector("#missao1 .topbar b").textContent="MISSÃO 3 DE 8";
 document.querySelector("#missao1 .topbar small").textContent="Para que serve?";
 renderM3();
}
function dotsM3(){
 let d=document.getElementById("dots");d.innerHTML="";
 for(let i=0;i<7;i++){let s=document.createElement("span");s.className="dot"+(i<Math.min(Math.floor(etapaM3/1.7),7)?" ok":"");d.appendChild(s)}
}
function renderM3(){
 dotsM3(); const c=document.getElementById("conteudo"),f=document.getElementById("fala"),btn=document.getElementById("btnDica");
 const e=etapasM3[etapaM3]; btn.style.display=e.tipo==="quiz"?"block":"none";
 if(e.tipo==="intro"){
   f.textContent="Você já sabe quem é quem. Agora vamos descobrir o trabalho de cada componente!";
   c.innerHTML=`<div class="painel-intro"><h2>Para que serve?</h2><p>Um componente pode ter uma função importante. Vamos ligar cada objeto ao que ele faz.</p>
   <div class="minirow"><span class="tag">🖥️ mostrar</span><span class="tag">⌨️ digitar</span><span class="tag">🖱️ apontar</span><span class="tag">🔊 ouvir</span></div>
   <button class="btn azul" id="m3next">VAMOS DESCOBRIR →</button></div>`;
   document.getElementById("m3next").onclick=avancarM3; return;
 }
 if(e.tipo==="dem"){
   let fn=funcoes[e.alvo];
   f.textContent=`Observe: ${label(e.alvo)} → ${fn.titulo}.`;
   c.innerHTML=`<div class="painel-intro"><h2>${label(e.alvo)}</h2><div class="obj" style="max-width:360px;margin:20px auto">${svg[e.alvo]}<b>${label(e.alvo)}</b></div>
   <div class="fala" style="max-width:620px;margin:18px auto"><b>${fn.icone} ${fn.titulo}</b><br>${fn.texto}</div>
   <button class="btn azul" id="m3next">ENTENDI →</button></div>`;
   document.getElementById("m3next").onclick=avancarM3; return;
 }
 if(e.tipo==="fim"){
   state.m3.concluida=true;saveAll();f.textContent="Você relacionou componentes às suas funções!";
   c.innerHTML=`<div class="feedback"><div class="check">🎉</div><h2>Missão concluída!</h2><p>Agora você sabe não apenas quem é quem, mas também para que servem.</p>
   <div class="minirow"><span class="tag">🖥️ mostrar</span><span class="tag">⌨️ digitar</span><span class="tag">🖱️ apontar</span><span class="tag">🎙️ captar sons</span></div>
   <button class="btn azul" id="m3fim">VOLTAR ÀS MISSÕES</button></div>`;
   document.getElementById("m3fim").onclick=()=>{cards();go("central")};return;
 }
 f.textContent="Pense no que cada componente faz.";
 c.innerHTML=`<div class="pergunta"><h2>${e.pergunta}</h2><p>Escolha o componente correto.</p>
 <div class="opcoes">${opcoesEstaveis("m3-"+etapaM3,e.op).map(k=>`<button class="opcao" data-k="${k}">${svg[k]}<b>${label(k)}</b></button>`).join("")}</div></div>`;
 c.querySelectorAll(".opcao").forEach(b=>b.onclick=()=>responderM3(b,b.dataset.k,e.alvo));
}
function responderM3(btn,k,alvo){
 if(k===alvo){btn.classList.add("certa");document.getElementById("fala").textContent=`Isso! ${label(alvo)}: ${funcoes[alvo].texto}`;
 setTimeout(avancarM3,750)}
 else{errosM3++;state.m3.erros++;saveAll();btn.classList.add("errada");setTimeout(()=>btn.classList.remove("errada"),300);
 document.getElementById("fala").textContent=errosM3===1?"Quase! Pense na função descrita e tente novamente.":dicaM3(alvo)}
}
function dicaM3(alvo){
 return {monitor:"💡 É a parte que parece uma tela.",teclado:"💡 Procure o componente que tem muitas teclas.",mouse:"💡 Ele cabe na mão e move o ponteiro.",impressora:"💡 Procure o componente que usa papel.",caixasom:"💡 Procure onde o som sai.",microfone:"💡 É usado perto da voz para captar sons.",camera:"💡 Procure a lente que captura imagens."}[alvo];
}
function avancarM3(){delete ordemQuestoes["m3-"+etapaM3];etapaM3++;errosM3=0;saveAll();renderM3()}
const dicaHandler=document.getElementById("btnDica").onclick;
document.getElementById("btnDica").onclick=()=>{
 if(missaoAtual===3){state.m3.dicas++;saveAll();let e=etapasM3[etapaM3];document.getElementById("fala").textContent=dicaM3(e.alvo)}
 else dicaHandler();
};


// ===== MISSÃO 4 — MONTE O COMPUTADOR =====
const etapasM4=[
 {tipo:"intro"},
 {tipo:"montar",pecas:["monitor","teclado","mouse"]},
 {tipo:"montar",pecas:["monitor","teclado","mouse","caixasom"]},
 {tipo:"montar",pecas:["monitor","teclado","mouse","camera"]},
 {tipo:"fim"}
];
let colocadasM4=new Set(), arrastoM4=null;

function startM4(){
 missaoAtual=4; etapaM4=Math.min(state.m4.etapa||0,4); errosM4=0; colocadasM4=new Set();
 go("missao1");
 document.querySelector("#missao1 .topbar b").textContent="MISSÃO 4 DE 8";
 document.querySelector("#missao1 .topbar small").textContent="Monte o computador";
 renderM4();
}
function dotsM4(){
 let d=document.getElementById("dots");d.innerHTML="";
 for(let i=0;i<4;i++){let s=document.createElement("span");s.className="dot"+(i<Math.min(etapaM4,4)?" ok":"");d.appendChild(s)}
}
function renderM4(){
 dotsM4(); const c=document.getElementById("conteudo"),f=document.getElementById("fala"),btn=document.getElementById("btnDica");
 const e=etapasM4[etapaM4]; btn.style.display=e.tipo==="montar"?"block":"none";
 if(e.tipo==="intro"){
  f.textContent="Agora vamos montar uma estação de computador. Arraste cada peça até o lugar com o mesmo nome.";
  c.innerHTML=`<div class="painel-intro"><h2>Monte o computador</h2><p>Segure a peça, arraste e solte na área correta.</p>
  <div class="minirow"><span class="tag">1. Segure</span><span class="tag">2. Arraste</span><span class="tag">3. Solte</span></div>
  <p style="color:#667280">As áreas são grandes de propósito. Aqui o importante é reconhecer onde cada componente pertence.</p>
  <button class="btn azul" id="m4next">VAMOS MONTAR →</button></div>`;
  document.getElementById("m4next").onclick=avancarM4; return;
 }
 if(e.tipo==="fim"){
  state.m4.concluida=true;saveAll();f.textContent="Você montou a estação! Cada componente encontrou seu lugar.";
  c.innerHTML=`<div class="feedback"><div class="check">🖥️</div><h2>Computador montado!</h2>
  <p>Você reconheceu os componentes e colocou cada um no lugar indicado.</p>
  <button class="btn azul" id="m4fim">VOLTAR ÀS MISSÕES</button></div>`;
  document.getElementById("m4fim").onclick=()=>{cards();go("central")};return;
 }
 colocadasM4=new Set();
 f.textContent=etapaM4===1?"Comece com três peças conhecidas.":etapaM4===2?"Muito bem. Agora entrou uma caixa de som.":"Última montagem: agora temos também uma webcam.";
 const pecas=embaralhar(e.pecas);
 c.innerHTML=`<div class="pergunta"><h2>${etapaM4===1?"Montagem inicial":etapaM4===2?"Montagem com som":"Montagem com webcam"}</h2>
 <p>Arraste as peças para as áreas com o mesmo nome.</p>
 <div class="m4-bancada">
   <div class="m4-pecas">${pecas.map(k=>`<div class="m4-peca" draggable="true" data-k="${k}" tabindex="0" aria-label="Componente para arrastar">${svg[k]}</div>`).join("")}</div>
   <div class="m4-mesa">${e.pecas.map(k=>`<div class="m4-slot" data-k="${k}"><span>${label(k)}</span></div>`).join("")}</div>
 </div></div>`;
 prepararDragM4();
}
function prepararDragM4(){
 document.querySelectorAll(".m4-peca").forEach(p=>{
   p.addEventListener("dragstart",ev=>{arrastoM4=p.dataset.k;ev.dataTransfer.setData("text/plain",arrastoM4);p.classList.add("arrastando")});
   p.addEventListener("dragend",()=>p.classList.remove("arrastando"));
   p.addEventListener("click",()=>{arrastoM4=p.dataset.k;document.querySelectorAll(".m4-peca").forEach(x=>x.classList.remove("selecionada"));p.classList.add("selecionada");document.getElementById("fala").textContent="Peça selecionada. Agora clique na área que corresponde a este componente."});
 });
 document.querySelectorAll(".m4-slot").forEach(s=>{
   s.addEventListener("dragover",ev=>{ev.preventDefault();s.classList.add("sobre")});
   s.addEventListener("dragleave",()=>s.classList.remove("sobre"));
   s.addEventListener("drop",ev=>{ev.preventDefault();s.classList.remove("sobre");tentarM4(ev.dataTransfer.getData("text/plain"),s)});
   s.addEventListener("click",()=>{if(arrastoM4)tentarM4(arrastoM4,s)});
 });
}
function tentarM4(k,slot){
 if(!k||colocadasM4.has(k))return;
 if(k===slot.dataset.k){
   colocadasM4.add(k);slot.classList.add("ocupado");slot.innerHTML=`${svg[k]}<b>${label(k)}</b>`;
   const p=document.querySelector(`.m4-peca[data-k="${k}"]`);if(p)p.classList.add("usada");
   arrastoM4=null;document.getElementById("fala").textContent=`Isso! ${label(k)} está no lugar certo.`;
   if(colocadasM4.size===etapasM4[etapaM4].pecas.length)setTimeout(avancarM4,850);
 }else{
   errosM4++;state.m4.erros++;saveAll();slot.classList.add("erro-slot");setTimeout(()=>slot.classList.remove("erro-slot"),350);
   document.getElementById("fala").textContent=errosM4===1?"Quase! Compare o nome da peça com o nome da área.":dicaM4(k);
 }
}
function dicaM4(k){
 return `💡 Você está levando ${label(k)}. Procure a área escrita “${label(k)}”.`;
}
function avancarM4(){etapaM4++;errosM4=0;colocadasM4=new Set();saveAll();renderM4()}
const dicaHandler2=document.getElementById("btnDica").onclick;
document.getElementById("btnDica").onclick=()=>{
 if(missaoAtual===4){state.m4.dicas++;saveAll();document.getElementById("fala").textContent=arrastoM4?dicaM4(arrastoM4):"💡 Escolha uma peça e procure a área que tem o mesmo nome."}
 else dicaHandler2();
};


// ===== MISSÃO 5 — POSSO TOCAR? =====
const itensM5={
 monitor:{nome:"Monitor",visual:()=>svg.monitor},
 teclado:{nome:"Teclado",visual:()=>svg.teclado},
 mouse:{nome:"Mouse",visual:()=>svg.mouse},
 impressora:{nome:"Impressora",visual:()=>svg.impressora},
 caixasom:{nome:"Caixa de som",visual:()=>svg.caixasom},
 microfone:{nome:"Microfone",visual:()=>svg.microfone},
 camera:{nome:"Webcam",visual:()=>svg.camera},
 lapis:{nome:"Lápis",visual:()=>`<div class="m5-emoji">✏️</div>`},
 livro:{nome:"Livro",visual:()=>`<div class="m5-emoji">📘</div>`},
 cadeira:{nome:"Cadeira",visual:()=>`<div class="m5-emoji">🪑</div>`}
};
const etapasM5=[
 {tipo:"intro"},
 {tipo:"descoberta"},
 {tipo:"quiz",alvo:"monitor",op:["monitor","livro","lapis"],pergunta:"Qual destes é uma PARTE FÍSICA do computador?"},
 {tipo:"quiz",alvo:"teclado",op:["cadeira","teclado","livro"],pergunta:"Qual destes pertence fisicamente ao computador?"},
 {tipo:"quiz",alvo:"mouse",op:["lapis","mouse","cadeira"],pergunta:"Qual destes componentes podemos tocar e usar no computador?"},
 {tipo:"quiz",alvo:"impressora",op:["livro","impressora","lapis"],pergunta:"Qual destes é um equipamento físico usado com o computador?"},
 {tipo:"conceito"},
 {tipo:"quiz",alvo:"camera",op:["camera","livro","cadeira"],pergunta:"Qual destes é HARDWARE?"},
 {tipo:"quiz",alvo:"microfone",op:["lapis","microfone","livro"],pergunta:"Qual destes também é HARDWARE?"},
 {tipo:"fim"}
];
function startM5(){
 missaoAtual=5;etapaM5=Math.min(state.m5.etapa||0,9);errosM5=0;
 go("missao1");
 document.querySelector("#missao1 .topbar b").textContent="MISSÃO 5 DE 8";
 document.querySelector("#missao1 .topbar small").textContent="Posso tocar?";
 renderM5();
}
function dotsM5(){
 let d=document.getElementById("dots");d.innerHTML="";
 for(let i=0;i<6;i++){let s=document.createElement("span");s.className="dot"+(i<Math.min(Math.floor(etapaM5/1.5),6)?" ok":"");d.appendChild(s)}
}
function renderM5(){
 dotsM5();const c=document.getElementById("conteudo"),f=document.getElementById("fala"),btn=document.getElementById("btnDica");
 const e=etapasM5[etapaM5];btn.style.display=e.tipo==="quiz"?"block":"none";
 if(e.tipo==="intro"){
  f.textContent="Vamos investigar uma nova ideia: existem partes do computador que são objetos de verdade.";
  c.innerHTML=`<div class="painel-intro"><h2>Posso tocar?</h2>
  <p>Olhe para um computador de verdade. Há partes que ocupam espaço e que podemos tocar.</p>
  <div class="m5-conceito"><span>👀 POSSO VER</span><span>✋ POSSO TOCAR</span><span>📦 OCUPA ESPAÇO</span></div>
  <button class="btn azul" id="m5next">VAMOS INVESTIGAR →</button></div>`;
  document.getElementById("m5next").onclick=avancarM5;return;
 }
 if(e.tipo==="descoberta"){
  f.textContent="Monitor, teclado e mouse são objetos físicos. Eles fazem parte do computador.";
  c.innerHTML=`<div class="painel-intro"><h2>Partes físicas</h2>
  <div class="opcoes">${["monitor","teclado","mouse"].map(k=>`<div class="opcao">${svg[k]}<b>${label(k)}</b></div>`).join("")}</div>
  <p>Podemos ver, tocar e mover esses objetos. Eles são <b>partes físicas</b>.</p>
  <button class="btn azul" id="m5next">ENTENDI →</button></div>`;
  document.getElementById("m5next").onclick=avancarM5;return;
 }
 if(e.tipo==="conceito"){
  f.textContent="Descoberta importante! As partes físicas do computador recebem um nome: HARDWARE.";
  c.innerHTML=`<div class="feedback"><div class="check">🔎</div><h2>Uma palavra nova!</h2>
  <div class="m5-hardware">HARDWARE</div><p><b>Hardware</b> é o nome que usamos para as partes físicas do computador e seus equipamentos.</p>
  <p>Monitor, teclado, mouse, impressora, caixa de som, microfone e webcam são exemplos.</p>
  <button class="btn azul" id="m5next">CONTINUAR →</button></div>`;
  document.getElementById("m5next").onclick=avancarM5;return;
 }
 if(e.tipo==="fim"){
  state.m5.concluida=true;saveAll();f.textContent="Muito bem! Você descobriu o que chamamos de hardware.";
  c.innerHTML=`<div class="feedback"><div class="check">🖥️</div><h2>Missão concluída!</h2>
  <p><b>Hardware</b> são as partes físicas do computador e seus equipamentos.</p>
  <p class="m5-frase">Se é uma parte física do computador, pode ser hardware.</p>
  <button class="btn azul" id="m5fim">VOLTAR ÀS MISSÕES</button></div>`;
  document.getElementById("m5fim").onclick=()=>{cards();go("central")};return;
 }
 f.textContent=etapaM5<7?"Observe os objetos e pense: qual deles é uma parte física do computador?":"Agora use a palavra nova: hardware.";
 c.innerHTML=`<div class="pergunta"><h2>${e.pergunta}</h2><p>Escolha uma opção.</p>
 <div class="opcoes">${opcoesEstaveis("m5-"+etapaM5,e.op).map(k=>`<button class="opcao m5-op" data-k="${k}">${itensM5[k].visual()}<b>${itensM5[k].nome}</b></button>`).join("")}</div></div>`;
 c.querySelectorAll(".m5-op").forEach(b=>b.onclick=()=>responderM5(b,b.dataset.k,e.alvo));
}
function responderM5(btn,k,alvo){
 if(k===alvo){btn.classList.add("certa");document.getElementById("fala").textContent=etapaM5<7?"Isso! É uma parte física usada com o computador.":"Isso! Esse componente é hardware.";setTimeout(avancarM5,750)}
 else{errosM5++;state.m5.erros++;saveAll();btn.classList.add("errada");setTimeout(()=>btn.classList.remove("errada"),300);
 document.getElementById("fala").textContent=errosM5===1?"Quase! Procure uma parte física que pertence ao computador.":dicaM5(alvo)}
}
function dicaM5(alvo){
 return `💡 Procure ${itensM5[alvo].nome}. É um componente físico usado com o computador.`;
}
function avancarM5(){delete ordemQuestoes["m5-"+etapaM5];etapaM5++;errosM5=0;saveAll();renderM5()}
const dicaHandler3=document.getElementById("btnDica").onclick;
document.getElementById("btnDica").onclick=()=>{
 if(missaoAtual===5){state.m5.dicas++;saveAll();let e=etapasM5[etapaM5];document.getElementById("fala").textContent=dicaM5(e.alvo)}
 else dicaHandler3();
};


// ===== MISSÃO 6 — E O PROGRAMA? =====
const itensM6={
 desenho:{nome:"Programa de desenho",icone:"🎨",descricao:"Ajuda a criar desenhos na tela."},
 escrita:{nome:"Programa de escrita",icone:"📝",descricao:"Ajuda a escrever textos."},
 jogo:{nome:"Jogo",icone:"🎮",descricao:"Um programa feito para jogar."},
 musica:{nome:"Programa de música",icone:"🎵",descricao:"Pode tocar músicas e sons."},
 monitor:{nome:"Monitor",icone:"🖥️",fisico:true},
 teclado:{nome:"Teclado",icone:"⌨️",fisico:true},
 mouse:{nome:"Mouse",icone:"🖱️",fisico:true},
 impressora:{nome:"Impressora",icone:"🖨️",fisico:true}
};
const etapasM6=[
 {tipo:"intro"},
 {tipo:"descoberta"},
 {tipo:"quiz",alvo:"desenho",op:["desenho","monitor","mouse"],pergunta:"Qual opção é usada NA TELA para fazer desenhos?"},
 {tipo:"quiz",alvo:"escrita",op:["teclado","escrita","impressora"],pergunta:"Qual opção é um PROGRAMA para escrever textos?"},
 {tipo:"quiz",alvo:"jogo",op:["mouse","monitor","jogo"],pergunta:"Qual destas opções é um programa que usamos para jogar?"},
 {tipo:"quiz",alvo:"musica",op:["musica","teclado","impressora"],pergunta:"Qual opção pode ser um PROGRAMA para ouvir música?"},
 {tipo:"conceito"},
 {tipo:"quiz",alvo:"desenho",op:["monitor","desenho","mouse"],pergunta:"Qual destes é SOFTWARE?"},
 {tipo:"quiz",alvo:"jogo",op:["teclado","impressora","jogo"],pergunta:"Qual destes também é SOFTWARE?"},
 {tipo:"fim"}
];
function cardM6(k){
 const x=itensM6[k];
 return `<div class="m6-icon">${x.icone}</div><b>${x.nome}</b>`;
}
function startM6(){
 missaoAtual=6;etapaM6=Math.min(state.m6.etapa||0,9);errosM6=0;
 go("missao1");
 document.querySelector("#missao1 .topbar b").textContent="MISSÃO 6 DE 8";
 document.querySelector("#missao1 .topbar small").textContent="E o programa?";
 renderM6();
}
function dotsM6(){
 let d=document.getElementById("dots");d.innerHTML="";
 for(let i=0;i<6;i++){let s=document.createElement("span");s.className="dot"+(i<Math.min(Math.floor(etapaM6/1.5),6)?" ok":"");d.appendChild(s)}
}
function renderM6(){
 dotsM6();const c=document.getElementById("conteudo"),f=document.getElementById("fala"),btn=document.getElementById("btnDica");
 const e=etapasM6[etapaM6];btn.style.display=e.tipo==="quiz"?"block":"none";
 if(e.tipo==="intro"){
   f.textContent="Na missão anterior, descobrimos as partes físicas. Mas o computador também usa programas.";
   c.innerHTML=`<div class="painel-intro"><h2>E o programa?</h2>
   <p>Quando desenhamos, escrevemos, jogamos ou ouvimos música no computador, usamos programas.</p>
   <div class="m6-acoes"><span>🎨 DESENHAR</span><span>📝 ESCREVER</span><span>🎮 JOGAR</span><span>🎵 OUVIR</span></div>
   <button class="btn azul" id="m6next">VAMOS INVESTIGAR →</button></div>`;
   document.getElementById("m6next").onclick=avancarM6;return;
 }
 if(e.tipo==="descoberta"){
   f.textContent="Um programa aparece e funciona na tela. Ele não é uma peça como o monitor, o teclado ou o mouse.";
   c.innerHTML=`<div class="painel-intro"><h2>Programas ajudam o computador a fazer tarefas</h2>
   <div class="opcoes">${["desenho","escrita","jogo","musica"].map(k=>`<div class="opcao">${cardM6(k)}</div>`).join("")}</div>
   <p>Esses são exemplos de <b>programas</b>. Eles são diferentes das peças físicas.</p>
   <button class="btn azul" id="m6next">ENTENDI →</button></div>`;
   document.getElementById("m6next").onclick=avancarM6;return;
 }
 if(e.tipo==="conceito"){
   f.textContent="Descoberta importante! Os programas recebem um nome: SOFTWARE.";
   c.innerHTML=`<div class="feedback"><div class="check">💡</div><h2>Uma palavra nova!</h2>
   <div class="m6-software">SOFTWARE</div>
   <p><b>Software</b> é o nome que usamos para os programas e instruções que o computador executa.</p>
   <p>Programa de desenho, programa de escrita, jogos e programas de música são exemplos.</p>
   <button class="btn azul" id="m6next">CONTINUAR →</button></div>`;
   document.getElementById("m6next").onclick=avancarM6;return;
 }
 if(e.tipo==="fim"){
   state.m6.concluida=true;saveAll();f.textContent="Muito bem! Você descobriu o que chamamos de software.";
   c.innerHTML=`<div class="feedback"><div class="check">💻</div><h2>Missão concluída!</h2>
   <p><b>Software</b> é o nome dado aos programas e instruções executados pelo computador.</p>
   <p class="m6-frase">Hardware é a parte física. Software são os programas. Na próxima missão vamos comparar os dois.</p>
   <button class="btn azul" id="m6fim">VOLTAR ÀS MISSÕES</button></div>`;
   document.getElementById("m6fim").onclick=()=>{cards();go("central")};return;
 }
 f.textContent=etapaM6<7?"Pense no que usamos dentro do computador para realizar essa tarefa.":"Agora use a palavra nova: software.";
 c.innerHTML=`<div class="pergunta"><h2>${e.pergunta}</h2><p>Escolha uma opção.</p>
 <div class="opcoes">${opcoesEstaveis("m6-"+etapaM6,e.op).map(k=>`<button class="opcao m6-op" data-k="${k}">${cardM6(k)}</button>`).join("")}</div></div>`;
 c.querySelectorAll(".m6-op").forEach(b=>b.onclick=()=>responderM6(b,b.dataset.k,e.alvo));
}
function responderM6(btn,k,alvo){
 if(k===alvo){btn.classList.add("certa");document.getElementById("fala").textContent=etapaM6<7?`Isso! ${itensM6[alvo].nome} é um programa.`:"Isso! Esse é um exemplo de software.";setTimeout(avancarM6,750)}
 else{errosM6++;state.m6.erros++;saveAll();btn.classList.add("errada");setTimeout(()=>btn.classList.remove("errada"),300);
 document.getElementById("fala").textContent=errosM6===1?"Quase! Pense: estamos procurando uma peça física ou um programa?":dicaM6(alvo)}
}
function dicaM6(alvo){
 return `💡 Procure ${itensM6[alvo].nome}. Ele não é uma peça física: é um programa.`;
}
function avancarM6(){delete ordemQuestoes["m6-"+etapaM6];etapaM6++;errosM6=0;saveAll();renderM6()}
const dicaHandler4=document.getElementById("btnDica").onclick;
document.getElementById("btnDica").onclick=()=>{
 if(missaoAtual===6){state.m6.dicas++;saveAll();let e=etapasM6[etapaM6];document.getElementById("fala").textContent=dicaM6(e.alvo)}
 else dicaHandler4();
};


// ===== MISSÃO 7 — HARDWARE OU SOFTWARE? =====
const itensM7={
 monitor:{nome:"Monitor",tipo:"hardware",visual:()=>svg.monitor},
 teclado:{nome:"Teclado",tipo:"hardware",visual:()=>svg.teclado},
 mouse:{nome:"Mouse",tipo:"hardware",visual:()=>svg.mouse},
 impressora:{nome:"Impressora",tipo:"hardware",visual:()=>svg.impressora},
 microfone:{nome:"Microfone",tipo:"hardware",visual:()=>svg.microfone},
 camera:{nome:"Webcam",tipo:"hardware",visual:()=>svg.camera},
 desenho:{nome:"Programa de desenho",tipo:"software",visual:()=>`<div class="m7-emoji">🎨</div>`},
 escrita:{nome:"Programa de escrita",tipo:"software",visual:()=>`<div class="m7-emoji">📝</div>`},
 jogo:{nome:"Jogo",tipo:"software",visual:()=>`<div class="m7-emoji">🎮</div>`},
 musica:{nome:"Programa de música",tipo:"software",visual:()=>`<div class="m7-emoji">🎵</div>`}
};
const desafiosM7=["monitor","desenho","teclado","jogo","mouse","escrita","impressora","musica","camera","microfone"];
const etapasM7=[{tipo:"intro"},{tipo:"treino"},...desafiosM7.map(k=>({tipo:"classificar",alvo:k})),{tipo:"fim"}];

function startM7(){
 missaoAtual=7;etapaM7=Math.min(state.m7.etapa||0,etapasM7.length-1);errosM7=0;
 go("missao1");
 document.querySelector("#missao1 .topbar b").textContent="MISSÃO 7 DE 8";
 document.querySelector("#missao1 .topbar small").textContent="Hardware ou Software?";
 renderM7();
}
function dotsM7(){
 let d=document.getElementById("dots");d.innerHTML="";
 for(let i=0;i<10;i++){let s=document.createElement("span");s.className="dot"+(i<Math.max(0,etapaM7-1)?" ok":"");d.appendChild(s)}
}
function renderM7(){
 dotsM7();const c=document.getElementById("conteudo"),f=document.getElementById("fala"),btn=document.getElementById("btnDica");
 const e=etapasM7[etapaM7];btn.style.display=e.tipo==="classificar"?"block":"none";
 if(e.tipo==="intro"){
   f.textContent="Você já conhece hardware e software. Agora vamos comparar os dois.";
   c.innerHTML=`<div class="painel-intro"><h2>Hardware ou Software?</h2>
   <div class="m7-duas">
    <div class="m7-caixa hard"><strong>🖥️ HARDWARE</strong><p>Partes físicas e equipamentos.</p><small>Podemos tocar.</small></div>
    <div class="m7-caixa soft"><strong>💻 SOFTWARE</strong><p>Programas e instruções.</p><small>O computador executa.</small></div>
   </div><button class="btn azul" id="m7next">VAMOS CLASSIFICAR →</button></div>`;
   document.getElementById("m7next").onclick=avancarM7;return;
 }
 if(e.tipo==="treino"){
   f.textContent="Primeiro, veja dois exemplos lado a lado.";
   c.innerHTML=`<div class="painel-intro"><h2>Compare</h2><div class="m7-duas">
   <div class="m7-caixa hard">${svg.monitor}<b>Monitor</b><span>HARDWARE</span></div>
   <div class="m7-caixa soft"><div class="m7-emoji">🎨</div><b>Programa de desenho</b><span>SOFTWARE</span></div>
   </div><p>Um é uma parte física. O outro é um programa.</p>
   <button class="btn azul" id="m7next">ENTENDI →</button></div>`;
   document.getElementById("m7next").onclick=avancarM7;return;
 }
 if(e.tipo==="fim"){
   state.m7.concluida=true;saveAll();f.textContent="Excelente investigação! Você classificou partes físicas e programas.";
   c.innerHTML=`<div class="feedback"><div class="check">🔎</div><h2>Missão concluída!</h2>
   <div class="m7-resumo"><span>🖥️ HARDWARE = partes físicas</span><span>💻 SOFTWARE = programas</span></div>
   <p>Agora você consegue observar um exemplo e decidir a qual grupo ele pertence.</p>
   <button class="btn azul" id="m7fim">VOLTAR ÀS MISSÕES</button></div>`;
   document.getElementById("m7fim").onclick=()=>{cards();go("central")};return;
 }
 const item=itensM7[e.alvo];
 f.textContent="Observe o exemplo. Ele é hardware ou software?";
 c.innerHTML=`<div class="pergunta"><h2>Onde ${item.nome} pertence?</h2>
 <div class="m7-alvo">${item.visual()}<b>${item.nome}</b></div>
 <div class="m7-botoes">
   <button class="m7-escolha hard" data-tipo="hardware">🖥️<b>HARDWARE</b><small>parte física</small></button>
   <button class="m7-escolha soft" data-tipo="software">💻<b>SOFTWARE</b><small>programa</small></button>
 </div></div>`;
 c.querySelectorAll(".m7-escolha").forEach(b=>b.onclick=()=>responderM7(b,b.dataset.tipo,item));
}
function responderM7(btn,tipo,item){
 if(tipo===item.tipo){
   btn.classList.add("certa");document.getElementById("fala").textContent=item.tipo==="hardware"?`Isso! ${item.nome} é uma parte física: hardware.`:`Isso! ${item.nome} é um programa: software.`;
   setTimeout(avancarM7,800);
 }else{
   errosM7++;state.m7.erros++;saveAll();btn.classList.add("errada");setTimeout(()=>btn.classList.remove("errada"),300);
   document.getElementById("fala").textContent=errosM7===1?"Quase! Pergunte a si mesmo: é uma parte física ou é um programa?":dicaM7(item);
 }
}
function dicaM7(item){
 return item.tipo==="hardware"?`💡 ${item.nome} é um objeto físico usado com o computador.`:`💡 ${item.nome} é um programa executado pelo computador.`;
}
function avancarM7(){etapaM7++;errosM7=0;saveAll();renderM7()}
const dicaHandler5=document.getElementById("btnDica").onclick;
document.getElementById("btnDica").onclick=()=>{
 if(missaoAtual===7){state.m7.dicas++;saveAll();let e=etapasM7[etapaM7];document.getElementById("fala").textContent=dicaM7(itensM7[e.alvo])}
 else dicaHandler5();
};


// ===== MISSÃO 8 — DESAFIO DO EXPLORADOR =====
const bancoM8=[
 {tipo:"componente",pergunta:"Qual componente usamos para DIGITAR?",alvo:"teclado",op:["teclado","mouse","monitor"]},
 {tipo:"componente",pergunta:"Qual componente ajuda a APONTAR E CLICAR?",alvo:"mouse",op:["monitor","mouse","impressora"]},
 {tipo:"componente",pergunta:"Qual componente MOSTRA imagens e informações?",alvo:"monitor",op:["camera","teclado","monitor"]},
 {tipo:"componente",pergunta:"Qual equipamento coloca textos e imagens NO PAPEL?",alvo:"impressora",op:["impressora","microfone","mouse"]},
 {tipo:"componente",pergunta:"Qual componente CAPTA nossa voz?",alvo:"microfone",op:["camera","microfone","caixasom"]},
 {tipo:"componente",pergunta:"Qual componente CAPTURA imagens?",alvo:"camera",op:["camera","teclado","impressora"]},
 {tipo:"classe",pergunta:"MONITOR é...",alvo:"hardware",item:"monitor"},
 {tipo:"classe",pergunta:"PROGRAMA DE DESENHO é...",alvo:"software",item:"desenho"},
 {tipo:"classe",pergunta:"TECLADO é...",alvo:"hardware",item:"teclado"},
 {tipo:"classe",pergunta:"JOGO no computador é...",alvo:"software",item:"jogo"},
 {tipo:"classe",pergunta:"WEBCAM é...",alvo:"hardware",item:"camera"},
 {tipo:"classe",pergunta:"PROGRAMA DE ESCRITA é...",alvo:"software",item:"escrita"}
];
let rodadaM8=[];

function montarRodadaM8(){
 let ids=[...Array(bancoM8.length).keys()];
 embaralhar(ids);
 return ids.slice(0,10);
}
function startM8(){
 missaoAtual=8; errosM8=0;
 if(!state.m8.rodada || state.m8.rodada.length!==10 || state.m8.etapa>=11){
   state.m8.rodada=montarRodadaM8(); state.m8.etapa=0; saveAll();
 }
 rodadaM8=state.m8.rodada; etapaM8=state.m8.etapa||0;
 go("missao1");
 document.querySelector("#missao1 .topbar b").textContent="MISSÃO 8 DE 8";
 document.querySelector("#missao1 .topbar small").textContent="Desafio do Explorador";
 renderM8();
}
function dotsM8(){
 let d=document.getElementById("dots");d.innerHTML="";
 for(let i=0;i<10;i++){let s=document.createElement("span");s.className="dot"+(i<Math.max(0,etapaM8-1)?" ok":"");d.appendChild(s)}
}
function renderM8(){
 dotsM8();const c=document.getElementById("conteudo"),f=document.getElementById("fala"),btn=document.getElementById("btnDica");
 btn.style.display=etapaM8>0&&etapaM8<=10?"block":"none";
 if(etapaM8===0){
   f.textContent="Chegou o desafio final! Vamos misturar tudo o que você descobriu.";
   c.innerHTML=`<div class="painel-intro"><h2>🚀 Desafio do Explorador</h2>
   <p>Serão <b>10 descobertas</b> sobre componentes, funções, hardware e software.</p>
   <div class="m8-regras"><span>🔎 Observe</span><span>🧠 Pense</span><span>💡 Use DICA se precisar</span></div>
   <p>Não há nota nem corrida. O objetivo é mostrar o que você aprendeu e continuar investigando.</p>
   <button class="btn azul" id="m8next">INICIAR DESAFIO →</button></div>`;
   document.getElementById("m8next").onclick=avancarM8;return;
 }
 if(etapaM8===11){
   state.m8.concluida=true;saveAll();f.textContent="Missão cumprida! Você concluiu a exploração do computador.";
   c.innerHTML=`<div class="feedback m8-final"><div class="check">🚀</div><h2>Explorador do Computador!</h2>
   <p>Você investigou componentes, funções, hardware e software.</p>
   <div class="m8-selos"><span>🖥️ COMPONENTES</span><span>🔧 FUNÇÕES</span><span>✋ HARDWARE</span><span>💻 SOFTWARE</span></div>
   <p><b>Pequenos passos, grandes descobertas.</b></p>
   <button class="btn azul" id="m8fim">VOLTAR ÀS MISSÕES</button></div>`;
   document.getElementById("m8fim").onclick=()=>{cards();go("central")};return;
 }
 const q=bancoM8[rodadaM8[etapaM8-1]];
 f.textContent=`Desafio ${etapaM8} de 10. Observe, pense e escolha.`;
 if(q.tipo==="componente"){
   c.innerHTML=`<div class="pergunta"><h2>${q.pergunta}</h2><p>Escolha o componente correto.</p>
   <div class="opcoes">${opcoesEstaveis("m8-"+etapaM8,q.op).map(k=>`<button class="opcao m8-op" data-k="${k}">${svg[k]}<b>${label(k)}</b></button>`).join("")}</div></div>`;
   c.querySelectorAll(".m8-op").forEach(b=>b.onclick=()=>responderM8(b,b.dataset.k,q));
 }else{
   let item=itensM7[q.item];
   c.innerHTML=`<div class="pergunta"><h2>${q.pergunta}</h2>
   <div class="m7-alvo">${item.visual()}<b>${item.nome}</b></div>
   <div class="m7-botoes">
    <button class="m7-escolha hard m8-classe" data-k="hardware">🖥️<b>HARDWARE</b><small>parte física</small></button>
    <button class="m7-escolha soft m8-classe" data-k="software">💻<b>SOFTWARE</b><small>programa</small></button>
   </div></div>`;
   c.querySelectorAll(".m8-classe").forEach(b=>b.onclick=()=>responderM8(b,b.dataset.k,q));
 }
}
function responderM8(btn,k,q){
 if(k===q.alvo){
   btn.classList.add("certa");
   document.getElementById("fala").textContent="Isso! Boa investigação.";
   setTimeout(avancarM8,700);
 }else{
   errosM8++;state.m8.erros++;saveAll();btn.classList.add("errada");setTimeout(()=>btn.classList.remove("errada"),300);
   document.getElementById("fala").textContent=errosM8===1?"Quase! Observe novamente e pense no que você aprendeu.":dicaM8(q);
 }
}
function dicaM8(q){
 if(q.tipo==="componente") return `💡 Pense na função pedida. Procure o componente que usamos para isso.`;
 return q.alvo==="hardware"?"💡 Pergunte: é uma parte física que podemos tocar?":"💡 Pergunte: é um programa que o computador executa?";
}
function avancarM8(){
 if(etapaM8>0) delete ordemQuestoes["m8-"+etapaM8];
 etapaM8++;errosM8=0;state.m8.etapa=etapaM8;saveAll();renderM8();
}
const dicaHandler6=document.getElementById("btnDica").onclick;
document.getElementById("btnDica").onclick=()=>{
 if(missaoAtual===8){
   state.m8.dicas++;saveAll();
   const q=bancoM8[rodadaM8[etapaM8-1]];
   document.getElementById("fala").textContent=dicaM8(q);
 } else dicaHandler6();
};


// ===== ITEM 4.7 — PERSISTÊNCIA LOCAL E TELEMETRIA =====
const TELEMETRY_KEY="labpc_missao_computador_telemetria_v1";
let telemetry=JSON.parse(localStorage.getItem(TELEMETRY_KEY)||'{"version":1,"sessions":[],"events":[]}');
if(!Array.isArray(telemetry.sessions)) telemetry.sessions=[];
if(!Array.isArray(telemetry.events)) telemetry.events=[];
let activeSession=null, lastInputType="unknown", telemetryCompletion={};

function uid(prefix){
  return prefix+"_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,8);
}
function saveTelemetry(){
  localStorage.setItem(TELEMETRY_KEY,JSON.stringify(telemetry));
}
function inputKind(e){
  if(e && e.pointerType) return e.pointerType==="touch"?"touch":e.pointerType==="pen"?"pen":"mouse";
  return "unknown";
}
document.addEventListener("pointerdown",e=>{lastInputType=inputKind(e)},true);

function logEvent(event,data={}){
  if(!activeSession && !data.allowWithoutSession) return;
  telemetry.events.push({
    timestamp:new Date().toISOString(),
    sessionId:activeSession?activeSession.id:null,
    mission:activeSession?activeSession.mission:(data.mission||null),
    event,
    challenge:data.challenge??currentChallenge(),
    concept:data.concept??null,
    answer:data.answer??null,
    correct:data.correct??null,
    inputType:data.inputType||lastInputType||"unknown",
    elapsedMs:activeSession?Math.max(0,Date.now()-activeSession.startedAtMs):null
  });
  if(telemetry.events.length>2500) telemetry.events=telemetry.events.slice(-2500);
  saveTelemetry();
}
function currentChallenge(){
  if(missaoAtual===1) return etapa;
  if(missaoAtual===2) return etapaM2;
  if(missaoAtual===3) return etapaM3;
  if(missaoAtual===4) return etapaM4;
  if(missaoAtual===5) return etapaM5;
  if(missaoAtual===6) return etapaM6;
  if(missaoAtual===7) return etapaM7;
  if(missaoAtual===8) return etapaM8;
  return null;
}
function startTelemetrySession(mission){
  if(activeSession && !activeSession.endedAt) endTelemetrySession("nova_missao");
  const s={id:uid("sess"),mission,startedAt:new Date().toISOString(),startedAtMs:Date.now(),
           endedAt:null,durationMs:null,completed:false,inputTypes:[]};
  telemetry.sessions.push(s); activeSession=s; telemetryCompletion[mission]=!!state["m"+mission]?.concluida;
  logEvent("mission_start",{challenge:currentChallenge()}); saveTelemetry();
}
function endTelemetrySession(reason="exit"){
  if(!activeSession) return;
  activeSession.endedAt=new Date().toISOString();
  activeSession.durationMs=Math.max(0,Date.now()-activeSession.startedAtMs);
  activeSession.completed=!!state["m"+activeSession.mission]?.concluida;
  activeSession.endReason=reason;
  logEvent("session_end",{challenge:currentChallenge()});
  activeSession=null; saveTelemetry();
}
function detectConcept(el){
  if(!el) return null;
  const dk=el.dataset?.k || el.dataset?.tipo;
  if(dk) return dk;
  const txt=(el.textContent||"").trim().toLowerCase();
  if(txt.includes("hardware")) return "hardware";
  if(txt.includes("software")) return "software";
  return null;
}

// Wrap mission starts without changing pedagogical logic.
for(let n=1;n<=8;n++){
  const name="startM"+n;
  const original=window[name];
  if(typeof original==="function"){
    window[name]=function(){ original(); startTelemetrySession(n); };
  }
}

// Capture pedagogically useful interactions after existing handlers run.
document.addEventListener("click",e=>{
  const hint=e.target.closest("#btnDica");
  if(hint && activeSession){ logEvent("hint_used",{concept:null}); return; }

  const answer=e.target.closest(".opcao,.m6-op,.m7-escolha,.m8-classe");
  if(answer && activeSession){
    const beforeMission=activeSession.mission;
    const concept=detectConcept(answer);
    setTimeout(()=>{
      if(!activeSession || activeSession.mission!==beforeMission) return;
      const correct=answer.classList.contains("certa");
      const wrong=answer.classList.contains("errada");
      if(correct||wrong) logEvent("attempt",{concept,answer:concept,correct});
      const done=!!state["m"+beforeMission]?.concluida;
      if(done && !telemetryCompletion[beforeMission]){
        telemetryCompletion[beforeMission]=true;
        logEvent("mission_complete",{challenge:currentChallenge()});
      }
    },0);
  }

  const central=e.target.closest('[data-go="central"],#fim,#m2fim,#m3fim,#m4fim,#m5fim,#m6fim,#m7fim,#m8fim');
  if(central && activeSession) setTimeout(()=>endTelemetrySession("central"),5);
},false);

// Mission 4 uses draggable/selectable pieces; log interaction without judging motor precision.
document.addEventListener("dragstart",e=>{
  const piece=e.target.closest("[draggable='true']");
  if(piece && activeSession?.mission===4) logEvent("drag_start",{concept:piece.dataset?.k||piece.dataset?.id||null});
},true);
document.addEventListener("drop",e=>{
  if(activeSession?.mission===4) setTimeout(()=>logEvent("drop_attempt",{concept:detectConcept(e.target.closest("[data-k],[data-id]"))}),0);
},true);

// Export is a technical validation aid, not a student report.
document.getElementById("exportarTelemetria").onclick=()=>{
  const payload={
    schema:"labpc.missao_computador.telemetria.v1",
    exportedAt:new Date().toISOString(),
    prototype:"Missao Computador v1.0 - Item 4.7",
    progress:state,
    telemetry
  };
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="labpc_missao_computador_telemetria_"+new Date().toISOString().slice(0,10)+".json";
  a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
};

// Reset only this activity's progress + telemetry.
document.getElementById("reset").onclick=()=>{
 if(confirm("Reiniciar o progresso e apagar os registros locais somente da Missão Computador?")){
   if(activeSession) endTelemetrySession("reset");
   localStorage.removeItem(KEY); localStorage.removeItem(TELEMETRY_KEY);
   telemetry={version:1,sessions:[],events:[]}; activeSession=null;
   state={};
   for(let i=1;i<=8;i++) state["m"+i]={etapa:0,erros:0,dicas:0,concluida:false};
   etapa=etapaM2=etapaM3=etapaM4=etapaM5=etapaM6=etapaM7=etapaM8=0;
   saveAll(); saveTelemetry(); cards();
 }
};

window.addEventListener("beforeunload",()=>{ if(activeSession) endTelemetrySession("page_close"); });

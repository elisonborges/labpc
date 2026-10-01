
const app=document.querySelector("#app");let st=Store.load(),cur=null,prog=[],sc=null,plan=[],pred=null,mode="plan",selected=[],teacherMode=false;
const M=MISSIONS,L=LEVELS;
function prevKey(m,l){if(m===1&&l===1)return null;return l>1?`${m}.${l-1}`:`${m-1}.4`}
function unlocked(m,l){if(teacherMode)return true;let p=prevKey(m,l);return !p||!!st.done[p]}
function missionUnlocked(m){return unlocked(m,1)}
function nextLabel(m,l){return l<4?`Nível ${l+1}`:m<10?`Missão ${m+1}`:"Desafio Final"}
const dirs={N:"⬆️ CIMA",E:"➡️ DIREITA",S:"⬇️ BAIXO",W:"⬅️ ESQUERDA"};
function count(){return Object.values(st.done).filter(Boolean).length}function save(){Store.save(st);document.querySelector("#progress").textContent=`${count()}/40 níveis`}
function home(){
 app.innerHTML=`<section class="hero"><div class="bot">🤖</div><h1>Missão Algoritmo</h1><p>De situações do cotidiano até criar, testar e depurar seus próprios algoritmos.</p>${teacherMode?'<span class="pill">👩‍🏫 MODO PROFESSOR — tudo liberado</span>':''}${st.achievement?'<span class="pill">🏆 Programador do Nexo</span>':''}</section>
 <section class="missions">${M.map((x,i)=>{let m=i+1,d=[1,2,3,4].filter(n=>st.done[`${m}.${n}`]).length,u=missionUnlocked(m);return`<button class="missionCard ${u?'':'locked'}" ${u?`onclick="mission(${m})"`:'disabled'}><div class="ico">${u?x[0]:'🔒'}</div><b>Missão ${m}</b><br>${x[1]}<p class="small">${u?x[2]:'Conclua a missão anterior para desbloquear.'}</p><div class="dots">${[1,2,3,4].map(n=>`<i class="dot ${st.done[`${m}.${n}`]?'done':''}"></i>`).join("")}</div></button>`}).join("")}</section>
 <section class="panel teacher"><b>👩‍🏫 Área do professor</b><div class="actions">${teacherMode?'<button class="good" onclick="teacherMode=false;home()">🔓 Sair do Modo Professor</button>':'<button onclick="teacherMode=true;home()">🔑 Entrar no Modo Professor</button>'}<button onclick="testMode()">🧪 Ir para missão/nível</button><button onclick="resetAll()">🔄 Reiniciar Missão Algoritmo</button></div><p class="small">O Modo Professor libera temporariamente todos os níveis neste navegador. Ele não altera o progresso do aluno.</p></section>`;
 save()
}
function mission(m){
 if(!missionUnlocked(m)){home();return}
 app.innerHTML=`<div class="toolbar"><button onclick="home()">🏠 Jornada</button>${teacherMode?'<span class="pill">👩‍🏫 Modo Professor</span>':''}</div>
 <section class="identity"><h1>${M[m-1][0]} Missão ${m} — ${M[m-1][1]}</h1><p>${M[m-1][2]}</p></section>
 <section class="cards">${L[m].map((x,i)=>{let l=i+1,u=unlocked(m,l),done=!!st.done[`${m}.${l}`];return`<button class="card ${u?'':'locked'}" ${u?`onclick="level(${m},${l})"`:'disabled'}><b>${u?'':'🔒 '}Nível ${l}</b><br>${x[0]}<br><span class="small">${done?'✅ concluído':u?'▶️ disponível':'Conclua o nível anterior'}</span></button>`}).join("")}</section>`
}
function nav(m,l){
 return`<div class="toolbar"><button onclick="mission(${m})">← Missão ${m}</button><span>Nível ${l}/4</span>${teacherMode?'<span class="pill">👩‍🏫</span>':''}</div>`
}
function intro(m,l){let x=L[m][l-1];return`${nav(m,l)}<section class="identity"><b>${M[m-1][0]} MISSÃO ${m}</b><h1>${x[0]}</h1></section><div class="task">🎯 ${x[2]}</div>`}
function level(m,l){if(!unlocked(m,l)){mission(m);return}cur={m,l};prog=[];plan=[];pred=null;selected=[];sc=makeScene(m,l);let t=L[m][l-1][1];if(["grid","gridcreate","gridpredict","planfirst","obstacles","planfull","incomplete","hypothesis","debug","debuglab","translate","investigate"].includes(t))gridLevel(t);else if(t==="directions")directionLevel();else if(t==="compare")compareLevel();else if(t==="compare3")compare3();else if(t==="workshop")workshop();else if(t==="surprise")surprise();else cardLevel(t)}
function cardLevel(t){let {m,l}=cur,content="";
 const sets={
 select:["🛏️ Acordar","👕 Vestir-se","🎒 Pegar a mochila","🏫 Ir à escola","🍿 Assistir a um filme"],
 order:["Colocar pasta na escova","Escovar os dentes","Enxaguar a boca","Guardar a escova"],
 selectorder:["📘 Separar o livro","✏️ Colocar o estojo","📓 Colocar o caderno","🍳 Colocar uma frigideira"],
 playseq:["Lavar as mãos","Separar o alimento","Preparar o lanche","Servir"],
 origami:["Dobrar o papel","Marcar as orelhas","Formar o rosto","Desenhar os detalhes"],
 missing:["Pegar o pão","Colocar o recheio","?","Servir o lanche"],
 orderbad:["Calçar o sapato","Colocar a meia","Amarrar o cadarço"],
 constraints:["Pegar o pão","Colocar o recheio","Fechar o sanduíche","Servir"],
 ambiguity:["Pegue aquilo.","Pegue a bola.","Pegue a bola vermelha."],
 classify:["AVANÇAR","VIRAR À DIREITA","CHEGUE MAIS PERTO","VIRAR À ESQUERDA","ANDE UM POUQUINHO"],
 gap:["Pegar o vaso","Colocar terra","Colocar a semente","Levar para a janela"],
 detective:["Programa A: parece incompleto","Programa B: ordem estranha","Programa C: pode estar correto"],
 bugintro:["Pegar a banana","Descascar","Comer","Jogar a casca fora"],
 clarify:["Pegue o lápis.","Pegue o lápis azul.","Pegue o objeto azul da esquerda."],
 claritylab:["Pegue a bola.","Pegue a bola vermelha.","Pegue a única bola que está na mesa."],
 goal:["⭐ Buscar a estrela","🔑 Encontrar a chave","📦 Entregar o pacote"]
 };let a=sets[t]||sets.order;
 let expl=t==="origami"?`<div class="concept">🐱 Você pode ter feito algo parecido com um origami. Organizar instruções para realizar uma tarefa é criar um <b>ALGORITMO</b>.</div>`:"";
 content=`${expl}<section class="panel"><div class="prehint">👀 <b>PRIMEIRO:</b> observe a situação e pense antes de escolher ou organizar.</div><div class="scene">${t==="ambiguity"||t==="clarify"||t==="claritylab"?"🔴 ⚽ 🔵 ⚽ ✏️":"🤖 ✨"}</div><div class="cards">${a.map((x,i)=>`<button class="card" onclick="pick(this,${i})">${x}</button>`).join("")}</div><div id="seq" class="sequence"></div><div class="actions"><button class="warn" onclick="hint()">💡 Ajuda</button><button class="primary" onclick="finishCard('${t}')">▶️ TESTAR MINHA IDEIA</button></div><div id="res" class="result">Nexo espera sua investigação.</div></section>`;
 app.innerHTML=intro(m,l)+content}
function pick(el,i){el.classList.toggle("sel");let p=selected.indexOf(i);p>=0?selected.splice(p,1):selected.push(i);document.querySelector("#seq").innerHTML=selected.map((x,n)=>`<span class="seq" data-n="${n+1}">${document.querySelectorAll(".card")[x]?.textContent||x}</span>`).join("")}
function finishCard(t){if(!selected.length){res("👀 Escolha ou organize pelo menos uma opção antes de testar.");return}let messages={origami:"🎉 Você seguiu instruções organizadas para chegar a um resultado. Isso é um ALGORITMO!",orderbad:"🔀 Agora compare: trocar a ordem pode mudar o resultado.",constraints:"🥪 Algumas etapas precisam vir antes de outras, mas pode existir mais de uma sequência que faça sentido.",ambiguity:"🤖 Uma pessoa pode usar o contexto. O Nexo pode precisar de mais informação.",classify:"📖 O Nexo reconhece um conjunto específico de comandos. Frases humanas não são 'erradas'; apenas podem exigir contexto.",gap:"🧩 Uma sequência pode estar em boa ordem e ainda faltar uma instrução.",bugintro:"🐞 Quando o resultado fica diferente do esperado, podemos investigar um BUG. Procurar e corrigir é DEPURAR.",clarify:"🎯 Uma instrução clara traz a informação necessária — não precisa ser a frase mais comprida.",claritylab:"🎯 Se existe apenas uma bola, 'pegue a bola' já pode ser suficiente. Clareza depende do contexto.",goal:"🎯 Objetivo é aquilo que queremos alcançar. Algoritmo são as instruções para chegar lá."};res(messages[t]||"▶️ Sua sequência foi testada. Observe se ela faz sentido e experimente outra ordem se quiser.");setTimeout(()=>complete(),800)}
function res(x){let r=document.querySelector("#res");if(r)r.innerHTML=x}
function gridLevel(t){
 let {m,l}=cur;
 let ready=["gridpredict","incomplete","hypothesis","debug","debuglab","investigate"].includes(t);
 if(ready)prog=["F","R","F"];
 let hypothesisBtn=["hypothesis","debug","debuglab","investigate"].includes(t)?`<button onclick="res('💭 Minha hipótese foi registrada. Agora teste antes de alterar.')">💭 Hipótese</button>`:"";
 let first=ready?"🔎 <b>PRIMEIRO:</b> teste o programa pronto antes de decidir se precisa mudar alguma coisa.":"👀 <b>PRIMEIRO:</b> observe o mapa, a direção inicial do Nexo e o objetivo.";
 app.innerHTML=intro(m,l)+`<div class="prehint">${first}</div><section class="panel">
 <div class="concept"><b>🧭 Direção inicial:</b> ${dirs[sc.start.dir]} · <b>🎯 Objetivo:</b> chegar à ⭐</div>
 <div class="work"><div id="grid"></div><aside class="side">
 <div class="commandbox"><h3>📖 Comandos</h3><div class="commands">
 <button onclick="add('F')">⬆️ AVANÇAR</button><button onclick="add('L')">↩️ ESQUERDA</button><button onclick="add('R')">↪️ DIREITA</button>
 <button onclick="prog.pop();drawProg()">⌫ Retirar último</button><button class="warn" onclick="clearProg()">🗑️ Apagar</button></div></div>
 <div class="programbox"><h3>🧩 Programa</h3><div id="program" class="program"></div>
 <div class="actions"><button class="primary" onclick="run()">▶️ EXECUTAR</button><button onclick="resetN()">↩️ Nexo ao início</button><button onclick="step()">👣 Passo a passo</button></div>
 <div id="res" class="result">▶️ Monte ou teste o programa e observe o resultado.</div></div>
 <div class="toolsrow"><b>🧠 Ferramentas:</b><button onclick="mode='plan';res('🧠 Marque no mapa o caminho que você planejou.')">Planejar</button>
 <button onclick="mode='pred';res('🔮 Marque onde você acha que o Nexo terminará.')">Prever</button>${hypothesisBtn}<button class="warn" onclick="hint()">💡 Ajuda</button></div>
 </aside></div></section>`;
 drawGrid();drawProg();
}
function drawGrid(path=[]){let g=document.querySelector("#grid");if(!g)return;g.className="grid";g.style.gridTemplateColumns=`repeat(${sc.size},1fr)`;let h="";for(let y=0;y<sc.size;y++)for(let x=0;x<sc.size;x++){let w=sc.walls.some(q=>q.x===x&&q.y===y),s=sc.start.x===x&&sc.start.y===y,go=sc.goal.x===x&&sc.goal.y===y,p=plan.some(q=>q.x===x&&q.y===y),pr=pred&&pred.x===x&&pred.y===y,pa=path.some(q=>q.x===x&&q.y===y);h+=`<div class="cell ${w?'wall':''} ${p?'plan':''} ${pr?'pred':''} ${pa?'path':''}" onclick="cell(${x},${y})">${w?'🧱':s?'🤖':go?'⭐':''}</div>`}g.innerHTML=h}
function cell(x,y){if(mode==="pred")pred={x,y};else{let i=plan.findIndex(q=>q.x===x&&q.y===y);i>=0?plan.splice(i,1):plan.push({x,y})}drawGrid()}
function add(c){prog.push(c);drawProg()}function clearProg(){prog=[];stepN=0;drawProg();res("🗑️ Programa apagado. Agora você pode montar uma nova solução.");}function drawProg(a=-1){let e=document.querySelector("#program");if(e)e.innerHTML=prog.map((c,i)=>`<span class="cmd ${i===a?'active':''}">${c==="F"?"⬆️ AVANÇAR":c==="L"?"↩️ ESQUERDA":"↪️ DIREITA"}</span>`).join("")||'<span class="small">Monte seu algoritmo aqui.</span>'}
function run(){let r=Nexo.run(prog,sc);drawGrid(r.path);let msg=r.success?"🎉 O Nexo chegou ao objetivo!":r.hit?"🧱 O Nexo encontrou um obstáculo. Investigue o programa.":"🤖 O programa terminou, mas o Nexo ainda não chegou à estrela.";if(pred)msg+=`<br>🔮 Sua previsão foi ${pred.x===r.x&&pred.y===r.y?"confirmada":"diferente do resultado"}.`;res(msg);if(r.success)setTimeout(complete,700)}
let stepN=0;function step(){stepN=(stepN%Math.max(1,prog.length))+1;let r=Nexo.run(prog.slice(0,stepN),sc);drawGrid(r.path);drawProg(stepN-1);res(`👣 Executando o passo ${stepN} de ${prog.length}. Observe o comando destacado.`)}
function resetN(){drawGrid();drawProg();res("↩️ Nexo voltou ao início. Seu programa foi preservado.")}
function directionLevel(){let {m,l}=cur;app.innerHTML=intro(m,l)+`<section class="panel"><div class="concept"><b>🧭 MODO DIREÇÕES</b> — aqui cada seta move diretamente uma casa. É diferente do MODO NEXO (virar + avançar).</div><div class="prehint">🎯 <b>O QUE FAZER:</b> monte uma rota usando as setas. Você pode usar diagonais, mas o Nexo não pode cortar um canto bloqueado.</div><div class="scene">⬆️ ↗️ ➡️ ↘️ ⬇️ ↙️ ⬅️ ↖️</div><div class="actions">${["⬆️","↗️","➡️","↘️","⬇️","↙️","⬅️","↖️"].map(x=>`<button onclick="this.classList.toggle('good')">${x}</button>`).join("")}</div><button class="primary" onclick="complete()">▶️ TESTAR ROTA</button></section>`}
function compareLevel(){let {m,l}=cur;app.innerHTML=intro(m,l)+`<section class="panel"><div class="compare"><div><h3>Programa A</h3><p>⬆️ AVANÇAR · ↪️ DIREITA · ⬆️ AVANÇAR</p><button onclick="res('Programa A executado. Observe onde o Nexo terminaria.')">▶️ Executar A</button></div><div><h3>Programa B</h3><p>↪️ DIREITA · ⬆️ AVANÇAR · ⬆️ AVANÇAR</p><button onclick="res('Programa B executado. A ordem mudou — compare o resultado.')">▶️ Executar B</button></div></div><div id="res" class="result">🔮 Antes de executar, pense: os resultados serão iguais?</div><div class="actions"><button class="primary" onclick="complete()">🔍 TERMINEI DE COMPARAR</button></div></section>`}
function compare3(){let {m,l}=cur;app.innerHTML=intro(m,l)+`<section class="panel"><p>Três programadores tentaram resolver o mesmo problema. <b>Não suponha que apenas um está certo.</b></p><div class="cards">${["Programa de Ana","Programa de Beto","Programa de Caio"].map((x,i)=>`<button class="card" onclick="this.classList.toggle('sel')"><b>${x}</b><br>${i===1?"↪️ DIREITA · ⬆️ AVANÇAR":"⬆️ AVANÇAR · ↪️ DIREITA · ⬆️ AVANÇAR"}</button>`).join("")}</div><div class="actions"><button class="primary" onclick="complete()">🔍 COMPAREI OS PROGRAMAS</button></div></section>`}
function workshop(){let {m,l}=cur;app.innerHTML=intro(m,l)+`<section class="panel"><h2>🛠️ Oficina do Nexo</h2><p>Escolha o que você quer ensinar:</p><div class="cards">${["⭐ Buscar a estrela","🔑 Encontrar a chave","📦 Entregar o pacote"].map(x=>`<button class="card" onclick="res('Você escolheu: ${x}. Agora pense em uma solução própria.')">${x}</button>`).join("")}</div><div id="res" class="result">Escolha um desafio.</div><div class="actions"><button class="primary" onclick="complete()">🧩 CRIEI E TESTEI UMA SOLUÇÃO</button><button>🔄 Tentar outra solução</button></div></section>`}
function surprise(){let types=["🧩 Pode estar faltando um passo.","🔀 Talvez a ordem mereça investigação.","🐞 Pode haver um bug — ou não.","🎯 A instrução pode precisar de mais clareza.","🧠 Talvez você precise criar a solução do zero."];let x=types[Math.floor(Math.random()*types.length)];app.innerHTML=intro(cur.m,cur.l)+`<section class="panel"><h2>🌟 Situação surpresa</h2><p>O sistema não vai dizer qual é o tipo do problema.</p><div class="scene">🤖 ❓ ⭐</div><div id="res" class="result">👀 Observe. Você decide se deve testar, investigar, modificar ou criar.</div><div class="actions"><button onclick="res('🔎 Você começou investigando. Boa estratégia: descubra antes de mudar.')">🔎 Investigar</button><button onclick="res('▶️ Você decidiu testar primeiro e observar o resultado.')">▶️ Testar</button><button class="primary" onclick="complete()">✅ RESOLVI A SITUAÇÃO</button></div><span class="small" title="${x}">desafio ${sc.seed}</span></section>`}
function hint(){res("💡 Observe o objetivo e pergunte: qual é a primeira coisa que eu consigo descobrir sem receber a resposta pronta?")}
function complete(){let {m,l}=cur;st.done[`${m}.${l}`]=true;save();if(l===4){let next=m<10?`<button class="primary big" onclick="mission(${m+1})">➡️ COMEÇAR A MISSÃO ${m+1}</button>`:`<button class="primary big" onclick="rescue()">🏆 DESAFIO FINAL</button>`;app.innerHTML=`<section class="celebrate"><div class="icons">🎉 ⭐ 🏆 ⭐ 🎉</div><h1>PARABÉNS!</h1><h2>MISSÃO ${m} CONCLUÍDA!</h2><p>Você completou os quatro desafios de <b>${M[m-1][1]}</b>.</p><p>🤖 “Muito bem! Vamos para a próxima descoberta?”</p><div class="actions" style="justify-content:center"><button onclick="home()">🏠 Jornada</button>${next}</div></section>`}else app.innerHTML=`<section class="celebrate"><div class="icons">🎉 ⭐ 🎊 ⭐ 🎉</div><h1>PARABÉNS!</h1><h2>NÍVEL ${l} CONCLUÍDO!</h2><p>Você concluiu <b>${L[m][l-1][0]}</b>.</p><p>🤖 “Você conseguiu! Continue explorando.”</p><div class="actions" style="justify-content:center"><button onclick="mission(${m})">🗺️ Ver níveis</button><button class="primary big" onclick="level(${m},${l+1})">➡️ PRÓXIMO NÍVEL</button></div></section>`}
function rescue(){sc=makeScene(10,5,7);prog=[];plan=[];pred=null;app.innerHTML=`<section class="identity"><h1>🏆 O RESGATE DO NEXO</h1><p>Encontre a chave 🔑 e ajude o Nexo a chegar à saída. Planeje antes de programar. Use tudo o que aprendeu.</p></section><section class="panel"><div class="scene">🤖 · 🧱 · 🔑 · 🚪</div><div class="concept">👀 OBSERVE → 🧠 PLANEJE → 🧩 PROGRAME → 🔮 PREVEJA → ▶️ EXECUTE → 🔍 INVESTIGUE → 🔧 MELHORE</div><p>Este é o desafio integrador. Não há pontuação nem ranking: o objetivo é construir, testar e melhorar sua solução.</p><div class="actions"><button class="primary big" onclick="finalWin()">🚀 EXECUTAR MEU RESGATE</button><button>👣 Passo a passo</button><button>💡 Ajuda</button></div></section>`}
function finalWin(){st.achievement=true;Store.save(st);app.innerHTML=`<section class="celebrate"><div class="icons">🏆 🚀 🤖 🚀 🏆</div><h1>MISSÃO ALGORITMO CONCLUÍDA!</h1><h2>CONQUISTA: PROGRAMADOR DO NEXO</h2><p>Você observou, planejou, criou, testou, investigou e melhorou algoritmos.</p><p><b>🤖 “No começo eu ensinei você. Agora você consegue me ensinar.”</b></p><p>Pequenos passos, grandes descobertas.</p><button class="primary big" onclick="home()">🏠 VOLTAR À JORNADA</button></section>`}
function testMode(){let m=+prompt("Missão (1–10):","1"),l=+prompt("Nível (1–4):","1");if(m>=1&&m<=10&&l>=1&&l<=4){teacherMode=true;level(m,l)}}
function resetAll(){if(confirm("Apagar somente o progresso da Missão Algoritmo neste computador?")){Store.reset();st=Store.load();home()}}
home();

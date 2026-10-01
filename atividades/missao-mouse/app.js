const MISSIONS=[
["Cadê o Ponteiro?","Movimentar e localizar"],
["Clique no Alvo","Botão esquerdo e clique"],
["Estoure as Bolhas","Precisão do clique"],
["Escolha a Ferramenta","Seleção intencional"],
["Segure Firme!","Manter pressionado"],
["Leve para o Lugar Certo","Arrastar e soltar"],
["Tudo em seu Lugar","Precisão no arraste"],
["Abra para Descobrir","Duplo clique"],
["Caminho do Nexo","Controle fino"],
["Oficina do Nexo","Integração e autonomia"]
];
const LEVEL_NAMES=["Descobrir","Praticar","Aplicar","Demonstrar"];
let state=JSON.parse(localStorage.getItem("labpc_mouse_v1")||'{"completed":{}}');
let m=0,l=0, step=0, helpCount=0, holdTimer=null, dragging=null, offset={x:0,y:0};
const $=s=>document.querySelector(s), stage=$("#stage");
function save(){localStorage.setItem("labpc_mouse_v1",JSON.stringify(state));}
function telemetry(type,data={}){let log=JSON.parse(localStorage.getItem("labpc_mouse_log")||"[]");log.push({t:Date.now(),type,mission:m+1,level:l+1,...data});if(log.length>500)log=log.slice(-500);localStorage.setItem("labpc_mouse_log",JSON.stringify(log));}
function show(id){document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));$("#"+id).classList.add("active");}
function home(){show("home");renderHome();}
function renderHome(){
 let g=$("#missionGrid");g.innerHTML="";
 MISSIONS.forEach((x,i)=>{let done=[0,1,2,3].filter(k=>state.completed[`${i}-${k}`]).length;
 let c=document.createElement("div");c.className="card"+(done===4?" done":"");c.innerHTML=`<div class="small">MISSÃO ${i+1}</div><h3>${x[0]}</h3><div>${x[1]}</div><div class="small" style="margin-top:12px">${done}/4 níveis concluídos</div>`;c.onclick=()=>startMission(i);g.appendChild(c);});
 let done=Object.keys(state.completed).filter(k=>state.completed[k]).length;$("#progressBar").style.width=(done/40*100)+"%";$("#progressText").textContent=`${done} de 40 níveis concluídos`;
}
function startMission(i){m=i;l=[0,1,2,3].find(k=>!state.completed[`${i}-${k}`])??0;startLevel();}
function startLevel(){step=0;helpCount=0;show("play");$("#missionTitle").textContent=`Missão ${m+1} — ${MISSIONS[m][0]}`;$("#levelTitle").textContent=`Nível ${l+1} — ${LEVEL_NAMES[l]}`;$("#levelDots").innerHTML=[0,1,2,3].map(k=>`<span class="dot ${k===l?"on":""}"></span>`).join("");$("#feedback").textContent="";stage.innerHTML="";telemetry("level_start");render();}
function feedback(msg){$("#feedback").textContent=msg;}
function complete(msg="Muito bem!"){
 state.completed[`${m}-${l}`]=true;save();telemetry("level_complete",{helpCount});feedback("✨ "+msg);
 setTimeout(()=>{if(l<3){l++;startLevel()}else home()},1100);
}
function say(s){
  $("#instruction").innerHTML=`<span><span class="nexo-label">Nexo:</span> ${s}</span>`;
}
function pos(el,x,y){el.style.left=x+"px";el.style.top=y+"px";stage.appendChild(el);return el;}
function target(x,y,emoji="⭐"){let e=document.createElement("div");e.className="target";e.textContent=emoji;return pos(e,x,y);}
function choice(x,y,emoji){let e=document.createElement("div");e.className="choice";e.textContent=emoji;return pos(e,x,y);}
function bubble(x,y,size){let e=document.createElement("div");e.className="bubble";e.style.width=e.style.height=size+"px";e.textContent="○";return pos(e,x,y);}
function wrongButton(e){if(e.button!==0){telemetry(e.button===2?"right_click":"middle_click");$("#feedback").textContent=e.button===2?"Esse é o botão direito. Nesta missão vamos usar o esquerdo.":"Essa é a rodinha. Procure o botão esquerdo.";return true}return false}
stage.addEventListener("contextmenu",e=>e.preventDefault());
function clickable(el,fn){el.addEventListener("mousedown",e=>{if(wrongButton(e)){e.preventDefault();return;} telemetry("left_click");fn(e);});}
function makeDrag(el,drop,strict=false){
 el.addEventListener("pointerdown",e=>{if(e.button!==0){wrongButton(e);return} dragging=el;el.setPointerCapture(e.pointerId);let r=el.getBoundingClientRect();offset={x:e.clientX-r.left,y:e.clientY-r.top};telemetry("drag_start")});
 el.addEventListener("pointermove",e=>{if(dragging!==el)return;let r=stage.getBoundingClientRect();el.style.left=Math.max(0,Math.min(stage.clientWidth-el.offsetWidth,e.clientX-r.left-offset.x))+"px";el.style.top=Math.max(0,Math.min(stage.clientHeight-el.offsetHeight,e.clientY-r.top-offset.y))+"px";});
 el.addEventListener("pointerup",e=>{if(dragging!==el)return;dragging=null;let a=el.getBoundingClientRect(),b=drop.getBoundingClientRect();let cx=a.left+a.width/2,cy=a.top+a.height/2;let tol=strict?18:35;if(cx>b.left-tol&&cx<b.right+tol&&cy>b.top-tol&&cy<b.bottom+tol){telemetry("drop_success");complete("Encaixe realizado!")}else{telemetry("drop_near_or_wrong");$("#feedback").textContent="Quase! Pegue a peça de onde ela ficou e continue."}});
}
function render(){
 stage.innerHTML="";$("#feedback").textContent="";
 if(m===0)return mission1(); if(m===1)return mission2(); if(m===2)return mission3(); if(m===3)return mission4(); if(m===4)return mission5();
 if(m===5)return mission6(); if(m===6)return mission7(); if(m===7)return mission8(); if(m===8)return mission9(); return mission10();
}
function mission1(){
 const texts=["Mexa o mouse e encontre o Nexo.","Leve o ponteiro até os objetos.","Explore as regiões indicadas.","Encontre o Nexo onde ele aparecer."];
 say(texts[l]); let count=0,need=l===0?4:4;
 function spawn(){stage.innerHTML="";let x=40+Math.random()*(stage.clientWidth-170),y=35+Math.random()*(stage.clientHeight-170);let e=target(x,y,l===3?"🤖":["⭐","🔋","🚀","💡"][count%4]);e.style.cursor="default";e.onmouseenter=()=>{telemetry("hover_target");count++; if(count>=need)complete("Você controlou o ponteiro!"); else spawn();};}
 spawn();
}
function mission2(){
 let prompts=["Encontre o botão esquerdo e clique no alvo.","Aponte e faça um clique.","Clique no objeto que o Nexo pedir.","Clique na sequência indicada."];
 say(prompts[l]);let seq=l<2?["⭐","⭐","⭐"]:l===2?["✏️","🔋","⭐"]:["🔋","⭐","🚀","💡"];let i=0;
 function spawn(){stage.innerHTML="";let wanted=seq[i]; if(l>=2){["✏️","🔋","⭐","🚀","💡"].slice(0,l+2).forEach((em,j)=>{let e=choice(45+j*145,100+(j%2)*160,em);clickable(e,()=>{if(em===wanted){i++;telemetry("correct_target");if(i>=seq.length)complete("Você usou o botão esquerdo!");else{say(`Agora clique em ${seq[i]}`);spawn()}}else{telemetry("wrong_choice");$("#feedback").textContent="Observe o que o Nexo pediu e tente novamente."}})});say(`Clique em ${wanted}`)}
 else {let e=target(80+Math.random()*500,120+Math.random()*180,"⭐");clickable(e,()=>{i++;if(i>=seq.length)complete();else spawn()});}}
 spawn();
}
function mission3(){
 say(["Acerte as bolhas grandes com tranquilidade.","Encontre bolhas em lugares e tamanhos diferentes.","Acompanhe as bolhas e clique.","Use sua precisão no jardim de bolhas."][l]);
 let hits=0,need=4+l;function spawn(){if(l<3)stage.innerHTML="";let size=Math.max(55,120-l*18-Math.random()*20),e=bubble(30+Math.random()*(stage.clientWidth-size-50),30+Math.random()*(stage.clientHeight-size-50),size);clickable(e,()=>{hits++;e.remove();telemetry("bubble_hit",{size:Math.round(size)});if(hits>=need)complete("Ótima precisão!");else spawn()});}
 spawn();if(l===3){spawn();spawn();}
}
function mission4(){
 const sets=[["✏️","⚽"],["✂️","📏","🧴"],["✏️","📏","📚","🧽"],["✂️","🧴","📏","✏️"]];
 let labels=[["lápis","✏️"],["régua","📏"],["livro","📚"],["tesoura","✂️"]];let [name,wanted]=labels[l];say(`Observe, escolha e clique: encontre ${name}.`);
 sets[l].forEach((em,j)=>{let e=choice(80+(j%3)*180,100+Math.floor(j/3)*160,em);clickable(e,()=>{if(em===wanted){telemetry("selection_correct");complete("Você observou e escolheu!")}else{telemetry("selection_other");$("#feedback").textContent="Esse objeto foi selecionado. Agora procure o que o Nexo pediu."}})});
}
function timerBar(seconds,onDone){
 let box=document.createElement("div");box.className="timerBox";
 box.innerHTML=`<div class="timerLabel">⏳ Mantenha até completar</div><div class="timerTrack"><div class="timerFill"></div></div>`;
 stage.appendChild(box);let fill=box.querySelector(".timerFill"),elapsed=0,run=false,last=performance.now();
 function tick(now){if(run)elapsed+=now-last;last=now;fill.style.width=Math.min(100,elapsed/(seconds*1000)*100)+"%";if(elapsed>=seconds*1000){run=false;onDone();return}requestAnimationFrame(tick)}requestAnimationFrame(tick);
 return {start:()=>run=true,pause:()=>run=false,reset:()=>{elapsed=0;fill.style.width="0%"}};
}
function mission5(){
 if(l===0||l===1){
  say(l===0?"Pressione e segure o botão esquerdo até a barra completar.":"Carregue a energia do Nexo. Segure até a barra chegar ao fim.");
  let e=document.createElement("div");e.className="hold";e.textContent=l===0?"SEGURE AQUI":"CARREGAR ENERGIA";pos(e,stage.clientWidth/2-95,205);
  let t=timerBar(l===0?2.2:3.2,()=>complete("Você esperou o tempo certo!"));
  e.onpointerdown=ev=>{if(ev.button!==0){wrongButton(ev);return}e.setPointerCapture(ev.pointerId);t.start();feedback("Continue segurando… a barra está enchendo.");telemetry("hold_start")};
  e.onpointerup=()=>{t.pause();feedback("Você soltou. Pressione novamente para continuar.");telemetry("early_release")};
 } else if(l===2){
  say("Faça embaixadinhas: clique na bola no momento certo, não deixe cair e desvie dos obstáculos!");
  let hud=document.createElement("div");hud.className="gameHud";hud.textContent="⚽ 0 / 10";stage.appendChild(hud);
  let ground=document.createElement("div");ground.className="gameGround";stage.appendChild(ground);
  let ball=document.createElement("div");ball.className="ball";ball.textContent="⚽";stage.appendChild(ball);
  let x=90,y=120,vy=0.10,hits=0,alive=true,last=performance.now(),obs=[],nextObs=performance.now()+1800;
  ball.style.left=x+"px";ball.style.top=y+"px";
  clickable(ball,()=>{vy=-0.48;hits++;hud.textContent=`⚽ ${hits} / 10`;telemetry("ball_click",{hits});feedback(hits<10?"Boa! Observe a bola e os obstáculos.":"Muito bem!");if(hits>=10){alive=false;complete("Você controlou os cliques e manteve a bola em jogo!")}});

  function addObs(){
    let o=document.createElement("div");o.className="obstacle";let low=Math.random()<.5;
    o.style.width="62px";o.style.height=(low?74:54)+"px";o.style.left=stage.clientWidth+"px";o.style.top=(low?stage.clientHeight-92:stage.clientHeight-205)+"px";o.textContent=low?"📦":"☁️";stage.appendChild(o);
    obs.push({el:o,x:stage.clientWidth,w:62,h:low?74:54,y:low?stage.clientHeight-92:stage.clientHeight-205});
  }
  function loop(now){
    if(!alive)return;let dt=Math.min(28,now-last);last=now;vy+=0.0017*dt;y+=vy*dt;
    if(y<35){y=35;vy=.08}
    let floor=stage.clientHeight-86;if(y>floor){y=floor;vy=-.22;telemetry("ball_ground");feedback("A bola tocou o chão. Continue: clique nela no momento certo.");}
    ball.style.top=y+"px";
    if(now>nextObs){addObs();nextObs=now+2200}
    obs.forEach(o=>{o.x-=0.10*dt;o.el.style.left=o.x+"px";
      let br={l:x,r:x+68,t:y,b:y+68},or={l:o.x,r:o.x+o.w,t:o.y,b:o.y+o.h};
      if(!o.hit&&br.r>or.l&&br.l<or.r&&br.b>or.t&&br.t<or.b){o.hit=true;telemetry("obstacle_touch");feedback("Encostou no obstáculo. Ajuste o momento do próximo clique.");}
    });
    obs=obs.filter(o=>{if(o.x<-80){o.el.remove();return false}return true});
    requestAnimationFrame(loop);
  }requestAnimationFrame(loop);
 } else {
  say("Complete a oficina: clique para ligar e depois segure para carregar.");
  let e=target(95,190,"⚡");clickable(e,()=>{stage.innerHTML="";say("Agora segure até a energia completar.");let h=document.createElement("div");h.className="hold";h.textContent="SEGURE";pos(h,stage.clientWidth/2-95,205);let t=timerBar(3,()=>complete("Clique e pressão: missão cumprida!"));h.onpointerdown=ev=>{if(ev.button!==0)return;h.setPointerCapture(ev.pointerId);t.start();feedback("Continue segurando…")};h.onpointerup=()=>{t.pause();feedback("Soltou antes do fim. Continue de onde parou.")};})}
}
function dragScene(strict=false,emoji="🔋"){
 say(l===0?"Pressione a peça, mantenha e leve até o lugar indicado.":"Segure, arraste, ajuste e solte no destino.");
 let drop=document.createElement("div");drop.className="drop";drop.textContent="⬚";pos(drop,stage.clientWidth-210,180);
 let el=document.createElement("div");el.className="drag";el.textContent=emoji;pos(el,70,195);makeDrag(el,drop,strict);
}
function mission6(){
 say("Segure o objeto, leve até o destino e solte. O lugar muda a cada nível.");
 let spots=[[60,70,0.72,0.68],[0.68,65,70,0.68],[70,0.68,0.7,70],[0.7,0.7,65,65]][l];
 let sx=spots[0]<1?stage.clientWidth*spots[0]:spots[0], sy=spots[1]<1?stage.clientHeight*spots[1]:spots[1];
 let dx=spots[2]<1?stage.clientWidth*spots[2]:spots[2], dy=spots[3]<1?stage.clientHeight*spots[3]:spots[3];
 let drop=document.createElement("div");drop.className="drop";drop.textContent=["🧺","✏️","🧸","📚"][l];pos(drop,dx,dy);
 let el=document.createElement("div");el.className="drag";el.textContent=["🍎","✏️","🧸","📚"][l];pos(el,sx,sy);makeDrag(el,drop,false);
}
function mission7(){
 const cfg=[
  {name:"Foguete",icon:"🚀",n:2,parts:["PONTA","CORPO"]},
  {name:"Robô",icon:"🤖",n:3,parts:["CABEÇA","CORPO","PÉS"]},
  {name:"Casa",icon:"🏠",n:4,parts:["TELHADO","JANELA","PORTA","BASE"]},
  {name:"Carro",icon:"🚗",n:5,parts:["FRENTE","CABINE","CORPO","RODA 1","RODA 2"]}
 ][l];
 say(`Observe a referência e monte ${cfg.name.toLowerCase()} com ${cfg.n} peças.`);
 let ref=document.createElement("div");ref.className="reference2";ref.innerHTML=`<b>Referência</b><div class="referencePic">${cfg.icon}</div><div>${cfg.name}</div>`;stage.appendChild(ref);

 let cols=cfg.n<=2?2:cfg.n<=4?2:3, pieceW=cfg.n===5?92:110,pieceH=cfg.n===5?70:82;
 let boardW=cols*pieceW+(cols-1)*10, rows=Math.ceil(cfg.n/cols),boardH=rows*pieceH+(rows-1)*10;
 let board=document.createElement("div");board.className="puzzleBoard";board.style.width=(boardW+24)+"px";board.style.height=(boardH+24)+"px";stage.appendChild(board);
 let brx=(stage.clientWidth-(boardW+24))/2,bry=(stage.clientHeight-(boardH+24))/2-28;
 board.style.left=(brx+(boardW+24)/2)+"px";board.style.top=(bry+(boardH+24)/2)+"px";
 let done=0, placed=new Set(), slots=[];
 cfg.parts.forEach((label,i)=>{
   let col=i%cols,row=Math.floor(i/cols),sx=brx+12+col*(pieceW+10),sy=bry+12+row*(pieceH+10);
   let sl=document.createElement("div");sl.className="puzzleSlot2";sl.style.width=pieceW+"px";sl.style.height=pieceH+"px";sl.textContent=label;pos(sl,sx,sy);slots.push({el:sl,x:sx,y:sy});
 });
 let order=[...Array(cfg.n).keys()].sort(()=>Math.random()-.5);
 order.forEach((idx,k)=>{
   let p=document.createElement("div");p.className="puzzlePiece";p.style.width=(pieceW-8)+"px";p.style.height=(pieceH-8)+"px";
   p.textContent=cfg.parts[idx];p.dataset.idx=idx;
   let px=22+k*((stage.clientWidth-190)/Math.max(1,cfg.n-1)),py=stage.clientHeight-pieceH-18;
   pos(p,Math.min(stage.clientWidth-pieceW-10,px),py);
   p.addEventListener("pointerdown",ev=>{if(ev.button!==0){wrongButton(ev);return}dragging=p;p.setPointerCapture(ev.pointerId);let r=p.getBoundingClientRect();offset={x:ev.clientX-r.left,y:ev.clientY-r.top};telemetry("puzzle_drag",{piece:idx})});
   p.addEventListener("pointermove",ev=>{if(dragging!==p)return;let r=stage.getBoundingClientRect();p.style.left=Math.max(0,Math.min(stage.clientWidth-p.offsetWidth,ev.clientX-r.left-offset.x))+"px";p.style.top=Math.max(0,Math.min(stage.clientHeight-p.offsetHeight,ev.clientY-r.top-offset.y))+"px"});
   p.addEventListener("pointerup",()=>{if(dragging!==p)return;dragging=null;let i=Number(p.dataset.idx),a=p.getBoundingClientRect(),b=slots[i].el.getBoundingClientRect(),cx=a.left+a.width/2,cy=a.top+a.height/2;
     if(cx>b.left-28&&cx<b.right+28&&cy>b.top-28&&cy<b.bottom+28){
       p.style.left=(slots[i].x+4)+"px";p.style.top=(slots[i].y+4)+"px";p.style.pointerEvents="none";placed.add(i);done=placed.size;feedback(`Muito bem! ${done} de ${cfg.n} peças no lugar.`);telemetry("puzzle_piece_success",{piece:i});
       if(done===cfg.n){setTimeout(()=>{let c=document.createElement("div");c.className="celebrate";c.innerHTML=`<div class="box"><div class="robot">🤖</div><b>Conseguimos!</b><div style="font-size:64px;margin:10px">${cfg.icon}</div><div>Você levou cada peça até o lugar certo e montou ${cfg.name.toLowerCase()}!</div></div>`;stage.appendChild(c);feedback("Nexo está comemorando com você!");setTimeout(()=>complete("Quebra-cabeça concluído!"),1800)},250)}
     } else {telemetry("puzzle_piece_wrong",{piece:i});feedback("Essa peça ainda não está no lugar. Observe a referência e tente novamente.");}
   });
 });
}function mission8(){
 let count=0,need=3+l;say(["Faça dois cliques rápidos no objeto.","Encontre o ritmo: clique-clique.","Descubra quando usar um ou dois cliques.","Abra os itens com dois cliques."][l]);
 function spawn(){stage.innerHTML="";let e=choice(180+Math.random()*300,150+Math.random()*120,l>=2?"📁":"📦");let clicks=0,last=0;
 e.addEventListener("mousedown",ev=>{if(wrongButton(ev))return;let now=Date.now();if(now-last<650){count++;telemetry("double_click",{interval:now-last});$("#feedback").textContent="Dois cliques reconhecidos!";last=0;if(count>=need)complete("Você descobriu o duplo clique!");else spawn()}else{if(last)telemetry("double_click_slow",{interval:now-last});last=now;$("#feedback").textContent=l>=2?"Para abrir, tente dois cliques seguidos.":"Foi um clique. Agora tente dois cliques seguidos."}});
 }
 spawn();
}
function mission9(){
 say("Siga a linha indicada e leve a peça até o Nexo.");
 let sx=60,sy=70,dx=stage.clientWidth-190,dy=stage.clientHeight-135;
 let x1=sx+45,y1=sy+45,x2=dx+75,y2=dy+60,dist=Math.hypot(x2-x1,y2-y1),ang=Math.atan2(y2-y1,x2-x1)*180/Math.PI;
 let line=document.createElement("div");line.className="guideLine";line.style.left=x1+"px";line.style.top=y1+"px";line.style.width=dist+"px";line.style.transform=`rotate(${ang}deg)`;stage.appendChild(line);
 let drop=document.createElement("div");drop.className="drop";drop.textContent="🤖";pos(drop,dx,dy);
 let el=document.createElement("div");el.className="drag";el.textContent=["⭐","🔋","⚙️","🧩"][l];pos(el,sx,sy);makeDrag(el,drop,l>=2);
 feedback("A linha mostra o caminho. Mantenha o botão pressionado enquanto arrasta.");
}
function mission10(){
 const desc=[
 ["Ligue a Oficina","Clique no botão e depois mantenha a energia pressionada."],
 ["Organize a Bancada","Leve a peça até o lugar correto."],
 ["Encontre as Peças","Abra a pasta com dois cliques."],
 ["Entrega Final","Leve a bateria até o Nexo e conclua a oficina."]
 ];say(desc[l][1]);
 if(l===0){let e=target(100,170,"⚡");clickable(e,()=>{stage.innerHTML="";let h=document.createElement("div");h.className="hold";h.textContent="SEGURE PARA CARREGAR";pos(h,stage.clientWidth/2-95,200);let st=0;h.onpointerdown=ev=>{if(ev.button!==0)return;st=Date.now();h.setPointerCapture(ev.pointerId)};h.onpointerup=()=>Date.now()-st>900?complete("A oficina acendeu!"):$("#feedback").textContent="Segure um pouco mais.";})}
 else if(l===1){dragScene(false,"🔧")}
 else if(l===2){let f=document.createElement("div");f.className="folder";f.textContent="📁";pos(f,stage.clientWidth/2-40,180);let last=0;f.onmousedown=e=>{if(wrongButton(e))return;let n=Date.now();if(n-last<650)complete("Você abriu a pasta!");else{last=n;$("#feedback").textContent="Um clique seleciona. Para abrir, faça dois cliques seguidos."}}}
 else {let drop=document.createElement("div");drop.className="drop";drop.textContent="🤖";pos(drop,stage.clientWidth-200,320);let el=document.createElement("div");el.className="drag";el.textContent="🔋";pos(el,60,80);makeDrag(el,drop,true)}
}
$("#homeBtn").onclick=home;$("#retryBtn").onclick=()=>{telemetry("level_restart");startLevel()};$("#helpBtn").onclick=()=>{helpCount++;telemetry("help");$("#feedback").textContent=["Mova devagar e observe o ponteiro.","Use o botão esquerdo.","Aponte primeiro e só depois clique.","Observe o objeto pedido.","Mantenha o botão pressionado por um instante.","Não solte enquanto estiver movendo.","Ajuste a posição antes de soltar.","Dois cliques, um logo depois do outro.","Faça movimentos tranquilos pelo caminho.","Use o que você aprendeu nas missões anteriores."][m]}; 
renderHome();show("home");

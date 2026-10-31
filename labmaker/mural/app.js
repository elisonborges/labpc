const sb=supabase.createClient(LM_CONFIG.url,LM_CONFIG.key),$=id=>document.getElementById(id);
let user,classes=[],murals=[],mural=null,sections=[],cards=[],sectionId,card=null,mode='organized',objects=[],selected=-1,channel;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function msg(s,id='status',bad=false){$(id).textContent=s;$(id).className='small '+(bad?'error':'success')}
function safeURL(s){try{return new URL(s).protocol==='https:'}catch{return false}}
async function login(){msg('Verificando acesso...','loginStatus');const r=await sb.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(r.error)return msg('E-mail ou senha inválidos.','loginStatus',true);await start(r.data.user)}
async function logout(){if(channel)await sb.removeChannel(channel);await sb.auth.signOut();location.reload()}
async function start(u){user=u;const p=await sb.from('profiles').select('display_name,role,active').eq('id',u.id).maybeSingle();if(p.error||!p.data?.active){await sb.auth.signOut();return msg('Perfil não autorizado. Contate a Administração.','loginStatus',true)}
const a=await sb.from('teacher_project_classes').select('class_id,school_classes(id,grade,class_name,shift,active,units(name,active))').eq('profile_id',u.id);if(a.error)return msg(a.error.message,'loginStatus',true);
classes=[...new Map((a.data||[]).map(x=>x.school_classes).filter(x=>x?.active&&x.units?.active).map(x=>[x.id,x])).values()];
if(p.data.role==='admin'){const r=await sb.from('school_classes').select('id,grade,class_name,shift,active,units(name,active)');if(!r.error)classes=r.data.filter(x=>x.active&&x.units?.active)}
$('auth').classList.add('hide');$('app').classList.remove('hide');$('logout').classList.remove('hide');$('teacherName').textContent=p.data.display_name||'Professor';
classes.sort((a,b)=>(''+a.units?.name+a.grade+a.class_name).localeCompare(''+b.units?.name+b.grade+b.class_name));
$('classSelect').replaceChildren(...classes.map(x=>{const o=document.createElement('option');o.value=x.id;o.textContent=[x.grade,'Turma '+x.class_name,x.shift,x.units?.name].join(' · ');return o}));
if(!classes.length)return msg('Não há turmas vinculadas à sua conta.','status',true);await selectClass()}
function backMurals(){mural=null;$('listView').classList.remove('hide');$('muralView').classList.add('hide');if(channel){sb.removeChannel(channel);channel=null}}
async function selectClass(){backMurals();const r=await sb.from('lm_murals').select('*').eq('class_id',$('classSelect').value).order('created_at',{ascending:false});if(r.error)return msg(r.error.message,'status',true);murals=r.data||[];
$('murals').innerHTML=murals.map(m=>'<article class="tile"><h3>'+esc(m.title)+'</h3><p>'+esc(m.description)+'</p><div class="tile-actions"><button class="btn primary" data-open="'+m.id+'">Abrir mural</button><button class="btn tile-share" data-share="'+m.id+'">Compartilhar com alunos</button><div class="tile-secondary"><button class="btn" data-copy-mural="'+m.id+'">Duplicar para turma</button><button class="btn" data-save-template="'+m.id+'">Salvar modelo</button></div></div></article>').join('')||'<p class="muted">Ainda não há murais nesta turma.</p>';
$('murals').querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openMural(b.dataset.open));$('murals').querySelectorAll('[data-share]').forEach(b=>b.onclick=()=>shareMural(b.dataset.share));$('murals').querySelectorAll('[data-copy-mural]').forEach(b=>b.onclick=()=>duplicateMuralToClass(b.dataset.copyMural));$('murals').querySelectorAll('[data-save-template]').forEach(b=>b.onclick=()=>saveTemplate(b.dataset.saveTemplate))}
async function createMural(){const title=prompt('Título do novo mural:');if(!title?.trim())return;const description=prompt('Descrição (opcional):')||'';const r=await sb.from('lm_murals').insert({class_id:$('classSelect').value,owner_id:user.id,title:title.trim(),description}).select('id').single();if(r.error)return msg('Erro ao criar mural: '+r.error.message,'status',true);await selectClass();await openMural(r.data.id)}
async function openMural(id){mural=murals.find(x=>x.id===id);if(!mural)return; $('muralTitle').textContent=mural.title;$('listView').classList.add('hide');$('muralView').classList.remove('hide');$('addSection').disabled=mural.owner_id!==user.id;await refresh();renderTeacherControls();if(channel)await sb.removeChannel(channel);channel=sb.channel('lm-'+id).on('postgres_changes',{event:'*',schema:'public',table:'lm_cards'},()=>refresh()).on('postgres_changes',{event:'*',schema:'public',table:'lm_sections'},()=>refresh()).subscribe()}
async function refresh(){if(!mural)return;let r=await sb.from('lm_sections').select('*').eq('mural_id',mural.id).order('position');if(r.error)return msg(r.error.message,'status',true);sections=r.data||[];let c=sections.length?await sb.from('lm_cards').select('*').in('section_id',sections.map(s=>s.id)).order('created_at'):{data:[],error:null};if(c.error)return msg(c.error.message,'status',true);cards=c.data||[];renderSections();renderTeacherControls()}
function objHTML(x,mini=false){const scale=mini?.53:1,xp=Math.max(0,Number(x.x)||0),yp=Math.max(0,Number(x.y)||0),w=Math.max(20,Number(x.w)||90),h=Math.max(20,Number(x.h)||60),color=/^#[a-f0-9]{6}$/i.test(x.color)?x.color:'#ffbd36',type=['text','image','rectangle','circle','triangle'].includes(x.type)?x.type:'text';const bg=['rectangle','circle','triangle'].includes(type)?'background:'+color+';':'';const shape=type==='circle'?'border-radius:50%;':type==='triangle'?'clip-path:polygon(50% 0,0 100%,100% 100%);':'';const content=type==='text'?esc(x.value):type==='image'&&safeURL(x.value)?'<img src="'+esc(x.value)+'" alt="">':'';return '<div class="object" style="left:'+xp*scale+'px;top:'+yp*scale+'px;width:'+w*scale+'px;height:'+h*scale+'px;'+bg+shape+'">'+content+'</div>'}
function teacherAttachment(c){const a=Array.isArray(c.elements)?c.elements.find(x=>x.type==='attachment'):null;if(!a||!safeURL(a.value))return '';const url=esc(a.value),kind=a.kind;if(kind==='image')return '<a href="'+url+'" target="_blank" rel="noopener noreferrer"><img src="'+url+'" alt="Anexo do cartão"></a>';if(kind==='video'&&/\.(mp4|webm|ogg)(\?|$)/i.test(a.value))return '<video controls preload="none" style="width:100%" src="'+url+'"></video>';if(kind==='audio'&&/\.(mp3|wav|ogg|m4a)(\?|$)/i.test(a.value))return '<audio controls preload="none" style="width:100%" src="'+url+'"></audio>';return '<p><a target="_blank" rel="noopener noreferrer" href="'+url+'">🔗 Ver anexo ('+esc(kind||'link')+')</a></p>'}
function renderSections(){$('sections').innerHTML=sections.map(s=>'<div class="section"><div class="section-head" style="flex-wrap:wrap"><h3>'+esc(s.title)+'</h3><div style="display:flex;gap:4px;flex-wrap:wrap"><button class="btn" data-new="'+s.id+'">+ Card</button><button class="btn" data-duplicate-section="'+s.id+'" title="Copiar mesa/trio e seus cartões">Duplicar</button><button class="btn" data-section-actions="'+s.id+'">⋯</button><button class="btn btn-danger" data-delete-section="'+s.id+'" title="Excluir mesa/trio e todos os seus cartões">Excluir</button></div></div>'+cards.filter(c=>c.section_id===s.id).map(c=>'<article class="post"><div class="tiny muted">'+esc(c.author_label)+(c.origin==='student'?' · ALUNO · '+(c.moderation_status==='pending'?'AGUARDANDO':c.moderation_status==='rejected'?'REJEITADO':'APROVADO'):'')+'</div><strong>'+esc(c.title)+'</strong>'+(c.layout==='organized'?'<p>'+esc(c.body)+'</p>'+teacherAttachment(c)+(safeURL(c.image_url)?'<img src="'+esc(c.image_url)+'" alt="Imagem do cartão">':''):'<div style="height:180px;position:relative;background:#f6f9ff;overflow:hidden;margin-top:8px">'+(Array.isArray(c.elements)?c.elements:[]).map(x=>objHTML(x,true)).join('')+'</div>')+'<p>'+(c.author_id===user.id&&c.origin!=='student'?'<button class="btn" data-edit="'+c.id+'">Editar</button> <button class="btn" data-duplicate-card="'+c.id+'">Duplicar</button> <button class="btn btn-danger" data-delete-card="'+c.id+'">Excluir</button>' : c.origin==='student'&&mural.owner_id===user.id?'<button class="btn" data-review="'+c.id+'" data-state="approved">Aprovar</button> <button class="btn" data-review="'+c.id+'" data-state="rejected">Rejeitar</button> <button class="btn btn-danger" data-delete-card="'+c.id+'">Excluir</button>':'<span class="muted tiny">Somente leitura</span>')+'</p></article>').join('')+'</div>').join('')||'<p class="muted">Crie a primeira mesa para começar.</p>';
$('sections').querySelectorAll('[data-new]').forEach(b=>b.onclick=()=>newCard(b.dataset.new));$('sections').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editCard(b.dataset.edit));$('sections').querySelectorAll('[data-duplicate-section]').forEach(b=>b.onclick=()=>duplicateSection(b.dataset.duplicateSection));$('sections').querySelectorAll('[data-duplicate-card]').forEach(b=>b.onclick=()=>duplicateCard(b.dataset.duplicateCard));$('sections').querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>reviewStudentCard(b.dataset.review,b.dataset.state));$('sections').querySelectorAll('[data-delete-card]').forEach(b=>b.onclick=()=>deleteMuralCard(b.dataset.deleteCard));$('sections').querySelectorAll('[data-delete-section]').forEach(b=>b.onclick=()=>deleteMuralSection(b.dataset.deleteSection));$('sections').querySelectorAll('[data-section-actions]').forEach(b=>b.onclick=()=>sectionActions(b.dataset.sectionActions))}
async function newSection(){if(!mural||mural.owner_id!==user.id)return;const title=prompt('Nome da mesa ou seção:');if(!title?.trim())return;const r=await sb.from('lm_sections').insert({mural_id:mural.id,title:title.trim(),position:sections.length});if(r.error)return msg(r.error.message,'status',true);await refresh()}
function newCard(id){sectionId=id;card=null;objects=[];selected=-1;$('postTitle').value='';$('postAuthor').value='';$('postBody').value='';$('postImage').value='';$('editorStatus').textContent='';setMode('organized');$('editor').showModal()}
function editCard(id){const c=cards.find(x=>x.id===id);if(!c||c.author_id!==user.id||c.origin==='student')return;card=c;sectionId=c.section_id;$('postTitle').value=c.title;$('postAuthor').value=c.author_label;$('postBody').value=c.body;$('postImage').value=c.image_url;objects=Array.isArray(c.elements)?JSON.parse(JSON.stringify(c.elements)):[];selected=-1;setMode(c.layout==='free'?'free':'organized');$('editorStatus').textContent='';$('editor').showModal()}
function setMode(m){mode=m;$('organized').classList.toggle('hide',m!=='organized');$('free').classList.toggle('hide',m!=='free');renderObjects()}
function addObject(type){let value=type==='text'?'Seu texto':'';if(type==='image'){value=prompt('URL HTTPS da imagem:')||'';if(!safeURL(value))return msg('Informe uma imagem HTTPS válida.','editorStatus',true)}objects.push({type,x:15,y:15,w:type==='text'?170:110,h:type==='text'?65:100,value,color:'#ffbd36'});selected=objects.length-1;renderObjects()}
function renderObjects(){$('canvas').innerHTML=objects.map((x,i)=>objHTML(x).replace('class="object"','class="object '+(i===selected?'selected':'')+'" data-i="'+i+'"')).join('');$('canvas').querySelectorAll('[data-i]').forEach(el=>{el.onpointerdown=e=>{selected=+el.dataset.i;const o=objects[selected],sx=e.clientX,sy=e.clientY,ox=o.x,oy=o.y;el.setPointerCapture(e.pointerId);el.onpointermove=ev=>{o.x=Math.max(0,Math.min(620,ox+ev.clientX-sx));o.y=Math.max(0,Math.min(300,oy+ev.clientY-sy));el.style.left=o.x+'px';el.style.top=o.y+'px'};el.onpointerup=()=>{el.onpointermove=null;renderObjects()};showTools()}});showTools()}
function showTools(){const x=objects[selected];$('objectTools').classList.toggle('hide',!x);if(x){$('objectValue').value=x.value||'';$('objectColor').value=x.color||'#ffbd36';$('objectWidth').value=x.w;$('objectHeight').value=x.h}}
function changeObject(){const x=objects[selected];if(!x)return;x.value=$('objectValue').value;x.color=$('objectColor').value;x.w=Math.max(30,Math.min(650,Number($('objectWidth').value)||80));x.h=Math.max(25,Math.min(330,Number($('objectHeight').value)||50));renderObjects()}
function removeObject(){if(selected<0)return;objects.splice(selected,1);selected=-1;renderObjects()}
async function saveCard(){const title=$('postTitle').value.trim();if(!title)return msg('Informe um título.','editorStatus',true);const row={section_id:sectionId,author_id:user.id,title,author_label:$('postAuthor').value.trim(),body:$('postBody').value,image_url:safeURL($('postImage').value)?$('postImage').value:'',layout:mode,elements:objects};const r=card?await sb.from('lm_cards').update(row).eq('id',card.id):await sb.from('lm_cards').insert(row);if(r.error)return msg('Falha ao salvar: '+r.error.message,'editorStatus',true);$('editor').close();await refresh();msg('Cartão salvo online.')}
['email','password'].forEach(id=>$(id).addEventListener('keydown',e=>{if(e.key==='Enter')login()}));
(async()=>{const r=await sb.auth.getUser();if(r.data?.user)await start(r.data.user)})();
async function shareMural(id){const m=murals.find(x=>x.id===id);if(!m)return;if(m.owner_id!==user.id)return msg('Somente o criador pode compartilhar este mural.','status',true);const url=new URL('./aluno/',location.href);url.searchParams.set('m',m.share_token);const enable=confirm('Liberar acesso dos alunos sem login?\n\nOK = liberar e mostrar link\nCancelar = não alterar');if(!enable)return;const r=await sb.from('lm_murals').update({student_enabled:true}).eq('id',m.id).eq('owner_id',user.id).select('id').single();if(r.error)return msg('Não foi possível liberar: '+r.error.message,'status',true);m.student_enabled=true;const link=url.toString();try{await navigator.clipboard.writeText(link);alert('Link dos alunos copiado:\n'+link)}catch{prompt('Copie o link para seus alunos:',link)}msg('Compartilhamento ativado. Alunos não precisam fazer login.')}

let replicationBusy=false;
function sectionTitleNext(base){const match=base.match(/^(Mesa|Trio)\s+(\d+)$/i);if(match){const prefix=match[1];let n=Number(match[2])+1;while(sections.some(s=>s.title.toLowerCase()=== (prefix+' '+n).toLowerCase()))n++;return prefix+' '+n}let title=base+' (cópia)',n=2;while(sections.some(s=>s.title===title))title=base+' (cópia '+n+++')';return title}
async function duplicateCard(id,targetSection=null){if(replicationBusy)return;const source=cards.find(c=>c.id===id);if(!source||source.author_id!==user.id||source.origin==='student')return msg('Você só pode duplicar seus próprios cartões.','status',true);
replicationBusy=true;try{const payload={section_id:targetSection||source.section_id,author_id:user.id,title:source.title,author_label:source.author_label,body:source.body,image_url:source.image_url,elements:source.elements,layout:source.layout};const {error}=await sb.from('lm_cards').insert(payload);if(error)throw error;await refresh();msg('Cartão duplicado com conteúdo e figuras.')}catch(e){msg('Erro ao duplicar cartão: '+e.message,'status',true)}finally{replicationBusy=false}}
async function duplicateSection(id){if(replicationBusy)return;if(!mural||mural.owner_id!==user.id)return msg('Apenas o criador do mural pode duplicar mesas.','status',true);
const source=sections.find(s=>s.id===id);if(!source)return;const title=prompt('Nome da nova mesa/trio:',sectionTitleNext(source.title));if(!title?.trim())return;
replicationBusy=true;let newId=null;try{const result=await sb.from('lm_sections').insert({mural_id:mural.id,title:title.trim(),position:sections.length}).select('id').single();if(result.error)throw result.error;newId=result.data.id;
const originals=cards.filter(c=>c.section_id===id&&c.author_id===user.id&&c.origin!=='student');
if(originals.length){const data=originals.map(c=>({section_id:newId,author_id:user.id,title:c.title,author_label:c.author_label,body:c.body,image_url:c.image_url,elements:c.elements,layout:c.layout}));const ins=await sb.from('lm_cards').insert(data);if(ins.error)throw ins.error}
await refresh();msg('Mesa/trio duplicado com '+originals.length+' cartão(ões) seus.')}catch(e){msg('Cópia incompleta: '+e.message,'status',true);await refresh()}finally{replicationBusy=false}}
async function createGroups(){if(replicationBusy||!mural||mural.owner_id!==user.id)return;
const type=prompt('Criar grupos do tipo Mesa ou Trio?','Mesa');if(!type||!['mesa','trio'].includes(type.trim().toLowerCase()))return msg('Digite Mesa ou Trio.','status',true);
const quantity=Number(prompt('Quantos grupos deseja criar? (máximo 30)','5'));if(!Number.isInteger(quantity)||quantity<1||quantity>30)return msg('Informe de 1 a 30 grupos.','status',true);
replicationBusy=true;try{const base=type.trim().toLowerCase()==='trio'?'Trio':'Mesa';let n=1;const batch=[];for(let i=0;i<quantity;i++){while(sections.some(s=>s.title.toLowerCase()===(base+' '+n).toLowerCase())||batch.some(s=>s.title.toLowerCase()===(base+' '+n).toLowerCase()))n++;batch.push({mural_id:mural.id,title:base+' '+n,position:sections.length+i});n++}const r=await sb.from('lm_sections').insert(batch);if(r.error)throw r.error;await refresh();msg(quantity+' '+base.toLowerCase()+'(s) criados com sucesso.')}catch(e){msg('Erro ao criar grupos: '+e.message,'status',true)}finally{replicationBusy=false}}

async function duplicateMuralToClass(id){
 if(replicationBusy)return;
 const source=murals.find(m=>m.id===id);
 if(!source||source.owner_id!==user.id)return msg('Somente o criador pode replicar este mural.','status',true);
 const choices=classes.map((x,i)=>({number:i+1,id:x.id,label:[x.grade,'Turma '+x.class_name,x.shift,x.units?.name].join(' · ')}));
 const answer=prompt('Selecione a turma de destino pelo número:\n\n'+choices.map(x=>x.number+' — '+x.label).join('\n'));
 if(answer===null)return;
 const target=choices.find(x=>String(x.number)===answer.trim());
 if(!target)return msg('Turma inválida.','status',true);
 const name=prompt('Nome do novo mural:',source.title);
 if(!name?.trim())return;
 if(!confirm('Duplicar para '+target.label+'?\nA cópia terá mesas/trios e cartões do professor. Publicações de alunos e link compartilhado NÃO serão copiados.'))return;
 replicationBusy=true;let createdId=null;
 try{
  msg('Replicando o mural...');
  const sr=await sb.from('lm_sections').select('id,title,position').eq('mural_id',source.id).order('position');
  if(sr.error)throw sr.error;
  const originalSections=sr.data||[];
  const cr=originalSections.length?await sb.from('lm_cards').select('section_id,title,author_label,body,image_url,elements,layout,origin').in('section_id',originalSections.map(x=>x.id)).eq('author_id',user.id).eq('origin','teacher'):{data:[],error:null};
  if(cr.error)throw cr.error;
  const mr=await sb.from('lm_murals').insert({class_id:target.id,owner_id:user.id,title:name.trim(),description:source.description||'',student_enabled:false}).select('id').single();
  if(mr.error)throw mr.error;
  createdId=mr.data.id;
  for(const section of originalSections){
   const dst=await sb.from('lm_sections').insert({mural_id:createdId,title:section.title,position:section.position}).select('id').single();
   if(dst.error)throw dst.error;
   const copied=(cr.data||[]).filter(x=>x.section_id===section.id).map(x=>({section_id:dst.data.id,author_id:user.id,title:x.title,author_label:x.author_label,body:x.body,image_url:x.image_url,elements:x.elements,layout:x.layout}));
   if(copied.length){const saved=await sb.from('lm_cards').insert(copied);if(saved.error)throw saved.error}
  }
  $('classSelect').value=target.id;
  await selectClass();
  msg('Mural duplicado para '+target.label+'. Link dos alunos desativado até você compartilhar.');
 }catch(e){
  let detail='';
  if(createdId){const cleanup=await sb.from('lm_murals').delete().eq('id',createdId).eq('owner_id',user.id);detail=cleanup.error?' Revise a cópia parcial na turma.':' Cópia parcial descartada.'}
  msg('Falha ao copiar: '+e.message+'.'+detail,'status',true);
 }finally{replicationBusy=false}
}

async function saveTemplate(id){
 if(replicationBusy)return;
 const m=murals.find(x=>x.id===id);
 if(!m||m.owner_id!==user.id)return msg('Somente o criador pode salvar um modelo.','status',true);
 const title=prompt('Nome do modelo:',m.title);if(!title?.trim())return;
 replicationBusy=true;
 try{
  const sr=await sb.from('lm_sections').select('id,title,position').eq('mural_id',id).order('position');
  if(sr.error)throw sr.error;
  const ss=sr.data||[];
  const cr=ss.length?await sb.from('lm_cards').select('section_id,title,author_label,body,image_url,elements,layout,origin').in('section_id',ss.map(x=>x.id)).eq('author_id',user.id).eq('origin','teacher'):{data:[],error:null};
  if(cr.error)throw cr.error;
  const blueprint=ss.map(s=>({title:s.title,position:s.position,cards:(cr.data||[]).filter(x=>x.section_id===s.id).map(x=>({title:x.title,author_label:x.author_label,body:x.body,image_url:x.image_url,elements:x.elements,layout:x.layout}))}));
  const saved=await sb.from('lm_templates').insert({owner_id:user.id,title:title.trim(),description:m.description||'',blueprint});
  if(saved.error)throw saved.error;
  msg('Modelo salvo! Ele pode ser reutilizado em suas turmas.');
 }catch(e){msg('Erro ao salvar modelo: '+e.message,'status',true)}finally{replicationBusy=false}
}
async function openTemplates(){
 const r=await sb.from('lm_templates').select('id,title,description,created_at').eq('owner_id',user.id).order('created_at',{ascending:false});
 if(r.error)return msg('Não foi possível carregar modelos: '+r.error.message,'status',true);
 const items=r.data||[];
 if(!items.length)return msg('Ainda não há modelos. Em um mural, clique em Salvar modelo.');
 const selection=prompt('Escolha um modelo pelo número:\n\n'+items.map((x,i)=>(i+1)+' — '+x.title).join('\n'));
 if(selection===null)return;
 const choice=items[Number(selection)-1];
 if(!choice||String(Number(selection))!==selection.trim())return msg('Modelo inválido.','status',true);
 await applyTemplate(choice.id);
}
async function applyTemplate(templateId){
 if(replicationBusy)return;
 const chosen=classes.map((x,i)=>({number:i+1,id:x.id,label:[x.grade,'Turma '+x.class_name,x.shift,x.units?.name].join(' · ')}));
 const selection=prompt('Escolha a turma de destino:\n\n'+chosen.map(x=>x.number+' — '+x.label).join('\n'));
 if(selection===null)return;
 const target=chosen.find(x=>String(x.number)===selection.trim());
 if(!target)return msg('Turma inválida.','status',true);
 const r=await sb.from('lm_templates').select('*').eq('id',templateId).eq('owner_id',user.id).single();
 if(r.error||!r.data)return msg('Modelo não encontrado.','status',true);
 const t=r.data;
 const title=prompt('Título do mural:',t.title);if(!title?.trim())return;
 if(!confirm('Criar um novo mural em '+target.label+' usando o modelo "'+t.title+'"?'))return;
 replicationBusy=true;let created=null;
 try{
  const rows=Array.isArray(t.blueprint)?t.blueprint:[];
  if(rows.length>100)throw Error('Modelo excede o limite de seções.');
  const mr=await sb.from('lm_murals').insert({owner_id:user.id,class_id:target.id,title:title.trim(),description:t.description||'',student_enabled:false}).select('id').single();
  if(mr.error)throw mr.error;
  created=mr.data.id;
  for(let i=0;i<rows.length;i++){
   const group=rows[i],s=await sb.from('lm_sections').insert({mural_id:created,title:group.title,position:i}).select('id').single();
   if(s.error)throw s.error;
   const cards=Array.isArray(group.cards)?group.cards:[];
   if(cards.length>100)throw Error('Limite de cartões por seção excedido.');
   if(cards.length){const data=cards.map(x=>({section_id:s.data.id,author_id:user.id,title:x.title,author_label:x.author_label||'',body:x.body||'',image_url:x.image_url||'',elements:x.elements||[],layout:x.layout||'organized',origin:'teacher'}));
    const cr=await sb.from('lm_cards').insert(data);if(cr.error)throw cr.error}
  }
  $('classSelect').value=target.id;await selectClass();msg('Modelo aplicado! Novo mural criado para '+target.label+'. Compartilhamento ainda desativado.');
 }catch(e){msg('Erro ao usar modelo: '+e.message+(created?' Verifique possível mural incompleto na turma.':''),'status',true)}finally{replicationBusy=false}
}

function renderTeacherControls(){if(!$('muralView')||!mural)return;let el=$('teacherControls');if(!el){el=document.createElement('div');el.id='teacherControls';el.className='inline';$('sections').before(el)}el.replaceChildren();if(mural.owner_id!==user.id)return;
const make=(label,handler)=>{const b=document.createElement('button');b.className='btn';b.textContent=label;b.onclick=handler;el.appendChild(b)};
make(mural.posting_enabled===false?'🔒 Postagens fechadas · Reabrir':'🔓 Postagens abertas · Bloquear',()=>toggleMuralFlag('posting_enabled'));
make(mural.moderation_enabled?'🛡️ Aprovação ligada · Desligar':'🛡️ Aprovação desligada · Ligar',()=>toggleMuralFlag('moderation_enabled'));
const pending=cards.filter(x=>x.origin==='student'&&x.moderation_status==='pending').length;if(pending){const label=document.createElement('strong');label.textContent=' '+pending+' cartão(ões) aguardando aprovação';el.appendChild(label)}
}
async function toggleMuralFlag(field){if(!mural||mural.owner_id!==user.id)return;const next=!(mural[field]!==false);if(field==='moderation_enabled'&&mural[field]===undefined)return msg('Recarregue para atualizar o mural.');const r=await sb.from('lm_murals').update({[field]:next}).eq('id',mural.id).eq('owner_id',user.id).select('*').single();if(r.error)return msg(r.error.message,'status',true);Object.assign(mural,r.data);renderTeacherControls();msg('Configuração atualizada.')}
async function reviewStudentCard(id,state){if(!mural||mural.owner_id!==user.id)return;const c=cards.find(x=>x.id===id);if(!c||c.origin!=='student')return;const r=await sb.from('lm_cards').update({moderation_status:state}).eq('id',id).eq('origin','student').select('id').single();if(r.error)return msg('Erro na moderação: '+r.error.message,'status',true);await refresh();msg(state==='approved'?'Cartão aprovado.':'Cartão rejeitado.')}

async function deleteMuralCard(id){if(replicationBusy||!mural)return;const item=cards.find(x=>x.id===id);if(!item||!(item.author_id===user.id&&item.origin!=='student'||mural.owner_id===user.id&&item.origin==='student'))return msg('Sem permissão para excluir este cartão.','status',true);if(!confirm('Excluir permanentemente o cartão "'+item.title+'"? Esta ação não pode ser desfeita.'))return;replicationBusy=true;try{const q=await sb.from('lm_cards').delete().eq('id',id).select('id');if(q.error)throw q.error;if(!q.data?.length)throw Error('O cartão não foi excluído. Verifique suas permissões.');await refresh();msg('Cartão excluído.')}catch(e){msg('Erro ao excluir cartão: '+e.message,'status',true)}finally{replicationBusy=false}}
async function deleteMuralSection(id){if(replicationBusy||!mural||mural.owner_id!==user.id)return msg('Somente o criador pode excluir uma mesa/trio.','status',true);const item=sections.find(s=>s.id===id);if(!item)return;const count=cards.filter(c=>c.section_id===id).length;if(!confirm('Excluir permanentemente "'+item.title+'" e seus '+count+' cartão(ões), incluindo publicações de alunos?\n\nEsta ação não pode ser desfeita.'))return;replicationBusy=true;try{const q=await sb.from('lm_sections').delete().eq('id',id).select('id');if(q.error)throw q.error;if(!q.data?.length)throw Error('A mesa/trio não foi excluída. Verifique suas permissões.');await refresh();msg('Mesa/trio e seus cartões excluídos.')}catch(e){msg('Erro ao excluir mesa/trio: '+e.message,'status',true)}finally{replicationBusy=false}}

// Enter confirma campos do editor; em textos longos, Enter continua criando nova linha.
$('editor').addEventListener('keydown',event=>{if(event.key!=='Enter'||event.shiftKey||event.isComposing||event.repeat)return;const node=event.target;if(!node.matches('input:not([type=color]):not([type=number])'))return;event.preventDefault();if(node.id==='objectValue'){changeObject();node.blur();return}saveCard()});

let activeSectionMenu=null;
function sectionActions(id){
 if(!mural||mural.owner_id!==user.id)return msg('Somente o responsável pode organizar as mesas.','status',true);
 if(activeSectionMenu===id){closeSectionMenu();return}
 closeSectionMenu();
 const trigger=document.querySelector('[data-section-actions="'+id+'"]');if(!trigger)return;
 const menu=document.createElement('div');menu.id='sectionPopup';menu.className='section-popup';menu.setAttribute('role','menu');
 const items=[['1','✏️','Renomear seção'],['2','➕','Nova seção acima'],['3','➕','Nova seção abaixo'],['4','⬆️','Mover para cima'],['5','⬇️','Mover para baixo'],['6','📋','Copiar nome'],['7','🗑️','Excluir seção']];
 items.forEach(([n,icon,label])=>{const btn=document.createElement('button');btn.type='button';btn.setAttribute('role','menuitem');btn.className='section-menu-item'+(n==='7'?' danger':'');btn.textContent=icon+'  '+label;btn.onclick=()=>{closeSectionMenu();performSectionAction(id,n)};menu.appendChild(btn)});
 trigger.parentElement.appendChild(menu);activeSectionMenu=id;trigger.setAttribute('aria-expanded','true');menu.querySelector('button').focus();
}
function closeSectionMenu(){document.getElementById('sectionPopup')?.remove();document.querySelectorAll('[data-section-actions]').forEach(b=>b.setAttribute('aria-expanded','false'));activeSectionMenu=null}
document.addEventListener('click',e=>{if(activeSectionMenu&&!e.target.closest('#sectionPopup')&&!e.target.closest('[data-section-actions]'))closeSectionMenu()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSectionMenu()});
async function performSectionAction(id,op){
 if(!mural||mural.owner_id!==user.id)return;
 const section=sections.find(x=>x.id===id);if(!section)return;
 if(op==='6'){try{await navigator.clipboard.writeText(section.title);msg('Nome copiado.')}catch{prompt('Copie o nome:',section.title)}return}
 if(op==='7')return deleteMuralSection(id);
 if(op==='1'){const name=prompt('Novo nome:',section.title);if(!name?.trim())return;const q=await sb.from('lm_sections').update({title:name.trim()}).eq('id',id);if(q.error)return msg(q.error.message,'status',true);await refresh();return msg('Seção renomeada.')}
 const index=sections.findIndex(x=>x.id===id);
 if(op==='2'||op==='3'){
  const name=prompt('Nome da nova seção:','Mesa '+(sections.length+1));if(!name?.trim())return;
  const at=index+(op==='3'?1:0);
  // Posicionamento sem apagar ou mover os cartões vinculados.
  const q=await sb.from('lm_sections').insert({mural_id:mural.id,title:name.trim(),position:sections.length+100});
  if(q.error)return msg(q.error.message,'status',true);
  await refresh();const newSection=sections.find(x=>x.title===name.trim()&&x.position>=sections.length);
  if(!newSection)return msg('Seção criada. Atualize para reorganizar.');
  const ordered=sections.filter(x=>x.id!==newSection.id);ordered.splice(at,0,newSection);
  return reorderSections(ordered);
 }
 if(op==='4'||op==='5'){const j=index+(op==='4'?-1:1);if(j<0||j>=sections.length)return msg('A seção já está no limite.');const ordered=[...sections];[ordered[index],ordered[j]]=[ordered[j],ordered[index]];return reorderSections(ordered)}
 msg('Opção inválida.','status',true);
}
async function reorderSections(ordered){
 // Usar intervalos temporários evita colisões de posição durante a troca.
 for(let i=0;i<ordered.length;i++){const q=await sb.from('lm_sections').update({position:10000+i}).eq('id',ordered[i].id);if(q.error)return msg('Falha ao ordenar: '+q.error.message,'status',true)}
 for(let i=0;i<ordered.length;i++){const q=await sb.from('lm_sections').update({position:i}).eq('id',ordered[i].id);if(q.error)return msg('Falha ao ordenar: '+q.error.message,'status',true)}
 await refresh();msg('Organização das mesas atualizada.');
}

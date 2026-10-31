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
function teacherRichBody(c){const body=String(c.body||''),ranges=(Array.isArray(c.elements)?c.elements:[]).filter(x=>x.type==='richRange'&&Number.isInteger(x.start)&&Number.isInteger(x.end)&&x.start>=0&&x.end<=body.length&&x.end>x.start).sort((a,b)=>a.start-b.start);let out='',pos=0;for(const x of ranges){if(x.start<pos)continue;out+=esc(body.slice(pos,x.start));const size=[14,16,20,24,30,36].includes(Number(x.size))?Number(x.size):16,color=/^#[0-9a-f]{6}$/i.test(x.color)?x.color:'#09224a';out+='<span style="font-size:'+size+'px;color:'+color+';font-weight:'+(x.bold?'700':'400')+';font-style:'+(x.italic?'italic':'normal')+'">'+esc(body.slice(x.start,x.end))+'</span>';pos=x.end}return out+esc(body.slice(pos))}
function teacherFontStyle(c){const a=Array.isArray(c.elements)?c.elements.find(x=>x.type==='typography'):null;if(!a)return '';return 'font-size:'+([14,16,20,24,30,36].includes(Number(a.size))?a.size:16)+'px;color:'+(/^#[0-9a-f]{6}$/i.test(a.color)?a.color:'#09224a')+';font-weight:'+(a.bold?'700':'400')+';font-style:'+(a.italic?'italic':'normal')+';text-align:'+(['left','center','right'].includes(a.align)?a.align:'left')+';'}
function teacherInlineImage(v){return typeof v==='string'&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(v)&&v.length<15000}
function teacherAttachment(c){const a=Array.isArray(c.elements)?c.elements.find(x=>x.type==='attachment'):null;if(!a||!(safeURL(a.value)||a.kind==='image'&&teacherInlineImage(a.value)))return '';const url=esc(a.value),kind=a.kind;if(kind==='image')return '<a href="'+url+'" target="_blank" rel="noopener noreferrer"><img src="'+url+'" alt="Anexo do cartão"></a>';if(kind==='video'&&/\.(mp4|webm|ogg)(\?|$)/i.test(a.value))return '<video controls preload="none" style="width:100%" src="'+url+'"></video>';if(kind==='audio'&&/\.(mp3|wav|ogg|m4a)(\?|$)/i.test(a.value))return '<audio controls preload="none" style="width:100%" src="'+url+'"></audio>';return '<p><a target="_blank" rel="noopener noreferrer" href="'+url+'">🔗 Ver anexo ('+esc(kind||'link')+')</a></p>'}
function renderSections(){$('sections').innerHTML=sections.map(s=>'<div class="section"><div class="section-head" style="flex-wrap:wrap"><h3>'+esc(s.title)+'</h3><div style="display:flex;gap:4px;flex-wrap:wrap"><button class="btn" data-new="'+s.id+'">+ Card</button><button class="btn" data-duplicate-section="'+s.id+'" title="Copiar mesa/trio e seus cartões">Duplicar</button><button class="btn" data-section-actions="'+s.id+'">⋯</button><button class="btn btn-danger" data-delete-section="'+s.id+'" title="Excluir mesa/trio e todos os seus cartões">Excluir</button></div></div>'+cards.filter(c=>c.section_id===s.id).map(c=>'<article class="post"><div class="tiny muted">'+esc(c.author_label)+(c.origin==='student'?' · ALUNO · '+(c.moderation_status==='pending'?'AGUARDANDO':c.moderation_status==='rejected'?'REJEITADO':'APROVADO'):'')+'</div><strong>'+esc(c.title)+'</strong>'+(c.layout==='organized'?'<p style="'+teacherFontStyle(c)+'">'+teacherRichBody(c)+'</p>'+teacherAttachment(c)+(safeURL(c.image_url)?'<img src="'+esc(c.image_url)+'" alt="Imagem do cartão">':''):'<div style="height:180px;position:relative;background:#f6f9ff;overflow:hidden;margin-top:8px">'+(Array.isArray(c.elements)?c.elements:[]).map(x=>objHTML(x,true)).join('')+'</div>')+'<p>'+(c.author_id===user.id&&c.origin!=='student'?'<button class="btn" data-edit="'+c.id+'">Editar</button> <button class="btn" data-duplicate-card="'+c.id+'">Duplicar</button> <button class="btn" data-card-menu="'+c.id+'" title="Mais ações">⋯</button> <button class="btn btn-danger" data-delete-card="'+c.id+'">Excluir</button>' : c.origin==='student'&&mural.owner_id===user.id?'<button class="btn" data-review="'+c.id+'" data-state="approved">Aprovar</button> <button class="btn" data-review="'+c.id+'" data-state="rejected">Rejeitar</button> <button class="btn btn-danger" data-delete-card="'+c.id+'">Excluir</button>':'<span class="muted tiny">Somente leitura</span>')+'</p></article>').join('')+'</div>').join('')||'<p class="muted">Crie a primeira mesa para começar.</p>';
$('sections').querySelectorAll('[data-new]').forEach(b=>b.onclick=()=>newCard(b.dataset.new));$('sections').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editCard(b.dataset.edit));$('sections').querySelectorAll('[data-duplicate-section]').forEach(b=>b.onclick=()=>duplicateSection(b.dataset.duplicateSection));$('sections').querySelectorAll('[data-duplicate-card]').forEach(b=>b.onclick=()=>duplicateCard(b.dataset.duplicateCard));$('sections').querySelectorAll('[data-card-menu]').forEach(b=>b.onclick=()=>cardActionsMenu(b.dataset.cardMenu));$('sections').querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>reviewStudentCard(b.dataset.review,b.dataset.state));$('sections').querySelectorAll('[data-delete-card]').forEach(b=>b.onclick=()=>deleteMuralCard(b.dataset.deleteCard));$('sections').querySelectorAll('[data-delete-section]').forEach(b=>b.onclick=()=>deleteMuralSection(b.dataset.deleteSection));$('sections').querySelectorAll('[data-section-actions]').forEach(b=>b.onclick=()=>sectionActions(b.dataset.sectionActions))}
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

let shareTarget=null;
function shareUrl(m){const url=new URL('./aluno/',location.href);url.searchParams.set('m',m.share_token);return url.toString()}
function closeSharePanel(){$('shareOverlay').classList.add('hide');$('sharePanel').classList.add('hide');shareTarget=null}
async function openSharePanel(m){shareTarget=m;$('shareHeading').textContent='Compartilhar · '+m.title;$('shareLink').value=shareUrl(m);$('shareEnabled').checked=m.student_enabled===true;$('shareQr').replaceChildren();loadGroupLinks(m);$('shareQrStatus').textContent=m.student_enabled?'Clique em Gerar QR para projetar ou imprimir.':'Ative o compartilhamento antes de distribuir o QR.';$('shareOverlay').classList.remove('hide');$('sharePanel').classList.remove('hide')}
async function shareMural(id){const m=murals.find(x=>x.id===id)||(mural?.id===id?mural:null);if(!m)return;if(m.owner_id!==user.id)return msg('Somente o criador pode compartilhar este mural.','status',true);openSharePanel(m)}
async function changeSharePermission(){if(!shareTarget)return;const enabled=$('shareEnabled').checked;const r=await sb.from('lm_murals').update({student_enabled:enabled}).eq('id',shareTarget.id).eq('owner_id',user.id).select('id').single();if(r.error){$('shareEnabled').checked=!enabled;return alert('Não foi possível salvar: '+r.error.message)}shareTarget.student_enabled=enabled;$('shareQr').replaceChildren();$('shareQrStatus').textContent=enabled?'Acesso sem login ativo.':'Link desativado para alunos.';msg(enabled?'Compartilhamento ativado.':'Compartilhamento desativado.')}
async function copyShareLink(){if(!shareTarget)return;const link=shareUrl(shareTarget);try{await navigator.clipboard.writeText(link);$('shareNotice').textContent='Link copiado.'}catch{$('shareLink').select();$('shareNotice').textContent='Selecione e copie o link.'}}
function generateShareQr(){if(!shareTarget)return;if(!shareTarget.student_enabled){$('shareQrStatus').textContent='Primeiro ative o acesso dos alunos.';return}if(typeof QRCode!=='function'){$('shareQrStatus').textContent='Biblioteca de QR indisponível. Compartilhe pelo link.';return}const node=$('shareQr');node.replaceChildren();new QRCode(node,{text:shareUrl(shareTarget),width:220,height:220,colorDark:'#082d5a',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});$('shareQrStatus').textContent='QR gerado no navegador, sem enviar o link a serviços externos.'}

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

function cardActionsMenu(id){const c=cards.find(x=>x.id===id);if(!c||c.author_id!==user.id||c.origin==='student')return;const existing=document.getElementById('cardActionsPopup');if(existing){existing.remove();if(existing.dataset.card===id)return}const trigger=document.querySelector('[data-card-menu="'+id+'"]');if(!trigger)return;const popup=document.createElement('div');popup.id='cardActionsPopup';popup.dataset.card=id;popup.className='card-actions-popup';const actions=[['✏️ Editar',()=>editCard(id)],['📋 Duplicar',()=>duplicateCard(id)],['🗑️ Excluir',()=>deleteMuralCard(id)]];for(const [label,action] of actions){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{popup.remove();action()};popup.appendChild(b)}trigger.parentElement.style.position='relative';trigger.parentElement.appendChild(popup)}
document.addEventListener('click',e=>{if(!e.target.closest('#cardActionsPopup')&&!e.target.closest('[data-card-menu]'))document.getElementById('cardActionsPopup')?.remove()});

async function loadGroupLinks(m){
 const node=$('groupRooms');if(!node)return;node.textContent='Carregando salas...';
 const ss=await sb.from('lm_sections').select('id,title').eq('mural_id',m.id).order('position');
 if(ss.error){node.textContent='Não foi possível obter as mesas.';return}
 const sections=ss.data||[];if(!sections.length){node.textContent='Crie mesas antes de gerar links de grupos.';return}
 const links=await sb.from('lm_group_links').select('section_id,token').in('section_id',sections.map(x=>x.id));
 if(links.error){node.textContent='Erro ao carregar links: '+links.error.message;return}
 node.replaceChildren();
 async function getRoomUrl(section){
  if(!m.student_enabled){$('shareNotice').textContent='Ative primeiro o compartilhamento do mural.';return null}
  let entry=(links.data||[]).find(x=>x.section_id===section.id);
  if(!entry){const res=await sb.from('lm_group_links').insert({section_id:section.id}).select('section_id,token').single();if(res.error){$('shareNotice').textContent='Falha ao criar link: '+res.error.message;return null}entry=res.data;links.data.push(entry)}
  const url=new URL('./aluno/',location.href);url.searchParams.set('g',entry.token);return url.toString();
 }
 for(const section of sections){
  const row=document.createElement('div');row.className='group-room';
  const heading=document.createElement('div');heading.className='group-room-heading';
  const name=document.createElement('strong');name.textContent=section.title;heading.appendChild(name);
  const actions=document.createElement('div');actions.className='group-room-buttons';
  const copy=document.createElement('button');copy.type='button';copy.className='btn';copy.textContent='🔗 Copiar link';
  copy.onclick=async()=>{const url=await getRoomUrl(section);if(!url)return;try{await navigator.clipboard.writeText(url);$('shareNotice').textContent='Link exclusivo de '+section.title+' copiado.'}catch{prompt('Copie o link da sala:',url)}};
  const qr=document.createElement('button');qr.type='button';qr.className='btn';qr.textContent='▦ Código QR';
  const output=document.createElement('div');output.className='group-qr';output.hidden=true;
  qr.onclick=async()=>{if(!output.hidden){output.hidden=true;qr.textContent='▦ Código QR';return}const url=await getRoomUrl(section);if(!url)return;if(typeof QRCode!=='function'){$('shareNotice').textContent='Biblioteca de QR indisponível. Use Copiar link.';return}document.querySelectorAll('.group-qr').forEach(el=>el.hidden=true);document.querySelectorAll('.group-room-buttons button:last-child').forEach(el=>el.textContent='▦ Código QR');output.replaceChildren();const label=document.createElement('p');label.textContent='Aponte a câmera para acessar somente '+section.title+'.';output.appendChild(label);const image=document.createElement('div');image.className='group-qr-image';output.appendChild(image);new QRCode(image,{text:url,width:190,height:190,colorDark:'#082d5a',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});output.hidden=false;qr.textContent='Fechar QR'};
  actions.append(copy,qr);heading.appendChild(actions);row.append(heading,output);node.appendChild(row)
 }
}

let presentationItems=[],presentationIndex=0;
function startPresentation(){
 if(!mural)return;
 presentationItems=sections.flatMap(section=>cards.filter(c=>c.section_id===section.id&&c.moderation_status!=='rejected'&&c.moderation_status!=='pending').map(c=>({section:section.title,card:c})));
 if(!presentationItems.length){msg('Nenhum cartão aprovado para apresentar.','status',true);return}
 presentationIndex=0;$('slideScreen').classList.remove('hide');renderPresentation()
}
function renderPresentation(){
 const item=presentationItems[presentationIndex];if(!item)return;const c=item.card;
 $('slideCount').textContent=(presentationIndex+1)+' / '+presentationItems.length;
 $('slideContent').innerHTML='<span class="muted">'+esc(item.section)+' · '+esc(c.author_label)+'</span><h2>'+esc(c.title)+'</h2>'+(c.layout==='free'?'<div class="slide-free">'+(Array.isArray(c.elements)?c.elements:[]).map(x=>objHTML(x,true)).join('')+'</div>':'<div class="slide-body" style="'+teacherFontStyle(c)+'">'+teacherRichBody(c)+'</div>'+teacherAttachment(c)+(safeURL(c.image_url)?'<img src="'+esc(c.image_url)+'" alt="Imagem do cartão">':''));
}
function moveSlide(step){if(!$('slideScreen')||$('slideScreen').classList.contains('hide')||!presentationItems.length)return;presentationIndex=(presentationIndex+step+presentationItems.length)%presentationItems.length;renderPresentation()}
function closePresentation(){$('slideScreen').classList.add('hide');if(document.fullscreenElement=== $('slideScreen'))document.exitFullscreen().catch(()=>{})}
async function toggleSlideFullscreen(){const screen=$('slideScreen');try{if(document.fullscreenElement===screen)await document.exitFullscreen();else await screen.requestFullscreen()}catch{msg('O navegador não permitiu tela cheia.','status',true)}}
document.addEventListener('keydown',event=>{if($('slideScreen')?.classList.contains('hide'))return;if(['ArrowRight','ArrowDown'].includes(event.key)){event.preventDefault();moveSlide(1)}else if(['ArrowLeft','ArrowUp'].includes(event.key)){event.preventDefault();moveSlide(-1)}else if(event.key==='Escape')closePresentation()});

async function printSharedMural(){
 if(!shareTarget)return;
 const id=shareTarget.id;
 closeSharePanel();
 if(mural?.id!==id)await openMural(id);
 if(mural?.id===id)printMural();
}
function printMural(){
 if(!mural)return msg('Abra um mural antes de imprimir.','status',true);
 const node=$('printArea');
 const approved=cards.filter(c=>c.moderation_status!=='pending'&&c.moderation_status!=='rejected');
 const content=sections.map(section=>{
  const posts=approved.filter(c=>c.section_id===section.id);
  return '<section><h2>'+esc(section.title)+'</h2>'+posts.map(c=>{
   const content=c.layout==='free'
    ?'<div class="print-free">'+(Array.isArray(c.elements)?c.elements:[]).filter(x=>['text','image','rectangle','circle','triangle'].includes(x.type)).map(x=>objHTML(x,true)).join('')+'</div>'
    :'<p style="'+teacherFontStyle(c)+'">'+teacherRichBody(c)+'</p>'+teacherAttachment(c)+(safeURL(c.image_url)?'<img src="'+esc(c.image_url)+'" alt="Imagem">':'');
   return '<article><small>'+esc(c.author_label)+'</small><h3>'+esc(c.title)+'</h3>'+content+'</article>';
  }).join('')+'</section>';
 }).join('');
 node.innerHTML='<h1>'+esc(mural.title)+'</h1><p>'+esc(mural.description||'')+'</p><small>AnnA One · LabMaker Mural</small>'+content;
 window.print();
}

async function exportSharedTable(format){
 if(!shareTarget)return;
 const id=shareTarget.id;
 closeSharePanel();
 if(mural?.id!==id)await openMural(id);
 if(mural?.id===id)exportMuralTable(format);
}
function exportMuralRows(){
 if(!mural)return [];
 return sections.flatMap(section=>cards.filter(c=>c.section_id===section.id&&c.moderation_status!=='pending'&&c.moderation_status!=='rejected').map(c=>({
  'Mural':mural.title,
  'Mesa / Trio':section.title,
  'Equipe / Autor':c.author_label||'',
  'Título':c.title||'',
  'Conteúdo':c.body||((Array.isArray(c.elements)?c.elements:[]).filter(o=>o.type==='text').map(o=>o.value).join(' | ')),
  'Modo':c.layout==='free'?'Livre':'Organizado',
  'Origem':c.origin==='student'?'Aluno':'Professor',
  'Data de criação':c.created_at?new Date(c.created_at).toLocaleString('pt-BR'):'',
  'Imagem URL':safeURL(c.image_url)?c.image_url:'',
  'Anexo URL':(Array.isArray(c.elements)?c.elements:[]).filter(o=>o.type==='attachment'&&safeURL(o.value)).map(o=>o.value).join(' | ')
 })));
}
function exportMuralTable(format){
 if(!mural)return msg('Abra um mural para exportar.','status',true);
 const rows=exportMuralRows();
 const keys=['Mural','Mesa / Trio','Equipe / Autor','Título','Conteúdo','Modo','Origem','Data de criação','Imagem URL','Anexo URL'];
 const safeCell=value=>{const v=String(value??'');return /^[\s]*[=+\-@\t\r]/.test(v)?"'"+v:v};
 const cleanRows=rows.map(row=>Object.fromEntries(keys.map(k=>[k,safeCell(row[k])])));
 const name='LabMaker-'+String(mural.title||'mural').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,55);
 if(format==='xlsx'){
  if(typeof XLSX==='undefined')return msg('Biblioteca Excel indisponível. Use CSV.','status',true);
  const ws=XLSX.utils.json_to_sheet(cleanRows,{header:keys});
  ws['!cols']=keys.map(k=>({wch:k==='Conteúdo'?65:k==='Mural'?32:24}));
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Cartões');
  XLSX.writeFile(wb,name+'.xlsx');msg(rows.length+' cartão(ões) exportado(s) para Excel.');return;
 }
 const csv=[keys,...cleanRows.map(row=>keys.map(k=>row[k]))].map(line=>line.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\r\n');
 const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download=name+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 msg(rows.length+' cartão(ões) exportado(s) para CSV.');
}

async function exportSharedPNG(){
 if(!shareTarget)return;
 const id=shareTarget.id;closeSharePanel();
 if(mural?.id!==id)await openMural(id);
 if(mural?.id===id)exportVisualPNG();
}
function exportMuralPNG(){
 if(!mural)return msg('Abra um mural antes de exportar.','status',true);
 const rows=sections.flatMap(s=>[{kind:'section',title:s.title},...cards.filter(c=>c.section_id===s.id&&!['pending','rejected'].includes(c.moderation_status)).map(c=>({kind:'card',card:c}))]);
 const width=1100,height=200+rows.length*175;
 if(height>16000)return msg('Mural extenso demais para PNG único. Use PDF.','status',true);
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const cx=canvas.getContext('2d');cx.fillStyle='#f3f7fd';cx.fillRect(0,0,width,height);
 cx.fillStyle='#113968';cx.font='bold 34px Arial';cx.fillText('LabMaker Mural',40,55);
 cx.font='bold 26px Arial';cx.fillText(String(mural.title||'Mural').slice(0,65),40,100);
 const draw=(value,x,y,limit,maxLines)=>{cx.font='17px Arial';let line='',count=0;for(const word of String(value||'').split(/\s+/)){const next=line?line+' '+word:word;if(cx.measureText(next).width>limit&&line){cx.fillText(line,x,y+count*23);line=word;count++;if(count>=maxLines)break}else line=next}if(count<maxLines)cx.fillText(line,x,y+count*23)};
 let y=145;
 for(const row of rows){
  if(row.kind==='section'){cx.fillStyle='#1b5598';cx.fillRect(40,y,1020,55);cx.fillStyle='white';cx.font='bold 23px Arial';cx.fillText(String(row.title).slice(0,60),60,y+35)}
  else {const c=row.card;cx.fillStyle='white';cx.fillRect(40,y,1020,158);cx.strokeStyle='#cadbf0';cx.strokeRect(40,y,1020,158);cx.fillStyle='#3d628a';cx.font='15px Arial';cx.fillText(String(c.author_label||'').slice(0,75),58,y+25);cx.fillStyle='#123d72';cx.font='bold 22px Arial';cx.fillText(String(c.title||'').slice(0,80),58,y+57);cx.fillStyle='#263b51';draw(c.layout==='free'?(Array.isArray(c.elements)?c.elements:[]).filter(o=>o.type==='text').map(o=>o.value).join(' • '):c.body,58,y+87,960,3)}
  y+=175;
 }
 canvas.toBlob(blob=>{if(!blob)return msg('Falha ao gerar imagem.','status',true);const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='LabMaker-mural.png';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);msg('Imagem PNG gerada (versão textual).')},'image/png');
}

async function exportVisualPNG(){
 if(!mural)return msg('Abra um mural para exportar.','status',true);
 if(typeof html2canvas!=='function'){msg('Captura visual indisponível. Gerando PNG textual.','status',true);return exportMuralPNG()}
 const root=document.createElement('div');
 root.style.cssText='position:absolute;left:-20000px;top:0;width:960px;padding:32px;background:#eef4fd;color:#12365f;font:16px Arial,sans-serif;box-sizing:border-box';
 const header=document.createElement('header');header.style.cssText='padding:22px;background:#103f80;color:white;border-radius:16px;margin-bottom:18px';
 const h1=document.createElement('h1');h1.textContent=mural.title;h1.style.cssText='margin:0 0 8px;font-size:32px;color:white';header.appendChild(h1);
 const desc=document.createElement('p');desc.textContent=mural.description||'LabMaker Mural · AnnA One';desc.style.margin='0';header.appendChild(desc);root.appendChild(header);
 for(const section of sections){
  const area=document.createElement('section');area.style.cssText='margin:18px 0 25px';
  const title=document.createElement('h2');title.textContent=section.title;title.style.cssText='padding:12px 18px;border-radius:11px;background:#1b579b;color:white;font-size:23px';area.appendChild(title);
  for(const c of cards.filter(x=>x.section_id===section.id&&!['pending','rejected'].includes(x.moderation_status))){
   const article=document.createElement('article');article.style.cssText='padding:18px;margin:12px 0;background:white;border:1px solid #d5e3f6;border-radius:13px;overflow:hidden;break-inside:avoid';
   const label=document.createElement('div');label.textContent=c.author_label||'';label.style.cssText='font-size:13px;color:#587394';article.appendChild(label);
   const ct=document.createElement('h3');ct.textContent=c.title;ct.style.cssText='margin:8px 0 12px;color:#123b75;font-size:23px';article.appendChild(ct);
   if(c.layout==='free'){
    const free=document.createElement('div');free.style.cssText='height:230px;position:relative;background:#f6f9ff;overflow:hidden;border-radius:9px';
    free.innerHTML=(Array.isArray(c.elements)?c.elements:[]).filter(x=>['text','image','rectangle','circle','triangle'].includes(x.type)).map(x=>objHTML(x,true)).join('');
    article.appendChild(free);
   }else{
    const body=document.createElement('p');body.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;'+teacherFontStyle(c);body.innerHTML=teacherRichBody(c);article.appendChild(body);
    const media=document.createElement('div');media.innerHTML=teacherAttachment(c)+(safeURL(c.image_url)?'<img src="'+esc(c.image_url)+'" alt="Imagem">':'');media.querySelectorAll('img').forEach(el=>{el.style.maxWidth='100%';el.style.maxHeight='360px';el.crossOrigin='anonymous'});media.querySelectorAll('video,audio').forEach(el=>el.remove());article.appendChild(media);
   }
   area.appendChild(article);
  }
  root.appendChild(area);
 }
 document.body.appendChild(root);
 try{
  if(root.scrollHeight>16000)throw new Error('Mural muito extenso para uma imagem única');
  const canvas=await html2canvas(root,{backgroundColor:'#eef4fd',scale:1,useCORS:true,allowTaint:false,logging:false,imageTimeout:6000,windowWidth:1200});
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  if(!blob)throw new Error('Não foi possível criar o PNG');
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='LabMaker-'+String(mural.title||'mural').replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,45)+'-visual.png';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  msg('PNG visual gerado. Imagens hospedadas sem CORS podem não aparecer.');
 }catch(error){msg('Captura visual indisponível: '+error.message+'. Gerando versão textual.','status',true);exportMuralPNG()}finally{root.remove()}
}

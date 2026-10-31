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
$('murals').innerHTML=murals.map(m=>'<article class="tile"><h3>'+esc(m.title)+'</h3><p>'+esc(m.description)+'</p><div class="tile-actions"><button class="btn primary" data-open="'+m.id+'">Abrir mural</button><button class="btn tile-share" data-share="'+m.id+'">Compartilhar com alunos</button><div class="tile-secondary"><button class="btn" data-copy-mural="'+m.id+'">Duplicar para turma</button><button class="btn" data-save-template="'+m.id+'">Salvar modelo</button><button class="btn btn-danger" data-delete-mural="'+m.id+'" title="Excluir definitivamente este mural">🗑️ Excluir</button></div></div></article>').join('')||'<p class="muted">Ainda não há murais nesta turma.</p>';
$('murals').querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openMural(b.dataset.open));$('murals').querySelectorAll('[data-share]').forEach(b=>b.onclick=()=>shareMural(b.dataset.share));$('murals').querySelectorAll('[data-copy-mural]').forEach(b=>b.onclick=()=>duplicateMuralToClass(b.dataset.copyMural));$('murals').querySelectorAll('[data-save-template]').forEach(b=>b.onclick=()=>saveTemplate(b.dataset.saveTemplate));$('murals').querySelectorAll('[data-delete-mural]').forEach(b=>b.onclick=()=>deleteWholeMural(b.dataset.deleteMural))}
async function createMural(){const title=prompt('Título do novo mural:');if(!title?.trim())return;const description=prompt('Descrição (opcional):')||'';const r=await sb.from('lm_murals').insert({class_id:$('classSelect').value,owner_id:user.id,title:title.trim(),description}).select('id').single();if(r.error)return msg('Erro ao criar mural: '+r.error.message,'status',true);await selectClass();await openMural(r.data.id)}
function applyMuralTheme(){if(!mural)return;const el=$('muralView');const color=/^#[0-9a-f]{6}$/i.test(mural.theme_color)?mural.theme_color:'#edf6ff';el.style.backgroundColor=color;el.style.backgroundImage=mural.background_pattern==='dots'?'radial-gradient(#719ac455 1px,transparent 1px)':mural.background_pattern==='grid'?'linear-gradient(#719ac455 1px,transparent 1px),linear-gradient(90deg,#719ac455 1px,transparent 1px)':'none';el.style.backgroundSize=mural.background_pattern==='dots'?'18px 18px':'24px 24px'}
async function openMural(id){mural=murals.find(x=>x.id===id);if(!mural)return; $('muralTitle').textContent=mural.title;$('listView').classList.add('hide');$('muralView').classList.remove('hide');$('addSection').disabled=mural.owner_id!==user.id;await refresh();applyMuralTheme();renderTeacherControls();if(channel)await sb.removeChannel(channel);channel=sb.channel('lm-'+id).on('postgres_changes',{event:'*',schema:'public',table:'lm_cards'},()=>refresh()).on('postgres_changes',{event:'*',schema:'public',table:'lm_sections'},()=>refresh()).subscribe()}
async function refresh(){if(!mural)return;let r=await sb.from('lm_sections').select('*').eq('mural_id',mural.id).order('position');if(r.error)return msg(r.error.message,'status',true);sections=r.data||[];let c=sections.length?await sb.from('lm_cards').select('*').in('section_id',sections.map(s=>s.id)).order('display_order').order('created_at'):{data:[],error:null};if(c.error)return msg(c.error.message,'status',true);cards=c.data||[];renderSections();renderTeacherControls()}
function objHTML(x,mini=false){const scale=mini?.53:1,xp=Math.max(0,Number(x.x)||0),yp=Math.max(0,Number(x.y)||0),w=Math.max(20,Number(x.w)||90),h=Math.max(20,Number(x.h)||60),color=/^#[a-f0-9]{6}$/i.test(x.color)?x.color:'#ffbd36',type=['text','image','rectangle','circle','triangle'].includes(x.type)?x.type:'text';const bg=['rectangle','circle','triangle'].includes(type)?'background:'+color+';':'';const shape=type==='circle'?'border-radius:50%;':type==='triangle'?'clip-path:polygon(50% 0,0 100%,100% 100%);':'';const content=type==='text'?esc(x.value):type==='image'&&safeURL(x.value)?'<img src="'+esc(x.value)+'" alt="">':'';return '<div class="object" style="left:'+xp*scale+'px;top:'+yp*scale+'px;width:'+w*scale+'px;height:'+h*scale+'px;'+bg+shape+'">'+content+'</div>'}
function teacherRichBody(c){const body=String(c.body||''),ranges=(Array.isArray(c.elements)?c.elements:[]).filter(x=>x.type==='richRange'&&Number.isInteger(x.start)&&Number.isInteger(x.end)&&x.start>=0&&x.end<=body.length&&x.end>x.start).sort((a,b)=>a.start-b.start);let out='',pos=0;for(const x of ranges){if(x.start<pos)continue;out+=esc(body.slice(pos,x.start));const size=[14,16,20,24,30,36].includes(Number(x.size))?Number(x.size):16,color=/^#[0-9a-f]{6}$/i.test(x.color)?x.color:'#09224a';out+='<span style="font-size:'+size+'px;color:'+color+';font-weight:'+(x.bold?'700':'400')+';font-style:'+(x.italic?'italic':'normal')+'">'+esc(body.slice(x.start,x.end))+'</span>';pos=x.end}return out+esc(body.slice(pos))}
function teacherFontStyle(c){const a=Array.isArray(c.elements)?c.elements.find(x=>x.type==='typography'):null;if(!a)return '';return 'font-size:'+([14,16,20,24,30,36].includes(Number(a.size))?a.size:16)+'px;color:'+(/^#[0-9a-f]{6}$/i.test(a.color)?a.color:'#09224a')+';font-weight:'+(a.bold?'700':'400')+';font-style:'+(a.italic?'italic':'normal')+';text-align:'+(['left','center','right'].includes(a.align)?a.align:'left')+';'}
function teacherInlineImage(v){return typeof v==='string'&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(v)&&v.length<95000}
function teacherAttachment(c){const a=Array.isArray(c.elements)?c.elements.find(x=>x.type==='attachment'):null;if(!a||!(safeURL(a.value)||a.kind==='image'&&teacherInlineImage(a.value)))return '';const url=esc(a.value),kind=a.kind;if(kind==='image')return '<a href="'+url+'" target="_blank" rel="noopener noreferrer"><img src="'+url+'" alt="Anexo do cartão"></a>';if(kind==='video'&&/\.(mp4|webm|ogg)(\?|$)/i.test(a.value))return '<video controls preload="none" style="width:100%" src="'+url+'"></video>';if(kind==='audio'&&/\.(mp3|wav|ogg|m4a)(\?|$)/i.test(a.value))return '<audio controls preload="none" style="width:100%" src="'+url+'"></audio>';return '<p><a target="_blank" rel="noopener noreferrer" href="'+url+'">🔗 Ver anexo ('+esc(kind||'link')+')</a></p>'}
function renderSections(){$('sections').innerHTML=sections.map(s=>'<div class="section" data-drop-section="'+s.id+'"><div class="section-head" style="flex-wrap:wrap"><h3>'+esc(s.title)+'</h3><div style="display:flex;gap:4px;flex-wrap:wrap"><button class="btn" data-new="'+s.id+'">+ Card</button><button class="btn" data-duplicate-section="'+s.id+'" title="Copiar mesa/trio e seus cartões">Duplicar</button><button class="btn" data-section-actions="'+s.id+'">⋯</button><button class="btn" data-lock-section="'+s.id+'">'+(s.locked?'🔓 Desbloquear':'🔒 Bloquear')+'</button><button class="btn btn-danger" data-delete-section="'+s.id+'" title="Excluir mesa/trio e todos os seus cartões">Excluir</button></div></div>'+cards.filter(c=>c.section_id===s.id).map(c=>'<article class="post" data-drag-card="'+c.id+'"><div class="tiny muted">'+esc(c.author_label)+(c.origin==='student'?' · ALUNO · '+(c.moderation_status==='pending'?'AGUARDANDO':c.moderation_status==='rejected'?'REJEITADO':'APROVADO'):'')+'</div><strong>'+esc(c.title)+'</strong>'+(c.layout==='organized'?'<p style="'+teacherFontStyle(c)+'">'+teacherRichBody(c)+'</p>'+teacherAttachment(c)+(safeURL(c.image_url)?'<img src="'+esc(c.image_url)+'" alt="Imagem do cartão">':''):'<div style="height:180px;position:relative;background:#f6f9ff;overflow:hidden;margin-top:8px">'+(Array.isArray(c.elements)?c.elements:[]).map(x=>objHTML(x,true)).join('')+'</div>')+(Array.isArray(c.elements)&&c.elements.some(x=>x.type==='privateImage')?'<p><button class="btn" type="button" data-original-image="'+c.id+'">🖼️ Ver imagem original</button></p>':'')+'<p>'+(c.author_id===user.id&&c.origin!=='student'?'<button class="btn" data-edit="'+c.id+'">Editar</button> <button class="btn" data-duplicate-card="'+c.id+'">Duplicar</button> <button class="btn" data-card-menu="'+c.id+'" title="Mais ações">⋯</button> <button class="btn" data-lock-card="'+c.id+'">'+(c.locked?'🔓 Desbloquear':'🔒 Bloquear')+'</button> <button class="btn" data-pick-move="'+c.id+'">⠿ Mover</button> <button class="btn btn-danger" data-delete-card="'+c.id+'">Excluir</button>' : c.origin==='student'&&mural.owner_id===user.id?'<button class="btn" data-review="'+c.id+'" data-state="approved">Aprovar</button> <button class="btn" data-review="'+c.id+'" data-state="rejected">Rejeitar</button> <button class="btn btn-danger" data-delete-card="'+c.id+'">Excluir</button>':'<span class="muted tiny">Somente leitura</span>')+'</p></article>').join('')+'</div>').join('')||'<p class="muted">Crie a primeira mesa para começar.</p>';
setupCardDragging();setupSectionMovement();applyCardFilters();$('sections').querySelectorAll('[data-original-image]').forEach(b=>b.onclick=()=>openTeacherOriginalImage(b.dataset.originalImage));$('sections').querySelectorAll('[data-lock-section]').forEach(b=>b.onclick=()=>toggleSectionLock(b.dataset.lockSection));$('sections').querySelectorAll('[data-lock-card]').forEach(b=>b.onclick=()=>toggleCardLock(b.dataset.lockCard));$('sections').querySelectorAll('[data-pick-move]').forEach(b=>b.onclick=()=>selectMoveDestination(b.dataset.pickMove));$('sections').querySelectorAll('[data-new]').forEach(b=>b.onclick=()=>newCard(b.dataset.new));$('sections').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editCard(b.dataset.edit));$('sections').querySelectorAll('[data-duplicate-section]').forEach(b=>b.onclick=()=>duplicateSection(b.dataset.duplicateSection));$('sections').querySelectorAll('[data-duplicate-card]').forEach(b=>b.onclick=()=>duplicateCard(b.dataset.duplicateCard));$('sections').querySelectorAll('[data-card-menu]').forEach(b=>b.onclick=()=>cardActionsMenu(b.dataset.cardMenu));$('sections').querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>reviewStudentCard(b.dataset.review,b.dataset.state));$('sections').querySelectorAll('[data-delete-card]').forEach(b=>b.onclick=()=>deleteMuralCard(b.dataset.deleteCard));$('sections').querySelectorAll('[data-delete-section]').forEach(b=>b.onclick=()=>deleteMuralSection(b.dataset.deleteSection));$('sections').querySelectorAll('[data-section-actions]').forEach(b=>b.onclick=()=>sectionActions(b.dataset.sectionActions))}
async function newSection(){if(!mural||mural.owner_id!==user.id)return;const title=prompt('Nome da mesa ou seção:');if(!title?.trim())return;const r=await sb.from('lm_sections').insert({mural_id:mural.id,title:title.trim(),position:sections.length});if(r.error)return msg(r.error.message,'status',true);await refresh()}
let teacherLocalImage='',teacherOriginalFile=null;
function resetTeacherLocalImage(){teacherLocalImage='';teacherOriginalFile=null;$('postLocalImage').value='';$('postLocalPreview').hidden=true;$('postLocalStatus').textContent='Selecione JPG, PNG ou WebP. A imagem será compactada automaticamente.'}
function newCard(id){resetTeacherLocalImage();sectionId=id;card=null;objects=[];selected=-1;$('postTitle').value='';$('postAuthor').value='';$('postBody').value='';$('postImage').value='';$('editorStatus').textContent='';setMode('organized');$('editor').showModal()}
function editCard(id){resetTeacherLocalImage();const c=cards.find(x=>x.id===id);if(!c||c.author_id!==user.id||c.origin==='student')return;card=c;sectionId=c.section_id;$('postTitle').value=c.title;$('postAuthor').value=c.author_label;$('postBody').value=c.body;$('postImage').value=c.image_url;objects=Array.isArray(c.elements)?JSON.parse(JSON.stringify(c.elements)):[];const savedImage=objects.find(x=>x.type==='attachment'&&x.kind==='image'&&teacherInlineImage(x.value));if(savedImage){teacherLocalImage=savedImage.value;$('postLocalPreview').src=teacherLocalImage;$('postLocalPreview').hidden=false;$('postLocalStatus').textContent='Imagem local existente neste cartão.'}selected=-1;setMode(c.layout==='free'?'free':'organized');$('editorStatus').textContent='';$('editor').showModal()}
function setMode(m){mode=m;$('organized').classList.toggle('hide',m!=='organized');$('free').classList.toggle('hide',m!=='free');renderObjects()}
function addObject(type){let value=type==='text'?'Seu texto':'';if(type==='image'){value=prompt('URL HTTPS da imagem:')||'';if(!safeURL(value))return msg('Informe uma imagem HTTPS válida.','editorStatus',true)}objects.push({type,x:15,y:15,w:type==='text'?170:110,h:type==='text'?65:100,value,color:'#ffbd36'});selected=objects.length-1;renderObjects()}
function renderObjects(){$('canvas').innerHTML=objects.map((x,i)=>objHTML(x).replace('class="object"','class="object '+(i===selected?'selected':'')+'" data-i="'+i+'"')).join('');$('canvas').querySelectorAll('[data-i]').forEach(el=>{el.onpointerdown=e=>{selected=+el.dataset.i;const o=objects[selected],sx=e.clientX,sy=e.clientY,ox=o.x,oy=o.y;el.setPointerCapture(e.pointerId);el.onpointermove=ev=>{o.x=Math.max(0,Math.min(620,ox+ev.clientX-sx));o.y=Math.max(0,Math.min(300,oy+ev.clientY-sy));el.style.left=o.x+'px';el.style.top=o.y+'px'};el.onpointerup=()=>{el.onpointermove=null;renderObjects()};showTools()}});showTools()}
function showTools(){const x=objects[selected];$('objectTools').classList.toggle('hide',!x);if(x){$('objectValue').value=x.value||'';$('objectColor').value=x.color||'#ffbd36';$('objectWidth').value=x.w;$('objectHeight').value=x.h}}
function changeObject(){const x=objects[selected];if(!x)return;x.value=$('objectValue').value;x.color=$('objectColor').value;x.w=Math.max(30,Math.min(650,Number($('objectWidth').value)||80));x.h=Math.max(25,Math.min(330,Number($('objectHeight').value)||50));renderObjects()}
function removeObject(){if(selected<0)return;objects.splice(selected,1);selected=-1;renderObjects()}
async function saveCard(){const title=$('postTitle').value.trim();if(!title)return msg('Informe um título.','editorStatus',true);const row={section_id:sectionId,author_id:user.id,title,author_label:$('postAuthor').value.trim(),body:$('postBody').value,image_url:safeURL($('postImage').value)?$('postImage').value:'',layout:mode,elements:mode==='organized'?(teacherLocalImage?[...objects.filter(x=>!(x.type==='attachment'&&x.kind==='image'&&teacherInlineImage(x.value))),{type:'attachment',kind:'image',value:teacherLocalImage}]:objects):objects};if(teacherOriginalFile&&mode==='organized'){
 try{
  const path=user.id+'/'+crypto.randomUUID()+'.'+(teacherOriginalFile.type==='image/png'?'png':teacherOriginalFile.type==='image/webp'?'webp':'jpg');
  const uploaded=await sb.storage.from('labmaker-mural-files').upload(path,teacherOriginalFile,{contentType:teacherOriginalFile.type,upsert:false});
  if(uploaded.error)throw uploaded.error;
  row.elements=[...row.elements,{type:'privateImage',path}];
  $('postLocalStatus').textContent='Original salvo em armazenamento privado. Miniatura preservada no cartão.';
 }catch(err){$('postLocalStatus').textContent='Original não enviado: '+err.message+'. A miniatura continuará disponível.'}
}
const r=card?await sb.from('lm_cards').update(row).eq('id',card.id):await sb.from('lm_cards').insert(row);if(r.error)return msg('Falha ao salvar: '+r.error.message,'editorStatus',true);$('editor').close();await refresh();msg('Cartão salvo online.')}
['email','password'].forEach(id=>$(id).addEventListener('keydown',e=>{if(e.key==='Enter')login()}));
(async()=>{const r=await sb.auth.getUser();if(r.data?.user)await start(r.data.user)})();

let shareTarget=null;
function shareUrl(m){const url=new URL('./aluno/',location.href);url.searchParams.set('m',m.share_token);return url.toString()}
function closeSharePanel(){$('shareOverlay').classList.add('hide');$('sharePanel').classList.add('hide');shareTarget=null}
async function openSharePanel(m){shareTarget=m;$('shareHeading').textContent='Compartilhar · '+m.title;$('shareLink').value=shareUrl(m);$('shareEnabled').checked=m.student_enabled===true;$('shareQr').replaceChildren();const groupPanel=$('groupSharingPanel');if(groupPanel){groupPanel.open=false;groupPanel.dataset.mural=m.id;$('groupRooms').replaceChildren()}$('shareQrStatus').textContent=m.student_enabled?'Clique em Gerar QR para projetar ou imprimir.':'Ative o compartilhamento antes de distribuir o QR.';$('shareOverlay').classList.remove('hide');$('sharePanel').classList.remove('hide')}
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

function renderTeacherControls(){if(!$('muralView')||!mural)return;let el=$('teacherControls');if(!el)return;el.replaceChildren();updateMuralStatusChips();if(mural.owner_id!==user.id){$('muralConfigMenu').style.display='none';return}$('muralConfigMenu').style.display='';
const make=(label,handler)=>{const b=document.createElement('button');b.className='btn';b.textContent=label;b.onclick=handler;el.appendChild(b)};
make(mural.posting_enabled===false?'🔒 Postagens fechadas · Reabrir':'🔓 Postagens abertas · Bloquear',()=>toggleMuralFlag('posting_enabled'));
make(mural.moderation_enabled?'🛡️ Aprovação ligada · Desligar':'🛡️ Aprovação desligada · Ligar',()=>toggleMuralFlag('moderation_enabled'));
make(mural.comments_enabled?'💬 Desativar comentários':'💬 Ativar comentários',()=>toggleMuralFlag('comments_enabled'));
const palette=document.createElement('input');palette.type='color';palette.title='Cor do mural';palette.value=/^#[0-9a-f]{6}$/i.test(mural.theme_color)?mural.theme_color:'#edf6ff';palette.onchange=async()=>{const q=await sb.from('lm_murals').update({theme_color:palette.value}).eq('id',mural.id).eq('owner_id',user.id);if(q.error)return msg(q.error.message,'status',true);mural.theme_color=palette.value;applyMuralTheme()};el.appendChild(palette);
make(mural.reactions_enabled?'❤️ Desativar reações':'❤️ Ativar reações',()=>toggleMuralFlag('reactions_enabled'));
const pattern=document.createElement('select');pattern.innerHTML='<option value="solid">Fundo liso</option><option value="dots">Pontinhos</option><option value="grid">Quadriculado</option>';pattern.value=mural.background_pattern||'solid';pattern.onchange=async()=>{const q=await sb.from('lm_murals').update({background_pattern:pattern.value}).eq('id',mural.id).eq('owner_id',user.id);if(q.error)return msg(q.error.message,'status',true);mural.background_pattern=pattern.value;applyMuralTheme()};el.appendChild(pattern);
const review=document.createElement('button');review.className='btn';review.textContent='💬 Moderar comentários';review.onclick=reviewComments;el.appendChild(review);
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

function cardActionsMenu(id){const c=cards.find(x=>x.id===id);if(!c||c.author_id!==user.id||c.origin==='student')return;const existing=document.getElementById('cardActionsPopup');if(existing){existing.remove();if(existing.dataset.card===id)return}const trigger=document.querySelector('[data-card-menu="'+id+'"]');if(!trigger)return;const popup=document.createElement('div');popup.id='cardActionsPopup';popup.dataset.card=id;popup.className='card-actions-popup';const actions=[['✏️ Editar',()=>editCard(id)],['📋 Duplicar',()=>duplicateCard(id)],['🕘 Histórico',()=>openCardHistory(id)],['🗑️ Excluir',()=>deleteMuralCard(id)]];for(const [label,action] of actions){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{popup.remove();action()};popup.appendChild(b)}trigger.parentElement.style.position='relative';trigger.parentElement.appendChild(popup)}
document.addEventListener('click',e=>{if(!e.target.closest('#cardActionsPopup')&&!e.target.closest('[data-card-menu]'))document.getElementById('cardActionsPopup')?.remove()});

function toggleGroupSharing(){const panel=$('groupSharingPanel');if(panel?.open&&shareTarget&&panel.dataset.mural===shareTarget.id)loadGroupLinks(shareTarget)}
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
let presentationOnlyCards=false,presentationDark=false,presentationSeconds=0,presentationTimer=null,presentationLimit=0;
function startPresentation(){
 if(!mural)return;
 const accepted=sections.flatMap(section=>cards.filter(c=>c.section_id===section.id&&c.moderation_status!=='rejected'&&c.moderation_status!=='pending').map(c=>({type:'card',section:section.title,card:c})));
 if(!accepted.length){msg('Nenhum cartão aprovado para apresentar.','status',true);return}
 presentationItems=[{type:'cover'},...sections.flatMap(section=>{const own=accepted.filter(x=>x.card.section_id===section.id);return own.length?(presentationOnlyCards?own:[{type:'section',name:section.title,count:own.length},...own]):[]})];
 presentationIndex=0;resetPresentationTimer();$('slideScreen').classList.toggle('slide-dark',presentationDark);$('slideOnlyCards').checked=presentationOnlyCards;$('slideContrast').checked=presentationDark;$('slideScreen').classList.remove('hide');renderPresentation();$('slideScreen').focus();
}
function updatePresentationOptions(){if($('slideScreen').classList.contains('hide'))return;const current=presentationItems[presentationIndex];presentationOnlyCards=$('slideOnlyCards').checked;presentationDark=$('slideContrast').checked;$('slideScreen').classList.toggle('slide-dark',presentationDark);const accepted=sections.flatMap(section=>cards.filter(c=>c.section_id===section.id&&c.moderation_status!=='rejected'&&c.moderation_status!=='pending').map(c=>({type:'card',section:section.title,card:c})));presentationItems=[{type:'cover'},...sections.flatMap(section=>{const own=accepted.filter(x=>x.card.section_id===section.id);return own.length?(presentationOnlyCards?own:[{type:'section',name:section.title,count:own.length},...own]):[]})];presentationIndex=Math.max(0,presentationItems.findIndex(x=>x.type===current?.type&&(x.type==='card'?x.card.id===current.card.id:x.type==='section'?x.name===current.name:true)));renderPresentation()}
function formatPresentationTime(){const remaining=presentationLimit*60-presentationSeconds;const notice=$('slideTimeNotice');if(notice){notice.textContent=!presentationLimit?'':remaining<=0?'⏰ Tempo encerrado!':remaining<=30?'⚠️ Faltam '+remaining+' segundos':'';notice.classList.toggle('time-over',presentationLimit>0&&remaining<=0);notice.classList.toggle('time-warning',presentationLimit>0&&remaining>0&&remaining<=30)}const m=Math.floor(presentationSeconds/60),s=presentationSeconds%60;$('slideTimer').textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')}
function pausePresentationTimer(){if(presentationTimer){clearInterval(presentationTimer);presentationTimer=null}$('slideTimerToggle').textContent='▶ Tempo'}
function togglePresentationTimer(){if(presentationTimer){pausePresentationTimer();return}presentationTimer=setInterval(()=>{if(!$('slideScreen').classList.contains('hide')){presentationSeconds++;formatPresentationTime()}},1000);$('slideTimerToggle').textContent='⏸ Pausar'}
function resetPresentationTimer(){pausePresentationTimer();presentationSeconds=0;formatPresentationTime()}
function changePresentationLimit(value){presentationLimit=Math.max(0,Math.min(30,Number(value)||0));resetPresentationTimer()}
function renderPresentation(){
 const item=presentationItems[presentationIndex];if(!item)return;
 const stage=$('slideContent');
 const count=presentationItems.length;
 $('slideCount').textContent=(presentationIndex+1)+' / '+count;
 $('slideProgress').style.width=((presentationIndex+1)/count*100)+'%';
 $('slideJump').replaceChildren(...presentationItems.map((it,i)=>{const o=document.createElement('option');o.value=i;o.textContent=(i+1)+' · '+(it.type==='cover'?'Capa':it.type==='section'?'Mesa: '+it.name:it.card.title);return o}));
 $('slideJump').value=String(presentationIndex);
 if(item.type==='cover'){stage.innerHTML='<div class="slide-intro"><p class="slide-eyebrow">LabMaker · Apresentação</p><h1>'+esc(mural.title)+'</h1><p>'+esc(mural.description||'Produções da turma')+'</p><small>'+sections.length+' mesas · '+presentationItems.filter(x=>x.type==='card').length+' cartões</small></div>';return}
 if(item.type==='section'){stage.innerHTML='<div class="slide-intro"><p class="slide-eyebrow">Próxima mesa</p><h1>'+esc(item.name)+'</h1><p>'+item.count+' '+(item.count===1?'cartão':'cartões')+' para apresentar</p></div>';return}
 const c=item.card;
 stage.innerHTML='<span class="muted">'+esc(item.section)+' · '+esc(c.author_label||'Equipe')+'</span><h2>'+esc(c.title)+'</h2>'+(c.layout==='free'?'<div class="slide-free">'+(Array.isArray(c.elements)?c.elements:[]).map(x=>objHTML(x,true)).join('')+'</div>':'<div class="slide-body" style="'+teacherFontStyle(c)+'">'+teacherRichBody(c)+'</div>'+teacherAttachment(c)+(safeURL(c.image_url)?'<img src="'+esc(c.image_url)+'" alt="Imagem do cartão">':''));
}
function moveSlide(step){if($('slideScreen')?.classList.contains('hide')||!presentationItems.length)return;presentationIndex=Math.max(0,Math.min(presentationItems.length-1,presentationIndex+step));renderPresentation()}
function jumpSlide(value){const i=Number(value);if(Number.isInteger(i)&&i>=0&&i<presentationItems.length){presentationIndex=i;renderPresentation()}}
function closePresentation(){pausePresentationTimer();$('slideScreen').classList.add('hide');if(document.fullscreenElement===$('slideScreen'))document.exitFullscreen().catch(()=>{})}
async function toggleSlideFullscreen(){const screen=$('slideScreen');try{if(document.fullscreenElement===screen)await document.exitFullscreen();else await screen.requestFullscreen()}catch{msg('O navegador não permitiu tela cheia.','status',true)}}
document.addEventListener('keydown',event=>{if($('slideScreen')?.classList.contains('hide')||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;if(['ArrowRight','ArrowDown','PageDown',' '].includes(event.key)){event.preventDefault();moveSlide(1)}else if(['ArrowLeft','ArrowUp','PageUp'].includes(event.key)){event.preventDefault();moveSlide(-1)}else if(event.key==='Home'){event.preventDefault();jumpSlide(0)}else if(event.key==='End'){event.preventDefault();jumpSlide(presentationItems.length-1)}else if(event.key==='Escape')closePresentation()});

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

let muralLayout='columns';
function changeMuralLayout(value){
 if(!['columns','grid','timeline'].includes(value))return;
 muralLayout=value;
 const root=$('sections');if(root)root.className='sections layout-'+value;
 const control=$('layoutSelect');if(control)control.value=value;
 try{sessionStorage.setItem('labmaker-layout',value)}catch(err){}
}
try{const saved=sessionStorage.getItem('labmaker-layout');if(['columns','grid','timeline'].includes(saved))muralLayout=saved}catch(err){}
const originalRenderSections=renderSections;
renderSections=function(){originalRenderSections();changeMuralLayout(muralLayout)};

async function reviewComments(){if(!mural||mural.owner_id!==user.id)return;const ids=cards.map(c=>c.id);if(!ids.length)return alert('Não há cartões neste mural.');const q=await sb.from('lm_comments').select('id,card_id,author_label,body,approved,created_at').in('card_id',ids).order('created_at',{ascending:false}).limit(100);if(q.error)return msg('Erro ao listar comentários: '+q.error.message,'status',true);const pending=(q.data||[]).filter(c=>!c.approved);if(!pending.length)return alert('Não há comentários aguardando aprovação.');for(const c of pending){const action=prompt('Comentário de '+c.author_label+':\n'+c.body+'\n\nDigite A para aprovar, E para excluir, ou C para cancelar.','A');if(!action||action.toUpperCase()==='C')break;if(action.toUpperCase()==='A'){const x=await sb.from('lm_comments').update({approved:true}).eq('id',c.id);if(x.error){alert(x.error.message);break}}else if(action.toUpperCase()==='E'){if(!confirm('Excluir este comentário?'))continue;const x=await sb.from('lm_comments').delete().eq('id',c.id);if(x.error){alert(x.error.message);break}}}msg('Moderação de comentários atualizada.')}


function showMuralProgress(){
 if(!mural)return;
 const dialog=$('progressDialog'),body=$('progressDashboard');
 if(!dialog||!body)return;
 const approved=cards.filter(c=>c.moderation_status==='approved').length;
 const pending=cards.filter(c=>c.moderation_status==='pending').length;
 const student=cards.filter(c=>c.origin==='student').length;
 const metrics=[['Cartões',cards.length],['Publicados',approved],['Aguardando aprovação',pending],['Produções de alunos',student]];
 const tiles=metrics.map(([name,n])=>'<div class="progress-metric"><strong>'+n+'</strong><span>'+esc(name)+'</span></div>').join('');
 const max=Math.max(1,...sections.map(s=>cards.filter(c=>c.section_id===s.id).length));
 const rows=sections.map(s=>{
  const items=cards.filter(c=>c.section_id===s.id),total=items.length,students=items.filter(c=>c.origin==='student').length,waiting=items.filter(c=>c.moderation_status==='pending').length;
  return '<div class="progress-row"><div class="progress-row-label"><b>'+esc(s.title)+'</b><span>'+total+' cartão(ões) · '+students+' de alunos · '+waiting+' pendente(s)</span></div><div class="progress-track"><div class="progress-fill" style="width:'+Math.round(total/max*100)+'%"></div></div></div>';
 }).join('');
 body.innerHTML='<div class="progress-metrics">'+tiles+'</div><h3>Participação por mesa</h3><p class="muted">Quantidade de cartões em cada mesa. Produções não equivalem necessariamente a alunos diferentes.</p>'+(rows||'<p class="muted">Nenhuma mesa criada.</p>')+'<div class="progress-footer"><button class="btn" type="button" onclick="document.getElementById(\'progressDialog\').close()">Fechar</button></div>';
 if(!dialog.open)dialog.showModal();
}

function updateMuralStatusChips(){const el=$('muralStatusChips');if(!el||!mural)return;el.replaceChildren();const values=['Postagens: '+(mural.posting_enabled===false?'fechadas':'abertas'),'Aprovação: '+(mural.moderation_enabled?'ligada':'desligada'),'Comentários: '+(mural.comments_enabled?'ativos':'inativos')];for(const label of values){const chip=document.createElement('span');chip.textContent=label;el.appendChild(chip)}}
function muralMenuAction(action){document.querySelectorAll('#muralView .mural-menu').forEach(x=>x.open=false);action()}
document.addEventListener('click',event=>{if(!event.target.closest('#muralView .mural-menu'))document.querySelectorAll('#muralView .mural-menu').forEach(x=>x.open=false)});
document.addEventListener('toggle',event=>{if(event.target.matches?.('#muralView .mural-menu')&&event.target.open)document.querySelectorAll('#muralView .mural-menu').forEach(x=>{if(x!==event.target)x.open=false})},true);

let dragCardId=null,dragStartSection=null,undoCardMove=null,cardMoveBusy=false;
function setupCardDragging(){
 const root=$('sections');if(!root||!mural||mural.owner_id!==user.id)return;
 root.querySelectorAll('[data-drag-card]').forEach(el=>{
  const id=el.dataset.dragCard,c=cards.find(x=>x.id===id);
  if(!c||c.origin==='student'||c.locked||sections.find(s=>s.id===c.section_id)?.locked)return;
  el.draggable=true;el.classList.add('draggable-card');el.title='Arraste o cartão para outra mesa ou para alterar a ordem';
  el.addEventListener('dragstart',ev=>{if(ev.target.closest('button,input,select,textarea,a')){ev.preventDefault();return}dragCardId=id;dragStartSection=c.section_id;ev.dataTransfer.effectAllowed='move';ev.dataTransfer.setData('text/plain',id);el.classList.add('card-dragging')});
  el.addEventListener('dragend',()=>{dragCardId=null;dragStartSection=null;root.querySelectorAll('.drag-hover,.card-dragging').forEach(x=>x.classList.remove('drag-hover','card-dragging'))});
  el.addEventListener('dragover',ev=>{if(!dragCardId||dragCardId===id)return;ev.preventDefault();ev.stopPropagation();el.classList.add('drag-hover')});
  el.addEventListener('dragleave',()=>el.classList.remove('drag-hover'));
  el.addEventListener('drop',ev=>{if(!dragCardId||dragCardId===id)return;ev.preventDefault();ev.stopPropagation();el.classList.remove('drag-hover');const from=dragCardId;dragCardId=null;moveMuralCard(from,c.section_id,id)});
 });
 root.querySelectorAll('[data-drop-section]').forEach(el=>{
  el.addEventListener('dragover',ev=>{if(!dragCardId)return;ev.preventDefault();ev.dataTransfer.dropEffect='move';el.classList.add('drag-hover')});
  el.addEventListener('dragleave',ev=>{if(!el.contains(ev.relatedTarget))el.classList.remove('drag-hover')});
  el.addEventListener('drop',ev=>{if(!dragCardId)return;ev.preventDefault();el.classList.remove('drag-hover');const id=dragCardId;dragCardId=null;moveMuralCard(id,el.dataset.dropSection,null)});
 });
}
async function moveMuralCard(id,targetSection,beforeId=null){
 if(cardMoveBusy||!mural||mural.owner_id!==user.id)return;
 const source=cards.find(c=>c.id===id),target=sections.find(s=>s.id===targetSection);
 if(!source||!target||source.origin==='student'||source.locked||target.locked||sections.find(s=>s.id===source.section_id)?.locked)return msg('Somente cartões criados pelo professor podem ser movidos nesta versão.','status',true);
 if(source.section_id===targetSection&&!beforeId)return;
 const previous=cards.map(c=>({id:c.id,section_id:c.section_id,display_order:c.display_order}));
 const others=cards.filter(c=>c.section_id===targetSection&&c.id!==id);
 const index=beforeId?others.findIndex(c=>c.id===beforeId):-1;
 if(index>=0)others.splice(index,0,source);else others.push(source);
 cardMoveBusy=true;
 try{
  // Alterar primeiro a mesa do cartão; outras produções não são modificadas.
  const nextOrder=index>=0?index:others.length-1;
  const q=await sb.from('lm_cards').update({section_id:targetSection,display_order:nextOrder}).eq('id',id).eq('author_id',user.id).select('id').single();
  if(q.error)throw q.error;
  // Salvar ordem dos cartões da mesa de destino.
  for(let i=0;i<others.length;i++){
   if(others[i].id===id)continue;
   const p=await sb.from('lm_cards').update({display_order:i}).eq('id',others[i].id).eq('author_id',user.id);
   if(p.error)throw p.error;
  }
  undoCardMove={id,section_id:source.section_id,display_order:source.display_order};
  await refresh();
  const notice=document.getElementById('moveCardNotice');if(notice){notice.hidden=false;notice.querySelector('span').textContent='Cartão movido para '+target.title+'.';}
 }catch(err){msg('Não foi possível mover: '+err.message,'status',true);await refresh()}finally{cardMoveBusy=false}
}
async function undoLastCardMove(){
 if(!undoCardMove)return;
 const old=undoCardMove;undoCardMove=null;
 const q=await sb.from('lm_cards').update({section_id:old.section_id,display_order:old.display_order}).eq('id',old.id).eq('author_id',user.id);
 if(q.error)return msg('Não foi possível desfazer: '+q.error.message,'status',true);
 document.getElementById('moveCardNotice').hidden=true;await refresh();msg('Movimentação desfeita.');
}

function selectMoveDestination(id){if(cardMoveBusy||!mural||mural.owner_id!==user.id)return;const c=cards.find(x=>x.id===id);if(!c||c.origin==='student')return;const options=sections.map((s,i)=>(i+1)+' - '+s.title).join('\n');const answer=prompt('Mover '+c.title+' para qual mesa?\n'+options+'\nDigite o número:');if(answer===null)return;const i=Number(answer)-1;if(!Number.isInteger(i)||i<0||i>=sections.length)return msg('Mesa inválida.','status',true);if(sections[i].id===c.section_id)return;moveMuralCard(id,sections[i].id)}

let workspaceZoom=100,sectionMoveBusy=false;
function changeWorkspaceZoom(step){workspaceZoom=Math.max(60,Math.min(150,workspaceZoom+step));applyWorkspaceZoom()}
function resetWorkspaceZoom(){workspaceZoom=100;applyWorkspaceZoom()}
function applyWorkspaceZoom(){const node=$('sections');if(!node)return;node.style.zoom=String(workspaceZoom/100);$('workspaceZoomLabel').textContent=workspaceZoom+'%';try{sessionStorage.setItem('labmaker-workspace-zoom',String(workspaceZoom))}catch(e){}}
try{const saved=Number(sessionStorage.getItem('labmaker-workspace-zoom'));if(saved>=60&&saved<=150)workspaceZoom=saved}catch(e){}
function setupSectionMovement(){
 const root=$('sections');if(!root||!mural||mural.owner_id!==user.id)return;
 root.querySelectorAll('[data-move-section]').forEach(handle=>{
  const id=handle.dataset.moveSection;let origin=null,dragging=false;
  handle.draggable=true;
  handle.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',id);e.dataTransfer.effectAllowed='move';origin=id;handle.closest('.section').classList.add('section-moving')});
  handle.addEventListener('dragend',()=>{origin=null;root.querySelectorAll('.section-moving,.section-drop-target').forEach(x=>x.classList.remove('section-moving','section-drop-target'))});
  handle.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;origin={id,x:e.clientX,y:e.clientY};dragging=false;handle.setPointerCapture(e.pointerId)});
  handle.addEventListener('pointermove',e=>{if(!origin||typeof origin!=='object')return;if(!dragging&&Math.hypot(e.clientX-origin.x,e.clientY-origin.y)<12)return;dragging=true;root.querySelectorAll('.section-drop-target').forEach(x=>x.classList.remove('section-drop-target'));const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-drop-section]');if(target)target.classList.add('section-drop-target')});
  handle.addEventListener('pointerup',e=>{if(!origin||typeof origin!=='object')return;const id=origin.id,wasDragging=dragging;origin=null;dragging=false;root.querySelectorAll('.section-drop-target').forEach(x=>x.classList.remove('section-drop-target'));if(!wasDragging)return;handle.dataset.skipClick='1';const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-drop-section]');if(target)moveSectionTo(id,target.dataset.dropSection)});
  handle.addEventListener('pointercancel',()=>{origin=null;dragging=false});
  handle.addEventListener('click',()=>{if(handle.dataset.skipClick==='1'){handle.dataset.skipClick='';return}const choices=sections.map((s,i)=>(i+1)+' - '+s.title).join('\n');const answer=prompt('Mover esta mesa para qual posição?\n'+choices);if(answer===null)return;const n=Number(answer);if(Number.isInteger(n)&&n>=1&&n<=sections.length)moveSectionTo(id,sections[n-1].id)});
 });
 root.querySelectorAll('[data-drop-section]').forEach(target=>{
  target.addEventListener('dragover',e=>{if(!e.dataTransfer.types.includes('text/plain'))return;e.preventDefault();target.classList.add('section-drop-target')});
  target.addEventListener('dragleave',()=>target.classList.remove('section-drop-target'));
  target.addEventListener('drop',e=>{const id=e.dataTransfer.getData('text/plain');if(!sections.some(s=>s.id===id))return;e.preventDefault();e.stopPropagation();target.classList.remove('section-drop-target');moveSectionTo(id,target.dataset.dropSection)});
 });
 applyWorkspaceZoom();
}
async function moveSectionTo(sourceId,targetId){
 if(sectionMoveBusy||sourceId===targetId||!mural||mural.owner_id!==user.id)return;
 const ordered=[...sections],from=ordered.findIndex(s=>s.id===sourceId),to=ordered.findIndex(s=>s.id===targetId);
 if(from<0||to<0)return;
 ordered.splice(to,0,ordered.splice(from,1)[0]);sectionMoveBusy=true;
 try{await reorderSections(ordered)}finally{sectionMoveBusy=false}
}

function applyCardFilters(){
 const root=$('sections'),search=$('muralSearch'),bySection=$('muralFilterSection'),byStatus=$('muralFilterStatus'),counter=$('muralFilterCount');
 if(!root||!search||!bySection||!byStatus||!counter)return;
 const previous=bySection.value;
 bySection.replaceChildren(new Option('Todas as mesas',''));
 for(const section of sections)bySection.add(new Option(section.title,section.id));
 bySection.value=sections.some(s=>s.id===previous)?previous:'';
 const query=search.value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),status=byStatus.value;
 const normalize=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 let shown=0;
 for(const el of root.querySelectorAll('[data-drop-section]')){
  const sectionId=el.dataset.dropSection,allowSection=!bySection.value||bySection.value===sectionId;
  let visibleHere=0;
  for(const post of el.querySelectorAll('[data-drag-card]')){
   const card=cards.find(c=>c.id===post.dataset.dragCard);
   const text=card?normalize([card.title,card.body,card.author_label,JSON.stringify(card.elements||[])].join(' ')):'';
   const allowed=!!card&&allowSection&&(!status||(card.moderation_status||'approved')===status)&&(!query||text.includes(query));
   post.classList.toggle('filter-hidden',!allowed);
   if(allowed){visibleHere++;shown++}
  }
  const hasFilters=!!(query||status||bySection.value);
  el.classList.toggle('filter-hidden',!allowSection||(hasFilters&&visibleHere===0));
 }
 counter.textContent=shown+' cartão(ões) encontrado(s)';
}
function clearCardFilters(){
 for(const id of ['muralSearch','muralFilterSection','muralFilterStatus']){const el=$(id);if(el)el.value=''}
 applyCardFilters();
}

async function toggleSectionLock(id){if(!mural||mural.owner_id!==user.id)return;const s=sections.find(x=>x.id===id);if(!s)return;const next=!s.locked;const q=await sb.from('lm_sections').update({locked:next}).eq('id',id).eq('mural_id',mural.id).select('id').single();if(q.error)return msg(q.error.message,'status',true);await refresh();msg(next?'Seção bloqueada.':'Seção desbloqueada.')}
async function toggleCardLock(id){if(!mural||mural.owner_id!==user.id)return;const c=cards.find(x=>x.id===id);if(!c)return;const s=sections.find(x=>x.id===c.section_id);if(s?.locked)return msg('Desbloqueie a seção antes.','status',true);const next=!c.locked;const q=await sb.from('lm_cards').update({locked:next}).eq('id',id).eq('author_id',user.id).select('id').single();if(q.error)return msg(q.error.message,'status',true);await refresh();msg(next?'Cartão bloqueado.':'Cartão desbloqueado.')}

const pedagogicalPresets=[
 {id:'poster',name:'🖼️ Cartaz',desc:'Título, mensagem central, informações e conclusão.',sections:[['Ideia principal','Tema do cartaz','Qual mensagem o público precisa compreender?'],['Informações','Pontos importantes','Organize as informações mais relevantes do tema.'],['Elementos visuais','Imagens e ilustrações','Inclua imagens e legendas relacionadas ao assunto.'],['Conclusão','Mensagem final','Escreva uma conclusão ou convite à reflexão.']]},
 {id:'research',name:'🔬 Pesquisa',desc:'Pergunta, hipótese, investigação e resultados.',sections:[['Pergunta','O que vamos investigar?','Descreva o problema ou a pergunta da pesquisa.'],['Hipótese','Nossa hipótese','Registre a previsão inicial do grupo.'],['Investigação','Como pesquisamos','Anote fontes, experimentos e evidências.'],['Resultados','O que descobrimos','Apresente resultados e referências.'],['Conclusão','Aprendizagens','Explique o que a equipe aprendeu.']]},
 {id:'mindmap',name:'🧠 Mapa mental',desc:'Tema central e ramificações de ideias.',sections:[['Tema central','Assunto principal','Escreva o conceito que será explorado.'],['Conceitos','Ideias relacionadas','Liste palavras-chave e conceitos associados.'],['Conexões','Relações entre ideias','Explique como os conceitos se conectam.'],['Síntese','Mapa final','Organize a síntese visual do grupo.']]},
 {id:'exhibition',name:'🏛️ Exposição',desc:'Abertura, obras das equipes e reflexão coletiva.',sections:[['Boas-vindas','Sobre nossa exposição','Apresente o objetivo e o tema da exposição.'],['Produções','Trabalhos das equipes','Cada equipe publica seu trabalho e uma breve explicação.'],['Processo','Bastidores','Compartilhe como as produções foram desenvolvidas.'],['Reflexões','O que aprendemos','Registre descobertas e comentários finais.']]}
 ,{id:'ad-guided',name:'📢 Propaganda guiada',desc:'Criação orientada de anúncios e campanhas: produto, público, slogan, argumentos, imagem e chamada.',sections:[
 ['Produto ou campanha','O que vamos divulgar?','Escolha o produto, projeto ou campanha. Explique a proposta em uma frase.'],
 ['Público-alvo','Para quem é a propaganda?','Defina a quem a mensagem se destina e quais necessidades atende.'],
 ['Slogan','Nossa frase de impacto','Crie uma frase curta, original e fácil de lembrar.'],
 ['Argumentos','Por que escolher esta ideia?','Apresente qualidades, benefícios e informações verificáveis.'],
 ['Imagem e identidade visual','Como vamos chamar atenção?','Selecione cores, fotografias ou desenhos próprios e organize o visual.'],
 ['Chamada final','Qual ação queremos incentivar?','Finalize com um convite claro: conheça, participe, descubra ou apoie.']
 ]},
 {id:'ad-free',name:'🎨 Propaganda livre',desc:'Espaço de criação aberta para anúncios visuais, com o editor livre e suas formas, imagens, cores e textos.',sections:[
 ['Ateliê de propaganda','Crie seu cartaz visual','Clique em + Card nesta mesa e escolha o modo 🎨 Livre. Use textos, formas, imagens e desenhos para montar seu anúncio. Dica: inclua uma mensagem principal, slogan e chamada final.']
 ]}

];
function openPedagogicalTemplates(){
 const dialog=$('pedagogicalDialog'),root=$('pedagogicalChoices');if(!dialog||!root)return;
 root.replaceChildren();
 for(const preset of pedagogicalPresets){
  const button=document.createElement('button');button.type='button';button.className='pedagogical-choice';
  const title=document.createElement('strong');title.textContent=preset.name;
  const desc=document.createElement('span');desc.textContent=preset.desc;
  button.append(title,desc);button.onclick=()=>createPedagogicalMural(preset.id);
  root.appendChild(button);
 }
 dialog.showModal();
}
async function createPedagogicalMural(presetId){
 if(replicationBusy||!user)return;
 const preset=pedagogicalPresets.find(x=>x.id===presetId),classId=$('classSelect').value;
 if(!preset||!classId)return msg('Selecione uma turma antes de criar o modelo.','status',true);
 const title=prompt('Título do novo mural:',preset.name.replace(/^[^\p{L}]+/u,'').trim());
 if(!title?.trim())return;
 if(!confirm('Criar um novo mural com o modelo '+preset.name+' nesta turma?'))return;
 replicationBusy=true;let created=null;
 try{
  const mr=await sb.from('lm_murals').insert({class_id:classId,owner_id:user.id,title:title.trim(),description:preset.desc,student_enabled:false}).select('id').single();
  if(mr.error)throw mr.error;created=mr.data.id;
  for(let i=0;i<preset.sections.length;i++){
   const [name,heading,guide]=preset.sections[i];
   const section=await sb.from('lm_sections').insert({mural_id:created,title:name,position:i}).select('id').single();
   if(section.error)throw section.error;
   const card=await sb.from('lm_cards').insert({section_id:section.data.id,author_id:user.id,title:heading,author_label:'Orientação do professor',body:guide,elements:[],layout:'organized',origin:'teacher'});
   if(card.error)throw card.error;
  }
  $('pedagogicalDialog').close();await selectClass();
  await openMural(created);msg('Modelo pedagógico criado. Revise os cartões antes de compartilhar.');
 }catch(e){msg('Não foi possível concluir o modelo: '+e.message+(created?' Um mural parcial pode ter sido criado; revise a turma.':''),'status',true)}
 finally{replicationBusy=false}
}


function createClassPoll(){
 if(!mural||mural.owner_id!==user.id)return;
 const form=$('pollCreateForm');form.reset();$('pollCreateStatus').textContent='';
 $('pollCreateDialog').showModal();
}
async function submitClassPoll(event){
 event.preventDefault();
 if(!mural||mural.owner_id!==user.id)return;
 const question=$('pollQuestion').value.trim();
 const options=[...document.querySelectorAll('#pollCreateForm .poll-option')].map(el=>el.value.trim()).filter(Boolean);
 const status=$('pollCreateStatus'),button=$('pollCreateSubmit');
 if(question.length<3||question.length>250||options.length<2||options.length>6||options.some(x=>x.length>120)){
  status.textContent='Informe uma pergunta (3 a 250 caracteres) e de 2 a 6 alternativas (até 120 caracteres cada).';return;
 }
 button.disabled=true;status.textContent='Salvando enquete…';
 try{
  const result=await sb.from('lm_polls').insert({mural_id:mural.id,question,options});
  if(result.error)throw result.error;
  $('pollCreateDialog').close();msg('Enquete criada! Os alunos podem votar pelo link do mural.');
 }catch(err){status.textContent='Não foi possível criar: '+err.message}
 finally{button.disabled=false}
}

async function openPollResults(){
 if(!mural||mural.owner_id!==user.id)return;
 $('pollResultsDialog').showModal();
 await refreshPollResults();
}
async function refreshPollResults(){
 const root=$('pollResultsList');root.textContent='Carregando resultados…';
 const result=await sb.rpc('lm_poll_teacher_results',{p_mural:mural.id});
 if(result.error){root.textContent='Erro: '+result.error.message;return}
 const polls=Array.isArray(result.data)?result.data:[];
 root.replaceChildren();
 if(!polls.length){root.textContent='Ainda não há enquetes neste mural.';return}
 for(const poll of polls){
  const item=document.createElement('section');item.className='poll-result-item';
  const heading=document.createElement('h3');heading.textContent=poll.question;item.append(heading);
  const count=Array.isArray(poll.counts)?poll.counts.map(Number):[];
  const total=count.reduce((sum,n)=>sum+(Number.isFinite(n)?n:0),0);
  const summary=document.createElement('p');summary.className='muted';summary.textContent=total+' voto(s) · '+(poll.closed?'Encerrada':'Aberta');item.append(summary);
  (Array.isArray(poll.options)?poll.options:[]).forEach((option,i)=>{
   const n=count[i]||0,pct=total?Math.round(n/total*100):0;
   const row=document.createElement('div');row.className='poll-result-row';
   const labels=document.createElement('div');const name=document.createElement('span');name.textContent=option;
   const value=document.createElement('strong');value.textContent=n+' ('+pct+'%)';labels.append(name,value);
   const track=document.createElement('div');track.className='poll-result-track';
   const fill=document.createElement('div');fill.className='poll-result-fill';fill.style.width=pct+'%';track.append(fill);row.append(labels,track);item.append(row);
  });
  const actions=document.createElement('div');actions.className='poll-result-actions';
  const toggle=document.createElement('button');toggle.className='btn';toggle.textContent=poll.closed?'Reabrir votação':'Encerrar votação';
  toggle.onclick=()=>togglePollClosed(poll.id,!poll.closed);actions.append(toggle);item.append(actions);root.append(item);
 }
}
async function togglePollClosed(id,closed){
 if(!mural||mural.owner_id!==user.id)return;
 const response=await sb.from('lm_polls').update({closed}).eq('id',id).eq('mural_id',mural.id).select('id').single();
 if(response.error)return msg('Erro: '+response.error.message,'status',true);
 await refreshPollResults();
}

async function openCardHistory(id){
 if(!mural||mural.owner_id!==user.id)return;
 const card=cards.find(c=>c.id===id);if(!card)return;
 const dialog=$('cardHistoryDialog'),list=$('cardHistoryList');
 $('cardHistoryTitle').textContent='Histórico — '+card.title;list.textContent='Carregando…';dialog.showModal();
 const r=await sb.rpc('lm_card_history',{p_card:id});
 if(r.error){list.textContent='Erro: '+r.error.message;return}
 list.replaceChildren();
 if(!r.data?.length){list.textContent='Ainda não há versões anteriores. O histórico começa nas próximas edições.';return}
 for(const v of r.data){const item=document.createElement('div');item.className='card-history-entry';
 const title=document.createElement('strong');title.textContent=v.title||'Sem título';
 const date=document.createElement('small');date.textContent=new Date(v.saved_at).toLocaleString('pt-BR');
 const body=document.createElement('p');body.textContent=(v.body||'').slice(0,220);
 const button=document.createElement('button');button.className='btn';button.textContent='Restaurar versão';
 button.onclick=async()=>{if(!confirm('Restaurar esta versão? A versão atual será guardada no histórico.'))return;button.disabled=true;const result=await sb.rpc('lm_restore_card_version',{p_card:id,p_version:v.id});button.disabled=false;if(result.error)return alert(result.error.message);dialog.close();await refresh();msg('Versão restaurada.')};
 item.append(title,date,body,button);list.append(item)}
}

async function deleteWholeMural(id){
 if(replicationBusy||!user)return;
 const entry=murals.find(x=>x.id===id);if(!entry||entry.owner_id!==user.id)return msg('Somente o proprietário pode excluir este mural.','status',true);
 const confirmation=prompt('ATENÇÃO: exclusão definitiva de "'+entry.title+'", incluindo mesas, cartões, enquetes e votos.\n\nPara confirmar, digite EXCLUIR:');
 if(confirmation!=='EXCLUIR')return;
 const button=document.querySelector('[data-delete-mural="'+id+'"]');if(button)button.disabled=true;
 try{
  const result=await sb.from('lm_murals').delete().eq('id',id).eq('owner_id',user.id).eq('class_id',$('classSelect').value).select('id');
  if(result.error)throw result.error;
  if(!result.data?.length)throw Error('O mural não foi excluído. Verifique as permissões.');
  await selectClass();msg('Mural excluído definitivamente.');
 }catch(err){msg('Não foi possível excluir: '+err.message+'. Verifique se há seções ou cartões bloqueados.','status',true)}
 finally{if(button?.isConnected)button.disabled=false}
}

$('postLocalImage').addEventListener('change',async()=>{
 const file=$('postLocalImage').files?.[0];if(!file)return;
 const status=$('postLocalStatus');
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024){status.textContent='Selecione JPG, PNG ou WebP de até 12 MB.';return}
 status.textContent='Otimizando imagem…';
 try{
  const image=await createImageBitmap(file),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  let data='';
  for(const edge of [900,750,600,480,360,280]){
   const scale=Math.min(1,edge/Math.max(image.width,image.height));
   canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
   ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
   for(const quality of [.8,.68,.55,.42,.3,.2]){
    data=canvas.toDataURL('image/jpeg',quality);
    if(data.length<82000)break;
   }
   if(data.length<82000)break;
  }
  image.close();
  if(data.length>=82000)throw Error('Não foi possível compactar esta imagem. Selecione outra.');
  teacherOriginalFile=file;teacherLocalImage=data;$('postLocalPreview').src=data;$('postLocalPreview').hidden=false;
  status.textContent='Imagem pronta ('+canvas.width+' × '+canvas.height+', '+Math.round(data.length*.75/1024)+' KB).';
 }catch(e){status.textContent=e.message||'Erro ao preparar imagem.'}
});

async function openTeacherOriginalImage(cardId){const c=cards.find(x=>x.id===cardId);const record=c?.elements?.find(x=>x.type==='privateImage');if(!record?.path||!record.path.startsWith(user.id+'/'))return;const r=await sb.storage.from('labmaker-mural-files').createSignedUrl(record.path,120);if(r.error)return msg('Não foi possível abrir imagem: '+r.error.message,'status',true);window.open(r.data.signedUrl,'_blank','noopener,noreferrer')}

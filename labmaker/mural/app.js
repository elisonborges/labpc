const sb=supabase.createClient(LM_CONFIG.url,LM_CONFIG.key),$=id=>document.getElementById(id);
let user,classes=[],murals=[],mural=null,sections=[],cards=[],sectionId,card=null,mode='organized',objects=[],selected=-1,channel;
let muralSyncTimer=null,muralSyncPending=false,muralSyncRunning=false,muralSyncSignature='',muralSyncGeneration=0;
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
const options=classes.map(x=>{const o=document.createElement('option');o.value=x.id;o.textContent=[x.grade,'Turma '+x.class_name,x.shift,x.units?.name].join(' · ');return o});
const all=document.createElement('option');all.value='__all__';all.textContent='📁 Todos os meus murais';const free=document.createElement('option');free.value='__free__';free.textContent='🎨 Sem turma';$('classSelect').replaceChildren(all,free,...options);
$('classSelect').value='__all__';
await selectClass()}
function backMurals(){
 stopMuralAutoSync();
 mural=null;
 $('listView').classList.remove('hide');$('muralView').classList.add('hide');
 if(channel){sb.removeChannel(channel);channel=null}
}
async function selectClass(){
 backMurals();const area=$('classSelect').value;try{sessionStorage.setItem('labmaker-selected-area',area)}catch(e){}
 $('muralListTitle').textContent=area==='__all__'?'Meus murais':area==='__free__'?'Murais sem turma':'Murais da turma';
 let q=sb.from('lm_murals').select('*');q=area==='__all__'?q.eq('owner_id',user.id):area==='__free__'?q.is('class_id',null).eq('owner_id',user.id):q.eq('class_id',area);
 const r=await q.order('created_at',{ascending:false});if(r.error)return msg('Não foi possível carregar os murais: '+r.error.message,'status',true);
 murals=r.data||[];updateMuralFilters();showMuralDashboard(muralDashboardTab);
}
function updateMuralFilters(){
 const current=$('muralYearFilter').value,folders=$('muralFolderFilter').value;
 const years=[...new Set(murals.map(m=>m.school_year||new Date(m.created_at).getFullYear()).filter(Boolean))].sort((a,b)=>b-a);
 $('muralYearFilter').replaceChildren(new Option('Todos os anos',''),...years.map(y=>new Option(String(y),String(y))));
 if(years.includes(Number(current)))$('muralYearFilter').value=current;
 const names=[...new Set(murals.map(m=>(m.folder||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
 $('muralFolderFilter').replaceChildren(new Option('Todas as pastas',''),...names.map(n=>new Option(n,n)));
 if(names.includes(folders))$('muralFolderFilter').value=folders;
}
let muralDashboardTab='recent';
function showMuralDashboard(tab){muralDashboardTab=['recent','all','archived'].includes(tab)?tab:'recent';document.querySelectorAll('[data-dashboard-tab]').forEach(b=>{const active=b.dataset.dashboardTab===muralDashboardTab;b.classList.toggle('is-active',active);b.setAttribute('aria-pressed',String(active))});$('muralArchiveFilter').checked=muralDashboardTab==='archived';$('muralListTitle').textContent=muralDashboardTab==='archived'?'Murais arquivados':muralDashboardTab==='recent'?'Projetos recentes':'Todos os meus murais';$('muralListSubtitle').textContent=muralDashboardTab==='archived'?'Seus projetos guardados, sem perder os trabalhos.':muralDashboardTab==='recent'?'Continue de onde parou.':'Explore e organize sua coleção de projetos.';renderMuralList()}
function muralDashboardVisual(m){
 const key=Object.prototype.hasOwnProperty.call(lmWallpapers,m.background_pattern)?m.background_pattern:'solid';
 const wallpaper=lmWallpapers[key],color=/^#[0-9a-f]{6}$/i.test(m.theme_color)?m.theme_color:'#edf6ff';
 const image=wallpaper.background==='none'?'none':wallpaper.background;
 return 'background-color:'+color+';background-image:'+image+';background-size:'+wallpaper.size+';';
}
async function personalizeMuralFromCard(id){
 const m=murals.find(x=>x.id===id);if(!m||m.owner_id!==user.id)return;
 await openMural(id);
 openMuralPersonalization();
}
function renderMuralList(){
 const y=$('muralYearFilter').value,f=$('muralFolderFilter').value,arch=$('muralArchiveFilter').checked;
 const filtered=murals.filter(m=>!!m.archived===arch&&(!y||String(m.school_year||new Date(m.created_at).getFullYear())===y)&&(!f||m.folder===f)).slice(0,muralDashboardTab==='recent'?6:undefined);
 $('murals').innerHTML=filtered.map(m=>'<article class="tile labmaker-mural-card"><div class="lm-recent-card-wallpaper" aria-hidden="true" style="'+muralDashboardVisual(m)+'"></div><div class="labmaker-card-header"><h3>'+esc(m.title)+'</h3>'+(m.owner_id===user.id?'<details class="labmaker-card-menu"><summary aria-label="Mais opções do mural '+esc(m.title)+'" title="Mais opções">⋯</summary><div class="labmaker-card-menu-items"><button type="button" data-edit-mural="'+m.id+'">✎ Editar informações</button><button type="button" data-customize-mural="'+m.id+'">🎨 Personalizar aparência</button><button type="button" data-organize-mural="'+m.id+'">📁 Organizar</button>'+(classes.length?'<button type="button" data-copy-mural="'+m.id+'">⧉ Duplicar para turma</button>':'')+'<button type="button" data-save-template="'+m.id+'">▤ Salvar modelo</button><button type="button" data-archive-mural="'+m.id+'">'+(m.archived?'↩ Restaurar':'📦 Arquivar')+'</button><button type="button" class="danger" data-delete-mural="'+m.id+'">🗑 Excluir</button></div></details>':'')+'</div><p class="labmaker-card-description">'+esc(m.description||'')+'</p><p class="muted labmaker-card-meta">'+esc(String(m.school_year||new Date(m.created_at).getFullYear()))+' · '+esc(m.folder||'Sem pasta')+(m.class_id?' · Turma vinculada':' · Independente')+'</p><div class="tile-actions"><button class="btn primary" type="button" data-open="'+m.id+'">Abrir mural</button><button class="btn tile-share" type="button" data-share="'+m.id+'">↗ Compartilhar</button></div></article>').join('')||'<div class="labmaker-empty"><div class="labmaker-empty-icon">📂</div><strong>'+(muralDashboardTab==='archived'?'Nenhum mural arquivado':muralDashboardTab==='recent'?'Nenhum projeto recente':'Nenhum mural encontrado')+'</strong><p>Comece um novo projeto ou ajuste os filtros para encontrar seus trabalhos.</p><button class="btn primary" onclick="openNewMuralDialog()">＋ Criar mural</button></div>';
 const actions={'open':openMural,'share':shareMural,'edit-mural':openEditMuralDialog,'customize-mural':personalizeMuralFromCard,'copy-mural':duplicateMuralToClass,'organize-mural':organizeMural,'archive-mural':archiveMural,'save-template':saveTemplate,'delete-mural':deleteWholeMural};
 for(const [key,fn] of Object.entries(actions))$('murals').querySelectorAll('[data-'+key+']').forEach(b=>b.onclick=()=>{b.closest('.labmaker-card-menu')?.removeAttribute('open');fn(b.getAttribute('data-'+key))});
 $('murals').querySelectorAll('.labmaker-card-menu').forEach(menu=>menu.addEventListener('toggle',()=>{if(menu.open)$('murals').querySelectorAll('.labmaker-card-menu').forEach(other=>{if(other!==menu)other.open=false})}));
}
function insertMuralTitleEmoji(emoji){
 const field=$('editMuralTitle');
 if(!field)return;
 const begin=field.selectionStart??field.value.length,end=field.selectionEnd??begin;
 const newTitle=field.value.slice(0,begin)+emoji+field.value.slice(end);
 if(newTitle.length>field.maxLength){$('editMuralStatus').textContent='O título atingiu o limite de 120 caracteres.';return}
 field.setRangeText(emoji,begin,end,'end');
 field.dispatchEvent(new Event('input',{bubbles:true}));
 $('editMuralEmojiPicker').open=false;
 field.focus();
}
document.querySelectorAll('[data-mural-title-emoji]').forEach(button=>{
 button.addEventListener('click',()=>insertMuralTitleEmoji(button.dataset.muralTitleEmoji));
});
function openEditMuralDialog(id){
 const m=murals.find(x=>x.id===id);if(!m||m.owner_id!==user.id)return;
 $('editMuralId').value=id;$('editMuralTitle').value=m.title||'';$('editMuralDescription').value=m.description||'';$('editMuralYear').value=m.school_year||new Date(m.created_at).getFullYear();$('editMuralFolder').value=m.folder||'';
 $('editMuralStatus').textContent='';$('editMuralDialog').showModal();$('editMuralTitle').focus();
}
async function saveMuralDetails(){
 const id=$('editMuralId').value,m=murals.find(x=>x.id===id);if(!m||m.owner_id!==user.id)return;
 const title=$('editMuralTitle').value.trim(),description=$('editMuralDescription').value.trim(),folder=$('editMuralFolder').value.trim(),school_year=Number($('editMuralYear').value);
 if(!title||title.length>120||description.length>1200||folder.length>80||!Number.isInteger(school_year)||school_year<2000||school_year>2100){$('editMuralStatus').textContent='Confira título, descrição, pasta e ano letivo.';return}
 const save=$('editMuralSave');save.disabled=true;$('editMuralStatus').textContent='Salvando alterações...';
 try{
  const result=await sb.from('lm_murals').update({title,description,folder,school_year}).eq('id',id).eq('owner_id',user.id).select('id').single();
  if(result.error)throw result.error;
  Object.assign(m,{title,description,folder,school_year});
  if(mural?.id===id){Object.assign(mural,{title,description,folder,school_year});$('muralTitle').textContent=title;updateMuralDescription()}
  $('editMuralDialog').close();updateMuralFilters();renderMuralList();msg('Informações do mural atualizadas.');
 }catch(e){$('editMuralStatus').textContent='Erro ao salvar: '+e.message}finally{save.disabled=false}
}
function openNewMuralDialog(){
 $('newMuralForm').reset();$('newMuralYear').value=new Date().getFullYear();
 $('newMuralClass').replaceChildren(new Option('Sem turma — mural independente',''),...classes.map(c=>new Option([c.grade,'Turma '+c.class_name,c.shift,c.units?.name].join(' · '),c.id)));
 $('newMuralStatus').textContent='';$('newMuralDialog').showModal();
}
async function createMural(){
 const title=$('newMuralTitle').value.trim(),description=$('newMuralDescription').value.trim(),folder=$('newMuralFolder').value.trim();
 const year=Number($('newMuralYear').value),class_id=$('newMuralClass').value||null;
 if(!title||title.length>120||folder.length>80||year<2000||year>2100)return $('newMuralStatus').textContent='Confira o título, a pasta e o ano letivo.';
 const button=$('newMuralSubmit');button.disabled=true;$('newMuralStatus').textContent='Criando mural...';
 try{
  const r=await sb.from('lm_murals').insert({class_id,owner_id:user.id,title,description,folder,school_year:year}).select('id').single();if(r.error)throw r.error;
  const initial=await sb.from('lm_sections').insert({mural_id:r.data.id,title:'Publicações',position:0});if(initial.error)throw Error('Mural criado, mas a área de publicação falhou: '+initial.error.message);
  $('newMuralDialog').close();$('classSelect').value='__all__';$('muralArchiveFilter').checked=false;$('muralYearFilter').value='';$('muralFolderFilter').value='';
  await selectClass();await openMural(r.data.id);msg('Mural criado e associado à sua conta.');
 }catch(e){$('newMuralStatus').textContent='Erro: '+e.message}finally{button.disabled=false}
}
async function organizeMural(id){
 const m=murals.find(x=>x.id===id);if(!m||m.owner_id!==user.id)return;
 const folder=prompt('Pasta ou categoria do mural (vazio = sem pasta):',m.folder||'');if(folder===null)return;
 if(folder.trim().length>80)return msg('A pasta pode ter até 80 caracteres.','status',true);
 const yearInput=prompt('Ano letivo (2000 a 2100):',String(m.school_year||new Date(m.created_at).getFullYear()));if(yearInput===null)return;
 const year=Number(yearInput);if(!Number.isInteger(year)||year<2000||year>2100)return msg('Informe um ano letivo válido.','status',true);
 const r=await sb.from('lm_murals').update({folder:folder.trim(),school_year:year}).eq('id',id).eq('owner_id',user.id).select('id').single();
 if(r.error)return msg('Erro ao organizar: '+r.error.message,'status',true);await selectClass();msg('Organização atualizada.');
}
async function archiveMural(id){
 const m=murals.find(x=>x.id===id);if(!m||m.owner_id!==user.id)return;
 const next=!m.archived;
 const r=await sb.from('lm_murals').update({archived:next}).eq('id',id).eq('owner_id',user.id).select('id').single();
 if(r.error)return msg('Erro ao arquivar: '+r.error.message,'status',true);
 await selectClass();msg(next?'Mural arquivado sem excluir trabalhos.':'Mural restaurado.');
}
const lmWallpapers={
 solid:{name:'Liso',emoji:'⬜',background:'none',size:'auto'},
 dots:{name:'Pontinhos',emoji:'🔵',background:'radial-gradient(#719ac455 1px,transparent 1px)',size:'18px 18px'},
 grid:{name:'Quadriculado',emoji:'▦',background:'linear-gradient(#719ac455 1px,transparent 1px),linear-gradient(90deg,#719ac455 1px,transparent 1px)',size:'24px 24px'},
 rainbow:{name:'Arco-íris',emoji:'🌈',background:'linear-gradient(125deg,#fff0bf 0%,#ffdce9 32%,#e2dcff 67%,#d5f6f5 100%)',size:'cover'},
 shapes:{name:'Geométrico',emoji:'🎨',background:'radial-gradient(circle at 15% 20%,#ffd9e4 0 38px,transparent 39px),radial-gradient(circle at 78% 66%,#cee9ff 0 56px,transparent 57px),linear-gradient(130deg,#fff9df,#ecddff)',size:'340px 270px,410px 310px,cover'},
 stars:{name:'Sonhos',emoji:'✨',background:'radial-gradient(circle,#ffe7a1 1.5px,transparent 2.5px),linear-gradient(120deg,#e5e0ff,#dceeff 60%,#ffeafa)',size:'38px 38px,cover'},
 school:{name:'Escolar',emoji:'📚',background:'repeating-linear-gradient(0deg,transparent 0 32px,#8ac2ff45 33px 34px),linear-gradient(130deg,#fff9df,#dff2ff)',size:'auto'},
 nature:{name:'Natureza',emoji:'🌿',background:'radial-gradient(ellipse at 10% 20%,#bde9c5 0 40px,transparent 42px),radial-gradient(ellipse at 82% 72%,#d3f0b4 0 65px,transparent 67px),linear-gradient(125deg,#e9ffdd,#e4f7fa)',size:'340px 280px,400px 350px,cover'},
 space:{name:'Espacial',emoji:'🚀',background:'radial-gradient(circle,#fff9d6 1px,transparent 2px),linear-gradient(125deg,#29385f,#4f4292 65%,#274d80)',size:'35px 35px,cover'}
};
function updateMuralDescription(){
 const el=$('muralDescription');if(!el)return;
 const description=String(mural?.description||'').trim();
 el.textContent=description;el.hidden=!description;
}
function applyMuralTheme(){
 if(!mural)return;
 const el=$('muralView'),pattern=mural.background_pattern||'solid',wall=lmWallpapers[pattern]||lmWallpapers.solid;
 const color=/^#[0-9a-f]{6}$/i.test(mural.theme_color)?mural.theme_color:'#edf6ff';
 el.style.backgroundColor=color;el.style.backgroundImage=wall.background;el.style.backgroundSize=wall.size;el.style.setProperty('--lm-wallpaper-image',wall.background);el.style.setProperty('--lm-wallpaper-size',wall.size);
 el.classList.toggle('lm-space-theme',pattern==='space');
}
function renderMuralPersonalization(){
 const root=$('lmPersonalizeChoices');if(!root||!mural)return;
 root.replaceChildren();
 for(const [key,wall] of Object.entries(lmWallpapers)){
  const btn=document.createElement('button');btn.type='button';btn.className='lm-wallpaper-option';btn.dataset.wallpaper=key;
  btn.textContent=wall.emoji+' '+wall.name;btn.setAttribute('aria-pressed',String((mural.background_pattern||'solid')===key));
  btn.onclick=()=>saveMuralVisual({background_pattern:key});root.appendChild(btn);
 }
 const color=$('lmVisualColor');if(color)color.value=/^#[0-9a-f]{6}$/i.test(mural.theme_color)?mural.theme_color:'#edf6ff';
 const checkbox=$('lmVisualMotion');if(checkbox)checkbox.checked=localStorage.getItem('lm-reduced-motion')!=='true';
}

let lmCoverDraft=null;
function lmValidCoverData(value){
 return typeof value==='string'&&value.length<=350000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value);
}
function lmCoverAppearance(){
 const image=lmValidCoverData(lmCoverDraft)?lmCoverDraft:(lmCoverDraft===null?mural?.cover_image_data:null);
 const fit=$('lmCoverFit')?.value||mural?.cover_fit||'cover';
 const tone=$('lmCoverTone')?.value||mural?.cover_overlay_tone||'dark';
 const overlay=Number($('lmCoverOverlay')?.value??mural?.cover_overlay??35);
 const preview=$('lmCoverPreview');
 if(!preview)return;
 const wall=lmWallpapers[mural?.background_pattern||'solid']||lmWallpapers.solid;
 const tint=tone==='light'?'255,255,255':'0,20,45';
 const amount=Math.max(0,Math.min(80,overlay))/100;
 if(lmValidCoverData(image)){
  preview.style.backgroundImage='linear-gradient(rgba('+tint+','+amount+'),rgba('+tint+','+amount+')),url("'+image+'")';
  preview.style.backgroundSize='cover,'+(fit==='center'?'auto':fit);
 }else{
  preview.style.backgroundImage=wall.background;
  preview.style.backgroundSize=wall.size;
 }
 preview.style.backgroundColor=mural?.theme_color||'#edf6ff';
 $('lmCoverPreviewTitle').textContent=mural?.title||'Projeto';
 $('lmCoverPreviewDescription').textContent=mural?.description||'';
 $('lmCoverOverlayValue').textContent=Math.round(overlay)+'%';
}
function lmLoadCoverOptions(){
 lmCoverDraft=null;
 $('lmCoverFit').value=['cover','contain','center'].includes(mural?.cover_fit)?mural.cover_fit:'cover';
 $('lmCoverTone').value=mural?.cover_overlay_tone==='light'?'light':'dark';
 $('lmCoverOverlay').value=Number.isFinite(Number(mural?.cover_overlay))?mural.cover_overlay:35;
 $('lmCoverFile').value='';
 $('lmCoverStatus').textContent='';
 lmCoverAppearance();
}
async function lmCoverFileToData(file){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Escolha uma imagem JPG, PNG ou WebP.');
 if(file.size>12*1024*1024)throw Error('Escolha uma imagem de até 12 MB.');
 const img=await createImageBitmap(file);
 try{
  const maxEdge=1500,ratio=Math.min(1,maxEdge/Math.max(img.width,img.height));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(img.width*ratio));
  canvas.height=Math.max(1,Math.round(img.height*ratio));
  const ctx=canvas.getContext('2d');
  if(!ctx)throw Error('O navegador não conseguiu preparar a imagem.');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(img,0,0,canvas.width,canvas.height);
  for(const quality of [.85,.75,.65,.53,.42,.3]){
   const data=canvas.toDataURL('image/jpeg',quality);
   if(data.length<=330000)return data;
  }
  // Gradually reduce dimensions rather than reject a detailed artistic image.
  for(const factor of [.8,.65,.5,.4]){
   const smaller=document.createElement('canvas');
   smaller.width=Math.max(1,Math.round(canvas.width*factor));
   smaller.height=Math.max(1,Math.round(canvas.height*factor));
   smaller.getContext('2d').drawImage(canvas,0,0,smaller.width,smaller.height);
   const data=smaller.toDataURL('image/jpeg',.65);
   if(data.length<=330000)return data;
  }
  throw Error('A imagem não pôde ser otimizada para a capa.');
 }finally{img.close()}
}
$('lmCoverFile').addEventListener('change',async event=>{
 const file=event.target.files?.[0];if(!file)return;
 const status=$('lmCoverStatus');status.textContent='Preparando imagem…';
 try{
  lmCoverDraft=await lmCoverFileToData(file);
  lmCoverAppearance();
  status.textContent='Prévia pronta. Clique em Salvar capa para confirmar.';
 }catch(err){status.textContent=err.message}
});
['lmCoverFit','lmCoverTone','lmCoverOverlay'].forEach(id=>$(id).addEventListener('input',lmCoverAppearance));
$('lmCoverSave').addEventListener('click',async()=>{
 if(!mural||mural.owner_id!==user.id)return;
 const button=$('lmCoverSave'),status=$('lmCoverStatus');
 button.disabled=true;status.textContent='Salvando capa…';
 const patch={
  cover_fit:$('lmCoverFit').value,
  cover_overlay_tone:$('lmCoverTone').value,
  cover_overlay:Number($('lmCoverOverlay').value)
 };
 if(lmValidCoverData(lmCoverDraft))patch.cover_image_data=lmCoverDraft;
 try{
  const result=await sb.from('lm_murals').update(patch).eq('id',mural.id).eq('owner_id',user.id).select('id').single();
  if(result.error)throw result.error;
  Object.assign(mural,patch);
  lmCoverDraft=null;status.textContent='Capa salva para este projeto.';
 }catch(err){status.textContent='Erro ao salvar: '+err.message}
 finally{button.disabled=false}
});
$('lmCoverRemove').addEventListener('click',async()=>{
 if(!mural||mural.owner_id!==user.id)return;
 const button=$('lmCoverRemove'),status=$('lmCoverStatus');
 button.disabled=true;
 try{
  const result=await sb.from('lm_murals').update({cover_image_data:null}).eq('id',mural.id).eq('owner_id',user.id).select('id').single();
  if(result.error)throw result.error;
  mural.cover_image_data=null;lmCoverDraft=null;$('lmCoverFile').value='';
  lmCoverAppearance();status.textContent='Imagem removida. Capa voltou ao papel de parede do mural.';
 }catch(err){status.textContent='Erro ao remover: '+err.message}
 finally{button.disabled=false}
});
function openMuralPersonalization(){if(!mural||mural.owner_id!==user.id)return;renderMuralPersonalization();lmLoadCoverOptions();$('lmPersonalizeDialog').showModal()}
async function saveMuralVisual(patch){
 if(!mural||mural.owner_id!==user.id)return;
 const status=$('lmVisualStatus');if(status)status.textContent='Salvando...';
 const result=await sb.from('lm_murals').update(patch).eq('id',mural.id).eq('owner_id',user.id).select('id').single();
 if(result.error){if(status)status.textContent='Não foi possível salvar: '+result.error.message;return}
 Object.assign(mural,patch);applyMuralTheme();renderMuralPersonalization();
 if(status)status.textContent='Visual salvo para este mural.';
}
function changeMuralMotion(enabled){
 try{localStorage.setItem('lm-reduced-motion',String(!enabled))}catch(e){}
 document.documentElement.classList.toggle('lm-no-motion',!enabled);
}
try{document.documentElement.classList.toggle('lm-no-motion',localStorage.getItem('lm-reduced-motion')==='true')}catch(e){}
function muralSyncAllowed(){
 // Do not redraw behind an open editor, confirmation dialog or live presentation.
 return !!mural && !$('muralView').classList.contains('hide') &&
  document.visibilityState!=='hidden' &&
  $('slideScreen')?.classList.contains('hide')!==false &&
  !Array.from(document.querySelectorAll('dialog[open]')).length;
}
function stopMuralAutoSync(){
 muralSyncGeneration++;
 if(muralSyncTimer){clearInterval(muralSyncTimer);muralSyncTimer=null}
 muralSyncPending=false;
 muralSyncSignature='';
}
function startMuralAutoSync(){
 if(muralSyncTimer)clearInterval(muralSyncTimer);
 // Realtime is fast when enabled; polling catches missed events, edits and reconnections.
 muralSyncTimer=setInterval(()=>scheduleMuralSync(),10000);
}
function scheduleMuralSync(){
 if(!muralSyncAllowed()||muralSyncRunning){muralSyncPending=true;return}
 void refresh({silent:true});
}
document.addEventListener('visibilitychange',()=>{
 if(document.visibilityState==='visible'&&mural)scheduleMuralSync();
});
window.addEventListener('focus',()=>{if(mural)scheduleMuralSync()});
document.addEventListener('close',()=>{if(mural)queueMicrotask(scheduleMuralSync)},true);
async function openMural(id){
 stopMuralAutoSync();
 mural=murals.find(x=>x.id===id);
 if(!mural)return;
 $('muralTitle').textContent=mural.title;updateMuralDescription();
 $('listView').classList.add('hide');$('muralView').classList.remove('hide');
 $('addSection').disabled=mural.owner_id!==user.id;
 if(channel){await sb.removeChannel(channel);channel=null}
 await refresh();
 if(mural?.id!==id)return;
 applyMuralTheme();renderTeacherControls();
 channel=sb.channel('lm-'+id)
  .on('postgres_changes',{event:'*',schema:'public',table:'lm_cards'},scheduleMuralSync)
  .on('postgres_changes',{event:'*',schema:'public',table:'lm_sections'},scheduleMuralSync)
  .subscribe();
 startMuralAutoSync();
}
async function refresh({silent=false}={}){
 if(!mural)return;
 if(muralSyncRunning){
  if(silent){muralSyncPending=true;return}
  // Keep user actions responsive: the currently running request will be followed by another fetch.
  muralSyncPending=true;
  return;
 }
 muralSyncRunning=true;
 const id=mural.id,generation=muralSyncGeneration;
 try{
  const r=await sb.from('lm_sections').select('*').eq('mural_id',id).order('position');
  if(r.error){if(!silent)msg(r.error.message,'status',true);return}
  const nextSections=r.data||[];
  const c=nextSections.length?
   await sb.from('lm_cards').select('*').in('section_id',nextSections.map(x=>x.id)).order('display_order').order('created_at'):
   {data:[],error:null};
  if(c.error){if(!silent)msg(c.error.message,'status',true);return}
  if(!mural||mural.id!==id||generation!==muralSyncGeneration)return;
  const nextCards=c.data||[];
  const signature=JSON.stringify([nextSections,nextCards]);
  if(silent&&signature===muralSyncSignature)return;
  // Never destroy the user's editor or active presentation with an automatic redraw.
  if(silent&&!muralSyncAllowed()){muralSyncPending=true;return}
  sections=nextSections;cards=nextCards;muralSyncSignature=signature;
  renderSections();renderTeacherControls();
 }finally{
  muralSyncRunning=false;
  if(muralSyncPending&&muralSyncAllowed()){
   muralSyncPending=false;
   // A follow-up fetch handles a change arriving while the previous request was running.
   setTimeout(scheduleMuralSync,250);
  }
 }
}
function objHTML(x,mini=false){const scale=mini?.53:1,xp=Math.max(0,Number(x.x)||0),yp=Math.max(0,Number(x.y)||0),w=Math.max(20,Number(x.w)||90),h=Math.max(20,Number(x.h)||60),color=/^#[a-f0-9]{6}$/i.test(x.color)?x.color:'#ffbd36',type=['text','image','rectangle','circle','triangle'].includes(x.type)?x.type:'text';const bg=['rectangle','circle','triangle'].includes(type)?'background:'+color+';':'';const shape=type==='circle'?'border-radius:50%;':type==='triangle'?'clip-path:polygon(50% 0,0 100%,100% 100%);':'';const content=type==='text'?esc(x.value):type==='image'&&(safeURL(x.value)||teacherInlineImage(x.value))?'<img src="'+esc(x.value)+'" alt="">':'';return '<div class="object" style="left:'+xp*scale+'px;top:'+yp*scale+'px;width:'+w*scale+'px;height:'+h*scale+'px;'+bg+shape+'">'+content+'</div>'}
function teacherRichBody(c){const body=String(c.body||''),ranges=(Array.isArray(c.elements)?c.elements:[]).filter(x=>x.type==='richRange'&&Number.isInteger(x.start)&&Number.isInteger(x.end)&&x.start>=0&&x.end<=body.length&&x.end>x.start).sort((a,b)=>a.start-b.start);let out='',pos=0;for(const x of ranges){if(x.start<pos)continue;out+=esc(body.slice(pos,x.start));const size=[14,16,20,24,30,36].includes(Number(x.size))?Number(x.size):16,color=/^#[0-9a-f]{6}$/i.test(x.color)?x.color:'#09224a';out+='<span style="font-size:'+size+'px;color:'+color+';font-weight:'+(x.bold?'700':'400')+';font-style:'+(x.italic?'italic':'normal')+';text-decoration:'+(x.underline?'underline':'none')+';'+(x.highlight?'background-color:#ffed82;':'')+'">'+esc(body.slice(x.start,x.end))+'</span>';pos=x.end}return out+esc(body.slice(pos))}
document.querySelectorAll('[data-teacher-palette]').forEach(btn=>btn.addEventListener('click',()=>{
 $('postCardColor').value=btn.dataset.teacherPalette;
 document.querySelectorAll('[data-teacher-palette]').forEach(x=>x.setAttribute('aria-pressed',String(x===btn)));
}));
function teacherCardColor(c){const a=(Array.isArray(c.elements)?c.elements:[]).find(x=>x.type==='cardColor');return a&&/^#[0-9a-f]{6}$/i.test(a.value)?a.value:'#ffffff'}
function teacherFontStyle(c){
 const a=Array.isArray(c.elements)?c.elements.find(x=>x.type==='typography'):null;
 if(!a)return '';
 const size=[14,16,20,24,30,36].includes(Number(a.size))?Number(a.size):16;
 const color=/^#[0-9a-f]{6}$/i.test(a.color)?a.color:'#09224a';
 const align=['left','center','right'].includes(a.align)?a.align:'left';
 return 'font-size:'+size+'px;color:'+color+';text-align:'+align+';font-weight:'+(a.bold?'700':'400')+';font-style:'+(a.italic?'italic':'normal')+';text-decoration:'+(a.underline?'underline':'none')+';'+(a.highlight?'background-image:linear-gradient(transparent 60%,#fff09e 60%);':'');
}
function teacherInlineImage(v){return typeof v==='string'&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(v)&&v.length<95000}
function teacherYoutubeEmbed(v){try{const u=new URL(v);let id='';if(u.hostname==='youtu.be')id=u.pathname.split('/')[1];else if(['youtube.com','www.youtube.com','m.youtube.com'].includes(u.hostname))id=u.searchParams.get('v')||u.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/)?.[1];return /^[A-Za-z0-9_-]{11}$/.test(id||'')?'https://www.youtube-nocookie.com/embed/'+id:null}catch{return null}}
function teacherAttachment(c){const a=Array.isArray(c.elements)?c.elements.find(x=>x.type==='attachment'):null;if(!a||!(safeURL(a.value)||a.kind==='image'&&teacherInlineImage(a.value)))return '';const url=esc(a.value),kind=a.kind;const yt=teacherYoutubeEmbed(a.value);if(yt)return '<iframe src="'+esc(yt)+'" title="YouTube" loading="lazy" allowfullscreen style="width:100%;aspect-ratio:16/9;border:0"></iframe>';if(kind==='image')return '<a href="'+url+'" target="_blank" rel="noopener noreferrer"><img src="'+url+'" alt="Anexo do cartão"></a>';if(kind==='video'&&/\.(mp4|webm|ogg)(\?|$)/i.test(a.value))return '<video controls preload="none" style="width:100%" src="'+url+'"></video>';if(kind==='audio'&&/\.(mp3|wav|ogg|m4a)(\?|$)/i.test(a.value))return '<audio controls preload="none" style="width:100%" src="'+url+'"></audio>';return '<p><a target="_blank" rel="noopener noreferrer" href="'+url+'">🔗 Ver anexo ('+esc(kind||'link')+')</a></p>'}
function renderSections(){$('sections').innerHTML=sections.map(s=>'<div class="section" data-drop-section="'+s.id+'"><div class="section-head" style="flex-wrap:wrap"><h3>'+esc(s.title)+' <button type="button" class="labmaker-section-rename" data-rename-section="'+s.id+'" title="Renomear seção" aria-label="Renomear seção '+esc(s.title)+'">✎</button></h3><div style="display:flex;gap:4px;flex-wrap:wrap"><button class="btn" data-new="'+s.id+'">＋ Publicar</button><button class="btn labmaker-section-share" data-share-section="'+s.id+'" title="Copiar link ou QR Code desta seção">↗ Compartilhar</button><button class="btn" data-present-section="'+s.id+'" title="Apresentar apenas as publicações desta turma ou seção">▶ Apresentar</button><button class="btn labmaker-section-more" data-section-actions="'+s.id+'" aria-label="Mais ações da seção" title="Mais ações da seção">⋯</button></div></div>'+cards.filter(c=>c.section_id===s.id).map(c=>'<article class="post lm-color-card" style="background-color:'+teacherCardColor(c)+'" data-drag-card="'+c.id+'"><div class="card-attribution"><span>👤 '+esc(c.author_label?.trim()||'Não identificado')+'</span><span>'+(c.origin==='student'?'Aluno · '+(c.moderation_status==='pending'?'Aguardando':c.moderation_status==='rejected'?'Rejeitado':'Aprovado'):'Professor')+'</span>'+(c.created_at?'<time title="Data da publicação">📅 '+new Date(c.created_at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})+'</time>':'')+'</div><strong>'+esc(c.title)+'</strong>'+(c.layout==='organized'?'<p style="'+teacherFontStyle(c)+'">'+teacherRichBody(c)+'</p>'+teacherAttachment(c)+(safeURL(c.image_url)?'<img src="'+esc(c.image_url)+'" alt="Imagem do cartão">':''):'<div style="height:180px;position:relative;background:#f6f9ff;overflow:hidden;margin-top:8px">'+(Array.isArray(c.elements)?c.elements:[]).map(x=>objHTML(x,true)).join('')+'</div>')+(Array.isArray(c.elements)&&c.elements.some(x=>x.type==='privateMedia')?'<div class="teacher-private-media" data-teacher-media="'+c.id+'">Carregando áudio/vídeo…</div>':'')+(Array.isArray(c.elements)&&c.elements.some(x=>x.type==='privateImage')?'<div class="card-photo" data-card-photo="'+c.id+'">Carregando imagem…</div><p><button class="btn" type="button" data-original-image="'+c.id+'">🖼️ Ver imagem original</button></p>':'')+'<p><button class="btn" type="button" data-present-card="'+c.id+'">▶ Apresentar cartão</button></p>'+'<p>'+(c.author_id===user.id&&c.origin!=='student'?'<button class="btn" data-edit="'+c.id+'">Editar</button> <button class="btn" data-duplicate-card="'+c.id+'">Duplicar</button> <button class="btn" data-card-menu="'+c.id+'" title="Mais ações">⋯</button> <button class="btn" data-lock-card="'+c.id+'">'+(c.locked?'🔓 Desbloquear':'🔒 Bloquear')+'</button> <button class="btn" data-pick-move="'+c.id+'">⠿ Mover</button> <button class="btn btn-danger" data-delete-card="'+c.id+'">Excluir</button>' : c.origin==='student'&&mural.owner_id===user.id?'<button class="btn" data-review="'+c.id+'" data-state="approved">Aprovar</button> <button class="btn" data-review="'+c.id+'" data-state="rejected">Rejeitar</button> <button class="btn btn-danger" data-delete-card="'+c.id+'">Excluir</button>':'<span class="muted tiny">Somente leitura</span>')+'</p></article>').join('')+'</div>').join('')||'<p class="muted">Crie a primeira mesa para começar.</p>';
setupCardDragging();setupSectionMovement();applyCardFilters();$('sections').querySelectorAll('[data-present-card]').forEach(b=>b.onclick=()=>presentSingleCard(b.dataset.presentCard));$('sections').querySelectorAll('[data-present-section]').forEach(b=>b.onclick=()=>presentSection(b.dataset.presentSection));loadPrivateCardPhotos();loadTeacherPrivateMedia();$('sections').querySelectorAll('[data-original-image]').forEach(b=>b.onclick=()=>openTeacherOriginalImage(b.dataset.originalImage));$('sections').querySelectorAll('[data-lock-section]').forEach(b=>b.onclick=()=>toggleSectionLock(b.dataset.lockSection));$('sections').querySelectorAll('[data-lock-card]').forEach(b=>b.onclick=()=>toggleCardLock(b.dataset.lockCard));$('sections').querySelectorAll('[data-pick-move]').forEach(b=>b.onclick=()=>selectMoveDestination(b.dataset.pickMove));$('sections').querySelectorAll('[data-new]').forEach(b=>b.onclick=()=>newCard(b.dataset.new));$('sections').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editCard(b.dataset.edit));$('sections').querySelectorAll('[data-duplicate-section]').forEach(b=>b.onclick=()=>duplicateSection(b.dataset.duplicateSection));$('sections').querySelectorAll('[data-duplicate-card]').forEach(b=>b.onclick=()=>duplicateCard(b.dataset.duplicateCard));$('sections').querySelectorAll('[data-card-menu]').forEach(b=>b.onclick=()=>cardActionsMenu(b.dataset.cardMenu));$('sections').querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>reviewStudentCard(b.dataset.review,b.dataset.state));$('sections').querySelectorAll('[data-delete-card]').forEach(b=>b.onclick=()=>deleteMuralCard(b.dataset.deleteCard));$('sections').querySelectorAll('[data-delete-section]').forEach(b=>b.onclick=()=>deleteMuralSection(b.dataset.deleteSection));$('sections').querySelectorAll('[data-section-actions]').forEach(b=>b.onclick=()=>sectionActions(b.dataset.sectionActions)); $('sections').querySelectorAll('[data-share-section]').forEach(b=>b.onclick=()=>shareSingleSection(b.dataset.shareSection)); $('sections').querySelectorAll('[data-rename-section]').forEach(b=>b.onclick=()=>performSectionAction(b.dataset.renameSection,'1'))}
async function newSection(){if(!mural||mural.owner_id!==user.id)return;const title=prompt('Nome da nova seção (ex.: Turma 1, Projeto A ou Família):','Nova seção');if(!title?.trim())return;const r=await sb.from('lm_sections').insert({mural_id:mural.id,title:title.trim(),position:sections.length});if(r.error)return msg(r.error.message,'status',true);await refresh();msg('Seção criada. Você pode renomeá-la ou compartilhar seu link exclusivo.');if(shareTarget?.id===mural.id){const panel=$('groupSharingPanel');if(panel){panel.open=true;await loadGroupLinks(shareTarget)}}}
let teacherLocalImage='',teacherOriginalFile=null;
function resetTeacherLocalImage(){teacherLocalImage='';teacherOriginalFile=null;$('postLocalImage').value='';$('postLocalPreview').hidden=true;$('postLocalStatus').textContent='Selecione JPG, PNG ou WebP. A imagem será compactada automaticamente.'}
let teacherMediaFile=null;
function newCard(id){$('postCardColor').value='#ffffff';resetTeacherLocalImage();teacherMediaFile=null;$('postMediaFile').value='';$('postMediaStatus').textContent='';$('postMediaUrl').value='';sectionId=id;card=null;objects=[];selected=-1;$('postTitle').value='';$('postAuthor').value='';$('postBody').value='';$('postImage').value='';$('editorStatus').textContent='';setMode('organized');$('editor').showModal()}
function editCard(id){resetTeacherLocalImage();teacherMediaFile=null;$('postMediaFile').value='';$('postMediaStatus').textContent='';$('postMediaUrl').value='';const c=cards.find(x=>x.id===id);if(!c||c.author_id!==user.id||c.origin==='student')return;card=c;sectionId=c.section_id;$('postCardColor').value=teacherCardColor(c);$('postTitle').value=c.title;$('postAuthor').value=c.author_label;$('postBody').value=c.body;$('postImage').value=c.image_url;objects=Array.isArray(c.elements)?JSON.parse(JSON.stringify(c.elements)):[];$('postMediaUrl').value=objects.find(x=>x.type==='attachment'&&safeURL(x.value)&&!x.value.match(/\.(jpg|png|webp)(\?|$)/i))?.value||'';const savedImage=objects.find(x=>x.type==='attachment'&&x.kind==='image'&&teacherInlineImage(x.value));if(savedImage){teacherLocalImage=savedImage.value;$('postLocalPreview').src=teacherLocalImage;$('postLocalPreview').hidden=false;$('postLocalStatus').textContent='Imagem local existente neste cartão.'}selected=-1;setMode(c.layout==='free'?'free':'organized');$('editorStatus').textContent='';$('editor').showModal()}
function setMode(m){mode=m;$('organized').classList.toggle('hide',m!=='organized');$('free').classList.toggle('hide',m!=='free');renderObjects()}
function addObject(type){let value=type==='text'?'Seu texto':'';if(type==='image'){value=prompt('URL HTTPS da imagem:')||'';if(!safeURL(value))return msg('Informe uma imagem HTTPS válida.','editorStatus',true)}objects.push({type,x:15,y:15,w:type==='text'?170:110,h:type==='text'?65:100,value,color:'#ffbd36'});selected=objects.length-1;renderObjects()}
function renderObjects(){$('canvas').innerHTML=objects.map((x,i)=>objHTML(x).replace('class="object"','class="object '+(i===selected?'selected':'')+'" data-i="'+i+'"')).join('');$('canvas').querySelectorAll('[data-i]').forEach(el=>{el.onpointerdown=e=>{selected=+el.dataset.i;const o=objects[selected],sx=e.clientX,sy=e.clientY,ox=o.x,oy=o.y;el.setPointerCapture(e.pointerId);el.onpointermove=ev=>{o.x=Math.max(0,Math.min(620,ox+ev.clientX-sx));o.y=Math.max(0,Math.min(300,oy+ev.clientY-sy));el.style.left=o.x+'px';el.style.top=o.y+'px'};el.onpointerup=()=>{el.onpointermove=null;renderObjects()};showTools()}});showTools()}
function showTools(){const x=objects[selected];$('objectTools').classList.toggle('hide',!x);if(x){$('objectValue').value=x.value||'';$('objectColor').value=x.color||'#ffbd36';$('objectWidth').value=x.w;$('objectHeight').value=x.h}}
function changeObject(){const x=objects[selected];if(!x)return;x.value=$('objectValue').value;x.color=$('objectColor').value;x.w=Math.max(30,Math.min(650,Number($('objectWidth').value)||80));x.h=Math.max(25,Math.min(330,Number($('objectHeight').value)||50));renderObjects()}
function removeObject(){if(selected<0)return;objects.splice(selected,1);selected=-1;renderObjects()}
async function saveCard(){const title=$('postTitle').value.trim();if(!title)return msg('Informe um título.','editorStatus',true);const row={section_id:sectionId,author_id:user.id,title,author_label:$('postAuthor').value.trim(),body:$('postBody').value,image_url:safeURL($('postImage').value)?$('postImage').value:'',layout:mode,elements:mode==='organized'?(teacherLocalImage?[...objects.filter(x=>!(x.type==='attachment'&&x.kind==='image'&&teacherInlineImage(x.value))),{type:'attachment',kind:'image',value:teacherLocalImage}]:objects):objects};if(mode==='organized'){
 row.elements=[...row.elements.filter(x=>x.type!=='cardColor'),{type:'cardColor',value:$('postCardColor').value}];
}
const mediaUrl=$('postMediaUrl').value.trim();if(mediaUrl&&mode==='organized'){if(!safeURL(mediaUrl))return msg('Use um link HTTPS válido.','editorStatus',true);row.elements=[...row.elements.filter(x=>!(x.type==='attachment'&&safeURL(x.value))),{type:'attachment',kind:teacherYoutubeEmbed(mediaUrl)?'video':/\.(mp3|wav|ogg|m4a)(\?|$)/i.test(mediaUrl)?'audio':/\.(mp4|webm)(\?|$)/i.test(mediaUrl)?'video':'link',value:mediaUrl}]}if(teacherOriginalFile&&mode==='organized'){
 try{
  const path=user.id+'/'+crypto.randomUUID()+'.'+(teacherOriginalFile.type==='image/png'?'png':teacherOriginalFile.type==='image/webp'?'webp':'jpg');
  const uploaded=await sb.storage.from('labmaker-mural-files').upload(path,teacherOriginalFile,{contentType:teacherOriginalFile.type,upsert:false});
  if(uploaded.error)throw uploaded.error;
  row.elements=[...row.elements,{type:'privateImage',path}];
  $('postLocalStatus').textContent='Original salvo em armazenamento privado. Miniatura preservada no cartão.';
 }catch(err){$('postLocalStatus').textContent='Original não enviado: '+err.message+'. A miniatura continuará disponível.'}
}
if(teacherMediaFile&&mode==='organized'){
 try{
  const extensions={'audio/webm':'webm','audio/ogg':'ogg','audio/mp4':'m4a','audio/mpeg':'mp3','video/webm':'webm','video/mp4':'mp4'};
  const ext=extensions[teacherMediaFile.type];if(!ext||teacherMediaFile.size>5*1024*1024)throw Error('Formato não permitido ou arquivo maior que 5 MB');
  const path=user.id+'/'+crypto.randomUUID()+'.'+ext;
  const uploaded=await sb.storage.from('labmaker-mural-files').upload(path,teacherMediaFile,{contentType:teacherMediaFile.type,upsert:false});
  if(uploaded.error)throw uploaded.error;
  row.elements=[...row.elements.filter(x=>x.type!=='privateMedia'),{type:'privateMedia',path,kind:teacherMediaFile.type.startsWith('video/')?'video':'audio'}];
 }catch(err){return msg('Falha ao enviar mídia: '+err.message,'editorStatus',true)}
}
const r=card?await sb.from('lm_cards').update(row).eq('id',card.id):await sb.from('lm_cards').insert(row);if(r.error)return msg('Falha ao salvar: '+r.error.message,'editorStatus',true);$('editor').close();await refresh();msg('Cartão salvo online.')}
['email','password'].forEach(id=>$(id).addEventListener('keydown',e=>{if(e.key==='Enter')login()}));
(async()=>{const r=await sb.auth.getUser();if(r.data?.user)await start(r.data.user)})();

let shareTarget=null;
const shortLinkCache=new Map();
async function getShortLink(type,id,original){
 if(!user||!id)return original;
 const key=type+':'+id;
 if(shortLinkCache.has(key))return shortLinkCache.get(key);
 try{
  const lookup=await sb.from('anna_short_links').select('code,active,created_at').eq('target_type',type).eq('target_id',id).eq('owner_id',user.id).order('created_at',{ascending:false});
  if(lookup.error)throw lookup.error;
  let records=lookup.data||[];
  if(!records.length){
   const created=await sb.from('anna_short_links').insert({target_type:type,target_id:id,owner_id:user.id}).select('code,active').single();
   if(created.error){
    const retry=await sb.from('anna_short_links').select('code,active,created_at').eq('target_type',type).eq('target_id',id).eq('owner_id',user.id).order('created_at',{ascending:false});
    if(retry.error||!retry.data?.length)throw created.error;
    records=retry.data;
   }else records=[created.data];
  }
  const active=records.filter(x=>x.active);
  const preferred=active.find(x=>!/^[0-9a-f]{24}$/.test(x.code))||active[0];
  if(preferred&&/^[a-z0-9_-]{6,48}$/.test(preferred.code)){
   const url='https://labpc.annaone.com.br/m/?c='+encodeURIComponent(preferred.code);
   shortLinkCache.set(key,url);return url;
  }
 }catch(e){console.warn('Encurtador indisponível; utilizando link original.',e)}
 return original;
}
async function personalizeShareLink(){
 if(!shareTarget||!user||!shareTarget.student_enabled)return $('shareNotice').textContent='Ative primeiro o compartilhamento.';
 const code=$('customShortCode').value.trim().toLowerCase();
 if(!/^[a-z][a-z0-9-]{5,31}$/.test(code))return $('shareNotice').textContent='Use 6 a 32 caracteres: letras minúsculas, números e hífen; comece por letra.';
 const current=shareTarget;
 $('shareNotice').textContent='Verificando disponibilidade...';
 const existing=await sb.from('anna_short_links').select('code,target_id,active').eq('code',code).maybeSingle();
 if(existing.error)return $('shareNotice').textContent='Falha ao verificar nome: '+existing.error.message;
 if(existing.data){
  if(existing.data.target_id!==current.id)return $('shareNotice').textContent='Esse nome já está em uso.';
  if(!existing.data.active)return $('shareNotice').textContent='Esse nome está desativado.';
 }else{
  const created=await sb.from('anna_short_links').insert({code,target_type:'mural',target_id:current.id,owner_id:user.id}).select('code').single();
  if(created.error)return $('shareNotice').textContent=created.error.code==='23505'?'Nome indisponível.':'Não foi possível salvar: '+created.error.message;
 }
 shortLinkCache.set('mural:'+current.id,'https://labpc.annaone.com.br/m/?c='+code);
 if(shareTarget?.id===current.id){$('shareLink').value=shortLinkCache.get('mural:'+current.id);$('shareQr').replaceChildren();$('shareNotice').textContent='Nome personalizado salvo; o link anterior continua válido.';await listShortLinks();}
}
async function listShortLinks(){
 const m=shareTarget,node=$('shortLinksList');if(!m||!node)return;
 node.textContent='Carregando links...';
 const {data,error}=await sb.from('anna_short_links').select('code,active,created_at').eq('target_type','mural').eq('target_id',m.id).eq('owner_id',user.id).order('created_at',{ascending:false});
 if(shareTarget?.id!==m.id)return;
 if(error){node.textContent='Não foi possível carregar os links.';return}
 node.replaceChildren();
 if(!data?.length){node.textContent='Nenhum link cadastrado.';return}
 const isAutomatic=x=>/^[0-9a-f]{24}$/.test(x.code);
 const active=data.filter(x=>x.active), custom=active.filter(x=>!isAutomatic(x)), auto=active.filter(isAutomatic);
 const primary=custom[0]||auto[0]||null;
 const makeTitle=(label)=>{const h=document.createElement('h4');h.textContent=label;h.style.cssText='margin:15px 0 6px;font-size:13px;color:#143e6e';node.append(h)};
 const makeRow=(item)=>{
  const row=document.createElement('div');row.style.cssText='padding:10px 0;border-bottom:1px solid #dce8f7;overflow-wrap:anywhere';
  const title=document.createElement('strong');title.textContent=item.code===primary?.code?'★ Principal · '+item.code:item.code;
  const state=document.createElement('span');state.textContent=item.active?' · Ativo':' · Desativado';state.style.color=item.active?'#087b61':'#7c8794';
  const address=document.createElement('div');address.textContent='labpc.annaone.com.br/m/?c='+item.code;address.style.cssText='font-size:11px;color:#526c85;margin:5px 0;word-break:break-all';
  const actions=document.createElement('div');actions.className='share-actions';
  const url='https://labpc.annaone.com.br/m/?c='+encodeURIComponent(item.code);
  const copy=document.createElement('button');copy.type='button';copy.className='btn';copy.textContent='Copiar';copy.disabled=!item.active;
  copy.onclick=async()=>{try{await navigator.clipboard.writeText(url);$('shareNotice').textContent='Link copiado.'}catch{$('shareNotice').textContent=url}};
  actions.append(copy);
  if(item.active){
   const off=document.createElement('button');off.type='button';off.className='btn btn-danger';off.textContent='Desativar';
   off.onclick=async()=>{
    if(!confirm('Desativar este link curto? Outros links e o endereço original continuarão sujeitos às permissões do LabMaker.'))return;
    off.disabled=true;
    const result=await sb.from('anna_short_links').update({active:false}).eq('code',item.code).eq('owner_id',user.id).select('code');
    if(result.error||!result.data?.length){off.disabled=false;$('shareNotice').textContent='Não foi possível desativar o link.';return}
    shortLinkCache.delete('mural:'+m.id);
    $('shareNotice').textContent='Link desativado.';
    if(shareTarget?.id===m.id){$('shareLink').value=await muralShareLink(m);$('shareQr').replaceChildren();await listShortLinks()}
   };
   actions.append(off);
  }
  row.append(title,state,address,actions);node.append(row);
 };
 if(custom.length){makeTitle('Links personalizados');custom.forEach(makeRow)}
 if(auto.length){makeTitle('Códigos automáticos');auto.forEach(makeRow)}
 const disabled=data.filter(x=>!x.active);
 if(disabled.length){makeTitle('Desativados');disabled.forEach(makeRow)}
}
async function muralShareLink(m){return m.student_enabled?getShortLink('mural',m.id,shareUrl(m)):shareUrl(m)}
function shareUrl(m){const url=new URL('./aluno/',location.href);url.searchParams.set('m',m.share_token);return url.toString()}
let selectedSectionShare=null;
async function sectionShareLink(m,section){
 if(!m||!section)return null;
 if(!m.student_enabled&&!(await activateSectionSharing(m)))return null;
 let item=await sb.from('lm_group_links').select('token').eq('section_id',section.id).maybeSingle();
 if(item.error){$('shareNotice').textContent='Erro ao consultar o link da seção: '+item.error.message;return null}
 let token=item.data?.token;
 if(!token){
  const created=await sb.from('lm_group_links').insert({section_id:section.id}).select('token').single();
  if(created.error){
   const retry=await sb.from('lm_group_links').select('token').eq('section_id',section.id).maybeSingle();
   if(retry.error||!retry.data?.token){$('shareNotice').textContent='Falha ao criar link da seção: '+created.error.message;return null}
   token=retry.data.token;
  }else token=created.data.token;
 }
 const url=new URL('./aluno/',location.href);
 url.searchParams.set('g',token);
 return url.toString();
}
async function selectWholeMuralShare(){
 if(!shareTarget)return;
 selectedSectionShare=null;
 $('shareScopeNotice').hidden=true;
 $('shareHeading').textContent='Compartilhar · '+shareTarget.title;
 $('shareLinkLabel').textContent='Link do mural inteiro';
 $('shareLink').value=shareTarget.student_enabled?await muralShareLink(shareTarget):'';
 $('shareQr').replaceChildren();
 $('shareQrStatus').textContent='O link do mural mostra todas as seções.';
}
async function showSectionShare(m,section){
 selectedSectionShare={id:section.id,title:section.title,muralId:m.id};
 $('shareHeading').textContent='Compartilhar · '+section.title;
 $('shareScopeTitle').textContent='Somente a seção: '+section.title;
 $('shareScopeNotice').hidden=false;
 $('shareLinkLabel').textContent='Link exclusivo da seção';
 $('shareLink').value='';
 $('shareNotice').textContent='Preparando link exclusivo...';
 const url=await sectionShareLink(m,section);
 if(!shareTarget||shareTarget.id!==m.id||selectedSectionShare?.id!==section.id)return;
 $('shareLink').value=url||'';
 $('shareNotice').textContent=url?'Este link mostra apenas '+section.title+'.':'Não foi possível preparar o link exclusivo.';
 $('shareQr').replaceChildren();
 $('shareQrStatus').textContent='O QR Code também será exclusivo desta seção.';
}
function closeSharePanel(){selectedSectionShare=null;$('shareOverlay').classList.add('hide');$('sharePanel').classList.add('hide');shareTarget=null}
async function openSharePanel(m){selectedSectionShare=null;shareTarget=m;$('shareScopeNotice').hidden=true;$('shareLinkLabel').textContent='Link do mural inteiro';const posting=$('sharePostingEnabled');if(posting)posting.checked=!!m.posting_enabled;listShortLinks();$('shareHeading').textContent='Compartilhar · '+m.title;$('shareLink').value=m.student_enabled?shareUrl(m):'';$('shareLink').placeholder=m.student_enabled?'':'Ative o acesso dos alunos para gerar o link';if(m.student_enabled){const link=await muralShareLink(m);if(shareTarget?.id===m.id)$('shareLink').value=link;}$('shareEnabled').checked=m.student_enabled===true;$('shareQr').replaceChildren();const groupPanel=$('groupSharingPanel');if(groupPanel){groupPanel.open=false;groupPanel.dataset.mural=m.id;$('groupRooms').replaceChildren()}$('shareQrStatus').textContent=m.student_enabled?'Clique em Gerar QR para projetar ou imprimir.':'Ative o compartilhamento antes de distribuir o QR.';$('shareOverlay').classList.remove('hide');$('sharePanel').classList.remove('hide')}
async function shareMural(id){const m=murals.find(x=>x.id===id)||(mural?.id===id?mural:null);if(!m)return;if(m.owner_id!==user.id)return msg('Somente o criador pode compartilhar este mural.','status',true);openSharePanel(m)}
async function changeSharePermission(){if(!shareTarget)return;const enabled=$('shareEnabled').checked;const r=await sb.from('lm_murals').update({student_enabled:enabled}).eq('id',shareTarget.id).eq('owner_id',user.id).select('id').single();if(r.error){$('shareEnabled').checked=!enabled;return alert('Não foi possível salvar: '+r.error.message)}shareTarget.student_enabled=enabled;const posting=$('sharePostingEnabled');if(posting)posting.checked=!!shareTarget.posting_enabled;$('shareLink').value=enabled?shareUrl(shareTarget):'';$('shareLink').placeholder=enabled?'':'Ative o acesso dos alunos para gerar o link';if(enabled){const targetId=shareTarget.id;muralShareLink(shareTarget).then(link=>{if(shareTarget?.id===targetId&&shareTarget.student_enabled)$('shareLink').value=link}).catch(()=>{})}$('shareQr').replaceChildren();$('shareQrStatus').textContent=enabled?'Acesso sem login ativo.':'Link desativado para alunos.';msg(enabled?'Compartilhamento ativado.':'Compartilhamento desativado.')}
async function copyShareLink(){if(!shareTarget)return;
 if(!shareTarget.student_enabled){
  $('shareNotice').textContent='Ativando acesso para compartilhar...';
  $('shareEnabled').checked=true;await changeSharePermission();
  if(!shareTarget.student_enabled){$('shareNotice').textContent='Não foi possível ativar o acesso. Verifique as permissões.';return}
 }
 const link=selectedSectionShare?await sectionShareLink(shareTarget,selectedSectionShare):await muralShareLink(shareTarget);if(!link)return;try{await navigator.clipboard.writeText(link);$('shareNotice').textContent='Link copiado.'}catch{$('shareLink').select();$('shareNotice').textContent='Selecione e copie o link.'}}
async function generateShareQr(){if(!shareTarget)return;if(!shareTarget.student_enabled){
 $('shareQrStatus').textContent='Ativando acesso para compartilhar...';$('shareEnabled').checked=true;await changeSharePermission();
 if(!shareTarget.student_enabled){$('shareQrStatus').textContent='Não foi possível ativar o acesso. Tente novamente.';return}
}if(typeof QRCode!=='function'){$('shareQrStatus').textContent='Biblioteca de QR indisponível. Compartilhe pelo link.';return}const node=$('shareQr');node.replaceChildren();const targetLink=selectedSectionShare?await sectionShareLink(shareTarget,selectedSectionShare):await muralShareLink(shareTarget);if(!targetLink)return;new QRCode(node,{text:targetLink,width:220,height:220,colorDark:'#082d5a',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});$('shareQrStatus').textContent='QR gerado no navegador, sem enviar o link a serviços externos.'}

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
 const chosen=[{number:1,id:null,label:'🎨 Meus murais livres'},...classes.map((x,i)=>({number:i+2,id:x.id,label:[x.grade,'Turma '+x.class_name,x.shift,x.units?.name].join(' · ')}))];
 const selection=prompt('Escolha o destino:\n\n'+chosen.map(x=>x.number+' — '+x.label).join('\n'),'1');
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
  $('classSelect').value=target.id||'__free__';await selectClass();msg('Modelo aplicado! Novo mural criado para '+target.label+'. Compartilhamento ainda desativado.');
 }catch(e){msg('Erro ao usar modelo: '+e.message+(created?' Verifique possível mural incompleto na turma.':''),'status',true)}finally{replicationBusy=false}
}

function renderTeacherControls(){if(!$('muralView')||!mural)return;let el=$('teacherControls');if(!el)return;el.replaceChildren();updateMuralStatusChips();if(mural.owner_id!==user.id){$('muralConfigMenu').style.display='none';return}$('muralConfigMenu').style.display='';
const make=(label,handler)=>{const b=document.createElement('button');b.className='btn';b.textContent=label;b.onclick=handler;el.appendChild(b)};
make(mural.posting_enabled===false?'🔒 Postagens fechadas · Reabrir':'🔓 Postagens abertas · Bloquear',()=>toggleMuralFlag('posting_enabled'));
make(mural.moderation_enabled?'🛡️ Aprovação ligada · Desligar':'🛡️ Aprovação desligada · Ligar',()=>toggleMuralFlag('moderation_enabled'));
make(mural.comments_enabled?'💬 Desativar comentários':'💬 Ativar comentários',()=>toggleMuralFlag('comments_enabled'));
make('🎨 Personalizar mural',openMuralPersonalization);
make(mural.reactions_enabled?'❤️ Desativar reações':'❤️ Ativar reações',()=>toggleMuralFlag('reactions_enabled'));
const review=document.createElement('button');review.className='btn';review.textContent='💬 Moderar comentários';review.onclick=reviewComments;el.appendChild(review);
const pending=cards.filter(x=>x.origin==='student'&&x.moderation_status==='pending').length;if(pending){const label=document.createElement('strong');label.textContent=' '+pending+' cartão(ões) aguardando aprovação';el.appendChild(label)}
}
async function toggleMuralFlag(field){if(!mural||mural.owner_id!==user.id)return;const next=!(mural[field]!==false);if(field==='moderation_enabled'&&mural[field]===undefined)return msg('Recarregue para atualizar o mural.');const r=await sb.from('lm_murals').update({[field]:next}).eq('id',mural.id).eq('owner_id',user.id).select('*').single();if(r.error)return msg(r.error.message,'status',true);Object.assign(mural,r.data);renderTeacherControls();msg('Configuração atualizada.')}
async function reviewStudentCard(id,state){if(!mural||mural.owner_id!==user.id)return;const c=cards.find(x=>x.id===id);if(!c||c.origin!=='student')return;const r=await sb.from('lm_cards').update({moderation_status:state}).eq('id',id).eq('origin','student').select('id').single();if(r.error)return msg('Erro na moderação: '+r.error.message,'status',true);await refresh();msg(state==='approved'?'Cartão aprovado.':'Cartão rejeitado.')}

async function deleteMuralCard(id){if(replicationBusy||!mural)return;const item=cards.find(x=>x.id===id);if(!item||!(item.author_id===user.id&&item.origin!=='student'||mural.owner_id===user.id&&item.origin==='student'))return msg('Sem permissão para excluir este cartão.','status',true);if(!confirm('Excluir permanentemente o cartão "'+item.title+'"? Esta ação não pode ser desfeita.'))return;replicationBusy=true;try{const q=await sb.from('lm_cards').delete().eq('id',id).select('id');if(q.error)throw q.error;if(!q.data?.length)throw Error('O cartão não foi excluído. Verifique suas permissões.');await refresh();msg('Cartão excluído.')}catch(e){msg('Erro ao excluir cartão: '+e.message,'status',true)}finally{replicationBusy=false}}
async function deleteMuralSection(id){if(replicationBusy||!mural||mural.owner_id!==user.id)return msg('Somente o criador pode excluir uma mesa/trio.','status',true);const item=sections.find(s=>s.id===id);if(!item)return;if(mural.student_enabled&&sections.length<=1)return msg('Este mural colaborativo precisa manter uma área de publicação. Crie outra seção antes de excluir esta.','status',true);const count=cards.filter(c=>c.section_id===id).length;if(!confirm('Excluir permanentemente "'+item.title+'" e seus '+count+' cartão(ões), incluindo publicações de alunos?\n\nEsta ação não pode ser desfeita.'))return;replicationBusy=true;try{const q=await sb.from('lm_sections').delete().eq('id',id).select('id');if(q.error)throw q.error;if(!q.data?.length)throw Error('A mesa/trio não foi excluída. Verifique suas permissões.');await refresh();msg('Mesa/trio e seus cartões excluídos.')}catch(e){msg('Erro ao excluir mesa/trio: '+e.message,'status',true)}finally{replicationBusy=false}}

// Enter confirma campos do editor; em textos longos, Enter continua criando nova linha.
$('editor').addEventListener('keydown',event=>{if(event.key!=='Enter'||event.shiftKey||event.isComposing||event.repeat)return;const node=event.target;if(!node.matches('input:not([type=color]):not([type=number])'))return;event.preventDefault();if(node.id==='objectValue'){changeObject();node.blur();return}saveCard()});

let activeSectionMenu=null;
function sectionActions(id){
 if(!mural||mural.owner_id!==user.id)return msg('Somente o responsável pode organizar as seções.','status',true);
 if(activeSectionMenu===id){closeSectionMenu();return}
 closeSectionMenu();
 const trigger=document.querySelector('[data-section-actions="'+id+'"]');
 if(!trigger)return;
 const menu=document.createElement('div');menu.id='sectionPopup';menu.className='section-popup';menu.setAttribute('role','menu');
 const items=[['1','✏️','Renomear seção'],['2','➕','Nova seção acima'],['3','➕','Nova seção abaixo'],['4','⬆️','Mover para cima'],['5','⬇️','Mover para baixo'],['6','📋','Copiar nome'],['8','⧉','Duplicar seção'],['9','🔒','Bloquear ou desbloquear'],['7','🗑️','Excluir seção']];
 items.forEach(([n,icon,label])=>{const btn=document.createElement('button');btn.type='button';btn.setAttribute('role','menuitem');btn.className='section-menu-item'+(n==='7'?' danger':'');btn.textContent=icon+'  '+label;btn.onclick=()=>{closeSectionMenu();performSectionAction(id,n)};menu.appendChild(btn)});
 // Append to body to avoid clipping by the horizontally scrollable mural.
 document.body.appendChild(menu);activeSectionMenu=id;trigger.setAttribute('aria-expanded','true');
 positionSectionMenu();
 menu.querySelector('button')?.focus({preventScroll:true});
}
function positionSectionMenu(){
 const menu=document.getElementById('sectionPopup'),trigger=activeSectionMenu&&document.querySelector('[data-section-actions="'+activeSectionMenu+'"]');
 if(!menu||!trigger)return;
 const rect=trigger.getBoundingClientRect(),width=menu.offsetWidth||228,height=menu.offsetHeight||300,margin=8;
 const left=Math.max(margin,Math.min(innerWidth-width-margin,rect.left));
 const below=innerHeight-rect.bottom;
 const top=below>=height+margin?rect.bottom+5:Math.max(margin,rect.top-height-5);
 menu.style.left=left+'px';menu.style.top=top+'px';
}
function closeSectionMenu(){
 document.getElementById('sectionPopup')?.remove();
 document.querySelectorAll('[data-section-actions]').forEach(b=>b.setAttribute('aria-expanded','false'));activeSectionMenu=null;
}
document.addEventListener('click',e=>{if(activeSectionMenu&&!e.target.closest('#sectionPopup')&&!e.target.closest('[data-section-actions]'))closeSectionMenu()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSectionMenu()});
window.addEventListener('resize',()=>{if(activeSectionMenu)positionSectionMenu()});
document.addEventListener('scroll',()=>{if(activeSectionMenu)closeSectionMenu()},true);
async function performSectionAction(id,op){
 if(!mural||mural.owner_id!==user.id)return;
 const section=sections.find(x=>x.id===id);if(!section)return;
 if(op==='6'){try{await navigator.clipboard.writeText(section.title);msg('Nome copiado.')}catch{prompt('Copie o nome:',section.title)}return}
 if(op==='7')return deleteMuralSection(id);
 if(op==='8')return duplicateSection(id);
 if(op==='9')return toggleSectionLock(id);
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

async function activateSectionSharing(m){
 if(m.student_enabled)return true;
 const r=await sb.from('lm_murals').update({student_enabled:true}).eq('id',m.id).eq('owner_id',user.id).select('id').single();
 if(r.error){msg('Não foi possível ativar o compartilhamento: '+r.error.message,'status',true);return false}
 m.student_enabled=true;
 if(shareTarget?.id===m.id){$('shareEnabled').checked=true;$('shareLink').value=shareUrl(m)}
 return true;
}
async function shareSingleSection(id){
 if(!mural||mural.owner_id!==user.id)return;
 const section=sections.find(s=>s.id===id);if(!section)return;
 if(!await activateSectionSharing(mural))return;
 await openSharePanel(mural);
 if(shareTarget?.id!==mural.id)return;
 await showSectionShare(mural,section);
}
async function addSectionFromShare(){
 if(!shareTarget||shareTarget.owner_id!==user.id)return;
 const m=shareTarget;const title=prompt('Nome da nova seção:','Nova seção');
 if(!title?.trim())return;
 const q=await sb.from('lm_sections').insert({mural_id:m.id,title:title.trim().slice(0,100),position:mural?.id===m.id?sections.length:0}).select('id').single();
 if(q.error){$('shareNotice').textContent='Erro ao criar seção: '+q.error.message;return}
 if(mural?.id===m.id)await refresh();
 await loadGroupLinks(m);$('shareNotice').textContent='Seção '+title.trim()+' criada.';
}
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
  if(!m.student_enabled&&!(await activateSectionSharing(m))){$('shareNotice').textContent='Não foi possível liberar o compartilhamento.';return null}
  let entry=(links.data||[]).find(x=>x.section_id===section.id);
  if(!entry){const res=await sb.from('lm_group_links').insert({section_id:section.id}).select('section_id,token').single();if(res.error){$('shareNotice').textContent='Falha ao criar link: '+res.error.message;return null}entry=res.data;links.data.push(entry)}
  const url=new URL('./aluno/',location.href);url.searchParams.set('g',entry.token);return await getShortLink('group',section.id,url.toString());
 }
 for(const section of sections){
  const row=document.createElement('div');row.className='group-room';row.dataset.groupSection=section.id;
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

let presentationItems=[],presentationIndex=0,presentationSectionId=null,presentationCardId=null;
let presentationOnlyCards=true,presentationDark=false,presentationSeconds=0,presentationTimer=null,presentationLimit=0,presentationAutoReset=false;
function presentationCardAllowed(card){
 return card.moderation_status!=='rejected'&&card.moderation_status!=='pending';
}
function buildPresentationItems(sectionId=null){
 const scoped=sectionId?sections.filter(s=>s.id===sectionId):sections;
 const groups=scoped.map(section=>({section,items:cards.filter(c=>c.section_id===section.id&&presentationCardAllowed(c)).map(c=>({type:'card',section:section.title,card:c}))}));
 const included=groups.filter(group=>group.items.length);
 if(!included.length)return [];
 return [{type:'cover',sectionId},...included.flatMap(group=>presentationOnlyCards?group.items:[{type:'section',id:group.section.id,name:group.section.title,count:group.items.length},...group.items])];
}
function presentSection(id){
 if(!mural)return;
 const section=sections.find(s=>s.id===id);if(!section)return;
 const possible=cards.filter(c=>c.section_id===id);
 const eligible=possible.filter(presentationCardAllowed);
 if(!eligible.length){
  msg(possible.length?'A seção "'+section.title+'" não tem publicações aprovadas. Revise as pendentes antes de apresentar.':'A seção "'+section.title+'" ainda não tem publicações. Use Publicar para adicionar o primeiro trabalho.','status',true);
  return;
 }
 presentationSectionId=id;presentationCardId=null;
 presentationItems=buildPresentationItems(id);
 openPresentationScreen();
}
function startPresentation(){
 if(!mural)return;
 presentationSectionId=null;presentationCardId=null;
 presentationItems=buildPresentationItems();
 if(!presentationItems.length){
  msg('Este mural ainda não tem publicações disponíveis para apresentar. Adicione um cartão ou aprove as publicações pendentes.','status',true);return;
 }
 openPresentationScreen();
}
function openPresentationScreen(){
 presentationIndex=0;resetPresentationTimer();
 $('slideScreen').classList.toggle('slide-dark',presentationDark);
 $('slideOnlyCards').checked=presentationOnlyCards;
 $('slideShowSections').checked=!presentationOnlyCards;
 $('slideContrast').checked=presentationDark;
 $('slideAutoReset').checked=presentationAutoReset;
 $('slideScreen').classList.remove('hide');
 renderPresentation();$('slideScreen').focus();
}
function togglePresentationSectionSlides(show){presentationOnlyCards=!show;$('slideOnlyCards').checked=presentationOnlyCards;updatePresentationOptions()}
function updatePresentationOptions(){
 if($('slideScreen').classList.contains('hide'))return;
 const current=presentationItems[presentationIndex];
 presentationOnlyCards=$('slideOnlyCards').checked;
 $('slideShowSections').checked=!presentationOnlyCards;
 presentationDark=$('slideContrast').checked;
 $('slideScreen').classList.toggle('slide-dark',presentationDark);
 // Preserve the original scope: toggling options cannot add other turmas.
 const updated=presentationCardId?presentationItems:buildPresentationItems(presentationSectionId);
 if(!updated.length){closePresentation();return}
 presentationItems=updated;
 presentationIndex=Math.max(0,presentationItems.findIndex(x=>x.type===current?.type&&(x.type==='card'?x.card.id===current.card.id:x.type==='section'?x.id===current.id:x.sectionId===current.sectionId)));
 renderPresentation();
}
function formatPresentationTime(){const remaining=presentationLimit*60-presentationSeconds;const notice=$('slideTimeNotice');if(notice){notice.textContent=!presentationLimit?'':remaining<=0?'⏰ Tempo encerrado!':remaining<=30?'⚠️ Faltam '+remaining+' segundos':'';notice.classList.toggle('time-over',presentationLimit>0&&remaining<=0);notice.classList.toggle('time-warning',presentationLimit>0&&remaining>0&&remaining<=30)}const m=Math.floor(presentationSeconds/60),s=presentationSeconds%60;$('slideTimer').textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')}
function pausePresentationTimer(){if(presentationTimer){clearInterval(presentationTimer);presentationTimer=null}$('slideTimerToggle').textContent='▶ Tempo'}
function togglePresentationTimer(){if(presentationTimer){pausePresentationTimer();return}presentationTimer=setInterval(()=>{if(!$('slideScreen').classList.contains('hide')){presentationSeconds++;formatPresentationTime()}},1000);$('slideTimerToggle').textContent='⏸ Pausar'}
function resetPresentationTimer(){pausePresentationTimer();presentationSeconds=0;formatPresentationTime()}
function changePresentationLimit(value){presentationLimit=Math.max(0,Math.min(30,Number(value)||0));resetPresentationTimer()}
function presentationTeamKey(item){return item?.type==='card'?'section:'+item.card.section_id:item?.type==='section'?'section:'+item.name:null}
function onPresentationNavigation(previous){if(!presentationAutoReset)return;const next=presentationItems[presentationIndex];const before=presentationTeamKey(previous),after=presentationTeamKey(next);if(after&&after!==before)resetPresentationTimer()}
function changePresentationAutoReset(checked){presentationAutoReset=!!checked}
function slideBackdropColor(hex,opacity=.88){
 const value=/^#[0-9a-f]{6}$/i.test(hex)?hex:'#ffffff';
 const r=parseInt(value.slice(1,3),16),g=parseInt(value.slice(3,5),16),b=parseInt(value.slice(5,7),16);
 return 'rgba('+r+','+g+','+b+','+opacity+')';
}
function slideBackgroundFor(item){
 const wall=lmWallpapers[mural?.background_pattern||'solid']||lmWallpapers.solid;
 const screen=$('slideScreen'),stage=$('slideContent');
 // The slideshow controls stay on a neutral background. Wallpaper belongs only to the slide.
 screen.style.backgroundColor='#0b1f3c';
 screen.style.backgroundImage='none';
 screen.style.backgroundSize='';
 stage.classList.toggle('lm-slide-cover',item.type==='cover');
 stage.classList.toggle('lm-slide-publication',item.type==='card');
 stage.classList.toggle('lm-slide-section',item.type==='section');
 stage.style.backgroundPosition='center';
 stage.style.backgroundRepeat='repeat';
 stage.style.backgroundSize=wall.size;
 stage.style.color='#10335d';
 const chosen=item.type==='card'?teacherCardColor(item.card):(/^#[0-9a-f]{6}$/i.test(mural?.theme_color)?mural.theme_color:'#edf6ff');
 stage.style.backgroundColor=chosen;
 if(presentationDark){
  stage.style.backgroundColor='#10213b';
  stage.style.backgroundImage='none';
  stage.style.color='#ffffff';
  return;
 }
 // Covers expose the wallpaper clearly; cards keep the chosen background color prominent.
 const overlay=item.type==='cover'?0.18:item.type==='card'?0.82:0.65;
 const tint=slideBackdropColor(item.type==='card'?chosen:'#ffffff',overlay);
 stage.style.backgroundImage=wall.background==='none'?'none':'linear-gradient('+tint+','+tint+'),'+wall.background;
 if(item.type==='cover'&&lmValidCoverData(mural?.cover_image_data)){
  const tone=mural.cover_overlay_tone==='light'?'255,255,255':'0,20,45';
  const strength=Math.max(0,Math.min(80,Number(mural.cover_overlay)||0))/100;
  stage.style.backgroundImage='linear-gradient(rgba('+tone+','+strength+'),rgba('+tone+','+strength+')),url("'+mural.cover_image_data+'")';
  stage.style.backgroundSize='cover,'+(['cover','contain','center'].includes(mural.cover_fit)?(mural.cover_fit==='center'?'auto':mural.cover_fit):'cover');
  stage.style.backgroundRepeat='no-repeat';
 }
}
function renderPresentation(){
 const item=presentationItems[presentationIndex];if(!item)return;
 const stage=$('slideContent');
 const count=presentationItems.length;
 $('slideCount').textContent=(presentationIndex+1)+' / '+count;
 $('slideProgress').style.width=((presentationIndex+1)/count*100)+'%';
 $('slideJump').replaceChildren(...presentationItems.map((it,i)=>{
  const option=document.createElement('option');option.value=i;
  option.textContent=(i+1)+' · '+(it.type==='cover'?'Capa':it.type==='section'?'Turma: '+it.name:it.card.title);
  return option;
 }));
 $('slideJump').value=String(presentationIndex);
 slideBackgroundFor(item);
 if(item.type==='cover'){
  const sec=item.sectionId?sections.find(s=>s.id===item.sectionId):null;
  const projectDescription=String(mural.description||'').trim();
  stage.innerHTML='<div class="slide-intro"><p class="slide-eyebrow">LabMaker · Apresentação</p><h1>'+esc(mural.title)+'</h1>'+
   (projectDescription?'<p>'+esc(projectDescription)+'</p>':'')+
   (sec?'<p class="lm-slide-section-label">Turma: '+esc(sec.title)+'</p>':'')+
   '<small>'+presentationItems.filter(x=>x.type==='card').length+' publicações</small></div>';
  return;
 }
 if(item.type==='section'){
  stage.innerHTML='<div class="slide-intro"><p class="slide-eyebrow">Turma</p><h1>'+esc(item.name)+'</h1><p>'+item.count+' '+(item.count===1?'publicação':'publicações')+'</p></div>';
  return;
 }
 const c=item.card;
 const author=esc(c.author_label||'Equipe');
 stage.innerHTML='<header class="lm-slide-publication-header" aria-label="Identificação da publicação">'+
  '<div class="lm-slide-identity"><span class="lm-slide-identity-label">Turma / Seção</span><strong>'+esc(item.section||'Publicações')+'</strong></div>'+
  '<div class="lm-slide-identity"><span class="lm-slide-identity-label">Produção de</span><strong>'+author+'</strong></div></header>'+
  '<div class="lm-slide-card-content"><h2>'+esc(c.title)+'</h2>'+
  (c.layout==='free'?'<div class="slide-free">'+(Array.isArray(c.elements)?c.elements:[]).map(x=>objHTML(x,true)).join('')+'</div>':
   '<div class="slide-body" style="'+teacherFontStyle(c)+'">'+teacherRichBody(c)+'</div>'+teacherAttachment(c)+
   (safeURL(c.image_url)?'<img src="'+esc(c.image_url)+'" alt="Imagem do cartão">':''))+
  '</div>';
 const content=stage.querySelector('.lm-slide-card-content');
 if(Array.isArray(c.elements)&&c.elements.some(x=>x.type==='privateMedia')){
  const m=c.elements.find(x=>x.type==='privateMedia'),holder=document.createElement('div');
  holder.className='slide-private-photo';holder.textContent='Carregando mídia…';content.append(holder);
  teacherOriginalUrl(c.id,true).then(url=>{
   if(!holder.isConnected)return;
   const player=document.createElement(m.kind==='video'?'video':'audio');
   player.controls=true;player.src=url;holder.replaceChildren(player);
  }).catch(()=>{if(holder.isConnected)holder.textContent='Mídia indisponível.'});
 }
 if(Array.isArray(c.elements)&&c.elements.some(x=>x.type==='privateImage')){
  const thumbnail=content.querySelector('a img, img[alt="Imagem do cartão"]');
  const holder=thumbnail?null:document.createElement('div');
  if(holder){holder.className='slide-private-photo';holder.textContent='Carregando imagem…';content.append(holder)}
  teacherOriginalUrl(c.id).then(url=>{
   if(!content.isConnected)return;
   if(thumbnail){
    const original=new Image();
    original.onload=()=>{if(thumbnail.isConnected)thumbnail.src=url};
    original.src=url;
   }else if(holder?.isConnected){
    const img=document.createElement('img');
    img.alt='Foto do cartão';img.src=url;
    img.onerror=()=>{if(holder.isConnected)holder.textContent='Não foi possível carregar a foto.'};
    holder.replaceChildren(img);
   }
  }).catch(()=>{if(holder?.isConnected)holder.textContent='Imagem original indisponível.'});
 }
}
function moveSlide(step){if($('slideScreen')?.classList.contains('hide')||!presentationItems.length)return;const previous=presentationItems[presentationIndex];presentationIndex=Math.max(0,Math.min(presentationItems.length-1,presentationIndex+step));onPresentationNavigation(previous);renderPresentation()}
function jumpSlide(value){const i=Number(value);if(Number.isInteger(i)&&i>=0&&i<presentationItems.length){const previous=presentationItems[presentationIndex];presentationIndex=i;onPresentationNavigation(previous);renderPresentation()}}
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
 $('pedagogicalIncludeExamples').checked=false;$('pedagogicalUseSteps').checked=false;dialog.showModal();
}
async function createPedagogicalMural(presetId){
 if(replicationBusy||!user)return;
 const preset=pedagogicalPresets.find(x=>x.id===presetId);
 if(!preset)return;
 const includeExamples=$('pedagogicalIncludeExamples').checked;
 const useSteps=$('pedagogicalUseSteps').checked;
 const title=prompt('Nome do seu mural:',preset.name.replace(/^[^\p{L}]+/u,'').trim());
 if(!title?.trim())return;
 // Por padrão, um espaço limpo. As etapas e os cartões de exemplo são opcionais.
 const classId=null;
 const steps=useSteps?preset.sections:[['Publicações',preset.sections[0]?.[1]||'Exemplo',preset.sections[0]?.[2]||'']];
 replicationBusy=true;let created=null;
 try{
  const mr=await sb.from('lm_murals').insert({class_id:classId,owner_id:user.id,title:title.trim(),description:preset.desc,student_enabled:false,school_year:new Date().getFullYear()}).select('id').single();
  if(mr.error)throw mr.error;created=mr.data.id;
  for(let i=0;i<steps.length;i++){
   const [name,heading,guide]=steps[i];
   const sr=await sb.from('lm_sections').insert({mural_id:created,title:name,position:i}).select('id').single();
   if(sr.error)throw sr.error;
   if(includeExamples){
    const body=useSteps?guide:'Este é um cartão de exemplo. Você pode editar ou excluir antes de compartilhar.\n\n'+guide;
    const cr=await sb.from('lm_cards').insert({section_id:sr.data.id,author_id:user.id,title:'Exemplo · '+heading,author_label:'Exemplo do professor',body,elements:[],layout:'organized',origin:'teacher'});
    if(cr.error)throw cr.error;
   }
  }
  $('pedagogicalDialog').close();$('classSelect').value='__all__';await selectClass();await openMural(created);
  msg(includeExamples?'Mural criado com exemplos opcionais.':'Mural pronto, sem cartões de exemplo.');
 }catch(e){msg('Não foi possível concluir o mural: '+e.message+(created?' Verifique se um mural parcial foi criado.':''),'status',true)}
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
  const result=await sb.from('lm_murals').delete().eq('id',id).eq('owner_id',user.id).select('id');
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

async function teacherOriginalUrl(cardId,media=false){
 const session=await sb.auth.getSession();if(!session.data?.session?.access_token)throw Error('Sessão expirada');
 const response=await fetch(LM_CONFIG.url+'/functions/v1/labmaker-student-image',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.data.session.access_token},body:JSON.stringify({action:'teacher-view',card:cardId,media})});
 const result=await response.json();if(!response.ok||!result.url)throw Error(result.error||'Não foi possível carregar imagem');
 return result.url;
}
async function loadPrivateCardPhotos(){
 await Promise.all([...document.querySelectorAll('[data-card-photo]')].map(async el=>{
  const card=el.closest('.post');
  const thumbnail=card?.querySelector('a img, img[alt="Imagem do cartão"]');
  if(thumbnail)el.hidden=true;
  try{
   const url=await teacherOriginalUrl(el.dataset.cardPhoto);
   if(!el.isConnected)return;
   if(thumbnail){
    const original=new Image();
    original.onload=()=>{if(thumbnail.isConnected)thumbnail.src=url};
    original.src=url;
   }else{
    const image=document.createElement('img');
    image.alt='Imagem original do cartão';image.loading='lazy';image.src=url;
    image.onerror=()=>{if(image.isConnected)el.textContent='Não foi possível carregar a imagem.'};
    el.hidden=false;el.replaceChildren(image);
   }
  }catch(err){
   if(el.isConnected&&!thumbnail){el.hidden=false;el.textContent='Imagem original indisponível.'}
  }
 }));
}
function presentSingleCard(id){
 const c=cards.find(x=>x.id===id);if(!c)return;
 presentationSectionId=null;presentationCardId=id;
 presentationItems=[{type:'card',section:sections.find(s=>s.id===c.section_id)?.title||'Publicações',card:c}];
 presentationIndex=0;resetPresentationTimer();$('slideOnlyCards').checked=true;$('slideShowSections').checked=false;$('slideContrast').checked=presentationDark;$('slideScreen').classList.toggle('slide-dark',presentationDark);$('slideScreen').classList.remove('hide');renderPresentation();$('slideScreen').focus();
}
async function openTeacherOriginalImage(cardId){try{const url=await teacherOriginalUrl(cardId);window.open(url,'_blank','noopener,noreferrer')}catch(err){msg(err.message,'status',true)}}

async function loadTeacherPrivateMedia(){
 await Promise.all([...document.querySelectorAll('[data-teacher-media]')].map(async el=>{
  const c=cards.find(x=>x.id===el.dataset.teacherMedia);const record=c?.elements?.find(x=>x.type==='privateMedia');if(!record)return;
  try{const url=await teacherOriginalUrl(c.id,true);if(!el.isConnected)return;const player=document.createElement(record.kind==='video'?'video':'audio');player.controls=true;player.preload='metadata';player.src=url;el.replaceChildren(player)}catch(err){if(el.isConnected)el.textContent='Mídia indisponível.'}
 }))
}

$('postMediaFile').addEventListener('change',()=>{const f=$('postMediaFile').files?.[0];teacherMediaFile=null;if(!f)return;if(!['audio/webm','audio/ogg','audio/mp4','audio/mpeg','video/webm','video/mp4'].includes(f.type)||f.size>5*1024*1024){$('postMediaStatus').textContent='Selecione um arquivo de áudio ou vídeo de até 5 MB.';return}teacherMediaFile=f;$('postMediaStatus').textContent='Arquivo pronto: '+f.name});

function galleryApprovedCards(){return sections.flatMap(s=>cards.filter(c=>c.section_id===s.id&&!['rejected','pending'].includes(c.moderation_status)).map(c=>({card:c,section:s.title})))}
function openProjectGallery(){
 const items=galleryApprovedCards();$('galleryCount').textContent=items.length+' trabalhos';const root=$('galleryCards');root.replaceChildren();
 if(!items.length){root.textContent='Ainda não há trabalhos aprovados para expor.'}
 for(const item of items){const c=item.card;const tile=document.createElement('button');tile.type='button';tile.className='gallery-tile';const cover=document.createElement('div');cover.className='gallery-cover';
 const text=document.createElement('span');text.textContent='🎨';cover.append(text);
 const media=c.elements?.find(x=>x.type==='privateImage');const inline=c.elements?.find(x=>x.type==='attachment'&&x.kind==='image'&&(teacherInlineImage(x.value)||safeURL(x.value)));
 const url=inline?.value||(safeURL(c.image_url)?c.image_url:null);
 if(url){const img=document.createElement('img');img.src=url;img.alt='Capa do trabalho';cover.replaceChildren(img)}
 else if(media){teacherOriginalUrl(c.id).then(url=>{if(tile.isConnected){const img=document.createElement('img');img.src=url;img.alt='Capa do trabalho';cover.replaceChildren(img)}}).catch(()=>{})}
 const body=document.createElement('div');body.className='gallery-copy';const title=document.createElement('strong');title.textContent=c.title||'Sem título';const by=document.createElement('p');by.textContent=(c.author_label||'Equipe não identificada')+' · '+item.section;body.append(title,by);tile.append(cover,body);tile.onclick=()=>openGalleryDetail(c.id);root.append(tile)}
 $('projectGallery').classList.remove('hide');
}
function closeProjectGallery(){$('projectGallery').classList.add('hide');$('galleryDetail').close?.()}
function openGalleryDetail(id){
 const c=cards.find(x=>x.id===id);if(!c)return;const root=$('galleryDetailContent');
 root.innerHTML='<h2>'+esc(c.title)+'</h2><p>'+esc(c.author_label||'Equipe não identificada')+'</p>'+(c.layout==='free'?'<div class="slide-free">'+(c.elements||[]).map(x=>objHTML(x,true)).join('')+'</div>':'<div class="slide-body">'+teacherRichBody(c)+'</div>'+teacherAttachment(c)+(safeURL(c.image_url)?'<img src="'+esc(c.image_url)+'" alt="Imagem do projeto">':''));
 if(c.elements?.some(x=>x.type==='privateImage')){const image=document.createElement('img');image.alt='Imagem do projeto';root.append(image);teacherOriginalUrl(id).then(url=>{image.src=url}).catch(()=>{image.alt='Imagem indisponível'})}
 $('galleryDetail').showModal();
}


function openMainShare(){
 if(!mural)return;
 if(mural.owner_id!==user.id)return msg('Somente o proprietário pode compartilhar este mural.','status',true);
 openSharePanel(mural);
}
function newMuralPost(){
 if(!mural)return;
 if(mural.owner_id!==user.id)return msg('Somente o proprietário pode publicar no painel do professor.','status',true);
 if(!sections.length)return newSection();
 newCard(sections[0].id);
}
async function changeSharePosting(){
 const target=shareTarget,field=$('sharePostingEnabled');if(!target||!field)return;
 const enabled=field.checked;
 const res=await sb.from('lm_murals').update({posting_enabled:enabled}).eq('id',target.id).eq('owner_id',user.id).select('id').single();
 if(res.error){field.checked=!enabled;$('shareNotice').textContent='Não foi possível alterar as publicações: '+res.error.message;return}
 target.posting_enabled=enabled;$('shareNotice').textContent=enabled?'Participantes podem publicar.':'Novas publicações dos participantes foram encerradas.';
}

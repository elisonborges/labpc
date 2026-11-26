/* LabMaker visual media objects v0.1 */
(()=>{const s=document.createElement('style');s.textContent="#dialog #studentRichEditor{overflow:visible}\n#dialog .lm-stage{position:relative;height:340px;overflow:hidden;border:1px dashed #8fb8e5;border-radius:10px;margin:8px;background:#f8fbff}\n#dialog .lm-stage[hidden]{display:none!important}\n#dialog .lm-object{position:absolute;overflow:hidden;background:white;border:2px solid #8cb4e1;border-radius:8px;touch-action:none;box-sizing:border-box}\n#dialog .lm-object.lm-selected{border-color:#087cff;z-index:3}\n#dialog .lm-drag{height:27px;background:#e1efff;display:flex;align-items:center;justify-content:space-between;padding:0 5px;cursor:move;touch-action:none;font-size:11px;color:#17426d;user-select:none}\n#dialog .lm-media{height:calc(100% - 27px);overflow:hidden}\n#dialog .lm-media .attachment,#dialog .lm-media img,#dialog .lm-media iframe,#dialog .lm-media video{width:100%!important;height:100%!important;max-height:none!important;object-fit:contain;margin:0!important}\n#dialog .lm-size{position:absolute;right:0;bottom:0;width:20px;height:20px;background:#087cff;border-radius:7px 0 0 0;cursor:nwse-resize;touch-action:none}\n#dialog .lm-del{background:none;border:0;color:#9b2323;cursor:pointer;font-size:19px}\n.student-main .lm-arranged{position:relative;width:100%;aspect-ratio:5/4;min-height:170px;max-height:480px;overflow:hidden;background:#f8fbff;border:1px solid #cfdeef;border-radius:10px;margin:8px 0}\n.student-main .lm-arranged-item{position:absolute;overflow:hidden;background:white}\n.student-main .lm-arranged-item .attachment,.student-main .lm-arranged-item img,.student-main .lm-arranged-item iframe,.student-main .lm-arranged-item video{width:100%!important;height:100%!important;max-height:none!important;object-fit:contain;margin:0!important}";document.head.append(s)})();
function lmPosition(a,i){
 if(!a.canvas)a.canvas={x:6+(i%3)*13,y:12+(i%3)*13,w:45,h:35};
 const p=a.canvas,cl=(v,min,max)=>Math.min(max,Math.max(min,Number(v)||min));
 p.x=cl(p.x,0,90);p.y=cl(p.y,0,90);p.w=cl(p.w,10,100-p.x);p.h=cl(p.h,10,100-p.y);return p;
}
function lmRenderInlineCanvas(){
 const host=document.getElementById('studentRichEditor');if(!host)return;
 let stage=document.getElementById('lmStage');
 if(!stage){stage=document.createElement('div');stage.id='lmStage';stage.className='lm-stage';stage.setAttribute('aria-label','Mídias móveis na publicação');host.append(stage)}
 stage.hidden=editMode!=='organized'||!lmAttachments.length;stage.replaceChildren();if(stage.hidden)return;
 lmAttachments.forEach((a,i)=>{
  const p=lmPosition(a,i),el=document.createElement('div');el.className='lm-object';
  const place=()=>{el.style.left=p.x+'%';el.style.top=p.y+'%';el.style.width=p.w+'%';el.style.height=p.h+'%'};place();
  const bar=document.createElement('div');bar.className='lm-drag';bar.textContent='⋮⋮ '+({image:'Imagem/desenho',video:'Vídeo',audio:'Áudio',link:'Link',document:'Documento'}[a.kind]||'Mídia');
  const del=document.createElement('button');del.type='button';del.className='lm-del';del.textContent='×';del.title='Remover objeto';del.addEventListener('click',()=>{lmAttachments.splice(i,1);lmDrawAttachmentList()});bar.append(del);
  const content=document.createElement('div');content.className='lm-media';content.innerHTML=richAttachmentSingle(a);
  const size=document.createElement('span');size.className='lm-size';size.tabIndex=0;size.setAttribute('role','button');size.setAttribute('aria-label','Redimensionar');
  el.append(bar,content,size);
  function bind(control,mode){
   control.addEventListener('pointerdown',e=>{
    if(e.target.closest('button')||(e.pointerType==='mouse'&&e.button!==0))return;
    e.preventDefault();e.stopPropagation();stage.querySelectorAll('.lm-object').forEach(n=>n.classList.remove('lm-selected'));el.classList.add('lm-selected');
    const rect=stage.getBoundingClientRect(),initial={x:e.clientX,y:e.clientY,l:p.x,t:p.y,w:p.w,h:p.h};
    control.setPointerCapture(e.pointerId);
    const move=ev=>{if(!rect.width||!rect.height)return;const dx=(ev.clientX-initial.x)/rect.width*100,dy=(ev.clientY-initial.y)/rect.height*100;
     if(mode==='size'){p.w=Math.max(10,Math.min(100-initial.l,initial.w+dx));p.h=Math.max(10,Math.min(100-initial.t,initial.h+dy))}
     else{p.x=Math.max(0,Math.min(100-initial.w,initial.l+dx));p.y=Math.max(0,Math.min(100-initial.h,initial.t+dy))}place()};
    const end=()=>{control.removeEventListener('pointermove',move);control.removeEventListener('pointerup',end);control.removeEventListener('pointercancel',end)};
    control.addEventListener('pointermove',move);control.addEventListener('pointerup',end);control.addEventListener('pointercancel',end);
   });
  }
  bind(bar,'move');bind(size,'size');
  size.addEventListener('keydown',e=>{
   if(!['ArrowRight','ArrowLeft','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const step=e.shiftKey?5:2;
   if(e.key==='ArrowRight')p.w=Math.min(100-p.x,p.w+step);
   if(e.key==='ArrowLeft')p.w=Math.max(10,p.w-step);
   if(e.key==='ArrowDown')p.h=Math.min(100-p.y,p.h+step);
   if(e.key==='ArrowUp')p.h=Math.max(10,p.h-step);place();
  });
  stage.append(el);
 });
}
function lmComposedAttachment(items){
 if(!items.some(a=>a.canvas&&Number.isFinite(Number(a.canvas.x))))return null;
 return '<div class="lm-arranged" aria-label="Mídias organizadas">'+items.map((a,i)=>{
  const p=lmPosition({...a,canvas:a.canvas?{...a.canvas}:undefined},i);
  return '<div class="lm-arranged-item" style="left:'+p.x+'%;top:'+p.y+'%;width:'+p.w+'%;height:'+p.h+'%">'+richAttachmentSingle(a)+'</div>';
 }).join('')+'</div>';
}

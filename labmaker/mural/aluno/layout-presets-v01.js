/* LabMaker Mural — 3 layouts clássicos opcionais, preservando publicação padrão */
var lmLayoutSelection='standard';
function lmLayoutName(v){return ['standard','stack','split','hero'].includes(v)?v:'standard'}
function lmLayoutFromElements(elements){
 const o=Array.isArray(elements)?elements.find(x=>x&&x.type==='compositionLayout'):null;
 return lmLayoutName(o&&o.value);
}
function lmLayoutSelect(value){
 lmLayoutSelection=lmLayoutName(value);
 const host=document.getElementById('organizedFields');
 if(host){
  host.classList.remove('lm-layout-stack','lm-layout-split','lm-layout-hero');
  if(lmLayoutSelection!=='standard')host.classList.add('lm-layout-'+lmLayoutSelection);
 }
 document.querySelectorAll('[data-lm-layout]').forEach(btn=>{
  btn.setAttribute('aria-pressed',String(btn.dataset.lmLayout===lmLayoutSelection));
 });
}
function lmLayoutRenderCard(c){
 const text='<p style="'+fontStyle(c)+'">'+renderRichBody(c)+'</p>';
 const media=richAttachment(c)+(safe(c.image_url)?'<img alt="Imagem do cartão" src="'+e(c.image_url)+'">':'');
 const name=lmLayoutFromElements(c.elements);
 if(name==='standard')return text+media;
 return '<div class="lm-preset-render lm-preset-'+name+'"><div class="lm-preset-text">'+text+'</div><div class="lm-preset-media">'+media+'</div></div>';
}
(function(){
 const style=document.createElement('style');
 style.textContent="\n#dialog .lm-layout-chooser{padding:10px 12px;margin:8px 0 12px;border:1px solid #d1e0f1;border-radius:11px;background:#f8fbff}\n#dialog .lm-layout-chooser>strong{display:block;font-size:12px;color:#204d7f;margin-bottom:8px}\n#dialog .lm-layout-choices{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}\n#dialog .lm-layout-choice{display:grid;gap:5px;justify-items:center;align-content:start;min-width:0;padding:7px 3px;border:1px solid #bfcfe1;border-radius:9px;background:#fff;color:#214d79;font-size:10px;font-weight:700;cursor:pointer;text-align:center}\n#dialog .lm-layout-choice[aria-pressed=\"true\"]{border:2px solid #087cff;background:#eaf4ff}\n#dialog .lm-layout-drawing{width:54px;height:45px;border:1px solid #b1c2d7;border-radius:4px;background:#fff;padding:3px;display:flex;flex-direction:column;gap:3px;box-sizing:border-box}\n#dialog .lm-layout-drawing b{display:block;background:#d9e8ff;height:6px;border-radius:2px;flex:none}\n#dialog .lm-layout-drawing em{display:block;background:#e5eaf2;border-radius:2px;flex:1}\n#dialog .lm-layout-drawing i{display:block;background:#d0edff;border-radius:2px;flex:1}\n#dialog .lm-layout-drawing.split span{display:flex;gap:3px;flex:1;min-height:0}\n#dialog .lm-layout-drawing.split span>*{flex:1}\n#dialog .lm-layout-drawing.hero i{flex:3}\n#dialog .lm-layout-drawing.hero em{flex:1}\n#dialog #organizedFields.lm-layout-stack #studentRichEditor,#dialog #organizedFields.lm-layout-split #studentRichEditor,#dialog #organizedFields.lm-layout-hero #studentRichEditor{display:flex;gap:10px;flex-direction:column}\n#dialog #organizedFields.lm-layout-split #studentRichEditor{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:stretch}\n#dialog #organizedFields.lm-layout-split #studentWysiwyg{min-height:280px;min-width:0}\n#dialog #organizedFields.lm-layout-split #lmStage{height:280px;margin:0 5px 6px 0}\n#dialog #organizedFields.lm-layout-stack #lmStage{height:250px}\n#dialog #organizedFields.lm-layout-hero #lmStage{order:-1;height:330px}\n#dialog #organizedFields.lm-layout-hero #studentWysiwyg{min-height:110px}\n#dialog #organizedFields.lm-layout-hero #studentWysiwyg:empty{min-height:110px}\n.student-main .lm-preset-render{display:flex;flex-direction:column;gap:9px;min-width:0}\n.student-main .lm-preset-render p{margin:0;overflow-wrap:anywhere}\n.student-main .lm-preset-render .lm-preset-media{min-width:0;overflow:hidden}\n.student-main .lm-preset-render .lm-preset-media .lm-arranged{margin:0;max-height:none}\n.student-main .lm-preset-render.lm-preset-split{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start}\n.student-main .lm-preset-render.lm-preset-hero .lm-preset-media{order:-1}\n.student-main .lm-preset-render.lm-preset-hero .lm-preset-media img{max-height:350px;object-fit:contain}\n.student-main .lm-preset-render.lm-preset-stack .lm-preset-media{margin-top:4px}\n@media(max-width:520px){\n#dialog .lm-layout-choices{grid-template-columns:repeat(2,minmax(0,1fr))}\n#dialog #organizedFields.lm-layout-split #studentRichEditor{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}\n#dialog #organizedFields.lm-layout-split #lmStage{height:240px}\n.student-main .lm-preset-render.lm-preset-split{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}\n}\n";document.head.appendChild(style);
 const area=document.getElementById('studentCreativeModes');
 if(!area)return;
 const widget=document.createElement('div');
 widget.className='lm-layout-chooser';
 const label=document.createElement('strong');label.textContent='Escolha o layout da publicação';widget.append(label);
 const choices=document.createElement('div');choices.className='lm-layout-choices';
 const configurations=[
  ['standard','Atual','standard'],['stack','Texto + imagem','stack'],
  ['split','Lado a lado','split'],['hero','Imagem destaque','hero']
 ];
 configurations.forEach(([key,name,kind])=>{
  const b=document.createElement('button');b.type='button';b.className='lm-layout-choice';
  b.dataset.lmLayout=key;b.setAttribute('aria-pressed',String(key==='standard'));
  const preview=document.createElement('span');preview.className='lm-layout-drawing '+kind;
  if(kind==='split')preview.innerHTML='<b></b><span><em></em><i></i></span>';
  else if(kind==='hero')preview.innerHTML='<b></b><i></i><em></em>';
  else preview.innerHTML='<b></b><em></em><i></i>';
  const title=document.createElement('span');title.textContent=name;
  b.append(preview,title);
  b.addEventListener('click',()=>lmLayoutSelect(key));
  choices.appendChild(b);
 });
 widget.append(choices);
 area.insertAdjacentElement('afterend',widget);
})();

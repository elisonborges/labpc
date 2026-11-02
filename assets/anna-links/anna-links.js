/* AnnA Links · Componente reutilizável v0.1 · uso exclusivo nos módulos AnnA One */
(function(){
'use strict';
const ROOT='https://labpc.annaone.com.br';
function init(options){
 const cfg=Object.assign({title:document.title,url:location.href,filename:'anna-links-qr.png',shareButton:null,qrButton:null},options||{});
 let dest;try{dest=new URL(cfg.url,ROOT)}catch{return}
 if(dest.origin!==ROOT||!/^\/(?:m|aprender|labmaker)\//.test(dest.pathname))return;
 const share=document.querySelector(cfg.shareButton),qr=document.querySelector(cfg.qrButton);
 if(!share&&!qr)return;
 const $=(tag,attrs={},txt)=>{const e=document.createElement(tag);Object.assign(e,attrs);if(txt!=null)e.textContent=txt;return e};
 const dialog=$('dialog');dialog.style.cssText='border:0;border-radius:18px;padding:22px;max-width:94vw;width:350px;box-shadow:0 20px 70px #092a5055;text-align:center;color:#103b7b;background:white';
 const h=$('h2',{},'QR Code · '+cfg.title),description=$('p',{},'Escaneie para abrir a atividade.'),image=$('div');image.style.cssText='display:flex;justify-content:center;margin:16px auto';
 const address=$('p',{},dest.host+dest.pathname+dest.search);address.style.cssText='font-size:12px;overflow-wrap:anywhere';
 const feedback=$('p',{role:'status'});feedback.style.cssText='font-size:12px;min-height:16px';
 const button=(label)=>{const b=$('button',{type:'button'},label);b.style.cssText='padding:9px;border-radius:9px;margin:4px;border:1px solid #bfd3f0;background:#ecf4ff;color:#084caa;cursor:pointer';return b};
 const copy=button('📋 Copiar QR Code'),save=button('💾 Salvar PNG'),print=button('Imprimir'),close=button('Fechar');
 dialog.append(h,description,image,address,feedback,copy,save,print,close);document.body.append(dialog);
 const getBlob=()=>new Promise((resolve,reject)=>{const canvas=image.querySelector('canvas');if(canvas){canvas.toBlob(b=>b?resolve(b):reject(Error('PNG indisponível')),'image/png');return}const source=image.querySelector('img');if(!source?.src)return reject(Error('QR Code indisponível'));const pic=new Image();pic.onload=()=>{const c=$('canvas');c.width=pic.naturalWidth;c.height=pic.naturalHeight;c.getContext('2d').drawImage(pic,0,0);c.toBlob(b=>b?resolve(b):reject(Error('PNG indisponível')),'image/png')};pic.onerror=()=>reject(Error('Imagem indisponível'));pic.src=source.src});
 function openQr(){if(!image.hasChildNodes()){if(typeof QRCode!=='function'){feedback.textContent='Gerador indisponível nesta conexão.';dialog.showModal();return}new QRCode(image,{text:dest.href,width:210,height:210,colorDark:'#092a50',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M})}feedback.textContent='';dialog.showModal()}
 if(qr)qr.addEventListener('click',openQr);
 if(share)share.addEventListener('click',async()=>{try{if(navigator.share){await navigator.share({title:cfg.title,url:dest.href});return}await navigator.clipboard.writeText(dest.href);share.textContent='✅ Link copiado!'}catch(e){if(e.name==='AbortError')return;try{await navigator.clipboard.writeText(dest.href);share.textContent='✅ Link copiado!'}catch{window.prompt('Copie o link da atividade:',dest.href)}}});
 copy.onclick=async()=>{try{if(!navigator.clipboard?.write||typeof ClipboardItem==='undefined')throw Error('Sem suporte');await navigator.clipboard.write([new ClipboardItem({'image/png':await getBlob()})]);feedback.textContent='QR Code copiado!'}catch{feedback.textContent='Seu navegador não permite copiar a imagem. Use Salvar PNG.'}};
 save.onclick=async()=>{try{const blob=await getBlob(),url=URL.createObjectURL(blob),a=$('a',{href:url,download:cfg.filename});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);feedback.textContent='PNG salvo.'}catch{feedback.textContent='Não foi possível salvar o QR Code.'}};
 print.onclick=async()=>{try{const blob=await getBlob(),data=await new Promise(resolve=>{const rd=new FileReader();rd.onload=()=>resolve(rd.result);rd.readAsDataURL(blob)});const w=window.open('','_blank');if(!w){feedback.textContent='Permita a janela de impressão.';return}const doc=w.document;doc.title='QR Code · '+cfg.title;const body=doc.body;body.style.cssText='text-align:center;font-family:Arial';body.append($('h2',{},cfg.title));const img=doc.createElement('img');img.width=210;img.height=210;img.src=data;body.append(img,$('p',{},dest.href));img.onload=()=>w.print()}catch{feedback.textContent='Não foi possível imprimir.'}};
 close.onclick=()=>dialog.close();
}
window.AnnALinks={init};
})();
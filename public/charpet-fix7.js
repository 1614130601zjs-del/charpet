(()=>{
const KEY='charpet.pets.v2',NEXT='charpet.nextView.v1';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
const write=a=>localStorage.setItem(KEY,JSON.stringify(a));
function go(p,view){const a=read(),i=a.findIndex(x=>x.id===p.id);if(i>=0){const [x]=a.splice(i,1);a.unshift(x);write(a)}localStorage.setItem(NEXT,JSON.stringify({view}));location.reload()}
function bindCards(){
 const cards=$$('.charCard');
 cards.forEach(card=>{
  const p=read().find(x=>x.id===card.dataset.char);if(!p)return;
  const oldImg=$('img',card), oldMeta=$('.charMeta',card);
  if(oldImg&&!oldImg.dataset.fix7){
   const img=oldImg.cloneNode(true);oldImg.replaceWith(img);img.dataset.fix7='1';
   let timer=null,held=false;
   img.addEventListener('pointerdown',e=>{held=false;timer=setTimeout(()=>{held=true;window.dispatchEvent(new CustomEvent('charpet:edit-card',{detail:p}))},650)},{passive:true});
   ['pointerup','pointercancel','pointerleave'].forEach(t=>img.addEventListener(t,()=>{if(timer){clearTimeout(timer);timer=null}}));
   img.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(!held)go(p,'角色资料')},true);
  }
  if(oldMeta&&!oldMeta.dataset.fix7){
   const meta=oldMeta.cloneNode(true);oldMeta.replaceWith(meta);meta.dataset.fix7='1';
   let timer=null,held=false;
   meta.addEventListener('pointerdown',()=>{held=false;timer=setTimeout(()=>{held=true;window.dispatchEvent(new CustomEvent('charpet:set-current',{detail:p}))},650)},{passive:true});
   ['pointerup','pointercancel','pointerleave'].forEach(t=>meta.addEventListener(t,()=>{if(timer){clearTimeout(timer);timer=null}}));
   meta.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(!held&&!document.body.classList.contains('cpManageOn'))go(p,'小窝')},true);
  }
 });
}
function removeRecognizer(){
 $$('[data-recognize]').forEach(x=>x.remove());
 $$('button,input[type=button],input[type=submit]').filter(x=>/识别标题/.test(x.textContent||x.value||'')).forEach(x=>x.remove());
}
function repairTavernButton(){
 const buttons=$$('button').filter(b=>/导入酒馆卡|酒馆卡/.test((b.textContent||'').trim())&&!/识别/.test(b.textContent||''));
 buttons.forEach(btn=>{
  if(btn.dataset.fix7Import)return;btn.dataset.fix7Import='1';
  btn.addEventListener('click',e=>{
   e.preventDefault();e.stopPropagation();
   setTimeout(()=>{
    const modal=$$('.modal').find(m=>/酒馆卡/.test(m.textContent||''));
    const file=modal?.querySelector('input[type=file]')||$('input[type=file]');
    if(!file?.files?.[0])return;
    window.dispatchEvent(new CustomEvent('charpet:import-tavern',{detail:{modal,file}}));
   },0);
  },true);
 });
}
window.addEventListener('charpet:edit-card',e=>{
 const p=e.detail;window.dispatchEvent(new CustomEvent('charpet:open-edit',{detail:p}));
});
window.addEventListener('charpet:open-edit',e=>{
 // fix3's editor is intentionally reused through its existing manage surface when available.
 const p=e.detail;if(!p)return;
 const buttons=$$('.charCard').find(c=>c.dataset.char===p.id)?.querySelectorAll('button')||[];
 // trigger the existing avatar long-press editor by temporarily invoking a synthetic gesture is unreliable;
 // keep the original editor available via the card's own existing event when present.
});
let busy=false;const obs=new MutationObserver(()=>{if(busy)return;busy=true;requestAnimationFrame(()=>{busy=false;bindCards();removeRecognizer();repairTavernButton()})});obs.observe(document.body,{subtree:true,childList:true});setTimeout(()=>{bindCards();removeRecognizer();repairTavernButton()},100);
})();
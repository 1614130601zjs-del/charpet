(()=>{
const KEY='charpet.pets.v2';
const read=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(x)?x:[]}catch{return[]}};
const write=x=>localStorage.setItem(KEY,JSON.stringify(x));
function closeModalSoon(){setTimeout(()=>{document.querySelector('.modal')?.remove();document.body.classList.remove('modal-open')},80)}
function titleFromEntry(e){return String(e.name||e.title||'未命名世界书').trim()||'未命名世界书'}
async function parse(file){const b=new Uint8Array(await file.arrayBuffer()),v=new DataView(b.buffer);let o=8,vals=[];while(o+12<=b.length){const n=v.getUint32(o);if(o+12+n>b.length)break;const type=String.fromCharCode(...b.slice(o+4,o+8)),d=b.slice(o+8,o+8+n);if(type==='tEXt'){const z=d.indexOf(0);if(z>=0)vals.push([new TextDecoder().decode(d.slice(0,z)),new TextDecoder().decode(d.slice(z+1))])}o+=12+n;if(type==='IEND')break}let raw=vals.find(x=>/^(chara|ccv3)$/i.test(x[0]))?.[1];if(!raw)throw Error('PNG 中没有找到 chara / ccv3 角色数据');let data;try{data=JSON.parse(raw)}catch{const bin=atob(raw.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-raw.length%4)%4));data=JSON.parse(new TextDecoder().decode(Uint8Array.from(bin,c=>c.charCodeAt(0))))}const r=data.data||data,book=r.character_book||r.characterBook;return {name:r.name||r.character_name,description:r.description||'',entries:(book?.entries||[]).map(e=>({id:crypto.randomUUID(),title:titleFromEntry(e),content:String(e.content||''),enabled:e.enabled!==false,classification:'unknown',category:'patch'}))}}
function currentId(){return sessionStorage.getItem('charpet.currentId')}
function syncCurrent(){const card=document.querySelector('.charCard.current');if(card)sessionStorage.setItem('charpet.currentId',card.dataset.char)}
function clean(){document.querySelectorAll('[data-recognize], [data-filter], [data-toggle-filter]').forEach(x=>x.remove());document.querySelectorAll('.section').forEach(s=>{if(/时间线控制/.test(s.textContent||''))s.remove()})}
new MutationObserver(()=>{syncCurrent();clean()}).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('pointerup',syncCurrent,true);
document.addEventListener('click',e=>{
 const add=e.target.closest('[data-wb-add]');
 if(add){setTimeout(()=>{const row=document.querySelector('.wbItem');row?.scrollIntoView({behavior:'smooth',block:'center'})},100)}
 const create=e.target.closest('[data-create]');if(create)closeModalSoon();
 const tav=e.target.closest('[data-tavern]');
 if(tav){
   e.preventDefault();e.stopImmediatePropagation();
   const file=document.querySelector('#tavernFile')?.files?.[0];if(!file)return;
   parse(file).then(meta=>{
     const pets=read(),cid=currentId(),p=pets.find(x=>x.id===cid)||pets[0];if(!p)throw Error('请先选择一个 CHAR');
     p.name=meta.name||p.name;p.profile=p.profile||{};p.profile.description=meta.description||p.profile.description;
     p.worldbook=meta.entries;
     const fr=new FileReader();fr.onload=()=>{const data=String(fr.result);p.image=data;p.assets=p.assets||{};p.assets.avatar=data;p.assets.avatars=Array.isArray(p.assets.avatars)?p.assets.avatars:[];if(!p.assets.avatars.includes(data))p.assets.avatars.unshift(data);write(pets);document.querySelector('.modal')?.remove();location.reload()};fr.readAsDataURL(file)
   }).catch(err=>alert(err.message||'导入失败'));
 }
},true);
syncCurrent();clean();
})();
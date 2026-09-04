(()=>{
const KEY='charpet.pets.v2', DB='charpet-assets-v1', STORE='blobs', TOKEN='idb://';
const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>[...r.querySelectorAll(s)], uid=()=>crypto.randomUUID();
const read=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(x)?x:[]}catch{return[]}};
const write=a=>{try{localStorage.setItem(KEY,JSON.stringify(a));return true}catch(e){console.error(e);return false}};
function db(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function putBlob(blob){const d=await db(),k=TOKEN+uid();await new Promise((res,rej)=>{const t=d.transaction(STORE,'readwrite');t.objectStore(STORE).put(blob,k);t.oncomplete=res;t.onerror=()=>rej(t.error)});d.close();return k}
async function getBlob(k){const d=await db();const v=await new Promise((res,rej)=>{const t=d.transaction(STORE,'readonly');const r=t.objectStore(STORE).get(k);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});d.close();return v}
async function fileToken(file){return putBlob(file)}
async function migrateValue(v,seen=new Map()){
 if(typeof v==='string' && v.startsWith('data:image/')){if(seen.has(v))return seen.get(v);try{const b=await (await fetch(v)).blob();const k=await putBlob(b);seen.set(v,k);return k}catch{return v}}
 if(Array.isArray(v)){for(let i=0;i<v.length;i++)v[i]=await migrateValue(v[i],seen);return v}
 if(v&&typeof v==='object'){for(const k of Object.keys(v))v[k]=await migrateValue(v[k],seen);return v}
 return v
}
async function migrateExisting(){const a=read();if(!a.length)return false;const before=JSON.stringify(a);const next=await migrateValue(a);if(JSON.stringify(next)===before)return false;return write(next)}
const objectUrls=new Map();
async function hydrate(){for(const im of qa('img[src^="'+TOKEN+'"]')){const k=im.getAttribute('src');if(objectUrls.has(k)){im.src=objectUrls.get(k);continue}try{const b=await getBlob(k);if(b){const u=URL.createObjectURL(b);objectUrls.set(k,u);im.src=u}}catch{}}}

function closeModal(){qa('.modal').forEach(m=>m.remove());qa('[role="dialog"]').forEach(m=>{if(m.classList.contains('modal'))m.remove()});}
function currentPets(){return read()}
function normalizePet(p){p.assets=p.assets||{};p.assets.avatars=Array.isArray(p.assets.avatars)?p.assets.avatars:[];p.assets.poses=p.assets.poses||{};p.assets.expressions=p.assets.expressions||{};p.assets.actions=Array.isArray(p.assets.actions)?p.assets.actions:[];p.assets.photos=Array.isArray(p.assets.photos)?p.assets.photos:[];p.assets.outfits=Array.isArray(p.assets.outfits)?p.assets.outfits:[];p.profile=p.profile||{};p.card=p.card||{};p.worldbook=Array.isArray(p.worldbook)?p.worldbook:[];p.relationship=Array.isArray(p.relationship)?p.relationship:[];p.timeline=Array.isArray(p.timeline)?p.timeline:[];p.diary=Array.isArray(p.diary)?p.diary:[];return p}

function textInputs(modal){return qa('input:not([type=file]),textarea',modal).filter(x=>!x.disabled)}
function valByLabel(modal,words){const labs=qa('label',modal);for(const l of labs){if(words.some(w=>l.textContent.includes(w))){const c=l.querySelector('input,textarea,select');if(c)return c.value}}for(const el of textInputs(modal)){const hint=(el.getAttribute('placeholder')||el.getAttribute('name')||'')+' '+(el.previousElementSibling?.textContent||'');if(words.some(w=>hint.includes(w)))return el.value}return ''}
function fileInput(modal){return q('input[type=file]',modal)}
function findCreateModal(){return qa('.modal').find(m=>/新建档案|创建档案/.test(m.textContent||''))}
function findTavernModal(){return qa('.modal').find(m=>/导入酒馆卡|酒馆卡/.test(m.textContent||''))}
function layoutValue(m){return q('select',m)?.value||'classic'}
function colorValue(m){return q('input[type=color]',m)?.value||'#9a7b61'}

async function createFromModal(m){
 const fi=fileInput(m), av=fi?.files?.[0]?await fileToken(fi.files[0]):'';
 const name=valByLabel(m,['名字','名称'])||'未命名角色';
 const user=valByLabel(m,['对 User 的称呼','称呼'])||'主人';
 const nickname=valByLabel(m,['昵称'])||'';
 const tags=(valByLabel(m,['Tag','标签'])||'').split(/[,，\n]/).map(s=>s.trim()).filter(Boolean);
 const sig=valByLabel(m,['个签','签名'])||'';
 const desc=valByLabel(m,['角色描述','描述'])||'';
 const a=currentPets(),p={id:uid(),name,userTitle:user,image:av,source:'creator',createdAt:Date.now(),card:{nickname,tags,signature:sig},profile:{description:desc,tags,signature:sig},assets:{avatar:av,avatars:av?[av]:[],poses:{},expressions:{},customPoses:{},customExpressions:{},actions:[],photos:[],outfits:[]},worldbook:[],relationship:[],relationshipText:'',timeline:[],timelineText:'',diary:[],homeActivities:[],needs:{hunger:70,energy:80,mood:70},stats:{interactions:0,affection:0,lastSeenAt:Date.now()},timelineRecognition:true,ui:{layout:layoutValue(m),color:colorValue(m),css:''}};
 a.unshift(p);if(!write(a))throw Error('角色数据保存失败，请重试');closeModal();location.reload();
}

function b64(s){let x=String(s||'').trim().replace(/\s/g,'').replace(/-/g,'+').replace(/_/g,'/');x+='='.repeat((4-x.length%4)%4);try{return Uint8Array.from(atob(x),c=>c.charCodeAt(0))}catch{return null}}
function parseItext(d){let z=d.indexOf(0);if(z<0)return null;const key=new TextDecoder().decode(d.slice(0,z));let p=z+1;if(p+2>d.length)return null;const compressed=d[p],method=d[p+1];p+=2;z=d.indexOf(0,p);if(z<0)return null;p=z+1;z=d.indexOf(0,p);if(z<0)return null;p=z+1;return[key,new TextDecoder().decode(d.slice(p)),compressed,method]}
async function parseTavern(file){
 const b=new Uint8Array(await file.arrayBuffer());if(b[0]!==137||b[1]!==80||b[2]!==78||b[3]!==71)throw Error('请选择 PNG 格式的酒馆角色卡');
 const dv=new DataView(b.buffer),vals=[];let o=8;while(o+12<=b.length){const n=dv.getUint32(o);if(o+12+n>b.length)break;const t=String.fromCharCode(...b.slice(o+4,o+8)),d=b.slice(o+8,o+8+n);if(t==='tEXt'){const z=d.indexOf(0);if(z>=0)vals.push([new TextDecoder().decode(d.slice(0,z)),new TextDecoder().decode(d.slice(z+1))])}else if(t==='iTXt'){const r=parseItext(d);if(r&&!r[2])vals.push([r[0],r[1]])}o+=12+n;if(t==='IEND')break}
 const hit=vals.find(x=>/^(chara|ccv2|ccv3)$/i.test(x[0]));if(!hit)throw Error('未找到 Tavern 角色卡数据（chara / ccv2 / ccv3）');
 let raw=hit[1],data=null;for(let i=0;i<4&&!data;i++){try{data=JSON.parse(raw);break}catch{}const bytes=b64(raw);if(!bytes)break;raw=new TextDecoder().decode(bytes)}if(!data)throw Error('Tavern 角色卡数据无法解析，请确认是 V2/V3 PNG');return data
}
const BAD=/^(?:状态栏|状态|npc|输出规则|输出格式|回复格式|system prompt|system|系统提示|系统指令|系统规则|输出指令|回复指令)$/i;
const CONTROL=/(?:system prompt|system message|output format|response format|输出规则|输出格式|回复格式|系统提示|系统指令|系统规则|状态栏)/i;
const RES=/住所|居住地|住址|地址|所在地|住在哪里|住在/i;
const REL=/关系|恋人|情人|爱人|伴侣|男友|女友|丈夫|妻子|夫妻|朋友|好友|同事|兄弟|姐妹|父亲|母亲|家人|敌人|仇人|师生|暧昧|暗恋|婚姻/i;
const TIME=/时间线|世界线|人生阶段|阶段|时期|年代|年龄|岁时|少年|童年|幼年|青年|成年|学生|高中|大学|校园|毕业|入学|工作后|婚后|离职|退休|过去|未来|小时候|长大后|某年|某月|某日|季节|夏天|冬天|春天|秋天/i;
const PATCH=/性格|习惯|偏好|喜好|行为|说话方式|语气|穿衣|着装|外貌|特征|癖好|日常|角色|人物|设定|倾向|规范|表现/i;
function classify(e){const title=String(e.name||e.title||'').trim(),content=String(e.content||'').trim(),s=title+'\n'+content;if(!title||!content||BAD.test(title)||CONTROL.test(content))return null;if(RES.test(title)||RES.test(content)&&!TIME.test(title))return null;if(REL.test(title))return{category:'relationship',classification:'relationship',group:title};if(TIME.test(title))return{category:'timeline',classification:'timeline',group:title};if(PATCH.test(title))return{category:'patch',classification:'patch'};const tc=(s.match(new RegExp(TIME.source,'ig'))||[]).length,rc=(s.match(new RegExp(REL.source,'ig'))||[]).length;if(rc>=2)return{category:'relationship',classification:'relationship',group:title};if(tc>=2)return{category:'timeline',classification:'timeline',group:title};return{category:'patch',classification:'patch'}}
async function importFromModal(m){const fi=fileInput(m),file=fi?.files?.[0];if(!file)throw Error('请先选择酒馆 PNG 角色卡');const data=await parseTavern(file),r=data.data||data,book=r.character_book||r.characterBook,entries=Array.isArray(book?.entries)?book.entries:[],wb=entries.map(e=>{const c=classify(e);return c?{id:uid(),title:String(e.name||e.title||(Array.isArray(e.keys)?e.keys.join(', '):'')||'未命名条目'),content:String(e.content||''),enabled:e.enabled!==false,...c}:null}).filter(Boolean);const av=await fileToken(file),a=currentPets();const p={id:uid(),name:r.name||'未命名角色',userTitle:r.user_name||r.userTitle||'主人',image:av,source:'tavern',createdAt:Date.now(),card:{nickname:r.nickname||'',tags:Array.isArray(r.tags)?r.tags:[],signature:r.creator_notes||''},profile:{description:r.description||r.personality||'',tags:Array.isArray(r.tags)?r.tags:[],signature:r.creator_notes||''},assets:{avatar:av,avatars:[av],poses:{},expressions:{},customPoses:{},customExpressions:{},actions:[],photos:[],outfits:[]},worldbook:wb,relationship:[],relationshipText:'',timeline:[],timelineText:'',diary:[],homeActivities:[],needs:{hunger:70,energy:80,mood:70},stats:{interactions:0,affection:0,lastSeenAt:Date.now()},timelineRecognition:true,ui:{layout:'classic',color:'#9a7b61',css:''}};a.unshift(p);if(!write(a))throw Error('导入后保存失败：本地存储空间不足');closeModal();location.reload()}

// This layer owns the two workflows so the legacy UI and repair layers cannot fight over them.
document.addEventListener('click',e=>{
 const create=e.target.closest('[data-create]');if(create){e.preventDefault();e.stopImmediatePropagation();const m=findCreateModal();if(!m)return;createFromModal(m).catch(x=>alert(x.message||'创建失败'));return}
 const imp=e.target.closest('[data-import],[data-tavern]');if(imp){e.preventDefault();e.stopImmediatePropagation();const m=findTavernModal()||findCreateModal();if(!m)return;importFromModal(m).catch(x=>alert(x.message||'酒馆卡导入失败'));return}
},true);

function moveManage(){const page=qa('.cpPage').find(x=>x.querySelector('.cpTitle h2')?.textContent.trim()==='角色档案');if(!page)return;page.querySelector('.cpTitle [data-manage]')?.remove();const grid=q('.cpGrid',page);if(!grid)return;const create=q('[data-new]',grid);if(!create)return;let bar=q('.cpArchiveActions',page);if(!bar){bar=document.createElement('div');bar.className='cpArchiveActions';bar.style.cssText='display:flex;gap:10px;align-items:center;margin-top:14px;flex-wrap:wrap'}bar.appendChild(create);let manage=q('[data-manage]',bar);if(!manage){manage=document.createElement('button');manage.type='button';manage.textContent='管理';manage.dataset.manage='1'}bar.appendChild(manage);if(bar.parentElement!==grid.parentElement)grid.parentElement.appendChild(bar)}
function navFix(){const nav=q('.cpNav');if(!nav)return;const a=q('.on',nav);if(a){sessionStorage.setItem('charpet.nav.button',a.dataset.nav||a.textContent.trim());requestAnimationFrame(()=>a.scrollIntoView({behavior:'auto',block:'nearest',inline:'center'}))}}
function timelineFix(){const p=currentPets()[0];if(!p)return;const n=p.name||'角色',u=p.userTitle||'你';qa('.timeline .event').forEach(e=>qa('strong,p',e).forEach(x=>x.textContent=x.textContent.replace(/\bCHAR\b/g,n).replace(/\bUser\b/g,u)))}
let busy=false;const ob=new MutationObserver(()=>{if(busy)return;busy=true;requestAnimationFrame(async()=>{busy=false;moveManage();navFix();timelineFix();await hydrate()})});ob.observe(document.body,{subtree:true,childList:true});
(async()=>{try{if(await migrateExisting())location.reload()}catch(e){console.warn('asset migration',e)}moveManage();navFix();timelineFix();hydrate()})();
})();
(()=>{
const KEY='charpet.pets.v2',NEXT='charpet.nextView.v1',DB='charpet-assets-v1',STORE='blobs';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
const write=a=>localStorage.setItem(KEY,JSON.stringify(a));
const uid=()=>crypto.randomUUID();
function go(p,view){const a=read(),i=a.findIndex(x=>x.id===p.id);if(i>=0){const[x]=a.splice(i,1);a.unshift(x);write(a)}localStorage.setItem(NEXT,JSON.stringify({view}));location.reload()}
function db(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function put(file){const d=await db(),k='idb://'+uid();await new Promise((res,rej)=>{const t=d.transaction(STORE,'readwrite');t.objectStore(STORE).put(file,k);t.oncomplete=res;t.onerror=()=>rej(t.error)});d.close();return k}
function closeModal(){ $$('.modal').forEach(m=>m.remove()) }
function removeRecognizer(){$$('[data-recognize]').forEach(x=>x.remove());$$('button,input[type=button],input[type=submit]').filter(x=>/识别标题/.test(x.textContent||x.value||'')).forEach(x=>x.remove())}
function bindCards(){
 $$('.charCard').forEach(card=>{
  if(card.dataset.fix7)return;card.dataset.fix7='1';
  const p=read().find(x=>x.id===card.dataset.char);if(!p)return;
  card.addEventListener('click',e=>{
   if(document.body.classList.contains('cpManageOn'))return;
   const av=e.target.closest('img');
   if(av){e.preventDefault();e.stopPropagation();go(p,'角色资料');return}
   if(e.target.closest('.charMeta')){e.preventDefault();e.stopPropagation();go(p,'小窝');return}
  },true);
 });
}
function b64(s){let x=String(s||'').trim().replace(/\s/g,'').replace(/-/g,'+').replace(/_/g,'/');x+='='.repeat((4-x.length%4)%4);try{return Uint8Array.from(atob(x),c=>c.charCodeAt(0))}catch{return null}}
function itxt(d){let z=d.indexOf(0);if(z<0)return null;const key=new TextDecoder().decode(d.slice(0,z));let p=z+1;if(p+2>d.length)return null;const comp=d[p],method=d[p+1];p+=2;z=d.indexOf(0,p);if(z<0)return null;p=z+1;z=d.indexOf(0,p);if(z<0)return null;p=z+1;return[key,new TextDecoder().decode(d.slice(p)),comp,method]}
async function parse(file){const b=new Uint8Array(await file.arrayBuffer());if(b[0]!==137||b[1]!==80||b[2]!==78||b[3]!==71)throw Error('请选择 PNG 格式的酒馆角色卡');const dv=new DataView(b.buffer),v=[];let o=8;while(o+12<=b.length){const n=dv.getUint32(o);if(o+12+n>b.length)break;const t=String.fromCharCode(...b.slice(o+4,o+8)),d=b.slice(o+8,o+8+n);if(t==='tEXt'){const z=d.indexOf(0);if(z>=0)v.push([new TextDecoder().decode(d.slice(0,z)),new TextDecoder().decode(d.slice(z+1))])}else if(t==='iTXt'){const r=itxt(d);if(r&&!r[2])v.push([r[0],r[1]])}o+=12+n;if(t==='IEND')break}const hit=v.find(x=>/^(chara|ccv2|ccv3)$/i.test(x[0]));if(!hit)throw Error('未找到 Tavern 角色卡数据（chara / ccv2 / ccv3）');let raw=hit[1],data=null;for(let i=0;i<4&&!data;i++){try{data=JSON.parse(raw);break}catch{}const z=b64(raw);if(!z)break;raw=new TextDecoder().decode(z)}if(!data)throw Error('Tavern 角色卡数据无法解析，请确认是 V2/V3 PNG');return data}
const BAD=/^(?:状态栏|状态|npc|输出规则|输出格式|回复格式|system prompt|system|系统提示|系统指令|系统规则|输出指令|回复指令)$/i,CONTROL=/(?:system prompt|system message|output format|response format|输出规则|输出格式|回复格式|系统提示|系统指令|系统规则|状态栏)/i,RES=/(?:住所|居住地|住址|地址|所在地|住在哪里|住在)/i,REL=/(?:关系|恋人|情人|爱人|伴侣|男友|女友|丈夫|妻子|夫妻|朋友|好友|同事|兄弟|姐妹|父亲|母亲|家人|敌人|仇人|师生|暧昧|暗恋|婚姻)/i,TIME=/(?:时间线|世界线|人生阶段|阶段|时期|年代|年龄|岁时|少年|童年|幼年|青年|成年|学生|高中|大学|校园|毕业|入学|工作后|婚后|离职|退休|过去|未来|小时候|长大后|某年|某月|某日|季节|夏天|冬天|春天|秋天)/i,PATCH=/(?:性格|习惯|偏好|喜好|行为|说话方式|语气|穿衣|着装|外貌|特征|癖好|日常|角色|人物|设定|倾向|规范|表现)/i;
function cls(e){const t=String(e.name||e.title||'').trim(),c=String(e.content||'').trim(),s=t+'\n'+c;if(!t||!c||BAD.test(t)||CONTROL.test(c)||RES.test(t)||RES.test(c)&&!TIME.test(t))return null;if(REL.test(t))return{category:'relationship',classification:'relationship',group:t};if(TIME.test(t))return{category:'timeline',classification:'timeline',group:t};if(PATCH.test(t))return{category:'patch',classification:'patch'};if((s.match(new RegExp(REL.source,'ig'))||[]).length>=2)return{category:'relationship',classification:'relationship',group:t};if((s.match(new RegExp(TIME.source,'ig'))||[]).length>=2)return{category:'timeline',classification:'timeline',group:t};return{category:'patch',classification:'patch'}}
async function importSubmit(modal){const file=modal?.querySelector('input[type=file]')?.files?.[0];if(!file)throw Error('请先选择酒馆 PNG 角色卡');const data=await parse(file),r=data.data||data,book=r.character_book||r.characterBook,entries=Array.isArray(book?.entries)?book.entries:[],wb=entries.map(e=>{const c=cls(e);return c?{id:uid(),title:String(e.name||e.title||(Array.isArray(e.keys)?e.keys.join(', '):'')||'未命名条目'),content:String(e.content||''),enabled:e.enabled!==false,...c}:null}).filter(Boolean),av=await put(file),a=read(),p={id:uid(),name:r.name||'未命名角色',userTitle:r.user_name||r.userTitle||'主人',image:av,source:'tavern',createdAt:Date.now(),card:{nickname:r.nickname||'',tags:Array.isArray(r.tags)?r.tags:[],signature:r.creator_notes||''},profile:{description:r.description||r.personality||'',tags:Array.isArray(r.tags)?r.tags:[],signature:r.creator_notes||''},assets:{avatar:av,avatars:[av],poses:{},expressions:{},customPoses:{},customExpressions:{},actions:[],photos:[],outfits:[]},worldbook:wb,relationship:[],relationshipText:'',timeline:[],timelineText:'',diary:[],homeActivities:[],needs:{hunger:70,energy:80,mood:70},stats:{interactions:0,affection:0,lastSeenAt:Date.now()},timelineRecognition:true,ui:{layout:'classic',color:'#9a7b61',css:''}};a.unshift(p);if(!write(a))throw Error('导入后保存失败：本地存储空间不足');closeModal();location.reload()}
window.addEventListener('click',e=>{
 const modal=$$('.modal').find(m=>/导入酒馆卡|酒馆卡/.test(m.textContent||''));
 const b=e.target.closest('button,input[type=submit]');
 if(modal&&b&&/^(导入|导入酒馆卡)$/.test((b.textContent||b.value||'').trim())){e.preventDefault();e.stopImmediatePropagation();importSubmit(modal).catch(x=>alert(x.message||'酒馆卡导入失败'));}
},true);
let busy=false;const obs=new MutationObserver(()=>{if(busy)return;busy=true;requestAnimationFrame(()=>{busy=false;bindCards();removeRecognizer()})});obs.observe(document.body,{subtree:true,childList:true});setTimeout(()=>{bindCards();removeRecognizer()},80);
})();
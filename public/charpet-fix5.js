(()=>{
const KEY='charpet.pets.v2', NAV_KEY='charpet.topNavScroll.v1';
const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const read=()=>{try{const a=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(a)?a:[]}catch{return[]}};
const write=a=>localStorage.setItem(KEY,JSON.stringify(a));
const current=()=>read()[0]||null;
const id=()=>crypto.randomUUID();

function navKeep(){
  const nav=document.querySelector('.cpNav'); if(!nav)return;
  const wanted=sessionStorage.getItem(NAV_KEY)||localStorage.getItem(NAV_KEY);
  const active=nav.querySelector('.on');
  if(active){
    sessionStorage.setItem(NAV_KEY,active.dataset.nav||active.textContent.trim());
    requestAnimationFrame(()=>requestAnimationFrame(()=>active.scrollIntoView({behavior:'auto',block:'nearest',inline:'center'})));
  }else if(wanted){
    const b=[...nav.querySelectorAll('[data-nav]')].find(x=>x.dataset.nav===wanted);
    if(b)requestAnimationFrame(()=>requestAnimationFrame(()=>b.scrollIntoView({behavior:'auto',block:'nearest',inline:'center'})));
  }
}

document.addEventListener('click',e=>{
  const n=e.target.closest('[data-nav]');
  if(n){sessionStorage.setItem(NAV_KEY,n.dataset.nav);setTimeout(navKeep,0);setTimeout(navKeep,80);}
},true);

function moveManage(){
  const page=[...document.querySelectorAll('.cpPage')].find(x=>x.querySelector('.cpTitle h2')?.textContent.trim()==='角色档案');
  if(!page)return;
  const title=page.querySelector('.cpTitle');
  title?.querySelector('[data-manage]')?.remove();
  const grid=page.querySelector('.cpGrid'); if(!grid)return;
  const create=grid.querySelector('[data-new]');
  if(!create)return;
  let wrap=page.querySelector('.cpArchiveActions');
  if(!wrap){wrap=document.createElement('div');wrap.className='cpArchiveActions';wrap.style.cssText='display:flex;gap:10px;align-items:center;margin-top:14px;flex-wrap:wrap';}
  let manage=wrap.querySelector('[data-manage]');
  if(!manage){manage=document.createElement('button');manage.type='button';manage.textContent='管理';manage.dataset.manage='1';}
  if(create.parentElement!==wrap)wrap.appendChild(create);
  if(manage.parentElement!==wrap)wrap.appendChild(manage);
  if(wrap.parentElement!==grid.parentElement)grid.parentElement.appendChild(wrap);
}

function timelineNames(){
  const p=current(); if(!p)return;
  const name=p.name||'角色', user=p.userTitle||'你';
  document.querySelectorAll('.timeline .event').forEach(ev=>{
    const nodes=[...ev.querySelectorAll('strong,p')];
    nodes.forEach(node=>{node.textContent=node.textContent.replace(/\bCHAR\b/g,name).replace(/\bUser\b/g,user);});
  });
}

const BAD=/^(?:状态栏|状态|npc|输出规则|输出格式|回复格式|system prompt|system|系统提示|系统指令|系统规则|输出指令|回复指令)$/i;
const BAD_CONTENT=/(?:\b(system prompt|system message|assistant output|format your response|output format|response format)\b|输出规则|输出格式|回复格式|系统提示|系统指令|系统规则|状态栏|^\s*npc\s*[:：])/i;
const RESIDENCE=/(?:住所|居住地|住址|地址|房屋地址|家庭住址|所在地|住在哪里|住在)/i;
const REL=/(?:关系|恋人|情人|爱人|伴侣|男友|女友|丈夫|妻子|夫妻|未婚夫|未婚妻|朋友|好友|同事|兄弟|姐妹|父亲|母亲|亲子|家人|敌人|仇人|主从|上下属|师生|暧昧|暗恋|婚姻)/i;
const TIME=/(?:时间线|世界线|人生阶段|阶段|时期|年代|年龄|岁时|岁\b|少年|童年|幼年|青年|成年|学生|高中|大学|校园|毕业|入学|工作后|婚后|离职|退休|过去|未来|当时|后来|多年后|小时候|长大后|某年|某月|某日|季节|夏天|冬天|春天|秋天)/i;
const PATCH=/(?:性格|习惯|偏好|喜好|行为|说话方式|语气|穿衣|着装|外貌|特征|癖好|日常|角色|人物|设定|倾向|规范|表现)/i;
function classify(title,content){
  const t=String(title||'').trim(), c=String(content||'').trim(), s=t+'\n'+c;
  if(!t||!c||BAD.test(t)||BAD_CONTENT.test(c))return {drop:true};
  if(RESIDENCE.test(t) && !TIME.test(t))return {drop:true};
  if(REL.test(t))return {category:'relationship',classification:'relationship',group:t};
  if(TIME.test(t))return {category:'timeline',classification:'timeline',group:t};
  if(PATCH.test(t))return {category:'patch',classification:'patch'};
  // Content-only semantic fallback: require multiple coherent temporal/relationship signals,
  // otherwise keep it as a character supplement instead of inventing a timeline.
  const temporal=(s.match(TIME/g)||[]).length;
  const relation=(s.match(REL/g)||[]).length;
  if(relation>=2)return {category:'relationship',classification:'relationship',group:t};
  if(temporal>=2)return {category:'timeline',classification:'timeline',group:t};
  return {category:'patch',classification:'patch'};
}
function cleanAndClassify(arr){
  const out=[];
  for(const w of arr){
    const r=classify(w.title,w.content);
    if(r.drop)continue;
    w.category=r.category; w.classification=r.classification;
    if(r.group)w.timelineGroup=r.group;
    out.push(w);
  }
  return out;
}

function b64ToText(s){
  const raw=String(s||'').trim();
  try{return decodeURIComponent(escape(atob(raw.replace(/-/g,'+').replace(/_/g,'/').replace(/\s/g,'')+'='.repeat((4-raw.length%4)%4))))}catch{}
  try{return new TextDecoder().decode(Uint8Array.from(atob(raw.replace(/-/g,'+').replace(/_/g,'/').replace(/\s/g,'')+'='.repeat((4-raw.length%4)%4)),c=>c.charCodeAt(0)))}catch{}
  return raw;
}
async function parsePngMetadata(file){
  const b=new Uint8Array(await file.arrayBuffer());
  if(b.length<24||b[0]!==137||b[1]!==80||b[2]!==78||b[3]!==71)throw Error('请选择标准 PNG 酒馆角色卡');
  const dv=new DataView(b.buffer), vals=[]; let o=8;
  while(o+12<=b.length){
    const n=dv.getUint32(o); if(o+12+n>b.length)break;
    const type=String.fromCharCode(b[o+4],b[o+5],b[o+6],b[o+7]); const d=b.slice(o+8,o+8+n);
    if(type==='tEXt'){
      const z=d.indexOf(0); if(z>=0)vals.push([new TextDecoder().decode(d.slice(0,z)),new TextDecoder().decode(d.slice(z+1))]);
    }else if(type==='iTXt'){
      let z=d.indexOf(0); if(z>=0){const key=new TextDecoder().decode(d.slice(0,z));let q=z+1;
        const nul1=d.indexOf(0,q); if(nul1>=0){q=nul1+1;const nul2=d.indexOf(0,q);if(nul2>=0){q=nul2+1;const nul3=d.indexOf(0,q);if(nul3>=0){q=nul3+1;const nul4=d.indexOf(0,q);if(nul4>=0){q=nul4+1;vals.push([key,new TextDecoder().decode(d.slice(q))]);}}}}}
    }}
    o+=12+n; if(type==='IEND')break;
  }
  const hit=vals.find(([k])=>/^(chara|ccv3|ccv2)$/i.test(k));
  if(!hit)throw Error('这张 PNG 没有找到酒馆角色卡数据（chara / ccv3）');
  let raw=hit[1], data;
  for(let i=0;i<3&&!data;i++){
    try{data=JSON.parse(raw);break}catch{}
    try{raw=b64ToText(raw)}catch{}
  }
  if(!data)throw Error('酒馆角色卡数据无法解析，请使用标准 Tavern V2/V3 PNG');
  return data;
}
async function importTavern(){
  const input=document.querySelector('#tavernFile'), file=input?.files?.[0]; if(!file)return;
  try{
    const dataUrl=await new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result));r.onerror=no;r.readAsDataURL(file)});
    const data=await parsePngMetadata(file), r=data.data||data, book=r.character_book||r.characterBook;
    const entries=Array.isArray(book?.entries)?book.entries:[];
    const wb=cleanAndClassify(entries.map(e=>({id:id(),title:String(e.name||e.title||(Array.isArray(e.keys)?e.keys.join(', '):'')||'未命名条目'),content:String(e.content||''),enabled:e.enabled!==false,classification:'unknown',category:'patch'})));
    const a=read(), p=a[0]; if(!p)throw Error('请先创建一个角色档案再导入酒馆卡');
    p.name=r.name||p.name||'未命名 CHAR';p.profile=p.profile||{};p.profile.description=r.description||p.profile.description||'';
    p.worldbook=wb;p.image=dataUrl;p.assets=p.assets||{};p.assets.avatar=dataUrl;p.assets.avatars=Array.isArray(p.assets.avatars)?p.assets.avatars:[];if(!p.assets.avatars.includes(dataUrl))p.assets.avatars.unshift(dataUrl);
    write(a);localStorage.setItem('charpet.tavernImport.v1',String(Date.now()));
    document.querySelector('.modal')?.remove();location.reload();
  }catch(err){alert(err?.message||'酒馆卡导入失败，请确认 PNG 为标准 Tavern V2/V3 角色卡')}
}

function createArchive(){
  const name=document.querySelector('#newName')?.value.trim()||'未命名 CHAR';
  const user=document.querySelector('#newUser')?.value.trim()||'主人';
  const file=document.querySelector('#newAvatar')?.files?.[0];
  const readFile=f=>new Promise((ok,no)=>{if(!f)return ok('');const r=new FileReader();r.onload=()=>ok(String(r.result));r.onerror=no;r.readAsDataURL(f)});
  return readFile(file).then(av=>{
    const a=read(), p={id:id(),name,image:av,source:'creator',createdAt:Date.now(),assets:{avatar:av,avatars:av?[av]:[],poses:{},expressions:{},customPoses:{},customExpressions:{},actions:[],photos:[],outfits:[]},userTitle:user,profile:{description:'',tags:[],signature:''},card:{nickname:'',tags:[],signature:''},relationshipText:'',timelineText:'',worldbook:[],relationship:[],needs:{hunger:70,energy:80,mood:70},timeline:[],diary:[],homeActivities:[],stats:{interactions:0,affection:0,lastSeenAt:Date.now()},timelineRecognition:true,ui:{layout:document.querySelector('#newLayout')?.value||'classic',color:document.querySelector('#newColor')?.value||'#9a7b61',css:document.querySelector('#newCss')?.value||''}};
    a.unshift(p);write(a);document.querySelector('.modal')?.remove();location.reload();
  });
}

// Capture the legacy buttons before v4's bubble handlers. This makes success always close the modal.
document.addEventListener('click',e=>{
  if(e.target.closest('[data-create]')){e.preventDefault();e.stopImmediatePropagation();createArchive().catch(err=>alert(err?.message||'创建失败'));return;}
  if(e.target.closest('[data-tavern]')){e.preventDefault();e.stopImmediatePropagation();importTavern();return;}
  const add=e.target.closest('[data-wb-add]');
  if(add){
    // Keep the legacy behavior but guarantee a useful default classification.
    setTimeout(()=>{const p=current();if(!p)return;const fresh=p.worldbook?.[0];if(fresh&&fresh.title==='新条目'){fresh.category=document.querySelector('[data-wb-tab].on')?.dataset.wbTab||'patch';fresh.classification='unknown';write(read())}},0);
  }
},true);

function worldbookFix(){
  const section=document.querySelector('.profileText .section');if(!section)return;
  const head=section.querySelector('.sectionHead');
  head?.querySelector('[data-recognize]')?.remove();
  const wb=section.querySelector('.wb'); if(!wb)return;
  let bottom=section.querySelector('.wbControls');
  if(!bottom){bottom=document.createElement('div');bottom.className='wbControls';bottom.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-top:12px';section.appendChild(bottom)}
  const add=head?.querySelector('[data-wb-add]'); if(add)bottom.appendChild(add);
  // Automatic classification replaces the removed manual recognition button.
  const p=current(); if(p&&Array.isArray(p.worldbook)){
    let changed=false;
    p.worldbook=cleanAndClassify(p.worldbook); if(!p.worldbook.length && changed)write(read());
    else {const before=JSON.stringify(read());write(read());changed=before!==JSON.stringify(read());}
  }
}

function applyWorldbookClassification(){
  const p=current();if(!p||!Array.isArray(p.worldbook))return;
  const before=JSON.stringify(p.worldbook), next=cleanAndClassify(p.worldbook);p.worldbook=next;
  if(before!==JSON.stringify(next))write(read());
}

let ticking=false;
const observe=new MutationObserver(()=>{if(ticking)return;ticking=true;requestAnimationFrame(()=>{ticking=false;moveManage();worldbookFix();timelineNames();navKeep();applyWorldbookClassification()})});
observe.observe(document.body,{childList:true,subtree:true});
setTimeout(()=>{moveManage();worldbookFix();timelineNames();navKeep();applyWorldbookClassification()},60);
})();
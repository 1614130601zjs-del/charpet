import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import './framework.css';
import type { PetRecord, WorldbookEntry } from './pet/petTypes';
import { loadPetRecords, savePetRecords } from './storage/petStore';

type View = 'archive' | 'home' | 'explore' | 'timestamp' | 'info' | 'diary' | 'settings';
type InfoTab = 'text' | 'gallery';

const emptyPet = (name: string, image: string, imported?: Partial<PetRecord>): PetRecord => ({
  id: crypto.randomUUID(), name, image, source: 'upload', createdAt: Date.now(),
  assets: { idle: image, avatar: image }, userTitle: '主人',
  needs: { hunger: 70, energy: 80, mood: 70 },
  relationship: [{ key: 'relationship', label: '关系', value: 0, min: 0, max: 100 }],
  timeline: [], diary: [], memories: [], stats: { interactions: 0, affection: 0, lastSeenAt: Date.now() },
  ...imported
});

const PNG_SIGNATURE = [137,80,78,71,13,10,26,10];
const textOf = (v: unknown) => typeof v === 'string' ? v : '';
function decodeBase64(s: string) { const raw = atob(s.replace(/\s/g, '')); const bytes = new Uint8Array(raw.length); for (let i=0;i<raw.length;i++) bytes[i]=raw.charCodeAt(i); return new TextDecoder().decode(bytes); }
function parseTavernPng(buf: ArrayBuffer) {
  const b = new Uint8Array(buf); if (b.length > 20_000_000 || !PNG_SIGNATURE.every((x,i)=>b[i]===x)) throw new Error('不是有效的 PNG 角色卡');
  let o=8, data:any=null;
  while (o+12<=b.length) { const n=new DataView(b.buffer,b.byteOffset+o,4).getUint32(0); const type=new TextDecoder('latin1').decode(b.subarray(o+4,o+8)); const d=b.subarray(o+8,o+8+n);
    if (type==='tEXt') { const z=d.indexOf(0); if(z>=0){ const key=new TextDecoder('latin1').decode(d.subarray(0,z)); if(key==='chara'||key==='ccv3'){ try { const q=JSON.parse(decodeBase64(new TextDecoder('latin1').decode(d.subarray(z+1)))); if(key==='ccv3'||q.data)data=q; } catch {} } } }
    o += 12+n; if(type==='IEND') break;
  }
  if(!data) throw new Error('没有找到 chara / ccv3 数据');
  const c=data.data&&typeof data.data==='object'?data.data:data;
  return { name:textOf(c.name), description:[c.description,c.personality,c.scenario,c.first_mes,c.mes_example].map(textOf).filter(Boolean).join('\n\n'), book:c.character_book&&Array.isArray(c.character_book.entries)?c.character_book.entries:[] };
}

// Timeline detection deliberately reads ONLY the worldbook entry title.
function looksLikeTimelineTitle(title: string) {
  return /(线|期|后|前|年|岁|童年|少年|青年|成年|晚年|幼年|过去|现在|未来|初期|中期|后期|阶段|时期|day|night|morning|childhood|teen|adult|future|past|phase|period)/i.test(title.trim());
}
function normalizeWorldbook(entries: any[]): WorldbookEntry[] { return entries.map((e,i)=>{ const title=textOf(e.comment)||textOf(e.name)||textOf(e.key)||`世界书词目 ${i+1}`; const content=['content','entry','text','description','memo','value'].map(k=>textOf(e?.[k])).find(Boolean)||''; return {id:crypto.randomUUID(),title,content,enabled:true,isTimeline:looksLikeTimelineTitle(title)}; }); }

function App() {
  const [pets,setPets]=useState<PetRecord[]>(loadPetRecords());
  const [currentId,setCurrentId]=useState<string|null>(()=>loadPetRecords()[0]?.id||null);
  const [view,setView]=useState<View>('archive'); const [infoTab,setInfoTab]=useState<InfoTab>('text');
  const [timelineFilter,setTimelineFilter]=useState(true); const [settings,setSettings]=useState({floatingPet:false,mcp:false});
  const current=pets.find(p=>p.id===currentId)||null;
  useEffect(()=>savePetRecords(pets),[pets]);
  const updateCurrent=(fn:(p:PetRecord)=>PetRecord)=>{if(currentId)setPets(all=>all.map(p=>p.id===currentId?fn(p):p));};

  async function importChar(file?: File){ if(!file)return; try { const parsed=parseTavernPng(await file.arrayBuffer()); const image=await new Promise<string>(resolve=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.readAsDataURL(file)}); const worldbook=normalizeWorldbook(parsed.book); const pet=emptyPet(parsed.name||file.name.replace(/\.[^.]+$/,''),image,{profile:{description:parsed.description,syncedAt:Date.now()},worldbook,assets:{avatar:image,idle:image}}); setPets(all=>[pet,...all]); setCurrentId(pet.id); setView('info'); } catch(e) { alert('角色卡解析失败：'+(e instanceof Error?e.message:String(e))); } }
  function uploadAvatar(file?:File){if(!file)return;const r=new FileReader();r.onload=()=>updateCurrent(p=>({...p,image:String(r.result),assets:{...(p.assets||{}),avatar:String(r.result)}}));r.readAsDataURL(file);}
  const nav:Array<[View,string]>=[['archive','角色档案'],['home','小窝'],['explore','出去玩 · 探索'],['timestamp','时间戳'],['info','角色信息'],['diary','日记']];
  return <main className="app frameworkApp"><header className="frameworkHeader"><div><span className="eyebrow">CHARPET</span><h1>{current?.name||'角色档案'}</h1><p>{current?'当前 CHAR：'+current.name:'先创建或导入一个 CHAR'}</p></div><button className="settingsButton" onClick={()=>setView('settings')}>⚙ 设置</button></header>
    <nav className="frameworkNav">{nav.map(([key,label])=><button key={key} className={view===key?'active':''} onClick={()=>setView(key)}>{label}</button>)}</nav>
    {view==='archive'&&<section className="frameworkPage"><div className="pageTitle"><div><span className="eyebrow">CHAR ARCHIVE</span><h2>角色档案</h2><p>每个 CHAR 的文字、世界书、图库和生活数据彼此独立。</p></div><label className="primaryButton">＋ 导入酒馆 CHAR<input hidden type="file" accept="image/png,.png" onChange={e=>importChar(e.target.files?.[0])}/></label></div><div className="charArchiveList">{pets.map(p=><article key={p.id} className={'charIdCard '+(p.id===currentId?'current':'')}><img src={(p.assets?.avatar as string)||p.image} alt={p.name}/><div className="charCardText"><span className="cardLabel">CHAR</span><h3>{p.name}</h3><p>{p.userTitle||'主人'}</p><small>{p.profile?.description?'已导入角色描述与世界书':'尚未填写具体人设'}</small></div><div className="charCardActions"><button onClick={()=>{setCurrentId(p.id);setView('info')}}>头像 / 信息</button><button onClick={()=>{setCurrentId(p.id);setView('home')}}>进入小窝</button><button onClick={()=>setCurrentId(p.id)}>{p.id===currentId?'当前 CHAR':'设为当前'}</button></div></article>)}<label className="addCharCard"><b>＋</b><span>导入新的 CHAR</span><small>首次创建必须提供头像 / 酒馆 PNG</small><input hidden type="file" accept="image/png,.png" onChange={e=>importChar(e.target.files?.[0])}/></label></div></section>}
    {view==='home'&&<section className="frameworkPage"><div className="pageTitle"><div><span className="eyebrow">HOME</span><h2>小窝</h2><p>{current?current.name+' 的生活空间':'请先选择 CHAR'}</p></div></div>{current?<div className="homeFramework"><div className="homePetPlaceholder">{current.image&&<img src={(current.assets?.avatar as string)||current.image} alt={current.name}/>}<span>桌宠区域</span></div><div className="frameworkPanel"><h3>当前状态</h3><p>心情：{current.needs?.mood??70}　饱腹：{current.needs?.hunger??70}　精力：{current.needs?.energy??80}</p><p>这里承载桌宠、互动、状态与日常生活。</p></div></div>:<EmptyState text="先在角色档案创建 CHAR"/>}</section>}
    {view==='explore'&&<section className="frameworkPage"><span className="eyebrow">EXPLORE</span><h2>出去玩</h2><p>探索、外出、场景与剧情入口。</p><div className="placeholderGrid"><div>🌳 探索地点</div><div>🎭 剧情事件</div><div>🗺️ 新场景</div></div></section>}
    {view==='timestamp'&&<section className="frameworkPage"><span className="eyebrow">TIMESTAMP</span><h2>时间戳</h2><p>记录“什么时候、状态如何、做了什么”。</p><div className="timelinePlaceholder">{current?.timeline?.length?current.timeline.map(x=><article key={x.id}><time>{new Date(x.createdAt).toLocaleString()}</time><strong>{x.title}</strong><p>{x.detail||''}</p></article>):<EmptyState text="还没有时间记录"/>}</div></section>}
    {view==='info'&&<section className="frameworkPage"><div className="pageTitle"><div><span className="eyebrow">CHAR INFO</span><h2>{current?.name||'角色信息'}</h2><p>只显示当前 CHAR 自己的数据。</p></div>{current&&<label className="secondaryButton">更换头像<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>uploadAvatar(e.target.files?.[0])}/></label>}</div>{current?<><div className="infoTabs"><button className={infoTab==='text'?'active':''} onClick={()=>setInfoTab('text')}>① 文字</button><button className={infoTab==='gallery'?'active':''} onClick={()=>setInfoTab('gallery')}>② 图库</button></div>{infoTab==='text'?<TextInfo current={current} updateCurrent={updateCurrent} timelineFilter={timelineFilter} setTimelineFilter={setTimelineFilter}/>:<GalleryInfo current={current} updateCurrent={updateCurrent}/>}</>:<EmptyState text="请先选择 CHAR"/>}</section>}
    {view==='diary'&&<section className="frameworkPage"><span className="eyebrow">DIARY</span><h2>日记</h2><p>记录 CHAR 对经历的内容。</p><div className="timelinePlaceholder">{current?.diary?.length?current.diary.map(x=><article key={x.id}><time>{new Date(x.createdAt).toLocaleString()}</time><strong>{x.title}</strong><p>{x.text}</p></article>):<EmptyState text="还没有日记"/>}</div></section>}
    {view==='settings'&&<section className="frameworkPage"><span className="eyebrow">SETTINGS</span><h2>设置</h2><p>软件级配置，不属于某个 CHAR。</p><div className="settingsList"><SettingRow title="MCP" desc="配置 MCP 连接与 AI / 外部能力。" value={settings.mcp} onChange={v=>setSettings(s=>({...s,mcp:v}))}/><SettingRow title="悬浮窗 / 桌宠" desc="开启后让当前 CHAR 出现在桌面悬浮层。" value={settings.floatingPet} onChange={v=>setSettings(s=>({...s,floatingPet:v}))}/></div></section>}
  </main>;
}

function TextInfo({current,updateCurrent,timelineFilter,setTimelineFilter}:{current:PetRecord;updateCurrent:(fn:(p:PetRecord)=>PetRecord)=>void;timelineFilter:boolean;setTimelineFilter:(v:boolean)=>void}){const profile=current.profile||{};const entries=current.worldbook||[];const updateEntry=(id:string,patch:Partial<WorldbookEntry>)=>updateCurrent(p=>({...p,worldbook:(p.worldbook||[]).map(e=>e.id===id?{...e,...patch}:e)}));const add=()=>updateCurrent(p=>({...p,worldbook:[...(p.worldbook||[]),{id:crypto.randomUUID(),title:'新的词目',content:'',enabled:true,isTimeline:false}]}));return <div className="infoContent"><label>角色名字<input value={current.name} onChange={e=>updateCurrent(p=>({...p,name:e.target.value}))}/></label><label>具体人设 / 角色描述<textarea value={profile.description||''} placeholder="角色描述统一承载原场景、开场白、性格、示例等内容。" onChange={e=>updateCurrent(p=>({...p,profile:{...(p.profile||{}),description:e.target.value}}))}/></label><div className="twoColumns"><label>当前时间线<input value={current.era||''} placeholder="由 U 最终确认" onChange={e=>updateCurrent(p=>({...p,era:e.target.value}))}/></label><label>与 U 的关系<input value={current.userTitle||''} placeholder="例如：主人 / 恋人 / 朋友" onChange={e=>updateCurrent(p=>({...p,userTitle:e.target.value}))}/></label></div><div className="worldbookBox"><div><div><h3>世界书</h3><p>当前 CHAR 专属；可增加、删除、修改、开关。</p></div><button onClick={add}>＋ 增加词目</button></div>{entries.length?entries.map(e=><article className="worldbookItem" key={e.id}><input value={e.title} onChange={x=>updateEntry(e.id,{title:x.target.value,isTimeline:looksLikeTimelineTitle(x.target.value)})}/><textarea value={e.content} onChange={x=>updateEntry(e.id,{content:x.target.value})}/><span>{timelineFilter&&looksLikeTimelineTitle(e.title)?'时间线标题':'普通词目'}</span><button onClick={()=>updateEntry(e.id,{enabled:!e.enabled})}>{e.enabled?'关闭':'开启'}</button><button onClick={()=>updateCurrent(p=>({...p,worldbook:(p.worldbook||[]).filter(x=>x.id!==e.id)}))}>删除</button></article>):<EmptyState text="还没有世界书词目"/>}</div><div className="toggleLine"><div><b>时间线筛选 / 检测</b><small>默认开启；识别时只读取世界书标题，绝不读取正文判断。</small></div><input type="checkbox" checked={timelineFilter} onChange={e=>setTimelineFilter(e.target.checked)}/></div><div className="frameworkNote">CHAR 可以提出时间线变化，但不能自行切换；U 可以主动决定，最终决定权属于 U。</div></div>}
function GalleryInfo({current,updateCurrent}:{current:PetRecord;updateCurrent:(fn:(p:PetRecord)=>PetRecord)=>void}){const groups=[['头像库','avatar'],['姿势','poses'],['服装库','clothes'],['表情','expressions'],['状态','state']];return <div className="galleryFramework">{groups.map(([title,key])=><div className="galleryGroup" key={key}><div><h3>{title}</h3><small>{key==='clothes'?'全部由 U 上传，不设预置分类。':'当前 CHAR 专属素材。'}</small></div><label className="galleryAdd">＋ 添加<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{const file=e.target.files?.[0];if(!file)return;const r=new FileReader();r.onload=()=>updateCurrent(p=>({...p,assets:{...(p.assets||{}),[key]:String(r.result)}}));r.readAsDataURL(file)}}/></label>{(current.assets as any)?.[key]&&typeof (current.assets as any)[key]==='string'&&<img src={(current.assets as any)[key]} alt={title}/>}</div>)}</div>}
function SettingRow({title,desc,value,onChange}:{title:string;desc:string;value:boolean;onChange:(v:boolean)=>void}){return <div className="settingRow"><div><h3>{title}</h3><p>{desc}</p></div><button className={value?'switch on':'switch'} onClick={()=>onChange(!value)}>{value?'开启':'关闭'}</button></div>}
function EmptyState({text}:{text:string}){return <div className="emptyFramework">{text}</div>}
createRoot(document.getElementById('root')!).render(<App/>);

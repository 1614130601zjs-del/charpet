import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import './framework.css';
import type { DiaryEntry, PetMood, PetNeeds, PetRecord, TimelineEntry, WorldbookEntry } from './pet/petTypes';
import { loadPetRecords, savePetRecords } from './storage/petStore';

type View = 'archive' | 'home' | 'explore' | 'timestamp' | 'info' | 'diary' | 'settings';
type InfoTab = 'text' | 'gallery';
type Modal = 'create' | 'import' | 'album' | null;

type CardTemplate = { id: string; name: string; description: string };
const cardTemplates: CardTemplate[] = [
  { id: 'classic', name: '经典', description: '头像 + 名字 + 标签' },
  { id: 'portrait', name: '立绘', description: '大头像展示' },
  { id: 'minimal', name: '极简', description: '留白与文字为主' },
  { id: 'custom-ccs', name: '自定义 CCS', description: '上传自己的 CSS 模板' },
];
const colors = ['#b68cff', '#7aa7ff', '#6fcf97', '#f3a65a', '#e97b9a'];
const textOf = (v: unknown) => typeof v === 'string' ? v.trim() : '';
const uid = () => crypto.randomUUID();
const now = () => Date.now();

function newPet(name: string, image: string, card: PetRecord['card']): PetRecord {
  return {
    id: uid(), name: name || '未命名 CHAR', image, source: 'creator', createdAt: now(),
    assets: { avatar: image, idle: image, poses: {}, expressions: {}, parts: {}, animations: {} },
    userTitle: '主人', card, profile: { description: '', tone: '', personality: [], nickname: '', tags: [], signature: '' },
    worldbook: [], relationship: [{ key: 'affection', label: '亲密度', value: 0, min: 0, max: 100 }], relationshipText: '',
    needs: { hunger: 70, energy: 80, mood: 70 }, timeline: [], diary: [], memories: [], homeActivities: [],
    stats: { interactions: 0, affection: 0, lastSeenAt: now() }, timelineRecognition: true,
  };
}

function decodeUtf8(bytes: Uint8Array) { return new TextDecoder('utf-8').decode(bytes); }
function decodeCardValue(value: string) {
  const raw = textOf(value); if (!raw) return null;
  try { const direct = JSON.parse(raw); if (direct && typeof direct === 'object') return direct as Record<string, any>; } catch {}
  try {
    const normalized = raw.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4));
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    const decoded = JSON.parse(decodeUtf8(bytes));
    return decoded && typeof decoded === 'object' ? decoded as Record<string, any> : null;
  } catch { return null; }
}
function readPngChunks(buffer: ArrayBuffer) {
  const b = new Uint8Array(buffer); const sig = [137,80,78,71,13,10,26,10];
  if (b.length < 8 || !sig.every((x, i) => b[i] === x)) throw new Error('这不是有效的 PNG 文件');
  const out: { type: string; data: Uint8Array }[] = []; let o = 8; const view = new DataView(buffer);
  while (o + 12 <= b.length) { const len = view.getUint32(o); if (o + 12 + len > b.length) break; const type = String.fromCharCode(...b.slice(o + 4, o + 8)); out.push({ type, data: b.slice(o + 8, o + 8 + len) }); o += 12 + len; if (type === 'IEND') break; }
  return out;
}
function parseTavern(buffer: ArrayBuffer) {
  const values: { key: string; value: string }[] = [];
  for (const c of readPngChunks(buffer)) {
    if (c.type === 'tEXt') { const z = c.data.indexOf(0); if (z >= 0) values.push({ key: decodeUtf8(c.data.slice(0, z)), value: decodeUtf8(c.data.slice(z + 1)) }); }
    if (c.type === 'iTXt') {
      const z: number[] = []; for (let i = 0; i < c.data.length; i++) if (c.data[i] === 0) z.push(i);
      if (z.length >= 3 && c.data[z[0] + 1] === 0) values.push({ key: decodeUtf8(c.data.slice(0, z[0])), value: decodeUtf8(c.data.slice(z[2] + 1)) });
    }
  }
  const candidates = values.filter(x => /^(?:chara|ccv3)$/i.test(x.key)).map(x => decodeCardValue(x.value)).filter(Boolean) as Record<string, any>[];
  const data = candidates.find(x => x.data || x.name || x.character_name) || candidates[0]; if (!data) throw new Error('PNG 中没有找到可读取的 chara / ccv3 角色数据');
  const root = data.data && typeof data.data === 'object' ? data.data : data;
  const book = root.character_book || root.characterBook; const entries = Array.isArray(book?.entries) ? book.entries : [];
  const worldbook: WorldbookEntry[] = entries.map((e: any, i: number) => ({ id: `wb-${uid()}-${i}`, title: textOf(e.name || e.title || (Array.isArray(e.keys) ? e.keys.join(', ') : '世界书条目')) || `世界书 ${i + 1}`, content: textOf(e.content), enabled: e.enabled !== false, classification: 'unknown' }));
  const examples = Array.isArray(root.mes_example || root.messageExamples) ? (root.mes_example || root.messageExamples) : [];
  const parts = [root.description && `【角色描述】\n${root.description}`, root.personality && `【性格与气质】\n${root.personality}`, root.scenario && `【场景与背景】\n${root.scenario}`, root.first_mes && `【开场内容】\n${root.first_mes}`, examples.length && `【对话示例】\n${examples.map((x: any) => typeof x === 'string' ? x : JSON.stringify(x, null, 2)).join('\n\n')}`].filter(Boolean);
  return { name: textOf(root.name || root.character_name) || '未命名 CHAR', description: parts.join('\n\n'), worldbook };
}

/* Semantic timeline classification is intentionally pluggable. There is no vocabulary list here.
   An AI/MCP integration can provide window.CharPetSemanticClassifier(title). Until then the app
   leaves ambiguous titles as unknown instead of pretending a hard-coded keyword list understands them. */
async function classifyTimelineTitle(title: string): Promise<'timeline' | 'not-timeline' | 'unknown'> {
  const fn = (window as any).CharPetSemanticClassifier;
  if (typeof fn === 'function') {
    try { const result = await fn(title); if (result === true || result === 'timeline') return 'timeline'; if (result === false || result === 'not-timeline') return 'not-timeline'; } catch {}
  }
  return 'unknown';
}

function App() {
  const [pets, setPets] = useState<PetRecord[]>(() => loadPetRecords());
  const [currentId, setCurrentId] = useState<string | null>(() => loadPetRecords()[0]?.id || null);
  const [view, setView] = useState<View>('archive'); const [infoTab, setInfoTab] = useState<InfoTab>('text');
  const [modal, setModal] = useState<Modal>(null); const [album, setAlbum] = useState<PetRecord['homeActivities']>([]);
  const [timelineFilter, setTimelineFilter] = useState(true); const [creating, setCreating] = useState({ template: 'classic', color: '#b68cff', css: '' });
  const [settings, setSettings] = useState(() => { try { return JSON.parse(localStorage.getItem('charpet.settings.v1') || '{}'); } catch { return {}; } });
  const current = pets.find(p => p.id === currentId) || null;
  useEffect(() => savePetRecords(pets), [pets]);
  useEffect(() => localStorage.setItem('charpet.settings.v1', JSON.stringify(settings)), [settings]);
  const updateCurrent = (fn: (p: PetRecord) => PetRecord) => currentId && setPets(all => all.map(p => p.id === currentId ? fn(p) : p));
  const nav: [View, string][] = [['archive','角色档案'],['home','小窝'],['explore','出去玩 · 探索'],['timestamp','时间戳'],['info','角色资料'],['diary','日记'],['settings','设置']];

  function createFromImage(file?: File) { if (!file) return; const r = new FileReader(); r.onload = () => { const p = newPet(file.name.replace(/\.[^.]+$/, ''), String(r.result), { templateId: creating.template, accentColor: creating.color, customCss: creating.css }); setPets(a => [p, ...a]); setCurrentId(p.id); setModal(null); setView('info'); }; r.readAsDataURL(file); }
  function replaceAvatar(file?: File) { if (!file) return; const r = new FileReader(); r.onload = () => updateCurrent(p => ({ ...p, image: String(r.result), assets: { ...(p.assets || {}), avatar: String(r.result) } })); r.readAsDataURL(file); }
  function addAsset(group: 'poses'|'expressions'|'parts'|'animations', key: string, file?: File) { if (!file) return; const r = new FileReader(); r.onload = () => updateCurrent(p => ({ ...p, assets: { ...(p.assets || {}), [group]: { ...((p.assets?.[group] as any) || {}), [key]: String(r.result) } } })); group === 'parts' ? r.readAsDataURL(file) : r.readAsDataURL(file); }
  function logActivity(title: string, detail: string, special = false) { updateCurrent(p => ({ ...p, homeActivities: [{ id: uid(), createdAt: now(), title, detail, special }, ...(p.homeActivities || [])], timeline: [{ id: uid(), createdAt: now(), type: 'state', title, detail }, ...(p.timeline || [])], stats: { ...(p.stats || { interactions: 0, affection: 0, lastSeenAt: now() }), interactions: (p.stats?.interactions || 0) + 1, lastSeenAt: now() } })); }

  return <main className="app frameworkApp" style={current?.card?.accentColor ? { '--accent': current.card.accentColor } as React.CSSProperties : undefined}>
    <header className="frameworkHeader"><div><span className="eyebrow">CHARPET</span><h1>{current?.name || '角色档案'}</h1><p>{current ? `当前 CHAR：${current.name}` : '你的 CHAR 展示柜'}</p></div><div className="headerActions"><button className="secondaryButton" onClick={() => setModal('import')}>导入酒馆卡</button><button className="primaryButton" onClick={() => { setModal('create'); setView('archive'); }}>＋ 新建 CHAR</button></div></header>
    <nav className="frameworkNav">{nav.map(([key,label]) => <button key={key} className={view === key ? 'active' : ''} onClick={() => setView(key)}>{label}</button>)}</nav>

    {view === 'archive' && <section className="frameworkPage"><div className="pageTitle"><div><span className="eyebrow">CHAR ARCHIVE</span><h2>角色档案</h2><p>这里只展示你有哪些 CHAR。</p></div></div><div className="charArchiveList">{pets.map(p => <article key={p.id} className={'charIdCard ' + (p.id === currentId ? 'current' : '')}><img src={(p.assets?.avatar as string) || p.image} alt={p.name} onClick={() => { setCurrentId(p.id); setView('info'); }}/><div className="charCardText" onClick={() => { setCurrentId(p.id); setView('home'); }}><span className="cardLabel">CHAR</span><h3>{p.name}</h3><p>{p.card?.nickname || p.userTitle || '主人'}</p><small>{p.card?.signature || '进入小窝看看'}</small></div><div className="charCardActions"><button onClick={() => { setCurrentId(p.id); setView('info'); }}>角色资料</button><button onClick={() => { setCurrentId(p.id); setView('home'); }}>小窝</button><button onClick={() => setCurrentId(p.id)}>{p.id === currentId ? '当前 CHAR' : '设为当前'}</button></div></article>)}{!pets.length && <EmptyState text="还没有 CHAR。先新建一个，或者导入酒馆卡。"/>}</div></section>}

    {view === 'home' && <HomeView current={current} logActivity={logActivity} openAlbum={items => { setAlbum(items); setModal('album'); }} updateCurrent={updateCurrent}/>} 
    {view === 'explore' && <ExploreView current={current} logActivity={logActivity}/>} 
    {view === 'timestamp' && <TimestampView current={current}/>} 
    {view === 'info' && <InfoView current={current} tab={infoTab} setTab={setInfoTab} timelineFilter={timelineFilter} setTimelineFilter={setTimelineFilter} updateCurrent={updateCurrent} replaceAvatar={replaceAvatar} addAsset={addAsset}/>} 
    {view === 'diary' && <DiaryView current={current} updateCurrent={updateCurrent}/>} 
    {view === 'settings' && <SettingsView settings={settings} setSettings={setSettings}/>} 

    {modal === 'create' && <CreateModal state={creating} setState={setCreating} onCreate={createFromImage} onClose={() => setModal(null)}/>} 
    {modal === 'import' && <ImportModal pets={pets} setPets={setPets} setCurrentId={setCurrentId} onClose={() => setModal(null)}/>} 
    {modal === 'album' && <AlbumModal items={album} onClose={() => setModal(null)}/>} 
  </main>;
}

function HomeView({ current, logActivity, openAlbum, updateCurrent }: { current: PetRecord|null; logActivity: (a:string,b:string,s?:boolean)=>void; openAlbum:(x:NonNullable<PetRecord['homeActivities']>)=>void; updateCurrent:(f:(p:PetRecord)=>PetRecord)=>void }) {
  if (!current) return <section className="frameworkPage"><EmptyState text="先在角色档案选择或创建 CHAR。"/></section>;
  const recent = (current.homeActivities || []).filter(x => x.special);
  return <section className="frameworkPage"><div className="pageTitle"><div><span className="eyebrow">HOME</span><h2>小窝</h2><p>{current.name} 的生活空间</p></div></div><div className="homeFramework"><div className="homePetPlaceholder"><img src={(current.assets?.avatar as string)||current.image} alt={current.name}/><strong>{current.name}</strong><span>现在在小窝里</span><div className="homeActions"><button onClick={()=>logActivity('坐到沙发上','安静地休息了一会儿')}>🛋 沙发</button><button onClick={()=>logActivity('躺到床上','准备休息')}>🛏 床</button><button onClick={()=>logActivity('吃东西','补充了一点饱腹感')}>🍜 吃东西</button><button onClick={()=>logActivity('看书','在小窝里看了一会儿书')}>📖 阅读</button><button onClick={()=>logActivity('睡觉','进入睡眠状态')}>💤 睡觉</button></div></div><div className="frameworkPanel"><h3>当前状态</h3><Meters needs={current.needs}/><p>普通生活会进入<strong>时间戳</strong>，不会自动弹相册。</p><div className="panelActions"><button onClick={()=>openAlbum(recent)} disabled={!recent.length}>查看 CHAR 主动留下的相册 {recent.length ? `(${recent.length})` : ''}</button><button onClick={()=>logActivity('CHAR 主动记录了一件事','这是由 CHAR / MCP 主动调用产生的特殊内容',true)}>模拟一次主动事件</button></div></div><AppearanceMini current={current} updateCurrent={updateCurrent}/></div></section>;
}
function AppearanceMini({current,updateCurrent}:{current:PetRecord;updateCurrent:(f:(p:PetRecord)=>PetRecord)=>void}) { const pose=((current.assets?.poses as any)?.current)||'stand'; const mood=((current.assets?.expressions as any)?.current)||'neutral'; return <div className="frameworkPanel"><h3>当前形象</h3><div className="appearanceChoices"><label>姿势<select value={pose} onChange={e=>updateCurrent(p=>({...p,assets:{...(p.assets||{}),poses:{...((p.assets?.poses as any)||{}),current:e.target.value}}}))}><option value="stand">站立</option><option value="sit">坐着</option><option value="lie">躺着</option><option value="walk">走动</option></select></label><label>表情<select value={mood} onChange={e=>updateCurrent(p=>({...p,assets:{...(p.assets||{}),expressions:{...((p.assets?.expressions as any)||{}),current:e.target.value}}}))}><option value="neutral">普通</option><option value="happy">开心</option><option value="sad">难过</option><option value="angry">生气</option><option value="shy">害羞</option><option value="sleepy">困倦</option></select></label></div><p className="muted">服装、配件、姿势和表情都属于 CHAR 的展示层，可随时替换。</p></div> }
function ExploreView({current,logActivity}:{current:PetRecord|null;logActivity:(a:string,b:string,s?:boolean)=>void}) { if(!current)return <section className="frameworkPage"><EmptyState text="先选择 CHAR。"/></section>; return <section className="frameworkPage"><span className="eyebrow">EXPLORE</span><h2>出去玩 · 探索</h2><p>这里放外出、地点和体验。它们可以留下时间戳，也可以成为故事。</p><div className="placeholderGrid"><button onClick={()=>logActivity('去了附近的小街','随便走走，看看今天有什么。')}>🌆 附近街区</button><button onClick={()=>logActivity('去公园散步','吹了会儿风。')}>🌳 公园</button><button onClick={()=>logActivity('去咖啡店','坐下来休息。')}>☕ 咖啡店</button><button onClick={()=>logActivity('开启一次特别探索','这次探索由 CHAR 主动发起。',true)}>✨ CHAR 主动探索</button></div></section> }
function TimestampView({current}:{current:PetRecord|null}) { const rows=current?.timeline||[]; return <section className="frameworkPage"><span className="eyebrow">TIMESTAMP</span><h2>时间戳</h2><p>只记录生活发生了什么，不承担日记的叙事功能。</p><div className="timelinePlaceholder">{rows.length?rows.map(x=><article key={x.id}><time>{new Date(x.createdAt).toLocaleString()}</time><strong>{x.title}</strong><p>{x.detail||''}</p></article>):<EmptyState text="还没有时间记录。去小窝做点什么吧。"/>}</div></section> }

function InfoView({current,tab,setTab,timelineFilter,setTimelineFilter,updateCurrent,replaceAvatar,addAsset}:{current:PetRecord|null;tab:InfoTab;setTab:(x:InfoTab)=>void;timelineFilter:boolean;setTimelineFilter:(x:boolean)=>void;updateCurrent:(f:(p:PetRecord)=>PetRecord)=>void;replaceAvatar:(f?:File)=>void;addAsset:(g:any,k:string,f?:File)=>void}) { if(!current)return <section className="frameworkPage"><EmptyState text="请先选择 CHAR。"/></section>; return <section className="frameworkPage"><div className="pageTitle"><div><span className="eyebrow">CHAR INFO</span><h2>{current.name}</h2><p>文字是角色定义与展示资料，图库是外观资产。</p></div><label className="secondaryButton">更换头像<input hidden type="file" accept="image/*" onChange={e=>replaceAvatar(e.target.files?.[0])}/></label></div><div className="infoTabs"><button className={tab==='text'?'active':''} onClick={()=>setTab('text')}>① 文字</button><button className={tab==='gallery'?'active':''} onClick={()=>setTab('gallery')}>② 图库</button></div>{tab==='text'?<TextInfo current={current} updateCurrent={updateCurrent} timelineFilter={timelineFilter} setTimelineFilter={setTimelineFilter}/>:<GalleryInfo current={current} addAsset={addAsset}/>}</section> }
function TextInfo({current,updateCurrent,timelineFilter,setTimelineFilter}:{current:PetRecord;updateCurrent:(f:(p:PetRecord)=>PetRecord)=>void;timelineFilter:boolean;setTimelineFilter:(x:boolean)=>void}) { const p=current.profile||{}; const update=(patch:Partial<NonNullable<PetRecord['profile']>>)=>updateCurrent(x=>({...x,profile:{...(x.profile||{}),...patch}})); const wb=(current.worldbook||[]).filter(e=>!timelineFilter||e.classification!=='not-timeline'); return <div className="infoTextGrid"><div className="frameworkPanel"><h3>角色文字</h3><label>角色描述<textarea value={p.description||''} onChange={e=>update({description:e.target.value})} placeholder="统一的角色描述。酒馆导入时，场景、性格、开场、示例会在这里合并。"/></label><label>昵称 / 称呼<input value={p.nickname||''} onChange={e=>update({nickname:e.target.value})}/></label><label>标签<input value={(p.tags||[]).join(', ')} onChange={e=>update({tags:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)})}/></label><label>签名<input value={p.signature||''} onChange={e=>update({signature:e.target.value})}/></label><label>关系<textarea value={current.relationshipText||''} onChange={e=>updateCurrent(x=>({...x,relationshipText:e.target.value}))} placeholder="例如：朋友、恋人、搭档……由你决定。"/></label></div><div className="frameworkPanel"><div className="rowBetween"><div><h3>世界书</h3><p className="muted">时间线识别默认开启，只允许读取<strong>标题</strong>做分类。</p></div><label className="switchLabel"><input type="checkbox" checked={timelineFilter} onChange={e=>setTimelineFilter(e.target.checked)}/> 时间线识别</label></div><div className="worldbookList">{wb.length?wb.map(e=><WorldbookRow key={e.id} entry={e} updateCurrent={updateCurrent}/>):<EmptyState text="还没有世界书条目。"/>}</div><p className="muted">不会把具体示例词写进分类器。没有语义分类器时，条目保持“待判断”，避免误判。</p></div></div> }
function WorldbookRow({entry,updateCurrent}:{entry:WorldbookEntry;updateCurrent:(f:(p:PetRecord)=>PetRecord)=>void}) { const [busy,setBusy]=useState(false); async function classify(){setBusy(true);const c=await classifyTimelineTitle(entry.title);updateCurrent(p=>({...p,worldbook:(p.worldbook||[]).map(x=>x.id===entry.id?{...x,classification:c,isTimeline:c==='timeline'}:x)}));setBusy(false)} return <article className="worldbookRow"><div><strong>{entry.title}</strong><p>{entry.content.slice(0,140)}{entry.content.length>140?'…':''}</p></div><span className={'statusPill '+(entry.classification||'unknown')}>{entry.classification==='timeline'?'时间线':entry.classification==='not-timeline'?'普通条目':'待判断'}</span><button onClick={classify} disabled={busy}>{busy?'判断中…':'语义判断'}</button></article> }
function GalleryInfo({current,addAsset}:{current:PetRecord;addAsset:(g:any,k:string,f?:File)=>void}) { const groups:[string,string,string][]=[['poses','姿势','stand'],['expressions','表情','happy'],['parts','身体组件','ears'],['animations','动画','idle']]; return <div className="galleryGrid">{groups.map(([group,label,key])=><div className="frameworkPanel" key={group}><h3>{label}</h3><div className="assetPreview">{(current.assets?.[group] as any)?.[key]?<img src={(current.assets?.[group] as any)[key]} alt=""/>:<span>暂无</span>}</div><label className="secondaryButton">上传{label}<input hidden type="file" accept="image/*,video/*" onChange={e=>addAsset(group,key,e.target.files?.[0])}/></label></div>)}</div> }

function DiaryView({current,updateCurrent}:{current:PetRecord|null;updateCurrent:(f:(p:PetRecord)=>PetRecord)=>void}) { const [title,setTitle]=useState(''); const [text,setText]=useState(''); if(!current)return <section className="frameworkPage"><EmptyState text="请先选择 CHAR。"/></section>; const add=()=>{if(!text.trim())return;const d:DiaryEntry={id:uid(),createdAt:now(),title:title.trim()||'今天',text:text.trim(),source:'user'};updateCurrent(p=>({...p,diary:[d,...(p.diary||[])]}));setTitle('');setText('')}; return <section className="frameworkPage"><span className="eyebrow">DIARY</span><h2>日记</h2><p>独立于时间戳的叙事空间。</p><div className="diaryComposer frameworkPanel"><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="标题（可选）"/><textarea value={text} onChange={e=>setText(e.target.value)} placeholder="写下今天想留下的一段话……"/><button className="primaryButton" onClick={add}>保存日记</button></div><div className="timelinePlaceholder">{(current.diary||[]).map(x=><article key={x.id}><time>{new Date(x.createdAt).toLocaleString()}</time><strong>{x.title||'无标题'}</strong><p>{x.text}</p></article>)}</div></section> }
function SettingsView({settings,setSettings}:{settings:any;setSettings:(f:any)=>void}) { const set=(k:string,v:any)=>setSettings((s:any)=>({...s,[k]:v})); return <section className="frameworkPage"><span className="eyebrow">SETTINGS</span><h2>设置</h2><p>这里是软件级配置，不属于任何一个 CHAR。</p><div className="settingsList"><SettingRow title="MCP" desc="让 CHAR 可以调用桌宠、小窝、角色卡、互动、生活、关系、探索、世界等能力。" value={!!settings.mcp} onChange={v=>set('mcp',v)}/><SettingRow title="悬浮窗 / 桌宠" desc="开启本地桌宠能力。桌宠本身可以离线运行，也可以被 CHAR 主动调用。" value={!!settings.floatingPet} onChange={v=>set('floatingPet',v)}/><div className="frameworkPanel"><h3>主题色</h3><div className="templateColors">{colors.map(c=><button key={c} aria-label={c} style={{background:c}} className={settings.accent===c?'selected':''} onClick={()=>set('accent',c)}/>)}</div></div></div></section> }
function SettingRow({title,desc,value,onChange}:{title:string;desc:string;value:boolean;onChange:(v:boolean)=>void}) {return <div className="settingRow"><div><strong>{title}</strong><p>{desc}</p></div><input type="checkbox" checked={value} onChange={e=>onChange(e.target.checked)}/></div>}
function Meters({needs}:{needs?:PetNeeds}) { const n=needs||{hunger:70,energy:80,mood:70}; return <div className="meters">{[['心情',n.mood],['饱腹',n.hunger],['精力',n.energy]].map(([k,v])=><div key={String(k)}><div className="rowBetween"><span>{k}</span><b>{v as number}</b></div><progress value={v as number} max={100}/></div>)}</div> }

function CreateModal({state,setState,onCreate,onClose}:{state:{template:string;color:string;css:string};setState:(f:any)=>void;onCreate:(f?:File)=>void;onClose:()=>void}) { return <ModalShell title="新建 CHAR" subtitle="只创建头像与展示层，不在这里导入酒馆卡。" onClose={onClose}><h3>① 排版模板</h3><div className="templateGrid">{cardTemplates.map(t=><button key={t.id} className={state.template===t.id?'active':''} onClick={()=>setState((s:any)=>({...s,template:t.id}))}><strong>{t.name}</strong><small>{t.description}</small></button>)}</div>{state.template==='custom-ccs'&&<label>自定义 CSS<textarea value={state.css} onChange={e=>setState((s:any)=>({...s,css:e.target.value}))}/></label>}<h3>② 配色</h3><div className="templateColors">{colors.map(c=><button key={c} style={{background:c}} className={state.color===c?'selected':''} onClick={()=>setState((s:any)=>({...s,color:c}))}/>)}</div><label>色环自选 <input type="color" value={state.color} onChange={e=>setState((s:any)=>({...s,color:e.target.value}))}/></label><h3>③ 上传头像</h3><label className="primaryButton uploadChoice">选择头像并创建<input hidden type="file" accept="image/*" onChange={e=>onCreate(e.target.files?.[0])}/></label></ModalShell> }
function ImportModal({pets,setPets,setCurrentId,onClose}:{pets:PetRecord[];setPets:(f:(a:PetRecord[])=>PetRecord[])=>void;setCurrentId:(x:string)=>void;onClose:()=>void}) { const [parsed,setParsed]=useState<ReturnType<typeof parseTavern>|null>(null); const [error,setError]=useState(''); const [relationship,setRelationship]=useState(''); const [target,setTarget]=useState('new'); const [busy,setBusy]=useState(false); async function choose(file?:File){if(!file)return;setError('');try{setParsed(parseTavern(await file.arrayBuffer()))}catch(e){setError(e instanceof Error?e.message:'导入失败')}} async function importNow(){if(!parsed)return;setBusy(true);const p=target==='new'?newPet(parsed.name,'',undefined):pets.find(x=>x.id===target); if(!p){setBusy(false);return} const next:PetRecord={...p,name:parsed.name||p.name,profile:{...(p.profile||{}),description:parsed.description,syncedAt:now()},worldbook:parsed.worldbook,relationshipText:relationship,timelineRecognition:true,source:target==='new'?'upload':p.source}; if(target==='new')setPets(a=>[next,...a]);else setPets(a=>a.map(x=>x.id===p.id?next:x));setCurrentId(next.id);setBusy(false);onClose()} return <ModalShell title="导入酒馆卡" subtitle="场景、性格、开场、示例会统一进入角色描述；世界书只读取标题做时间线语义判断。" onClose={onClose}><label className="charpetDrop">选择 Tavern PNG<input type="file" hidden accept="image/png" onChange={e=>choose(e.target.files?.[0])}/></label>{error&&<p className="errorText">{error}</p>}{parsed&&<div className="frameworkPanel"><h3>{parsed.name}</h3><p>{parsed.description.slice(0,500)}{parsed.description.length>500?'…':''}</p><p>世界书：{parsed.worldbook.length} 条</p><label>导入到<select value={target} onChange={e=>setTarget(e.target.value)}><option value="new">新 CHAR</option>{pets.map(x=><option value={x.id} key={x.id}>{x.name}（覆盖文字与世界书）</option>)}</select></label><label>与用户的关系<textarea value={relationship} onChange={e=>setRelationship(e.target.value)} placeholder="关系由你最终决定，可以留空。"/></label><button className="primaryButton" disabled={busy} onClick={importNow}>{busy?'导入中…':'确认导入'}</button></div>}</ModalShell> }
function AlbumModal({items,onClose}:{items:NonNullable<PetRecord['homeActivities']>;onClose:()=>void}) { return <ModalShell title="小相册" subtitle="只有 CHAR 主动调用产生的特殊内容才会出现在这里。" onClose={onClose}><div className="albumGrid">{items.length?items.map(x=><article key={x.id}><div className="albumMedia">{x.media?.[0]?.kind==='video'?<video controls src={x.media[0].src}/>:x.media?.[0]?.src?<img src={x.media[0].src} alt={x.media[0].alt||''}/>:<span>✨</span>}</div><strong>{x.title}</strong><p>{x.detail}</p></article>):<EmptyState text="还没有 CHAR 主动留下的特别内容。"/>}</div></ModalShell> }
function ModalShell({title,subtitle,onClose,children}:{title:string;subtitle:string;onClose:()=>void;children:React.ReactNode}) {return <div className="frameworkModal" role="dialog" aria-modal="true"><div className="frameworkModalCard"><div className="pageTitle"><div><span className="eyebrow">CHARPET</span><h2>{title}</h2><p>{subtitle}</p></div><button onClick={onClose}>×</button></div>{children}</div></div>}
function EmptyState({text}:{text:string}) {return <div className="emptyFramework">{text}</div>}
createRoot(document.getElementById('root')!).render(<App/>);

import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import './framework.css';
import type { PetRecord, WorldbookEntry } from './pet/petTypes';
import { loadPetRecords, savePetRecords } from './storage/petStore';

type View = 'archive' | 'home' | 'explore' | 'timestamp' | 'info' | 'diary' | 'settings';
type InfoTab = 'text' | 'gallery';
type CardTemplate = { id: string; name: string; description: string };
const cardTemplates: CardTemplate[] = [
  { id: 'classic', name: '经典', description: '头像 + 名字 + 标签' },
  { id: 'portrait', name: '立绘', description: '大头像展示' },
  { id: 'minimal', name: '极简', description: '留白与文字为主' },
  { id: 'custom-ccs', name: '自定义 CCS', description: '上传自己的 CCS 模板' },
];

const emptyPet = (name: string, image: string, card?: PetRecord['card']): PetRecord => ({
  id: crypto.randomUUID(), name, image, source: 'creator', createdAt: Date.now(),
  assets: { idle: image, avatar: image }, userTitle: '主人', card,
  needs: { hunger: 70, energy: 80, mood: 70 },
  relationship: [{ key: 'relationship', label: '关系', value: 0, min: 0, max: 100 }],
  timeline: [], diary: [], memories: [], homeActivities: [],
  stats: { interactions: 0, affection: 0, lastSeenAt: Date.now() },
});

const textOf = (v: unknown) => typeof v === 'string' ? v : '';
function looksLikeTimelineTitle(title: string) { return /(线|期|后|前|年|岁|童年|少年|青年|成年|晚年|幼年|过去|现在|未来|初期|中期|后期|阶段|时期|day|night|morning|childhood|teen|adult|future|past|phase|period)/i.test(title.trim()); }

function App() {
  const [pets, setPets] = useState<PetRecord[]>(loadPetRecords());
  const [currentId, setCurrentId] = useState<string | null>(() => loadPetRecords()[0]?.id || null);
  const [view, setView] = useState<View>('archive');
  const [infoTab, setInfoTab] = useState<InfoTab>('text');
  const [timelineFilter, setTimelineFilter] = useState(true);
  const [settings, setSettings] = useState({ floatingPet: false, mcp: false });
  const [creating, setCreating] = useState(false);
  const [templateId, setTemplateId] = useState('classic');
  const [accentColor, setAccentColor] = useState('#b68cff');
  const [customCss, setCustomCss] = useState('');
  const current = pets.find(p => p.id === currentId) || null;
  useEffect(() => savePetRecords(pets), [pets]);
  const updateCurrent = (fn: (p: PetRecord) => PetRecord) => { if (currentId) setPets(all => all.map(p => p.id === currentId ? fn(p) : p)); };

  function createChar(file?: File) {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      const image = String(r.result);
      const pet = emptyPet(file.name.replace(/\.[^.]+$/, ''), image, { templateId, accentColor, customCss });
      setPets(all => [pet, ...all]);
      setCurrentId(pet.id);
      setCreating(false);
      setView('info');
    };
    r.readAsDataURL(file);
  }
  function uploadAvatar(file?: File) {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => updateCurrent(p => ({ ...p, image: String(r.result), assets: { ...(p.assets || {}), avatar: String(r.result) } }));
    r.readAsDataURL(file);
  }
  function addGalleryAsset(key: string, file?: File) {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => updateCurrent(p => ({ ...p, assets: { ...(p.assets || {}), [key]: String(r.result) } }));
    r.readAsDataURL(file);
  }

  const nav: Array<[View, string]> = [
    ['archive', '角色档案'], ['home', '小窝'], ['explore', '出去玩 · 探索'],
    ['timestamp', '时间戳'], ['info', '角色资料'], ['diary', '日记'], ['settings', '设置'],
  ];

  return <main className="app frameworkApp">
    <header className="frameworkHeader">
      <div><span className="eyebrow">CHARPET</span><h1>{current?.name || '角色档案'}</h1><p>{current ? '当前 CHAR：' + current.name : '你的 CHAR 展示柜'}</p></div>
    </header>
    <nav className="frameworkNav">{nav.map(([key, label]) => <button key={key} className={view === key ? 'active' : ''} onClick={() => setView(key)}>{label}</button>)}</nav>

    {view === 'archive' && <section className="frameworkPage">
      <div className="pageTitle"><div><span className="eyebrow">CHAR ARCHIVE</span><h2>角色档案</h2><p>这里只展示你有哪些 CHAR。</p></div><button className="primaryButton" onClick={() => setCreating(true)}>＋ 新建 CHAR</button></div>
      <div className="charArchiveList">
        {pets.map(p => <article key={p.id} className={'charIdCard ' + (p.id === currentId ? 'current' : '')} style={{ borderColor: p.id === currentId ? (p.card?.accentColor || 'transparent') : undefined }}>
          <img src={(p.assets?.avatar as string) || p.image} alt={p.name} onClick={() => { setCurrentId(p.id); setView('info'); }} />
          <div className="charCardText" onClick={() => { setCurrentId(p.id); setView('home'); }}><span className="cardLabel">CHAR</span><h3>{p.name}</h3><p>{p.card?.nickname || p.userTitle || '主人'}</p><small>{p.card?.signature || '进入小窝看看'}</small></div>
          <div className="charCardActions"><button onClick={() => { setCurrentId(p.id); setView('info'); }}>角色资料</button><button onClick={() => { setCurrentId(p.id); setView('home'); }}>小窝</button><button onClick={() => setCurrentId(p.id)}>{p.id === currentId ? '当前 CHAR' : '设为当前'}</button></div>
        </article>)}
        {!pets.length && <EmptyState text="还没有男人。点击 ＋，先选模板和配色，再上传头像。" />}
      </div>
    </section>}

    {view === 'home' && <section className="frameworkPage">
      <div className="pageTitle"><div><span className="eyebrow">HOME</span><h2>小窝</h2><p>{current ? current.name + ' 的生活空间' : '请先选择 CHAR'}</p></div></div>
      {current ? <div className="homeFramework">
        <div className="homePetPlaceholder"><img src={(current.assets?.avatar as string) || current.image} alt={current.name} /><span>{current.name} 在这里</span></div>
        <div className="frameworkPanel"><h3>当前状态</h3><p>心情：{current.needs?.mood ?? 70}　饱腹：{current.needs?.hunger ?? 70}　精力：{current.needs?.energy ?? 80}</p><p>这里是简单的小窝。CHAR 可以在家具、床、沙发等地方生活和互动。</p></div>
        <CurrentAppearance current={current} updateCurrent={updateCurrent} uploadAvatar={uploadAvatar} />
      </div> : <EmptyState text="先在角色档案创建 CHAR" />}
    </section>}

    {view === 'explore' && <section className="frameworkPage"><span className="eyebrow">EXPLORE</span><h2>出去玩</h2><p>探索、外出、场景与剧情入口。</p><div className="placeholderGrid"><div>🌳 探索地点</div><div>🎭 剧情事件</div><div>🗺️ 新场景</div></div></section>}
    {view === 'timestamp' && <section className="frameworkPage"><span className="eyebrow">TIMESTAMP</span><h2>时间戳</h2><p>记录“什么时候、状态如何、做了什么”。</p><div className="timelinePlaceholder">{current?.timeline?.length ? current.timeline.map(x => <article key={x.id}><time>{new Date(x.createdAt).toLocaleString()}</time><strong>{x.title}</strong><p>{x.detail || ''}</p></article>) : <EmptyState text="还没有时间记录" />}</div></section>}

    {view === 'info' && <section className="frameworkPage"><div className="pageTitle"><div><span className="eyebrow">CHAR INFO</span><h2>{current?.name || '角色资料'}</h2><p>当前 CHAR 的文字和图库都在这里。</p></div>{current && <label className="secondaryButton">更换头像<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e => uploadAvatar(e.target.files?.[0])} /></label>}</div>{current ? <><div className="infoTabs"><button className={infoTab === 'text' ? 'active' : ''} onClick={() => setInfoTab('text')}>① 文字</button><button className={infoTab === 'gallery' ? 'active' : ''} onClick={() => setInfoTab('gallery')}>② 图库</button></div>{infoTab === 'text' ? <TextInfo current={current} updateCurrent={updateCurrent} timelineFilter={timelineFilter} setTimelineFilter={setTimelineFilter} /> : <GalleryInfo current={current} addGalleryAsset={addGalleryAsset} />}</> : <EmptyState text="请先选择 CHAR" />}</section>}

    {view === 'diary' && <section className="frameworkPage"><span className="eyebrow">DIARY</span><h2>日记</h2><p>记录 CHAR 对经历的内容。</p><div className="timelinePlaceholder">{current?.diary?.length ? current.diary.map(x => <article key={x.id}><time>{new Date(x.createdAt).toLocaleString()}</time><strong>{x.title}</strong><p>{x.text}</p></article>) : <EmptyState text="还没有日记" />}</div></section>}
    {view === 'settings' && <section className="frameworkPage"><span className="eyebrow">SETTINGS</span><h2>设置</h2><p>软件级配置，不属于某一个 CHAR。</p><div className="settingsList"><SettingRow title="MCP" desc="连接外部聊天 AI / AI 服务，让 CHAR 获得外部能力。" value={settings.mcp} onChange={v => setSettings(s => ({ ...s, mcp: v }))} /><SettingRow title="悬浮窗 / 桌宠" desc="开启后让当前 CHAR 出现在桌面悬浮层。" value={settings.floatingPet} onChange={v => setSettings(s => ({ ...s, floatingPet: v }))} /></div></section>}

    {creating && <CreateCharModal templateId={templateId} setTemplateId={setTemplateId} accentColor={accentColor} setAccentColor={setAccentColor} customCss={customCss} setCustomCss={setCustomCss} onCreate={createChar} onClose={() => setCreating(false)} />}
  </main>;
}

function CreateCharModal({ templateId, setTemplateId, accentColor, setAccentColor, customCss, setCustomCss, onCreate, onClose }: { templateId: string; setTemplateId: (v: string) => void; accentColor: string; setAccentColor: (v: string) => void; customCss: string; setCustomCss: (v: string) => void; onCreate: (file?: File) => void; onClose: () => void }) {
  return <div className="frameworkModal" role="dialog" aria-modal="true"><div className="frameworkModalCard"><div className="pageTitle"><div><span className="eyebrow">NEW CHAR</span><h2>新建角色</h2><p>这里只选择展示方式和头像，不导入酒馆卡。</p></div><button onClick={onClose}>×</button></div><h3>① 排版模板</h3><div className="templateGrid">{cardTemplates.map(t => <button key={t.id} className={templateId === t.id ? 'active' : ''} onClick={() => setTemplateId(t.id)}><strong>{t.name}</strong><small>{t.description}</small></button>)}</div>{templateId === 'custom-ccs' && <label>自定义 CCS 模板<input type="file" accept=".css,.ccs,text/css" onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => setCustomCss(String(r.result)); r.readAsText(f); }} /></label>}<h3>② 配色</h3><div className="colorChoice"><div className="templateColors">{['#b68cff','#7aa7ff','#6fcf97','#f3a65a','#e97b9a'].map(c => <button key={c} aria-label={c} style={{ background: c }} onClick={() => setAccentColor(c)} className={accentColor === c ? 'selected' : ''} />)}</div><label>色环自选 <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} /></label></div><h3>③ 上传头像</h3><label className="primaryButton uploadChoice">选择头像并创建<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e => onCreate(e.target.files?.[0])} /></label></div></div>;
}

function CurrentAppearance({ current, updateCurrent, uploadAvatar }: { current: PetRecord; updateCurrent: (fn: (p: PetRecord) => PetRecord) => void; uploadAvatar: (file?: File) => void }) {
  const appearance = current.card || {};
  return <div className="frameworkPanel"><div className="pageTitle"><div><h3>当前形象</h3><p>身体工作室放在小窝里：CHAR 现在是什么样子，由这里调整。</p></div><label className="secondaryButton">换头像<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e => uploadAvatar(e.target.files?.[0])} /></label></div><div className="appearanceChoices"><label>当前姿势<select value={String((current.assets?.poses as any)?.current || 'stand')} onChange={e => updateCurrent(p => ({ ...p, assets: { ...(p.assets || {}), poses: { ...((p.assets?.poses as any) || {}), current: e.target.value } } }))}><option value="stand">站立</option><option value="sit">坐着</option><option value="lie">躺着</option><option value="walk">走动</option><option value="custom">自定义</option></select></label><label>当前表情<select value={String((current.assets?.expressions as any)?.current || 'neutral')} onChange={e => updateCurrent(p => ({ ...p, assets: { ...(p.assets || {}), expressions: { ...((p.assets?.expressions as any) || {}), current: e.target.value } } }))}><option value="neutral">普通</option><option value="happy">开心</option><option value="sad">难过</option><option value="angry">生气</option><option value="shy">害羞</option><option value="sleepy">困倦</option></select></label><label>当前配色<input type="color" value={appearance.accentColor || '#b68cff'} onChange={e => updateCurrent(p => ({ ...p, card: { ...(p.card || {}), accentColor: e.target.value } }))} /></label></div></div>;
}

function TextInfo({ current, updateCurrent, timelineFilter, setTimelineFilter }: { current: PetRecord; updateCurrent: (fn: (p: PetRecord) => PetRecord) => void; timelineFilter: boolean; setTimelineFilter: (v: boolean) => void }) { const profile = current.profile || {}; const entries = current.worldbook || []; const updateEntry = (id: string, patch: Partial<WorldbookEntry>) => updateCurrent(p => ({ ...p, worldbook: (p.worldbook || []).map(e => e.id === id ? { ...e, ...patch } : e) })); const add = () => updateCurrent(p => ({ ...p, worldbook: [...(p.worldbook || []), { id: crypto.randomUUID(), title: '新的词目', content: '', enabled: true, isTimeline: false }] })); return <div className="infoContent"><label>角色名字<input value={current.name} onChange={e => updateCurrent(p => ({ ...p, name: e.target.value }))} /></label><label>昵称 / 对 U 的称呼<input value={current.card?.nickname || ''} onChange={e => updateCurrent(p => ({ ...p, card: { ...(p.card || {}), nickname: e.target.value } }))} /></label><label>具体人设 / 角色描述<textarea value={profile.description || ''} onChange={e => updateCurrent(p => ({ ...p, profile: { ...(p.profile || {}), description: e.target.value } }))} /></label><div className="twoColumns"><label>标签<input value={(current.card?.tags || []).join(', ')} onChange={e => updateCurrent(p => ({ ...p, card: { ...(p.card || {}), tags: e.target.value.split(',').map(x => x.trim()).filter(Boolean) } }))} /></label><label>签名<input value={current.card?.signature || ''} onChange={e => updateCurrent(p => ({ ...p, card: { ...(p.card || {}), signature: e.target.value } }))} /></label></div><div className="twoColumns"><label>当前时间线<input value={current.era || ''} placeholder="由 U 最终确认" onChange={e => updateCurrent(p => ({ ...p, era: e.target.value }))} /></label><label>与 U 的关系<input value={current.userTitle || ''} onChange={e => updateCurrent(p => ({ ...p, userTitle: e.target.value }))} /></label></div><div className="worldbookBox"><div><div><h3>世界书</h3><p>当前 CHAR 专属；可增加、删除、修改、开关。时间线识别只看标题。</p></div><button onClick={add}>＋ 增加词目</button></div>{entries.length ? entries.map(e => <article className="worldbookItem" key={e.id}><input value={e.title} onChange={x => updateEntry(e.id, { title: x.target.value, isTimeline: looksLikeTimelineTitle(x.target.value) })} /><textarea value={e.content} onChange={x => updateEntry(e.id, { content: x.target.value })} /><span>{timelineFilter && looksLikeTimelineTitle(e.title) ? '时间线标题' : '普通词目'}</span><button onClick={() => updateEntry(e.id, { enabled: !e.enabled })}>{e.enabled ? '关闭' : '开启'}</button><button onClick={() => updateCurrent(p => ({ ...p, worldbook: (p.worldbook || []).filter(x => x.id !== e.id) }))}>删除</button></article>) : <EmptyState text="还没有世界书词目" />}</div><div className="toggleLine"><div><b>时间线检测</b><small>默认开启；只读取世界书词目标题，不读取正文判断。</small></div><input type="checkbox" checked={timelineFilter} onChange={e => setTimelineFilter(e.target.checked)} /></div><div className="frameworkNote">CHAR 可以提出时间线变化，但不能直接修改世界定义；最终决定权属于 U。</div></div> }

function GalleryInfo({ current, addGalleryAsset }: { current: PetRecord; addGalleryAsset: (key: string, file?: File) => void }) { const groups = [['头像库', 'avatar'], ['姿势', 'poses'], ['服装库', 'clothes'], ['表情', 'expressions'], ['状态', 'state']]; return <div className="galleryFramework">{groups.map(([title, key]) => <div className="galleryGroup" key={key}><div><h3>{title}</h3><small>{key === 'clothes' ? '全部由 U 上传，不设预置分类。' : '当前 CHAR 专属素材。'}</small></div><label className="galleryAdd">＋ 添加<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e => addGalleryAsset(key, e.target.files?.[0])} /></label>{(current.assets as any)?.[key] && typeof (current.assets as any)[key] === 'string' && <img src={(current.assets as any)[key]} alt={title} />}</div>)}</div> }
function SettingRow({ title, desc, value, onChange }: { title: string; desc: string; value: boolean; onChange: (v: boolean) => void }) { return <div className="settingRow"><div><h3>{title}</h3><p>{desc}</p></div><button className={value ? 'switch on' : 'switch'} onClick={() => onChange(!value)}>{value ? '开启' : '关闭'}</button></div> }
function EmptyState({ text }: { text: string }) { return <div className="emptyFramework">{text}</div> }
createRoot(document.getElementById('root')!).render(<App />);

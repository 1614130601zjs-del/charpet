import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import type { CharAssets, DiaryEntry, PetAction, PetMood, PetRecord, TimelineEntry } from './pet/petTypes';
import { applyPetEvent, nextIdleState, type PetState } from './pet/petRuntime';
import { createPetEvent, dispatchPetEvent, subscribePetEvents } from './bridge/semanticEvents';
import { listenForMcpMessages } from './bridge/mcpBridge';
import { appendPetEventLog } from './bridge/eventLog';
import { getPetMotion, motionScale } from './pet/petRenderer';
import { loadPetRecords, savePetRecords, touchPetRecord } from './storage/petStore';
import { DebugPanel } from './components/DebugPanel';

type View = 'home' | 'outing' | 'char' | 'timeline' | 'diary';
const assetSlots: Array<[keyof CharAssets, string]> = [
  ['idle', '默认'], ['talk', '说话'], ['tap', '触摸'], ['sleep', '睡觉'], ['wake', '醒来'],
  ['happy', '开心'], ['sad', '难过'], ['angry', '生气'], ['surprised', '惊讶'], ['shy', '害羞'],
  ['hungry', '求喂'], ['eat', '吃东西'], ['lonely', '想你'],
];

const addTimeline = (pet: PetRecord, type: TimelineEntry['type'], title: string, detail?: string, effects?: Record<string, number>): PetRecord => ({
  ...pet, timeline: [{ id: crypto.randomUUID(), createdAt: Date.now(), type, title, detail, effects }, ...(pet.timeline || [])].slice(0, 100),
});

function App() {
  const [pets, setPets] = useState<PetRecord[]>(loadPetRecords());
  const [selectedId, setSelectedId] = useState<string | null>(() => loadPetRecords()[0]?.id || null);
  const [view, setView] = useState<View>('home');
  const [petState, setPetState] = useState<PetState>({ emotion: 'idle', action: 'idle', intensity: 0.35, speech: '', updatedAt: Date.now(), lastInteractionAt: Date.now(), isSleeping: false });
  const [petOffset, setPetOffset] = useState({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const [editingName, setEditingName] = useState('');
  const [editingTitle, setEditingTitle] = useState('主人');
  const selected = pets.find(p => p.id === selectedId) || null;
  const motion = getPetMotion(petState);
  const currentImage = selected ? (selected.assets?.[petState.action] || selected.assets?.[petState.emotion] || selected.assets?.idle || selected.image) : '';

  useEffect(() => savePetRecords(pets), [pets]);
  useEffect(() => {
    const stopEvents = subscribePetEvents(event => { appendPetEventLog(event); setPetState(s => applyPetEvent(s, event)); });
    const stopMcp = listenForMcpMessages();
    return () => { stopEvents(); stopMcp(); };
  }, []);
  useEffect(() => { if (selected) { setEditingName(selected.name); setEditingTitle(selected.userTitle || '主人'); } }, [selectedId]);

  const updateSelected = (fn: (pet: PetRecord) => PetRecord) => setPets(all => all.map(p => p.id === selectedId ? fn(p) : p));
  const timeline = selected?.timeline || [];
  const diary = selected?.diary || [];
  const relationship = selected?.relationship || [];
  const needs = selected?.needs || { hunger: 70, energy: 80, mood: 70 };

  function emit(action: PetAction, emotion: PetMood = 'idle', intensity = 0.8, text?: string, need?: string) {
    dispatchPetEvent(createPetEvent(action, emotion, intensity, text));
    if (selected) updateSelected(p => addTimeline(p, action === 'outing' ? 'outing' : 'interaction', text || action, undefined));
  }
  function interact(kind: 'tap' | 'touch' | 'feed') {
    if (!selected) return;
    if (kind === 'feed') {
      updateSelected(p => addTimeline({ ...touchPetRecord(p, 2), needs: { ...(p.needs || needs), hunger: Math.min(100, (p.needs?.hunger ?? 70) + 25), mood: Math.min(100, (p.needs?.mood ?? 70) + 4) } }, 'interaction', '喂了一次食物', '饱腹度上升', { hunger: 25, affection: 2 }));
      emit('tap', 'happy', 0.9, '好吃！'); return;
    }
    updateSelected(p => touchPetRecord(addTimeline(p, 'interaction', kind === 'touch' ? '摸摸 Char' : '点击 Char', undefined, { affection: kind === 'touch' ? 2 : 1 }), kind === 'touch' ? 2 : 1));
    emit('tap', kind === 'touch' ? 'shy' : 'happy', 0.9, kind === 'touch' ? '……被你摸到了' : '嗯？');
  }
  function chooseOuting(place: string) {
    if (!selected) return;
    updateSelected(p => addTimeline(p, 'outing', `去了${place}`, '等待 AI / 世界书生成这次经历。', { mood: 5, affection: 2 }));
    emit('outing', 'happy', 0.8, `一起去${place}吧`);
    setView('timeline');
  }
  function saveIdentity() {
    if (!selected) return;
    updateSelected(p => ({ ...p, name: editingName.trim() || p.name, userTitle: editingTitle.trim() || '主人', timeline: [{ id: crypto.randomUUID(), createdAt: Date.now(), type: 'system', title: '更新了 Char 身份', detail: `称呼：${editingTitle || '主人'}` }, ...(p.timeline || [])] }));
  }
  function uploadRole(file?: File) {
    if (!file) return;
    const reader = new FileReader(); reader.onload = () => {
      const image = String(reader.result); const p: PetRecord = { id: crypto.randomUUID(), name: file.name.replace(/\.[^.]+$/, '') || '新的 Char', image, source: 'upload', createdAt: Date.now(), assets: { idle: image }, userTitle: '主人', needs: { hunger: 70, energy: 80, mood: 70 }, relationship: [{ key: 'affection', label: '好感度', value: 0, min: 0, max: 100 }], timeline: [], diary: [], memories: [], stats: { interactions: 0, affection: 0, lastSeenAt: Date.now() } };
      setPets(x => [p, ...x]); setSelectedId(p.id); setView('home');
    }; reader.readAsDataURL(file);
  }
  function uploadAsset(key: keyof CharAssets, file?: File) {
    if (!selected || !file) return;
    const reader = new FileReader(); reader.onload = () => updateSelected(p => ({ ...p, assets: { ...(p.assets || {}), [key]: String(reader.result) } })); reader.readAsDataURL(file);
  }
  function addDiary() {
    if (!selected) return;
    const entry: DiaryEntry = { id: crypto.randomUUID(), createdAt: Date.now(), title: '今天', text: '这里是 Char 的日记。之后由 AI 根据人设、世界书和当天经历自动生成。', mood: petState.emotion, source: 'ai' };
    updateSelected(p => addTimeline({ ...p, diary: [entry, ...(p.diary || [])] }, 'diary', '写下了一篇日记'));
  }
  function changeRelationship(key: string, delta: number) { updateSelected(p => ({ ...p, relationship: (p.relationship || []).map(r => r.key === key ? { ...r, value: Math.max(r.min, Math.min(r.max, r.value + delta)) } : r) })); }
  function startDrag(e: React.PointerEvent<HTMLImageElement>) { e.currentTarget.setPointerCapture(e.pointerId); dragStart.current = { x: e.clientX, y: e.clientY, ox: petOffset.x, oy: petOffset.y }; emit('drag', 'surprised', 0.65, '抓到我啦'); }
  function moveDrag(e: React.PointerEvent<HTMLImageElement>) { setPetOffset({ x: dragStart.current.ox + e.clientX - dragStart.current.x, y: dragStart.current.oy + e.clientY - dragStart.current.y }); }
  function exportSelected() { if (!selected) return; const blob = new Blob([JSON.stringify(selected, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${selected.name}.charpet.json`; a.click(); }

  const nav = useMemo(() => [['home', '🏠 小窝'], ['outing', '🚶 出去玩'], ['char', '🎨 Char'], ['timeline', '🕐 时间轴'], ['diary', '📖 日记']] as Array<[View, string]>, []);
  return <main className="app charpetHome">
    <header><div><span className="eyebrow">CHARPET · HOME</span><h1>{selected?.name || 'CharPet'}</h1><p>{selected ? '让 Char 在这里生活、成长，也可以随时把它带到桌面。' : '上传一个角色，开始让它在小窝里生活。'}</p></div><div className="headerActions"><label className="uploadTop">＋ 上传角色<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e => uploadRole(e.target.files?.[0])} /></label></div></header>
    <nav className="charpetNav">{nav.map(([key, label]) => <button key={key} className={view === key ? 'active' : ''} onClick={() => setView(key)}>{label}</button>)}</nav>
    {!selected ? <section className="panel charpetEmpty"><h2>还没有 Char</h2><p>先上传角色图片。之后可以在“Char”里管理名字、称呼和各种情绪 / 动作素材。</p><label className="uploadTop">＋ 上传第一个角色<input hidden type="file" accept="image/*" onChange={e => uploadRole(e.target.files?.[0])} /></label></section> : <>
      {view === 'home' && <section className="homeGrid"><div className="petStage"><div className={`petBubble ${petState.emotion}`}>{petState.speech}</div><img src={currentImage} className={`pet ${motion.className}`} style={{ transform: `translate(${petOffset.x}px,${petOffset.y}px)`, scale: motionScale(petState) }} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={() => emit('idle')} draggable={false} alt={selected.name} /><div className="touchActions"><button onClick={() => interact('tap')}>点击</button><button onClick={() => interact('touch')}>摸摸</button><button onClick={() => interact('feed')}>喂食</button><button onClick={() => emit('talk', 'happy', 0.8, '来陪我一会儿吧')}>陪我聊聊</button></div></div><div className="panel statusPanel"><span className="eyebrow">CURRENT STATE</span><h2>{selected.name}</h2><p>正在：{petState.isSleeping ? '睡觉' : petState.action} · 心情：{petState.emotion}</p><div className="stateBars"><span>😊 心情 <b>{needs.mood}</b>/100</span><progress value={needs.mood} max="100" /><span>🍪 饱腹 <b>{needs.hunger}</b>/100</span><progress value={needs.hunger} max="100" /><span>⚡ 精力 <b>{needs.energy}</b>/100</span><progress value={needs.energy} max="100" /></div><div className="relationshipList">{relationship.map(r => <div key={r.key}><span>{r.label}</span><b>{r.value}/{r.max}</b><button onClick={() => changeRelationship(r.key, 1)}>＋</button></div>)}</div><button onClick={() => setView('timeline')}>查看今天的生活 →</button></div></section>}
      {view === 'outing' && <section className="panel featurePage"><span className="eyebrow">OUTING · STORY</span><h2>带 {selected.name} 出去玩</h2><p>地点只是故事入口。真正发生什么，由 AI 结合人设、世界书、记忆和当前状态决定。</p><div className="choiceGrid">{['公园', '咖啡店', '海边', '书店', '夜晚街道', '随便走走'].map(x => <button key={x} onClick={() => chooseOuting(x)}>{x}</button>)}</div><div className="storyHint">MCP 预留：charpet.event.request → AI / 世界书生成剧情 → 回写 story、choices、effects。</div></section>}
      {view === 'char' && <section className="panel featurePage"><span className="eyebrow">CHAR · IDENTITY & ASSETS</span><h2>角色设定</h2><div className="identityForm"><label>名字<input value={editingName} onChange={e => setEditingName(e.target.value)} /></label><label>对 User 的称呼<input value={editingTitle} onChange={e => setEditingTitle(e.target.value)} /></label><button onClick={saveIdentity}>保存身份</button></div><div className="profileBox"><b>AI 人设同步</b><p>{selected.profile?.tone || '尚未同步。连接 MCP 后，由 AI 读取自身人设、语气和世界书并写入这里。'}</p><small>{selected.profile?.personality?.join(' · ')}</small></div><h3>形象素材</h3><div className="assetGrid">{assetSlots.map(([key, label]) => <label key={key} className="assetSlot"><span>{label}</span>{selected.assets?.[key] ? <img src={selected.assets[key]} alt={label} /> : <div>＋</div>}<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e => uploadAsset(key, e.target.files?.[0])} /></label>)}</div><div className="charActions"><label className="uploadTop">＋ 添加新的动作 / 情绪素材<input hidden type="file" accept="image/*" onChange={e => uploadAsset('custom', e.target.files?.[0])} /></label><button onClick={exportSelected}>导出 Char</button></div><h3>当前 Char</h3><div className="charVersions">{pets.map(p => <button className={p.id === selected.id ? 'active' : ''} key={p.id} onClick={() => { setSelectedId(p.id); setPetOffset({ x: 0, y: 0 }); }}>{p.name}{p.era ? ` · ${p.era}` : ''}</button>)}</div></section>}
      {view === 'timeline' && <section className="panel featurePage"><span className="eyebrow">LIFE TIMELINE</span><h2>行动时间轴</h2><p>记录剧情、互动、状态变化，以及 AI 写下日志等生活痕迹。</p><div className="timeline">{timeline.length ? timeline.map(x => <article key={x.id}><time>{new Date(x.createdAt).toLocaleString()}</time><strong>{x.title}</strong><p>{x.detail}</p>{x.effects && <small>{Object.entries(x.effects).map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v}`).join(' · ')}</small>}</article>) : <div className="empty">还没有生活记录。</div>}</div></section>}
      {view === 'diary' && <section className="panel featurePage"><span className="eyebrow">DIARY</span><h2>Char 的日记</h2><p>独立于时间轴。这里记录 Char 自己觉得值得留下的东西。</p><button onClick={addDiary}>＋ 生成一篇测试日记</button><div className="diaryList">{diary.length ? diary.map(x => <article key={x.id}><time>{new Date(x.createdAt).toLocaleDateString()}</time><h3>{x.title || '无题'}</h3><p>{x.text}</p></article>) : <div className="empty">还没有日记。之后由 AI 根据世界书和当天经历自动生成。</div>}</div></section>}
    </>}
    <DebugPanel />
  </main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);

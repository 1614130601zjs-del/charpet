import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import type { PetAction, PetMood } from './pet/petTypes';
import { applyPetEvent, nextIdleState, type PetState } from './pet/petRuntime';
import { createPetEvent, dispatchPetEvent, subscribePetEvents } from './bridge/semanticEvents';
import { getPetMotion, motionScale } from './pet/petRenderer';
import { NativeCreator, type CreatorState } from './creator/NativeCreator';

type Pet = { id: string; name: string; image: string; source: 'upload' | 'creator'; createdAt: number; creatorState?: CreatorState };
const KEY = 'charpet.pets.v1';
function loadPets(): Pet[] { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }

const moodLines: Record<PetMood, string[]> = {
  idle: ['嗯……', '陪着你呢', '今天也要加油呀'],
  happy: ['嘿嘿！', '好开心～', '被你发现啦'],
  surprised: ['欸？！', '哇！', '你吓到我啦'],
  sad: ['唔……', '有一点点低落', '抱一下嘛'],
  angry: ['哼！', '不许欺负我', '我要生气啦'],
  shy: ['……别一直看啦', '有点害羞', '///'],
  sleep: ['呼……', 'Zzz……', '晚安……'],
};

function App() {
  const [pets, setPets] = useState<Pet[]>(loadPets);
  const [selected, setSelected] = useState<Pet | null>(null);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [creatorName, setCreatorName] = useState('我的 Char');
  const [creatorState, setCreatorState] = useState<CreatorState | undefined>();
  const [petState, setPetState] = useState<PetState>({ emotion: 'idle', action: 'idle', intensity: 0.35, speech: '', updatedAt: Date.now(), lastInteractionAt: Date.now(), isSleeping: false });
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const [petOffset, setPetOffset] = useState({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const idleTimer = useRef<number | null>(null);
  const sleepTimer = useRef<number | null>(null);

  useEffect(() => localStorage.setItem(KEY, JSON.stringify(pets)), [pets]);
  const selectedPet = selected ? pets.find(p => p.id === selected.id) || selected : null;
  const motion = getPetMotion(petState);

  function emit(action: PetAction, emotion: PetMood = 'idle', intensity = 1, text = '') {
    dispatchPetEvent(createPetEvent(action, emotion, intensity, text || undefined));
  }
  function randomLine(mood: PetMood) {
    const lines = moodLines[mood];
    return lines[Math.floor(Math.random() * lines.length)];
  }
  function clearTimers() {
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    if (sleepTimer.current) window.clearTimeout(sleepTimer.current);
    idleTimer.current = null;
    sleepTimer.current = null;
  }
  function armTimers() {
    clearTimers();
    idleTimer.current = window.setTimeout(() => setPetState(s => s.isSleeping ? s : nextIdleState(s)), 1200);
    sleepTimer.current = window.setTimeout(() => emit('sleep', 'sleep', 0.3, randomLine('sleep')), 18000);
  }

  useEffect(() => subscribePetEvents(event => {
    setPetState(s => applyPetEvent(s, event));
    if (event.action === 'sleep') clearTimers();
    else armTimers();
  }), []);

  useEffect(() => {
    armTimers();
    return clearTimers;
  }, [selectedPet?.id]);

  function upload(file?: File) {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      const p: Pet = { id: crypto.randomUUID(), name: file.name.replace(/\.[^.]+$/, ''), image: String(r.result), source: 'upload', createdAt: Date.now() };
      setPets(x => [p, ...x]); setSelected(p); setPetOffset({ x: 0, y: 0 }); emit('wake', 'happy', 0.7, '你好！');
    };
    r.readAsDataURL(file);
  }
  function openCreator(pet?: Pet) { setCreatorName(pet?.name || '我的 Char'); setCreatorState(pet?.creatorState); setCreatorOpen(true); }
  function saveCreator(name: string, state: CreatorState, image: string) {
    const old = selectedPet;
    const p: Pet = { id: old?.id || crypto.randomUUID(), name, image, source: 'creator', createdAt: old?.createdAt || Date.now(), creatorState: state };
    setPets(x => old ? x.map(i => i.id === old.id ? p : i) : [p, ...x]); setSelected(p); setPetOffset({ x: 0, y: 0 }); setCreatorOpen(false); emit('wake', 'happy', 0.8, '捏好啦！');
  }
  function interact() {
    if (petState.isSleeping || petState.action === 'sleep') { emit('wake', 'happy', 0.8, '醒啦！'); return; }
    const emotion: PetMood = petState.emotion === 'happy' ? 'surprised' : Math.random() > 0.78 ? 'shy' : 'happy';
    emit('tap', emotion, 0.9, randomLine(emotion));
  }
  function talk() { if (petState.isSleeping) { emit('wake', 'happy', 0.8, '唔……醒啦'); return; } const emotion: PetMood = Math.random() > 0.7 ? 'shy' : 'happy'; emit('talk', emotion, 0.8, randomLine(emotion)); }
  function mood(emotion: PetMood) { if (petState.isSleeping) { emit('wake', 'happy', 0.8, '被你叫醒啦'); return; } emit('tap', emotion, 0.75, randomLine(emotion)); }
  function startDrag(e: React.PointerEvent<HTMLImageElement>) { e.currentTarget.setPointerCapture(e.pointerId); dragStart.current = { x: e.clientX, y: e.clientY, ox: petOffset.x, oy: petOffset.y }; setDrag({ x: e.clientX, y: e.clientY, active: true }); emit('drag', 'surprised', 0.65, '抓到我啦'); }
  function moveDrag(e: React.PointerEvent<HTMLImageElement>) { if (!drag.active) return; setPetOffset({ x: dragStart.current.ox + e.clientX - dragStart.current.x, y: dragStart.current.oy + e.clientY - dragStart.current.y }); }
  function endDrag() { if (drag.active) emit('idle', 'idle', 0.35); setDrag(d => ({ ...d, active: false })); }

  return <main className="app">
    <header><div><span className="eyebrow">CHARPET STUDIO · V0.7</span><h1>养一只属于你的 Char</h1><p>独立运行、可以捏，也可以直接把自己的角色带进来。</p></div><div className="headerActions"><button className="creatorTop" onClick={() => openCreator()}>✦ 捏一个 Char</button><label className="uploadTop">＋ 上传角色<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e => upload(e.target.files?.[0])} /></label></div></header>
    <section className="hero"><div className="petStage"><div className={`petBubble ${petState.emotion}`}>{petState.speech}</div>{selectedPet ? <img src={selectedPet.image} className={`pet ${motion.className}`} style={{ transform: `translate(${petOffset.x}px,${petOffset.y}px)`, scale: motionScale(petState) }} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onClick={interact} draggable={false} alt={selectedPet.name} /> : <div className="placeholder"><div>🐾</div><span>选择一个角色开始</span></div>}</div>
      <div className="panel"><span className="eyebrow">MY PET</span><h2>{selectedPet?.name || '还没有角色'}</h2><p>{selectedPet ? `状态：${petState.isSleeping ? 'sleeping' : petState.emotion} · ${petState.action}。它会自己待机，安静一会儿还会睡觉。` : '你可以直接上传 PNG / JPG / WebP，或者用本地捏人器。'}</p>
        {selectedPet && <div className="panelActions"><button onClick={interact}>逗一下</button><button onClick={talk}>说句话</button><button onClick={() => mood('shy')}>摸摸它</button><button onClick={() => emit('sleep', 'sleep', 0.3, randomLine('sleep'))}>让它睡</button><button onClick={() => emit('wake', 'happy', 0.8, '早上好！')}>叫醒</button>{selectedPet.source === 'creator' && <button onClick={() => openCreator(selectedPet)}>重新捏</button>}<button onClick={() => { clearTimers(); setSelected(null); setPetOffset({ x: 0, y: 0 }); setPetState(s => nextIdleState(s)); }}>返回角色库</button></div>}
        {selectedPet && <div className="moodRow"><button onClick={() => mood('happy')}>开心</button><button onClick={() => mood('sad')}>低落</button><button onClick={() => mood('angry')}>生气</button></div>}
      </div></section>
    <section><div className="sectionHead"><h2>角色库</h2><span>{pets.length} 个角色</span></div><div className="grid">{pets.map(p => <button className={`card ${selectedPet?.id === p.id ? 'active' : ''}`} key={p.id} onClick={() => { setSelected(p); setPetOffset({ x: 0, y: 0 }); emit('wake', 'happy', 0.5, '又见面啦'); }}><div className="thumb"><img src={p.image} alt="" /></div><strong>{p.name}</strong><small>{p.source === 'upload' ? '图片导入' : '本地捏人'}</small></button>)}<button className="addCard" onClick={() => openCreator()}><span>✦</span><strong>捏一只新的</strong><small>完全本地运行</small></button>{pets.length === 0 && <label className="empty">＋<span>也可以上传第一个角色</span><input hidden type="file" accept="image/*" onChange={e => upload(e.target.files?.[0])} /></label>}</div></section>
    {creatorOpen && <div className="creatorOverlay"><div className="creatorShell"><NativeCreator initialState={creatorState} initialName={creatorName} onCancel={() => setCreatorOpen(false)} onSave={saveCreator} /></div></div>}
  </main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);

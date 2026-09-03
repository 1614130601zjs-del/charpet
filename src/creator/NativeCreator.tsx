import React, { useMemo, useState } from 'react';

export type CreatorState = { skin: number; hair: number; eyes: number; outfit: number; accessory: number };
const defaults: CreatorState = { skin: 0, hair: 0, eyes: 0, outfit: 0, accessory: 0 };
const skin = ['#f6d2b8', '#e9b995', '#c9825b', '#8f583e'];
const hair = ['#3b2f2a', '#6b3f2a', '#9b6b3f', '#d8a45d', '#b94d68'];
const eyes = ['● ●', '◕ ◕', '• •', '◠ ◠'];
const outfit = ['#f4eee7', '#b8d8d8', '#d8b4d8', '#f0c77a', '#9fb6e3'];
const accessory = ['无', '♡', '✦', '☁', '♢'];

function avatarSvg(state: CreatorState) {
  const a = accessory[state.accessory] === '无' ? '' : accessory[state.accessory];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 300"><ellipse cx="120" cy="272" rx="76" ry="14" fill="rgba(30,24,20,.12)"/><path d="M58 258 Q60 194 120 190 Q180 194 182 258Z" fill="${outfit[state.outfit]}"/><circle cx="120" cy="124" r="68" fill="${skin[state.skin]}"/><path d="M52 124Q44 46 120 42Q196 46 188 124Q170 82 120 78Q70 82 52 124Z" fill="${hair[state.hair]}"/><path d="M60 88Q82 45 120 50Q158 45 180 88L170 112Q146 92 120 94Q94 92 70 112Z" fill="${hair[state.hair]}"/><text x="120" y="139" text-anchor="middle" font-size="24" letter-spacing="18" fill="#332c29">${eyes[state.eyes]}</text><path d="M108 157Q120 166 132 157" fill="none" stroke="#8f5549" stroke-width="4" stroke-linecap="round"/><text x="120" y="74" text-anchor="middle" font-size="30" fill="#d76d87">${a}</text><circle cx="76" cy="145" r="7" fill="#eaa0a0" opacity=".45"/><circle cx="164" cy="145" r="7" fill="#eaa0a0" opacity=".45"/></svg>`;
}

function Avatar({ state }: { state: CreatorState }) { return <div className="nativeAvatarWrap" dangerouslySetInnerHTML={{ __html: avatarSvg(state) }} />; }

export function NativeCreator({ initialState, initialName, onCancel, onSave }: { initialState?: Partial<CreatorState>; initialName?: string; onCancel: () => void; onSave: (name: string, state: CreatorState, image: string) => void }) {
  const [state, setState] = useState<CreatorState>({ ...defaults, ...initialState });
  const [name, setName] = useState(initialName || '我的 Char');
  const image = useMemo(() => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(avatarSvg(state)), [state]);
  const set = (key: keyof CreatorState, count: number) => setState(s => ({ ...s, [key]: (s[key] + 1) % count }));
  return <div className="nativeCreator">
    <div className="nativeCreatorHead"><div><span className="eyebrow">CHARPET CREATOR · LOCAL</span><h2>捏一只你的 Char</h2></div><button onClick={onCancel}>关闭</button></div>
    <div className="creatorPreview"><Avatar state={state} /></div>
    <div className="creatorName"><label>名字</label><input value={name} onChange={e => setName(e.target.value)} maxLength={24} /></div>
    <div className="creatorControls">
      <button onClick={() => set('skin', skin.length)}>肤色 <b>换一个</b></button><button onClick={() => set('hair', hair.length)}>发型 <b>换一个</b></button><button onClick={() => set('eyes', eyes.length)}>眼睛 <b>换一个</b></button><button onClick={() => set('outfit', outfit.length)}>衣服 <b>换一个</b></button><button onClick={() => set('accessory', accessory.length)}>配饰 <b>换一个</b></button>
    </div>
    <div className="creatorFooter"><button className="creatorReset" onClick={() => setState(defaults)}>重置</button><button className="creatorSave" onClick={() => onSave(name.trim() || '我的 Char', state, image)}>出件 ✦</button></div>
  </div>;
}

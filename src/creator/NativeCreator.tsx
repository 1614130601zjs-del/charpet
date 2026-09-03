import React, { useMemo, useState } from 'react';

export type CreatorState = {
  skin: number;
  hair: number;
  eyes: number;
  outfit: number;
  accessory: number;
};

const defaults: CreatorState = { skin: 0, hair: 0, eyes: 0, outfit: 0, accessory: 0 };
const skin = ['#f6d2b8', '#e9b995', '#c9825b', '#8f583e'];
const hair = ['#3b2f2a', '#6b3f2a', '#9b6b3f', '#d8a45d', '#b94d68'];
const eyes = ['● ●', '◕ ◕', '• •', '◠ ◠'];
const outfit = ['#f4eee7', '#b8d8d8', '#d8b4d8', '#f0c77a', '#9fb6e3'];
const accessory = ['无', '♡', '✦', '☁', '♢'];

function Avatar({ state }: { state: CreatorState }) {
  const s = skin[state.skin];
  const h = hair[state.hair];
  const o = outfit[state.outfit];
  return <svg viewBox="0 0 240 300" className="nativeAvatar" role="img" aria-label="角色预览">
    <ellipse cx="120" cy="272" rx="76" ry="14" fill="rgba(30,24,20,.12)" />
    <path d="M58 258 Q60 194 120 190 Q180 194 182 258 Z" fill={o} />
    <circle cx="120" cy="124" r="68" fill={s} />
    <path d="M52 124 Q44 46 120 42 Q196 46 188 124 Q170 82 120 78 Q70 82 52 124Z" fill={h} />
    <path d="M60 88 Q82 45 120 50 Q158 45 180 88 L170 112 Q146 92 120 94 Q94 92 70 112Z" fill={h} />
    <text x="120" y="139" textAnchor="middle" fontSize="24" letterSpacing="18" fill="#332c29">{eyes[state.eyes]}</text>
    <path d="M108 157 Q120 166 132 157" fill="none" stroke="#8f5549" strokeWidth="4" strokeLinecap="round" />
    <text x="120" y="74" textAnchor="middle" fontSize="30" fill="#d76d87">{accessory[state.accessory] === '无' ? '' : accessory[state.accessory]}</text>
    <circle cx="76" cy="145" r="7" fill="#eaa0a0" opacity=".45" /><circle cx="164" cy="145" r="7" fill="#eaa0a0" opacity=".45" />
  </svg>;
}

export function NativeCreator({ initialState, initialName, onCancel, onSave }: {
  initialState?: Partial<CreatorState>;
  initialName?: string;
  onCancel: () => void;
  onSave: (name: string, state: CreatorState, image: string) => void;
}) {
  const [state, setState] = useState<CreatorState>({ ...defaults, ...initialState });
  const [name, setName] = useState(initialName || '我的 Char');
  const set = (key: keyof CreatorState, count: number) => setState(s => ({ ...s, [key]: (s[key] + 1) % count }));
  const image = useMemo(() => {
    const svg = document.querySelector('.nativeAvatar') as SVGElement | null;
    if (!svg) return '';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
  }, [state]);
  return <div className="nativeCreator">
    <div className="nativeCreatorHead"><div><span className="eyebrow">CHARPET CREATOR · LOCAL</span><h2>捏一只你的 Char</h2></div><button onClick={onCancel}>关闭</button></div>
    <div className="creatorPreview"><Avatar state={state} /></div>
    <div className="creatorName"><label>名字</label><input value={name} onChange={e => setName(e.target.value)} maxLength={24} /></div>
    <div className="creatorControls">
      <button onClick={() => set('skin', skin.length)}>肤色 <b>随机</b></button>
      <button onClick={() => set('hair', hair.length)}>发型 <b>随机</b></button>
      <button onClick={() => set('eyes', eyes.length)}>眼睛 <b>随机</b></button>
      <button onClick={() => set('outfit', outfit.length)}>衣服 <b>随机</b></button>
      <button onClick={() => set('accessory', accessory.length)}>配饰 <b>随机</b></button>
    </div>
    <div className="creatorFooter"><button className="creatorReset" onClick={() => setState(defaults)}>重置</button><button className="creatorSave" onClick={() => onSave(name.trim() || '我的 Char', state, image)}>出件 ✦</button></div>
  </div>;
}

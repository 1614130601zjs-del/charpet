import React, { useMemo, useRef, useState } from 'react';

export type CreatorState = {
  skin: number; eyes: number; mouth: number; fronthair: number; earhair: number;
  back1: number; back2: number; outfit: number; outer: number; facemark: number; accessory: number;
  customImage?: string;
};

const defaults: CreatorState = { skin: 0, eyes: 0, mouth: 0, fronthair: 0, earhair: 0, back1: 0, back2: 0, outfit: 0, outer: 0, facemark: 0, accessory: 0 };
const categories: Array<{ key: keyof CreatorState; label: string; count: number }> = [
  { key: 'skin', label: '肤色', count: 4 }, { key: 'eyes', label: '眼睛', count: 5 }, { key: 'mouth', label: '嘴', count: 4 },
  { key: 'fronthair', label: '前发', count: 5 }, { key: 'earhair', label: '耳发', count: 3 }, { key: 'back1', label: '后发 1', count: 4 },
  { key: 'back2', label: '后发 2', count: 3 }, { key: 'outfit', label: '衣服', count: 5 }, { key: 'outer', label: '外套', count: 4 },
  { key: 'facemark', label: '面纹', count: 4 }, { key: 'accessory', label: '配饰', count: 5 },
];
const skin = ['#f6d2b8', '#e9b995', '#c9825b', '#8f583e'];
const hair = ['#3b2f2a', '#6b3f2a', '#9b6b3f', '#d8a45d', '#b94d68'];
const outfit = ['#f4eee7', '#b8d8d8', '#d8b4d8', '#f0c77a', '#9fb6e3'];
const eyes = ['●  ●', '◕  ◕', '•  •', '◠  ◠', '✦  ✦'];
const mouths = ['smile', 'open', 'tiny', 'cat'];
const marks = ['', '♡', '✦', '〰'];
const accessories = ['无', '♡', '✦', '☁', '♢'];

function avatarSvg(state: CreatorState) {
  const s = skin[state.skin], h = hair[state.fronthair], o = outfit[state.outfit];
  const acc = accessories[state.accessory] === '无' ? '' : accessories[state.accessory];
  const mouth = mouths[state.mouth];
  const mouthPath = mouth === 'open' ? '<ellipse cx="120" cy="160" rx="9" ry="7" fill="#713f43"/>' : mouth === 'cat' ? '<path d="M108 158l12 7 12-7" fill="none" stroke="#8f5549" stroke-width="3" stroke-linecap="round"/>' : mouth === 'tiny' ? '<circle cx="120" cy="160" r="3" fill="#8f5549"/>' : '<path d="M108 157Q120 166 132 157" fill="none" stroke="#8f5549" stroke-width="4" stroke-linecap="round"/>';
  const ear = state.earhair === 0 ? '' : `<path d="M57 103Q34 80 49 58Q72 68 79 99Z M183 103Q206 80 191 58Q168 68 161 99Z" fill="${h}"/>`;
  const back = state.back1 ? `<path d="M48 126Q38 38 120 35Q202 38 192 126Q174 75 120 73Q66 75 48 126Z" fill="${hair[state.back1]}" opacity=".9"/>` : '';
  const back2 = state.back2 ? `<path d="M58 94Q30 116 43 172Q52 188 67 164L76 105Z M182 94Q210 116 197 172Q188 188 173 164L164 105Z" fill="${hair[state.back2]}" opacity=".8"/>` : '';
  const outer = state.outer ? `<path d="M49 257Q51 194 79 188L93 257Z M191 257Q189 194 161 188L147 257Z" fill="${['#d9d1c8','#8897b7','#b87979','#6f8174'][state.outer]}"/>` : '';
  const face = marks[state.facemark] ? `<text x="120" y="184" text-anchor="middle" font-size="22" fill="#d77b92">${marks[state.facemark]}</text>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 300"><ellipse cx="120" cy="272" rx="76" ry="14" fill="rgba(30,24,20,.12)"/>${back2}${back}${ear}<path d="M58 258Q60 194 120 190Q180 194 182 258Z" fill="${o}"/>${outer}<circle cx="120" cy="124" r="68" fill="${s}"/><path d="M52 124Q44 46 120 42Q196 46 188 124Q170 82 120 78Q70 82 52 124Z" fill="${h}"/><path d="M60 88Q82 ${45 + state.fronthair * 3} 120 ${50 + state.fronthair * 2}Q158 ${45 + state.fronthair * 3} 180 88L170 112Q146 92 120 94Q94 92 70 112Z" fill="${h}"/><text x="120" y="139" text-anchor="middle" font-size="23" letter-spacing="8" fill="#332c29">${eyes[state.eyes]}</text>${mouthPath}${face}<text x="120" y="73" text-anchor="middle" font-size="30" fill="#d76d87">${acc}</text><circle cx="76" cy="145" r="7" fill="#eaa0a0" opacity=".45"/><circle cx="164" cy="145" r="7" fill="#eaa0a0" opacity=".45"/></svg>`;
}

function Avatar({ state }: { state: CreatorState }) {
  if (state.customImage) return <img className="nativeCustomPreview" src={state.customImage} alt="自定义角色" />;
  return <div className="nativeAvatarWrap" dangerouslySetInnerHTML={{ __html: avatarSvg(state) }} />;
}

export function NativeCreator({ initialState, initialName, onCancel, onSave }: { initialState?: Partial<CreatorState>; initialName?: string; onCancel: () => void; onSave: (name: string, state: CreatorState, image: string) => void }) {
  const [state, setState] = useState<CreatorState>({ ...defaults, ...initialState });
  const [name, setName] = useState(initialName || '我的 Char');
  const [active, setActive] = useState<keyof CreatorState>('skin');
  const inputRef = useRef<HTMLInputElement>(null);
  const image = useMemo(() => state.customImage || ('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(avatarSvg(state))), [state]);
  const current = categories.find(c => c.key === active) || categories[0];
  const setPart = (key: keyof CreatorState, count: number) => setState(s => ({ ...s, customImage: undefined, [key]: ((Number(s[key]) || 0) + 1) % count }));
  const randomize = () => setState(s => ({ ...s, customImage: undefined, ...Object.fromEntries(categories.map(c => [c.key, Math.floor(Math.random() * c.count)])) }));
  const customUpload = (file?: File) => { if (!file) return; const r = new FileReader(); r.onload = () => setState(s => ({ ...s, customImage: String(r.result) })); r.readAsDataURL(file); };
  return <div className="nativeCreator">
    <div className="nativeCreatorHead"><div><span className="eyebrow">CHARPET CREATOR · LOCAL</span><h2>捏一只你的 Char</h2></div><button onClick={onCancel}>关闭</button></div>
    <div className="creatorPreview"><Avatar state={state}/><div className="creatorPreviewBadge">{state.customImage ? '图片角色' : '可编辑角色'}</div></div>
    <div className="creatorName"><label>名字</label><input value={name} onChange={e => setName(e.target.value)} maxLength={24}/></div>
    <div className="creatorQuick"><button onClick={randomize}>🎲 随机搭配好啦</button><button onClick={() => setState(defaults)}>↺ 重置</button><button onClick={() => inputRef.current?.click()}>＋ 自定义图片</button><input ref={inputRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e => customUpload(e.target.files?.[0])}/></div>
    <div className="creatorTabs">{categories.map(c => <button key={c.key} className={active===c.key?'active':''} onClick={() => setActive(c.key)}>{c.label}</button>)}</div>
    <div className="creatorPicker"><div className="pickerTitle"><span>{current.label}</span><small>点击切换 · {Number(state[active]) + 1}/{current.count}</small></div><button className="pickerMain" onClick={() => setPart(current.key, current.count)}>换一个 <b>→</b></button></div>
    <div className="creatorFooter"><button className="creatorReset" onClick={onCancel}>取消</button><button className="creatorSave" onClick={() => onSave(name.trim() || '我的 Char', state, image)}>出件 ✦</button></div>
  </div>;
}

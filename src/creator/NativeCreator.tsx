import React, { useRef, useState } from 'react';

export type CreatorState = {
  skin: number; eyes: number; mouth: number; fronthair: number; earhair: number;
  back1: number; back2: number; outfit: number; outer: number; facemark: number; accessory: number;
  customImage?: string;
};

export function NativeCreator({ initialName, onCancel, onSave }: { initialState?: Partial<CreatorState>; initialName?: string; onCancel: () => void; onSave: (name: string, state: CreatorState, image: string) => void }) {
  const [name, setName] = useState(initialName || '我的 Char');
  const inputRef = useRef<HTMLInputElement>(null);
  const customUpload = (file?: File) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => onSave(name.trim() || file.name.replace(/\.[^.]+$/, '') || '我的 Char', { skin: 0, eyes: 0, mouth: 0, fronthair: 0, earhair: 0, back1: 0, back2: 0, outfit: 0, outer: 0, facemark: 0, accessory: 0, customImage: String(r.result) }, String(r.result));
    r.readAsDataURL(file);
  };
  return <div className="nativeCreator">
    <div className="nativeCreatorHead"><div><span className="eyebrow">CHARPET · IMPORT</span><h2>上传你的角色</h2></div><button onClick={onCancel}>关闭</button></div>
    <div className="uploadCreatorHero"><div className="uploadCreatorIcon">＋</div><h3>直接上传角色图片</h3><p>PNG / JPG / WebP 均可。上传后就会成为你的 Char。</p><button className="uploadCreatorButton" onClick={() => inputRef.current?.click()}>选择图片</button><input ref={inputRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e => customUpload(e.target.files?.[0])}/></div>
    <div className="creatorName"><label>名字</label><input value={name} onChange={e => setName(e.target.value)} maxLength={24}/></div>
    <div className="creatorFooter"><button className="creatorReset" onClick={onCancel}>取消</button></div>
  </div>;
}

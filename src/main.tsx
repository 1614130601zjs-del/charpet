import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

type Pet = { id:string; name:string; image:string; source:'upload'|'creator'; createdAt:number };
const KEY='charpet.pets.v1';

function App(){
 const [pets,setPets]=useState<Pet[]>(()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return []}});
 const [selected,setSelected]=useState<Pet|null>(null);
 useEffect(()=>localStorage.setItem(KEY,JSON.stringify(pets)),[pets]);
 function upload(file?:File){ if(!file)return; const r=new FileReader(); r.onload=()=>{const p={id:crypto.randomUUID(),name:file.name.replace(/\.[^.]+$/,''),image:String(r.result),source:'upload' as const,createdAt:Date.now()};setPets(x=>[p,...x]);setSelected(p)};r.readAsDataURL(file); }
 return <main className="app">
  <header><div><span className="eyebrow">CHARPET STUDIO · V0.1</span><h1>养一只属于你的 Char</h1><p>先把角色带进来，再慢慢让它活起来。</p></div><label className="uploadTop">＋ 上传角色<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>upload(e.target.files?.[0])}/></label></header>
  <section className="hero"><div className="petStage">{selected?<img src={selected.image} className="pet idle"/>:<div className="placeholder"><div>🐾</div><span>选择一个角色开始</span></div>}</div><div className="panel"><span className="eyebrow">MY PET</span><h2>{selected?.name||'还没有角色'}</h2><p>{selected?'这是你的第一只 Char。下一步会接入 SullyOS 捏人。':'你可以直接上传 PNG / JPG / WebP。'}</p>{selected&&<button onClick={()=>setSelected(null)}>返回角色库</button>}</div></section>
  <section><div className="sectionHead"><h2>角色库</h2><span>{pets.length} 个角色</span></div><div className="grid">{pets.map(p=><button className="card" key={p.id} onClick={()=>setSelected(p)}><div className="thumb"><img src={p.image}/></div><strong>{p.name}</strong><small>{p.source==='upload'?'图片导入':'SullyOS 捏人'}</small></button>)}{pets.length===0&&<label className="empty">＋<span>添加你的第一个角色</span><input hidden type="file" accept="image/*" onChange={e=>upload(e.target.files?.[0])}/></label>}</div></section>
 </main>
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);

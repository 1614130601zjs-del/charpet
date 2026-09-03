import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

type Pet = { id:string; name:string; image:string; source:'upload'|'creator'; createdAt:number; creatorState?:unknown };
const KEY='charpet.pets.v1';
const CREATOR_URL='https://raw.githubusercontent.com/qegj567-cloud/SullyOS/master/public/like520/character_creator.html';
const CREATOR_ORIGIN='https://raw.githubusercontent.com';
function loadPets():Pet[]{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return []}}

function App(){
 const [pets,setPets]=useState<Pet[]>(loadPets);
 const [selected,setSelected]=useState<Pet|null>(null);
 const [creatorOpen,setCreatorOpen]=useState(false);
 const [creatorReady,setCreatorReady]=useState(false);
 const [creatorName,setCreatorName]=useState('我的 Char');
 const [petMood,setPetMood]=useState('idle');
 const [drag,setDrag]=useState({x:0,y:0,active:false});
 const [petOffset,setPetOffset]=useState({x:0,y:0});
 const dragStart=useRef({x:0,y:0,ox:0,oy:0});
 const iframeRef=useRef<HTMLIFrameElement>(null);
 useEffect(()=>localStorage.setItem(KEY,JSON.stringify(pets)),[pets]);
 const selectedPet=selected?pets.find(p=>p.id===selected.id)||selected:null;
 function upload(file?:File){if(!file)return;const r=new FileReader();r.onload=()=>{const p:Pet={id:crypto.randomUUID(),name:file.name.replace(/\.[^.]+$/,''),image:String(r.result),source:'upload',createdAt:Date.now()};setPets(x=>[p,...x]);setSelected(p);setPetOffset({x:0,y:0})};r.readAsDataURL(file)}
 function openCreator(pet?:Pet){setCreatorName(pet?.name||'我的 Char');setCreatorReady(false);setCreatorOpen(true)}
 function interact(){setPetMood(m=>m==='happy'?'surprised':'happy');window.setTimeout(()=>setPetMood('idle'),900)}
 function startDrag(e:React.PointerEvent<HTMLImageElement>){e.currentTarget.setPointerCapture(e.pointerId);dragStart.current={x:e.clientX,y:e.clientY,ox:petOffset.x,oy:petOffset.y};setDrag({x:e.clientX,y:e.clientY,active:true})}
 function moveDrag(e:React.PointerEvent<HTMLImageElement>){if(!drag.active)return;setPetOffset({x:dragStart.current.ox+e.clientX-dragStart.current.x,y:dragStart.current.oy+e.clientY-dragStart.current.y})}
 function endDrag(){setDrag(d=>({...d,active:false}))}
 useEffect(()=>{function onMessage(e:MessageEvent){if(e.origin!==CREATOR_ORIGIN||e.source!==iframeRef.current?.contentWindow)return;const d=e.data;if(!d||typeof d!=='object')return;if(d.type==='like520_ready'){setCreatorReady(true);iframeRef.current?.contentWindow?.postMessage({type:'like520_init',payload:{mode:'char',charName:creatorName,draftKey:`charpet_${selectedPet?.id||'new'}`,presets:{},savedState:selectedPet?.creatorState,isSully:false}},CREATOR_ORIGIN)}if(d.type==='like520_result'&&d.payload?.dataUrl){const old=selectedPet;const p:Pet={id:old?.id||crypto.randomUUID(),name:creatorName.trim()||old?.name||'我的 Char',image:d.payload.transparentDataUrl||d.payload.dataUrl,source:'creator',createdAt:old?.createdAt||Date.now(),creatorState:d.payload.state};setPets(x=>old?x.map(i=>i.id===old.id?p:i):[p,...x]);setSelected(p);setPetOffset({x:0,y:0});setCreatorOpen(false)}}window.addEventListener('message',onMessage);return()=>window.removeEventListener('message',onMessage)},[creatorName,selectedPet]);
 return <main className="app">
  <header><div><span className="eyebrow">CHARPET STUDIO · V0.3</span><h1>养一只属于你的 Char</h1><p>可以捏，也可以直接把自己的角色带进来。</p></div><div className="headerActions"><button className="creatorTop" onClick={()=>openCreator()}>✦ 捏一个 Char</button><label className="uploadTop">＋ 上传角色<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>upload(e.target.files?.[0])}/></label></div></header>
  <section className="hero"><div className="petStage"><div className={`petBubble ${petMood}`}>{petMood==='happy'?'嘿嘿！':petMood==='surprised'?'欸？！':''}</div>{selectedPet?<img src={selectedPet.image} className={`pet ${petMood}`} style={{transform:`translate(${petOffset.x}px,${petOffset.y}px)`}} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onClick={interact} draggable={false} alt={selectedPet.name}/>:<div className="placeholder"><div>🐾</div><span>选择一个角色开始</span></div>}</div><div className="panel"><span className="eyebrow">MY PET</span><h2>{selectedPet?.name||'还没有角色'}</h2><p>{selectedPet?'点一下它会回应，按住角色可以拖动。下一步就是让它真正活在桌面上。':'你可以直接上传 PNG / JPG / WebP，或者用 SullyOS 捏一个。'}</p><div className="panelActions">{selectedPet&&<button onClick={interact}>逗一下</button>}{selectedPet&&<button onClick={()=>openCreator(selectedPet)}>重新捏</button>}{selectedPet&&<button onClick={()=>{setSelected(null);setPetOffset({x:0,y:0})}}>返回角色库</button>}</div></div></section>
  <section><div className="sectionHead"><h2>角色库</h2><span>{pets.length} 个角色</span></div><div className="grid">{pets.map(p=><button className={`card ${selectedPet?.id===p.id?'active':''}`} key={p.id} onClick={()=>{setSelected(p);setPetOffset({x:0,y:0})}}><div className="thumb"><img src={p.image} alt=""/></div><strong>{p.name}</strong><small>{p.source==='upload'?'图片导入':'SullyOS 捏人'}</small></button>)}<button className="addCard" onClick={()=>openCreator()}><span>✦</span><strong>捏一只新的</strong><small>打开角色工坊</small></button>{pets.length===0&&<label className="empty">＋<span>也可以上传第一个角色</span><input hidden type="file" accept="image/*" onChange={e=>upload(e.target.files?.[0])}/></label>}</div></section>
  {creatorOpen&&<div className="creatorOverlay"><div className="creatorShell"><div className="creatorBar"><div><span className="eyebrow">CHARPET CREATOR</span><strong>{creatorReady?'正在捏你的 Char':'正在打开捏人器…'}</strong></div><button className="closeCreator" onClick={()=>setCreatorOpen(false)}>关闭</button></div><iframe ref={iframeRef} src={CREATOR_URL} title="CharPet 捏人器" className="creatorFrame"/></div></div>}
 </main>
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);

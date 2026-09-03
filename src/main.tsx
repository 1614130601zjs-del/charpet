import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import type { PetAction, PetMood } from './pet/petTypes';
import { applyPetEvent, nextIdleState, type PetState } from './pet/petRuntime';
import { createPetEvent, dispatchPetEvent, subscribePetEvents } from './bridge/semanticEvents';
import { getPetMotion, motionScale } from './pet/petRenderer';

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
 const [petState,setPetState]=useState<PetState>({emotion:'idle',action:'idle',intensity:0.35,speech:'',updatedAt:Date.now()});
 const [drag,setDrag]=useState({x:0,y:0,active:false});
 const [petOffset,setPetOffset]=useState({x:0,y:0});
 const dragStart=useRef({x:0,y:0,ox:0,oy:0});
 const iframeRef=useRef<HTMLIFrameElement>(null);
 useEffect(()=>localStorage.setItem(KEY,JSON.stringify(pets)),[pets]);
 const selectedPet=selected?pets.find(p=>p.id===selected.id)||selected:null;
 const motion=getPetMotion(petState);
 function emit(action:PetAction, emotion:PetMood='idle', intensity=1, text=''){
   dispatchPetEvent(createPetEvent(action,emotion,intensity,text||undefined));
 }
 useEffect(()=>subscribePetEvents(event=>setPetState(s=>applyPetEvent(s,event))),[]);
 useEffect(()=>{if(petState.action==='idle')return;const t=window.setTimeout(()=>setPetState(s=>nextIdleState(s)),900);return()=>window.clearTimeout(t)},[petState.action,petState.updatedAt]);
 function upload(file?:File){if(!file)return;const r=new FileReader();r.onload=()=>{const p:Pet={id:crypto.randomUUID(),name:file.name.replace(/\.[^.]+$/,''),image:String(r.result),source:'upload',createdAt:Date.now()};setPets(x=>[p,...x]);setSelected(p);setPetOffset({x:0,y:0});emit('wake','happy',0.7,'你好！')};r.readAsDataURL(file)}
 function openCreator(pet?:Pet){setCreatorName(pet?.name||'我的 Char');setCreatorReady(false);setCreatorOpen(true)}
 function interact(){emit('tap',petState.emotion==='happy'?'surprised':'happy',0.9,petState.emotion==='happy'?'欸？！':'嘿嘿！')}
 function startDrag(e:React.PointerEvent<HTMLImageElement>){e.currentTarget.setPointerCapture(e.pointerId);dragStart.current={x:e.clientX,y:e.clientY,ox:petOffset.x,oy:petOffset.y};setDrag({x:e.clientX,y:e.clientY,active:true});emit('drag','surprised',0.65)}
 function moveDrag(e:React.PointerEvent<HTMLImageElement>){if(!drag.active)return;setPetOffset({x:dragStart.current.ox+e.clientX-dragStart.current.x,y:dragStart.current.oy+e.clientY-dragStart.current.y})}
 function endDrag(){if(drag.active)emit('idle','idle',0.35);setDrag(d=>({...d,active:false}))}
 useEffect(()=>{function onMessage(e:MessageEvent){if(e.origin!==CREATOR_ORIGIN||e.source!==iframeRef.current?.contentWindow)return;const d=e.data;if(!d||typeof d!=='object')return;if(d.type==='like520_ready'){setCreatorReady(true);iframeRef.current?.contentWindow?.postMessage({type:'like520_init',payload:{mode:'char',charName:creatorName,draftKey:`charpet_${selectedPet?.id||'new'}`,presets:{},savedState:selectedPet?.creatorState,isSully:false}},CREATOR_ORIGIN)}if(d.type==='like520_result'&&d.payload?.dataUrl){const old=selectedPet;const p:Pet={id:old?.id||crypto.randomUUID(),name:creatorName.trim()||old?.name||'我的 Char',image:d.payload.transparentDataUrl||d.payload.dataUrl,source:'creator',createdAt:old?.createdAt||Date.now(),creatorState:d.payload.state};setPets(x=>old?x.map(i=>i.id===old.id?p:i):[p,...x]);setSelected(p);setPetOffset({x:0,y:0});setCreatorOpen(false);emit('wake','happy',0.8,'捏好啦！')}}window.addEventListener('message',onMessage);return()=>window.removeEventListener('message',onMessage)},[creatorName,selectedPet]);
 return <main className="app">
  <header><div><span className="eyebrow">CHARPET STUDIO · V0.4</span><h1>养一只属于你的 Char</h1><p>可以捏，也可以直接把自己的角色带进来。</p></div><div className="headerActions"><button className="creatorTop" onClick={()=>openCreator()}>✦ 捏一个 Char</button><label className="uploadTop">＋ 上传角色<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>upload(e.target.files?.[0])}/></label></div></header>
  <section className="hero"><div className="petStage"><div className={`petBubble ${petState.emotion}`}>{petState.speech}</div>{selectedPet?<img src={selectedPet.image} className={`pet ${motion.className}`} style={{transform:`translate(${petOffset.x}px,${petOffset.y}px)`,scale:motionScale(petState)}} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onClick={interact} draggable={false} alt={selectedPet.name}/>:<div className="placeholder"><div>🐾</div><span>选择一个角色开始</span></div>}</div><div className="panel"><span className="eyebrow">MY PET</span><h2>{selectedPet?.name||'还没有角色'}</h2><p>{selectedPet?`状态：${petState.emotion} · ${petState.action}。点一下它会回应，按住角色可以拖动。`:'你可以直接上传 PNG / JPG / WebP，或者用 SullyOS 捏一个。'}</p><div className="panelActions">{selectedPet&&<button onClick={interact}>逗一下</button>}{selectedPet&&<button onClick={()=>emit('talk','happy',0.8,'你好呀～')}>说句话</button>}{selectedPet&&<button onClick={()=>openCreator(selectedPet)}>重新捏</button>}{selectedPet&&<button onClick={()=>{setSelected(null);setPetOffset({x:0,y:0});setPetState(s=>nextIdleState(s))}}>返回角色库</button>}</div></div></section>
  <section><div className="sectionHead"><h2>角色库</h2><span>{pets.length} 个角色</span></div><div className="grid">{pets.map(p=><button className={`card ${selectedPet?.id===p.id?'active':''}`} key={p.id} onClick={()=>{setSelected(p);setPetOffset({x:0,y:0});emit('wake','happy',0.5)}}><div className="thumb"><img src={p.image} alt=""/></div><strong>{p.name}</strong><small>{p.source==='upload'?'图片导入':'SullyOS 捏人'}</small></button>)}<button className="addCard" onClick={()=>openCreator()}><span>✦</span><strong>捏一只新的</strong><small>打开角色工坊</small></button>{pets.length===0&&<label className="empty">＋<span>也可以上传第一个角色</span><input hidden type="file" accept="image/*" onChange={e=>upload(e.target.files?.[0])}/></label>}</div></section>
  {creatorOpen&&<div className="creatorOverlay"><div className="creatorShell"><div className="creatorBar"><div><span className="eyebrow">CHARPET CREATOR</span><strong>{creatorReady?'正在捏你的 Char':'正在打开捏人器…'}</strong></div><button className="closeCreator" onClick={()=>setCreatorOpen(false)}>关闭</button></div><iframe ref={iframeRef} src={CREATOR_URL} title="CharPet 捏人器" className="creatorFrame"/></div></div>}
 </main>
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);

(()=>{
  let touchActive=false, blockUntil=0;
  const nativeScrollTo=window.scrollTo.bind(window);
  window.scrollTo=function(...args){
    if(touchActive || Date.now()<blockUntil) return;
    return nativeScrollTo(...args);
  };
  const state=new WeakMap();
  const getTarget=t=>t?.closest?.('.charCard img,.charCard .charMeta');
  document.addEventListener('pointerdown',e=>{
    touchActive=true;
    const el=getTarget(e.target); if(!el)return;
    const s={x:e.clientX,y:e.clientY,long:false,timer:null};
    s.timer=setTimeout(()=>{s.long=true;blockUntil=Date.now()+900;},650);
    state.set(el,s);
  },true);
  document.addEventListener('pointermove',e=>{
    const el=getTarget(e.target),s=el&&state.get(el); if(!s)return;
    if(Math.hypot(e.clientX-s.x,e.clientY-s.y)>12&&s.timer){clearTimeout(s.timer);s.timer=null;}
  },true);
  document.addEventListener('pointerup',e=>{
    const el=getTarget(e.target),s=el&&state.get(el);
    if(s){if(s.timer)clearTimeout(s.timer);if(s.long)blockUntil=Date.now()+900;state.delete(el);}
    touchActive=false; blockUntil=Math.max(blockUntil,Date.now()+180);
  },true);
  document.addEventListener('pointercancel',e=>{
    const el=getTarget(e.target),s=el&&state.get(el);if(s?.timer)clearTimeout(s.timer);if(el)state.delete(el);
    touchActive=false;blockUntil=Date.now()+300;
  },true);
  document.addEventListener('click',e=>{
    if(Date.now()<blockUntil&&getTarget(e.target)){e.preventDefault();e.stopImmediatePropagation();}
  },true);
})();

(()=>{
// Navigation persistence patch: v4 keeps view state in memory, while this layer
// preserves the user's scroll position when render() replaces document.body.
const KEY='charpet.navScroll.v3';
let pending=null;
const save=()=>{pending=window.scrollY||0;sessionStorage.setItem(KEY,String(pending))};
const restore=()=>{const v=sessionStorage.getItem(KEY);if(v===null)return;sessionStorage.removeItem(KEY);requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo(0,Number(v)||0)))};
document.addEventListener('click',e=>{if(e.target.closest('[data-nav],[data-info],[data-wb-tab]'))save()},true);
new MutationObserver(()=>{if(pending===null)return;restore();pending=null}).observe(document.body,{childList:true,subtree:true});
})();
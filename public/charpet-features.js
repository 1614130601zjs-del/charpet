(() => {
  const KEY = 'charpet-feature-state-v1';
  const state = JSON.parse(localStorage.getItem(KEY) || '{}');
  state.theme = state.theme || 'lavender';
  state.activities = Array.isArray(state.activities) ? state.activities : [];
  state.awayAt = state.awayAt || null;
  state.floatingPet = !!state.floatingPet;
  localStorage.setItem(KEY, JSON.stringify(state));

  const themes = {
    lavender: { accent: '#8f72c9', soft: '#f3eefb', panel: '#fffaff' },
    blue: { accent: '#5d82b8', soft: '#edf4fb', panel: '#fbfdff' },
    mint: { accent: '#5f9b82', soft: '#edf7f2', panel: '#fbfffd' },
    peach: { accent: '#c98262', soft: '#fbf0ea', panel: '#fffaf7' }
  };

  const save = () => localStorage.setItem(KEY, JSON.stringify(state));
  const escape = s => String(s).replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const currentName = () => document.querySelector('.frameworkHeader h1')?.textContent?.trim() || 'CHAR';
  const currentAvatar = () => document.querySelector('.homePetPlaceholder img, .charIdCard.current img')?.src || document.querySelector('.charIdCard img')?.src || '';

  function applyTheme() {
    const t = themes[state.theme] || themes.lavender;
    document.documentElement.style.setProperty('--charpet-global-accent', t.accent);
    document.documentElement.style.setProperty('--charpet-global-soft', t.soft);
    document.documentElement.style.setProperty('--charpet-global-panel', t.panel);
    document.documentElement.style.setProperty('--charpet-global-theme', state.theme);
  }

  function logActivity(title, detail) {
    state.activities.unshift({ id: Date.now() + Math.random(), time: Date.now(), title, detail, char: currentName() });
    state.activities = state.activities.slice(0, 50);
    save();
    refreshHome();
  }

  function injectStyle() {
    if (document.getElementById('charpet-feature-style')) return;
    const style = document.createElement('style');
    style.id = 'charpet-feature-style';
    style.textContent = `
      :root{--charpet-global-accent:#8f72c9;--charpet-global-soft:#f3eefb;--charpet-global-panel:#fffaff}
      .charpetFeaturePanel{margin-top:16px;padding:18px;border:1px solid color-mix(in srgb,var(--charpet-global-accent) 22%,#ddd);border-radius:20px;background:var(--charpet-global-panel);box-shadow:0 10px 30px rgba(50,40,60,.06)}
      .charpetFeaturePanel h3{margin:0 0 8px}.charpetFeaturePanel p{margin:6px 0 12px;opacity:.72}
      .charpetActionGrid,.charpetThemeGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(115px,1fr));gap:9px}
      .charpetFeaturePanel button{border:1px solid #ddd4e6;background:#fff;border-radius:12px;padding:10px 12px;cursor:pointer;font:inherit}
      .charpetFeaturePanel button:hover,.charpetFeaturePanel button.active{border-color:var(--charpet-global-accent);background:var(--charpet-global-soft)}
      .charpetActivity{padding:10px 0;border-bottom:1px solid #eee}.charpetActivity:last-child{border-bottom:0}
      .charpetActivity small{display:block;opacity:.55;margin-bottom:3px}.charpetStatus{font-weight:700;color:var(--charpet-global-accent)}
      .charpetAwayOverlay{position:fixed;inset:0;background:rgba(25,20,30,.35);display:flex;align-items:center;justify-content:center;z-index:10050;padding:20px}
      .charpetAwayCard{width:min(560px,100%);max-height:80vh;overflow:auto;background:#fff;border-radius:24px;padding:24px;box-shadow:0 30px 80px rgba(0,0,0,.22)}
      .charpetAwayCard h2{margin:0 0 6px}.charpetAwayCard .close{float:right;font-size:22px;border:0;background:transparent;cursor:pointer}
      #charpet-floating-pet{position:fixed;right:24px;bottom:72px;width:92px;height:92px;border-radius:50%;z-index:10020;cursor:pointer;display:none;align-items:center;justify-content:center;background:var(--charpet-global-soft);border:2px solid var(--charpet-global-accent);box-shadow:0 14px 34px rgba(40,30,50,.2);animation:charpetFloat 2.6s ease-in-out infinite}
      #charpet-floating-pet img{max-width:78px;max-height:78px;border-radius:50%;object-fit:cover}.charpetBubble{position:fixed;right:25px;bottom:174px;z-index:10021;background:#fff;padding:9px 12px;border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,.15);display:none}
      @keyframes charpetFloat{50%{transform:translateY(-7px)}}
    `;
    document.head.appendChild(style);
  }

  function panel(title, body, id) {
    let el = document.getElementById(id);
    if (!el) { el = document.createElement('div'); el.id = id; el.className = 'charpetFeaturePanel'; }
    el.innerHTML = `<h3>${title}</h3>${body}`;
    return el;
  }

  function refreshHome() {
    const home = [...document.querySelectorAll('.frameworkPage')].find(x => x.querySelector('h2')?.textContent?.trim() === '小窝');
    if (!home) return;
    const root = home.querySelector('.homeFramework');
    if (!root) return;
    let panelEl = home.querySelector('#charpet-home-actions');
    const actions = [['🛋️','坐沙发','坐在沙发上休息'],['🛏️','躺床上','躺到床上发呆'],['😴','睡觉','睡一会儿恢复精力'],['🍵','吃东西','吃点东西补充饱腹'],['📖','阅读','安静地看会儿书'],['🎮','玩东西','玩一会儿家具上的小东西']];
    const recent = state.activities.filter(a => a.char === currentName()).slice(0,4);
    const body = `<p>这里的按钮是真正会留下生活记录的轻量互动，不做复杂模拟。</p><div class="charpetActionGrid">${actions.map(([i,n,d]) => `<button data-charpet-action="${escape(n)}" data-detail="${escape(d)}">${i} ${n}</button>`).join('')}</div><div style="margin-top:14px"><span class="charpetStatus">最近：${recent[0] ? escape(recent[0].title) : '还没有生活记录'}</span></div>${recent.length ? `<div style="margin-top:10px">${recent.map(a => `<div class="charpetActivity"><small>${new Date(a.time).toLocaleString()}</small>${escape(a.title)} · ${escape(a.detail)}</div>`).join('')}</div>` : ''}`;
    panelEl = panel('小窝互动', body, 'charpet-home-actions');
    if (!panelEl.parentElement) root.appendChild(panelEl);
    panelEl.querySelectorAll('[data-charpet-action]').forEach(b => b.onclick = () => logActivity(b.dataset.charpetAction, b.dataset.detail));
  }

  function refreshSettings() {
    const settings = [...document.querySelectorAll('.frameworkPage')].find(x => x.querySelector('h2')?.textContent?.trim() === '设置');
    if (!settings) return;
    const list = settings.querySelector('.settingsList');
    if (!list) return;
    let theme = settings.querySelector('#charpet-global-theme-panel');
    const body = `<p>全局 UI 配色只影响整个 CHARPET，不会改某个 CHAR 的卡片配色。具体主题可以继续扩展。</p><div class="charpetThemeGrid">${Object.entries(themes).map(([id,t]) => `<button class="${state.theme===id?'active':''}" data-theme="${id}"><span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${t.accent};vertical-align:-2px"></span> ${id==='lavender'?'薰衣草':id==='blue'?'雾蓝':id==='mint'?'薄荷': '蜜桃'}</button>`).join('')}</div><div style="margin-top:12px;opacity:.62">后续可加入：自定义色盘、色环、背景 / 文字 / 按钮 / 强调色、明暗模式。</div>`;
    theme = panel('全局 UI 配色', body, 'charpet-global-theme-panel');
    if (!theme.parentElement) list.appendChild(theme);
    theme.querySelectorAll('[data-theme]').forEach(b => b.onclick = () => { state.theme=b.dataset.theme; save(); applyTheme(); refreshSettings(); });

    let pet = settings.querySelector('#charpet-floating-setting');
    pet = panel('桌宠快捷层', `<p>网页端先提供一个可点击的悬浮 CHAR；后续接入真正桌宠运行时。</p><button id="charpet-floating-toggle">${state.floatingPet?'关闭悬浮 CHAR':'开启悬浮 CHAR'}</button>`, 'charpet-floating-setting');
    if (!pet.parentElement) list.appendChild(pet);
    pet.querySelector('#charpet-floating-toggle').onclick = () => { state.floatingPet=!state.floatingPet; save(); updateFloating(); refreshSettings(); };
  }

  function updateFloating() {
    let el = document.getElementById('charpet-floating-pet');
    let bubble = document.getElementById('charpet-floating-bubble');
    if (!el) { el=document.createElement('div'); el.id='charpet-floating-pet'; document.body.appendChild(el); }
    if (!bubble) { bubble=document.createElement('div'); bubble.id='charpet-floating-bubble'; bubble.className='charpetBubble'; document.body.appendChild(bubble); }
    const avatar=currentAvatar();
    el.innerHTML=avatar?`<img src="${avatar}" alt="CHAR">`:'🐾';
    el.style.display=state.floatingPet?'flex':'none';
    el.onclick=()=>{ bubble.textContent=['欸，你看我一下','摸摸我？','我在这里哦','要不要陪我一会儿？'][Math.floor(Math.random()*4)]; bubble.style.display='block'; setTimeout(()=>bubble.style.display='none',2200); logActivity('CHAR 主动叫你','悬浮 CHAR 主动引起了 U 的注意'); };
  }

  function showAwayReport() {
    if (!state.awayAt) return;
    const awayAt=state.awayAt; state.awayAt=null; save();
    const events=state.activities.filter(a=>a.time>=awayAt).slice(0,8);
    if (!events.length) return;
    const old=document.getElementById('charpet-away-overlay'); old?.remove();
    const overlay=document.createElement('div'); overlay.id='charpet-away-overlay'; overlay.className='charpetAwayOverlay';
    overlay.innerHTML=`<div class="charpetAwayCard"><button class="close">×</button><h2>你不在的时候，${escape(currentName())} 干了什么？</h2><p>这是本地网页层记录的生活事件。</p>${events.map(a=>`<div class="charpetActivity"><small>${new Date(a.time).toLocaleString()}</small><b>${escape(a.title)}</b><div>${escape(a.detail)}</div></div>`).join('')}</div>`;
    document.body.appendChild(overlay); overlay.querySelector('.close').onclick=()=>overlay.remove();
  }

  function hookNav() {
    document.querySelectorAll('.frameworkNav button').forEach(btn => { if (btn.dataset.charpetHooked) return; btn.dataset.charpetHooked='1'; btn.addEventListener('click',()=>setTimeout(()=>{refreshHome();refreshSettings();updateFloating();},50)); });
  }

  injectStyle(); applyTheme();
  document.addEventListener('visibilitychange',()=>{ if(document.hidden){state.awayAt=Date.now();save();} else setTimeout(showAwayReport,120); });
  const observer=new MutationObserver(()=>{hookNav();refreshHome();refreshSettings();updateFloating();});
  observer.observe(document.body,{childList:true,subtree:true});
  hookNav(); refreshHome(); refreshSettings(); updateFloating();
})();

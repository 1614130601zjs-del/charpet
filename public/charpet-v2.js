(() => {
  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => [...r.querySelectorAll(s)];
  let lastView = '';
  let archiveAdd = null;
  let pressTimer = null;
  let pressTarget = null;

  function activeView() {
    const b = qs('.frameworkNav button.active');
    return b?.textContent?.trim() || '';
  }

  function addArchiveButton() {
    if (archiveAdd || !qs('.charArchiveList')) return;
    archiveAdd = document.createElement('button');
    archiveAdd.className = 'charpetArchiveCreate';
    archiveAdd.innerHTML = '<span>＋</span><strong>新建档案</strong><small>创建一个新的 CHAR 档案</small>';
    archiveAdd.addEventListener('click', () => {
      const b = qsa('.headerActions button').find(x => x.textContent.includes('新建 CHAR'));
      b?.click();
    });
    qs('.charArchiveList')?.appendChild(archiveAdd);
  }

  function archiveLongPress() {
    qsa('.charIdCard').forEach(card => {
      if (card.dataset.charpetBound) return;
      card.dataset.charpetBound = '1';
      const start = e => {
        clearTimeout(pressTimer);
        pressTarget = card;
        pressTimer = setTimeout(() => {
          const name = qs('h3', card)?.textContent?.trim() || '这个 CHAR';
          const current = card.classList.contains('current');
          showConfirm(`是否将 ${name}（角色名）设为当前角色？`, current ? '当前 CHAR 已经是它。' : '', () => {
            const btns = qsa('.charCardActions button', card);
            if (!current) btns[2]?.click();
          });
        }, 600);
      };
      const end = () => { clearTimeout(pressTimer); pressTarget = null; };
      card.addEventListener('pointerdown', start);
      card.addEventListener('pointerup', end);
      card.addEventListener('pointercancel', end);
      card.addEventListener('pointerleave', end);
      card.addEventListener('contextmenu', e => e.preventDefault());
    });
  }

  function showConfirm(title, detail, yes) {
    qs('.charpetConfirm')?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'charpetConfirm';
    wrap.innerHTML = `<div class="charpetConfirmBox"><h3>${escapeHtml(title)}</h3>${detail ? `<p>${escapeHtml(detail)}</p>` : ''}<div><button data-no>取消</button><button data-yes>确认</button></div></div>`;
    wrap.addEventListener('click', e => { if (e.target === wrap || e.target.closest('[data-no]')) wrap.remove(); });
    qs('[data-yes]', wrap).addEventListener('click', () => { yes(); wrap.remove(); });
    document.body.appendChild(wrap);
  }

  function escapeHtml(s) { return s.replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

  function hideArchiveActions() {
    qsa('.charCardActions').forEach(x => x.setAttribute('aria-hidden', 'true'));
  }

  function headerCleanup() {
    const actions = qs('.headerActions');
    if (!actions) return;
    actions.style.display = 'none';
  }

  function moveImportToInfo() {
    if (activeView() !== '角色资料') return;
    const page = qs('.frameworkPage');
    if (!page || qs('.charpetImportEntry', page)) return;
    const source = qsa('.headerActions button').find(x => x.textContent.includes('导入酒馆卡'));
    if (!source) return;
    const holder = document.createElement('div');
    holder.className = 'charpetImportEntry';
    holder.innerHTML = '<div><strong>酒馆卡</strong><small>将 Tavern / SillyTavern PNG 卡导入到当前 CHAR 档案</small></div><button>导入酒馆卡</button>';
    qs('button', holder).addEventListener('click', () => source.click());
    (qs('.infoTabs', page)?.parentElement || page).insertBefore(holder, qs('.infoTabs', page) || page.firstChild);
  }

  function galleryPolish() {
    if (activeView() !== '角色资料') return;
    qsa('.galleryGroup').forEach(group => {
      const h = qs('h3', group);
      if (!h) return;
      const t = h.textContent.trim();
      if (t === 'animations' || t === '动画') h.textContent = '动作 / 状态';
      if (t === 'poses') h.textContent = '基础姿态';
      if (t === 'expressions') h.textContent = '基础表情';
      if (t === 'parts') h.textContent = '身体组件';
    });
  }

  function homePolish() {
    if (activeView() !== '小窝') return;
    const old = qs('.homeActions');
    if (!old || qs('.charpetTouchBar')) return;
    old.style.display = 'none';
    const bar = document.createElement('div');
    bar.className = 'charpetTouchBar';
    bar.innerHTML = '<span>直接和 CHAR 互动</span><button>摸摸</button><button>摸头</button><button>抱起</button><button>喂吃的</button><button>喂喝的</button><button>陪玩</button>';
    const oldButtons = qsa('button', old);
    const map = [2,2,1,0,0];
    qsa('button', bar).slice(1).forEach((b, i) => b.addEventListener('click', () => {
      const target = oldButtons[map[i]] || oldButtons[0];
      if (target) target.click();
    }));
    old.parentElement?.appendChild(bar);
  }

  function diaryGuard() {
    if (activeView() !== '日记') return;
    qsa('.diaryCreate, .diaryInput, .diaryEditor, [placeholder*="日记"], textarea').forEach(x => {
      if (x.closest('.charpetTouchBar')) return;
      if (x.closest('.frameworkPage')) x.style.display = 'none';
    });
  }

  function tick() {
    const view = activeView();
    if (view !== lastView) { lastView = view; archiveAdd = null; }
    headerCleanup();
    if (view === '角色档案') { addArchiveButton(); archiveLongPress(); hideArchiveActions(); }
    if (view === '角色资料') { moveImportToInfo(); galleryPolish(); }
    homePolish();
    diaryGuard();
  }

  const observer = new MutationObserver(() => {
    clearTimeout(window.__charpetV2Timer);
    window.__charpetV2Timer = setTimeout(tick, 30);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('load', () => setTimeout(tick, 100));
})();

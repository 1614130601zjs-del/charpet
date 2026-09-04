(() => {
  const PET_KEY = 'charpet.pets.v2';
  const IMPORT_STYLE_ID = 'charpet-tavern-import-style';

  const esc = (s) => String(s ?? '').replace(/[&<>\"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;' }[c]));
  const text = (v) => typeof v === 'string' ? v.trim() : '';

  // Timeline = age / life stage / time period / life line.
  // Relationship-only labels are kept out unless the title itself clearly denotes a line/phase.
  const timelineTitle = (title) => {
    const t = text(title).toLowerCase();
    if (!t) return false;
    if (/^(人妻|恋人|情侣|伴侣|朋友|家人|主从|同事|已婚|未婚|单身|前任|丈夫|妻子|男友|女友)$/i.test(t)) return false;
    return /(男高|女高|高中|男大|女大|大学|大学生|童年|幼年|少年|青年|成年|晚年|学生时代|学生时期|工作后|毕业后|婚后|婚前|五年后|十年后|多年后|过去|现在|未来|初期|中期|后期|阶段|时期|时间线|人生线|年龄|\d+\s*(岁|年级|年后|年前)|\d+\s*years?|\b(day|night|morning|childhood|teen|teenage|adult|future|past|phase|period)\b|\b(high school|college|university)\b)/i.test(t);
  };

  function decodeBytes(bytes) { return new TextDecoder('utf-8').decode(bytes); }

  function decodeCardValue(value) {
    const raw = text(value);
    if (!raw) return null;
    try {
      const direct = JSON.parse(raw);
      if (direct && typeof direct === 'object') return direct;
    } catch {}
    try {
      const normalized = raw.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
      const binary = atob(padded);
      const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
      const decoded = JSON.parse(decodeBytes(bytes));
      if (decoded && typeof decoded === 'object') return decoded;
    } catch {}
    return null;
  }

  function readPngChunks(buffer) {
    const bytes = new Uint8Array(buffer);
    const signature = [137,80,78,71,13,10,26,10];
    if (bytes.length < 8 || !signature.every((x,i) => bytes[i] === x)) throw new Error('这不是有效的 PNG 文件');
    const chunks = [];
    let offset = 8;
    while (offset + 12 <= bytes.length) {
      const view = new DataView(buffer);
      const len = view.getUint32(offset);
      const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
      if (offset + 12 + len > bytes.length) break;
      const data = bytes.slice(offset + 8, offset + 8 + len);
      chunks.push({ type, data });
      offset += 12 + len;
      if (type === 'IEND') break;
    }
    return chunks;
  }

  function parseTavernPng(buffer) {
    const chunks = readPngChunks(buffer);
    const values = [];
    for (const chunk of chunks) {
      if (chunk.type === 'tEXt') {
        const zero = chunk.data.indexOf(0);
        if (zero >= 0) values.push({ key: decodeBytes(chunk.data.slice(0, zero)), value: decodeBytes(chunk.data.slice(zero + 1)) });
      } else if (chunk.type === 'iTXt') {
        const b = chunk.data;
        const nul = [];
        for (let i=0;i<b.length;i++) if (b[i]===0) nul.push(i);
        if (nul.length >= 3) {
          const key = decodeBytes(b.slice(0, nul[0]));
          const compressionFlag = b[nul[0]+1];
          const translatedEnd = nul[2];
          let start = translatedEnd + 1;
          if (compressionFlag === 0) values.push({ key, value: decodeBytes(b.slice(start)) });
        }
      }
    }
    const candidates = [];
    for (const item of values) {
      if (/^(ccv3|chara)$/i.test(item.key)) {
        const parsed = decodeCardValue(item.value);
        if (parsed) candidates.push(parsed);
      }
    }
    const data = candidates.find(x => x && (x.name || x.data || x.character_name)) || candidates[0];
    if (!data) throw new Error('PNG 里没有找到可读取的 chara / ccv3 酒馆角色数据');
    const root = data.data && typeof data.data === 'object' ? data.data : data;
    const book = root.character_book || root.characterBook || null;
    const entries = Array.isArray(book?.entries) ? book.entries : [];
    return {
      name: text(root.name || root.character_name) || '未命名 CHAR',
      description: text(root.description),
      personality: text(root.personality),
      scenario: text(root.scenario),
      firstMessage: text(root.first_mes || root.firstMessage),
      messageExamples: Array.isArray(root.mes_example || root.messageExamples) ? (root.mes_example || root.messageExamples) : [],
      worldbook: entries.map((e, i) => {
        const title = text(e.name || e.title || (Array.isArray(e.keys) ? e.keys.join(', ') : '世界书条目')) || `世界书 ${i + 1}`;
        return {
          id: `wb-${Date.now()}-${i}`,
          title,
          content: text(e.content),
          enabled: e.enabled !== false,
          isTimeline: timelineTitle(title)
        };
      })
    };
  }

  // Tavern's separate scenario/personality/examples/opening fields are deliberately
  // flattened into one editable role description in CharPet.
  function unifiedDescription(card) {
    const parts = [];
    if (card.description) parts.push(`【角色描述】\n${card.description}`);
    if (card.personality) parts.push(`【性格与气质】\n${card.personality}`);
    if (card.scenario) parts.push(`【场景与背景】\n${card.scenario}`);
    if (card.firstMessage) parts.push(`【开场内容】\n${card.firstMessage}`);
    if (card.messageExamples.length) {
      const examples = card.messageExamples.map(x => typeof x === 'string' ? x : JSON.stringify(x, null, 2)).join('\n\n');
      parts.push(`【对话示例】\n${examples}`);
    }
    return parts.filter(Boolean).join('\n\n') || '（酒馆卡未提供角色文字描述）';
  }

  function getPets() {
    try { const x = JSON.parse(localStorage.getItem(PET_KEY) || '[]'); return Array.isArray(x) ? x : []; } catch { return []; }
  }
  function savePets(pets) { localStorage.setItem(PET_KEY, JSON.stringify(pets)); }

  function injectStyle() {
    if (document.getElementById(IMPORT_STYLE_ID)) return;
    const s = document.createElement('style'); s.id = IMPORT_STYLE_ID;
    s.textContent = `
      .charpetImportButton{margin-left:8px!important}
      .charpetImportOverlay{position:fixed;inset:0;z-index:11000;background:rgba(25,20,30,.42);display:flex;align-items:center;justify-content:center;padding:18px}
      .charpetImportCard{width:min(760px,100%);max-height:88vh;overflow:auto;background:#fffaf7;border-radius:26px;padding:24px;box-shadow:0 30px 90px rgba(0,0,0,.25);color:#403630}
      .charpetImportHead{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.charpetImportHead h2{margin:2px 0 6px}.charpetImportClose{border:0;background:transparent;font-size:28px;cursor:pointer}
      .charpetImportDrop{display:block;margin:16px 0;padding:22px;border:2px dashed #d8cde2;border-radius:18px;text-align:center;background:#fff}
      .charpetImportPreview{margin-top:14px;padding:16px;border:1px solid #e3d9e8;border-radius:18px;background:#fff}.charpetImportPreview h3{margin:0 0 8px}.charpetImportPreview pre{white-space:pre-wrap;max-height:210px;overflow:auto;font:13px/1.55 system-ui,sans-serif}
      .charpetImportGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.charpetImportGrid label{display:grid;gap:6px}.charpetImportGrid input{padding:10px;border:1px solid #ddd2d9;border-radius:10px;font:inherit}
      .charpetImportActions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}.charpetImportActions button{border:1px solid #ddd2e0;border-radius:12px;padding:10px 15px;background:#fff;cursor:pointer;font:inherit}.charpetImportActions .primary{background:#8f72c9;color:#fff;border-color:#8f72c9}
      .charpetImportError{color:#b74d4d;margin-top:10px}.charpetImportHint{opacity:.68;font-size:13px}.charpetImportBadge{display:inline-block;margin:3px 5px 3px 0;padding:4px 8px;border-radius:999px;background:#f3eefb}
      @media(max-width:620px){.charpetImportGrid{grid-template-columns:1fr}.charpetImportCard{padding:18px}}
    `; document.head.appendChild(s);
  }

  function showImporter() {
    document.getElementById('charpet-tavern-import-overlay')?.remove();
    let parsed = null, image = '', relationship = '主人', timelineEnabled = true;
    const overlay = document.createElement('div'); overlay.id='charpet-tavern-import-overlay'; overlay.className='charpetImportOverlay';
    overlay.innerHTML = `<div class="charpetImportCard"><div class="charpetImportHead"><div><span class="eyebrow">TAVERN IMPORT</span><h2>导入酒馆卡</h2><p class="charpetImportHint">PNG 读取后会生成一个独立 CHAR。角色描述统一保存；世界书只按标题识别年龄/人生阶段时间线，关系单独保存，默认开启。</p></div><button class="charpetImportClose">×</button></div><label class="charpetImportDrop">📦 选择酒馆 PNG 角色卡<input id="charpetImportFile" hidden type="file" accept="image/png,.png" /></label><div id="charpetImportResult"></div><div class="charpetImportActions"><button id="charpetImportCancel">取消</button><button id="charpetImportConfirm" class="primary" disabled>读取并生成 CHAR</button></div></div>`;
    document.body.appendChild(overlay);
    const fileInput = overlay.querySelector('#charpetImportFile');
    const result = overlay.querySelector('#charpetImportResult');
    const confirm = overlay.querySelector('#charpetImportConfirm');
    const close = () => overlay.remove();
    overlay.querySelector('.charpetImportClose').onclick = close;
    overlay.querySelector('#charpetImportCancel').onclick = close;
    fileInput.onchange = async () => {
      const file = fileInput.files?.[0]; if (!file) return;
      try {
        const buffer = await file.arrayBuffer(); parsed = parseTavernPng(buffer);
        image = await new Promise((resolve, reject) => { const r=new FileReader(); r.onload=()=>resolve(String(r.result)); r.onerror=reject; r.readAsDataURL(file); });
        result.innerHTML = `<div class="charpetImportPreview"><h3>${esc(parsed.name)}</h3><div><span class="charpetImportBadge">世界书 ${parsed.worldbook.length} 条</span><span class="charpetImportBadge">时间线候选 ${parsed.worldbook.filter(x=>x.isTimeline).length} 条</span></div><pre>${esc(unifiedDescription(parsed).slice(0,900))}${unifiedDescription(parsed).length>900?'\n…':''}</pre><div class="charpetImportGrid"><label>你和 TA 的关系<input id="charpetImportRelationship" value="主人" /></label><label>时间线识别<input id="charpetImportTimeline" type="checkbox" checked style="width:20px;height:20px" /></label></div><p class="charpetImportHint">只检查世界书条目标题，不读取正文；男高、男大等人生阶段可以被识别为时间线，单独的关系词不会被误判。</p></div>`;
        confirm.disabled = false;
        overlay.querySelector('#charpetImportRelationship').oninput = e => relationship = e.target.value || '主人';
        overlay.querySelector('#charpetImportTimeline').onchange = e => timelineEnabled = e.target.checked;
      } catch (err) {
        parsed = null; confirm.disabled = true;
        result.innerHTML = `<div class="charpetImportError">${esc(err?.message || '读取失败，请确认这是带 chara / ccv3 数据的 PNG 酒馆卡。')}</div>`;
      }
    };
    confirm.onclick = () => {
      if (!parsed) return;
      const now = Date.now();
      const worldbook = parsed.worldbook.map(x => ({ ...x, isTimeline: timelineEnabled && !!x.isTimeline }));
      const timelineCandidates = worldbook.filter(x => x.isTimeline).map(x => x.title);
      const pet = {
        id: crypto.randomUUID(), name: parsed.name, image, source: 'upload', createdAt: now,
        assets: { avatar: image, idle: image }, userTitle: relationship,
        card: { templateId: 'classic', accentColor: '#b68cff', nickname: relationship },
        profile: { description: unifiedDescription(parsed), syncedAt: now },
        worldbook, relationship: [{ key:'relationship', label:'关系', value:0, min:0, max:100 }],
        era: timelineCandidates[0] || '', timeline: [], diary: [], memories: [], homeActivities: [],
        needs: { hunger:70, energy:80, mood:70 }, stats: { interactions:0, affection:0, lastSeenAt:now }
      };
      savePets([pet, ...getPets()]);
      close();
      location.reload();
    };
  }

  function refreshArchive() {
    const page = [...document.querySelectorAll('.frameworkPage')].find(x => x.querySelector('h2')?.textContent?.trim() === '角色档案');
    if (!page || page.querySelector('#charpet-tavern-import-trigger')) return;
    const title = page.querySelector('.pageTitle'); if (!title) return;
    const newButton = [...title.querySelectorAll('button')].find(b => b.textContent?.includes('新建 CHAR'));
    if (!newButton) return;
    const btn = document.createElement('button'); btn.id='charpet-tavern-import-trigger'; btn.className='primaryButton charpetImportButton'; btn.textContent='📦 导入酒馆卡'; btn.onclick=showImporter;
    newButton.insertAdjacentElement('afterend', btn);
  }

  injectStyle();
  const observer = new MutationObserver(() => refreshArchive());
  observer.observe(document.body, { childList:true, subtree:true });
  refreshArchive();
})();

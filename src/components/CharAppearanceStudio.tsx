import React, { useMemo, useState } from 'react';

export type AppearanceTab = 'identity' | 'pose' | 'expression' | 'outfit' | 'parts' | 'motion';

const poses = [
  ['stand', '🧍', '站立'], ['sit', '🪑', '坐着'], ['lie', '🛏️', '躺着'], ['crouch', '🫣', '蹲着'],
  ['walk', '🚶', '走路'], ['crawl', '🐾', '爬行'], ['screen_climb', '📱', '贴屏爬'], ['screen_peek', '👀', '角落探头'],
  ['screen_hang', '🫳', '挂在边缘'], ['picked_up', '🫴', '被抓起'],
];
const expressions = [
  ['idle', '😐', '平静'], ['happy', '🥰', '开心'], ['sad', '🥺', '委屈'], ['angry', '😾', '生气'],
  ['surprised', '😳', '惊讶'], ['shy', '🫣', '害羞'], ['sleep', '😴', '困困'], ['excited', '✨', '兴奋'],
];
const outfits = [
  ['default', '原装', '✨'], ['casual', '日常便服', '👕'], ['school', '学院风', '🎒'], ['pajama', '睡衣', '🌙'],
  ['goth', '暗黑系', '🖤'], ['fantasy', '幻想服', '🪽'],
];
const parts = [['ears', '耳朵', '🐱'], ['tail', '尾巴', '🦊'], ['ribbon', '装饰物', '🎀'], ['custom', '自定义部件', '➕']];
const motions = [['breathe', '呼吸', '上下轻动'], ['blink', '眨眼', '自然眨眼'], ['drag', '被拖动', '跟随手指'], ['sleep', '睡觉', '蜷缩呼吸'], ['screen', '贴屏爬行', '沿边缘移动'], ['picked', '被抓起', '悬空晃动']];

export function CharAppearanceStudio() {
  const [tab, setTab] = useState<AppearanceTab>('pose');
  const [pose, setPose] = useState('screen_climb');
  const [expression, setExpression] = useState('happy');
  const [outfit, setOutfit] = useState('default');
  const [selectedParts, setSelectedParts] = useState<string[]>(['ears', 'tail']);
  const [motion, setMotion] = useState('screen');
  const [name, setName] = useState('我的 Char');
  const [nickname, setNickname] = useState('小家伙');
  const [tags, setTags] = useState('文艺青年, 夜猫子');
  const [signature, setSignature] = useState('今天也要贴着屏幕陪你。');

  const poseLabel = useMemo(() => poses.find(x => x[0] === pose)?.[2] || pose, [pose]);
  const expressionLabel = useMemo(() => expressions.find(x => x[0] === expression)?.[2] || expression, [expression]);
  const outfitLabel = useMemo(() => outfits.find(x => x[0] === outfit)?.[1] || outfit, [outfit]);

  const tabs: [AppearanceTab, string][] = [
    ['identity', '🪪 身份卡'], ['pose', '🧍 姿势'], ['expression', '😊 表情'], ['outfit', '👕 服装'], ['parts', '🐾 部件'], ['motion', '✨ 动画'],
  ];

  return <section className="appearanceStudio">
    <div className="appearanceStudioHead">
      <div><span className="eyebrow">CHAR · BODY & IDENTITY</span><h2>Char 身体工作室</h2><p>姿势、表情、服装和部件分开管理，最后组合成同一个 Char。</p></div>
      <span className="appearanceStatus">实时预览</span>
    </div>

    <div className="appearanceWorkbench">
      <aside className="appearancePreview">
        <div className={`appearanceStage pose-${pose} expression-${expression}`}>
          <div className="appearancePetPlaceholder">🐾</div>
          {pose.startsWith('screen_') && <div className="screenEdgeHint"><b>📱 贴屏模式</b><small>沿屏幕边缘爬行</small></div>}
          <div className="appearancePreviewTags"><span>{poseLabel}</span><span>{expressionLabel}</span><span>{outfitLabel}</span></div>
        </div>
        <div className="appearanceCurrent"><b>当前组合</b><span>{poseLabel} · {expressionLabel} · {outfitLabel}</span></div>
      </aside>

      <div className="appearanceEditor">
        <nav className="appearanceTabs">{tabs.map(([key, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}</nav>

        {tab === 'identity' && <div className="appearanceForm">
          <label>名字<input value={name} onChange={e => setName(e.target.value)} /></label>
          <label>昵称<input value={nickname} onChange={e => setNickname(e.target.value)} /></label>
          <label>Tag <small>可以自己定义，比如“阴暗逼”“甜妹”“夜猫子”</small><input value={tags} onChange={e => setTags(e.target.value)} /></label>
          <label>个性签名<textarea value={signature} onChange={e => setSignature(e.target.value)} /></label>
          <div className="appearanceHint">User 可以改，Char 也可以通过 MCP 改。这里不设置“公开资料”。</div>
        </div>}

        {tab === 'pose' && <div className="appearanceChoiceGrid">{poses.map(([id, icon, label]) => <button key={id} className={pose === id ? 'selected' : ''} onClick={() => setPose(id)}><b>{icon}</b><span>{label}</span>{id === 'screen_climb' && <small>沿手机边缘爬来爬去</small>}</button>)}</div>}
        {tab === 'expression' && <div className="appearanceChoiceGrid">{expressions.map(([id, icon, label]) => <button key={id} className={expression === id ? 'selected' : ''} onClick={() => setExpression(id)}><b>{icon}</b><span>{label}</span></button>)}</div>}
        {tab === 'outfit' && <div className="appearanceChoiceGrid">{outfits.map(([id, label, icon]) => <button key={id} className={outfit === id ? 'selected' : ''} onClick={() => setOutfit(id)}><b>{icon}</b><span>{label}</span><small>独立服装层</small></button>)}<label className="appearanceUpload">＋ 上传新服装<input hidden type="file" accept="image/png,image/jpeg,image/webp" /></label></div>}
        {tab === 'parts' && <div className="appearanceChoiceGrid">{parts.map(([id, label, icon]) => <button key={id} className={selectedParts.includes(id) ? 'selected' : ''} onClick={() => setSelectedParts(x => x.includes(id) ? x.filter(v => v !== id) : [...x, id])}><b>{icon}</b><span>{label}</span><small>{id === 'ears' || id === 'tail' ? '可互动：摸摸它' : '可扩展'}</small></button>)}</div>}
        {tab === 'motion' && <div className="appearanceChoiceGrid">{motions.map(([id, label, detail]) => <button key={id} className={motion === id ? 'selected' : ''} onClick={() => setMotion(id)}><b>✨</b><span>{label}</span><small>{detail}</small></button>)}</div>}

        <div className="appearanceFooter"><span>💡 最终外观 = 姿势 + 表情 + 服装 + 部件 + 动画</span><button>保存当前组合</button></div>
      </div>
    </div>
  </section>;
}

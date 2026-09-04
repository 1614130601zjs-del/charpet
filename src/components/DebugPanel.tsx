import { useEffect, useState } from 'react';
import { loadPetEventLog, clearPetEventLog, type PetEventLogEntry } from '../bridge/eventLog';
import { createPetEvent, dispatchPetEvent } from '../bridge/semanticEvents';
import type { PetMood } from '../pet/petTypes';

const moods: PetMood[] = ['happy', 'surprised', 'sad', 'angry', 'shy', 'sleep'];

export function DebugPanel() {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<PetEventLogEntry[]>([]);

  useEffect(() => {
    const refresh = () => setEvents(loadPetEventLog());
    refresh();
    window.addEventListener('charpet:event', refresh);
    const key = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === '.') setOpen(v => !v); };
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('charpet:event', refresh); window.removeEventListener('keydown', key); };
  }, []);

  if (!open) return <button className="debugFab" onClick={() => setOpen(true)} aria-label="打开调试面板">⋯</button>;

  const send = (mood: PetMood) => dispatchPetEvent(createPetEvent(mood === 'sleep' ? 'sleep' : 'tap', mood, 0.8, `debug: ${mood}`));

  return <aside className="debugPanel">
    <div className="debugHead"><strong>DEV · Semantic Bridge</strong><button onClick={() => setOpen(false)}>×</button></div>
    <p>快捷键 Ctrl/Cmd + . · 这里可以模拟未来 MCP 推送。</p>
    <div className="debugButtons"><button onClick={() => dispatchPetEvent(createPetEvent('talk', 'happy', 0.8, 'MCP：收到啦！'))}>talk</button><button onClick={() => dispatchPetEvent(createPetEvent('wake', 'happy', 0.8, '醒醒～'))}>wake</button>{moods.map(m => <button key={m} onClick={() => send(m)}>{m}</button>)}</div>
    <div className="debugLog"><div className="debugLogTitle"><span>最近事件</span><button onClick={() => { clearPetEventLog(); setEvents([]); }}>清空</button></div>{events.length === 0 ? <small>还没有事件</small> : events.slice(0, 8).map(e => <div className="debugEvent" key={e.id}><span>{e.action}</span><small>{e.emotion || '—'} · {e.text || '—'}</small></div>)}</div>
  </aside>;
}

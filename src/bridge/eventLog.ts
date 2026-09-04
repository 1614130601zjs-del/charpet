import type { SemanticPetEvent } from '../pet/petTypes';

export const PET_EVENT_LOG_KEY = 'charpet.events.v1';
const MAX_EVENTS = 100;

export type PetEventLogEntry = SemanticPetEvent & { id: string };

export function loadPetEventLog(): PetEventLogEntry[] {
  try {
    const raw = localStorage.getItem(PET_EVENT_LOG_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendPetEventLog(event: SemanticPetEvent) {
  const entry: PetEventLogEntry = {
    ...event,
    id: `${event.timestamp || Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: event.timestamp || Date.now(),
  };
  const next = [entry, ...loadPetEventLog()].slice(0, MAX_EVENTS);
  localStorage.setItem(PET_EVENT_LOG_KEY, JSON.stringify(next));
  return entry;
}

export function clearPetEventLog() {
  localStorage.removeItem(PET_EVENT_LOG_KEY);
}

import type { PetAction, PetMood, SemanticPetEvent } from '../pet/petTypes';

export function createPetEvent(
  action: PetAction,
  emotion: PetMood = 'idle',
  intensity = 1,
  text?: string,
  need?: string,
  context?: Record<string, unknown>,
): SemanticPetEvent {
  return {
    type: 'charpet.event',
    action,
    emotion,
    intensity: Math.max(0, Math.min(1, intensity)),
    text,
    timestamp: Date.now(),
    need,
    context,
  };
}

export function isSemanticPetEvent(value: unknown): value is SemanticPetEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Partial<SemanticPetEvent>;
  return event.type === 'charpet.event' && typeof event.action === 'string';
}

export function dispatchPetEvent(event: SemanticPetEvent) {
  window.dispatchEvent(new CustomEvent<SemanticPetEvent>('charpet:event', { detail: event }));
}

export function subscribePetEvents(listener: (event: SemanticPetEvent) => void) {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<SemanticPetEvent>).detail;
    if (isSemanticPetEvent(detail)) listener(detail);
  };
  window.addEventListener('charpet:event', handler);
  return () => window.removeEventListener('charpet:event', handler);
}

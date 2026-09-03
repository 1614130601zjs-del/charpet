import type { PetAction, PetMood } from './petTypes';

export type PetState = {
  emotion: PetMood;
  action: PetAction;
  intensity: number;
  speech: string;
  updatedAt: number;
};

export type PetRuntimeEvent = {
  action: PetAction;
  emotion?: PetMood;
  intensity?: number;
  text?: string;
};

export function clampIntensity(value = 1) {
  return Math.max(0, Math.min(1, value));
}

export function applyPetEvent(state: PetState, event: PetRuntimeEvent): PetState {
  const intensity = clampIntensity(event.intensity);
  return {
    ...state,
    emotion: event.emotion ?? state.emotion,
    action: event.action,
    intensity,
    speech: event.text ?? state.speech,
    updatedAt: Date.now(),
  };
}

export function nextIdleState(state: PetState): PetState {
  return {
    ...state,
    action: 'idle',
    intensity: 0.35,
    speech: '',
    updatedAt: Date.now(),
  };
}

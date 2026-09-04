import type { PetAction, PetMood, PetPose } from './petTypes';

export type PetState = {
  pose: PetPose;
  emotion: PetMood;
  action: PetAction;
  intensity: number;
  speech: string;
  updatedAt: number;
  lastInteractionAt: number;
  isSleeping: boolean;
};

export type PetRuntimeEvent = {
  action: PetAction;
  emotion?: PetMood;
  pose?: PetPose;
  intensity?: number;
  text?: string;
};

export const PET_SLEEP_AFTER_MS = 18_000;
export const DEFAULT_PET_POSE: PetPose = 'stand';

export function clampIntensity(value = 1) { return Math.max(0, Math.min(1, value)); }

export function applyPetEvent(state: PetState, event: PetRuntimeEvent): PetState {
  const now = Date.now();
  const sleeping = event.action === 'sleep' || event.emotion === 'sleep';
  return {
    ...state,
    pose: event.pose ?? (event.action === 'sleep' ? 'lie' : state.pose),
    emotion: event.emotion ?? state.emotion,
    action: event.action,
    intensity: clampIntensity(event.intensity),
    speech: event.text ?? state.speech,
    updatedAt: now,
    lastInteractionAt: now,
    isSleeping: sleeping,
  };
}

export function nextIdleState(state: PetState): PetState {
  return { ...state, action: 'idle', pose: state.isSleeping ? 'lie' : state.pose, emotion: state.isSleeping ? 'idle' : state.emotion === 'sleep' ? 'idle' : state.emotion, intensity: 0.35, speech: '', updatedAt: Date.now(), isSleeping: false };
}

export function shouldSleep(state: Pick<PetState, 'lastInteractionAt' | 'isSleeping'>, now = Date.now()) {
  return !state.isSleeping && now - state.lastInteractionAt >= PET_SLEEP_AFTER_MS;
}

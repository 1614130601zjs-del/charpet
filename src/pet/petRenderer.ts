import type { PetAction, PetMood } from './petTypes';
import type { PetState } from './petRuntime';

export type PetMotion = {
  className: string;
  durationMs: number;
  loop: boolean;
};

export function getPetMotion(
  state: Pick<PetState, 'action' | 'emotion'>,
): PetMotion {
  if (state.action === 'talk') {
    return { className: 'action-talk', durationMs: 450, loop: true };
  }
  if (state.action === 'drag') {
    return { className: 'action-drag', durationMs: 0, loop: false };
  }
  if (state.action === 'sleep') {
    return { className: 'emotion-sleep', durationMs: 1800, loop: true };
  }
  if (state.action === 'wake') {
    return { className: 'emotion-wake', durationMs: 650, loop: false };
  }
  if (state.emotion === 'happy') {
    return { className: 'emotion-happy', durationMs: 900, loop: false };
  }
  if (state.emotion === 'surprised') {
    return { className: 'emotion-surprised', durationMs: 900, loop: false };
  }
  if (state.emotion === 'sad') {
    return { className: 'emotion-sad', durationMs: 1000, loop: false };
  }
  if (state.emotion === 'angry') {
    return { className: 'emotion-angry', durationMs: 500, loop: false };
  }
  if (state.emotion === 'shy') {
    return { className: 'emotion-shy', durationMs: 900, loop: false };
  }
  return { className: 'emotion-idle', durationMs: 3000, loop: true };
}

export function motionScale(
  state: Pick<PetState, 'intensity'>,
): number {
  return 0.96 + Math.max(0, Math.min(1, state.intensity)) * 0.04;
}

export function isInteractiveAction(action: PetAction): boolean {
  return action === 'tap' || action === 'drag';
}

export function normalizeMood(mood: PetMood | undefined): PetMood {
  return mood ?? 'idle';
}

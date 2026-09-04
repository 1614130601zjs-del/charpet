import type { PetAction, PetMood, PetPose } from './petTypes';
import type { PetState } from './petRuntime';

export type PetMotion = { className: string; durationMs: number; loop: boolean };

export function getPetMotion(state: Pick<PetState, 'action' | 'emotion' | 'pose'>): PetMotion {
  if (state.action === 'talk') return { className: `pose-${state.pose} action-talk`, durationMs: 450, loop: true };
  if (state.action === 'drag') return { className: `pose-${state.pose} action-drag`, durationMs: 0, loop: false };
  if (state.action === 'sleep' || state.emotion === 'sleep') return { className: 'pose-lie emotion-sleep', durationMs: 1800, loop: true };
  if (state.action === 'wake') return { className: `pose-${state.pose} emotion-wake`, durationMs: 650, loop: false };
  if (state.emotion === 'happy') return { className: `pose-${state.pose} emotion-happy`, durationMs: 900, loop: false };
  if (state.emotion === 'surprised') return { className: `pose-${state.pose} emotion-surprised`, durationMs: 900, loop: false };
  if (state.emotion === 'sad') return { className: `pose-${state.pose} emotion-sad`, durationMs: 1000, loop: false };
  if (state.emotion === 'angry') return { className: `pose-${state.pose} emotion-angry`, durationMs: 500, loop: false };
  if (state.emotion === 'shy') return { className: `pose-${state.pose} emotion-shy`, durationMs: 900, loop: false };
  return { className: `pose-${state.pose} emotion-idle`, durationMs: 3000, loop: true };
}

export function motionScale(state: Pick<PetState, 'intensity'>): number { return 0.96 + Math.max(0, Math.min(1, state.intensity)) * 0.04; }
export function isInteractiveAction(action: PetAction): boolean { return action === 'tap' || action === 'drag'; }
export function normalizeMood(mood: PetMood | undefined): PetMood { return mood ?? 'idle'; }
export function normalizePose(pose: PetPose | undefined): PetPose { return pose ?? 'stand'; }

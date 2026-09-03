export type PetMood = 'idle' | 'happy' | 'surprised' | 'sad' | 'angry' | 'shy' | 'sleep';

export type PetAction =
  | 'idle'
  | 'talk'
  | 'tap'
  | 'drag'
  | 'sleep'
  | 'wake';

export type SemanticPetEvent = {
  type: 'charpet.event';
  action: PetAction;
  emotion?: PetMood;
  intensity?: number;
  text?: string;
  timestamp?: number;
};

export type PetStats = {
  interactions: number;
  affection: number;
  lastSeenAt: number;
};

export type PetRecord = {
  id: string;
  name: string;
  image: string;
  source: 'upload' | 'creator';
  createdAt: number;
  creatorState?: unknown;
  stats?: PetStats;
};
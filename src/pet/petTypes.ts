export type PetMood = 'idle' | 'happy' | 'surprised' | 'sad' | 'angry' | 'shy' | 'sleep';

export type PetAction = 'idle' | 'talk' | 'tap' | 'drag' | 'sleep' | 'wake' | 'need' | 'outing' | 'story';

export type SemanticPetEvent = {
  type: 'charpet.event';
  action: PetAction;
  emotion?: PetMood;
  intensity?: number;
  text?: string;
  timestamp?: number;
  need?: string;
  context?: Record<string, unknown>;
};

export type PetStats = { interactions: number; affection: number; lastSeenAt: number };
export type PetNeeds = { hunger: number; energy: number; mood: number };
export type RelationshipStat = { key: string; label: string; value: number; min: number; max: number };

export type CharAssets = {
  idle?: string; talk?: string; tap?: string; drag?: string; sleep?: string; wake?: string;
  happy?: string; sad?: string; angry?: string; surprised?: string; shy?: string;
  hungry?: string; eat?: string; lonely?: string;
  [key: string]: string | undefined;
};

export type DiaryEntry = { id: string; createdAt: number; title?: string; text: string; mood?: PetMood; source?: 'ai' | 'user' | 'story' };
export type TimelineEntry = { id: string; createdAt: number; type: 'interaction' | 'story' | 'state' | 'diary' | 'system' | 'outing'; title: string; detail?: string; effects?: Record<string, number> };

export type PetRecord = {
  id: string;
  name: string;
  image: string;
  source: 'upload' | 'creator';
  createdAt: number;
  creatorState?: unknown;
  assets?: CharAssets;
  userTitle?: string;
  era?: string;
  profile?: { tone?: string; personality?: string[]; worldbookSummary?: string; syncedAt?: number };
  relationship?: RelationshipStat[];
  needs?: PetNeeds;
  timeline?: TimelineEntry[];
  diary?: DiaryEntry[];
  memories?: TimelineEntry[];
  stats?: PetStats;
};
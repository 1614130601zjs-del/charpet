export type PetMood = 'idle' | 'happy' | 'surprised' | 'sad' | 'angry' | 'shy' | 'sleep';
export type PetPose = 'stand' | 'sit' | 'lie' | 'crouch' | 'walk' | 'hang' | 'custom';
export type PetAction = 'idle' | 'talk' | 'tap' | 'drag' | 'sleep' | 'wake' | 'need' | 'outing' | 'story' | 'pet' | 'grab';

export type SemanticPetEvent = { type: 'charpet.event'; action: PetAction; emotion?: PetMood; pose?: PetPose; intensity?: number; text?: string; timestamp?: number; need?: string; context?: Record<string, unknown> };
export type PetStats = { interactions: number; affection: number; lastSeenAt: number };
export type PetNeeds = { hunger: number; energy: number; mood: number };
export type RelationshipStat = { key: string; label: string; value: number; min: number; max: number };
export type TimelineClassification = 'timeline' | 'not-timeline' | 'unknown';
export type WorldbookEntry = { id: string; title: string; content: string; enabled: boolean; isTimeline?: boolean; classification?: TimelineClassification };

export type CharPoseAssets = { stand?: string; sit?: string; lie?: string; crouch?: string; walk?: string; hang?: string; custom?: string; [key: string]: string | undefined };
export type CharExpressionAssets = { neutral?: string; happy?: string; sad?: string; angry?: string; surprised?: string; shy?: string; sleepy?: string; hungry?: string; lonely?: string; [key: string]: string | undefined };
export type CharPartAssets = { ears?: Record<string, string>; tail?: Record<string, string>; [key: string]: Record<string, string> | undefined };
export type CharAnimationAssets = { breathe?: string; blink?: string; talk?: string; walk?: string; sleep?: string; wake?: string; tap?: string; drag?: string; pet?: string; grab?: string; [key: string]: string | undefined };
export type CharAssets = { avatar?: string; poses?: CharPoseAssets; expressions?: CharExpressionAssets; parts?: CharPartAssets; animations?: CharAnimationAssets; idle?: string; talk?: string; tap?: string; drag?: string; sleep?: string; wake?: string; happy?: string; sad?: string; angry?: string; surprised?: string; shy?: string; hungry?: string; eat?: string; lonely?: string; [key: string]: unknown };

export type CharCardPreferences = { nickname?: string; title?: string; tags?: string[]; signature?: string; templateId?: string; customCss?: string; accentColor?: string };
export type HomeActivityMedia = { kind: 'image' | 'video' | 'animation'; src: string; poster?: string; alt?: string };
export type HomeActivity = { id: string; createdAt: number; title: string; detail?: string; action?: string; itemId?: string; itemName?: string; special?: boolean; media?: HomeActivityMedia[] };
export type DiaryEntry = { id: string; createdAt: number; title?: string; text: string; mood?: PetMood; source?: 'ai' | 'user' | 'story' };
export type TimelineEntry = { id: string; createdAt: number; type: 'interaction' | 'story' | 'state' | 'diary' | 'system' | 'outing'; title: string; detail?: string; effects?: Record<string, number> };

export type PetRecord = {
  id: string; name: string; image: string; source: 'upload' | 'creator'; createdAt: number; creatorState?: unknown;
  assets?: CharAssets; userTitle?: string; era?: string; card?: CharCardPreferences;
  profile?: { description?: string; tone?: string; personality?: string[]; nickname?: string; tags?: string[]; signature?: string; syncedAt?: number };
  worldbook?: WorldbookEntry[]; relationship?: RelationshipStat[]; relationshipText?: string;
  timeline?: TimelineEntry[]; diary?: DiaryEntry[]; memories?: TimelineEntry[]; homeActivities?: HomeActivity[]; stats?: PetStats;
  timelineRecognition?: boolean;
};

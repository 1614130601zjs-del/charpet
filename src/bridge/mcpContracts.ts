import type { DiaryEntry, PetNeeds, PetRecord, PetMood, PetPose, RelationshipStat, TimelineEntry } from '../pet/petTypes';

/** Stable semantic contract between an external AI brain and CharPet's body/life runtime. */
export type CharPetIdentity = { charId: string; version?: string; era?: string };
export type CharPetProfile = { identity: CharPetIdentity; name: string; userTitle?: string; description?: string; tone?: string; personality?: string[]; syncedAt?: number };

/**
 * Things CHAR is allowed to change about its own presentation.
 * Worldbook/world rules/core definition are deliberately absent here.
 */
export type CharPetAppearance = {
  avatar?: string;
  pose?: PetPose;
  emotion?: PetMood;
  outfitId?: string;
  outfitName?: string;
  parts?: Record<string, string>;
};

export type CharPetCardPreference = {
  displayName?: string;
  nickname?: string;
  title?: string;
  tags?: string[];
  signature?: string;
  templateId?: string;
  accentColor?: string;
};

export type CharPetState = {
  identity: CharPetIdentity;
  needs: PetNeeds;
  relationship: RelationshipStat[];
  emotion: PetMood;
  action: string;
  pose: PetPose;
  appearance: CharPetAppearance;
  isSleeping: boolean;
  recentTimeline: TimelineEntry[];
};

/** Desktop-pet actions: CHAR can use these to get U's attention. */
export type CharPetDesktopAction =
  | 'knock'
  | 'peek'
  | 'wave'
  | 'jump'
  | 'run'
  | 'walk'
  | 'sit'
  | 'stand'
  | 'lie'
  | 'crouch'
  | 'hang'
  | 'sleep'
  | 'pet_request'
  | 'feed_request'
  | 'company_request'
  | 'call_user'
  | 'custom';

/** Simple home/furniture interactions. */
export type CharPetHomeAction =
  | 'walk'
  | 'sit'
  | 'lie'
  | 'sleep'
  | 'eat'
  | 'drink'
  | 'read'
  | 'watch'
  | 'play'
  | 'interact'
  | 'custom';

export type CharPetNeedMessage = { type: 'charpet.need'; identity: CharPetIdentity; need: string; intensity: number; text?: string };
export type CharPetEventRequest = { type: 'charpet.event.request'; identity: CharPetIdentity; context: { time?: string; weather?: string; location?: string; needs?: PetNeeds; relationship?: RelationshipStat[]; recentTimeline?: TimelineEntry[]; recentMemories?: TimelineEntry[]; items?: string[]; custom?: Record<string, unknown> } };
export type CharPetStory = { type: 'charpet.story'; identity: CharPetIdentity; id?: string; title: string; text: string; choices?: string[]; effects?: Record<string, number>; stateChanges?: Partial<PetNeeds>; memory?: string; continueFrom?: string };
export type CharPetDiary = { type: 'charpet.diary'; identity: CharPetIdentity; entry: Omit<DiaryEntry, 'source'> & { source?: 'ai' | 'story' } };
export type CharPetTimelineAppend = { type: 'charpet.timeline.append'; identity: CharPetIdentity; entry: Omit<TimelineEntry, 'id' | 'createdAt'> & { id?: string; createdAt?: number } };

export type CharPetDesktopActionRequest = {
  type: 'charpet.desktop.action';
  identity: CharPetIdentity;
  action: CharPetDesktopAction;
  text?: string;
  intensity?: number;
  durationMs?: number;
  position?: { x?: number; y?: number; edge?: 'left' | 'right' | 'top' | 'bottom' };
  appearance?: CharPetAppearance;
};

export type CharPetHomeActionRequest = {
  type: 'charpet.home.action';
  identity: CharPetIdentity;
  action: CharPetHomeAction;
  itemId?: string;
  itemName?: string;
  text?: string;
  durationMs?: number;
};

export type CharPetInteractionRequest = {
  type: 'charpet.interaction';
  identity: CharPetIdentity;
  action: 'message' | 'bubble' | 'request' | 'propose';
  text: string;
};

export type CharPetCardUpdateRequest = {
  type: 'charpet.card.update';
  identity: CharPetIdentity;
  changes: CharPetCardPreference;
};

export type CharPetAppearanceUpdateRequest = {
  type: 'charpet.appearance.set';
  identity: CharPetIdentity;
  appearance: CharPetAppearance;
};

export type CharPetOutfit = {
  id: string;
  name: string;
  assets: { base?: string; overlay?: string; [key: string]: string | undefined };
  tags?: string[];
  unlocked?: boolean;
};

export type CharPetMcpMessage =
  | { type: 'charpet.profile.get'; identity: CharPetIdentity }
  | { type: 'charpet.profile.update'; profile: Partial<CharPetProfile> & { identity: CharPetIdentity } }
  | { type: 'charpet.state.get'; identity: CharPetIdentity }
  | CharPetAppearanceUpdateRequest
  | CharPetCardUpdateRequest
  | CharPetDesktopActionRequest
  | CharPetHomeActionRequest
  | CharPetInteractionRequest
  | { type: 'charpet.outfit.list'; identity: CharPetIdentity }
  | { type: 'charpet.outfit.set'; identity: CharPetIdentity; outfitId: string }
  | CharPetNeedMessage
  | CharPetEventRequest
  | CharPetStory
  | CharPetDiary
  | CharPetTimelineAppend;

export function isCharPetMcpMessage(value: unknown): value is CharPetMcpMessage {
  if (!value || typeof value !== 'object') return false;
  const type = (value as { type?: unknown }).type;
  return typeof type === 'string' && type.startsWith('charpet.');
}

export function buildState(record: PetRecord, emotion: PetMood = 'idle', action = 'idle', isSleeping = false, pose: PetPose = 'stand', appearance: CharPetAppearance = {}): CharPetState {
  return {
    identity: { charId: record.id, version: record.era, era: record.era },
    needs: record.needs || { hunger: 70, energy: 80, mood: 70 },
    relationship: record.relationship || [], emotion, action, pose,
    appearance: { avatar: (record.assets?.avatar as string) || record.image, pose, emotion, ...appearance }, isSleeping,
    recentTimeline: (record.timeline || []).slice(0, 20),
  };
}

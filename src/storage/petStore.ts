import type { PetNeeds, PetRecord, PetStats, RelationshipStat } from '../pet/petTypes';

export const PET_STORAGE_KEY = 'charpet.pets.v2';

const defaultStats = (): PetStats => ({ interactions: 0, affection: 0, lastSeenAt: Date.now() });
const defaultNeeds = (): PetNeeds => ({ hunger: 70, energy: 80, mood: 70 });
const defaultRelationship = (): RelationshipStat[] => [{ key: 'affection', label: '好感度', value: 0, min: 0, max: 100 }];

function normalizePet(pet: PetRecord): PetRecord {
  return {
    ...pet,
    assets: { idle: pet.image, ...(pet.assets || {}) },
    userTitle: pet.userTitle || '主人',
    relationship: pet.relationship?.length ? pet.relationship : defaultRelationship(),
    needs: { ...defaultNeeds(), ...(pet.needs || {}) },
    timeline: Array.isArray(pet.timeline) ? pet.timeline : [],
    diary: Array.isArray(pet.diary) ? pet.diary : [],
    memories: Array.isArray(pet.memories) ? pet.memories : [],
    stats: { ...defaultStats(), ...(pet.stats || {}) },
  };
}

export function loadPetRecords(): PetRecord[] {
  try {
    const raw = localStorage.getItem(PET_STORAGE_KEY) || localStorage.getItem('charpet.pets.v1');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizePet) : [];
  } catch { return []; }
}

export function savePetRecords(records: PetRecord[]) { localStorage.setItem(PET_STORAGE_KEY, JSON.stringify(records)); }
export function upsertPetRecord(records: PetRecord[], next: PetRecord): PetRecord[] { return records.some(p => p.id === next.id) ? records.map(p => p.id === next.id ? normalizePet(next) : p) : [normalizePet(next), ...records]; }

export function touchPetRecord(pet: PetRecord, affectionDelta = 1): PetRecord {
  const stats = { ...defaultStats(), ...(pet.stats || {}) };
  const relationship = (pet.relationship?.length ? pet.relationship : defaultRelationship()).map(r => r.key === 'affection' ? { ...r, value: Math.max(r.min, Math.min(r.max, r.value + affectionDelta)) } : r);
  return normalizePet({ ...pet, relationship, stats: { interactions: stats.interactions + 1, affection: Math.max(0, Math.min(100, stats.affection + affectionDelta)), lastSeenAt: Date.now() } });
}
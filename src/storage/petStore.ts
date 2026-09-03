import type { PetRecord, PetStats } from '../pet/petTypes';

export const PET_STORAGE_KEY = 'charpet.pets.v1';

const defaultStats = (): PetStats => ({ interactions: 0, affection: 0, lastSeenAt: Date.now() });

export function loadPetRecords(): PetRecord[] {
  try {
    const raw = localStorage.getItem(PET_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((pet) => ({ ...pet, stats: { ...defaultStats(), ...(pet?.stats || {}) } }));
  } catch {
    return [];
  }
}

export function savePetRecords(records: PetRecord[]) {
  localStorage.setItem(PET_STORAGE_KEY, JSON.stringify(records));
}

export function upsertPetRecord(records: PetRecord[], next: PetRecord): PetRecord[] {
  const exists = records.some((pet) => pet.id === next.id);
  return exists ? records.map((pet) => (pet.id === next.id ? next : pet)) : [next, ...records];
}

export function touchPetRecord(pet: PetRecord, affectionDelta = 1): PetRecord {
  const stats = { ...defaultStats(), ...(pet.stats || {}) };
  return {
    ...pet,
    stats: {
      interactions: stats.interactions + 1,
      affection: Math.max(0, Math.min(100, stats.affection + affectionDelta)),
      lastSeenAt: Date.now(),
    },
  };
}
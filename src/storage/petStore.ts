import type { PetRecord } from '../pet/petTypes';

export const PET_STORAGE_KEY = 'charpet.pets.v1';

export function loadPetRecords(): PetRecord[] {
  try {
    const raw = localStorage.getItem(PET_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
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

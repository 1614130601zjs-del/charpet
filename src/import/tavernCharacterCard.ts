/** Minimal SillyTavern V2/V3 PNG importer for CharPet. */

export type TavernWorldbookEntry = Record<string, unknown>;
export type TavernCharacterBook = {
  name?: string;
  description?: string;
  entries?: TavernWorldbookEntry[];
  [key: string]: unknown;
};

/** Normalized data used when creating a CharPet character from a Tavern card. */
export type TavernCardImport = {
  format: 'png';
  spec: 'v1' | 'v2' | 'v3';
  name: string;
  description: string;
  personality: string;
  messageExamples: string;
  /** Kept so CharPet does not lose the Tavern opening message during import. */
  firstMessage?: string;
  characterBook?: TavernCharacterBook;
};

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const MAX_CARD_BYTES = 20 * 1024 * 1024;

function ascii(bytes: Uint8Array): string { return new TextDecoder('latin1').decode(bytes); }
function utf8(bytes: Uint8Array): string { return new TextDecoder('utf-8', { fatal: false }).decode(bytes); }
function readU32(bytes: Uint8Array, offset: number): number { return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0); }

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value.replace(/\s+/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function decodePayload(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(utf8(decodeBase64(value)));
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
  } catch { return null; }
}

function normalizeCard(payload: Record<string, unknown>, spec: 'v1' | 'v2' | 'v3'): TavernCardImport {
  const data = payload.data && typeof payload.data === 'object' ? payload.data as Record<string, unknown> : payload;
  const characterBook = data.character_book && typeof data.character_book === 'object' ? data.character_book as TavernCharacterBook : undefined;
  return {
    format: 'png',
    spec,
    name: typeof data.name === 'string' ? data.name : '',
    description: typeof data.description === 'string' ? data.description : '',
    personality: typeof data.personality === 'string' ? data.personality : '',
    messageExamples: typeof data.mes_example === 'string' ? data.mes_example : '',
    firstMessage: typeof data.first_mes === 'string' ? data.first_mes : undefined,
    characterBook,
  };
}

/** Parse a standard Tavern/SillyTavern character-card PNG. */
export function parseTavernCharacterCard(buffer: ArrayBuffer | Uint8Array): TavernCardImport {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.byteLength > MAX_CARD_BYTES) throw new Error('Character card is too large');
  if (bytes.byteLength < 8 || !PNG_SIGNATURE.every((value, index) => bytes[index] === value)) throw new Error('Not a PNG character card');

  let offset = 8;
  let v3: Record<string, unknown> | null = null;
  let v2: Record<string, unknown> | null = null;
  let v1: Record<string, unknown> | null = null;

  while (offset + 12 <= bytes.length) {
    const length = readU32(bytes, offset);
    const type = ascii(bytes.subarray(offset + 4, offset + 8));
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > bytes.length) break;
    const data = bytes.subarray(dataStart, dataEnd);
    if (type === 'tEXt') {
      const split = data.indexOf(0);
      if (split >= 0) {
        const key = ascii(data.subarray(0, split));
        const value = ascii(data.subarray(split + 1));
        if (key === 'ccv3') v3 = decodePayload(value);
        if (key === 'chara') {
          const decoded = decodePayload(value);
          if (decoded) {
            if (decoded.data && typeof decoded.data === 'object') v2 = decoded;
            else v1 = decoded;
          }
        }
      }
    }
    offset = dataEnd + 4;
    if (type === 'IEND') break;
  }

  if (v3) return normalizeCard(v3, 'v3');
  if (v2) return normalizeCard(v2, 'v2');
  if (v1) return normalizeCard(v1, 'v1');
  throw new Error('No Tavern character-card payload found (ccv3/chara PNG text chunk missing)');
}

export function summarizeTavernCharacterCard(card: TavernCardImport) {
  const entries = Array.isArray(card.characterBook?.entries) ? card.characterBook.entries : [];
  return {
    name: card.name,
    spec: card.spec,
    hasDescription: Boolean(card.description),
    hasPersonality: Boolean(card.personality),
    hasMessageExamples: Boolean(card.messageExamples),
    hasFirstMessage: Boolean(card.firstMessage),
    hasWorldbook: Boolean(card.characterBook),
    worldbookEntryCount: entries.length,
  };
}

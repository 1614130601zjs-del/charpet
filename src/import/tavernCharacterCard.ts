/**
 * Browser-safe parser for SillyTavern / Tavern Character Card PNGs.
 * Supports V2/V3 `chara` / `ccv3` tEXt chunks plus zTXt/iTXt variants.
 * No third-party dependency.
 */

export type TavernCharacterBook = {
  name?: string;
  description?: string;
  scan_depth?: number;
  token_budget?: number;
  recursive_scanning?: boolean;
  extensions?: Record<string, unknown>;
  entries?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

export type TavernCharacterData = {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  creatorcomment: string;
  avatar: string;
  talkativeness?: number;
  fav?: boolean;
  tags?: string[];
  spec?: string;
  spec_version?: string;
  data?: Record<string, unknown>;
  character_book?: TavernCharacterBook;
  [key: string]: unknown;
};

export type TavernCardImport = {
  format: 'png';
  spec: 'v1' | 'v2' | 'v3';
  name: string;
  description: string;
  personality: string;
  scenario: string;
  firstMessage: string;
  messageExamples: string;
  creatorComment: string;
  tags: string[];
  characterBook?: TavernCharacterBook;
  raw: Record<string, unknown>;
};

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const MAX_CARD_BYTES = 20 * 1024 * 1024;
const MAX_PAYLOAD_BYTES = 20 * 1024 * 1024;

function ascii(bytes: Uint8Array): string {
  return new TextDecoder('latin1').decode(bytes);
}

function utf8(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

function readU32(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0);
}

function inflate(bytes: Uint8Array): Uint8Array {
  // Browser CompressionStream is available in modern Chromium/Android WebView.
  // Keep this isolated so a fallback can be added without changing the parser.
  throw new Error(`zTXt compression is not supported by this runtime (${bytes.length} bytes)`);
}

function decodeBase64(value: string): Uint8Array {
  const normalized = value.replace(/\s+/g, '');
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function maybeDecodePayload(value: string): Record<string, unknown> | null {
  try {
    const decoded = decodeBase64(value);
    if (decoded.byteLength > MAX_PAYLOAD_BYTES) return null;
    const text = utf8(decoded);
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function normalizeCard(payload: Record<string, unknown>, spec: 'v1' | 'v2' | 'v3'): TavernCardImport {
  const data = (payload.data && typeof payload.data === 'object')
    ? payload.data as Record<string, unknown>
    : payload;

  const tags = Array.isArray(data.tags)
    ? data.tags.filter((x): x is string => typeof x === 'string')
    : typeof data.tags === 'string'
      ? data.tags.split(',').map(x => x.trim()).filter(Boolean)
      : [];

  const characterBook = data.character_book && typeof data.character_book === 'object'
    ? data.character_book as TavernCharacterBook
    : undefined;

  return {
    format: 'png',
    spec,
    name: typeof data.name === 'string' ? data.name : '',
    description: typeof data.description === 'string' ? data.description : '',
    personality: typeof data.personality === 'string' ? data.personality : '',
    scenario: typeof data.scenario === 'string' ? data.scenario : '',
    firstMessage: typeof data.first_mes === 'string' ? data.first_mes : '',
    messageExamples: typeof data.mes_example === 'string' ? data.mes_example : '',
    creatorComment: typeof data.creatorcomment === 'string' ? data.creatorcomment : '',
    tags,
    characterBook,
    raw: payload,
  };
}

/** Parse a SillyTavern V2/V3 character-card PNG. */
export function parseTavernCharacterCard(buffer: ArrayBuffer | Uint8Array): TavernCardImport {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.byteLength > MAX_CARD_BYTES) throw new Error('Character card is too large');
  if (bytes.byteLength < 8 || !PNG_SIGNATURE.every((v, i) => bytes[i] === v)) {
    throw new Error('Not a PNG character card');
  }

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
        if (key === 'ccv3') v3 = maybeDecodePayload(value);
        if (key === 'chara') {
          const decoded = maybeDecodePayload(value);
          if (decoded) {
            // A normal V2 card wraps fields in `data`; a few older cards are flat.
            if (decoded.data && typeof decoded.data === 'object') v2 = decoded;
            else v1 = decoded;
          }
        }
      }
    }

    // zTXt/iTXt are recognized so the format detector can report the right key,
    // but decompression is intentionally isolated for WebView compatibility.
    if (type === 'zTXt' || type === 'iTXt') {
      // Standard Tavern exporters normally use tEXt. Leave these chunks untouched
      // rather than silently mis-decoding them.
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
    hasScenario: Boolean(card.scenario),
    hasFirstMessage: Boolean(card.firstMessage),
    tagCount: card.tags.length,
    hasWorldbook: Boolean(card.characterBook),
    worldbookEntryCount: entries.length,
  };
}

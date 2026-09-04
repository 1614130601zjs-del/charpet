/** Robust SillyTavern V1/V2/V3 PNG character-card importer for CharPet. */

export type TavernWorldbookEntry = Record<string, unknown>;
export type TavernCharacterBook = {
  name?: string;
  description?: string;
  entries?: TavernWorldbookEntry[];
  [key: string]: unknown;
};

export type TavernCardImport = {
  format: 'png';
  spec: 'v1' | 'v2' | 'v3';
  name: string;
  description: string;
  personality: string;
  messageExamples: string;
  firstMessage?: string;
  scenario?: string;
  characterBook?: TavernCharacterBook;
};

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const MAX_CARD_BYTES = 20 * 1024 * 1024;

function ascii(bytes: Uint8Array): string { return new TextDecoder('latin1').decode(bytes); }
function utf8(bytes: Uint8Array): string { return new TextDecoder('utf-8', { fatal: false }).decode(bytes); }
function readU32(bytes: Uint8Array, offset: number): number { return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0); }

function decodeBase64(value: string): Uint8Array {
  const clean = value.replace(/\s+/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function parseJsonText(value: string): Record<string, unknown> | null {
  const text = value.trim();
  const candidates = [text];
  try { candidates.push(utf8(decodeBase64(text))); } catch { /* not base64 */ }
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
    } catch { /* try next representation */ }
  }
  return null;
}

function readTextChunk(type: string, data: Uint8Array): { key: string; value: string } | null {
  if (type === 'tEXt') {
    const split = data.indexOf(0);
    if (split < 0) return null;
    return { key: ascii(data.subarray(0, split)), value: ascii(data.subarray(split + 1)) };
  }
  if (type === 'iTXt') {
    let p = data.indexOf(0);
    if (p < 0 || p + 2 >= data.length) return null;
    const key = utf8(data.subarray(0, p));
    const compressionFlag = data[p + 1];
    p += 2;
    const compressionMethod = data[p++];
    if (compressionFlag !== 0 || compressionMethod !== 0) return null;
    const languageEnd = data.indexOf(0, p); if (languageEnd < 0) return null; p = languageEnd + 1;
    const translatedEnd = data.indexOf(0, p); if (translatedEnd < 0) return null; p = translatedEnd + 1;
    return { key, value: utf8(data.subarray(p)) };
  }
  return null;
}

/**
 * A timeline is an age/life-stage/time-line concept, not a relationship label.
 * Title-only detection deliberately recognizes common life-stage names such as 男高/男大,
 * while relationship-only words such as 人妻 are not automatically treated as timelines.
 */
export function looksLikeTimelineTitle(title: string): boolean {
  const t = title.trim().toLowerCase();
  if (!t) return false;
  const relationshipOnly = /^(人妻|恋人|情侣|伴侣|朋友|家人|主从|同事|已婚|未婚|单身|前任|丈夫|妻子|男友|女友)$/i;
  if (relationshipOnly.test(t)) return false;
  return /(男高|女高|高中|男大|女大|大学|大学生|童年|幼年|少年|青年|成年|晚年|学生时代|学生时期|工作后|毕业后|婚后|婚前|五年后|十年后|多年后|过去|现在|未来|初期|中期|后期|阶段|时期|时间线|人生线|年龄|\d+\s*(岁|年级|年后|年前)|\d+\s*years?|\b(day|night|morning|childhood|teen|teenage|adult|future|past|phase|period)\b|\b(high school|college|university)\b)/i.test(t);
}

function normalizeCard(payload: Record<string, unknown>, spec: 'v1' | 'v2' | 'v3'): TavernCardImport {
  const data = payload.data && typeof payload.data === 'object' ? payload.data as Record<string, unknown> : payload;
  const characterBook = data.character_book && typeof data.character_book === 'object' ? data.character_book as TavernCharacterBook : undefined;
  return {
    format: 'png', spec,
    name: typeof data.name === 'string' ? data.name : '',
    description: typeof data.description === 'string' ? data.description : '',
    personality: typeof data.personality === 'string' ? data.personality : '',
    messageExamples: typeof data.mes_example === 'string' ? data.mes_example : '',
    firstMessage: typeof data.first_mes === 'string' ? data.first_mes : undefined,
    scenario: typeof data.scenario === 'string' ? data.scenario : undefined,
    characterBook,
  };
}

/** Parse standard Tavern/SillyTavern character-card PNG metadata. */
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
    const text = readTextChunk(type, data);
    if (text && (text.key === 'ccv3' || text.key === 'chara')) {
      const decoded = parseJsonText(text.value);
      if (decoded) {
        if (text.key === 'ccv3') v3 = decoded;
        else if (decoded.data && typeof decoded.data === 'object') v2 = decoded;
        else v1 = decoded;
      }
    }
    offset = dataEnd + 4;
    if (type === 'IEND') break;
  }

  if (v3) return normalizeCard(v3, 'v3');
  if (v2) return normalizeCard(v2, 'v2');
  if (v1) return normalizeCard(v1, 'v1');
  throw new Error('没有找到酒馆角色卡数据（ccv3/chara）');
}

export function summarizeTavernCharacterCard(card: TavernCardImport) {
  const entries = Array.isArray(card.characterBook?.entries) ? card.characterBook.entries : [];
  const timelineEntries = entries.filter(entry => {
    const title = typeof entry.name === 'string' ? entry.name : typeof entry.title === 'string' ? entry.title : '';
    return looksLikeTimelineTitle(title);
  });
  return {
    name: card.name, spec: card.spec,
    hasDescription: Boolean(card.description), hasPersonality: Boolean(card.personality),
    hasMessageExamples: Boolean(card.messageExamples), hasFirstMessage: Boolean(card.firstMessage),
    hasWorldbook: Boolean(card.characterBook), worldbookEntryCount: entries.length,
    timelineEntryCount: timelineEntries.length,
  };
}

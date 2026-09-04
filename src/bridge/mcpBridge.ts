import type { SemanticPetEvent } from '../pet/petTypes';
import { dispatchPetEvent, isSemanticPetEvent } from './semanticEvents';
import { isCharPetMcpMessage, type CharPetMcpMessage } from './mcpContracts';

export type McpEnvelope = {
  type?: string;
  event?: unknown;
  payload?: unknown;
};

/** Normalize the body-level semantic event used by the UI/runtime. */
export function normalizeMcpMessage(value: unknown): SemanticPetEvent | null {
  if (isSemanticPetEvent(value)) return value;
  if (!value || typeof value !== 'object') return null;
  const message = value as McpEnvelope;
  const candidate = message.event ?? message.payload;
  return isSemanticPetEvent(candidate) ? candidate : null;
}

/**
 * Accept either a semantic body event or a formal CharPet MCP contract.
 * Contract messages are exposed on a dedicated browser event so the app can
 * persist profile/story/diary data without coupling that state to transport.
 */
export function receiveMcpMessage(value: unknown): boolean {
  const event = normalizeMcpMessage(value);
  if (event) {
    dispatchPetEvent(event);
    return true;
  }
  if (!isCharPetMcpMessage(value)) return false;
  window.dispatchEvent(new CustomEvent<CharPetMcpMessage>('charpet:mcp', { detail: value }));
  return true;
}

/** Subscribe to formal MCP messages after transport normalization. */
export function subscribeMcpContracts(listener: (message: CharPetMcpMessage) => void) {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<CharPetMcpMessage>).detail;
    if (isCharPetMcpMessage(detail)) listener(detail);
  };
  window.addEventListener('charpet:mcp', handler);
  return () => window.removeEventListener('charpet:mcp', handler);
}

/** Listen for same-window postMessage events from a future MCP/native bridge. */
export function listenForMcpMessages() {
  const handler = (message: MessageEvent) => {
    if (message.source !== window) return;
    const value = message.data;
    if (isSemanticPetEvent(value) || (value && typeof value === 'object' && ((value as McpEnvelope).type === 'charpet.mcp' || isCharPetMcpMessage(value)))) {
      const payload = (value as McpEnvelope).type === 'charpet.mcp' ? ((value as McpEnvelope).payload ?? (value as McpEnvelope).event) : value;
      receiveMcpMessage(payload);
    }
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}

export function serializePetEvent(event: SemanticPetEvent): string {
  return JSON.stringify(event);
}

export function serializeMcpMessage(message: CharPetMcpMessage): string {
  return JSON.stringify(message);
}

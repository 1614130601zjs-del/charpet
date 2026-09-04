import type { SemanticPetEvent } from '../pet/petTypes';
import { dispatchPetEvent, isSemanticPetEvent } from './semanticEvents';

export type McpEnvelope = {
  type?: string;
  event?: unknown;
  payload?: unknown;
};

/** Normalize an MCP-style message without coupling the UI to a transport. */
export function normalizeMcpMessage(value: unknown): SemanticPetEvent | null {
  if (isSemanticPetEvent(value)) return value;
  if (!value || typeof value !== 'object') return null;

  const message = value as McpEnvelope;
  const candidate = message.event ?? message.payload;
  return isSemanticPetEvent(candidate) ? candidate : null;
}

/** Feed an incoming semantic event into CharPet's local event bus. */
export function receiveMcpMessage(value: unknown): boolean {
  const event = normalizeMcpMessage(value);
  if (!event) return false;
  dispatchPetEvent(event);
  return true;
}

/** Listen for same-window postMessage events from a future MCP/native bridge. */
export function listenForMcpMessages() {
  const handler = (message: MessageEvent) => {
    if (message.source !== window) return;
    const value = message.data;
    if (!isSemanticPetEvent(value) && (!value || typeof value !== 'object' || (value as McpEnvelope).type !== 'charpet.mcp')) return;
    receiveMcpMessage(value);
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}

/** Serialize the semantic contract used by the future MCP transport. */
export function serializePetEvent(event: SemanticPetEvent): string {
  return JSON.stringify(event);
}

# CharPet MCP Relay

CharPet uses semantic events between the upstream brain (小手机 MCP) and the renderer. The relay deliberately does not know character personalities or animation frames.

## Local Termux

```bash
npm install
npm run relay
```

Default listener: `http://127.0.0.1:8787`

Environment variables:

- `CHARPET_RELAY_HOST` — default `127.0.0.1`; use `0.0.0.0` only when another device must reach the relay.
- `CHARPET_RELAY_PORT` — default `8787`.
- `CHARPET_RELAY_TOKEN` — optional bearer token / `x-charpet-token` protection.

## HTTP contract

Publish an event:

```http
POST /event
Content-Type: application/json

{
  "type": "charpet.event",
  "action": "talk",
  "emotion": "happy",
  "intensity": 0.8,
  "text": "过来陪我一下嘛"
}
```

Subscribe from Android or another client with Server-Sent Events:

```text
GET /events
```

Health check:

```text
GET /health
```

Recent events:

```text
GET /history
```

The relay validates the same action/emotion vocabulary as the Android runtime, keeps a small in-memory history, and broadcasts each accepted event to connected clients.

## 小手机 MCP adapter

The relay intentionally accepts a normalized `charpet.event` envelope rather than pretending to know 小手机's private MCP implementation. Once the exact MCP tool/transport is available, its adapter should translate the upstream result into the event above and `POST /event`.

This keeps the dependency one-way:

```text
小手机 MCP
   ↓ adapter
CharPet Relay
   ↓ SSE
Android Overlay
   ↓
local autonomous runtime + renderer
```

Autonomous movement remains local and continues when the relay or upstream is unavailable.

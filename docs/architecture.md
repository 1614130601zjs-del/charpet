# CharPet Architecture

## 1. Brain / Body

CharPet deliberately separates the AI brain from the visible body.

- Brain: 小手机 / SillyTavern, personality, conversation and memory.
- Bridge: MCP or another local semantic-event transport.
- Body: CharPet Runtime, animation and interaction.
- Native shell: Android overlay service when running outside the app.

## 2. Semantic event contract

The bridge should send compact state changes instead of animation frames.

```json
{
  "type": "charpet.event",
  "action": "talk",
  "emotion": "happy",
  "intensity": 0.8,
  "text": "嘿嘿"
}
```

Suggested actions: `idle`, `talk`, `tap`, `drag`, `sleep`, `wake`.

Suggested emotions: `neutral`, `happy`, `sad`, `angry`, `surprised`, `shy`.

## 3. Local-first data

A Pet record keeps the rendered image and optional creator state locally. No account or server is required for the first version.

Later, the native shell can move large assets from LocalStorage to the Android filesystem while keeping the same logical data model.

## 4. Android overlay

The Web runtime cannot directly create a system-level overlay. The Android layer will own:

1. foreground service lifecycle;
2. overlay permission;
3. WindowManager overlay view;
4. touch/drag forwarding;
5. bridge messages between native service and WebView;
6. optional sensors such as battery/time/app state.

The web runtime remains platform-independent.

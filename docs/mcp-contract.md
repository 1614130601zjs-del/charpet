# CharPet MCP / Semantic Event Contract

CharPet keeps the character brain and the pet renderer loosely coupled. The bridge should send semantic events, not animation frames.

## Event shape

```json
{
  "type": "charpet.event",
  "action": "talk",
  "emotion": "happy",
  "intensity": 0.8,
  "text": "嘿嘿～",
  "timestamp": 1760000000000
}
```

### Actions

`idle` · `talk` · `tap` · `drag` · `sleep` · `wake`

### Emotions

`idle` · `happy` · `surprised` · `sad` · `angry` · `shy` · `sleep`

`intensity` is normalized to `0..1`.

## Browser test bridge

The current web app accepts a same-window `postMessage` event. A future MCP/native adapter can forward its parsed event with:

```js
window.postMessage({
  type: 'charpet.mcp',
  event: {
    type: 'charpet.event',
    action: 'talk',
    emotion: 'happy',
    intensity: 0.8,
    text: '收到啦！'
  }
});
```

Only messages from the same window are accepted by the browser adapter. The native Android bridge can later call the same semantic event bus directly.

## Design rule

MCP describes **what happened**. The renderer decides **how it moves**. This keeps the protocol small and lets Android/Web renderers evolve independently.

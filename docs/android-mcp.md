# CharPet Android · Semantic Event Ingress

Android 桌宠只负责“身体”和渲染，不把 MCP server 塞进悬浮窗服务里。

推荐链路：

```text
SillyTavern / MCP bridge
        │
        │ charpet.event
        ▼
Android ACTION_EVENT
        │
        ▼
OverlayService
        │
        ▼
WebView renderer
```

## Canonical event

所有入口最终都归一成下面的事件：

```json
{
  "type": "charpet.event",
  "action": "talk",
  "emotion": "happy",
  "intensity": 0.8,
  "text": "Android 收到啦！",
  "timestamp": 1788500000000
}
```

### action

- `idle`：回到待机
- `talk`：说话
- `tap`：被点击/触摸
- `drag`：拖拽
- `sleep`：进入睡眠
- `wake`：醒来

### emotion

- `idle`
- `happy`
- `sad`
- `angry`
- `surprised`
- `shy`
- `sleep`

`intensity` 范围是 `0..1`。Android 会拒绝未知 action、emotion 或越界 intensity，并重新序列化成 canonical JSON 后再交给 renderer。

## Android 入口

当前原生入口是：

- action：`com.charpet.app.ACTION_EVENT`
- extra：`com.charpet.app.EXTRA_EVENT_JSON`

也就是说，外部 bridge 不需要知道动画 CSS、SVG 或帧动画，只需要发送一个 semantic event JSON。OverlayService 会校验并转发 canonical event。

## WebView bridge

OverlayService 使用 `https://charpet.local` 作为固定 origin，并优先使用 `addWebMessageListener`；旧 WebView 再回退到 `WebMessageChannel`。这让 native ↔ renderer 仍然是消息协议，而不是暴露一堆 JavaScript native API。

## MCP 对接原则

MCP 层应该继续放在 SillyTavern/本地 bridge 一侧：

1. Char 的人格、记忆和上下文由 SillyTavern 管理。
2. MCP tool 或 bridge 把“发生了什么”转换成 `charpet.event`。
3. Android 只接收事件并负责显示、动画、触摸和悬浮窗生命周期。
4. 不要从 MCP 直接发送逐帧动画数据。

这样以后换 renderer（Android、桌面 Web、其他客户端）时，MCP 协议不用跟着重写。

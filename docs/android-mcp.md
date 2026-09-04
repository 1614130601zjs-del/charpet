# CharPet Android · MCP 接入

Android 桌宠只负责“身体”和渲染；小手机负责人格、记忆、对话和 MCP 上游能力。

```text
小手机 MCP
    │
    │ MCP Streamable HTTP /mcp
    ▼
CharPet Android MCP transport
    │
    │ charpet.event
    ▼
OverlayService
    │
    ▼
WebView renderer
```

## 支持范围

CharPet 只保留两类 MCP 接入：

1. **本地部署**：MCP server 跑在本机，例如 Termux；本地回环地址可以使用 `http://127.0.0.1:<port>/mcp` 或 `http://localhost:<port>/mcp`。
2. **远程部署**：必须使用 HTTPS，并且 MCP endpoint 必须是标准 `/mcp`，例如 `https://example.com/mcp`。

不再支持或维护：

- `/event`
- `/events`
- 独立 SSE Relay
- 把 SSE 当作 MCP 接入协议

SSE 如果作为 MCP Streamable HTTP 的**响应媒体类型**出现，由 MCP transport 自己解析；它不是另一个 CharPet Relay API。

## Canonical event

MCP 层最终只需要让 CharPet 看见语义事件：

```json
{
  "type": "charpet.event",
  "action": "talk",
  "emotion": "happy",
  "intensity": 0.8,
  "text": "过来陪我一下嘛",
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

`intensity` 范围为 `0..1`。Android 会拒绝未知 action、emotion 或越界 intensity，并重新序列化成 canonical JSON 后再交给 renderer。

## MCP transport

Android 使用 `McpStreamableHttpClient`：

- `POST /mcp`
- `Content-Type: application/json`
- `Accept: application/json, text/event-stream`
- 支持 MCP session id
- 首次连接执行 `initialize`，随后发送 `notifications/initialized`
- JSON-RPC response / notification 中出现 `charpet.event` 时交给 OverlayService
- 不把动画帧塞进 MCP

当前 transport 会校验 endpoint：远程地址必须为 HTTPS；只有 `localhost` / `127.0.0.1` / `::1` 允许本地 HTTP。

## 桌宠自主行为

桌宠自己的呼吸、眨眼、漂浮、沿屏幕边缘移动、随机小动作都在 Android 本地运行。

因此：

> MCP 负责“发生了什么”，CharPet 负责“身体怎么动”。

断开 MCP 后，桌宠仍然可以继续活动，不依赖网络。

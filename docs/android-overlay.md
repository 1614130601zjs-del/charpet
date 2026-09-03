# Android Overlay Handoff

CharPet 的 Web/PWA 版本先负责角色资产、性格状态和本地交互；Android 原生层负责把角色变成真正悬浮在其他 App 上面的桌宠。

## 分工

- **CharPet Studio**：捏人、上传 PNG/WebP、角色库、本地保存、语义事件。
- **MCP / native bridge**：传递低频的语义状态，不传逐帧动画。
- **AI-Live-Overflow**：Android overlay、拖拽、触摸、前台服务、传感器/应用状态感知和 WebView 渲染。

## 事件契约

```json
{
  "type": "charpet.event",
  "action": "talk",
  "emotion": "happy",
  "intensity": 0.8,
  "text": "嘿嘿！",
  "timestamp": 1778000000000
}
```

推荐 action：`idle`、`talk`、`tap`、`drag`、`sleep`、`wake`。

推荐 emotion：`idle`、`happy`、`surprised`、`sad`、`angry`、`shy`、`sleep`。

## Android 第一阶段

1. Android foreground service 持有桌宠生命周期。
2. 使用 `TYPE_APPLICATION_OVERLAY` 创建透明悬浮窗口。
3. WebView 加载 CharPet 的本地构建产物或独立的轻量 renderer。
4. MCP/native bridge 把 JSON 语义事件交给 renderer。
5. renderer 根据 action/emotion/intensity 做呼吸、漂浮、说话、拖拽等程序化动画。
6. 图片和角色状态优先落在设备本地，不要求账号。

## 为什么不传逐帧动画

Brain（小手机 / SillyTavern）只需要告诉 Body“现在在说话、开心程度 0.8”。Body 自己决定怎么动。这样 MCP 接口稳定，也方便未来替换 renderer 或角色素材。

## 当前仓库已经准备好的接口

- `src/pet/petTypes.ts`：事件类型。
- `src/pet/petRuntime.ts`：状态机。
- `src/pet/petRenderer.ts`：动作到 CSS motion 的映射。
- `src/bridge/semanticEvents.ts`：浏览器内事件总线。
- `src/bridge/mcpBridge.ts`：MCP 风格消息的 normalize / receive / serialize 适配层。

> Android overlay 的具体权限和服务实现应在原生工程里完成；Web 端不要假装自己拥有系统级悬浮权限。

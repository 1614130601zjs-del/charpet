# Android Overlay Handoff

CharPet 的 Web/PWA 版本先负责角色资产、性格状态和本地交互；Android 原生层负责把角色变成真正悬浮在其他 App 上面的桌宠。

## 分工

- **CharPet Studio**：捏人、上传 PNG/WebP、角色库、本地保存、语义事件。
- **MCP / native bridge**：传递低频的语义状态，不传逐帧动画。
- **Android Overlay**：悬浮窗、拖拽、前台服务、WebView renderer，以及后续传感器/应用状态接入。

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

## Android 第一阶段已经落地

原生骨架位于 `android/`，包名为 `com.charpet.app`：

- `MainActivity.kt`：检查悬浮窗权限，并启动 overlay service；内置一个 demo 事件按钮。
- `OverlayService.kt`：foreground service + `TYPE_APPLICATION_OVERLAY` + 透明 WebView + 原生 JSON bridge + 拖拽窗口。
- `AndroidManifest.xml`：声明 `SYSTEM_ALERT_WINDOW`、`FOREGROUND_SERVICE`、`FOREGROUND_SERVICE_SPECIAL_USE`，并将服务声明为 `specialUse`。
- WebView 先使用独立的轻量 renderer 占位；下一步再把 Web Studio 的角色图片、状态和 renderer 接进去。

### Android 14 / 15 注意事项

Android 14 起 foreground service 必须声明合适的 service type 和对应权限；当前桌宠没有合适的专用类别，因此第一版使用 `specialUse`，并在 service 上写明桌宠悬浮窗用途。Android 15 对从后台启动 foreground service 的 `SYSTEM_ALERT_WINDOW` 例外进一步收紧：需要已有可见的 `TYPE_APPLICATION_OVERLAY` 窗口。当前启动路径从可见的 `MainActivity` 发起，后续做自启动/后台唤醒时必须重新设计启动顺序。

这套 `specialUse` 声明适合当前自用/侧载开发阶段；如果以后发布到 Google Play，需要按 Play 对 foreground service 的用途披露和审核要求重新检查。

## 为什么不传逐帧动画

Brain（小手机 / SillyTavern）只需要告诉 Body“现在在说话、开心程度 0.8”。Body 自己决定怎么动。这样 MCP 接口稳定，也方便未来替换 renderer 或角色素材。

## 当前仓库接口

- `src/pet/petTypes.ts`：事件类型。
- `src/pet/petRuntime.ts`：状态机。
- `src/pet/petRenderer.ts`：动作到 CSS motion 的映射。
- `src/bridge/semanticEvents.ts`：浏览器内事件总线。
- `src/bridge/mcpBridge.ts`：MCP 风格消息 normalize / receive / serialize。
- `src/bridge/eventLog.ts`：本地事件日志。

> Android overlay 的具体系统权限必须由原生工程完成；Web 端只负责角色、状态与语义协议。

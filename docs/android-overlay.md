# Android Overlay Handoff

CharPet 的 Web/PWA 版本先负责角色资产、性格状态和本地交互；Android 原生层负责把角色变成真正悬浮在其他 App 上面的桌宠。

## 当前链路

```text
Web Studio
  ├─ 捏人 / 上传图片
  ├─ 本地保存
  └─ 导出 .charpet.json
          │
          ▼
Android App
  ├─ 导入角色文件
  ├─ 本地保存到 app filesDir
  └─ OverlayService
          │
          ▼
Android 悬浮桌宠
  └─ WebView renderer
```

## 分工

- **CharPet Studio**：捏人、上传 PNG/WebP、角色库、本地保存、语义事件。
- **MCP / native bridge**：传递低频的语义状态，不传逐帧动画。
- **Android Overlay**：悬浮窗、拖拽、前台服务、WebView renderer，以及后续传感器/应用状态接入。

## 角色文件

Web Studio 的「导出到 Android」会生成 `.charpet.json`：

```json
{
  "version": 1,
  "type": "charpet.pet",
  "name": "我的 Char",
  "image": "data:image/...",
  "source": "creator",
  "creatorState": {},
  "exportedAt": 0
}
```

Android 不把大图片塞进 Intent，而是通过系统文件选择器读取 JSON，再写入应用自己的本地目录。这条路径不需要账号、服务器或云端存储。

## Overlay renderer

`OverlayService` 使用 Android `TYPE_APPLICATION_OVERLAY` 创建透明悬浮层。WebView 只加载应用自己生成的 HTML，并关闭 file/content access。

WebView 与原生层之间使用 `WebMessagePort`：

- native → web：发送 `charpet.event` JSON
- web → native：通过 message port 回传事件
- 不再依赖 `addJavascriptInterface`
- 目标 origin 固定为 `https://charpet.local`

事件仍然遵循项目统一语义协议：

```json
{
  "type": "charpet.event",
  "action": "talk",
  "emotion": "happy",
  "intensity": 0.8,
  "text": "你好呀"
}
```

原则保持不变：**MCP / native bridge 描述发生了什么，renderer 决定具体怎么动。**

## 使用方式

1. 在 Web Studio 里选择或捏好角色。
2. 点击「导出到 Android」。
3. 把生成的 `.charpet.json` 放到 Android 设备。
4. 打开 CharPet Android App →「导入 Web Studio 角色」。
5. 允许悬浮窗权限。
6. 点击「启动桌宠」。

之后可以用测试按钮给桌宠发送 `talk` 事件，验证语义事件到 Android renderer 的链路。

## 事件契约

推荐 action：`idle`、`talk`、`tap`、`drag`、`sleep`、`wake`。

推荐 emotion：`idle`、`happy`、`surprised`、`sad`、`angry`、`shy`、`sleep`。

## Android 14 / 15 注意事项

Android 14 起 foreground service 必须声明合适的 service type 和对应权限；当前桌宠没有合适的专用类别，因此第一版使用 `specialUse`，并在 service 上写明桌宠悬浮窗用途。Android 15 对从后台启动 foreground service 的 `SYSTEM_ALERT_WINDOW` 例外进一步收紧：需要已有可见的 `TYPE_APPLICATION_OVERLAY` 窗口。当前启动路径从可见的 `MainActivity` 发起，后续做自启动/后台唤醒时必须重新设计启动顺序。

这套 `specialUse` 声明适合当前自用/侧载开发阶段；如果以后发布到 Google Play，需要按 Play 对 foreground service 的用途披露和审核要求重新检查。

## 下一步

- 把文件导入升级为 Android Share Sheet 一键发送。
- 将 `creatorState` 直接用于 Android 端 SVG / procedural renderer，而不是只带最终图片。
- 接入真正的 MCP/native event source。
- 增加后台生命周期、开机启动与更完整的拖拽/点击手势。

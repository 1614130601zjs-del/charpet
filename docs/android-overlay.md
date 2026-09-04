# Android Overlay Handoff

CharPet 的 Web/PWA 版本负责角色资产、性格状态和本地交互；Android 原生层负责把角色变成真正悬浮在其他 App 上面的桌宠。

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
  ├─ creatorState → procedural SVG
  └─ semantic event → motion
```

## 角色文件

Web Studio 的「导出到 Android」会生成 `.charpet.json`：

```json
{
  "version": 1,
  "type": "charpet.pet",
  "name": "我的 Char",
  "image": "data:image/...",
  "source": "creator",
  "creatorState": {
    "skin": 0,
    "eyes": 0,
    "mouth": 0,
    "fronthair": 0,
    "earhair": 0,
    "back1": 0,
    "back2": 0,
    "outfit": 0,
    "outer": 0,
    "facemark": 0,
    "accessory": 0
  },
  "exportedAt": 0
}
```

Android 不把大图片塞进 Intent，而是通过系统文件选择器读取 JSON，再写入应用自己的本地目录。这条路径不需要账号、服务器或云端存储。

## CreatorState renderer

Android 新增 `CharPetRenderer.kt`，和 Web Studio 的第一版 NativeCreator 使用相同的基础部件调色板与 11 个部位索引。

- 有 `creatorState`：Android 重新生成 procedural SVG。
- `creatorState.customImage` 存在：直接使用上传图片。
- 没有 `creatorState`：回退到导出文件里的最终 `image`。

因此「捏人」不再只是导出一张死图片；Android 拿到的是可重建的角色状态。

## Overlay renderer

`OverlayService` 使用 Android `TYPE_APPLICATION_OVERLAY` 创建透明悬浮层。WebView 只加载应用自己生成的 HTML，并关闭 file/content access。

WebView 与原生层使用 `WebMessagePort` / `postWebMessage`：

- native → web：发送 `charpet.event` JSON
- web → native：通过 message port 回传
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

启动后 Android 会优先根据 `creatorState` 重建角色；上传图片角色则直接使用图片。

## 事件契约

推荐 action：`idle`、`talk`、`tap`、`drag`、`sleep`、`wake`。

推荐 emotion：`idle`、`happy`、`surprised`、`sad`、`angry`、`shy`、`sleep`。

## Android 14 / 15 注意事项

Android 14 起 foreground service 必须声明合适的 service type 和对应权限；当前桌宠没有更匹配的专用类别，因此第一版使用 `specialUse` 并在 service 上写明桌宠悬浮窗用途。Android 15 对从后台启动 foreground service 的 `SYSTEM_ALERT_WINDOW` 例外进一步收紧，需要已有可见的 `TYPE_APPLICATION_OVERLAY` 窗口。当前启动路径从可见的 `MainActivity` 发起，后续做自启动/后台唤醒时必须重新设计启动顺序。

这套 `specialUse` 声明适合当前自用/侧载开发阶段；如果以后发布到 Google Play，需要按 Play 对 foreground service 的用途披露和审核要求重新检查。

## 下一步

- 将 creatorState 的各部件进一步拆成真正可替换的 Android asset pack。
- 增加眨眼、呼吸、说话口型等 procedural motion。
- 接入真正的 MCP/native event source。
- 增加后台生命周期、开机启动与更完整的拖拽/点击手势。

# CharPet

> 把你的 Char 变成一个真正会待机、会回应、最终可以跑在手机桌面上的小伙伴。

## 当前状态

- V0.3：Web Studio 原型
- 角色来源：SullyOS 捏人器 / 本地图片上传
- 本地角色库：LocalStorage
- 桌面预览：待机漂浮、点击回应、拖拽
- Creator：通过 iframe 接入 SullyOS 捏人器

## 目标架构

```text
小手机 / SillyTavern
        │
        │ MCP / semantic events
        ▼
   CharPet Bridge
        │
        ▼
   CharPet Runtime
   ├─ character state
   ├─ animation state
   ├─ interaction
   └─ sensor events
        │
        ▼
 Android Overlay Pet
```

核心原则：MCP 传“语义状态”，不传逐帧动画。身体负责把 `happy / sad / talk / idle` 等状态转换成动画。

## 开发

```bash
npm install
npm run dev
npm run build
```

## 目录规划

```text
src/
├─ main.tsx
├─ style.css
├─ pet/       # 桌宠状态与渲染
├─ storage/   # 本地角色与配置
└─ bridge/    # MCP / semantic event 协议

docs/
└─ architecture.md
```

## Android

Android 悬浮窗不是普通 Web API 能完成的能力。后续会用 Capacitor + 原生 Android Service / WindowManager 做真正的 overlay；Web 层继续负责角色编辑与状态协议。

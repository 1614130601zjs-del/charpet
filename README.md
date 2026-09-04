# CharPet

> 把你的 Char 变成一个真正会待机、会回应、最终可以跑在手机桌面上的小伙伴。

## 当前状态

- V0.4：Web Studio + Android Overlay 原型
- 角色来源：捏人器 / 本地图片上传
- 本地角色库：LocalStorage / Android 本地存储
- 桌面预览：待机漂浮、点击回应、拖拽、自动移动
- MCP：本地 MCP + HTTPS `/mcp` 接入
- Render：支持一键部署 Web Studio

## 🚀 一键部署到 Render

<a href="https://render.com/deploy?repo=https://github.com/1614130601zjs-del/charpet">
  <img src="https://render.com/images/deploy-to-render-button.svg" alt="Deploy to Render" />
</a>

点上面的紫色 **Deploy to Render**，Render 会读取仓库里的 `render.yaml`，直接创建 Web Studio。

## 目标架构

```text
小手机 MCP
     │
     │ Streamable HTTP /mcp
     ▼
 CharPet MCP Client
     │ semantic charpet.event
     ▼
 CharPet Runtime
 ├─ character state
 ├─ animation state
 ├─ autonomous life
 └─ interaction
     │
     ▼
 Android Overlay Pet
```

核心原则：MCP 传“语义状态”，不传逐帧动画。身体负责把 `happy / sad / talk / idle` 等状态转换成动画；桌宠自己的移动和待机行为不依赖 MCP。

## Render 部署说明

仓库已经包含 `render.yaml`。上面的官方按钮会直接进入 Render 的 Blueprint 部署流程。

部署后的 Web Studio 是静态站点，不需要数据库或账号；角色数据继续保存在浏览器本地。

## 开发

```bash
npm install
npm run dev
npm run build
```

## MCP

正式 MCP 接入只认标准 `/mcp` endpoint：

- 本地：可连接本机 MCP 服务
- 远程：必须使用 `https://.../mcp`
- 不使用 `/event`、`/events` 或自制 SSE Relay 作为正式协议

## 目录

```text
src/
├─ main.tsx
├─ style.css
├─ pet/       # 桌宠状态与渲染
├─ storage/   # 本地角色与配置
└─ bridge/    # MCP / semantic event 协议

docs/
└─ architecture.md

android/     # Android 悬浮桌宠
render.yaml  # Render Blueprint
```

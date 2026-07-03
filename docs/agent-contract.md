# Agent Contract — 后端接入说明

> **给后端 agent 的话：** 这份文档 + `lib/agent.ts` 顶部的注释就是前端留给你的全部上下文。
> 前端的 chat UI、工具调用展示、流式输出都已经按协议做好了 —— 你只需要把 mock 驱动换成真实流，
> **不需要动任何 UI 组件**。改动点全部列在下面，每处代码里也有 `★ BACKEND` 标记（全局搜索即可）。

## 1. Chat 回合协议（核心）

一个 agent 回合（turn）= 若干 **工作步骤**（thinking / 工具调用）+ **流式回复文本**。
UI 的渲染完全由 `AgentTurnEvent` 事件流驱动，类型定义在 `lib/agent.ts`：

```
后端事件                     →  AgentTurnEvent
──────────────────────────────────────────────────────────
开始推理                     →  { type: "step_start", step: { kind: "thinking", label, status: "running" } }
工具调用开始                 →  { type: "step_start", step: { kind: "tool", tool, label, detail?, status: "running" } }
工具调用返回                 →  { type: "step_update", id, patch: { status: "done", detail } }
工具调用失败                 →  { type: "step_update", id, patch: { status: "error", detail } }
文本 token                   →  { type: "text_delta", delta }
回合结束                     →  { type: "turn_done" }
回合失败                     →  { type: "turn_error", message }
```

### 接入步骤

1. **替换驱动**：`lib/agent.ts` 里的 `runMockAgentTurn(userText, emit)` 是唯一要换的函数。
   写一个真实驱动（SSE / WebSocket / fetch-stream 均可），把你的流事件逐条映射成
   `AgentTurnEvent` 调 `emit()`，返回一个 cancel 函数。
2. **事件消费端不用动**：`components/workspace/index.tsx` 的 `applyAgentEvent()`
   把事件应用到最后一条 agent 消息上，UI（`components/workspace/chat.tsx` 的
   `AgentMsg` / `StepRow`）自动渲染 spinner → ✓/✗、可展开的 detail、流式光标。

### UI 依赖的保证（不要破坏）

- 事件按序到达；step 按 append 顺序渲染，不重排。
- `text_delta` 只追加，不回改。
- 每个回合**恰好一个** `turn_done` 或 `turn_error` 结尾。
- `step.id` 在回合内唯一。
- `step.label` 一行以内（用户可见）；`tool` 字段放机器名（如 `search_reference_ads`），
  UI 不展示它，但保留给你做路由/埋点。

### 新增工具时

给 step 一个好的 `label`（如「检索跑量参考」）和 `detail`（参数/结果摘要，展开可见）即可，
前端零改动。工具运行中 UI 显示「正在使用工具 · {label}」。

## 2. 文件上传（目前是本地 object URL 桩）

所有上传交互已接真实文件选择器，但 URL 是 `URL.createObjectURL()`（仅当前会话有效）。
接媒体上传接口时，把「拿到 File → 存 object URL」换成「POST 到上传端点 → 存返回的 CDN URL」，
数据结构不变。改动点：

| 交互 | 位置 | 存储字段 |
|---|---|---|
| 上传实拍素材 / 替换（非 AI 镜头） | `workspace/index.tsx` `setShotAsset()` | `Shot.asset` / `assetUrl` / `assetKind` |
| 添加参考片（概念参考条） | `workspace/index.tsx` `addConceptRef()` | `Concept.refs[]`（`ConceptRef.url` / `kind`） |
| 替换参考（预览弹窗内） | `workspace/index.tsx` `replaceConceptRef()` | 同上，按 `Video.refMeta` 定位 |
| 首帧 / 尾帧 / 参考图 slot | `shot-board.tsx` `ImageInputs` | 目前组件内 state；接后端时应挂到 shot 的生成参数里 |
| 聊天图片 / 视频附件 | `chat.tsx` `filesToAttachments()` | `ChatAttachment.url` |

## 3. 已知边界（接 API 时一并处理）

- 生成状态模型目前是 `done: boolean`（`GenItem` / `ShotVariation`），没有
  queued / running / failed / timeout —— 接真实生成 API 时需要扩展并补失败态 UI。
- 视频预览（`media.tsx` `PreviewModal`）对生成结果仍是静态图 + 假进度条；
  `Video.url` 字段已预留，回填真实 mp4 URL 后改用 `<video>`。
- 会话状态（分镜 / 成片 / 聊天）是全局单例，未按项目隔离，也无持久化。

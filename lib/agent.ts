/* ─────────────────────────────────────────────────────────────────────────────
   Agent chat protocol — the contract between this frontend and the backend agent.

   ★ BACKEND AGENT: READ THIS FIRST (see also docs/agent-contract.md).

   The chat UI renders an agent turn as:
     1. an ordered list of work-trace STEPS (thinking / tool calls), each with a
        live status (running → done | error) and an optional expandable detail;
     2. followed by the reply TEXT, streamed token-by-token.

   The UI is driven purely by `AgentTurnEvent`s applied to the last agent
   message (see `applyAgentEvent` in components/workspace/index.tsx). To wire
   the real backend you only replace `runMockAgentTurn` with a driver that maps
   your stream (SSE / WebSocket / fetch-stream) onto the same events:

     backend event            →  AgentTurnEvent
     ─────────────────────────────────────────────────────────────
     agent starts reasoning   →  { type: "step_start", step: { kind: "thinking", … } }
     tool call begins         →  { type: "step_start", step: { kind: "tool", tool, label, … } }
     tool call returns        →  { type: "step_update", id, patch: { status: "done", detail } }
     tool call fails          →  { type: "step_update", id, patch: { status: "error", detail } }
     text token               →  { type: "text_delta", delta }
     turn complete            →  { type: "turn_done" }
     turn failed              →  { type: "turn_error", message }

   Guarantees the UI relies on (don't break these):
   - Events arrive in order; steps append in order and never reorder.
   - `text_delta` is append-only.
   - Every turn ends with exactly one `turn_done` or `turn_error`.
   - `step.id` is unique within a turn.
   ──────────────────────────────────────────────────────────────────────────── */

export type AgentStepStatus = "running" | "done" | "error";
export type AgentStepKind = "thinking" | "tool";

export type AgentStep = {
  id: string;
  kind: AgentStepKind;
  /** Machine tool name for backend routing, e.g. "search_reference_ads". Unused by thinking steps. */
  tool?: string;
  /** User-facing label, e.g. "检索巨量跑量参考". Keep it short — one line. */
  label: string;
  /** Expandable detail (tool args / result summary). Shown under the row when the user expands it. */
  detail?: string;
  status: AgentStepStatus;
};

export type AgentTurnEvent =
  | { type: "step_start"; step: AgentStep }
  | { type: "step_update"; id: string; patch: Partial<Pick<AgentStep, "status" | "detail" | "label">> }
  | { type: "text_delta"; delta: string }
  | { type: "turn_done" }
  | { type: "turn_error"; message: string };

/* ─────────────────────────────────────────────────────────────────────────────
   Mock driver. Replace this whole function with the real backend stream.
   Returns a cancel function (called if the component unmounts mid-turn).
   ──────────────────────────────────────────────────────────────────────────── */

let turnSeq = 0;

export function runMockAgentTurn(userText: string, emit: (ev: AgentTurnEvent) => void): () => void {
  const timers: ReturnType<typeof setTimeout>[] = [];
  const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
  const tid = (s: string) => `t${turnSeq}-${s}`;
  turnSeq++;

  const wantsGen = /生成|出|剪/.test(userText);
  const reply = wantsGen
    ? "好，已经排上了。我核对了每个镜头选用的候选和模型参数，按当前分镜开始生成 —— 进度在左侧「输出 · 成片」里实时看。生成完我会把新旧版本放在一起给你比。"
    : "已经按你的要求调整了方案：检索了巨量 Q2 同品类的跑量参考，把镜头 2 的连击节奏加密、结尾 CTA 提前了半秒。分镜已更新，直接在左侧看新的镜头序列 →";

  // 1) thinking
  at(200, () => emit({ type: "step_start", step: { id: tid("think"), kind: "thinking", label: "理解需求 · 检查当前分镜上下文", status: "running" } }));
  at(1100, () => emit({ type: "step_update", id: tid("think"), patch: { status: "done" } }));

  // 2) tool: reference search
  at(1200, () => emit({ type: "step_start", step: { id: tid("search"), kind: "tool", tool: "search_reference_ads", label: "检索跑量参考", detail: "巨量引擎 · Q2 · RPG 品类 · 连击钩子", status: "running" } }));
  at(2600, () => emit({ type: "step_update", id: tid("search"), patch: { status: "done", detail: "巨量引擎 · Q2 · RPG 品类 · 连击钩子 → 命中 128 条 Top 素材，CTR 前 5% 结构已提取" } }));

  // 3) tool: storyboard update
  at(2700, () => emit({ type: "step_start", step: { id: tid("board"), kind: "tool", tool: "update_storyboard", label: "更新分镜方案", detail: "镜头 2 · 节奏与提示词", status: "running" } }));
  at(3900, () => emit({ type: "step_update", id: tid("board"), patch: { status: "done", detail: "镜头 2 · 连击节奏 +40%，结尾 CTA 提前 0.5s，提示词已重写" } }));

  // 4) stream the reply text
  const chars = Array.from(reply);
  chars.forEach((ch, i) => at(4100 + i * 22, () => emit({ type: "text_delta", delta: ch })));
  at(4100 + chars.length * 22 + 80, () => emit({ type: "turn_done" }));

  return () => timers.forEach(clearTimeout);
}

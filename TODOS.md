# Gampex Web — TODOs

Prototype of the Gampex creative workspace. This is a **frontend shell with mock
data** (no backend, no real generation). It exists to nail the product flow and IA
before wiring anything real.

## Current state (what works)

- **IA:** 项目 (game + batch, flat low-N list in the collapsible sidebar) is the top
  container. Inside a 项目: two tabs — **生成素材** (create) and **管理投放** (deploy).
- **生成素材 tab:** chat (right rail, collapsible + resizable, spring animation) drives
  分镜方案 (concept cards) → each concept is a **shot-list board** (drag-handle table:
  # · 参考 · 分镜描述 · 元素 · 模型/来源 · 时长) → 生成成片 → generated 素材 stream into
  the library and a global 生成队列.
- **Per-shot control surface (the "steer the generation" answer):** selecting a row
  opens an always-editable inspector — 提示词 textarea is the hero, a compact model
  selector chip, and param chips (格式: 比例/分辨率/时长/音频 · 运镜 toggle-list · 更多)
  that open popovers. A 出 N 条 selector controls how many 成片 per generation (default 1).
  AI fills everything; the user overrides only what they want. This is the
  progressive-disclosure answer to old gap #1.
- **管理投放 tab:** grid of the project's 素材 with select + 批量投放 (button only).
- **Design system:** `DESIGN.md` is the source of truth — Notion-style monochrome
  tokens (no blue accent), a per-element hover/active table, the `Tooltip` primitive
  (never native `title=`), iOS-style segmented controls, parameter IA (prompt primary),
  a **layout-stability rule** (content must never resize its container), and action-
  button order (secondary left, primary right). Delete goes through a confirm modal.
- Stack: Next.js 16 + React 19 + Tailwind v4 + TypeScript. Mock data in `lib/data.ts`
  (MODEL_PARAMS per-model param schema), all UI in `components/workspace.tsx`.
  Placeholder media via picsum.

---

## 生成素材 side — known gaps

### 1. Granular control over generation — ✅ mostly built (UI level)
The prompt / model / params per shot are now surfaced and inline-editable via the
inspector + chip popovers (progressive disclosure: simple by default, popovers for the
rest). Remaining: this is still mock — no real prompt round-trips to an agent, and the
"高级" surface (seed, negative prompt, version) is stubbed in MODEL_PARAMS but not all
wired into popovers. Real-vs-mock parity comes with the backend.

### 2. Multi-element composition (the hard one) — ⛔ not addressed
A real 素材 is almost never one generated clip — it's **multiple image/video elements
edited together** (real gameplay + AI/CG segments + 字幕 + banners, cut on a timeline).
The shot-list board models the *plan* (per-shot), but there's still no way to:
- swap one element, re-time a cut, replace the gameplay clip, or edit 字幕 without
  regenerating the whole asset.
- **Still depends on the generation tech, which is not yet researched.** The UI follows
  the tech here. Research how multi-element assembly works before designing the control
  surface.

### 3. Real final-video viewing + the 生成队列 — ⛔ open, actively being designed
There is still **no real playback** — tiles and the preview modal show a static frame
with a fake play button. Tied to this is the **生成队列 redesign** (live thread):
- Today the queue is a dropdown drawer of concept-level **progress bars** + 查看, which
  ejects to the 投放 tab. It hides the one thing you want — the actual clips.
- Direction discussed: make the queue *be the results* — thumbnail cells that stream in
  (shimmer → thumbnail as each finishes), **hover-to-autoplay**, and an **arrow-through
  lightbox** (←/→ + keyboard) so you can sweep a whole batch fast. Open fork: where it
  lives — bottom filmstrip tray (Runway) vs. dropdown thumbnail grid vs. full-screen
  results overlay. **Needs a product call + real video files.**

---

## 管理投放 side — not built yet (the "AI 投放" half)

Per the SME tool's IA, the deploy half needs:
- **广告组 (ad group):** group 素材 + 定向 + 预算 + 渠道 into a deployable unit. The bridge
  between 素材 and 投放.
- **叉乘 (cross-multiplication):** multiply 素材 × 文案 × 定向 → many ads/广告组 at once,
  with 通配符命名, 拆分规则, 追踪链接.
- Multi-channel campaign config (巨量 / Google UAC / TikTok / AppLovin / …), bid
  strategy (CPI/CPA/ROAS/oCPM), preview & publish.
- To be built "the AI way" (not a 4-step form wizard like the SME tool).

---

## Backend / infra (none yet)

- Real **LLM agent** for the chat (brainstorm → 分镜 → refine).
- Real **分镜 generation** + **video generation** pipeline (base-model orchestration +
  the data/"taste" layer).
- **Gameplay footage sourcing** (research/CP-provided library vs. auto-capture) — the
  feasibility crux of "cut out the 素材师."
- **跑量 outcome capture** — pull 投放 results back so the flywheel can form.
- Auth, persistence (projects/素材/广告组), storage for real media.

---

## Polish / minor

- Self-host the Inter font (currently next/font google fetch intermittently fails →
  falls back; CJK uses system font anyway).
- New-project modal could match Perplexity's (folder-icon picker, 2-step).
- `<img>` → `next/image` where it matters for perf.
- Single big `components/workspace.tsx` (~1.3k lines) — split into per-component files
  as it grows.

# Gampex Web — TODOs

Prototype of the Gampex creative workspace. This is a **frontend shell with mock
data** (no backend, no real generation). It exists to nail the product flow and IA
before wiring anything real.

## Current state (what works)

- **IA:** 项目 (game + batch, flat low-N list in the sidebar) is the top container.
  Inside a 项目: two tabs — **素材** (create) and **投放** (deploy).
- **素材 tab:** chat (right rail, collapsible + resizable, spring animation) drives a
  fluid canvas — 分镜方案 (concept cards with horizontal storyboard shots) → 生成已选
  → generated 素材 stream in inline.
- **投放 tab:** grid of the project's 素材 with select + 批量投放 (button only).
- Centered preview modal, new-project modal, Notion-derived design tokens, Phosphor
  icons, Motion spring animations.
- Stack: Next.js 16 + React 19 + Tailwind v4 + TypeScript. Mock data in `lib/data.ts`,
  all UI in `components/workspace.tsx`. Placeholder media via picsum.

---

## 素材 side — known gaps (the user journey isn't there yet)

### 1. Granular control over generation
Right now generation is a black box. Users will want to see and steer:
- The **提示词 (prompts)** the agent actually used per 素材 / per shot.
- The **models** used (Meshy/Tripo for 3D, Kling/Seedance/Pixverse for video, etc.).
- Generation params (seed, duration, style, version).
- **Open product question:** how much control do we expose? Too little = a black box
  power users distrust; too much = we've rebuilt a node editor and lost the "just
  describe it" magic. Likely a progressive-disclosure answer (simple by default, a
  "高级 / 查看提示词" expander for power users). **Debatable — needs a product call.**

### 2. Multi-element composition (the hard one)
A real 素材 is almost never one generated clip — it's **multiple image/video elements
edited together**: real gameplay footage + AI/CG segments + 字幕 + App Store banners,
cut on a timeline. We currently model a 素材 as a single tile. Missing:
- A way for the user to **control the composition** — swap one element, re-time a cut,
  replace the gameplay clip, edit 字幕 — without regenerating the whole thing.
- **This depends on the generation tech, which is not yet researched.** Open questions:
  - Is the final video assembled by the agent (gameplay + AI segments + overlays) on a
    timeline we can expose? Or is it one opaque render?
  - Per-shot regenerate (already sketched in the preview) vs. a real lightweight editor?
  - How do real gameplay clips get sourced and cut (open risk #1 from the design doc)?
- **Action:** research how multi-element assembly works technically before designing
  the control surface. The UI follows the tech here.

### 3. No real final-video viewing
There is currently **no way to actually watch the generated videos** — tiles and the
preview modal show a static frame with a fake play button. The journey is incomplete
without real playback (play, scrub, fullscreen, compare variants). Needs real video
elements once generation produces real files.

---

## 投放 side — not built yet (the "AI 投放" half)

Per the SME tool's IA, the deploy half needs:
- **广告组 (ad group):** group 素材 + 定向 + 预算 + 渠道 into a deployable unit. This is
  the bridge between 素材 and 投放.
- **叉乘 (cross-multiplication):** multiply 素材 × 文案 × 定向 → many ads/广告组 at once,
  with 通配符命名 (wildcard naming), 拆分规则 (split rules), 追踪链接 (tracking links).
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
- **跑量 outcome capture** — pull投放 results back so the flywheel can form.
- Auth, persistence (projects/素材/广告组), storage for real media.

---

## Polish / minor

- Self-host the Inter font (currently next/font google fetch intermittently fails →
  falls back; CJK uses system font anyway).
- New-project modal could match Perplexity's (folder-icon picker, 2-step).
- Storyboard shot cards: hover/edit affordances, empty states.
- `<img>` → `next/image` where it matters for perf.
- Single big `components/workspace.tsx` — split into per-component files as it grows.

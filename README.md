# Gampex Web

Prototype of the **Gampex** creative workspace — an AI tool that takes a 发行商 / 买量
team from a brief to game UA 素材 (and, later, to 投放).

> **Status:** frontend shell with mock data. No backend, no real generation yet — this
> nails the product flow and IA first. See [`TODOS.md`](./TODOS.md) for what's missing.

## What it does (today)

- **项目** (game + batch) is the top-level container — a flat, low-N list in the sidebar.
- Inside a project, two tabs:
  - **素材** — chat with the agent (right rail) → it proposes 分镜方案 → 生成 → 素材 stream
    into the canvas. Fluid, no fixed steps.
  - **投放** — the project's 素材 in a grid, select → 批量投放 (the deploy half, sketch only).

## Stack

- Next.js 16 (App Router, Turbopack) · React 19 · Tailwind v4 · TypeScript
- [Motion](https://motion.dev) for spring animations · [Phosphor](https://phosphoricons.com) icons
- Design tokens derived from `DESIGN.md` (Notion analysis — warm canvas, Notion blue, Inter)

## Run

```bash
npm install
npm run dev
# http://localhost:3000
```

## Structure

```
app/
  layout.tsx      # Inter font, root layout
  page.tsx        # renders <Workspace/>
  globals.css     # Tailwind v4 + design tokens (@theme)
components/
  workspace.tsx   # the whole app — sidebar, project tabs, chat, canvas, preview modal
lib/
  data.ts         # mock concepts / 素材 / chat messages
```

Design artifacts (mockups, the office-hours design doc) live under
`~/.gstack/projects/Gampex/`.

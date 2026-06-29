# Gampex Web

A **frontend-as-PRD** for the Gampex UA creative tool. This repo is not a product
you can ship and not a backend prototype — it is a clickable, high-fidelity **spec**
that defines, for the product team, exactly what we are building and why. The code is
the product definition. Read this README + click the prototype and you should come
away with one unambiguous picture of the product.

> **Status:** frontend shell with mock data. No backend, no real generation. The
> point is to lock the product flow, the IA, and — above all — the
> **UA-leader↔agent iteration loop** before anyone wires real models. See
> [`TODOS.md`](./TODOS.md) for what's intentionally not built yet.

## Where this sits in Gampex

Gampex is a data + AI infrastructure layer for the full game-making pipeline: base
models generate, and Gampex's **judgment layer** — trained on 显哥's BPO pass/fail/edit
delivery data — decides what's actually shippable and how to fix what isn't. Two
entry wedges: **研发端** (3D asset generation) and **发行端** (UA creative). The
publishing/发行 wedge feeds the data flywheel fastest, because 跑量 (the ad ran and
kept spending) is a same-day pass/fail signal.

**This app is the 发行端 wedge: the UA creative tool.**

- **Customer:** 发行商 (publishers / 买量 shops), concentrated in 深圳/广州 — the
  heaviest creative-volume operations in China. Reached warm through team member
  相钰's boss-level relationships. NOT cold Western indie SMBs.
- **Why we win:** not "AI makes video" (即创 and others do that). We win on (1)
  volume/variance at lower cost now, anchored on **game-character consistency** —
  generations stay on-model across dozens of ads because they're grounded in the
  game's real 3D assets; and (2) cross-publisher **performance prediction** later,
  once 跑量 outcomes flow back. No single 发行商 can build prediction across many
  publishers. Gampex can, by sitting in the middle.

## The core bet of this product: eliminate the 素材师

Today the UA creative chain is: **UA leader** writes/approves a 分镜 (shot-plan) →
**素材师** turns it into actual video using AI models + editing software → the 素材师
**iterates with the UA leader multiple times** until it's right → hands finished 素材
to the **投手** for campaigns.

The 素材师's real value was never pressing "generate." It was the **iteration**:
taking direction, fixing the wrong shot, coming back with a better cut. **Gampex
replaces the 素材师 by letting the UA leader run that exact loop directly with the
agent.** If we only build a generator and a gallery, we haven't replaced the role —
we've relocated its work onto the UA leader. So the iteration loop is the product, not
a feature of it.

## The flow (what the prototype specifies)

A **项目** (game + 批次) is the top-level container — a flat, low-N list in the
sidebar. Inside a project, two tabs: **素材** (create) and **投放** (deploy).

**素材 tab — the create + align loop (this is the load-bearing surface):**

1. **Direct** — the UA leader talks to the agent in the chat rail: the game, the
   channel, the audience, reference creatives ("这两个是跑量参考"). This is how they
   used to brief the 素材师.
2. **Gate 1 · 分镜方案** — the agent proposes N concepts, each a storyboard of shots.
   Every shot is tagged by source: **实拍·素材库** (real gameplay), **参考·你上传**,
   **AI生成**, **CG**, **字幕+角标**. That tagging is deliberate: a real 素材 is
   *composited* from gameplay + AI/CG + overlays, not one opaque render. The UA leader
   edits / kills / approves concepts → triggers generation.
3. **Generate** — the agent cuts gameplay + generates CG (character-consistent) +
   composites overlays + cuts to channel specs, in **batch**.
4. **Gate 2 · iterate until right** — the UA leader reviews and **directs revision**:
   reject a 素材 or a single shot **with a reason** → the agent regenerates against
   that feedback → **old vs revised side-by-side** → approve. Every 素材 carries a
   visible verdict: **采用 / 不用 / 待定** (`use` / `no` / `pending`). This reject/fix
   signal is the richest data we capture and the thing that makes the agent learn the
   UA leader's taste over time. **This loop is the product.**
5. **Approve to 素材库** — kept 素材 are stored, tagged, versioned.

**投放 tab — hand off to campaigns:** the project's approved 素材 in a grid → select →
**批量投放**. This wraps 相钰's existing 投放 system (年消耗 1亿+, already built) — it
does not rebuild a campaign engine. Auto-投放 is a later phase; v1 hands finished 素材
to the 投手.

### The throughput target — this is the product KPI

Today an SMB with one product generates **5–20 素材 per person per day**. Gampex's
target is **100–200 素材 per UA leader per day, with ease** — roughly a 10x jump in
per-person creative throughput. The logic is pure volume: most creatives fail (a real
批次 is 400–600, of which 70–80% get scrapped), so the way you reliably land a winner
is to put far more shots on goal at far lower cost per person.

That number is the binding constraint on Gate 2. If reviewing and iterating a 素材 is
heavy, one UA leader cannot clear 100–200/day — you've just moved the 素材师's work
onto them. So **"the iteration loop must be light" and "10x throughput" are the same
requirement.** Gate 2 must be a fast triage console — keyboard nav,
autoplay-on-hover, bulk approve/reject, surgical per-shot regenerate — not a gallery
you click through one tile at a time. The prototype shows a small set for clarity; the
real spec is triage-at-volume.

## The three surfaces, in priority order

1. **Gate 2 · 素材 review + iterate** (highest risk, build first). The triage +
   iteration console above. Seconds-per-asset-reviewed is the metric every choice
   serves.
2. **素材 tab dashboard** — concepts, generation progress, results, as work the UA
   leader directs rather than a feed they scroll.
3. **Gate 1 · 分镜方案** — the agent's proposed shot-plan, editable inline, with agent
   rationale and (later) competitive-intel context.

## Success metrics

- **Input KPI — throughput:** 100–200 素材 per UA leader per day (vs 5–20/person
  today), with ease. This is what proves we replaced the 素材师 rather than relocating
  the work.
- **Outcome KPI — 跑量率:** of creatives Gampex produces, the % a 发行商 actually
  投放'd AND kept running past day 3. (Vanity metric to ignore: raw creatives
  generated — volume only matters if 跑量率 holds.)
- **v1 win:** one 发行商, one game, where Gampex creatives match or beat their in-house
  ROAS at 10x the per-person throughput, with outcome data captured back into the
  system.

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
  data.ts         # mock concepts / 素材 / chat messages (note: 素材 already carry a
                  #   use/no/pending verdict — Gate 2's job is to make it visible)
```

Design artifacts (mockups, the office-hours design doc) live under
`~/.gstack/projects/Gampex/`. Company strategy and the v1 product spec it derives from
live in the PatOS vault (`Gampex/` — context, design doc, customer interviews).

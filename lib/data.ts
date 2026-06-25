// Mock data for the Gampex workspace. Stands in for the agent's output until
// the real generation backend is wired up.

export type SrcKey = "gp" | "ref" | "ai" | "cg" | "ed";

// Source-type chips. `real` = an actual asset exists at planning time (a frame
// from the gameplay 素材库, or a user-uploaded reference). AI/CG/字幕 do not
// exist yet at planning time, so they render a 待生成 placeholder.
export const SRC: Record<SrcKey, { label: string; color: string; real: boolean }> = {
  gp: { label: "实拍 · 素材库", color: "var(--color-srcgp)", real: true },
  ref: { label: "参考 · 你上传", color: "var(--color-srced)", real: true },
  ai: { label: "AI生成", color: "var(--color-srcai)", real: false },
  cg: { label: "CG", color: "var(--color-srccg)", real: false },
  ed: { label: "字幕+角标", color: "var(--color-srced)", real: false },
};

export type Shot = { no: number; t: string; k: SrcKey; d: string; seed?: string };
export type Concept = {
  n: number;
  title: string;
  short: string;
  sel: boolean;
  tags: string[];
  note?: string;
  shots: Shot[];
};

export const concepts: Concept[] = [
  {
    n: 1,
    title: "连击数字飙升",
    short: "连击",
    sel: true,
    tags: ["巨量", "15s"],
    shots: [
      { no: 1, t: "0–3s", k: "ai", d: "黑屏，剑光劈开画面，连击数 ×1 弹出" },
      { no: 2, t: "3–10s", k: "gp", d: "连招实拍，震屏顿帧，数字飙到 ×99", seed: "c1a" },
      { no: 3, t: "10–13s", k: "cg", d: "大招满屏金光" },
      { no: 4, t: "13–15s", k: "ed", d: "logo + 「立即预约」+ 角标" },
    ],
  },
  {
    n: 2,
    title: "BOSS 团灭开场",
    short: "BOSS",
    sel: true,
    tags: ["巨量", "30s"],
    note: "已按对话补充两段团战实拍镜头（镜头 2、3）",
    shots: [
      { no: 1, t: "0–4s", k: "gp", d: "世界 BOSS 红血暴击实拍特写", seed: "c2a" },
      { no: 2, t: "4–12s", k: "gp", d: "多人团战协作输出，技能轮转", seed: "c2b" },
      { no: 3, t: "12–20s", k: "gp", d: "合体技击杀瞬间", seed: "c2c" },
      { no: 4, t: "20–30s", k: "ed", d: "结算慢镜 + CTA" },
    ],
  },
  {
    n: 3,
    title: "御剑掠云第一视角",
    short: "御剑",
    sel: true,
    tags: ["TikTok", "15s"],
    shots: [
      { no: 1, t: "0–6s", k: "gp", d: "御剑掠过云海第一人称实拍", seed: "c3a" },
      { no: 2, t: "6–12s", k: "cg", d: "穿出云层，世界全景展开" },
      { no: 3, t: "12–15s", k: "ed", d: "「探索星轨」+ 角标" },
    ],
  },
  {
    n: 4,
    title: "抽卡 SSR 时刻",
    short: "抽卡",
    sel: false,
    tags: ["巨量", "15s"],
    shots: [
      { no: 1, t: "0–8s", k: "gp", d: "十连金光 SSR 出货实拍", seed: "c4a" },
      { no: 2, t: "8–15s", k: "ed", d: "「预约领 SSR」CTA" },
    ],
  },
];

export type VideoState = "use" | "no" | "pending";
export type Video = {
  id: string;
  label: string;
  channel: string;
  dur: string;
  seed: string;
  state: VideoState;
};

// Default review set so the 素材预览 stage has content before any generation runs.
function buildReview(): Video[] {
  const out: Video[] = [];
  let i = 0;
  for (const c of concepts.filter((c) => c.sel)) {
    for (let v = 1; v <= 4; v++) {
      const r = i % 5;
      const state: VideoState = r === 0 ? "use" : r === 3 ? "no" : "pending";
      out.push({
        id: `rev-${c.n}-${v}`,
        label: `${c.short} v${v}`,
        channel: c.tags[0],
        dur: c.tags[1] ?? "15s",
        seed: `rev${i}`,
        state,
      });
      i++;
    }
  }
  return out;
}
export const reviewVideos = buildReview();

export type ChatMsg = {
  role: "u" | "a";
  text: string;
  refs?: boolean;
  jump?: { label: string; to: number };
};

export const initialMessages: ChatMsg[] = [
  { role: "u", text: "想给《星轨》做一批主打「连击爽感」的素材，主投巨量，男性 18–24。这两个是跑量参考。", refs: true },
  { role: "a", text: "从「连击数字飙升」「BOSS 团灭」「御剑掠云」几个方向切。要不要我出几个分镜方案给你选？" },
  { role: "u", text: "好，出几个让我选。" },
  { role: "a", text: "出了 4 个方案，右边画布里勾选要做的 →", jump: { label: "① 查看分镜方案", to: 0 } },
  { role: "u", text: "选 1、2、3，生成。" },
  { role: "a", text: "好，每个方案出 4 个变体，后台跑着 →", jump: { label: "② 生成进度", to: 1 } },
  { role: "a", text: "12 个素材生成完成。右边预览挑选，点任意一个可放大播放 →", jump: { label: "③ 预览 · 挑选素材", to: 2 } },
];

export const img = (seed: string, w: number, h: number) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

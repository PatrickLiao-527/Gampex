// Gampex workspace mock data.
// Model (2026-06-28, corrected): each shot = element with a PROVENANCE.
//   - source "ai":     agent generates it and routes to a model → has model + prompt + routing rationale.
//   - source "upload": the user provides the asset → no model, no routing. Just the asset (or a request to upload it).
// Everything visual is AI-generated now (real gameplay footage removed — the bet is AI gen replaces it). Static can be AI or upload; VO is AI.

import type { AgentStep } from "./agent";

export type ElementType = "ai-video" | "static" | "vo";

export const ELEM: Record<ElementType, { label: string; color: string; canGenerate: boolean; canUpload: boolean }> = {
  "ai-video": { label: "AI 视频",      color: "var(--color-srcai)", canGenerate: true,  canUpload: false },
  "static":   { label: "静态图",        color: "var(--color-srccg)", canGenerate: true,  canUpload: true  },
  "vo":       { label: "配音 VO",       color: "var(--color-srcvo)", canGenerate: true,  canUpload: false },
};

// ── Audio globals ──────────────────────────────────────────────────────────
export type AudioGlobal = {
  model: string;
  prompt?: string;
  params?: Record<string, ParamValue>;
};

export const BGM_MODELS = ["Suno v4", "Udio v1.5", "Stable Audio 2.0"];
export const SFX_MODELS = ["ElevenLabs SFX", "Stable Audio 2.0", "自定义上传"];

// ── 字幕模版 ─────────────────────────────────────────────────────────────────
// 短视频 / 买量常用的几种字幕形态。V1 自动给每镜上字幕，用户选一个模版 + 位置。
// accent = 逐字/局部高亮色；bg = 底衬；stroke = 描边（保证画面上可读）。
export type SubtitleTemplate = {
  id: string; name: string; desc: string;
  pos: "top" | "center" | "bottom"; sample: string;
  color: string; size: "xs" | "sm" | "md" | "lg" | "xl"; weight: number;
  stroke?: boolean; italic?: boolean; accent?: string; bg?: string;
};
export const SUBTITLE_TEMPLATES: SubtitleTemplate[] = [
  { id: "classic",  name: "经典底部", desc: "白字黑边，稳妥百搭",       pos: "bottom", sample: "九十九连击", color: "#ffffff", size: "sm", weight: 700, stroke: true },
  { id: "karaoke",  name: "逐字高亮", desc: "卡点逐字亮，短视频最常用",  pos: "bottom", sample: "九十九连击", color: "#ffffff", size: "sm", weight: 700, stroke: true, accent: "#ffd400" },
  { id: "impact",   name: "大字冲击", desc: "超大粗体，钩子 / CTA 用",   pos: "center", sample: "立即预约", color: "#ffd400", size: "xl", weight: 800, stroke: true },
  { id: "variety",  name: "综艺花字", desc: "彩边俏皮，强娱乐感",        pos: "top",    sample: "太爽了",   color: "#ffffff", size: "lg", weight: 800, stroke: true, accent: "#ff3b6b", italic: true },
  { id: "toplabel", name: "顶部标签", desc: "顶部小条，交代品类/信息",    pos: "top",    sample: "国战新版本", color: "#ffffff", size: "xs", weight: 600, bg: "rgba(0,0,0,0.55)" },
  { id: "minimal",  name: "极简无衬", desc: "细白字，干净不抢戏",        pos: "bottom", sample: "九十九连击", color: "#ffffff", size: "sm", weight: 500 },
];
export type SubtitleConfig = { on: boolean; template: string; pos: "top" | "center" | "bottom" };

// Models the agent can route an AI-generated element to. Upload-only elements have none.
export const MODEL_OPTIONS: Record<ElementType, string[]> = {
  "ai-video": ["Seedance 2.0", "Veo 3.1", "Kling 3.0", "Runway Gen-4.5", "Kling 2.6 Pro", "Pika 2.2", "Hailuo 2.3", "Luma Ray 3", "Vidu Q3", "Wan 2.7", "PixVerse V5.6", "HunyuanVideo 1.5"],
  "static":   ["Midjourney v6", "模板引擎", "DALL·E 3", "Flux 1.1 Pro"],
  "vo":       ["Fish Audio", "ElevenLabs", "Bark", "Edge TTS"],
};

export const VO_MODELS = MODEL_OPTIONS["vo"];

// ── Per-model image inputs (2026-07 research) ───────────────────────────────
// 不同视频模型接受的「画面输入」并不一样 —— 首帧 / 尾帧 / 参考图(角色一致性) /
// 关键帧 / 原生音频。这张表决定 ShotCard 里出现哪些图片槽；scalar 参数走 MODEL_PARAMS。
export type ModelInputs = { start: boolean; end: boolean; refs: number; keyframes: number; audio: boolean; note?: string };
export const MODEL_INPUTS: Record<string, ModelInputs> = {
  "Seedance 2.0":     { start: true,  end: true,  refs: 9, keyframes: 0, audio: true,  note: "最多 9 图 + 3 片段 + 3 音频参考；不支持真人脸参考" },
  "Veo 3.1":          { start: true,  end: true,  refs: 3, keyframes: 0, audio: true,  note: "首尾帧 / 参考生视频为不同模式，择一" },
  "Kling 3.0":        { start: true,  end: true,  refs: 1, keyframes: 0, audio: true,  note: "首尾帧与运镜 / 元素参考 / 多镜互斥；设首尾帧时比例参数失效" },
  "Kling 2.6 Pro":    { start: true,  end: true,  refs: 1, keyframes: 0, audio: true },
  "Runway Gen-4.5":   { start: true,  end: false, refs: 3, keyframes: 0, audio: false, note: "无原生音频；尾帧靠「续接」实现" },
  "Pika 2.2":         { start: false, end: false, refs: 3, keyframes: 5, audio: false, note: "Pikaframes 最多 5 关键帧，每段单独 prompt 与时长" },
  "Hailuo 2.3":       { start: true,  end: false, refs: 1, keyframes: 0, audio: false, note: "主体参考（角色一致性）" },
  "Luma Ray 3":       { start: true,  end: true,  refs: 0, keyframes: 0, audio: false, note: "首尾关键帧；原生 16-bit HDR；支持视频改视频" },
  "Vidu Q3":          { start: true,  end: true,  refs: 7, keyframes: 0, audio: true,  note: "参考生视频最多 7 图；16s 原生音频" },
  "Wan 2.7":          { start: true,  end: true,  refs: 9, keyframes: 0, audio: true,  note: "首尾帧 + 九宫格（9 图）参考" },
  "PixVerse V5.6":    { start: true,  end: true,  refs: 1, keyframes: 0, audio: true,  note: "音画同步 + 口型" },
  "HunyuanVideo 1.5": { start: true,  end: false, refs: 0, keyframes: 0, audio: false, note: "开源轻量，首帧图生视频" },
};

// ── Per-model generation parameters ─────────────────────────────────────────
// Each AI model exposes a different set of inputs (resolution, camera move, motion strength, voice…).
// We give every supported param a slot and the simplest control to edit it. Values are representative
// of each vendor's public options (Kling / Seedance / Pixverse / Runway / Pika / Fish Audio …) and
// are easy to correct as their APIs change — the schema, not the exact enums, is the durable part.
export type ParamControl = "segmented" | "select" | "slider" | "toggle" | "number" | "text";
export type ParamValue = string | number | boolean;
export type ParamSpec = {
  key: string;
  label: string;                                   // plain Chinese, what the knob does
  control: ParamControl;
  options?: { value: string; label: string }[];    // segmented / select
  min?: number; max?: number; step?: number; unit?: string;  // slider / number
  default: ParamValue;
  hint?: string;
};

const P_ASPECT = (def = "9:16"): ParamSpec => ({ key: "aspect", label: "比例", control: "segmented", options: [
  { value: "Auto", label: "Auto" }, { value: "16:9", label: "16:9" }, { value: "4:3", label: "4:3" }, { value: "1:1", label: "1:1" },
  { value: "3:4", label: "3:4" }, { value: "9:16", label: "9:16" }, { value: "21:9", label: "21:9" },
], default: def });
const P_DUR = (max = 10, def = 5): ParamSpec => ({ key: "duration", label: "生成时长", control: "slider", min: 1, max, step: 1, unit: "s", default: def });
const P_CAMERA: ParamSpec = { key: "camera", label: "运镜", control: "select", options: [
  { value: "固定", label: "固定镜头" }, { value: "推进", label: "推进 Push-in" }, { value: "拉远", label: "拉远 Pull-out" },
  { value: "摇移", label: "摇移 Pan" }, { value: "跟随", label: "跟随 Follow" }, { value: "环绕", label: "环绕 Orbit" }, { value: "升降", label: "升降 Crane" },
], default: "固定" };
const P_NEG: ParamSpec = { key: "negative", label: "反向提示词", control: "text", default: "", hint: "不希望出现的元素，留空即可" };
const P_SEED: ParamSpec = { key: "seed", label: "种子", control: "number", min: 0, max: 999999, step: 1, default: 0, hint: "0 = 每次随机" };
const P_RES = (def = "1080P"): ParamSpec => ({ key: "resolution", label: "清晰度", control: "segmented", options: ["720P", "1080P"].map((v) => ({ value: v, label: v })), default: def });
const P_AUDIO: ParamSpec = { key: "audio", label: "生成音频", control: "toggle", default: false, hint: "由模型同步生成音效 / 配乐" };

export const MODEL_PARAMS: Record<string, ParamSpec[]> = {
  // ── 视频模型（2026-07 当前版本；画面输入差异见 MODEL_INPUTS）──
  "Seedance 2.0": [
    P_ASPECT("9:16"),
    { key: "resolution", label: "分辨率", control: "segmented", options: [{ value: "480P", label: "480P" }, { value: "720P", label: "720P" }, { value: "1080P", label: "1080P" }], default: "1080P" },
    P_DUR(10, 5),
    { key: "tier", label: "档位", control: "segmented", options: [{ value: "极速", label: "极速" }, { value: "专业", label: "专业" }], default: "极速", hint: "极速便宜快，专业质量更高" },
    { ...P_AUDIO, default: true }, P_SEED, P_NEG,
  ],
  "Veo 3.1": [
    P_ASPECT("16:9"), P_RES("1080P"),
    { key: "duration", label: "生成时长", control: "slider", min: 4, max: 8, step: 1, unit: "s", default: 8 },
    { key: "tier", label: "档位", control: "segmented", options: [{ value: "标准", label: "标准" }, { value: "极速", label: "极速 Fast" }], default: "标准" },
    { ...P_AUDIO, default: true }, P_NEG,
  ],
  "Kling 3.0": [
    P_ASPECT("9:16"),
    { key: "resolution", label: "清晰度", control: "segmented", options: [{ value: "720P", label: "720P" }, { value: "1080P", label: "1080P" }, { value: "4K", label: "4K" }], default: "1080P" },
    { key: "duration", label: "生成时长", control: "slider", min: 3, max: 15, step: 1, unit: "s", default: 5 },
    { key: "mode", label: "生成模式", control: "segmented", options: [{ value: "标准", label: "标准" }, { value: "专业", label: "专业" }], default: "专业" },
    { ...P_AUDIO, default: true, hint: "3.0 Omni 原生音频 + 多语言口型" },
    { key: "creativity", label: "创意度", control: "slider", min: 0, max: 1, step: 0.05, default: 0.5, hint: "越高越自由，越低越贴提示词" },
    P_NEG,
  ],
  "Kling 2.6 Pro": [
    P_ASPECT("9:16"), P_RES("1080P"),
    { key: "duration", label: "生成时长", control: "slider", min: 5, max: 10, step: 5, unit: "s", default: 5 },
    { key: "mode", label: "生成模式", control: "segmented", options: [{ value: "标准", label: "标准" }, { value: "专业", label: "专业" }], default: "专业" },
    P_AUDIO, P_SEED, P_NEG,
  ],
  "Runway Gen-4.5": [
    P_ASPECT("16:9"), P_RES("720P"),
    { key: "duration", label: "生成时长", control: "slider", min: 2, max: 10, step: 1, unit: "s", default: 5 },
    { key: "fps", label: "帧率", control: "segmented", options: [{ value: "24", label: "24" }, { value: "25", label: "25" }], default: "24", unit: "fps" },
    P_SEED, P_NEG,
  ],
  "Pika 2.2": [
    P_ASPECT("9:16"), P_RES("1080P"), P_DUR(10, 5),
    { key: "motion", label: "运动强度", control: "slider", min: 0, max: 4, step: 1, default: 2, hint: "0 静止 → 4 强烈运动" },
    P_SEED, P_NEG,
  ],
  "Hailuo 2.3": [
    P_ASPECT("9:16"), P_RES("1080P"),
    { key: "duration", label: "生成时长", control: "slider", min: 6, max: 10, step: 4, unit: "s", default: 6, hint: "1080P 暂不支持 10s" },
    { key: "motion", label: "运动幅度", control: "slider", min: 0, max: 1, step: 0.05, default: 0.6, hint: "越高动作越大" },
    P_NEG,
  ],
  "Luma Ray 3": [
    P_ASPECT("16:9"), P_RES("1080P"), P_DUR(10, 5),
    { key: "hdr", label: "HDR", control: "toggle", default: true, hint: "原生 16-bit HDR 输出" },
    { key: "loop", label: "循环", control: "toggle", default: false, hint: "首尾衔接成无缝循环" },
    P_SEED, P_NEG,
  ],
  "Vidu Q3": [
    P_ASPECT("9:16"), P_RES("1080P"),
    { key: "duration", label: "生成时长", control: "slider", min: 4, max: 16, step: 4, unit: "s", default: 8, hint: "最长 16s" },
    { ...P_AUDIO, default: true }, P_SEED, P_NEG,
  ],
  "Wan 2.7": [
    P_ASPECT("9:16"), P_RES("1080P"),
    { key: "duration", label: "生成时长", control: "slider", min: 5, max: 15, step: 5, unit: "s", default: 5 },
    { key: "mode", label: "生成模式", control: "segmented", options: [{ value: "快速", label: "快速" }, { value: "高质", label: "高质" }], default: "高质" },
    P_AUDIO, P_SEED, P_NEG,
  ],
  "PixVerse V5.6": [
    { key: "resolution", label: "分辨率", control: "segmented", options: [{ value: "360P", label: "360P" }, { value: "540P", label: "540P" }, { value: "720P", label: "720P" }, { value: "1080P", label: "1080P" }], default: "720P" },
    P_ASPECT("9:16"), P_DUR(8, 5),
    { key: "motionmode", label: "运动模式", control: "segmented", options: [{ value: "普通", label: "普通" }, { value: "高性能", label: "高性能" }], default: "普通" },
    { key: "style", label: "风格", control: "select", options: [{ value: "无", label: "无" }, { value: "动漫", label: "动漫" }, { value: "3D", label: "3D" }, { value: "赛博朋克", label: "赛博朋克" }, { value: "黏土", label: "黏土" }], default: "无" },
    { ...P_AUDIO, default: true }, P_SEED, P_NEG,
  ],
  "HunyuanVideo 1.5": [
    P_ASPECT("9:16"), P_RES("720P"), P_DUR(10, 5),
    { key: "steps", label: "采样步数", control: "slider", min: 20, max: 50, step: 1, default: 30 },
    P_SEED, P_NEG,
  ],
  // ── 静态图模型 ──
  "Midjourney v6": [
    P_ASPECT("9:16"),
    { key: "stylize", label: "风格化", control: "slider", min: 0, max: 1000, step: 50, default: 100, hint: "越高越偏艺术化" },
    { key: "quality", label: "质量", control: "segmented", options: [{ value: "0.25", label: "草稿" }, { value: "0.5", label: "标准" }, { value: "1", label: "精细" }], default: "1" },
    P_SEED,
  ],
  "模板引擎": [
    { key: "template", label: "模板", control: "select", options: [{ value: "预约高亮", label: "预约高亮" }, { value: "下载引导", label: "下载引导" }, { value: "榜单结算", label: "榜单结算" }, { value: "角色立绘", label: "角色立绘" }], default: "预约高亮" },
    { key: "brandcolor", label: "品牌主色", control: "select", options: [{ value: "金色", label: "金色 #FFD700" }, { value: "红色", label: "红色 #E4393C" }, { value: "蓝色", label: "蓝色 #0075DE" }, { value: "紫色", label: "紫色 #7B3FF2" }], default: "金色" },
    { key: "badge", label: "渠道角标", control: "toggle", default: true, hint: "右下角投放平台角标" },
    P_ASPECT("9:16"),
  ],
  "DALL·E 3": [
    { key: "aspect", label: "画面比例", control: "segmented", options: [{ value: "1:1", label: "1:1" }, { value: "16:9", label: "16:9" }, { value: "9:16", label: "9:16" }], default: "9:16" },
    { key: "style", label: "风格", control: "segmented", options: [{ value: "生动", label: "生动" }, { value: "自然", label: "自然" }], default: "生动" },
    { key: "quality", label: "质量", control: "segmented", options: [{ value: "标准", label: "标准" }, { value: "高清", label: "高清" }], default: "高清" },
  ],
  "Flux 1.1 Pro": [
    P_ASPECT("9:16"),
    { key: "steps", label: "采样步数", control: "slider", min: 10, max: 50, step: 1, default: 28 },
    { key: "guidance", label: "引导强度", control: "slider", min: 1, max: 10, step: 0.5, default: 3.5 },
    P_SEED,
  ],
  // ── 配音模型 ──
  "Fish Audio": [
    { key: "voice", label: "音色", control: "select", options: [{ value: "热血男声", label: "热血男声" }, { value: "沉稳男声", label: "沉稳男声" }, { value: "清亮女声", label: "清亮女声" }, { value: "少年音", label: "少年音" }], default: "热血男声" },
    { key: "speed", label: "语速", control: "slider", min: 0.5, max: 2, step: 0.1, default: 1, unit: "x" },
    { key: "emotion", label: "情绪", control: "select", options: [{ value: "激昂", label: "激昂" }, { value: "中性", label: "中性" }, { value: "低沉", label: "低沉" }, { value: "欢快", label: "欢快" }], default: "激昂" },
    { key: "language", label: "语言", control: "segmented", options: [{ value: "中文", label: "中文" }, { value: "英文", label: "英文" }], default: "中文" },
  ],
  "ElevenLabs": [
    { key: "voice", label: "音色", control: "select", options: [{ value: "Adam", label: "Adam" }, { value: "Rachel", label: "Rachel" }, { value: "Antoni", label: "Antoni" }], default: "Adam" },
    { key: "stability", label: "稳定性", control: "slider", min: 0, max: 1, step: 0.05, default: 0.5 },
    { key: "similarity", label: "相似度", control: "slider", min: 0, max: 1, step: 0.05, default: 0.75 },
    { key: "speed", label: "语速", control: "slider", min: 0.7, max: 1.2, step: 0.05, default: 1, unit: "x" },
  ],
  "Bark": [
    { key: "voice", label: "音色", control: "select", options: [{ value: "中文男声", label: "中文男声" }, { value: "中文女声", label: "中文女声" }], default: "中文男声" },
    { key: "language", label: "语言", control: "segmented", options: [{ value: "中文", label: "中文" }, { value: "英文", label: "英文" }], default: "中文" },
  ],
  "Edge TTS": [
    { key: "voice", label: "音色", control: "select", options: [{ value: "云希", label: "云希（男）" }, { value: "晓晓", label: "晓晓（女）" }, { value: "云扬", label: "云扬（男）" }], default: "云希" },
    { key: "speed", label: "语速", control: "slider", min: 0.5, max: 2, step: 0.1, default: 1, unit: "x" },
    { key: "pitch", label: "音调", control: "slider", min: -50, max: 50, step: 5, default: 0, unit: "Hz" },
  ],
  // ── BGM 模型 ──
  "Suno v4": [
    { key: "genre", label: "曲风", control: "select", options: [{ value: "史诗战斗", label: "史诗战斗" }, { value: "热血燃向", label: "热血燃向" }, { value: "紧张悬疑", label: "紧张悬疑" }, { value: "轻松休闲", label: "轻松休闲" }, { value: "仙侠古风", label: "仙侠古风" }], default: "史诗战斗" },
    { key: "bpm", label: "BPM", control: "slider", min: 60, max: 200, step: 5, default: 120 },
    { key: "instrumental", label: "纯音乐", control: "toggle", default: true, hint: "关闭后可含人声" },
  ],
  "Udio v1.5": [
    { key: "genre", label: "曲风", control: "select", options: [{ value: "epic orchestral", label: "史诗管弦" }, { value: "electronic", label: "电子" }, { value: "rock", label: "摇滚" }, { value: "chinese traditional", label: "国风" }], default: "epic orchestral" },
    { key: "bpm", label: "BPM", control: "slider", min: 60, max: 200, step: 5, default: 120 },
  ],
  "Stable Audio 2.0": [
    { key: "duration", label: "时长", control: "slider", min: 5, max: 60, step: 5, default: 15, unit: "s" },
    { key: "guidance", label: "引导强度", control: "slider", min: 1, max: 15, step: 0.5, default: 7 },
  ],
  // ── SFX 模型 ──
  "ElevenLabs SFX": [
    { key: "duration", label: "时长", control: "slider", min: 1, max: 10, step: 0.5, default: 3, unit: "s" },
    { key: "influence", label: "提示影响度", control: "slider", min: 0, max: 1, step: 0.1, default: 0.5 },
  ],
};

export function defaultParams(model: string): Record<string, ParamValue> {
  const out: Record<string, ParamValue> = {};
  for (const p of MODEL_PARAMS[model] ?? []) out[p.key] = p.default;
  return out;
}
// Compact one-line summary of the headline params (for the collapsed read view): "9:16 · 5s · 高品质 · 环绕"
export function paramSummary(model: string, values: Record<string, ParamValue> = {}): string {
  const specs = MODEL_PARAMS[model] ?? [];
  const v = { ...defaultParams(model), ...values };
  return specs
    .filter((p) => p.control === "segmented" || p.control === "select")
    .slice(0, 4)
    .map((p) => `${v[p.key]}${p.unit ?? ""}`)
    .filter((x) => x && x !== "无" && x !== "false")
    .join(" · ");
}

// Model metadata for the rich picker (one-line capability + generation-time estimate + optional tag).
// ETAs are illustrative. Icon is derived from the element type at render, so no per-model logo needed.
export const MODEL_META: Record<string, { desc: string; eta: string; tag?: string }> = {
  "Seedance 2.0":    { desc: "综合质量榜首，音画同步、原生多镜头", eta: "1min", tag: "推荐" },
  "Veo 3.1":         { desc: "Google，音频与口型最佳，首尾帧 + 参考", eta: "2min", tag: "音频" },
  "Kling 3.0":       { desc: "原生 4K、15s、多语言口型，特效最强", eta: "3min", tag: "旗舰" },
  "Kling 2.6 Pro":   { desc: "上一代旗舰，稳定省钱、原生音频", eta: "2min" },
  "Runway Gen-4.5":  { desc: "运镜 / 指令控制最强，电影级质感", eta: "2min", tag: "可控" },
  "Pika 2.2":        { desc: "Pikaframes 多关键帧，出片快、卡点强", eta: "1min" },
  "Hailuo 2.3":      { desc: "物理与微表情真实，运动幅度大", eta: "2min" },
  "Luma Ray 3":      { desc: "原生 16-bit HDR、光影质感、可改视频", eta: "2min" },
  "Vidu Q3":         { desc: "最长 16s + 原生音频，动画番剧强", eta: "2min" },
  "Wan 2.7":         { desc: "阿里，首尾帧 + 九宫格参考、中文语义好", eta: "2min", tag: "开源" },
  "PixVerse V5.6":   { desc: "风格化强，音画 + 口型，二次元出色", eta: "1min" },
  "HunyuanVideo 1.5":{ desc: "腾讯开源轻量，720P 高性价比", eta: "2min" },
  "Midjourney v6": { desc: "画质与审美天花板", eta: "1min" },
  "模板引擎":       { desc: "品牌一致，秒出 CTA 成品图", eta: "10s", tag: "最快" },
  "DALL·E 3":      { desc: "理解长描述，文字渲染好", eta: "30s" },
  "Flux 1.1 Pro":  { desc: "写实细节强，可控性高", eta: "40s" },
  "Fish Audio":    { desc: "中文男声自然度最高", eta: "20s", tag: "推荐" },
  "ElevenLabs":    { desc: "多语种，情感细腻", eta: "20s" },
  "Bark":          { desc: "开源，音色多样", eta: "30s" },
  "Edge TTS":      { desc: "免费稳定，覆盖广", eta: "10s" },
  "Suno v4":       { desc: "全曲风覆盖，15–60s 完整曲目", eta: "30s", tag: "推荐" },
  "Udio v1.5":     { desc: "高保真编曲，史诗管弦强", eta: "40s" },
  "Stable Audio 2.0": { desc: "短音效到长配乐均可", eta: "20s" },
  "ElevenLabs SFX": { desc: "文字生成音效，游戏场景覆盖全", eta: "10s", tag: "推荐" },
};

export type ShotSource = "ai" | "upload";

export type ShotVariation = {
  id: string;
  seed: string;
  done: boolean;
  readyAt?: number;   // mock: wall-clock ms when this take finishes "generating"
};

export type Shot = {
  id?: string;                // stable identity for drag-reorder (survives timing reflow / renumber)
  no: number;
  t: string;
  type: ElementType;
  d: string;
  source: ShotSource;
  reasoning: string;          // ai → why this model (routing rationale); upload → why your footage is needed here
  // AI-generated only:
  model?: string;
  prompt?: string;
  params?: Record<string, ParamValue>;   // per-model generation parameters (aspect, duration, camera, voice…)
  // user-uploaded only:
  asset?: string;             // filename once uploaded; undefined = awaiting upload
  assetUrl?: string;          // local object URL for preview. ★ BACKEND: replace with the CDN URL your upload endpoint returns.
  assetKind?: "video" | "image";
  seed?: string;              // thumbnail seed for the uploaded asset
  refSeed?: string;           // 参考 state: reference frame (e.g. from a video breakdown) shown before generation
  // Per-shot audio (AI auto-fills from description, user can override)
  sfx?: string;               // sound effect description, e.g. "剑鸣·金属撞击"
  voLine?: string;            // voiceover script line for this shot, e.g. "一击必杀！"
  // Per-shot generated variations (1-4 video clips to compare/pick from)
  variations?: ShotVariation[];
};

export type Platform = "巨量" | "TikTok" | "腾讯广告" | "快手";
export type AspectRatio = "9:16" | "16:9" | "1:1" | "4:5";

export const PLATFORM_PRESETS: Record<Platform, { ratio: AspectRatio; duration: string }> = {
  "巨量":     { ratio: "9:16", duration: "15s" },
  "TikTok":   { ratio: "9:16", duration: "15s" },
  "腾讯广告":  { ratio: "16:9", duration: "30s" },
  "快手":     { ratio: "9:16", duration: "15s" },
};

export type ConceptRef = { seed: string; label: string; source: string; url?: string; kind?: "video" | "image" };

export type Concept = {
  n: number;
  title: string;
  short: string;
  sel: boolean;
  platform: Platform;
  aspectRatio: AspectRatio;
  duration: string;
  note?: string;
  reasoning: string;
  refTopic: string;
  // style references — "what feel we're making". url/kind present when user-uploaded (object URL for now;
  // ★ BACKEND: swap to uploaded-media URL). seed keeps a stable identity + picsum fallback.
  refs: ConceptRef[];
  shots: Shot[];
  bgm?: AudioGlobal;
  voStyle?: AudioGlobal;
};

export const initialConcepts: Concept[] = [
  {
    n: 1,
    title: "连击数字飙升",
    short: "连击",
    sel: true,
    platform: "巨量",
    aspectRatio: "9:16",
    duration: "15s",
    reasoning: "「连击+数字飙升」是 Q2 RPG 品类 CTR 前 5% 的钩子结构; 竞品明日方舟/原神同类素材 3 日 ROAS 均 > 1.5",
    refTopic: "连击爽感 · RPG热门钩子",
    refs: [
      { seed: "ref-combo", label: "竞品《明日方舟》连击钩子", source: "巨量跑量榜 Top 3%" },
      { seed: "ref-combo2", label: "《崩坏3》连段数字飙升", source: "高 CTR 历史素材" },
    ],
    bgm: { model: "Suno v4", prompt: "史诗战斗 BGM，激昂管弦 + 电子节拍，120bpm", params: { genre: "史诗战斗", bpm: 120, instrumental: true } },
    voStyle: { model: "Fish Audio", params: { voice: "热血男声", speed: 1, emotion: "激昂", language: "中文" } },
    shots: [
      {
        no: 1, t: "0–3s", type: "ai-video", source: "ai",
        d: "全黑画面中一道白色剑光从左侧劈入，瞬间撕裂黑屏露出暗红底色。金色连击数字 ×1 从中心弹出并震屏，粒子向四周扩散，暗黑风格强对比光效",
        model: "Kling 3.0",
        prompt: "黑屏中一道剑光从左至右劈开画面，金色连击数字 ×1 从中心弹出，震屏效果，电影感光效，竖版 9:16，暗黑风格",
        reasoning: "开场 3s 悬念钩子; Kling v2.0 光效评测 87/100, 优于 Runway (72)",
        sfx: "剑鸣·金属撞击",
      },
      {
        no: 2, t: "3–10s", type: "ai-video", source: "ai",
        d: "角色在副本中连续施放普攻 + 技能连招，每次命中触发震屏顿帧。画面右上角连击数字从 ×1 快速飙到 ×99，伤害数字飞溅，节奏感极强",
        model: "Kling 3.0",
        prompt: "角色连续施放普攻 + 技能连招，每次命中震屏顿帧，右上角连击数字从 ×1 飙到 ×99，伤害数字飞溅，暗黑战斗风，竖版 9:16",
        reasoning: "连招爽感是钩子核心; Kling v2.0 动作连贯性与打击特效评测最优",
        sfx: "连击音·数字跳动",
        voLine: "连击数飙升！",
      },
      {
        no: 3, t: "10–12s", type: "ai-video", source: "ai",
        d: "连击数字从 ×50 疯狂跳到 ×99 的极致特写，金色数字占满画面并震颤，背后伤害数字如暴雨飞溅，屏幕边缘金光溢出，情绪推到顶点",
        model: "Pika 2.2",
        prompt: "金色连击数字从 ×50 飙到 ×99 极致特写，数字占满画面震颤，背景伤害数字飞溅，金光溢出，竖版 9:16",
        reasoning: "数字飙升峰值特写承接实拍高潮; Pika 卡点节奏快，适合 2s 强冲击镜头",
        sfx: "数字跳动·金光迸发",
        voLine: "九十九连击！",
      },
      {
        no: 4, t: "12–14s", type: "ai-video", source: "ai",
        d: "角色释放终极大招，满屏金色粒子爆发。BOSS 巨大身形缓慢倒塌，慢镜头逆光剪影，地面开裂碎石飞起，画面从近景拉到全景收尾",
        model: "Kling 3.0",
        prompt: "满屏金色粒子爆发特效，巨型 BOSS 身形缓慢倒塌，慢镜头，逆光剪影，史诗感，竖版 9:16",
        reasoning: "高潮 2s 需超现实特效; Kling 粒子爆发场景内部评测最优",
        sfx: "爆炸·BOSS 倒地",
        voLine: "一击必杀！",
      },
      {
        no: 5, t: "14–15s", type: "ai-video", source: "ai",
        d: "BOSS 倒地扬起的尘埃中，金色连击数字 ×99 在画面中央缓缓定格放大，余烬粒子飘落，为收尾蓄势，画面定格在战斗余韵的高光瞬间",
        model: "Kling 3.0",
        prompt: "BOSS 倒地尘埃中金色连击数字 ×99 居中定格放大，余烬粒子飘落，暗黑史诗，竖版 9:16",
        reasoning: "定格高光镜头衔接 CTA，把情绪稳在峰值再收口",
        sfx: "余烬·低频轰鸣",
      },
      {
        no: 6, t: "15–15s", type: "ai-video", source: "ai",
        d: "游戏 logo 在金色光晕中动态浮现并放大，底部「立即预约」按钮脉冲闪烁。右下角巨量引擎渠道角标淡入，深色背景配品牌主色金色流光扫过",
        model: "Pika 2.2",
        prompt: "游戏 logo 金色光晕中动态浮现放大，底部「立即预约」按钮脉冲，右下角巨量引擎角标，品牌主色 #FFD700 流光扫过 + 暗底，竖版 9:16",
        reasoning: "结尾 CTA 动效化，logo + 按钮动态浮现强化品牌; Pika 出片快适合 endcard",
        sfx: "UI 确认音",
        voLine: "现在就预约",
      },
    ],
  },
  {
    n: 2,
    title: "BOSS 团灭开场",
    short: "BOSS",
    sel: true,
    platform: "腾讯广告",
    aspectRatio: "16:9",
    duration: "30s",
    note: "已按对话补充团战实拍镜头",
    reasoning: "Boss战+团灭 是 MMORPG 信息流 CVR 最高开场类型 (Q2 巨量数据); 30s 长素材完播率 +23% vs 15s",
    refTopic: "Boss战 · MMORPG信息流",
    refs: [
      { seed: "ref-boss", label: "竞品《剑与远征》团战开场", source: "腾讯广告 CVR 标杆" },
      { seed: "ref-boss2", label: "《原神》世界BOSS击杀慢镜", source: "完播率 Top 5%" },
      { seed: "ref-boss3", label: "团战热血解说配音参考", source: "内部 A/B 最优" },
    ],
    bgm: { model: "Suno v4", prompt: "热血战斗 BGM，管弦 + 鼓点渐强，140bpm", params: { genre: "热血燃向", bpm: 140, instrumental: true } },
    voStyle: { model: "Fish Audio", params: { voice: "热血男声", speed: 1, emotion: "激昂", language: "中文" } },
    shots: [
      {
        no: 1, t: "0–2s", type: "ai-video", source: "ai",
        d: "世界 BOSS 破地而出，巨大身形遮天，地图剧烈震动，远处玩家仰视镜头。压迫感开场，瞬间建立「这是一场硬仗」的预期",
        model: "Kling 3.0",
        prompt: "巨型世界 BOSS 破地而出遮天，地图震动，玩家仰视镜头，史诗压迫感，竖版 9:16",
        reasoning: "AI 开场建立 BOSS 体量压迫感; Kling 大体量怪物生成最优",
        sfx: "地动·BOSS 咆哮",
        voLine: "集合！世界 BOSS 出现了！",
      },
      {
        no: 2, t: "2–4s", type: "ai-video", source: "ai",
        d: "世界 BOSS 血条闪红仅剩 5%，角色一记暴击打出六位数伤害数字，镜头微抖 + 红色滤镜闪烁。UI 清晰可读，强调真实战斗紧迫感",
        model: "Kling 3.0",
        prompt: "世界 BOSS 血条闪红仅剩 5%，角色暴击打出六位数伤害数字，镜头微抖 + 红色滤镜闪烁，游戏 UI 数值清晰，紧迫感，竖版 9:16",
        reasoning: "Boss 红血是 MMORPG 广告 CTR 最高的画面; Kling 数值特写 + 滤镜表现稳定",
        sfx: "暴击·血条闪烁",
      },
      {
        no: 3, t: "4–7s", type: "ai-video", source: "ai",
        d: "集结号召镜头：五人小队从地图四个方向策马 / 飞行赶来，电影感分屏依次亮起每名职业的剪影，强调阵容齐整、即将开战",
        model: "Runway Gen-4.5",
        prompt: "五人小队从四方赶来集结，电影感分屏亮起各职业剪影，史诗集结感，竖版 9:16",
        reasoning: "集结镜头建立团队叙事; Runway 多主体运镜控制最佳",
        sfx: "马蹄·集结号角",
      },
      {
        no: 4, t: "7–10s", type: "ai-video", source: "ai",
        d: "坦克冲入拉起 BOSS 仇恨，举盾承受重击，BOSS 转身锁定坦克。画面强调职业分工的第一步：仇恨控制",
        model: "Kling 3.0",
        prompt: "坦克冲入拉起 BOSS 仇恨，举盾承受重击，BOSS 转身锁定坦克，团战职业分工，史诗感，竖版 9:16",
        reasoning: "仇恨控制建立团战叙事; Kling 大体量怪物与角色互动最优",
        sfx: "盾击·BOSS 锁定",
        voLine: "我来抗，你们输出！",
      },
      {
        no: 5, t: "10–13s", type: "ai-video", source: "ai",
        d: "奶妈刷血光笼罩队伍，DPS 交替释放技能，伤害数字成片飞溅。画面覆盖完整一轮技能循环，强调多职业协作与团战节奏",
        model: "Kling 3.0",
        prompt: "奶妈治疗光笼罩队伍，多名 DPS 交替释放技能，伤害数字成片飞溅，多职业协作团战节奏，竖版 9:16",
        reasoning: "技能循环节奏留住观众; Kling 多主体技能特效表现强",
        sfx: "技能连锁·治疗音",
        voLine: "奶稳了！全力输出！",
      },
      {
        no: 6, t: "13–15s", type: "ai-video", source: "ai",
        d: "BOSS 进入狂暴读条，全屏铺开红色 AOE 预警圈，地面裂纹发光，紧张感骤然拉满，提示团队即将迎来一次团灭威胁",
        model: "Kling 3.0",
        prompt: "BOSS 狂暴读条，全屏红色 AOE 预警圈，地面裂纹发光，高压紧张，竖版 9:16",
        reasoning: "AOE 预警制造危机点; Kling 大范围特效表现强",
        sfx: "读条·警报",
      },
      {
        no: 7, t: "15–17s", type: "ai-video", source: "ai",
        d: "五人小队极限闪避走位躲过全屏 AOE，仅剩一丝血量险象环生，走位脚步与翻滚清晰可见，真实操作的紧张感拉满",
        model: "Runway Gen-4.5",
        prompt: "五人小队极限闪避走位躲过全屏红色 AOE，仅剩一丝血量，翻滚走位清晰，紧张感拉满，竖版 9:16",
        reasoning: "极限走位是高光时刻; Runway 多主体运镜与走位控制评测最佳",
        sfx: "闪避·心跳加速",
        voLine: "散开！躲技能！",
      },
      {
        no: 8, t: "17–19s", type: "ai-video", source: "ai",
        d: "全队合体大招蓄力，五人能量汇聚成一道直冲云霄的光柱，镜头从地面仰拍能量螺旋上升，蓄势待发",
        model: "Kling 3.0",
        prompt: "五人合体大招能量汇聚成冲天光柱，地面仰拍能量螺旋上升，史诗蓄力，竖版 9:16",
        reasoning: "合体技蓄力镜头把情绪推向决战; Kling 能量特效最优",
        sfx: "能量汇聚·蓄力嗡鸣",
        voLine: "一起上！终结它！",
      },
      {
        no: 9, t: "19–21s", type: "ai-video", source: "ai",
        d: "合体大招轰中 BOSS，BOSS 最后一击踉跄、巨大身形开始倒下的慢镜头，逆光剪影下碎甲崩裂飞散",
        model: "Runway Gen-4.5",
        prompt: "合体大招轰中 BOSS，BOSS 倒地慢镜头，逆光剪影碎甲飞散，史诗感，竖版 9:16",
        reasoning: "决胜一击需高质感慢镜; Runway 运镜控制评测 91/100",
        sfx: "重击·BOSS 嘶吼",
      },
      {
        no: 10, t: "21–23s", type: "ai-video", source: "ai",
        d: "镜头环绕拉远展示全场战损：焦土、断裂的地形与屹立的五人小队，BOSS 庞大尸身横陈，胜利的余韵铺满画面",
        model: "Runway Gen-4.5",
        prompt: "镜头环绕拉远展示战场全景，焦土断裂地形，五人小队屹立，BOSS 尸身横陈，竖版 9:16",
        reasoning: "环绕全景镜头交代战果规模; Runway 环绕运镜质感佳",
        sfx: "余烬·风声",
        voLine: "这就是团队的力量！",
      },
      {
        no: 11, t: "23–25s", type: "ai-video", source: "ai",
        d: "金色战利品从天降落散开，稀有装备光柱冲天而起，金币与宝箱在慢镜头中翻滚落地，配合史诗配乐的节奏点逐一炸开",
        model: "Kling 3.0",
        prompt: "金色战利品从天降落散开，稀有装备光柱冲天，金币宝箱慢镜翻滚，卡配乐节奏点，竖版 9:16",
        reasoning: "掉落瞬间是付费转化的情绪钩子; Kling 金色粒子掉落最优",
        sfx: "战利品散落·金光",
      },
      {
        no: 12, t: "25–27s", type: "ai-video", source: "ai",
        d: "稀有装备图标特写依次弹出：武器、护甲、坐骑各自旋转展示并标注品质光边，强调爆率与收益，刺激「我也想要」的欲望",
        model: "Seedance 2.0",
        prompt: "稀有装备图标特写依次旋转弹出，武器护甲坐骑，金紫品质光边，竖版 9:16",
        reasoning: "装备特写放大掉落收益; Seedance 物品展示动画稳定",
        sfx: "装备弹出·品质提示音",
      },
      {
        no: 13, t: "27–28s", type: "ai-video", source: "ai",
        d: "五人小队面向镜头摆出胜利姿势合影定格，背后是被击败的 BOSS 与冲天光柱，画面欢腾，团队荣耀感拉满",
        model: "Kling 3.0",
        prompt: "五人小队面向镜头胜利姿势合影定格，背后击败的 BOSS 与光柱，欢腾荣耀，竖版 9:16",
        reasoning: "胜利合影把团队叙事收口，强化「和兄弟一起」的卖点",
        sfx: "欢呼·胜利",
        voLine: "赢了！",
      },
      {
        no: 14, t: "28–29s", type: "ai-video", source: "ai",
        d: "副本通关结算面板动态展开：顶部 DPS 排行榜逐行点亮、第一名高亮跳动，下方稀有掉落装备依次入位，数字滚动结算",
        model: "Pika 2.2",
        prompt: "副本通关结算 UI 动态展开，DPS 排行逐行点亮第一名高亮，稀有掉落入位，数字滚动，竖版 9:16",
        reasoning: "结算面板动效化（原静态图）增强真实感; Pika 出片快适合 UI 动效",
        sfx: "结算·排行点亮",
      },
      {
        no: 15, t: "29–30s", type: "ai-video", source: "ai",
        d: "游戏 logo 在金光中浮现放大，底部「立即下载」按钮脉冲高亮，右下角腾讯广告渠道角标淡入，品牌主色流光扫过收尾",
        model: "Pika 2.2",
        prompt: "游戏 logo 金光中浮现放大，底部「立即下载」按钮脉冲，右下角腾讯广告角标，品牌流光扫过 + 暗底，竖版 9:16",
        reasoning: "结尾 CTA 动效化，logo + 按钮动态收口; Pika 出片快适合 endcard",
        sfx: "UI 确认音",
        voLine: "立即下载！",
      },
    ],
  },
  {
    n: 3,
    title: "御剑掠云第一视角",
    short: "御剑",
    sel: true,
    platform: "TikTok",
    aspectRatio: "9:16",
    duration: "15s",
    reasoning: "第一人称飞行视角在 TikTok 完播率 top 3%; 「仙侠+御剑」关键词 Q2 搜索量 +180%",
    refTopic: "仙侠飞行 · TikTok爆款",
    refs: [
      { seed: "ref-fly", label: "TikTok 爆款御剑第一视角", source: "完播率 Top 3%" },
      { seed: "ref-fly2", label: "《逆水寒》云海全景运镜", source: "仙侠题材标杆" },
    ],
    bgm: { model: "Suno v4", prompt: "仙侠古风 BGM，笛子 + 古筝 + 空灵女声吟唱，90bpm", params: { genre: "仙侠古风", bpm: 90, instrumental: false } },
    shots: [
      {
        no: 1, t: "0–4s", type: "ai-video", source: "ai",
        d: "第一人称视角御剑飞行，角色脚踩飞剑掠过翻涌云海，两侧山峰快速后退。风声 + 速度感拉满，远处隐约可见浮空岛屿轮廓，画面纵深感强",
        model: "Kling 3.0",
        prompt: "第一人称御剑飞行，脚踩飞剑掠过翻涌云海，两侧山峰快速后退，速度感与纵深感拉满，远处浮空岛屿，仙侠风，竖版 9:16",
        reasoning: "第一视角飞行是 TikTok 仙侠滑停率最高的开场; Kling 云海大场景与速度感表现最优",
        sfx: "风声·御剑呼啸",
      },
      {
        no: 2, t: "4–7s", type: "ai-video", source: "ai",
        d: "近身特写：角色脚下飞剑剑身浮现流动符文，灵气环绕剑刃，衣袂与发丝在高速气流中飞扬，强调仙侠御剑的细节质感",
        model: "Kling 3.0",
        prompt: "近景特写，角色脚踩飞剑，剑身浮现流动金色符文，灵气环绕，衣袂飞扬，仙侠风，竖版 9:16",
        reasoning: "近身细节镜头补充质感; Kling 符文光效评测优于同类",
        sfx: "剑吟·灵气流动",
      },
      {
        no: 3, t: "7–11s", type: "ai-video", source: "ai",
        d: "镜头从厚重云层中穿出，仙侠世界全景缓缓展开。浮空岛屿、飞瀑、古殿依次入画，阳光穿透云缝投射体积光，画面从封闭转向开阔，宏大感拉满",
        model: "Kling 3.0",
        prompt: "镜头从云层中穿出，仙侠世界全景缓缓展开，浮空岛屿、瀑布、神殿，光线穿透云缝，宏大感，竖版 9:16",
        reasoning: "全景展开需超现实场景; Kling 大场景生成评测 85/100",
        sfx: "云层穿越·仙气升腾",
      },
      {
        no: 4, t: "11–13s", type: "ai-video", source: "ai",
        d: "角色稳立于剑上俯瞰脚下仙城，缓缓回眸，长发与披风迎风舒展，背后霞光万丈。镜头从背后绕到侧脸，定格在角色坚定的眼神",
        model: "Seedance 2.0",
        prompt: "角色立于飞剑上俯瞰仙城，回眸，长发披风迎风，背后霞光，镜头环绕到侧脸，竖版 9:16",
        reasoning: "人物回眸定格强化角色记忆点; Seedance 人形角色动画评测 83/100",
        sfx: "风声渐弱·心跳",
        voLine: "这片天地，由我闯荡",
      },
      {
        no: 5, t: "13–15s", type: "ai-video", source: "ai",
        d: "仙侠风书法字体「探索星轨」笔锋逐字写就并发光，云雾缭绕背景缓缓渐隐。底部 App Store / Google Play 下载按钮并排淡入，右下角 TikTok 渠道角标",
        model: "Pika 2.2",
        prompt: "仙侠风书法字「探索星轨」逐字写就发光，云雾背景，底部 App Store/Google Play 按钮淡入，右下角 TikTok 角标，竖版 9:16",
        reasoning: "结尾 CTA 动效化，书法笔锋动画强化仙侠调性; Pika 出片快适合卡点 endcard",
        sfx: "UI 确认音",
        voLine: "探索星轨，即刻启程",
      },
    ],
  },
  {
    n: 4,
    title: "抽卡 SSR 时刻",
    short: "抽卡",
    sel: false,
    platform: "快手",
    aspectRatio: "9:16",
    duration: "15s",
    reasoning: "抽卡/开箱是手游广告长青钩子，每季度 CTR 稳定 top 10%; 重在真实感 + 出货瞬间情绪峰值",
    refTopic: "抽卡出货 · 长青钩子",
    refs: [
      { seed: "ref-gacha", label: "竞品《原神》十连出货时刻", source: "快手 CTR Top 10%" },
      { seed: "ref-gacha2", label: "SSR 角色展示运镜", source: "出货情绪峰值参考" },
    ],
    bgm: { model: "Udio v1.5", prompt: "抽卡揭晓感 BGM，紧张渐强 → 金光爆发高潮", params: { genre: "electronic", bpm: 130 } },
    shots: [
      {
        no: 1, t: "0–5s", type: "ai-video", source: "ai",
        d: "十连抽卡画面，前 9 张快速翻过（普通 / SR），第 10 张卡牌边缘开始泛起金光、画面震颤。抽卡 UI 完整可读，出货前的紧张感层层堆叠",
        model: "Seedance 2.0",
        prompt: "十连抽卡界面，前 9 张快速翻过，第 10 张卡牌边缘泛起金光、画面震颤，抽卡 UI 清晰，出货前紧张感层层堆叠，竖版 9:16",
        reasoning: "抽卡出货是长青钩子; Seedance UI 动画与卡面细节稳定，出货前铺垫节奏好",
        sfx: "抽卡翻转·金光起势",
      },
      {
        no: 2, t: "5–7s", type: "ai-video", source: "ai",
        d: "第 10 张卡牌金光彻底爆发、卡面碎裂的极致特写，碎片向四周飞散，SSR 角色剪影从光芒中浮现，出货瞬间的情绪峰值被放到最大",
        model: "Pika 2.2",
        prompt: "卡牌金光爆发、卡面碎裂特写，碎片飞散，SSR 角色剪影从光中浮现，金色高光，竖版 9:16",
        reasoning: "出货瞬间放大成 AI 特写承接录屏; Pika 卡点快，适合 2s 爆发镜头",
        sfx: "金光爆发·卡面碎裂",
        voLine: "金光了！是 SSR！",
      },
      {
        no: 3, t: "7–10s", type: "ai-video", source: "ai",
        d: "SSR 角色全身立绘动态化，角色缓慢转身展示服装与武器细节，布料与饰品随动作飘动，光影沿角色轮廓流转，强调美术品质",
        model: "Seedance 2.0",
        prompt: "SSR 角色全身立绘动态化，角色缓慢转身展示细节，布料飘动，光影流转，竖版 9:16",
        reasoning: "角色展示需动态化; Seedance 角色动画评测 83/100, 适合人形角色",
        sfx: "角色登场·衣料摩挲",
        voLine: "SSR 到手！",
      },
      {
        no: 4, t: "10–11s", type: "ai-video", source: "ai",
        d: "SSR 角色抬手凝聚冰霜技能，霜花从指尖蔓延冻结四周空气，蓝白色寒光特效在背景绽放，展示角色的元素战斗力",
        model: "Seedance 2.0",
        prompt: "SSR 角色抬手凝聚冰霜，霜花从指尖蔓延，蓝白寒光特效绽放，竖版 9:16",
        reasoning: "技能特效分镜展示战斗力; 与下一镜火雷形成元素递进",
        sfx: "冰霜凝结·寒气",
      },
      {
        no: 5, t: "11–12s", type: "ai-video", source: "ai",
        d: "紧接冰霜，角色挥手连放火焰与雷电技能，烈焰升腾、雷光劈落，特效节奏卡在 BGM 鼓点上，战斗力展示推到高潮",
        model: "Seedance 2.0",
        prompt: "SSR 角色连放火焰与雷电技能，烈焰升腾、雷光劈落，特效卡鼓点，竖版 9:16",
        reasoning: "火雷连放承接冰霜，元素特效递进强化角色强度",
        sfx: "烈焰·雷击",
      },
      {
        no: 6, t: "12–14s", type: "ai-video", source: "ai",
        d: "角色面向镜头摆出招牌战斗姿势并定格，身后技能余光收束成光环，角色名号与稀有度 SSR 标识以金色描边浮现在画面一侧",
        model: "Kling 3.0",
        prompt: "SSR 角色面向镜头摆招牌姿势定格，身后光环收束，金色描边角色名号 + SSR 标识浮现，竖版 9:16",
        reasoning: "招牌姿势定格 + 名号浮现强化角色记忆点; Kling 定格光效最优",
        sfx: "定格·光环嗡鸣",
        voLine: "这就是你的本命角色",
      },
      {
        no: 7, t: "14–15s", type: "ai-video", source: "ai",
        d: "SSR 角色半身像在金色流光中动态定格于画面左侧，右侧「预约即送 SSR」文案逐字弹出 + 金色预约按钮脉冲高亮。底部快手渠道角标淡入，配色延续抽卡金光主调",
        model: "Pika 2.2",
        prompt: "SSR 角色半身像金色流光中动态定格居左，右侧「预约即送 SSR」文案逐字弹出 + 预约按钮脉冲，底部快手角标，竖版 9:16",
        reasoning: "结尾 CTA 动效化，文案弹出 + 角色动态收口; Pika 出片快适合 endcard",
        sfx: "UI 确认音",
        voLine: "预约即送 SSR",
      },
    ],
  },
];

export type VideoState = "use" | "no" | "pending";
export type Video = {
  id: string;
  label: string;
  channel: string;
  dur: string;
  ratio: string;
  seed: string;
  state: VideoState;
  isRef?: boolean;     // a style reference, not a generated result
  refSource?: string;  // where the reference comes from
  url?: string;        // real media URL (user-uploaded ref or, later, a generated mp4). Falls back to picsum seed.
  kind?: "video" | "image";
  refMeta?: { cn: number; seed: string };  // which concept-ref this preview points at (for 替换参考)
};

function buildReview(): Video[] {
  const out: Video[] = [];
  let i = 0;
  for (const c of initialConcepts.filter((c) => c.sel)) {
    for (let v = 1; v <= 4; v++) {
      const r = i % 5;
      const state: VideoState = r === 0 ? "use" : r === 3 ? "no" : "pending";
      out.push({
        id: `rev-${c.n}-${v}`,
        label: `${c.short} v${v}`,
        channel: c.platform,
        dur: c.duration,
        ratio: c.aspectRatio,
        seed: `rev${i}`,
        state,
      });
      i++;
    }
  }
  return out;
}
export const reviewVideos = buildReview();

export type ChatAttachment = { id: string; name: string; kind: "image" | "video"; url?: string };
export type ChatMsg = {
  role: "u" | "a";
  text: string;
  refs?: boolean;
  attachments?: ChatAttachment[];
  jump?: { label: string; to: number };
  /** Agent work-trace (thinking / tool calls) rendered above the reply text. Protocol: lib/agent.ts. */
  steps?: AgentStep[];
  /** True while the reply is still streaming in — renders a caret and keeps the composer in busy state. */
  streaming?: boolean;
};

export const initialMessages: ChatMsg[] = [
  { role: "u", text: "想给《星轨》做一批主打「连击爽感」的素材，主投巨量，男性 18–24。这两个是跑量参考。", refs: true },
  { role: "a", text: "收到。我分析了巨量引擎 Q2 RPG 品类跑量数据，「连击+数字」钩子 CTR 排前 5%。从几个高潜方向切，每个方案都标注了数据依据和模型选择 →" },
  { role: "u", text: "好，出分镜让我看。" },
  { role: "a", text: "出了 4 个方案。AI 元素我已选好模型，游戏录屏 标注了需要你上传的位置 →", jump: { label: "① 查看分镜方案", to: 0 } },
  { role: "u", text: "选 1、2、3，生成。" },
  { role: "a", text: "好。AI 元素直接生成，缺的实拍素材我会提示你补传 →", jump: { label: "② 生成进度", to: 1 } },
  { role: "a", text: "12 个素材已生成。你之前的调整已记录到数据集，下次路由会更准 →", jump: { label: "③ 预览 · 挑选素材", to: 2 } },
];

export const img = (seed: string, w: number, h: number) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

/* ───────────────────────── 账户 · 额度 (B2B account) ──────────────────────
   Bottom-left account zone: credit usage + feedback channel. "Credits" are the
   billing unit customers care about — one pool spent across paid generation
   (视频 / 图片 / 配音). Numbers are mock; the shape is the durable part. */
export type UsageSlice = { label: string; color: string; used: number };
export type AccountUsage = {
  plan: string;          // 套餐名
  used: number;          // credits spent this cycle
  total: number;         // credits in the cycle
  resetLabel: string;    // when it resets
  slices: UsageSlice[];  // where the credits went (sums to `used`)
};
export const accountUsage: AccountUsage = {
  plan: "团队版",
  used: 1_240_000,
  total: 2_000_000,
  resetLabel: "7 月 15 日",
  slices: [
    { label: "AI 视频生成", color: "var(--color-srcai)", used: 792_000 },
    { label: "图片生成",     color: "var(--color-srccg)", used: 268_000 },
    { label: "配音 VO",      color: "var(--color-srcvo)", used: 180_000 },
  ],
};

export const team = { name: "显哥的团队", desc: "深圳 · 发行" };

export type FeedbackKind = "问题" | "建议" | "其他";
export const FEEDBACK_KINDS: { id: FeedbackKind; label: string }[] = [
  { id: "问题", label: "问题反馈" },
  { id: "建议", label: "功能建议" },
  { id: "其他", label: "其他" },
];

/* ───────────────────────── 发行计划 (deploy plan) ─────────────────────────
   The "计划" a UA person builds is a combinatorial object:
   渠道 × 账户 × 地区(广告系列) × 定向(广告组) × 创意. The SME's tool makes the
   human hand-specify every axis and the split rules. Here the AI expands intent
   into this tree; the conversation is the source of truth, this is its read-out. */

export type DeployChannel = "Meta" | "TikTok" | "AppLovin" | "Google" | "Kwai";
export type BidStrategy = "ROAS" | "CPI" | "CPA" | "oCPM";

// Category dot colors — semantic, per the monochrome design system (color only for meaning).
export const CHANNEL_META: Record<DeployChannel, { dot: string; account: string }> = {
  Meta:     { dot: "#0075de", account: "GameHero-Meta01" },
  TikTok:   { dot: "#1a1a1a", account: "GameHero-TT01" },
  AppLovin: { dot: "#1aae39", account: "GameHero-AL01" },
  Google:   { dot: "#dd5b00", account: "GameHero-GG01" },
  Kwai:     { dot: "#d97706", account: "GameHero-KW01" },
};

export const GEO_NAME: Record<string, string> = { US: "美国", JP: "日本", KR: "韩国", TW: "台湾", SEA: "东南亚" };

export type PlanGroup = {        // 广告组
  id: string;
  device: string;                // 高端机型 / 全机型
  budget: number;                // 日预算 $
  bid: number;                   // 目标出价 $
  ratio: AspectRatio;
  creativeIds: string[];         // 创意 = 广告，每条素材一个广告
};
export type PlanSeries = {        // 广告系列
  id: string;
  geo: string;                   // 地区代码 US/JP…
  audience: string;              // 男 18-24
  groups: PlanGroup[];
};
export type PlanChannelNode = {
  id: string;
  channel: DeployChannel;
  account: string;
  bid: BidStrategy;
  targetRoas: number;
  series: PlanSeries[];
};
export type DeployPlan = {
  product: string;
  intent: string;
  channels: PlanChannelNode[];
};

export function planCounts(p: DeployPlan) {
  const series = p.channels.flatMap((c) => c.series);
  const groups = series.flatMap((s) => s.groups);
  const ads = groups.reduce((n, g) => n + g.creativeIds.length, 0);
  const budget = groups.reduce((n, g) => n + g.budget, 0);
  return { channels: p.channels.length, series: series.length, groups: groups.length, ads, budget };
}

// Distribute the chosen creatives round-robin across a group, min 1.
function pick<T>(arr: T[], start: number, n: number): T[] {
  if (arr.length === 0) return [];
  return Array.from({ length: Math.max(1, n) }, (_, i) => arr[(start + i) % arr.length]);
}

// Expand the seed intent into a full 星轨 NA+JP cold-start plan from the selected creatives.
export function buildInitialPlan(creativeIds: string[], product = "星轨"): DeployPlan {
  const ids = creativeIds.length ? creativeIds : ["c1", "c2", "c3", "c4"];
  let k = 0;
  const grp = (id: string, device: string, budget: number, bid: number, ratio: AspectRatio, n: number): PlanGroup =>
    ({ id, device, budget, bid, ratio, creativeIds: pick(ids, (k += 2), n) });
  const series = (id: string, geo: string, groups: PlanGroup[]): PlanSeries => ({ id, geo, audience: "男 18-24", groups });
  return {
    product,
    intent: `${product} NA+JP 冷启动 · $10k/天 · 男 18-24 · ROAS 出价 · Meta+TikTok+AppLovin`,
    channels: [
      {
        id: "ch-meta", channel: "Meta", account: CHANNEL_META.Meta.account, bid: "ROAS", targetRoas: 1.4,
        series: [
          series("s-meta-us", "US", [grp("g1", "高端机型", 1500, 3.2, "9:16", 4), grp("g2", "全机型", 1000, 2.8, "9:16", 4)]),
          series("s-meta-jp", "JP", [grp("g3", "高端机型", 1200, 3.0, "9:16", 4), grp("g4", "全机型", 800, 2.6, "9:16", 4)]),
        ],
      },
      {
        id: "ch-tt", channel: "TikTok", account: CHANNEL_META.TikTok.account, bid: "ROAS", targetRoas: 1.3,
        series: [
          series("s-tt-us", "US", [grp("g5", "高端机型", 1300, 3.0, "9:16", 4), grp("g6", "全机型", 900, 2.5, "9:16", 4)]),
          series("s-tt-jp", "JP", [grp("g7", "全机型", 1300, 2.6, "9:16", 4)]),
        ],
      },
      {
        id: "ch-al", channel: "AppLovin", account: CHANNEL_META.AppLovin.account, bid: "CPI", targetRoas: 0,
        series: [
          series("s-al-us", "US", [grp("g8", "全机型", 2000, 2.5, "9:16", 4)]),
        ],
      },
    ],
  };
}

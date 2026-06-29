// Gampex workspace mock data.
// Model (2026-06-28, corrected): each shot = element with a PROVENANCE.
//   - source "ai":     agent generates it and routes to a model → has model + prompt + routing rationale.
//   - source "upload": the user provides the asset → no model, no routing. Just the asset (or a request to upload it).
// Gameplay is upload-only (the system can't fabricate real gameplay). Static can be either. AI video / VO are AI-generated.

export type ElementType = "ai-video" | "gameplay" | "static" | "vo";

export const ELEM: Record<ElementType, { label: string; color: string; canGenerate: boolean; canUpload: boolean }> = {
  "ai-video": { label: "AI 视频",      color: "var(--color-srcai)", canGenerate: true,  canUpload: false },
  "gameplay": { label: "游戏录屏", color: "var(--color-srcgp)", canGenerate: false, canUpload: true  },
  "static":   { label: "静态图",        color: "var(--color-srccg)", canGenerate: true,  canUpload: true  },
  "vo":       { label: "配音 VO",       color: "var(--color-srcvo)", canGenerate: true,  canUpload: false },
};

// Models the agent can route an AI-generated element to. Upload-only elements have none.
export const MODEL_OPTIONS: Record<ElementType, string[]> = {
  "ai-video": ["Kling v2.0", "Runway Gen-4", "Pika 2.0", "Seedance 1.0", "Pixverse v3"],
  "gameplay": [],
  "static":   ["Midjourney v6", "模板引擎", "DALL·E 3", "Flux 1.1 Pro"],
  "vo":       ["Fish Audio", "ElevenLabs", "Bark", "Edge TTS"],
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

const P_ASPECT = (def = "9:16"): ParamSpec => ({ key: "aspect", label: "画面比例", control: "segmented", options: [
  { value: "9:16", label: "9:16" }, { value: "16:9", label: "16:9" }, { value: "1:1", label: "1:1" }, { value: "4:5", label: "4:5" },
], default: def });
const P_DUR = (max = 10, def = 5): ParamSpec => ({ key: "duration", label: "生成时长", control: "slider", min: 1, max, step: 1, unit: "s", default: def });
const P_CAMERA: ParamSpec = { key: "camera", label: "运镜", control: "select", options: [
  { value: "固定", label: "固定镜头" }, { value: "推进", label: "推进 Push-in" }, { value: "拉远", label: "拉远 Pull-out" },
  { value: "摇移", label: "摇移 Pan" }, { value: "跟随", label: "跟随 Follow" }, { value: "环绕", label: "环绕 Orbit" }, { value: "升降", label: "升降 Crane" },
], default: "固定" };
const P_NEG: ParamSpec = { key: "negative", label: "反向提示词", control: "text", default: "", hint: "不希望出现的元素，留空即可" };
const P_SEED: ParamSpec = { key: "seed", label: "种子", control: "number", min: 0, max: 999999, step: 1, default: 0, hint: "0 = 每次随机" };
const P_RES = (def = "720P"): ParamSpec => ({ key: "resolution", label: "清晰度", control: "segmented", options: ["480P", "720P", "1080P"].map((v) => ({ value: v, label: v })), default: def });
const P_AUDIO: ParamSpec = { key: "audio", label: "生成音频", control: "toggle", default: false, hint: "由模型同步生成音效 / 配乐" };

export const MODEL_PARAMS: Record<string, ParamSpec[]> = {
  // ── 视频模型 ──
  "Kling v2.0": [
    P_ASPECT("9:16"), P_RES("720P"), P_DUR(10, 5),
    { key: "mode", label: "生成模式", control: "segmented", options: [{ value: "标准", label: "标准" }, { value: "高品质", label: "高品质" }], default: "高品质" },
    P_CAMERA,
    { key: "creativity", label: "创意度", control: "slider", min: 0, max: 1, step: 0.05, default: 0.5, hint: "越高越自由发挥，越低越贴提示词" },
    P_AUDIO,
    { key: "endframe", label: "首尾帧", control: "toggle", default: false, hint: "指定首帧 / 尾帧画面" },
    P_NEG,
  ],
  "Runway Gen-4": [
    P_ASPECT("16:9"), P_RES("720P"), P_DUR(10, 5),
    { key: "camera", label: "运镜控制", control: "select", options: [{ value: "固定", label: "固定" }, { value: "平移", label: "平移" }, { value: "变焦", label: "变焦" }, { value: "环绕", label: "环绕" }], default: "固定" },
    P_AUDIO, P_SEED, P_NEG,
  ],
  "Pika 2.0": [
    P_ASPECT("9:16"), P_RES("720P"), P_DUR(5, 5),
    { key: "motion", label: "运动强度", control: "slider", min: 0, max: 4, step: 1, default: 2, hint: "0 静止 → 4 强烈运动" },
    P_AUDIO, P_SEED, P_NEG,
  ],
  "Seedance 1.0": [
    { key: "resolution", label: "分辨率", control: "segmented", options: [{ value: "480P", label: "480P" }, { value: "720P", label: "720P" }, { value: "1080P", label: "1080P" }], default: "720P" },
    P_ASPECT("9:16"), P_DUR(10, 5), P_CAMERA,
    { key: "fps", label: "帧率", control: "segmented", options: [{ value: "24", label: "24" }, { value: "30", label: "30" }], default: "24", unit: "fps" },
  ],
  "Pixverse v3": [
    { key: "resolution", label: "分辨率", control: "segmented", options: [{ value: "360P", label: "360P" }, { value: "540P", label: "540P" }, { value: "720P", label: "720P" }, { value: "1080P", label: "1080P" }], default: "720P" },
    P_ASPECT("9:16"), P_DUR(8, 5),
    { key: "motionmode", label: "运动模式", control: "segmented", options: [{ value: "普通", label: "普通" }, { value: "高性能", label: "高性能" }], default: "普通" },
    { key: "style", label: "风格", control: "select", options: [{ value: "无", label: "无" }, { value: "动漫", label: "动漫" }, { value: "3D", label: "3D" }, { value: "赛博朋克", label: "赛博朋克" }, { value: "黏土", label: "黏土" }], default: "无" },
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
  "Kling v2.0":    { desc: "光效与粒子特效最强，运镜稳定", eta: "3min", tag: "推荐" },
  "Runway Gen-4":  { desc: "运镜控制精准，电影级质感", eta: "3min" },
  "Pika 2.0":      { desc: "出片快，适合快节奏卡点", eta: "1min" },
  "Seedance 1.0":  { desc: "音画同步，最高 1080P", eta: "2min" },
  "Pixverse v3":   { desc: "风格化强，二次元 / 3D 出色", eta: "2min" },
  "Midjourney v6": { desc: "画质与审美天花板", eta: "1min" },
  "模板引擎":       { desc: "品牌一致，秒出 CTA 成品图", eta: "10s", tag: "最快" },
  "DALL·E 3":      { desc: "理解长描述，文字渲染好", eta: "30s" },
  "Flux 1.1 Pro":  { desc: "写实细节强，可控性高", eta: "40s" },
  "Fish Audio":    { desc: "中文男声自然度最高", eta: "20s", tag: "推荐" },
  "ElevenLabs":    { desc: "多语种，情感细腻", eta: "20s" },
  "Bark":          { desc: "开源，音色多样", eta: "30s" },
  "Edge TTS":      { desc: "免费稳定，覆盖广", eta: "10s" },
};

export type ShotSource = "ai" | "upload";

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
  seed?: string;              // thumbnail seed for the uploaded asset
};

export type Platform = "巨量" | "TikTok" | "腾讯广告" | "快手";
export type AspectRatio = "9:16" | "16:9" | "1:1" | "4:5";

export const PLATFORM_PRESETS: Record<Platform, { ratio: AspectRatio; duration: string }> = {
  "巨量":     { ratio: "9:16", duration: "15s" },
  "TikTok":   { ratio: "9:16", duration: "15s" },
  "腾讯广告":  { ratio: "16:9", duration: "30s" },
  "快手":     { ratio: "9:16", duration: "15s" },
};

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
  refs: { seed: string; label: string; source: string }[];  // style references — "what feel we're making"
  shots: Shot[];
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
    shots: [
      {
        no: 1, t: "0–3s", type: "ai-video", source: "ai",
        d: "黑屏，剑光劈开画面，连击数 ×1 弹出",
        model: "Kling v2.0",
        prompt: "黑屏中一道剑光从左至右劈开画面，金色连击数字 ×1 从中心弹出，震屏效果，电影感光效，竖版 9:16，暗黑风格",
        reasoning: "开场 3s 悬念钩子; Kling v2.0 光效评测 87/100, 优于 Runway (72)",
      },
      {
        no: 2, t: "3–10s", type: "gameplay", source: "upload",
        d: "连招实拍，震屏顿帧，数字飙到 ×99",
        asset: "连招实拍_v3.mp4", seed: "c1a",
        reasoning: "真实连招手感 AI 无法伪造，必须用你的实拍素材; 7s 时长覆盖注意力峰值区间",
      },
      {
        no: 3, t: "10–13s", type: "ai-video", source: "ai",
        d: "大招满屏金光，BOSS 倒地",
        model: "Kling v2.0",
        prompt: "满屏金色粒子爆发特效，巨型 BOSS 身形缓慢倒塌，慢镜头，逆光剪影，史诗感，竖版 9:16",
        reasoning: "高潮 3s 需超现实特效; Kling 粒子爆发场景内部评测最优",
      },
      {
        no: 4, t: "13–15s", type: "static", source: "ai",
        d: "logo + 「立即预约」CTA + 渠道角标",
        model: "模板引擎",
        prompt: "游戏 logo 居中，底部「立即预约」高亮按钮，右下角巨量引擎角标，品牌主色 #FFD700 + 暗底",
        reasoning: "结尾 CTA 用模板保证品牌一致性; 也可改为上传你的成品图",
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
    shots: [
      {
        no: 1, t: "0–4s", type: "gameplay", source: "upload",
        d: "世界 BOSS 红血暴击特写",
        asset: "世界BOSS_红血.mp4", seed: "c2a",
        reasoning: "Boss 红血是 MMORPG 广告 CTR 最高的开场画面; 需你的游戏内实拍，AI 无法还原 UI 与数值",
      },
      {
        no: 2, t: "4–15s", type: "gameplay", source: "upload",
        d: "多人团战协作输出，技能轮转",
        reasoning: "团战节奏感是留住观众的关键; 这段需你上传 5v1 团战实拍，覆盖完播率拐点",
      },
      {
        no: 3, t: "15–25s", type: "ai-video", source: "ai",
        d: "击杀慢镜 + 战利品掉落",
        model: "Runway Gen-4",
        prompt: "BOSS 倒地慢镜头，金色战利品从天降落散开，镜头环绕拉远，史诗配乐节奏点，竖版 9:16",
        reasoning: "慢镜回放需高质感运镜; Runway Gen-4 运镜控制评测 91/100",
      },
      {
        no: 4, t: "25–30s", type: "static", source: "ai",
        d: "结算画面 + CTA",
        model: "模板引擎",
        prompt: "副本通关结算 UI，DPS 排行 + 稀有掉落展示，底部「立即下载」按钮",
        reasoning: "CTA 复用标准模板; 也可改为上传你的成品图",
      },
      {
        no: 5, t: "0–30s", type: "vo", source: "ai",
        d: "全程热血解说配音",
        model: "Fish Audio",
        prompt: "男声，热血激昂: 「集合！世界BOSS出现了！兄弟们冲！」→「漂亮！暴击！」→「这就是团队的力量！立即下载！」",
        reasoning: "Fish Audio 中文男声自然度评测最高; 热血解说 +18% 完播率 (内部 A/B)",
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
    shots: [
      {
        no: 1, t: "0–6s", type: "gameplay", source: "upload",
        d: "御剑掠过云海第一人称实拍",
        reasoning: "第一视角飞行是 TikTok 仙侠品类滑停率最高的开场; 需你上传游戏内第一人称飞行实拍",
      },
      {
        no: 2, t: "6–12s", type: "ai-video", source: "ai",
        d: "穿出云层，世界全景展开",
        model: "Kling v2.0",
        prompt: "镜头从云层中穿出，仙侠世界全景缓缓展开，浮空岛屿、瀑布、神殿，光线穿透云缝，宏大感，竖版 9:16",
        reasoning: "全景展开需超现实场景; Kling 大场景生成评测 85/100",
      },
      {
        no: 3, t: "12–15s", type: "static", source: "ai",
        d: "「探索星轨」+ 下载角标",
        model: "模板引擎",
        prompt: "仙侠风书法字体「探索星轨」，底部 App Store/Google Play 按钮，右下角 TikTok 角标",
        reasoning: "TikTok 渠道 CTA 需符合平台风格规范; 也可改为上传你的成品图",
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
    shots: [
      {
        no: 1, t: "0–8s", type: "gameplay", source: "upload",
        d: "十连抽金光，SSR 出货实拍",
        asset: "十连抽_SSR.mp4", seed: "c4a",
        reasoning: "抽卡出货必须是真实录屏，AI 生成的抽卡 UI 可信度低; 需你的录屏素材",
      },
      {
        no: 2, t: "8–12s", type: "ai-video", source: "ai",
        d: "SSR 角色全身展示 + 技能预览",
        model: "Seedance 1.0",
        prompt: "SSR 角色全身立绘动态化，角色缓慢转身展示细节，技能特效在背景绽放，竖版 9:16",
        reasoning: "角色展示需动态化; Seedance 角色动画评测 83/100, 适合人形角色",
      },
      {
        no: 3, t: "12–15s", type: "static", source: "ai",
        d: "「预约领 SSR」CTA",
        model: "模板引擎",
        prompt: "SSR 角色半身像 + 「预约即送 SSR」文案 + 预约按钮 + 角标",
        reasoning: "CTA 复用标准预约模板; 也可改为上传你的成品图",
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

export type ChatMsg = {
  role: "u" | "a";
  text: string;
  refs?: boolean;
  jump?: { label: string; to: number };
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

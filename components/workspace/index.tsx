"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "@phosphor-icons/react/dist/csr/Check";
import { Broadcast } from "@phosphor-icons/react/dist/csr/Broadcast";
import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { motion, AnimatePresence } from "motion/react";
import { MODEL_OPTIONS, defaultParams, initialConcepts, initialMessages, initialDeployMessages, buildInitialPlan, planCounts, mockQc, libraryVideos, img, type Concept, type Shot, type ShotVariation, type Video, type ChatMsg, type ChatAttachment, type ParamValue, type AudioGlobal, type DeployPlan, type Lifecycle } from "@/lib/data";
import { runMockAgentTurn, type AgentTurnEvent } from "@/lib/agent";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { SquaresFour } from "@phosphor-icons/react/dist/csr/SquaresFour";
import { ListBullets } from "@phosphor-icons/react/dist/csr/ListBullets";
import { DeployPanel, SuccessOverlay } from "./deploy-panel";
import { matchPlanOp, countsLine, fmtK, PLAN_CHIPS, addCreative, removeCreative } from "./plan-ops";
import { type Tab, type GenItem, type Project, initialProjects, durOf, reflowShots } from "./types";
import { SectionLabel, ReopenPill, PillBtn, NewProjectModal } from "./ui";
import { Sidebar } from "./sidebar";
import { Chat } from "./chat";
import { ConceptCard, ConceptTabs } from "./concept-card";
import { VideoTile, VideoListRow, PreviewModal } from "./media";

function parseCount(t: string): number | null {
  const m = t.match(/(\d+|[一两二三四五六七八九十])\s*条/);
  if (!m) return null;
  const CN: Record<string, number> = { 一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  return CN[m[1]] ?? parseInt(m[1], 10);
}

export default function Workspace() {
  const [tab, setTab] = useState<Tab>("create");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [activeId, setActiveId] = useState("p1");
  const [showNew, setShowNew] = useState(false);

  const [preview, setPreview] = useState<Video | null>(null);
  const [chatW, setChatW] = useState(396);
  const [chatOpen, setChatOpen] = useState(true);
  const [resizing, setResizing] = useState(false);

  const [conceptData, setConceptData] = useState<Concept[]>(() =>
    initialConcepts.map((c) => ({ ...c, shots: c.shots.map((s, i) => ({ ...s, id: s.id ?? `s${c.n}-${i}` })) })));
  const shotSeq = useRef(0);
  const [genByConcept, setGenByConcept] = useState<Record<number, GenItem[]>>({});
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [selectedConceptN, setSelectedConceptN] = useState<number>(initialConcepts[0]?.n ?? 1);
  const [messages, setMessages] = useState<ChatMsg[]>(initialMessages);
  const [deployMessages, setDeployMessages] = useState<ChatMsg[]>(initialDeployMessages);
  const [deployInput, setDeployInput] = useState("");
  const [librarySel, setLibrarySel] = useState<Set<string>>(new Set());
  // 发行计划：状态在这里，读出在投放面板，变更和确认全部走右侧对话。
  const [plan, setPlan] = useState<DeployPlan | null>(null);
  const [planEdits, setPlanEdits] = useState(0);
  const [published, setPublished] = useState(false);
  const [toast, setToast] = useState<{ msg: string; undo?: () => void } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    initialConcepts.forEach((c, ci) => c.shots.forEach((s, si) => {
      const id = s.id ?? `s${c.n}-${si}`;
      if (s.variations?.length) init[id] = s.variations[0].id;
    }));
    return init;
  });

  // 本次会话新生成的成片排最前，接到持久库存后面 —— 素材库是累积的，不是会话级的。
  const sessionVideos: Video[] = Object.values(genByConcept).flat().filter((t) => t.done)
    .map((t) => {
      const concept = conceptData.find((c) => t.id.startsWith(`g-${c.n}-`));
      return {
        id: t.id, label: t.label, channel: t.channel, dur: t.dur, ratio: t.ratio, seed: t.seed, state: "pending" as const,
        qc: mockQc(t.seed),
        tags: concept ? [concept.refTopic, `${t.ratio} 竖版`, "连击特效", "数字爽感", "买量转化"].filter(Boolean).slice(0, 5) : undefined,
        brief: concept?.title,
        lifecycle: "新素材" as const, created: "2026-07-03",
      };
    });
  const videos: Video[] = [...sessionVideos, ...libraryVideos];

  const videoById = new Map(videos.map((v) => [v.id, v]));

  const dragging = useRef(false);
  const genTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const project = projects.find((p) => p.id === activeId) ?? projects[0];

  useEffect(() => {
    const move = (e: MouseEvent) => { if (dragging.current) setChatW(Math.max(320, Math.min(640, window.innerWidth - e.clientX))); };
    const up = () => { if (dragging.current) { dragging.current = false; setResizing(false); document.body.style.userSelect = ""; document.body.style.cursor = ""; } };
    window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, []);
  useEffect(() => () => { if (genTimer.current) clearInterval(genTimer.current); }, []);
  useEffect(() => {
    const hasPending = Object.values(genByConcept).some((arr) => arr.some((t) => !t.done));
    if (!hasPending) { if (genTimer.current) { clearInterval(genTimer.current); genTimer.current = null; } return; }
    if (genTimer.current) return;
    genTimer.current = setInterval(() => {
      const now = Date.now();
      setGenByConcept((prev) => {
        let changed = false;
        const next: Record<number, GenItem[]> = {};
        for (const k of Object.keys(prev)) {
          next[Number(k)] = prev[Number(k)].map((t) => {
            if (!t.done && (t.readyAt ?? 0) <= now) { changed = true; return { ...t, done: true }; }
            return t;
          });
        }
        return changed ? next : prev;
      });
    }, 300);
  }, [genByConcept]);

  function generateConcept(n: number, count = 1) {
    const c = conceptData.find((c) => c.n === n);
    if (!c) return;
    const now = Date.now();
    // 成片 = 每镜「选用」的那条 clip 剪到一起。poster 取自这些 clip，而非独立随机种子。
    const clipSeeds = c.shots.filter((s) => s.type !== "vo").map((s) => {
      const v = s.variations?.find((x) => x.id === (s.id ? selectedVariations[s.id] : undefined)) ?? s.variations?.[0];
      return v?.seed ?? s.seed;
    }).filter((x): x is string => !!x);
    const items: GenItem[] = [];
    for (let v = 1; v <= count; v++) {
      const poster = clipSeeds.length ? clipSeeds[(v - 1) % clipSeeds.length] : `gen${n}${v}`;
      items.push({ id: `g-${n}-${v}`, label: count > 1 ? `${c.short} 剪辑 v${v}` : c.short, channel: c.platform, dur: c.duration, ratio: c.aspectRatio, seed: poster, done: false, readyAt: now + 4200 + v * 1500 });
    }
    setGenByConcept((prev) => ({ ...prev, [n]: items }));
    setSelectedConceptN(n);
    showToast(count > 1 ? `正在剪 ${count} 条成片` : "正在剪成片");
  }
  function showToast(msg: string, undo?: () => void) {
    setToast({ msg, undo });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), undo ? 4500 : 2400);
  }
  function dismissConcept(n: number) {
    const c = conceptData.find((x) => x.n === n);
    setDismissed((p) => new Set(p).add(n));
    showToast(`已忽略「${c?.title ?? ""}」`, () => restoreConcept(n));
  }
  function restoreConcept(n: number) { setDismissed((p) => { const s = new Set(p); s.delete(n); return s; }); }
  function restoreDismissed() { setDismissed(new Set()); }
  function addConcept() {
    const n = conceptData.reduce((m, c) => Math.max(m, c.n), 0) + 1;
    const base = conceptData.find((c) => c.n === selectedConceptN) ?? conceptData[0];
    // Number manual concepts so repeated + clicks don't all read "新概念".
    const manual = conceptData.filter((c) => c.title.startsWith("新概念")).length;
    const name = manual === 0 ? "新概念" : `新概念 ${manual + 1}`;
    const fresh: Concept = {
      n, title: name, short: name, sel: false,
      platform: base.platform, aspectRatio: base.aspectRatio, duration: base.duration,
      reasoning: "", refTopic: base.refTopic, refs: [], shots: [],
    };
    setConceptData((prev) => [...prev, fresh]);
    setDismissed((p) => { const s = new Set(p); s.delete(n); return s; });
    setSelectedConceptN(n);
  }
  /* 计划展开后，勾选/取消不只是改选择集 —— 直接把素材加进/移出计划的所有广告组，
     agent 在对话里播报增减和新的计划规模（活链接，选素材和定计划不再是单向闸门）。 */
  function toggleLibrary(id: string) {
    const selecting = !librarySel.has(id);
    setLibrarySel((p) => { const s = new Set(p); selecting ? s.add(id) : s.delete(id); return s; });
    if (plan) {
      const [next, msg] = selecting ? addCreative(plan, id) : removeCreative(plan, id);
      setPlan(next);
      setPlanEdits((n) => n + 1);
      const v = videoById.get(id);
      setDeployMessages((m) => [...m, { role: "a", text: `${v ? `「${v.label}」` : "素材"}${msg} ${countsLine(next)}` }]);
    }
  }
  function clearLibrarySel() { setLibrarySel(new Set()); }
  function mutateShots(cn: number, fn: (shots: Shot[]) => Shot[]) {
    setConceptData((prev) => prev.map((c) => (c.n === cn ? { ...c, shots: reflowShots(fn(c.shots), durOf(c.duration)) } : c)));
  }
  function reorderShots(cn: number, orderedIds: string[]) {
    mutateShots(cn, (shots) => {
      const byId = new Map(shots.map((s) => [s.id, s]));
      return orderedIds.map((id) => byId.get(id)).filter((s): s is Shot => !!s);
    });
  }
  function deleteShot(cn: number, no: number) {
    mutateShots(cn, (shots) => (shots.length > 1 ? shots.filter((s) => s.no !== no) : shots));
  }
  function addShot(cn: number) {
    mutateShots(cn, (shots) => [...shots, { id: `s-new-${shotSeq.current++}`, no: 999, t: "0–3s", type: "ai-video", source: "ai", d: "新镜头", model: MODEL_OPTIONS["ai-video"][0], prompt: "", reasoning: "" }]);
  }
  // ── Agent turn ─────────────────────────────────────────────────────────────
  // Events (lib/agent.ts) are applied to the LAST agent message. The mock driver
  // and the real backend stream speak the same protocol — to go live, replace
  // runMockAgentTurn with a driver that maps SSE/WebSocket events onto
  // AgentTurnEvent and this function stays untouched. See docs/agent-contract.md.
  const cancelTurn = useRef<(() => void) | null>(null);
  useEffect(() => () => cancelTurn.current?.(), []);
  function applyAgentEvent(ev: AgentTurnEvent) {
    setMessages((m) => {
      const i = m.length - 1;
      const msg = m[i];
      if (!msg || msg.role !== "a") return m;
      const next = [...m];
      if (ev.type === "step_start") next[i] = { ...msg, steps: [...(msg.steps ?? []), ev.step] };
      else if (ev.type === "step_update") next[i] = { ...msg, steps: (msg.steps ?? []).map((s) => (s.id === ev.id ? { ...s, ...ev.patch } : s)) };
      else if (ev.type === "text_delta") next[i] = { ...msg, text: msg.text + ev.delta };
      else if (ev.type === "turn_done") next[i] = { ...msg, streaming: false };
      else if (ev.type === "turn_error") next[i] = { ...msg, streaming: false, text: msg.text || `出错了：${ev.message}` };
      return next;
    });
  }
  function send(text: string, attachments?: ChatAttachment[]) {
    const t = text.trim();
    if (!t && !(attachments && attachments.length)) return;
    cancelTurn.current?.();
    setMessages((m) => [...m, { role: "u", text: t, attachments }, { role: "a", text: "", steps: [], streaming: true }]);
    cancelTurn.current = runMockAgentTurn(t, applyAgentEvent);
  }
  /* ── 投放助手：素材库 + 投放面板共用的一条对话 ──
     计划存在时，自由文本优先当作计划变更（plan-ops 启发式）；
     否则解析选素材意图（路径 B），或把手动勾选接进流程（路径 A）。
     生成计划、调整、确认发布，全部在这条对话里完成。 */
  function sendDeploy(text: string, attachments?: ChatAttachment[]) {
    const t = text.trim();
    if (!t && !(attachments && attachments.length)) return;
    setDeployMessages((m) => [...m, { role: "u", text: t, attachments }]);
    setDeployInput("");

    let reply: ChatMsg;
    if (plan) {
      const op = matchPlanOp(plan, t);
      if (op) {
        const [next, msg] = op;
        setPlan(next);
        setPlanEdits((n) => n + 1);
        reply = { role: "a", text: `${msg}\n${countsLine(next)}` };
      } else if (/(发布|提交|确认|投出去)/.test(t)) {
        const c = planCounts(plan);
        reply = { role: "a", text: `确认一下：将向 ${c.channels} 个渠道创建 ${c.ads} 条广告（${c.series} 系列 · ${c.groups} 组），合计 ${fmtK(c.budget)}/天。提交后进入盯盘，随时可暂停或调价。`, action: { id: "publish", label: `确认发布 ${c.ads} 条广告` } };
      } else {
        reply = { role: "a", text: "明白。可以直接说预算/地区/出价/素材的调整，比如「日本预算砍 30%」「加投韩国」「全改 CPI」，我会即时更新左边的投放面板；说「发布」就进入最终确认。" };
      }
    } else if (videos.length === 0) {
      reply = { role: "a", text: "素材库还是空的 —— 先回「素材」把成片生成出来，我再帮你挑着投。" };
    } else if (/(生成计划|投放|投出去|发布|开始投|下一步)/.test(t) && !/(帮我|挑)/.test(t) && librarySel.size > 0) {
      reply = { role: "a", text: `好，就用你选中的 ${librarySel.size} 条素材。点下面进入第 2 步，渠道、预算、出价我一次性铺好，然后在这里继续聊着改。`, action: { id: "plan", label: `生成发行计划 (${librarySel.size} 条)` } };
    } else {
      const chan = /tiktok/i.test(t) ? "TikTok" : /巨量/.test(t) ? "巨量" : /快手/.test(t) ? "快手" : /腾讯/.test(t) ? "腾讯广告" : null;
      const vertical = /(竖屏|9\s*[:：比]\s*16)/.test(t);
      const n = parseCount(t) ?? 3;
      let pool = videos;
      if (chan) pool = pool.filter((v) => v.channel === chan);
      if (vertical) pool = pool.filter((v) => v.ratio === "9:16");
      const fellBack = pool.length === 0;
      if (fellBack) pool = videos;
      const ranked = [...pool].sort((a, b) => (b.qc?.total ?? 0) - (a.qc?.total ?? 0));
      const picked = ranked.slice(0, Math.max(1, Math.min(n, ranked.length)));
      setLibrarySel(new Set(picked.map((v) => v.id)));
      reply = {
        role: "a",
        text: fellBack
          ? `没找到完全匹配的素材，先按质检分给你圈了 ${picked.length} 条（已在左边选中）。不合适直接说，或自己增减勾选。`
          : `按${chan ? ` ${chan} ` : ""}${vertical ? "竖屏" : ""}质检分排序，我圈了这 ${picked.length} 条（已在左边选中，均分 ${Math.round(picked.reduce((s, v) => s + (v.qc?.total ?? 0), 0) / picked.length)}）。不合适直接说，或自己增减勾选。`,
        picks: picked.map((v) => ({ id: v.id, seed: v.seed, label: v.label })),
        action: { id: "plan", label: `确认 · 生成发行计划 (${picked.length} 条)` },
      };
    }
    window.setTimeout(() => setDeployMessages((m) => [...m, reply]), 600);
  }

  function startPlan() {
    if (librarySel.size === 0) return;
    const p = buildInitialPlan(Array.from(librarySel));
    setPlan(p);
    setPlanEdits(0);
    setPublished(false);
    const c = planCounts(p);
    setDeployMessages((m) => [...m, {
      role: "a",
      text: `已按 ${librarySel.size} 条素材展开发行计划 → ${c.channels} 渠道 · ${c.series} 广告系列 · ${c.ads} 广告 · ${fmtK(c.budget)}/天。预算和出价按巨量引擎 Q2 同品类跑量数据分配，各渠道拆分规则已按历史最优设好。计划在中间的投放面板里，两点要你确认：`,
      flags: [
        { tone: "warn", text: "日本 CPI 偏高，预算先给了保守值，跑稳再加。" },
        { tone: "info", text: "AppLovin 只在美国跑 —— 日韩量级不够，跑了也浪费。" },
      ],
    }]);
  }
  function requestPublish() {
    if (!plan) return;
    const c = planCounts(plan);
    setDeployMessages((m) => [...m, { role: "a", text: `确认一下：将向 ${c.channels} 个渠道创建 ${c.ads} 条广告（${c.series} 系列 · ${c.groups} 组），合计 ${fmtK(c.budget)}/天。提交后进入盯盘，随时可暂停或调价。`, action: { id: "publish", label: `确认发布 ${c.ads} 条广告` } }]);
  }
  function deployAction(id: string) {
    if (id === "plan") startPlan();
    else if (id === "publish") setPublished(true);
  }
  function exitPublished() {
    const c = plan ? planCounts(plan) : null;
    setPublished(false);
    setPlan(null);
    setLibrarySel(new Set());
    if (c) setDeployMessages((m) => [...m, { role: "a", text: `${c.ads} 条广告已进入学习期，我在盯盘里守着，有异动第一时间在这里提醒你。你在对话里的 ${planEdits} 处调整已写入数据集。` }]);
  }
  function closePlan() {
    setPlan(null);
    setDeployMessages((m) => [...m, { role: "a", text: "计划已收起（草稿保留在对话里）。想重新展开，随时说「按选中的素材生成计划」。" }]);
  }
  function createProject(name: string, desc: string) {
    const id = "p" + (projects.length + 1) + Math.floor(performance.now() % 1000);
    setProjects((p) => [...p, { id, name: name || "未命名项目", desc }]);
    setActiveId(id); setShowNew(false); setTab("create"); setPlan(null);
    setConceptData(initialConcepts.map((c) => ({ ...c, shots: c.shots.map((s, i) => ({ ...s, id: s.id ?? `s${c.n}-${i}` })) })));
    setGenByConcept({}); setDismissed(new Set());
  }
  function patchShot(cn: number, no: number, patch: Partial<Shot>) {
    setConceptData((prev) => prev.map((c) => (c.n === cn ? { ...c, shots: c.shots.map((s) => (s.no === no ? { ...s, ...patch } : s)) } : c)));
  }
  function setShotModel(cn: number, no: number, m: string) { patchShot(cn, no, { model: m, params: defaultParams(m) }); }
  function setShotPrompt(cn: number, no: number, p: string) { patchShot(cn, no, { prompt: p }); }
  function setShotParam(cn: number, no: number, key: string, value: ParamValue) {
    setConceptData((prev) => prev.map((c) => (c.n === cn ? { ...c, shots: c.shots.map((s) => {
      if (s.no !== no) return s;
      const base = s.params ?? defaultParams(s.model ?? "");
      return { ...s, params: { ...base, [key]: value } };
    }) } : c)));
  }
  // ── Uploads ────────────────────────────────────────────────────────────────
  // Prototype: object URLs (session-local). ★ BACKEND: POST the file to the media
  // endpoint and store the returned URL instead — the shape stays the same.
  function setShotAsset(cn: number, no: number, file: File) {
    patchShot(cn, no, { asset: file.name, assetUrl: URL.createObjectURL(file), assetKind: file.type.startsWith("video") ? "video" : "image", seed: undefined });
    showToast(`已上传「${file.name}」`);
  }
  function addConceptRef(file: File) {
    const kind = file.type.startsWith("video") ? "video" as const : "image" as const;
    const ref = { seed: `up-${Date.now()}`, label: file.name, source: "你上传", url: URL.createObjectURL(file), kind };
    setConceptData((prev) => prev.map((c) => (c.n === selectedConceptN ? { ...c, refs: [...c.refs, ref] } : c)));
    showToast(`已添加参考「${file.name}」`);
  }
  function replaceConceptRef(video: Video, file: File) {
    if (!video.refMeta) return;
    const { cn, seed } = video.refMeta;
    const kind = file.type.startsWith("video") ? "video" as const : "image" as const;
    setConceptData((prev) => prev.map((c) => (c.n === cn ? { ...c, refs: c.refs.map((r) => (r.seed === seed ? { ...r, label: file.name, source: "你上传", url: URL.createObjectURL(file), kind } : r)) } : c)));
    setPreview(null);
    showToast(`参考已替换为「${file.name}」`);
  }
  function setShotSfx(cn: number, no: number, v: string) { patchShot(cn, no, { sfx: v }); }
  function setShotVoLine(cn: number, no: number, v: string) { patchShot(cn, no, { voLine: v }); }
  function setConceptBgm(cn: number, a: AudioGlobal) {
    setConceptData((prev) => prev.map((c) => (c.n === cn ? { ...c, bgm: a } : c)));
  }
  function setConceptVoStyle(cn: number, a: AudioGlobal) {
    setConceptData((prev) => prev.map((c) => (c.n === cn ? { ...c, voStyle: a } : c)));
  }
  function generateShotVariation(cn: number, no: number) {
    setConceptData((prev) => prev.map((c) => {
      if (c.n !== cn) return c;
      return { ...c, shots: c.shots.map((s) => {
        if (s.no !== no) return s;
        const vars = s.variations ?? [];
        const delay = 2800 + ((no - 1) % 6) * 1100 + vars.length * 800;   // staggered per shot → parallel, realistic wait
        const newVar: ShotVariation = { id: `v-${s.id}-${vars.length + 1}`, seed: `gen-${cn}-${no}-${vars.length + 1}`, done: false, readyAt: Date.now() + delay };
        return { ...s, variations: [...vars, newVar] };
      }) };
    }));
  }
  function bulkGenerateVariations(cn: number) {
    const c = conceptData.find((c) => c.n === cn);
    if (!c) return;
    const targets = c.shots.filter((s) => s.type !== "vo" && (!s.variations || s.variations.length === 0));
    targets.forEach((s) => generateShotVariation(cn, s.no));
    if (targets.length) showToast(`开始生成 ${targets.length} 个镜头`);
  }
  function selectVariation(cn: number, no: number, varId: string) {
    const c = conceptData.find((c) => c.n === cn);
    const shot = c?.shots.find((s) => s.no === no);
    if (shot?.id) setSelectedVariations((prev) => ({ ...prev, [shot.id!]: varId }));
  }

  // Tick generating takes to done when their (mock) generation time elapses.
  // Time-based so shots generate in parallel and finish staggered, like real AI gen.
  useEffect(() => {
    const hasPending = conceptData.some((c) => c.shots.some((s) => s.variations?.some((v) => !v.done)));
    if (!hasPending) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setConceptData((prev) => {
        let changed = false;
        const next = prev.map((c) => ({
          ...c,
          shots: c.shots.map((s) => {
            if (!s.variations?.some((v) => !v.done && (v.readyAt ?? 0) <= now)) return s;
            return { ...s, variations: s.variations.map((v) => {
              if (!v.done && (v.readyAt ?? 0) <= now) { changed = true; return { ...v, done: true }; }
              return v;
            }) };
          }),
        }));
        return changed ? next : prev;
      });
    }, 300);
    return () => clearInterval(timer);
  }, [conceptData]);

  // The chat is the constant right rail in both tabs. In 投放 it is the single
  // place where the plan is built, mutated, and confirmed; the middle shows
  // 素材库 + 投放面板 side by side as its live read-out.
  const deployChat = tab === "deploy";
  // Stage-aware one-tap prompts: the chips always point at the current step's next move.
  const deploySuggestions = plan
    ? PLAN_CHIPS.map((c) => c.label)
    : librarySel.size > 0
      ? [`用选中的 ${librarySel.size} 条生成计划`, "帮我挑质检分最高的 3 条", "选 3 条巨量竖屏"]
      : ["帮我挑质检分最高的 3 条", "选 3 条巨量竖屏", "帮我挑 3 条 TikTok 竖屏"];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar projects={projects} activeId={activeId} onSelect={(id) => { setActiveId(id); setTab("create"); setPlan(null); }} onNew={() => setShowNew(true)}
        tab={tab} onTab={setTab} deployCount={videos.length}
        collapsed={!sidebarOpen} onToggle={() => setSidebarOpen((o) => !o)} onToast={showToast} />

      <ProjectView
        project={project} tab={tab} onTab={setTab}
        chatOpen={chatOpen} onReopenChat={() => setChatOpen(true)}
        conceptData={conceptData} dismissed={dismissed} genByConcept={genByConcept}
        selectedConceptN={selectedConceptN} onSelectConcept={setSelectedConceptN}
        onGenerateConcept={generateConcept} onDismissConcept={dismissConcept} onRestoreConcept={restoreConcept} onRestoreDismissed={restoreDismissed} onAddConcept={addConcept}
        onReorderShots={reorderShots} onDeleteShot={deleteShot} onAddShot={addShot}
        videos={videos} videoById={videoById} librarySel={librarySel} onToggleLib={toggleLibrary} onClearLib={clearLibrarySel}
        plan={plan} planEdits={planEdits} onStartPlan={startPlan} onClosePlan={closePlan}
        onAskEdit={(label) => { setDeployInput(`把 ${label} 的日预算改成 `); setChatOpen(true); }}
        onRequestPublish={requestPublish}
        onPreview={setPreview}
        onSetShotModel={setShotModel} onSetShotPrompt={setShotPrompt} onSetShotParam={setShotParam}
        onSetShotSfx={setShotSfx} onSetShotVoLine={setShotVoLine} onSetShotAsset={setShotAsset}
        onAddRef={addConceptRef}
        onSetBgm={setConceptBgm} onSetVoStyle={setConceptVoStyle}
        selectedVariations={selectedVariations}
        onGenerateVariation={generateShotVariation} onBulkGenerate={bulkGenerateVariations}
        onSelectVariation={selectVariation}
        onPreviewVariation={(shot, v) => {
          setPreview({ id: v.id, label: `镜头 ${shot.no}`, channel: "", dur: "", ratio: "9:16", seed: v.seed, state: "pending" });
        }}
      />

      {/* Handle + chat panel animate as ONE block so the middle never snaps
          (folding the 7px handle in avoids the instant width jump on open).
          Spring only for the open/close toggle; instant while dragging so the
          resize follows the cursor with no rubber-band lag. */}
      <motion.div className="overflow-hidden shrink-0 flex" animate={{ width: chatOpen ? chatW + 7 : 0 }} transition={resizing ? { duration: 0 } : { type: "spring", stiffness: 280, damping: 26 }}>
        <div className="w-[7px] shrink-0 cursor-col-resize relative group z-10 bg-canvassoft"
          onMouseDown={() => { dragging.current = true; setResizing(true); document.body.style.userSelect = "none"; document.body.style.cursor = "col-resize"; }}>
          <span className="absolute left-0 top-0 bottom-0 w-px bg-hairline group-hover:bg-primary group-hover:w-0.5" />
          <span className="absolute top-[48px] left-0 right-0 h-px bg-hairline" />
        </div>
        <div style={{ width: chatW }} className="h-full shrink-0">
          <Chat project={project}
            messages={deployChat ? deployMessages : messages}
            onClose={() => setChatOpen(false)}
            onSend={deployChat ? sendDeploy : send}
            badge={deployChat ? (plan ? "投放助手 · ② 定计划" : "投放助手 · ① 选素材") : undefined}
            placeholder={deployChat ? (plan ? "调整计划，例如「日本预算砍 30%」，或说「发布」…" : "说投放意图，或让我帮你挑素材…") : undefined}
            suggestions={deployChat ? deploySuggestions : undefined}
            onSuggest={sendDeploy}
            onAction={deployAction}
            composer={deployChat ? { value: deployInput, onChange: setDeployInput } : undefined} />
        </div>
      </motion.div>

      <PreviewModal video={preview} onClose={() => setPreview(null)} onReplaceRef={replaceConceptRef} />
      <NewProjectModal open={showNew} onClose={() => setShowNew(false)} onCreate={createProject} />

      <AnimatePresence>
        {published && plan && <SuccessOverlay counts={planCounts(plan)} edits={planEdits} onExit={exitPublished} />}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.97 }} transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2.5 bg-ink text-white pl-3 pr-3 py-2.5 rounded-full shadow-[0_10px_36px_rgba(0,0,0,0.28)]">
            <span className="w-5 h-5 rounded-full bg-pass grid place-items-center shrink-0"><Check size={12} weight="bold" /></span>
            <span className="text-[13px] font-medium">{toast.msg}</span>
            {toast.undo && <button onClick={() => { toast.undo!(); setToast(null); }} className="text-[12.5px] font-semibold text-white/90 hover:text-white bg-white/15 hover:bg-white/25 rounded-full px-2.5 py-1 transition-colors shrink-0">撤销</button>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterGroup({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[11px] text-faint mr-0.5">{label}</span>
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)} className={`text-[11.5px] px-2.5 py-[3px] rounded-full border transition-colors ${value === o ? "bg-tint text-primary border-tintborder font-semibold" : "bg-surface text-muted border-hairline hover:bg-canvas"}`}>{o}</button>
      ))}
    </div>
  );
}

/* 旅程指示器 —— 让用户永远知道自己在投放流程的哪一步。 */
function JourneySteps({ stage }: { stage: 1 | 2 | 3 }) {
  const steps = ["选素材", "定计划", "发布"];
  return (
    <div className="flex items-center gap-1.5">
      {steps.map((s, i) => {
        const n = i + 1;
        const state = n < stage ? "done" : n === stage ? "current" : "todo";
        return (
          <div key={s} className="flex items-center gap-1.5">
            {i > 0 && <span className={`w-4 h-px ${n <= stage ? "bg-ink2" : "bg-hairline"}`} />}
            <span className={`inline-flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-[3px] text-[11.5px] font-medium border transition-colors ${state === "current" ? "bg-ink text-white border-ink" : state === "done" ? "bg-surface text-ink2 border-hairline" : "text-faint border-transparent"}`}>
              <span className={`w-[17px] h-[17px] rounded-full grid place-items-center text-[10px] font-bold ${state === "current" ? "bg-white/25 text-white" : state === "done" ? "bg-pass text-white" : "bg-hair2 text-muted"}`}>
                {state === "done" ? <Check size={10} weight="bold" /> : n}
              </span>
              {s}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ProjectView(props: {
  project: Project; tab: Tab; onTab: (t: Tab) => void; chatOpen: boolean; onReopenChat: () => void;
  conceptData: Concept[]; dismissed: Set<number>; genByConcept: Record<number, GenItem[]>;
  selectedConceptN: number; onSelectConcept: (n: number) => void;
  onGenerateConcept: (n: number, count: number) => void; onDismissConcept: (n: number) => void; onRestoreConcept: (n: number) => void; onRestoreDismissed: () => void; onAddConcept: () => void;
  onReorderShots: (cn: number, orderedIds: string[]) => void; onDeleteShot: (cn: number, no: number) => void; onAddShot: (cn: number) => void;
  videos: Video[]; videoById: Map<string, Video>; librarySel: Set<string>; onToggleLib: (id: string) => void; onClearLib: () => void; onPreview: (v: Video) => void;
  plan: DeployPlan | null; planEdits: number; onStartPlan: () => void; onClosePlan: () => void;
  onAskEdit: (label: string) => void; onRequestPublish: () => void;
  onSetShotModel: (cn: number, no: number, m: string) => void; onSetShotPrompt: (cn: number, no: number, p: string) => void; onSetShotParam: (cn: number, no: number, key: string, value: ParamValue) => void;
  onSetShotSfx: (cn: number, no: number, v: string) => void; onSetShotVoLine: (cn: number, no: number, v: string) => void;
  onSetShotAsset: (cn: number, no: number, file: File) => void; onAddRef: (file: File) => void;
  onSetBgm: (cn: number, a: AudioGlobal) => void; onSetVoStyle: (cn: number, a: AudioGlobal) => void;
  selectedVariations: Record<string, string>;
  onGenerateVariation: (cn: number, no: number) => void; onBulkGenerate: (cn: number) => void;
  onSelectVariation: (cn: number, no: number, varId: string) => void;
  onPreviewVariation: (shot: Shot, v: ShotVariation) => void;
}) {
  const { project, tab, onTab, chatOpen, onReopenChat, conceptData, dismissed, genByConcept, selectedConceptN, onSelectConcept, onGenerateConcept, onDismissConcept, onRestoreConcept, onRestoreDismissed, onAddConcept, onReorderShots, onDeleteShot, onAddShot, videos, videoById, librarySel, onToggleLib, onClearLib, plan, planEdits, onStartPlan, onClosePlan, onAskEdit, onRequestPublish, onPreview, onSetShotModel, onSetShotPrompt, onSetShotParam, onSetShotSfx, onSetShotVoLine, onSetShotAsset, onAddRef, onSetBgm, onSetVoStyle, selectedVariations, onGenerateVariation, onBulkGenerate, onSelectVariation, onPreviewVariation } = props;

  /* ── 素材库管理状态：上百条素材靠这套 sort/filter/搜索活着 ── */
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("全部");           // 渠道
  const [ratioF, setRatioF] = useState("全部");           // 画幅
  const [statusF, setStatusF] = useState("全部");         // 生命周期
  const [hiQc, setHiQc] = useState(false);                // 质检 ≥ 80
  const [sort, setSort] = useState<"质检分" | "最新" | "CTR" | "花费">("质检分");
  const [view, setView] = useState<"grid" | "list">("grid");

  const channels = ["全部", ...Array.from(new Set(videos.map((v) => v.channel)))];
  const shown = videos
    .filter((v) =>
      (filter === "全部" || v.channel === filter) &&
      (ratioF === "全部" || v.ratio === ratioF) &&
      (statusF === "全部" || v.lifecycle === statusF) &&
      (!hiQc || (v.qc?.total ?? 0) >= 80) &&
      (!q.trim() || v.label.includes(q.trim()) || (v.tags ?? []).some((t) => t.includes(q.trim()))))
    .sort((a, b) => {
      if (sort === "质检分") return (b.qc?.total ?? 0) - (a.qc?.total ?? 0);
      if (sort === "最新") return (b.created ?? "").localeCompare(a.created ?? "");
      if (sort === "CTR") return (b.perf?.ctr ?? -1) - (a.perf?.ctr ?? -1);
      return (b.perf?.spend ?? -1) - (a.perf?.spend ?? -1);
    });
  const selectedVideos = videos.filter((v) => librarySel.has(v.id));
  const avgQc = selectedVideos.length ? Math.round(selectedVideos.reduce((s, v) => s + (v.qc?.total ?? 0), 0) / selectedVideos.length) : 0;
  const visibleConcepts = conceptData.filter((c) => !dismissed.has(c.n));
  const dismissedCount = dismissed.size;
  const dismissedConcepts = conceptData.filter((c) => dismissed.has(c.n));
  const selectedConcept = visibleConcepts.find((c) => c.n === selectedConceptN) ?? visibleConcepts[0];

  return (
    <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
      <div className="relative z-10 bg-surface border-b border-hairline px-5 h-[49px] shrink-0 flex items-center gap-3">
        <div className="text-[13px] font-semibold tracking-tight whitespace-nowrap text-ink2">{project.name}{project.desc && <span className="text-faint font-normal text-[12px]"> · {project.desc}</span>}</div>
        <span className="flex-1" />
        {tab === "create" ? (
          <ReopenPill show={!chatOpen} onClick={onReopenChat} />
        ) : (
          /* 投放旅程：① 选素材 → ② 定计划 → ③ 发布。stepper 标当前位置，
             每个阶段只保留一个主 CTA，不再同时晾四个入口。 */
          <>
            <JourneySteps stage={plan ? 2 : 1} />
            <span className="flex-1" />
            {plan && <PillBtn onClick={onClosePlan}>← 返回选素材</PillBtn>}
            <ReopenPill show={!chatOpen} onClick={onReopenChat} />
          </>
        )}
      </div>

      {tab === "create" ? (
        <div className="flex-1 min-h-0 flex flex-col px-4 pt-3 pb-3">
          <ConceptTabs concepts={visibleConcepts} selectedN={selectedConcept?.n ?? -1} onSelect={onSelectConcept} onDismiss={onDismissConcept} onPreview={onPreview} gen={genByConcept} dismissedConcepts={dismissedConcepts} onRestoreConcept={onRestoreConcept} onRestoreAll={onRestoreDismissed} onAddConcept={onAddConcept} onAddRef={onAddRef} />
          {selectedConcept ? (
            <div className="flex-1 min-h-0">
              <ConceptCard key={selectedConcept.n} c={selectedConcept} gen={genByConcept[selectedConcept.n]} onGenerate={(count) => onGenerateConcept(selectedConcept.n, count)} onPreview={onPreview}
                onViewLibrary={() => onTab("deploy")}
                onReorderShots={onReorderShots} onDeleteShot={onDeleteShot} onAddShot={onAddShot}
                onSetShotModel={onSetShotModel} onSetShotPrompt={onSetShotPrompt} onSetShotParam={onSetShotParam}
                onSetShotSfx={onSetShotSfx} onSetShotVoLine={onSetShotVoLine} onSetShotAsset={onSetShotAsset}
                onSetBgm={onSetBgm} onSetVoStyle={onSetVoStyle}
                selectedVariations={selectedVariations}
                onGenerateVariation={onGenerateVariation} onBulkGenerate={onBulkGenerate}
                onSelectVariation={onSelectVariation}
                onPreviewVariation={onPreviewVariation} />
            </div>
          ) : (
            <div className="flex-1 grid place-items-center text-center">
              <div>
                <div className="text-[14px] font-semibold text-ink2">没有方案了</div>
                <div className="text-[12.5px] text-muted mt-1">所有方案都被忽略了。</div>
                {dismissedCount > 0 && <button onClick={onRestoreDismissed} className="mt-4 text-[13px] font-medium rounded-full px-4 py-2 border border-hairline hover:bg-canvas">恢复已忽略的方案</button>}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 投放 tab 的中间区，两个相邻的东西，主次随任务阶段反转：
           无计划 → 素材库是主画布（挑素材阶段）；
           计划展开 → 投放面板成为主画布（审计划阶段），素材库收成左侧源素材栏，
           依然可勾选/预览，不消失。 */
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {plan ? (
            /* ── 阶段 2：素材库收成源素材栏，但仍是活的 —— 勾选/取消直接增减计划里的广告 ── */
            <div className="w-[200px] shrink-0 border-r border-hairline bg-canvassoft flex flex-col overflow-hidden">
              <div className="px-3 pt-3 pb-2 shrink-0">
                <SectionLabel>素材库 · 勾选即入计划</SectionLabel>
              </div>
              <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-3">
                {shown.map((v) => <VideoTile key={v.id} v={v} onClick={onPreview} selectable selected={librarySel.has(v.id)} onToggleSel={() => onToggleLib(v.id)} />)}
              </div>
            </div>
          ) : (
            /* ── 阶段 1：素材库是管理工作台 —— 搜索/筛选/排序/双视图 + 选择托盘 ── */
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
              <div className="shrink-0 px-4 pt-3 pb-2.5 border-b border-hairline bg-surface flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-canvas border border-hairline rounded-full px-3 py-[5px] w-[220px] focus-within:border-faint transition-colors">
                    <MagnifyingGlass size={13} className="text-faint shrink-0" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜素材名 / 标签…" className="w-full bg-transparent outline-none text-[12.5px] text-ink placeholder:text-faint" />
                  </div>
                  <span className="text-[12px] text-faint tabular-nums">{shown.length} / {videos.length} 条</span>
                  <span className="flex-1" />
                  <div className="flex items-center gap-1 text-[12px] text-muted">
                    排序
                    {(["质检分", "最新", "CTR", "花费"] as const).map((s) => (
                      <button key={s} onClick={() => setSort(s)} className={`px-2.5 py-1 rounded-full text-[12px] border transition-colors ${sort === s ? "bg-ink text-white border-ink" : "bg-surface text-ink2 border-hairline hover:bg-canvas"}`}>{s}</button>
                    ))}
                  </div>
                  <div className="flex items-center rounded-full border border-hairline overflow-hidden ml-1">
                    <button onClick={() => setView("grid")} aria-label="网格视图" className={`w-8 h-[26px] grid place-items-center transition-colors ${view === "grid" ? "bg-ink text-white" : "text-muted hover:bg-canvas"}`}><SquaresFour size={14} weight={view === "grid" ? "fill" : "regular"} /></button>
                    <button onClick={() => setView("list")} aria-label="列表视图" className={`w-8 h-[26px] grid place-items-center transition-colors ${view === "list" ? "bg-ink text-white" : "text-muted hover:bg-canvas"}`}><ListBullets size={14} weight="bold" /></button>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <FilterGroup label="渠道" value={filter} options={channels} onChange={setFilter} />
                  <FilterGroup label="画幅" value={ratioF} options={["全部", "9:16", "16:9", "1:1"]} onChange={setRatioF} />
                  <FilterGroup label="状态" value={statusF} options={["全部", "投放中", "新素材", "衰退"]} onChange={setStatusF} />
                  <button onClick={() => setHiQc((x) => !x)} className={`text-[11.5px] px-2.5 py-[3px] rounded-full border transition-colors ${hiQc ? "bg-tint text-primary border-tintborder font-semibold" : "bg-surface text-muted border-hairline hover:bg-canvas"}`}>质检 ≥ 80</button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3">
                {shown.length > 0 ? (
                  view === "grid" ? (
                    <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))" }}>
                      {shown.map((v) => <VideoTile key={v.id} v={v} onClick={onPreview} selectable selected={librarySel.has(v.id)} onToggleSel={() => onToggleLib(v.id)} />)}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-3 px-2.5 pb-1.5 text-[10.5px] uppercase tracking-wide text-faint font-semibold">
                        <span className="w-[18px]" /><span className="w-7" /><span className="flex-1">素材</span>
                        <span className="w-16">渠道</span><span className="w-[76px]">规格</span><span className="w-[92px]">质检</span>
                        <span className="w-[52px] text-right">CTR</span><span className="w-[64px] text-right">花费</span><span className="w-[58px] text-right">状态</span>
                      </div>
                      {shown.map((v) => <VideoListRow key={v.id} v={v} selected={librarySel.has(v.id)} onToggleSel={() => onToggleLib(v.id)} onClick={onPreview} />)}
                    </div>
                  )
                ) : (
                  <div className="h-full grid place-items-center text-center py-20">
                    <div>
                      <div className="text-[14px] font-semibold text-ink2">没有匹配的素材</div>
                      <div className="text-[12.5px] text-muted mt-1">换个筛选条件，或清空搜索词试试。</div>
                    </div>
                  </div>
                )}
              </div>

              {/* 选择托盘：选中即出现，是通往第 2 步的唯一 CTA */}
              <AnimatePresence>
                {librarySel.size > 0 && (
                  <motion.div initial={{ y: 56, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 56, opacity: 0 }} transition={{ type: "spring", stiffness: 360, damping: 30 }}
                    className="shrink-0 border-t border-hairline bg-surface px-4 py-2.5 flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {selectedVideos.slice(0, 8).map((v) => (
                        <span key={v.id} className="w-7 h-12 rounded-md overflow-hidden border-2 border-surface ring-1 ring-hairline bg-black shrink-0"><img src={img(v.seed, 56, 96)} alt="" className="w-full h-full object-cover" /></span>
                      ))}
                      {selectedVideos.length > 8 && <span className="w-7 h-12 rounded-md bg-tint border-2 border-surface ring-1 ring-hairline grid place-items-center text-[10px] font-bold text-primary shrink-0">+{selectedVideos.length - 8}</span>}
                    </div>
                    <div className="text-[12.5px] text-muted">已选 <b className="text-ink font-semibold">{librarySel.size}</b> 条 · 平均质检 <b className="text-ink font-semibold tabular-nums">{avgQc}</b></div>
                    <button onClick={onClearLib} className="text-[12px] text-faint hover:text-ink2 underline underline-offset-2">清空</button>
                    <span className="flex-1" />
                    <PillBtn primary onClick={onStartPlan}><span className="inline-flex items-center gap-1.5"><Broadcast size={15} weight="fill" /> 生成计划 ({librarySel.size} 条) →</span></PillBtn>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          {plan && (
            <motion.div initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", stiffness: 300, damping: 32 }} className="flex-1 min-w-0 h-full">
              <DeployPanel plan={plan} edits={planEdits} videoById={videoById} onPreview={onPreview} onAskEdit={onAskEdit} onRequestPublish={onRequestPublish} onClose={onClosePlan} />
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

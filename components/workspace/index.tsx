"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "@phosphor-icons/react/dist/csr/Check";
import { Broadcast } from "@phosphor-icons/react/dist/csr/Broadcast";
import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { motion, AnimatePresence } from "motion/react";
import { MODEL_OPTIONS, defaultParams, initialConcepts, initialMessages, type Concept, type Shot, type ShotVariation, type Video, type ChatMsg, type ChatAttachment, type ParamValue, type AudioGlobal } from "@/lib/data";
import DeployPlanView from "../deploy-plan";
import { type Tab, type GenItem, type Project, initialProjects, durOf, reflowShots } from "./types";
import { SectionLabel, ReopenPill, PillBtn, NewProjectModal } from "./ui";
import { Sidebar } from "./sidebar";
import { Chat } from "./chat";
import { ConceptCard, ConceptTabs } from "./concept-card";
import { VideoTile, PreviewModal } from "./media";

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
  const [librarySel, setLibrarySel] = useState<Set<string>>(new Set());
  const [planOpen, setPlanOpen] = useState(false);
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

  const videos: Video[] = Object.values(genByConcept).flat().filter((t) => t.done)
    .map((t) => ({ id: t.id, label: t.label, channel: t.channel, dur: t.dur, ratio: t.ratio, seed: t.seed, state: "pending" as const }));

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
  function toggleLibrary(id: string) { setLibrarySel((p) => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; }); }
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
  function send(text: string, attachments?: ChatAttachment[]) {
    const t = text.trim();
    if (!t && !(attachments && attachments.length)) return;
    setMessages((m) => [...m, { role: "u", text: t, attachments }]);
    window.setTimeout(() => setMessages((m) => [...m, { role: "a", text: "收到，我调整一下方案 →" }]), 600);
  }
  function createProject(name: string, desc: string) {
    const id = "p" + (projects.length + 1) + Math.floor(performance.now() % 1000);
    setProjects((p) => [...p, { id, name: name || "未命名项目", desc }]);
    setActiveId(id); setShowNew(false); setTab("create"); setPlanOpen(false);
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

  const showChat = tab === "create";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar projects={projects} activeId={activeId} onSelect={(id) => { setActiveId(id); setTab("create"); setPlanOpen(false); }} onNew={() => setShowNew(true)}
        tab={tab} onTab={setTab} deployCount={videos.length}
        collapsed={!sidebarOpen} onToggle={() => setSidebarOpen((o) => !o)} onToast={showToast} />

      <ProjectView
        project={project} tab={tab} onTab={setTab}
        chatOpen={chatOpen} onReopenChat={() => setChatOpen(true)}
        conceptData={conceptData} dismissed={dismissed} genByConcept={genByConcept}
        selectedConceptN={selectedConceptN} onSelectConcept={setSelectedConceptN}
        onGenerateConcept={generateConcept} onDismissConcept={dismissConcept} onRestoreConcept={restoreConcept} onRestoreDismissed={restoreDismissed} onAddConcept={addConcept}
        onReorderShots={reorderShots} onDeleteShot={deleteShot} onAddShot={addShot}
        videos={videos} librarySel={librarySel} onToggleLib={toggleLibrary}
        planOpen={planOpen} onStartPlan={() => setPlanOpen(true)} onExitPlan={() => setPlanOpen(false)}
        onPreview={setPreview}
        onSetShotModel={setShotModel} onSetShotPrompt={setShotPrompt} onSetShotParam={setShotParam}
        onSetShotSfx={setShotSfx} onSetShotVoLine={setShotVoLine}
        onSetBgm={setConceptBgm} onSetVoStyle={setConceptVoStyle}
        selectedVariations={selectedVariations}
        onGenerateVariation={generateShotVariation} onBulkGenerate={bulkGenerateVariations}
        onSelectVariation={selectVariation}
        onPreviewVariation={(shot, v) => {
          setPreview({ id: v.id, label: `镜头 ${shot.no}`, channel: "", dur: "", ratio: "9:16", seed: v.seed, state: "pending" });
        }}
      />

      {showChat && (
        // Handle + chat panel animate as ONE block so the middle never snaps
        // (folding the 7px handle in avoids the instant width jump on open).
        // Spring only for the open/close toggle; instant while dragging so the
        // resize follows the cursor with no rubber-band lag.
        <motion.div className="overflow-hidden shrink-0 flex" animate={{ width: chatOpen ? chatW + 7 : 0 }} transition={resizing ? { duration: 0 } : { type: "spring", stiffness: 280, damping: 26 }}>
          <div className="w-[7px] shrink-0 cursor-col-resize relative group z-10 bg-canvassoft"
            onMouseDown={() => { dragging.current = true; setResizing(true); document.body.style.userSelect = "none"; document.body.style.cursor = "col-resize"; }}>
            <span className="absolute left-0 top-0 bottom-0 w-px bg-hairline group-hover:bg-primary group-hover:w-0.5" />
            <span className="absolute top-[48px] left-0 right-0 h-px bg-hairline" />
          </div>
          <div style={{ width: chatW }} className="h-full shrink-0"><Chat project={project} messages={messages} onClose={() => setChatOpen(false)} onSend={send} /></div>
        </motion.div>
      )}

      <PreviewModal video={preview} onClose={() => setPreview(null)} />
      <NewProjectModal open={showNew} onClose={() => setShowNew(false)} onCreate={createProject} />

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

function ProjectView(props: {
  project: Project; tab: Tab; onTab: (t: Tab) => void; chatOpen: boolean; onReopenChat: () => void;
  conceptData: Concept[]; dismissed: Set<number>; genByConcept: Record<number, GenItem[]>;
  selectedConceptN: number; onSelectConcept: (n: number) => void;
  onGenerateConcept: (n: number, count: number) => void; onDismissConcept: (n: number) => void; onRestoreConcept: (n: number) => void; onRestoreDismissed: () => void; onAddConcept: () => void;
  onReorderShots: (cn: number, orderedIds: string[]) => void; onDeleteShot: (cn: number, no: number) => void; onAddShot: (cn: number) => void;
  videos: Video[]; librarySel: Set<string>; onToggleLib: (id: string) => void; onPreview: (v: Video) => void;
  planOpen: boolean; onStartPlan: () => void; onExitPlan: () => void;
  onSetShotModel: (cn: number, no: number, m: string) => void; onSetShotPrompt: (cn: number, no: number, p: string) => void; onSetShotParam: (cn: number, no: number, key: string, value: ParamValue) => void;
  onSetShotSfx: (cn: number, no: number, v: string) => void; onSetShotVoLine: (cn: number, no: number, v: string) => void;
  onSetBgm: (cn: number, a: AudioGlobal) => void; onSetVoStyle: (cn: number, a: AudioGlobal) => void;
  selectedVariations: Record<string, string>;
  onGenerateVariation: (cn: number, no: number) => void; onBulkGenerate: (cn: number) => void;
  onSelectVariation: (cn: number, no: number, varId: string) => void;
  onPreviewVariation: (shot: Shot, v: ShotVariation) => void;
}) {
  const { project, tab, onTab, chatOpen, onReopenChat, conceptData, dismissed, genByConcept, selectedConceptN, onSelectConcept, onGenerateConcept, onDismissConcept, onRestoreConcept, onRestoreDismissed, onAddConcept, onReorderShots, onDeleteShot, onAddShot, videos, librarySel, onToggleLib, planOpen, onStartPlan, onExitPlan, onPreview, onSetShotModel, onSetShotPrompt, onSetShotParam, onSetShotSfx, onSetShotVoLine, onSetBgm, onSetVoStyle, selectedVariations, onGenerateVariation, onBulkGenerate, onSelectVariation, onPreviewVariation } = props;
  const planMode = tab === "deploy" && planOpen;
  const [filter, setFilter] = useState("全部");
  const channels = ["全部", ...Array.from(new Set(videos.map((v) => v.channel)))];
  const shown = filter === "全部" ? videos : videos.filter((v) => v.channel === filter);
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
        ) : planMode ? (
          <span className="text-[12.5px] text-muted inline-flex items-center gap-1.5"><Broadcast size={14} weight="fill" className="text-faint" /> 发行计划 · 对话构建 <span className="text-faint">— {librarySel.size} 条素材</span></span>
        ) : (
          <>
            <div className="flex gap-1.5">
              {channels.map((c) => <button key={c} onClick={() => setFilter(c)} className={`text-[12.5px] px-3 py-1 rounded-full border ${filter === c ? "bg-tint text-primary border-tintborder" : "bg-surface text-ink2 border-hairline hover:bg-canvas"}`}>{c}</button>)}
            </div>
            <span className="text-[12.5px] text-muted ml-1">已选 {librarySel.size}</span>
            <PillBtn primary disabled={librarySel.size === 0} onClick={onStartPlan}><span className="inline-flex items-center gap-1.5"><Broadcast size={15} weight="fill" /> 批量投放 ({librarySel.size})</span></PillBtn>
          </>
        )}
      </div>

      {planMode ? (
        <DeployPlanView creativeIds={Array.from(librarySel)} onExit={onExitPlan} />
      ) : tab === "create" ? (
        <div className="flex-1 min-h-0 flex flex-col px-4 pt-3 pb-3">
          <ConceptTabs concepts={visibleConcepts} selectedN={selectedConcept?.n ?? -1} onSelect={onSelectConcept} onDismiss={onDismissConcept} onPreview={onPreview} gen={genByConcept} dismissedConcepts={dismissedConcepts} onRestoreConcept={onRestoreConcept} onRestoreAll={onRestoreDismissed} onAddConcept={onAddConcept} />
          {selectedConcept ? (
            <div className="flex-1 min-h-0">
              <ConceptCard key={selectedConcept.n} c={selectedConcept} gen={genByConcept[selectedConcept.n]} onGenerate={(count) => onGenerateConcept(selectedConcept.n, count)} onPreview={onPreview}
                onViewLibrary={() => onTab("deploy")}
                onReorderShots={onReorderShots} onDeleteShot={onDeleteShot} onAddShot={onAddShot}
                onSetShotModel={onSetShotModel} onSetShotPrompt={onSetShotPrompt} onSetShotParam={onSetShotParam}
                onSetShotSfx={onSetShotSfx} onSetShotVoLine={onSetShotVoLine}
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
        <div className="flex-1 overflow-y-auto px-4 py-3 pb-6">
          {shown.length > 0 ? (
            <>
              <SectionLabel>素材库 · {videos.length} 个素材</SectionLabel>
              <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))" }}>
                {shown.map((v) => <VideoTile key={v.id} v={v} onClick={onPreview} selectable selected={librarySel.has(v.id)} onToggleSel={() => onToggleLib(v.id)} />)}
              </div>
            </>
          ) : (
            <div className="h-full grid place-items-center text-center py-20">
              <div>
                <div className="text-[14px] font-semibold text-ink2">还没有可投放的素材</div>
                <div className="text-[12.5px] text-muted mt-1">回到「素材」生成你满意的方案，成片会出现在这里。</div>
                <button onClick={() => onTab("create")} className="mt-4 text-[13px] font-medium rounded-full px-4 py-2 border border-hairline hover:bg-canvas">去生成素材</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

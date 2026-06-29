"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TrendUp } from "@phosphor-icons/react/dist/csr/TrendUp";
import { Star } from "@phosphor-icons/react/dist/csr/Star";
import { Folder } from "@phosphor-icons/react/dist/csr/Folder";
import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import { CaretDown } from "@phosphor-icons/react/dist/csr/CaretDown";
import { CaretLeft } from "@phosphor-icons/react/dist/csr/CaretLeft";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { DotsSixVertical } from "@phosphor-icons/react/dist/csr/DotsSixVertical";
import { Warning } from "@phosphor-icons/react/dist/csr/Warning";
import { FilmSlate } from "@phosphor-icons/react/dist/csr/FilmSlate";
import { Info } from "@phosphor-icons/react/dist/csr/Info";
import { SlidersHorizontal } from "@phosphor-icons/react/dist/csr/SlidersHorizontal";
import { SidebarSimple } from "@phosphor-icons/react/dist/csr/SidebarSimple";
import { Image as ImageIcon } from "@phosphor-icons/react/dist/csr/Image";
import { VideoCamera } from "@phosphor-icons/react/dist/csr/VideoCamera";
import { ArrowUp } from "@phosphor-icons/react/dist/csr/ArrowUp";
import { Check } from "@phosphor-icons/react/dist/csr/Check";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { Play } from "@phosphor-icons/react/dist/csr/Play";
import { ArrowsClockwise } from "@phosphor-icons/react/dist/csr/ArrowsClockwise";
import { ChatCircle } from "@phosphor-icons/react/dist/csr/ChatCircle";
import { Broadcast } from "@phosphor-icons/react/dist/csr/Broadcast";
import { PencilSimple } from "@phosphor-icons/react/dist/csr/PencilSimple";
import { Queue } from "@phosphor-icons/react/dist/csr/Queue";
import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { UploadSimple } from "@phosphor-icons/react/dist/csr/UploadSimple";
import { motion, AnimatePresence, Reorder, useDragControls } from "motion/react";
import { ELEM, MODEL_OPTIONS, MODEL_PARAMS, defaultParams, initialConcepts, initialMessages, img, type Concept, type Shot, type Video, type ChatMsg, type ParamSpec, type ParamValue } from "@/lib/data";

type Tab = "create" | "deploy";
type GenItem = { id: string; label: string; channel: string; dur: string; ratio: string; seed: string; done: boolean };
type Project = { id: string; name: string; desc: string };

const initialProjects: Project[] = [
  { id: "p1", name: "星轨连击特效", desc: "主投巨量 · 男性 18–24" },
  { id: "p2", name: "王者征途新春", desc: "新春买量批次" },
  { id: "p3", name: "星际争霸 ROAS", desc: "ROAS 测试" },
];

export default function Workspace() {
  const [tab, setTab] = useState<Tab>("create");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [activeId, setActiveId] = useState("p1");
  const [showNew, setShowNew] = useState(false);

  const [preview, setPreview] = useState<Video | null>(null);
  const [chatW, setChatW] = useState(396);
  const [chatOpen, setChatOpen] = useState(true);

  const [conceptData, setConceptData] = useState<Concept[]>(() =>
    initialConcepts.map((c) => ({ ...c, shots: c.shots.map((s, i) => ({ ...s, id: s.id ?? `s${c.n}-${i}` })) })));
  const shotSeq = useRef(0);
  const [genByConcept, setGenByConcept] = useState<Record<number, GenItem[]>>({});
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [selectedConceptN, setSelectedConceptN] = useState<number>(initialConcepts[0]?.n ?? 1);
  const [messages, setMessages] = useState<ChatMsg[]>(initialMessages);
  const [librarySel, setLibrarySel] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reversible membership: every finished variant is in the library by default; the user can toggle any out (and back).
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const videos: Video[] = Object.values(genByConcept).flat().filter((t) => t.done && !removed.has(t.id))
    .map((t) => ({ id: t.id, label: t.label, channel: t.channel, dur: t.dur, ratio: t.ratio, seed: t.seed, state: "pending" as const }));


  const dragging = useRef(false);
  const genTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const project = projects.find((p) => p.id === activeId) ?? projects[0];

  useEffect(() => {
    const move = (e: MouseEvent) => { if (dragging.current) setChatW(Math.max(320, Math.min(640, window.innerWidth - e.clientX))); };
    const up = () => { if (dragging.current) { dragging.current = false; document.body.style.userSelect = ""; document.body.style.cursor = ""; } };
    window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, []);
  useEffect(() => () => { if (genTimer.current) clearInterval(genTimer.current); }, []);
  // Single ticker drives all in-flight generations; marks one pending variant done per tick, stops when none remain.
  useEffect(() => {
    const hasPending = Object.values(genByConcept).some((arr) => arr.some((t) => !t.done));
    if (!hasPending) { if (genTimer.current) { clearInterval(genTimer.current); genTimer.current = null; } return; }
    if (genTimer.current) return;
    genTimer.current = setInterval(() => {
      setGenByConcept((prev) => {
        for (const k of Object.keys(prev)) {
          const arr = prev[Number(k)];
          const i = arr.findIndex((t) => !t.done);
          if (i >= 0) { const next = arr.slice(); next[i] = { ...next[i], done: true }; return { ...prev, [Number(k)]: next }; }
        }
        return prev;
      });
    }, 420);
  }, [genByConcept]);

  function generateConcept(n: number, count = 1) {
    const c = conceptData.find((c) => c.n === n);
    if (!c) return;
    const items: GenItem[] = [];
    for (let v = 1; v <= count; v++)
      items.push({ id: `g-${n}-${v}`, label: count > 1 ? `${c.short} v${v}` : c.short, channel: c.platform, dur: c.duration, ratio: c.aspectRatio, seed: `gen${n}${v}`, done: false });
    setGenByConcept((prev) => ({ ...prev, [n]: items }));
    setSelectedConceptN(n);
    showToast("已加入生成队列");
  }
  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }
  function dismissConcept(n: number) { setDismissed((p) => new Set(p).add(n)); }
  function restoreDismissed() { setDismissed(new Set()); }
  function toggleLibrary(id: string) { setLibrarySel((p) => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; }); }
  // Reversible library membership for generated variants.
  function toggleMember(id: string) { setRemoved((p) => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; }); }
  function setConceptMembership(n: number, inLib: boolean) {
    setRemoved((p) => { const s = new Set(p); (genByConcept[n] ?? []).filter((t) => t.done).forEach((t) => (inLib ? s.delete(t.id) : s.add(t.id))); return s; });
  }
  // Shot-level structural edits (reorder / delete / add); timings reflow automatically.
  function mutateShots(cn: number, fn: (shots: Shot[]) => Shot[]) {
    setConceptData((prev) => prev.map((c) => (c.n === cn ? { ...c, shots: reflowShots(fn(c.shots), durOf(c.duration)) } : c)));
  }
  // Drag-reorder: commit the full new order of video shots (by stable id); VO stays pinned, timings reflow.
  function reorderShots(cn: number, orderedIds: string[]) {
    mutateShots(cn, (shots) => {
      const byId = new Map(shots.map((s) => [s.id, s]));
      const video = orderedIds.map((id) => byId.get(id)).filter((s): s is Shot => !!s);
      const vo = shots.filter((s) => s.type === "vo");
      return [...video, ...vo];
    });
  }
  function deleteShot(cn: number, no: number) {
    mutateShots(cn, (shots) => (shots.length > 1 ? shots.filter((s) => s.no !== no) : shots));
  }
  function addShot(cn: number) {
    mutateShots(cn, (shots) => [...shots, { id: `s-new-${shotSeq.current++}`, no: 999, t: "0–3s", type: "ai-video", source: "ai", d: "新镜头", model: MODEL_OPTIONS["ai-video"][0], prompt: "", reasoning: "" }]);
  }
  function send(text: string) {
    const t = text.trim(); if (!t) return;
    setMessages((m) => [...m, { role: "u", text: t }]);
    window.setTimeout(() => setMessages((m) => [...m, { role: "a", text: "收到，我调整一下方案 →" }]), 600);
  }
  function createProject(name: string, desc: string) {
    const id = "p" + (projects.length + 1) + Math.floor(performance.now() % 1000);
    setProjects((p) => [...p, { id, name: name || "未命名项目", desc }]);
    setActiveId(id); setShowNew(false); setTab("create");
    setConceptData(initialConcepts.map((c) => ({ ...c, shots: c.shots.map((s, i) => ({ ...s, id: s.id ?? `s${c.n}-${i}` })) })));
    setGenByConcept({}); setDismissed(new Set()); setRemoved(new Set());
  }

  // Live shot edits — the selected-shot inspector is always editable (no draft / no save button).
  function patchShot(cn: number, no: number, patch: Partial<Shot>) {
    setConceptData((prev) => prev.map((c) => (c.n === cn ? { ...c, shots: c.shots.map((s) => (s.no === no ? { ...s, ...patch } : s)) } : c)));
  }
  // Switching model swaps the whole param set — reset to the new model's defaults.
  function setShotModel(cn: number, no: number, m: string) { patchShot(cn, no, { model: m, params: defaultParams(m) }); }
  function setShotPrompt(cn: number, no: number, p: string) { patchShot(cn, no, { prompt: p }); }
  function setShotParam(cn: number, no: number, key: string, value: ParamValue) {
    setConceptData((prev) => prev.map((c) => (c.n === cn ? { ...c, shots: c.shots.map((s) => {
      if (s.no !== no) return s;
      const base = s.params ?? defaultParams(s.model ?? "");
      return { ...s, params: { ...base, [key]: value } };
    }) } : c)));
  }

  const showChat = tab === "create";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar projects={projects} activeId={activeId} onSelect={(id) => { setActiveId(id); setTab("create"); }} onNew={() => setShowNew(true)}
        collapsed={!sidebarOpen} onToggle={() => setSidebarOpen((o) => !o)} />

      <ProjectView
        project={project} tab={tab} onTab={setTab}
        chatOpen={chatOpen} onReopenChat={() => setChatOpen(true)}
        conceptData={conceptData} dismissed={dismissed} genByConcept={genByConcept}
        selectedConceptN={selectedConceptN} onSelectConcept={setSelectedConceptN}
        onGenerateConcept={generateConcept} onDismissConcept={dismissConcept} onRestoreDismissed={restoreDismissed} libraryCount={videos.length}
        onReorderShots={reorderShots} onDeleteShot={deleteShot} onAddShot={addShot}
        removed={removed} onToggleMember={toggleMember} onSetConceptMembership={setConceptMembership}
        videos={videos} librarySel={librarySel} onToggleLib={toggleLibrary}
        onPreview={setPreview}
        onSetShotModel={setShotModel} onSetShotPrompt={setShotPrompt} onSetShotParam={setShotParam}
      />

      {showChat && chatOpen && (
        <div className="w-[7px] shrink-0 cursor-col-resize relative group z-10"
          onMouseDown={() => { dragging.current = true; document.body.style.userSelect = "none"; document.body.style.cursor = "col-resize"; }}>
          <span className="absolute left-[3px] top-0 bottom-0 w-px bg-transparent group-hover:bg-primary group-hover:w-0.5" />
        </div>
      )}
      {showChat && (
        <motion.div className="overflow-hidden shrink-0" animate={{ width: chatOpen ? chatW : 0 }} transition={{ type: "spring", stiffness: 280, damping: 26 }}>
          <div style={{ width: chatW }} className="h-full"><Chat project={project} messages={messages} onClose={() => setChatOpen(false)} onSend={send} /></div>
        </motion.div>
      )}

      <PreviewModal video={preview} conceptData={conceptData} onClose={() => setPreview(null)} />
      <NewProjectModal open={showNew} onClose={() => setShowNew(false)} onCreate={createProject} />

      {/* Generation confirmation — "added to the queue", auto-dismiss */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.97 }} transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 bg-ink text-white pl-3 pr-4 py-2.5 rounded-full shadow-[0_10px_36px_rgba(0,0,0,0.28)]">
            <span className="w-5 h-5 rounded-full bg-pass grid place-items-center"><Check size={12} weight="bold" /></span>
            <span className="text-[13px] font-medium">{toast}</span>
            <Queue size={14} weight="bold" className="text-white/60 ml-0.5" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────────── Sidebar (collapsible to an icon rail, Perplexity-style) ───────────────────────── */
function Sidebar({ projects, activeId, onSelect, onNew, collapsed, onToggle }: {
  projects: Project[]; activeId: string; onSelect: (id: string) => void; onNew: () => void; collapsed: boolean; onToggle: () => void;
}) {
  return (
    <motion.aside animate={{ width: collapsed ? 60 : 232 }} transition={{ type: "spring", stiffness: 280, damping: 30 }}
      className="shrink-0 bg-surface border-r border-hairline flex flex-col overflow-hidden">
      {collapsed ? (
        /* ── Icon rail ── */
        <>
          {/* Logo doubles as the expand trigger: hovering swaps the mark for a sidebar glyph (Perplexity pattern) */}
          <div className="pt-4 pb-2 flex justify-center">
            <Tooltip label="展开侧栏" side="bottom">
              <button onClick={onToggle} className="group relative w-9 h-9 rounded-lg grid place-items-center hover:bg-hair2 transition-colors">
                <span className="w-[22px] h-[22px] rounded-md bg-primary group-hover:opacity-0 transition-opacity" />
                <SidebarSimple size={18} className="absolute opacity-0 group-hover:opacity-100 text-ink2 transition-opacity" />
              </button>
            </Tooltip>
          </div>
          <div className="pb-2 flex justify-center">
            <Tooltip label="新建项目" side="right">
              <button onClick={onNew} className="w-9 h-9 rounded-lg grid place-items-center border border-hairline hover:bg-canvas transition-transform active:scale-95"><Plus size={16} weight="bold" /></button>
            </Tooltip>
          </div>
          <div className="flex-1 overflow-y-auto flex flex-col items-center gap-1 pt-1">
            {projects.map((p) => {
              const active = p.id === activeId;
              return (
                <Tooltip key={p.id} label={p.name} side="right">
                  <button onClick={() => onSelect(p.id)} className={`w-9 h-9 rounded-lg grid place-items-center transition-colors ${active ? "bg-tint" : "hover:bg-hair2"}`}>
                    <Folder size={17} weight={active ? "fill" : "regular"} className={active ? "text-primary" : "text-muted"} />
                  </button>
                </Tooltip>
              );
            })}
          </div>
          <div className="py-3 flex justify-center border-t border-hairline">
            <Tooltip label="显哥的团队 · 深圳 发行" side="top">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#62aef0] to-primary grid place-items-center text-white"><Star size={15} weight="fill" /></span>
            </Tooltip>
          </div>
        </>
      ) : (
        /* ── Full sidebar ── */
        <>
          <div className="px-4 pt-4 pb-3 flex items-center gap-2">
            <div className="w-[22px] h-[22px] rounded-md bg-primary shrink-0" />
            <span className="font-bold tracking-tight text-[15px] flex-1 truncate">Gampex</span>
            <Tooltip label="收起侧栏">
              <button onClick={onToggle} className="w-7 h-7 grid place-items-center rounded-md text-faint hover:text-ink2 hover:bg-hair2 transition-colors"><SidebarSimple size={16} /></button>
            </Tooltip>
          </div>
          <div className="px-3">
            <button onClick={onNew} className="w-full flex items-center justify-center gap-1.5 text-[13px] font-medium rounded-lg border border-hairline bg-surface py-2 hover:bg-canvas transition-transform active:scale-[0.98]">
              <Plus size={15} weight="bold" /> 新建项目
            </button>
          </div>
          <div className="px-4 mt-5 mb-1.5 flex items-center">
            <span className="text-[11px] uppercase tracking-[0.07em] text-faint font-semibold">项目</span>
            <span className="flex-1" />
            <span className="text-[11px] text-faint">{projects.length}</span>
          </div>
          <div className="px-2 flex-1 overflow-y-auto flex flex-col gap-0.5">
            {projects.map((p) => {
              const active = p.id === activeId;
              return (
                <button key={p.id} onClick={() => onSelect(p.id)}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${active ? "bg-tint" : "hover:bg-hair2"}`}>
                  <Folder size={16} weight={active ? "fill" : "regular"} className={active ? "text-primary" : "text-muted"} />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[13px] font-medium truncate ${active ? "text-primary" : "text-ink"}`}>{p.name}</span>
                    <span className="block text-[11.5px] text-faint truncate">{p.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="px-3 py-3 border-t border-hairline flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#62aef0] to-primary grid place-items-center text-white shrink-0"><Star size={15} weight="fill" /></span>
            <span className="min-w-0 flex-1"><span className="block text-[12.5px] font-medium truncate">显哥的团队</span><span className="block text-[11px] text-faint">深圳 · 发行</span></span>
          </div>
        </>
      )}
    </motion.aside>
  );
}

/* ───────────────────────── Project view ───────────────────────── */
function ProjectView(props: {
  project: Project; tab: Tab; onTab: (t: Tab) => void; chatOpen: boolean; onReopenChat: () => void;
  conceptData: Concept[]; dismissed: Set<number>; genByConcept: Record<number, GenItem[]>;
  selectedConceptN: number; onSelectConcept: (n: number) => void;
  onGenerateConcept: (n: number, count: number) => void; onDismissConcept: (n: number) => void; onRestoreDismissed: () => void; libraryCount: number;
  onReorderShots: (cn: number, orderedIds: string[]) => void; onDeleteShot: (cn: number, no: number) => void; onAddShot: (cn: number) => void;
  removed: Set<string>; onToggleMember: (id: string) => void; onSetConceptMembership: (n: number, inLib: boolean) => void;
  videos: Video[]; librarySel: Set<string>; onToggleLib: (id: string) => void; onPreview: (v: Video) => void;
  onSetShotModel: (cn: number, no: number, m: string) => void; onSetShotPrompt: (cn: number, no: number, p: string) => void; onSetShotParam: (cn: number, no: number, key: string, value: ParamValue) => void;
}) {
  const { project, tab, onTab, chatOpen, onReopenChat, conceptData, dismissed, genByConcept, selectedConceptN, onSelectConcept, onGenerateConcept, onDismissConcept, onRestoreDismissed, libraryCount, onReorderShots, onDeleteShot, onAddShot, removed, onToggleMember, onSetConceptMembership, videos, librarySel, onToggleLib, onPreview, onSetShotModel, onSetShotPrompt, onSetShotParam } = props;
  const [filter, setFilter] = useState("全部");
  const [queueOpen, setQueueOpen] = useState(false);
  const channels = ["全部", ...Array.from(new Set(videos.map((v) => v.channel)))];
  const shown = filter === "全部" ? videos : videos.filter((v) => v.channel === filter);
  const visibleConcepts = conceptData.filter((c) => !dismissed.has(c.n));
  const dismissedCount = dismissed.size;
  const selectedConcept = visibleConcepts.find((c) => c.n === selectedConceptN) ?? visibleConcepts[0];
  // Generation jobs surfaced as a global queue, decoupled from the concept cards.
  const jobs = conceptData
    .filter((c) => (genByConcept[c.n]?.length ?? 0) > 0)
    .map((c) => { const items = genByConcept[c.n]; const d = items.filter((t) => t.done).length; return { n: c.n, short: c.short, total: items.length, done: d, generating: d < items.length }; });
  const activeJobs = jobs.filter((j) => j.generating).length;

  return (
    <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
      <div className="relative z-10 bg-surface border-b border-hairline px-5 h-[49px] shrink-0 flex items-center gap-3">
        <div className="text-[13px] font-semibold tracking-tight whitespace-nowrap text-ink2">{project.name}{project.desc && <span className="text-faint font-normal text-[12px]"> · {project.desc}</span>}</div>
        <Tabs tab={tab} onTab={onTab} deployCount={libraryCount} />
        <span className="flex-1" />
        {tab === "create" ? (
          <>
            {jobs.length > 0 && (
              <div className="relative">
                <button onClick={() => setQueueOpen((o) => !o)} className="text-[13px] font-medium rounded-full px-3.5 py-2 border border-hairline bg-surface hover:bg-canvas inline-flex items-center gap-1.5">
                  <Queue size={15} weight="bold" />
                  {activeJobs > 0
                    ? <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />生成中 {activeJobs}</span>
                    : <>生成队列 {jobs.length}</>}
                </button>
                <AnimatePresence>{queueOpen && <QueueDrawer jobs={jobs} onView={() => { onTab("deploy"); setQueueOpen(false); }} onClose={() => setQueueOpen(false)} />}</AnimatePresence>
              </div>
            )}
            <ReopenPill show={!chatOpen} onClick={onReopenChat} />
          </>
        ) : (
          <>
            <div className="flex gap-1.5">
              {channels.map((c) => <button key={c} onClick={() => setFilter(c)} className={`text-[12.5px] px-3 py-1 rounded-full border ${filter === c ? "bg-tint text-primary border-tintborder" : "bg-surface text-ink2 border-hairline hover:bg-canvas"}`}>{c}</button>)}
            </div>
            <span className="text-[12.5px] text-muted ml-1">已选 {librarySel.size}</span>
            <PillBtn primary disabled={librarySel.size === 0}><span className="inline-flex items-center gap-1.5"><Broadcast size={15} weight="fill" /> 批量投放 ({librarySel.size})</span></PillBtn>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 pb-16">
        {tab === "create" ? (
          <>
            <ConceptTabs concepts={visibleConcepts} selectedN={selectedConcept?.n ?? -1} onSelect={onSelectConcept} gen={genByConcept} dismissedCount={dismissedCount} onRestore={onRestoreDismissed} />
            {selectedConcept ? (
              <ConceptCard key={selectedConcept.n} c={selectedConcept} gen={genByConcept[selectedConcept.n]} onGenerate={(count) => onGenerateConcept(selectedConcept.n, count)} onDismiss={() => onDismissConcept(selectedConcept.n)} onPreview={onPreview}
                onViewLibrary={() => onTab("deploy")}
                onReorderShots={onReorderShots} onDeleteShot={onDeleteShot} onAddShot={onAddShot}
                onSetShotModel={onSetShotModel} onSetShotPrompt={onSetShotPrompt} onSetShotParam={onSetShotParam} />
            ) : (
              <div className="h-full grid place-items-center text-center py-20">
                <div>
                  <div className="text-[14px] font-semibold text-ink2">没有方案了</div>
                  <div className="text-[12.5px] text-muted mt-1">所有方案都被忽略了。</div>
                  {dismissedCount > 0 && <button onClick={onRestoreDismissed} className="mt-4 text-[13px] font-medium rounded-full px-4 py-2 border border-hairline hover:bg-canvas">恢复已忽略的方案</button>}
                </div>
              </div>
            )}
          </>
        ) : (
          shown.length > 0 ? (
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
          )
        )}
      </div>
    </div>
  );
}
function Tabs({ tab, onTab, deployCount }: { tab: Tab; onTab: (t: Tab) => void; deployCount: number }) {
  const items: [Tab, string][] = [["create", "生成素材"], ["deploy", "管理投放"]];
  return (
    <div className="flex items-center gap-0.5 bg-canvas rounded-lg p-0.5 ml-1">
      {items.map(([k, l]) => (
        <button key={k} onClick={() => onTab(k)} className={`px-3 py-1 rounded-md text-[13px] font-medium transition-colors inline-flex items-center gap-1.5 ${tab === k ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : "text-muted hover:text-ink2"}`}>
          {l}
          {k === "deploy" && deployCount > 0 && (
            <motion.span key={deployCount} initial={{ scale: 1.6 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 480, damping: 16 }}
              className={`text-[10.5px] tabular-nums px-1.5 py-px rounded-full font-semibold ${tab === k ? "bg-ink text-white" : "bg-hair2 text-muted"}`}>{deployCount}</motion.span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ───────────────────────── Concept tabs (navigate the review panel) ───────────────────────── */
function ConceptTabs({ concepts, selectedN, onSelect, gen, dismissedCount, onRestore }: {
  concepts: Concept[]; selectedN: number; onSelect: (n: number) => void; gen: Record<number, GenItem[]>; dismissedCount: number; onRestore: () => void;
}) {
  return (
    <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
      {concepts.map((c) => {
        const items = gen[c.n] ?? [];
        const d = items.filter((t) => t.done).length;
        const generating = items.length > 0 && d < items.length;
        const allDone = items.length > 0 && d === items.length;
        const active = c.n === selectedN;
        return (
          <button key={c.n} onClick={() => onSelect(c.n)}
            className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors ${active ? "bg-tint border-tintborder" : "bg-surface border-hairline hover:bg-canvas"}`}>
            <span className={`text-[12.5px] font-semibold ${active ? "text-primary" : "text-ink2"}`}><span className="text-faint font-medium mr-1">{c.n}</span>{c.short}</span>
            {generating
              ? <span className="w-3 h-3 rounded-full border-2 border-[#dcdbd9] border-t-primary gx-spin" />
              : allDone ? <CheckCircle size={14} weight="fill" className="text-pass" /> : null}
          </button>
        );
      })}
      <button className="shrink-0 px-3 py-2 rounded-xl border border-dashed border-hairline text-[12.5px] font-medium text-muted hover:text-ink2 hover:border-[#cdd6e0] transition-colors">+ 再想 3 个</button>
      {dismissedCount > 0 && <button onClick={onRestore} className="shrink-0 text-[12px] text-faint hover:text-primary ml-1">已忽略 {dismissedCount} · 恢复</button>}
    </div>
  );
}

/* ───────────────────────── Generation queue drawer ───────────────────────── */
function QueueDrawer({ jobs, onView, onClose }: { jobs: { n: number; short: string; total: number; done: number; generating: boolean }[]; onView: (n: number) => void; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.14 }}
        className="absolute right-0 top-full mt-2 z-40 w-[340px] bg-surface border border-hairline rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.16)] p-2">
        <div className="px-2 py-1.5 text-[11px] uppercase tracking-[0.06em] text-faint font-semibold">生成队列</div>
        {jobs.map((j) => (
          <div key={j.n} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-hair2">
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-medium text-ink2 truncate">概念 {j.n} · {j.short}</div>
              <div className="mt-1.5 h-1.5 rounded-full bg-hair2 overflow-hidden"><div className="h-full bg-primary rounded-full transition-all" style={{ width: `${j.total ? (j.done / j.total) * 100 : 0}%` }} /></div>
            </div>
            {j.generating
              ? <span className="text-[11px] text-muted tabular-nums shrink-0">{j.done}/{j.total}</span>
              : <span className="text-[11px] text-pass font-medium inline-flex items-center gap-1 shrink-0"><CheckCircle size={13} weight="fill" />完成</span>}
            <button onClick={() => onView(j.n)} className="text-[11.5px] text-primary font-medium hover:underline shrink-0">查看</button>
          </div>
        ))}
      </motion.div>
    </>
  );
}

/* ───────────────────────── Chat ───────────────────────── */
function Chat({ project, messages, onClose, onSend }: { project: Project; messages: ChatMsg[]; onClose: () => void; onSend: (t: string) => void }) {
  const [input, setInput] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);
  useEffect(() => { threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" }); }, [messages.length]);
  const submit = () => { onSend(input); setInput(""); };
  return (
    <section className="w-full h-full bg-canvassoft flex flex-col overflow-hidden">
      <header className="px-4 h-[49px] shrink-0 border-b border-hairline flex items-center gap-2">
        <span className="text-[13px] font-bold tracking-tight truncate">{project.name}</span>
        <span className="flex-1" />
        <Tooltip label="收起对话" side="bottom">
          <button onClick={onClose} className="w-7 h-7 grid place-items-center rounded-md text-faint hover:text-ink2 hover:bg-hair2 transition-colors"><CaretRight size={15} /></button>
        </Tooltip>
      </header>
      <div ref={threadRef} className="flex-1 overflow-y-auto p-[18px] flex flex-col gap-4">
        {messages.map((m, i) => m.role === "u" ? <UserMsg key={i} refs={m.refs}>{m.text}</UserMsg> : <AgentMsg key={i}>{m.text}</AgentMsg>)}
      </div>
      <div className="p-3.5 pt-2.5">
        <div className="bg-surface border border-hairline rounded-2xl px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <textarea rows={1} value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder="继续聊，或上传参考…" className="w-full resize-none outline-none bg-transparent text-[13.5px] leading-snug text-ink placeholder:text-faint" />
          <div className="flex items-center gap-1 mt-1.5">
            <ComposerTool><Plus size={15} /></ComposerTool>
            <ComposerTool><ImageIcon size={15} /> 图片</ComposerTool>
            <ComposerTool><VideoCamera size={15} /> 视频</ComposerTool>
            <span className="flex-1" />
            <button onClick={submit} disabled={!input.trim()} className="w-[31px] h-[31px] rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary2 transition-transform active:scale-90 disabled:opacity-40"><ArrowUp size={15} weight="bold" /></button>
          </div>
        </div>
      </div>
    </section>
  );
}
function ComposerTool({ children }: { children: React.ReactNode }) {
  return <button className="inline-flex items-center gap-1.5 text-[12.5px] text-muted rounded-lg px-2 py-[5px] hover:bg-hair2 hover:text-ink2">{children}</button>;
}
function UserMsg({ children, refs }: { children: React.ReactNode; refs?: boolean }) {
  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="text-[13.5px] leading-relaxed bg-tint border border-tintborder rounded-[14px_14px_4px_14px] px-3 py-2.5 max-w-[92%]">{children}</div>
      {refs && (
        <div className="flex gap-1.5 flex-wrap justify-end">
          <RefChip><img src={img("r1", 40, 40)} alt="" className="w-6 h-6 rounded object-cover" /> 竞品钩子.jpg</RefChip>
          <RefChip><span className="w-6 h-6 rounded bg-black text-white grid place-items-center text-[10px]"><Play size={10} weight="fill" /></span> 旧素材v7.mp4</RefChip>
        </div>
      )}
    </div>
  );
}
function RefChip({ children }: { children: React.ReactNode }) {
  return <span className="flex items-center gap-1.5 text-[11.5px] text-ink2 bg-surface border border-hairline rounded-lg pl-1 pr-2 py-1">{children}</span>;
}
function AgentMsg({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[11px] font-semibold text-faint flex items-center gap-1.5"><span className="w-[15px] h-[15px] rounded bg-primary text-white grid place-items-center text-[9px] font-bold">G</span>Gampex</div>
      <div className="text-[13.5px] leading-relaxed text-ink2">{children}</div>
    </div>
  );
}

/* ───────────────────────── Shared UI bits ───────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] uppercase tracking-[0.06em] text-faint font-semibold mb-3">{children}</div>;
}
function ReopenPill({ show, onClick }: { show: boolean; onClick: () => void }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.button initial={{ opacity: 0, scale: 0.85, width: 0, marginLeft: 0 }} animate={{ opacity: 1, scale: 1, width: "auto", marginLeft: 4 }} exit={{ opacity: 0, scale: 0.85, width: 0, marginLeft: 0 }} transition={{ type: "spring", stiffness: 420, damping: 30 }} onClick={onClick}
          className="flex items-center gap-1.5 px-3.5 py-[7px] rounded-full bg-ink text-white text-[12.5px] font-medium hover:bg-[#383838] active:scale-95 transition-colors whitespace-nowrap overflow-hidden shrink-0"><ChatCircle size={15} weight="fill" /> 展开对话</motion.button>
      )}
    </AnimatePresence>
  );
}
function PillBtn({ children, primary, onClick, disabled }: { children: React.ReactNode; primary?: boolean; onClick?: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`text-[13px] font-medium rounded-full px-4 py-2 border transition-transform active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 ${primary ? "bg-primary text-white border-primary hover:bg-primary2" : "bg-surface text-ink border-hairline hover:bg-canvas"}`}>{children}</button>
  );
}

/* ───────────────────────── Tooltip (design-system primitive) ─────────────────────────
   One styled hover/focus hint for every icon. Portal-rendered to <body> so it is never
   clipped by an ancestor's overflow:hidden (e.g. the shot board). Short open delay,
   instant close, keyboard-focus aware. Replaces ad-hoc native `title=` attributes. */
type TipSide = "top" | "bottom" | "right" | "left";
const TIP_PLACE: Record<TipSide, string> = {
  top: "-translate-x-1/2 -translate-y-full -mt-1.5",
  bottom: "-translate-x-1/2 mt-1.5",
  right: "-translate-y-1/2 ml-1.5",
  left: "-translate-x-full -translate-y-1/2 -ml-1.5",
};
function Tooltip({ label, side = "top", className, children }: { label: string; side?: TipSide; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const open = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      if (side === "right") setPos({ x: r.right, y: r.top + r.height / 2 });
      else if (side === "left") setPos({ x: r.left, y: r.top + r.height / 2 });
      else setPos({ x: r.left + r.width / 2, y: side === "top" ? r.top : r.bottom });
    }, 180);
  };
  const close = () => { if (timer.current) clearTimeout(timer.current); setPos(null); };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return (
    <span ref={ref} className={className ?? "inline-flex"} onPointerEnter={open} onPointerLeave={close} onPointerDown={close} onFocusCapture={open} onBlurCapture={close}>
      {children}
      {pos && typeof document !== "undefined" && createPortal(
        // opacity-only entrance — positioning is via Tailwind translate classes, so motion must not touch transform
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.12 }}
          style={{ left: pos.x, top: pos.y }}
          className={`fixed z-[90] ${TIP_PLACE[side]} pointer-events-none whitespace-nowrap rounded-md bg-ink text-white text-[11px] font-medium px-2 py-1 shadow-[0_4px_14px_rgba(0,0,0,0.22)]`}>
          {label}
        </motion.span>, document.body)}
    </span>
  );
}

/* ───────────────────────── Confirm modal (irreversible actions) ───────────────────────── */
function ConfirmModal({ open, title, body, confirmLabel, onConfirm, onCancel }: {
  open: boolean; title: string; body: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80] grid place-items-center p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-[rgba(20,20,20,0.45)]" onClick={onCancel} />
          <motion.div initial={{ scale: 0.94, y: 10, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative bg-surface rounded-2xl border border-hairline shadow-[0_24px_70px_rgba(0,0,0,0.25)] w-[404px] max-w-[92vw] p-6">
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-full bg-[#fdeee6] text-reject grid place-items-center shrink-0"><Warning size={19} weight="fill" /></span>
              <div className="min-w-0">
                <h3 className="text-[15px] font-bold tracking-tight">{title}</h3>
                <p className="text-[13px] text-muted mt-1 leading-relaxed">{body}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={onCancel} className="text-[13px] font-medium rounded-full px-4 py-2 border border-hairline hover:bg-canvas transition-colors">取消</button>
              <button onClick={onConfirm} className="text-[13px] font-semibold rounded-full px-5 py-2 bg-reject text-white hover:brightness-95 transition-all active:scale-[0.97]">{confirmLabel}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───────────────────────── Timeline (CapCut/PR-style) ───────────────────────── */
function spanOf(t: string): [number, number] {
  const parts = t.replace(/s/gi, "").split(/[–-]/).map((x) => parseFloat(x.trim()));
  const a = isNaN(parts[0]) ? 0 : parts[0];
  const b = parts.length > 1 && !isNaN(parts[1]) ? parts[1] : a;
  return [a, b];
}
function durOf(d: string): number { const n = parseFloat(d); return isNaN(n) ? 30 : n; }

// After any structural edit (reorder/delete/add), re-flow the video track so clips stay contiguous
// 0..duration (lengths rescaled to fill the budget), VO spans the whole ad, and 镜头 numbers renumber by position.
function reflowShots(shots: Shot[], duration: number): Shot[] {
  const video = shots.filter((s) => s.type !== "vo");
  const vo = shots.filter((s) => s.type === "vo");
  const lens = video.map((s) => { const [a, b] = spanOf(s.t); return Math.max(b - a, 1); });
  const sum = lens.reduce((x, y) => x + y, 0) || 1;
  let acc = 0;
  const reVideo = video.map((s, i) => {
    const start = Math.round(acc);
    acc += (lens[i] / sum) * duration;
    const end = i === video.length - 1 ? duration : Math.max(Math.round(acc), start + 1);
    return { ...s, t: `${start}–${end}s` };
  });
  const reVo = vo.map((s) => ({ ...s, t: `0–${duration}s` }));
  return [...reVideo, ...reVo].map((s, i) => ({ ...s, no: i + 1 }));
}

// Storyboard as a shot-list board — the form publishers already use (screenplay / storyboard table).
// Rows drag to reorder directly (the muscle memory); each row exposes the per-shot params (element,
// model, duration) the AI pre-filled, which the user can override. Scales cleanly to 8+ shots.
function ShotBoard({ shots, selectedNo, onSelect, onReorderShots, onRequestDelete, onAdd }: {
  shots: Shot[]; selectedNo: number;
  onSelect: (n: number) => void; onReorderShots: (orderedIds: string[]) => void; onRequestDelete: (no: number) => void; onAdd: () => void;
}) {
  const video = shots.filter((s) => s.type !== "vo");
  const vo = shots.filter((s) => s.type === "vo");
  const ids = video.map((s) => s.id as string);
  return (
    <div className="rounded-xl border border-hairline bg-surface overflow-hidden">
      {/* Column header */}
      <div className="flex items-center gap-4 px-4 py-2.5 bg-canvas border-b border-hairline text-[11px] uppercase tracking-[0.05em] text-faint font-semibold">
        <span className="w-4 shrink-0" />
        <span className="w-7 shrink-0 text-center">#</span>
        <span className="w-[76px] shrink-0">参考</span>
        <span className="flex-1 min-w-0">分镜描述</span>
        <span className="w-[96px] shrink-0 hidden sm:block">元素</span>
        <span className="w-[120px] shrink-0 hidden md:block">模型 / 来源</span>
        <span className="w-12 shrink-0 text-right tabular-nums">时长</span>
        <span className="w-7 shrink-0" />
      </div>
      <Reorder.Group axis="y" values={ids} onReorder={onReorderShots} className="divide-y divide-hairline">
        {video.map((s) => (
          <ShotRow key={s.id} s={s} selected={s.no === selectedNo} canDelete={shots.length > 1}
            onSelect={() => onSelect(s.no)} onRequestDelete={() => onRequestDelete(s.no)} />
        ))}
      </Reorder.Group>
      {/* VO is not a positional shot — it spans the whole ad, pinned below the draggable list */}
      {vo.length > 0 ? (
        <button onClick={() => onSelect(vo[0].no)}
          className={`w-full flex items-center gap-4 px-4 py-3 border-t border-hairline text-left transition-colors ${vo[0].no === selectedNo ? "bg-tint" : "hover:bg-canvas"}`}>
          <span className="w-4 shrink-0" />
          <span className="w-7 shrink-0 grid place-items-center"><span className="flex items-end gap-[1.5px] h-4">{[3, 6, 4, 7, 5, 4].map((h, i) => <span key={i} style={{ height: `${h * 1.6}px`, background: ELEM["vo"].color }} className="w-[1.5px] rounded-full" />)}</span></span>
          <span className="flex-1 min-w-0 text-[13.5px] text-ink2 truncate">{vo[0].d}</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold shrink-0" style={{ color: ELEM["vo"].color }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: ELEM["vo"].color }} />配音 · 全程</span>
        </button>
      ) : null}
      <button onClick={onAdd}
        className="w-full flex items-center gap-2 px-4 py-3 border-t border-hairline text-[12.5px] text-muted font-medium hover:bg-canvas hover:text-primary transition-colors">
        <span className="w-4 shrink-0" /><Plus size={15} weight="bold" /> 添加镜头
      </button>
    </div>
  );
}
function ShotRow({ s, selected, canDelete, onSelect, onRequestDelete }: {
  s: Shot; selected: boolean; canDelete: boolean; onSelect: () => void; onRequestDelete: () => void;
}) {
  const controls = useDragControls();
  const elem = ELEM[s.type];
  const [a, b] = spanOf(s.t);
  // 画面 is never a real generated frame (nothing's rendered yet) — at most a reference the user supplies.
  // Show the uploaded asset / provided ref as a thumbnail; otherwise an explicit "add reference" slot.
  const ref = s.asset ? s.seed ?? s.asset : undefined;
  return (
    <Reorder.Item value={s.id as string} dragListener={false} dragControls={controls}
      className={`relative list-none ${selected ? "bg-tint" : "bg-surface"}`}>
      <div onClick={onSelect} className={`group flex items-center gap-4 px-4 py-3 cursor-pointer ${selected ? "" : "hover:bg-canvas"}`}>
        {/* Drag handle — the direct-manipulation affordance publishers expect */}
        <Tooltip label="拖动排序">
          <button onPointerDown={(e) => controls.start(e)} onClick={(e) => e.stopPropagation()}
            className="w-4 shrink-0 grid place-items-center text-faint hover:text-ink2 cursor-grab active:cursor-grabbing touch-none">
            <DotsSixVertical size={16} weight="bold" />
          </button>
        </Tooltip>
        <span className="w-7 shrink-0 text-center text-[13px] font-bold text-ink2 tabular-nums">{s.no}</span>
        {/* 参考 slot — reference image/video, or an add affordance */}
        {ref ? (
          <Tooltip label="参考素材 · 点击替换">
            <span className="w-[76px] h-[46px] shrink-0 rounded-md overflow-hidden bg-black grid place-items-center relative" onClick={(e) => e.stopPropagation()}>
              <img src={img(ref, 152, 92)} alt="" className="w-full h-full object-cover opacity-90" />
              <span className="absolute inset-0 grid place-items-center text-white/90"><Play size={13} weight="fill" className="ml-0.5 drop-shadow" /></span>
            </span>
          </Tooltip>
        ) : (
          <Tooltip label="添加参考图 / 视频（可选）">
            <button onClick={(e) => e.stopPropagation()}
              className="w-[76px] h-[46px] shrink-0 rounded-md border border-dashed border-hairline grid place-items-center text-faint hover:border-primary hover:text-primary hover:bg-tint transition-colors">
              <FilmSlate size={17} />
            </button>
          </Tooltip>
        )}
        <span className="flex-1 min-w-0 text-[13.5px] text-ink2 leading-snug line-clamp-2">{s.d}</span>
        <span className="w-[96px] shrink-0 hidden sm:flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: elem.color }}>
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: elem.color }} />{elem.label}
        </span>
        <span className="w-[120px] shrink-0 hidden md:block text-[11.5px] truncate">
          {s.source === "ai"
            ? <span className="font-medium text-ink2 bg-hair2 px-1.5 py-0.5 rounded">{s.model}</span>
            : s.asset
              ? <span className="font-semibold text-pass">✓ 已上传</span>
              : <span className="font-semibold text-modified">需你上传</span>}
        </span>
        <span className="w-12 shrink-0 text-right text-[12px] text-faint tabular-nums">{Math.max(b - a, 1)}s</span>
        <Tooltip label={canDelete ? "删除镜头" : "至少保留一个镜头"}>
          <button disabled={!canDelete} onClick={(e) => { e.stopPropagation(); onRequestDelete(); }}
            className="w-7 h-7 shrink-0 grid place-items-center rounded-md text-faint opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-[#fdeee6] hover:text-reject disabled:opacity-0 transition-all"><Trash size={14} /></button>
        </Tooltip>
      </div>
    </Reorder.Item>
  );
}

/* ───────────────────────── Concept card ───────────────────────── */
function ConceptCard({ c, gen, onGenerate, onDismiss, onPreview, onViewLibrary, onReorderShots, onDeleteShot, onAddShot, onSetShotModel, onSetShotPrompt, onSetShotParam }: {
  c: Concept; gen?: GenItem[]; onGenerate: (count: number) => void; onDismiss: () => void; onPreview: (v: Video) => void; onViewLibrary: () => void;
  onReorderShots: (cn: number, orderedIds: string[]) => void; onDeleteShot: (cn: number, no: number) => void; onAddShot: (cn: number) => void;
  onSetShotModel: (cn: number, no: number, m: string) => void; onSetShotPrompt: (cn: number, no: number, p: string) => void; onSetShotParam: (cn: number, no: number, key: string, value: ParamValue) => void;
}) {
  const openRef = (r: { seed: string; label: string; source: string }) =>
    onPreview({ id: `ref-${c.n}-${r.seed}`, label: r.label, channel: c.platform, dur: c.duration, ratio: c.aspectRatio, seed: r.seed, state: "pending", isRef: true, refSource: r.source });
  const [selShot, setSelShot] = useState(c.shots[0]?.no ?? 1);
  const selN = Math.min(selShot, c.shots.length); // clamp after a delete
  const selected = c.shots.find((s) => s.no === selN) ?? c.shots[0];
  const [pendingDel, setPendingDel] = useState<number | null>(null); // shot no awaiting delete confirmation
  const [genCount, setGenCount] = useState(1); // how many finished variants to produce
  const items = gen ?? [];
  const done = items.filter((t) => t.done).length;
  const generating = items.length > 0 && done < items.length;
  const videoCount = c.shots.filter((s) => s.type !== "vo").length;
  return (
    <div className="bg-surface border border-hairline rounded-2xl p-5">
      {/* Header: concept title + delivery chips (left), style references (right) */}
      <div className="flex items-center gap-3">
        <span className="text-[15px] font-bold tracking-tight"><span className="text-faint font-semibold mr-1.5">概念 {c.n}</span>{c.title}</span>
        <span className="flex items-center gap-1.5">
          <span className="text-[11.5px] px-2 py-0.5 rounded-full bg-tint text-primary font-medium border border-tintborder">{c.platform}</span>
          <span className="text-[11.5px] px-2 py-0.5 rounded-full bg-hair2 text-muted font-medium tabular-nums">{c.aspectRatio}</span>
          <span className="text-[11.5px] px-2 py-0.5 rounded-full bg-hair2 text-muted font-medium tabular-nums">{c.duration}</span>
        </span>
        <span className="flex-1" />
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-faint font-semibold whitespace-nowrap mr-0.5 hidden sm:inline">风格参考</span>
          {c.refs.map((r) => (
            <Tooltip key={r.seed} label={`${r.label} · ${r.source}`}>
              <button onClick={() => openRef(r)}
                className="relative w-8 h-8 rounded-md overflow-hidden bg-black ring-1 ring-hairline hover:ring-2 hover:ring-ink2 transition-all">
                <img src={img(r.seed, 80, 80)} alt="" className="w-full h-full object-cover opacity-90" />
                <span className="absolute inset-0 grid place-items-center text-white opacity-90"><Play size={9} weight="fill" className="ml-0.5 drop-shadow" /></span>
              </button>
            </Tooltip>
          ))}
          <Tooltip label="添加参考片">
            <button className="w-8 h-8 rounded-md border border-dashed border-hairline grid place-items-center text-faint hover:border-[#cdd6e0] hover:text-ink2 transition-colors"><Plus size={12} /></button>
          </Tooltip>
        </div>
      </div>

      {/* Quiet one-line rationale — why this concept (not a competing band) */}
      <div className="mt-2 flex items-center gap-2 min-w-0">
        <TrendUp size={12} weight="bold" className="text-pass shrink-0" />
        <span className="font-semibold text-ink2 bg-hair2 px-1.5 py-px rounded text-[10.5px] shrink-0">{c.refTopic}</span>
        <span className="text-[11.5px] text-muted truncate">{c.reasoning}</span>
        {c.note && <span className="text-[11px] text-faint shrink-0 hidden 2xl:inline-flex items-center gap-1"><PencilSimple size={10} />{c.note}</span>}
      </div>

      {/* Shot-list board (drag to reorder) + the selected-row inspector below it. Generation goes to the queue, not inline. */}
      <div className="mt-4">
        <ShotBoard shots={c.shots} selectedNo={selN} onSelect={setSelShot}
          onReorderShots={(ids) => onReorderShots(c.n, ids)}
          onRequestDelete={(no) => setPendingDel(no)}
          onAdd={() => { const vc = c.shots.filter((s) => s.type !== "vo").length; onAddShot(c.n); setSelShot(vc + 1); }} />
        {selected && (
          <div className="mt-3 rounded-xl bg-canvas p-4">
            <ShotCard key={selected.no} s={selected}
              onSetModel={(m) => onSetShotModel(c.n, selected.no, m)}
              onSetPrompt={(p) => onSetShotPrompt(c.n, selected.no, p)}
              onSetParam={(k, v) => onSetShotParam(c.n, selected.no, k, v)} />
          </div>
        )}

        {/* Action: secondary (忽略) on the left, primary (生成成片) on the right — standard button order.
            Generates the WHOLE storyboard into finished videos (not the single inspected shot). */}
        <div className="mt-4 flex items-center gap-3 border-t border-hairline pt-4">
          <button onClick={onDismiss} className="text-[12.5px] text-muted font-medium rounded-full px-3.5 py-2 hover:text-reject hover:bg-hair2 transition-colors inline-flex items-center gap-1"><X size={13} weight="bold" /> 忽略方案</button>
          {items.length > 0 && (generating
            ? <span className="text-[12.5px] text-muted inline-flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full border-2 border-[#dcdbd9] border-t-primary gx-spin" />生成队列中 {done}/{items.length}</span>
            : <button onClick={onViewLibrary} className="text-[12.5px] text-pass font-medium inline-flex items-center gap-1 hover:underline"><CheckCircle size={14} weight="fill" /> 已生成 · 查看素材库 <CaretRight size={12} weight="bold" /></button>)}
          <span className="flex-1" />
          <span className="text-[12px] text-faint hidden lg:inline">合成全部 {videoCount} 个镜头</span>
          <CountSelect value={genCount} onChange={setGenCount} />
          <button onClick={() => onGenerate(genCount)} className="text-[13px] font-semibold rounded-full px-6 py-2 min-w-[124px] bg-primary text-white hover:bg-primary2 transition-transform active:scale-[0.97]">{items.length > 0 ? "重新生成成片" : "生成成片"}</button>
        </div>
      </div>

      {/* Deleting a shot is irreversible — confirm first */}
      <ConfirmModal open={pendingDel !== null}
        title={`删除镜头 ${pendingDel ?? ""}?`}
        body="该镜头及其模型、提示词、参考素材都会被移除，且无法撤回。后面的镜头会自动重新编号。"
        confirmLabel="删除镜头"
        onCancel={() => setPendingDel(null)}
        onConfirm={() => { if (pendingDel !== null) { onDeleteShot(c.n, pendingDel); setSelShot(Math.max(1, pendingDel - 1)); } setPendingDel(null); }} />
    </div>
  );
}

/* ───────────────────────── Model picker (minimal — name only) ───────────────────────── */
function ModelSelect({ value, options, onChange, compact }: { value: string; options: string[]; onChange: (v: string) => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={compact ? "relative shrink-0" : "relative"}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        className={compact
          ? `inline-flex items-center gap-1.5 text-[12px] font-medium rounded-lg border px-2.5 py-1.5 bg-surface transition-colors ${open ? "border-primary ring-2 ring-tint" : "border-hairline hover:border-[#cdd6e0] hover:bg-canvas"}`
          : `w-full flex items-center justify-between text-[13px] rounded-lg px-3 py-2 bg-surface border transition-colors ${open ? "border-primary ring-2 ring-tint" : "border-hairline hover:border-[#cdd6e0]"}`}>
        <span className="font-medium text-ink truncate">{value}</span>
        <CaretDown size={compact ? 12 : 13} weight="bold" className={`text-faint transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}
              className={`absolute left-0 top-full mt-1.5 z-20 bg-surface border border-hairline rounded-xl shadow-[0_8px_28px_rgba(0,0,0,0.13)] p-1 max-h-[300px] overflow-y-auto ${compact ? "min-w-[180px]" : "right-0"}`}>
              {options.map((m) => {
                const sel = m === value;
                return (
                  <button key={m} type="button" onClick={() => { onChange(m); setOpen(false); }}
                    className={`w-full flex items-center justify-between text-left text-[13px] rounded-lg px-2.5 py-1.5 transition-colors ${sel ? "text-primary font-medium bg-tint" : "text-ink2 hover:bg-hair2"}`}>
                    <span className="truncate">{m}</span>
                    {sel && <Check size={13} weight="bold" className="text-primary shrink-0" />}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────────── Per-model parameter bar (IA: prompt is primary, params are secondary) ─────────────
   Less-adjusted params don't deserve permanent screen space. They collapse into compact chips that open
   popovers: a 格式 chip (aspect/resolution/duration/audio), a 运镜 toggle-list, and a 更多 chip for the rest.
   Mirrors 即梦 / LiblibAI: the big text prompt is the hero; everything else is one click away. */
const FORMAT_KEYS = ["aspect", "resolution", "duration", "audio", "fps"];
// Fixed slot widths (px) sized to each field's LONGEST value — prevents the chip reflowing on value change.
const SLOT_W: Record<string, number> = { aspect: 32, resolution: 40, duration: 26, fps: 40 };
function ParamBar({ specs, values, onChange }: { specs: ParamSpec[]; values: Record<string, ParamValue>; onChange: (key: string, value: ParamValue) => void }) {
  const format = specs.filter((s) => FORMAT_KEYS.includes(s.key));
  const camera = specs.find((s) => s.key === "camera");
  const rest = specs.filter((s) => !FORMAT_KEYS.includes(s.key) && s.key !== "camera");
  const get = (k: string, d: ParamValue) => values[k] ?? d;
  const aspectSpec = format.find((p) => p.key === "aspect");
  const aspectVal = aspectSpec ? String(get("aspect", aspectSpec.default)) : "";
  // Each value gets a fixed-width slot sized to its longest possible value, so changing a value
  // (5s→10s, 720P→1080P, 9:16→1:1) never resizes the chip. Audio is in the popover, not the summary.
  const visible = format.filter((p) => p.key !== "audio");
  const fmtNode = visible.length ? (
    <span className="inline-flex items-center gap-1">
      {aspectVal && <RatioGlyph ratio={aspectVal} />}
      {visible.map((p, i) => (
        <span key={p.key} className="inline-flex items-center">
          {i > 0 && <span className="text-faint px-1">·</span>}
          <span className="inline-block text-center" style={{ minWidth: SLOT_W[p.key] ?? 28 }}>{`${get(p.key, p.default)}${p.unit ?? ""}`}</span>
        </span>
      ))}
    </span>
  ) : "画面格式";
  return (
    <>
      {format.length > 0 && (
        <ParamChip summary={fmtNode}>
          <FieldStack specs={format} values={values} onChange={onChange} />
        </ParamChip>
      )}
      {camera && (
        <ParamChip summary={`运镜 · ${get(camera.key, camera.default)}`}>
          <ToggleList spec={camera} value={String(get(camera.key, camera.default))} onChange={(v) => onChange(camera.key, v)} />
        </ParamChip>
      )}
      {rest.length > 0 && (
        <ParamChip summary={<span className="inline-flex items-center gap-1"><SlidersHorizontal size={13} /> 更多</span>} align="right">
          <FieldStack specs={rest} values={values} onChange={onChange} />
        </ParamChip>
      )}
    </>
  );
}
// A bar chip that opens a popover panel. Portal-rendered with viewport-aware placement:
// it flips above the chip when there isn't room below, and scrolls internally if tall —
// so it never clips off the bottom of the inspector.
const CHIP_PANEL_W = 300;
function ParamChip({ summary, align = "left", children }: { summary: React.ReactNode; align?: "left" | "right"; children: React.ReactNode }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [box, setBox] = useState<{ left: number; top?: number; bottom?: number; maxH: number } | null>(null);
  const place = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const gap = 6, margin = 12;
    const below = window.innerHeight - r.bottom - margin;
    const above = r.top - margin;
    const flip = below < 280 && above > below;   // open upward only when below is cramped and above has more room
    const left = align === "right" ? r.right - CHIP_PANEL_W : r.left;
    setBox({
      left: Math.max(8, Math.min(left, window.innerWidth - CHIP_PANEL_W - 8)),
      maxH: Math.max(180, flip ? above : below),
      ...(flip ? { bottom: window.innerHeight - r.top + gap } : { top: r.bottom + gap }),
    });
  };
  const open = box !== null;
  return (
    <div className="shrink-0">
      <button ref={btnRef} type="button" onClick={() => (open ? setBox(null) : place())}
        className={`inline-flex items-center gap-1.5 text-[12px] font-medium rounded-lg border px-2.5 py-1.5 bg-surface transition-colors ${open ? "border-primary ring-2 ring-tint" : "border-hairline hover:border-[#cdd6e0] hover:bg-canvas"}`}>
        <span className="text-ink2 tabular-nums">{summary}</span>
        <CaretDown size={12} weight="bold" className={`text-faint transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {box && typeof document !== "undefined" && createPortal(
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setBox(null)} />
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.12 }}
            style={{ left: box.left, top: box.top, bottom: box.bottom, width: CHIP_PANEL_W, maxHeight: box.maxH }}
            className="fixed z-[70] overflow-y-auto bg-surface border border-hairline rounded-xl shadow-[0_12px_36px_rgba(0,0,0,0.16)] p-3.5">
            {children}
          </motion.div>
        </>, document.body)}
    </div>
  );
}
// Vertical label+control list used inside the popovers.
function FieldStack({ specs, values, onChange }: { specs: ParamSpec[]; values: Record<string, ParamValue>; onChange: (key: string, value: ParamValue) => void }) {
  return (
    <div className="space-y-3">
      {specs.map((p) => (
        <div key={p.key}>
          <div className="flex items-center gap-1 mb-1.5">
            <label className="text-[11px] text-muted font-medium">{p.label}</label>
            {p.hint && <Tooltip label={p.hint}><span className="text-faint hover:text-muted transition-colors inline-flex"><Info size={12} /></span></Tooltip>}
          </div>
          <ParamControlEl spec={p} value={values[p.key] ?? p.default} onChange={(v) => onChange(p.key, v)} />
        </div>
      ))}
    </div>
  );
}
// Camera movement as a selectable toggle list (LiblibAI pattern).
function ToggleList({ spec, value, onChange }: { spec: ParamSpec; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="text-[11px] text-muted font-medium mb-1.5">{spec.label}</div>
      <div className="space-y-0.5 max-h-[240px] overflow-y-auto">
        {(spec.options ?? []).map((o) => {
          const sel = o.value === value;
          return (
            <button key={o.value} type="button" onClick={() => onChange(o.value)}
              className={`w-full flex items-center justify-between text-left text-[12.5px] rounded-lg px-2.5 py-2 transition-colors ${sel ? "bg-tint text-primary font-medium" : "text-ink2 hover:bg-hair2"}`}>
              <span>{o.label}</span>
              {sel && <Check size={13} weight="bold" className="text-primary shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
// A tiny rectangle glyph shaped like the aspect ratio — so "9:16" reads at a glance in the format chip.
function RatioGlyph({ ratio }: { ratio: string }) {
  const max = 11;
  let w = max, h = max;
  if (ratio.includes(":")) {
    const [a, b] = ratio.split(":").map(Number);
    if (a && b) {
      w = a >= b ? max : Math.max(Math.round((a / b) * max), 5);
      h = a >= b ? Math.max(Math.round((b / a) * max), 5) : max;
    }
  }
  return <span className="inline-block rounded-[1.5px] border-[1.5px] border-current shrink-0" style={{ width: w, height: h }} />;
}
// How many finished variants to produce. Opens upward (it sits low on the card). Default 1.
function CountSelect({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [open, setOpen] = useState(false);
  const opts = [1, 2, 4, 8];
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 text-[12.5px] font-medium rounded-full border px-3.5 py-2 bg-surface transition-colors ${open ? "border-primary ring-2 ring-tint" : "border-hairline hover:bg-canvas"}`}>
        <span className="text-muted">出</span> <span className="tabular-nums font-semibold text-ink">{value}</span> <span className="text-muted">条</span>
        <CaretDown size={12} weight="bold" className={`text-faint transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.12 }}
              className="absolute right-0 bottom-full mb-1.5 z-20 w-[148px] bg-surface border border-hairline rounded-xl shadow-[0_8px_28px_rgba(0,0,0,0.13)] p-1">
              {opts.map((n) => {
                const sel = n === value;
                return (
                  <button key={n} type="button" onClick={() => { onChange(n); setOpen(false); }}
                    className={`w-full flex items-center justify-between text-left text-[13px] rounded-lg px-2.5 py-1.5 transition-colors ${sel ? "text-primary font-medium bg-tint" : "text-ink2 hover:bg-hair2"}`}>
                    <span className="tabular-nums">{n} 条{n === 1 ? " · 默认" : ""}</span>
                    {sel && <Check size={13} weight="bold" className="text-primary shrink-0" />}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
// Aspect ratio as visual tiles — a little rectangle shaped like the ratio + its label (即梦 paradigm).
function ratioBox(v: string): { w: number; h: number } {
  const max = 18;
  if (!v.includes(":")) return { w: 14, h: 14 };
  const [a, b] = v.split(":").map(Number);
  if (!a || !b) return { w: 14, h: 14 };
  return a >= b ? { w: max, h: Math.max(Math.round((b / a) * max), 7) } : { w: Math.max(Math.round((a / b) * max), 7), h: max };
}
function AspectTiles({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {options.map((o) => {
        const sel = o.value === value;
        const { w, h } = ratioBox(o.value);
        return (
          <button key={o.value} type="button" onClick={() => onChange(o.value)}
            className={`flex flex-col items-center justify-center gap-1.5 py-2 rounded-lg border transition-colors ${sel ? "border-primary bg-tint" : "border-hairline hover:border-[#cdd6e0]"}`}>
            <span className="h-[18px] grid place-items-center">
              <span className="rounded-[2px] border-[1.5px]" style={{ width: w, height: h, borderColor: sel ? "var(--color-primary)" : "var(--color-muted)" }} />
            </span>
            <span className={`text-[10.5px] font-medium ${sel ? "text-primary" : "text-muted"}`}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
function ParamControlEl({ spec, value, onChange }: { spec: ParamSpec; value: ParamValue; onChange: (v: ParamValue) => void }) {
  if (spec.key === "aspect" && spec.options) return <AspectTiles options={spec.options} value={String(value)} onChange={onChange} />;
  switch (spec.control) {
    case "segmented":
      // iOS-style: a track with a raised selected pill — same paradigm as the top Tabs.
      return (
        <div className="flex w-full bg-canvas rounded-lg p-0.5 gap-0.5">
          {(spec.options ?? []).map((o) => {
            const sel = String(value) === o.value;
            return (
              <button key={o.value} type="button" onClick={() => onChange(o.value)}
                className={`flex-1 text-[12px] py-1 px-2 rounded-md whitespace-nowrap transition-colors ${sel ? "bg-surface text-ink font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : "text-muted font-medium hover:text-ink2"}`}>
                {o.label}
              </button>
            );
          })}
        </div>
      );
    case "select":
      return <OptSelect value={String(value)} options={spec.options ?? []} onChange={onChange} />;
    case "slider":
      return (
        <div className="flex items-center gap-2.5">
          <input type="range" min={spec.min} max={spec.max} step={spec.step} value={Number(value)}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="flex-1 h-1.5 accent-primary cursor-pointer" />
          <span className="text-[11.5px] text-ink2 font-medium tabular-nums w-12 text-right shrink-0">{value}{spec.unit ?? ""}</span>
        </div>
      );
    case "toggle":
      return (
        <button type="button" onClick={() => onChange(!value)}
          className={`relative w-9 h-5 rounded-full transition-colors ${value ? "bg-primary" : "bg-hairline"}`}>
          <motion.span layout transition={{ type: "spring", stiffness: 500, damping: 32 }}
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm ${value ? "left-[18px]" : "left-0.5"}`} />
        </button>
      );
    case "number":
      return (
        <input type="number" min={spec.min} max={spec.max} step={spec.step} value={Number(value)}
          onChange={(e) => onChange(e.target.value === "" ? 0 : parseFloat(e.target.value))}
          className="w-full text-[12.5px] border border-hairline rounded-lg px-3 py-1.5 outline-none focus:border-primary focus:ring-2 focus:ring-tint bg-surface tabular-nums" />
      );
    case "text":
      return (
        <input type="text" value={String(value)} placeholder={spec.hint}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-[12.5px] border border-hairline rounded-lg px-3 py-1.5 outline-none focus:border-primary focus:ring-2 focus:ring-tint bg-surface placeholder:text-faint" />
      );
  }
}
// Compact popover select for {value,label} options (long lists like 运镜 / 音色).
function OptSelect({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const cur = options.find((o) => o.value === value);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between text-[12.5px] rounded-lg px-3 py-1.5 bg-surface border transition-colors ${open ? "border-primary ring-2 ring-tint" : "border-hairline hover:border-[#cdd6e0]"}`}>
        <span className="font-medium text-ink truncate">{cur?.label ?? value}</span>
        <CaretDown size={12} weight="bold" className={`text-faint transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}
              className="absolute left-0 right-0 top-full mt-1.5 z-20 bg-surface border border-hairline rounded-xl shadow-[0_8px_28px_rgba(0,0,0,0.13)] p-1 max-h-52 overflow-y-auto">
              {options.map((o) => {
                const sel = o.value === value;
                return (
                  <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }}
                    className={`w-full flex items-center justify-between text-left text-[12.5px] rounded-lg px-2.5 py-1.5 transition-colors ${sel ? "text-primary font-medium bg-tint" : "text-ink2 hover:bg-hair2"}`}>
                    <span className="truncate">{o.label}</span>
                    {sel && <Check size={12} weight="bold" className="text-primary shrink-0" />}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────────── Shot card (element-level) ───────────────────────── */
// The selected-shot inspector. Always editable inline — expanding a shot IS editing it (no 编辑 button,
// no save/cancel). Every change writes live to the shot. AI shots edit model + prompt + every supported
// param; upload shots manage their footage.
function ShotCard({ s, onSetModel, onSetPrompt, onSetParam }: {
  s: Shot;
  onSetModel: (m: string) => void; onSetPrompt: (p: string) => void; onSetParam: (key: string, value: ParamValue) => void;
}) {
  const elem = ELEM[s.type];
  const isAI = s.source === "ai";
  return (
    <div className="w-full self-start">
      {/* Header: shot index + timing + element label + modified badge */}
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-bold text-ink2">镜头 {s.no}</span>
        <span className="text-[11px] text-faint tabular-nums">{s.t}</span>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold ml-1" style={{ color: elem.color }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: elem.color }} />{elem.label}
        </span>
        <span className="flex-1" />
      </div>

      {/* Description (the WHAT) */}
      <div className="text-[13px] text-ink2 leading-relaxed mt-2.5">{s.d}</div>

      {isAI ? (
        /* ── Prompt is the hero; model + params live in a compact control bar (secondary popovers). ── */
        <div className="mt-3.5">
          <label className="block text-[11px] text-muted font-medium mb-1.5">提示词</label>
          <textarea value={s.prompt ?? ""} onChange={(e) => onSetPrompt(e.target.value)} placeholder="描述你想要生成的画面内容…"
            rows={5} className="w-full text-[13px] border border-hairline rounded-lg px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-tint bg-surface resize-none leading-relaxed placeholder:text-faint" />
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <ModelSelect compact value={s.model ?? ""} options={MODEL_OPTIONS[s.type]} onChange={onSetModel} />
            <ParamBar specs={MODEL_PARAMS[s.model ?? ""] ?? []} values={s.params ?? defaultParams(s.model ?? "")} onChange={onSetParam} />
          </div>
        </div>
      ) : (
        /* ── Upload element: manage the footage. No model / prompt / params. ── */
        <div className="mt-3">
          {s.asset ? (
            <div className="flex items-center gap-2 rounded-md border border-hairline p-1.5">
              <span className="relative w-9 h-9 rounded overflow-hidden bg-black shrink-0">
                <img src={img(s.seed ?? s.asset, 80, 80)} alt="" className="w-full h-full object-cover opacity-90" />
                <span className="absolute inset-0 grid place-items-center text-white"><Play size={10} weight="fill" className="ml-0.5 drop-shadow" /></span>
              </span>
              <span className="text-[12px] text-ink2 font-medium truncate flex-1">{s.asset}</span>
              <button className="text-[11.5px] text-primary font-medium shrink-0 hover:underline">替换</button>
            </div>
          ) : (
            <button className="w-full flex flex-col items-center justify-center gap-1 rounded-md border border-dashed border-[#e3c08a] bg-modbg py-4 text-modified hover:border-modified transition-colors">
              <UploadSimple size={17} weight="bold" />
              <span className="text-[12px] font-semibold">上传{elem.label}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Video tile ───────────────────────── */
function VideoTile({ v, onClick, selectable, selected, member, onToggleMember, onToggleSel, compact }: { v: Video; onClick: (v: Video) => void; selectable?: boolean; selected?: boolean; member?: boolean; onToggleMember?: () => void; onToggleSel?: () => void; compact?: boolean }) {
  const out = onToggleMember !== undefined && member === false; // a result variant explicitly removed from library
  return (
    <div onClick={() => onClick(v)} className={`group relative rounded-xl overflow-hidden border bg-black aspect-[9/16] cursor-pointer transition-all active:scale-[0.98] ${selected ? "border-primary outline outline-[2.5px] -outline-offset-[2.5px] outline-primary" : "border-hairline"} ${out ? "opacity-55" : ""}`}>
      <img src={img(v.seed, 200, 356)} alt="" className="w-full h-full object-cover opacity-90" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[42px] h-[42px] rounded-full bg-white/[0.18] border border-white/45 backdrop-blur-sm grid place-items-center text-white opacity-90 group-hover:scale-110 transition-transform"><Play size={15} weight="fill" className="ml-0.5" /></div>
      {!compact && <span className="absolute top-2 right-2 text-[10px] font-semibold text-white bg-black/55 px-1.5 py-0.5 rounded-full tabular-nums">{v.ratio} · {v.dur}</span>}
      {onToggleMember && (
        // Photos-style quiet selection: filled green check when in the library, empty ring when removed.
        <Tooltip label={member ? "已加入素材库 · 点击移出" : "点击加入素材库"} className="absolute top-2 left-2 inline-flex">
          <button onClick={(e) => { e.stopPropagation(); onToggleMember(); }}
            className={`w-[22px] h-[22px] rounded-full grid place-items-center transition-transform active:scale-90 ${member ? "bg-pass text-white shadow-[0_1px_3px_rgba(0,0,0,0.3)]" : "bg-black/25 border-[1.5px] border-white/85 backdrop-blur-sm"}`}>
            {member && <motion.span key="in" initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 520, damping: 16 }}><Check size={13} weight="bold" /></motion.span>}
          </button>
        </Tooltip>
      )}
      {selectable && (
        <button onClick={(e) => { e.stopPropagation(); onToggleSel?.(); }} className={`absolute top-2 left-2 w-[22px] h-[22px] rounded-full grid place-items-center transition-transform active:scale-90 ${selected ? "bg-primary text-white" : "bg-black/25 border-[1.5px] border-white/85 backdrop-blur-sm text-transparent"}`}><Check size={13} weight="bold" /></button>
      )}
      <div className="absolute left-2 right-2 bottom-2 text-white text-[11.5px] font-semibold [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]">{v.label}<div className="text-[10.5px] text-white/75 font-medium">{v.channel}</div></div>
    </div>
  );
}

/* ───────────────────────── Preview modal ───────────────────────── */
function PreviewModal({ video, conceptData, onClose }: { video: Video | null; conceptData: Concept[]; onClose: () => void }) {
  const matchedConcept = video ? conceptData.find((c) => video.label.startsWith(c.short)) : null;
  const shots = matchedConcept?.shots ?? [];

  return (
    <AnimatePresence>
      {video && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-[rgba(20,20,20,0.45)]" onClick={onClose} />
          <motion.div initial={{ scale: 0.92, y: 8, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative bg-surface rounded-2xl border border-hairline shadow-[0_24px_70px_rgba(0,0,0,0.25)] flex overflow-hidden w-[740px] max-w-[92vw] max-h-[86vh]">
            <div className="w-[300px] shrink-0 bg-black relative">
              <img src={img(video.seed, 360, 640)} alt="" className="w-full h-full object-cover" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[54px] h-[54px] rounded-full bg-white/[0.18] border border-white/45 backdrop-blur grid place-items-center text-white"><Play size={19} weight="fill" className="ml-0.5" /></div>
              <div className="absolute left-3 right-3 bottom-3 h-1 rounded-full bg-white/30"><span className="block w-[38%] h-full bg-white rounded-full" /></div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col">
              <header className="px-4 py-3 border-b border-hairline flex items-center gap-2">
                <div><div className="text-[14px] font-bold tracking-tight">{video.label}</div><div className="text-[12px] text-faint tabular-nums">{video.ratio} · {video.dur} · {video.channel}</div></div>
                <button onClick={onClose} className="ml-auto text-faint hover:bg-hair2 p-1 rounded"><X size={16} /></button>
              </header>
              {video.isRef ? (
                <>
                  <div className="flex-1 overflow-y-auto px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-faint font-semibold mb-2">风格参考</div>
                    <div className="text-[13px] text-ink2 leading-relaxed">这是该方案对标的成片感觉 —— Agent 据此设计了下方分镜与模型选择。最终成片不会照搬，而是按你的素材和品牌重新生成。</div>
                    {video.refSource && (
                      <div className="mt-3 flex items-center gap-2 text-[12px]">
                        <span className="text-faint">来源</span>
                        <span className="font-medium text-ink2 bg-hair2 px-2 py-0.5 rounded-full">{video.refSource}</span>
                      </div>
                    )}
                  </div>
                  <div className="px-4 py-3 border-t border-hairline flex gap-2">
                    <button className="flex-1 text-[13px] font-semibold rounded-full py-2.5 border bg-surface text-ink border-hairline hover:bg-canvas">替换参考</button>
                    <button onClick={onClose} className="flex-1 text-[13px] font-semibold rounded-full py-2.5 border bg-primary text-white border-primary hover:bg-primary2">知道了</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-faint font-semibold mb-2">分镜 · {shots.length} 个元素</div>
                    {shots.length > 0
                      ? shots.map((s) => <DrawerShot key={s.no} s={s} />)
                      : <>
                          <DrawerShot s={{ no: 1, t: "0–3s", type: "ai-video", source: "ai", d: "黑屏，剑光劈开画面，连击数 ×1 弹出", model: "Kling v2.0", prompt: "黑屏中一道剑光从左至右劈开画面...", reasoning: "开场悬念钩子" }} />
                          <DrawerShot s={{ no: 2, t: "3–10s", type: "gameplay", source: "upload", asset: "连招实拍_v3.mp4", seed: "c1a", d: "连招实拍，震屏顿帧，数字飙到 ×99", reasoning: "实拍真实感" }} />
                          <DrawerShot s={{ no: 3, t: "10–15s", type: "static", source: "ai", d: "logo + CTA + 角标", model: "模板引擎", prompt: "游戏logo居中...", reasoning: "品牌一致性" }} />
                        </>
                    }
                  </div>
                  <div className="px-4 py-3 border-t border-hairline flex gap-2">
                    <button className="flex-1 text-[13px] font-semibold rounded-full py-2.5 border bg-surface text-ink border-hairline hover:bg-canvas inline-flex items-center justify-center gap-1.5"><ArrowsClockwise size={14} /> 重新生成</button>
                    <button onClick={onClose} className="flex-1 text-[13px] font-semibold rounded-full py-2.5 border bg-primary text-white border-primary hover:bg-primary2">加入素材库</button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
function DrawerShot({ s }: { s: Shot }) {
  const elem = ELEM[s.type];
  return (
    <div className="flex gap-2.5 py-2.5 border-b border-[#f4f3f2] last:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-faint font-semibold">镜头 {s.no} · {s.t}</div>
        <div className="text-[12.5px] text-ink2 leading-snug mt-0.5">{s.d}</div>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold" style={{ color: elem.color }}>
            <span className="w-[5px] h-[5px] rounded-full" style={{ background: elem.color }} />{elem.label}
          </span>
          {s.source === "ai" ? (
            <><span className="text-[10px] text-faint">→</span><span className="text-[10.5px] font-medium text-ink2">{s.model}</span></>
          ) : (
            <span className="text-[10px] font-semibold text-muted">· {s.asset ? "用户素材" : "需上传"}</span>
          )}
        </div>
      </div>
      <button className="text-[11.5px] text-primary font-medium shrink-0 self-start mt-0.5">{s.source === "ai" ? "重新生成" : "替换"}</button>
    </div>
  );
}

/* ───────────────────────── New project modal ───────────────────────── */
function NewProjectModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (name: string, desc: string) => void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-[rgba(20,20,20,0.45)]" onClick={onClose} />
          <motion.div initial={{ scale: 0.94, y: 10, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative bg-surface rounded-2xl border border-hairline shadow-[0_24px_70px_rgba(0,0,0,0.25)] w-[480px] max-w-[92vw] p-6">
            <div className="flex items-center mb-5"><h2 className="text-[18px] font-bold tracking-tight">新建项目</h2><button onClick={onClose} className="ml-auto w-7 h-7 rounded-full border border-hairline grid place-items-center text-muted hover:bg-canvas"><X size={15} /></button></div>
            <Field label="项目名称"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：星轨连击特效" className="w-full border border-hairline rounded-lg px-3 py-2 text-[13.5px] outline-none focus:border-primary" /></Field>
            <Field label="项目描述" optional><textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="目标、投放渠道、风格、禁用项…" className="w-full border border-hairline rounded-lg px-3 py-2 text-[13.5px] outline-none focus:border-primary resize-none" /></Field>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={onClose} className="text-[13px] font-medium rounded-full px-4 py-2 border border-hairline hover:bg-canvas">取消</button>
              <button onClick={() => onCreate(name, desc)} className="text-[13px] font-semibold rounded-full px-5 py-2 bg-primary text-white hover:bg-primary2 transition-transform active:scale-[0.97]">创建</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-[12.5px] font-semibold text-ink2 mb-1.5">{label}{optional && <span className="text-faint font-normal ml-1">（可选）</span>}</label>
      {children}
    </div>
  );
}

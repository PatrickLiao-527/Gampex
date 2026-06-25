"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkle } from "@phosphor-icons/react/dist/csr/Sparkle";
import { Star } from "@phosphor-icons/react/dist/csr/Star";
import { Folder } from "@phosphor-icons/react/dist/csr/Folder";
import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { Image as ImageIcon } from "@phosphor-icons/react/dist/csr/Image";
import { VideoCamera } from "@phosphor-icons/react/dist/csr/VideoCamera";
import { ArrowUp } from "@phosphor-icons/react/dist/csr/ArrowUp";
import { Check } from "@phosphor-icons/react/dist/csr/Check";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { Play } from "@phosphor-icons/react/dist/csr/Play";
import { ArrowsClockwise } from "@phosphor-icons/react/dist/csr/ArrowsClockwise";
import { ChatCircle } from "@phosphor-icons/react/dist/csr/ChatCircle";
import { Broadcast } from "@phosphor-icons/react/dist/csr/Broadcast";
import { motion, AnimatePresence } from "motion/react";
import { SRC, concepts, reviewVideos, initialMessages, img, type Concept, type Shot, type Video, type ChatMsg } from "@/lib/data";

type Tab = "create" | "deploy";
type GenItem = { id: string; label: string; channel: string; dur: string; seed: string; done: boolean };
type Project = { id: string; game: string; name: string };

const initialProjects: Project[] = [
  { id: "p1", game: "星轨", name: "连击特效批次" },
  { id: "p2", game: "王者征途", name: "新春买量" },
  { id: "p3", game: "星际争霸", name: "ROAS 测试" },
];

export default function Workspace() {
  const [tab, setTab] = useState<Tab>("create");
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [activeId, setActiveId] = useState("p1");
  const [showNew, setShowNew] = useState(false);

  const [preview, setPreview] = useState<Video | null>(null);
  const [chatW, setChatW] = useState(396);
  const [chatOpen, setChatOpen] = useState(true);

  const [selected, setSelected] = useState<Set<number>>(() => new Set(concepts.filter((c) => c.sel).map((c) => c.n)));
  const [gen, setGen] = useState<GenItem[]>([]);
  const [videos, setVideos] = useState<Video[]>(reviewVideos);
  const [messages, setMessages] = useState<ChatMsg[]>(initialMessages);
  const [librarySel, setLibrarySel] = useState<Set<string>>(new Set());

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
  useEffect(() => {
    if (gen.length > 0 && gen.every((t) => t.done))
      setVideos(gen.map((t) => ({ id: t.id, label: t.label, channel: t.channel, dur: t.dur, seed: t.seed, state: "pending" as const })));
  }, [gen]);

  function toggleConcept(n: number) { setSelected((p) => { const s = new Set(p); s.has(n) ? s.delete(n) : s.add(n); return s; }); }
  function startGeneration() {
    const sel = concepts.filter((c) => selected.has(c.n));
    if (!sel.length) return;
    const items: GenItem[] = [];
    for (const c of sel) for (let v = 1; v <= 4; v++)
      items.push({ id: `g-${c.n}-${v}`, label: `${c.short} v${v}`, channel: c.tags[0], dur: c.tags[1] ?? "15s", seed: `gen${c.n}${v}`, done: false });
    setGen(items);
    if (genTimer.current) clearInterval(genTimer.current);
    genTimer.current = setInterval(() => {
      setGen((prev) => { const i = prev.findIndex((t) => !t.done); if (i < 0) { if (genTimer.current) clearInterval(genTimer.current); return prev; } const n = [...prev]; n[i] = { ...n[i], done: true }; return n; });
    }, 460);
  }
  function toggleLibrary(id: string) { setLibrarySel((p) => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; }); }
  function send(text: string) {
    const t = text.trim(); if (!t) return;
    setMessages((m) => [...m, { role: "u", text: t }]);
    window.setTimeout(() => setMessages((m) => [...m, { role: "a", text: "收到，我调整一下方案 →" }]), 600);
  }
  function createProject(name: string, game: string) {
    const id = "p" + (projects.length + 1) + Math.floor(performance.now() % 1000);
    setProjects((p) => [...p, { id, game: game || "新游戏", name: name || "未命名批次" }]);
    setActiveId(id); setShowNew(false); setTab("create"); setGen([]);
  }

  const showChat = tab === "create";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar projects={projects} activeId={activeId} onSelect={(id) => { setActiveId(id); setTab("create"); }} onNew={() => setShowNew(true)} />

      <ProjectView
        project={project} tab={tab} onTab={setTab}
        chatOpen={chatOpen} onReopenChat={() => setChatOpen(true)}
        selected={selected} onToggle={toggleConcept} onGenerate={startGeneration} gen={gen}
        videos={videos} librarySel={librarySel} onToggleLib={toggleLibrary}
        onPreview={setPreview}
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

      <PreviewModal video={preview} onClose={() => setPreview(null)} />
      <NewProjectModal open={showNew} onClose={() => setShowNew(false)} onCreate={createProject} />
    </div>
  );
}

/* ───────────────────────── Sidebar (flat project list) ───────────────────────── */
function Sidebar({ projects, activeId, onSelect, onNew }: { projects: Project[]; activeId: string; onSelect: (id: string) => void; onNew: () => void }) {
  return (
    <aside className="w-[232px] shrink-0 bg-surface border-r border-hairline flex flex-col">
      <div className="px-4 pt-4 pb-3 flex items-center gap-2">
        <div className="w-[22px] h-[22px] rounded-md bg-primary" />
        <span className="font-bold tracking-tight text-[15px]">Gampex</span>
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
                <span className={`block text-[13px] font-medium truncate ${active ? "text-primary" : "text-ink"}`}>{p.game}</span>
                <span className="block text-[11.5px] text-faint truncate">{p.name}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="px-3 py-3 border-t border-hairline flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#62aef0] to-primary grid place-items-center text-white"><Star size={15} weight="fill" /></span>
        <span className="min-w-0 flex-1"><span className="block text-[12.5px] font-medium truncate">显哥的团队</span><span className="block text-[11px] text-faint">深圳 · 发行</span></span>
      </div>
    </aside>
  );
}

/* ───────────────────────── Project view (tabs: 工作台 / 素材·投放) ───────────────────────── */
function ProjectView(props: {
  project: Project; tab: Tab; onTab: (t: Tab) => void; chatOpen: boolean; onReopenChat: () => void;
  selected: Set<number>; onToggle: (n: number) => void; onGenerate: () => void; gen: GenItem[];
  videos: Video[]; librarySel: Set<string>; onToggleLib: (id: string) => void; onPreview: (v: Video) => void;
}) {
  const { project, tab, onTab, chatOpen, onReopenChat, selected, onToggle, onGenerate, gen, videos, librarySel, onToggleLib, onPreview } = props;
  const genDone = gen.filter((t) => t.done).length;
  const generating = gen.length > 0 && genDone < gen.length;
  const finished = gen.length > 0 && genDone === gen.length;
  const [filter, setFilter] = useState("全部");
  const channels = ["全部", ...Array.from(new Set(videos.map((v) => v.channel)))];
  const shown = filter === "全部" ? videos : videos.filter((v) => v.channel === filter);

  return (
    <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
      <div className="bg-surface border-b border-hairline px-5 py-2.5 flex items-center gap-3">
        <div className="text-[13px] font-semibold tracking-tight whitespace-nowrap text-ink2">{project.game} <span className="text-faint font-normal text-[12px]">· {project.name}</span></div>
        <Tabs tab={tab} onTab={onTab} />
        <span className="flex-1" />
        {tab === "create" ? (
          <>
            {gen.length === 0 && <PillBtn primary disabled={selected.size === 0} onClick={onGenerate}>生成已选 ({selected.size}) · 每概念 ×4</PillBtn>}
            {generating && <span className="text-[12.5px] text-muted flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary" />生成中 {genDone} / {gen.length}</span>}
            {finished && <PillBtn primary onClick={() => onTab("deploy")}><span className="inline-flex items-center gap-1.5"><Broadcast size={15} weight="fill" /> 去投放 ({gen.length})</span></PillBtn>}
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
            <SectionLabel>分镜方案 · Agent 提议 4 个</SectionLabel>
            {concepts.map((c) => <ConceptCard key={c.n} c={c} selected={selected.has(c.n)} onToggle={() => onToggle(c.n)} />)}
            <button className="w-full py-2.5 border border-dashed border-hairline rounded-xl bg-canvassoft text-[13px] font-medium text-muted hover:border-[#cdd6e0] hover:text-ink2 transition-colors">+ 让 Agent 再想 3 个方案</button>
            <AnimatePresence>
              {gen.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 240, damping: 26 }} className="mt-9">
                  <SectionLabel>生成结果 {generating ? `· 生成中 ${genDone}/${gen.length}` : `· 已生成 ${gen.length}`}</SectionLabel>
                  <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))" }}>
                    {gen.map((t) => t.done
                      ? <VideoTile key={t.id} v={{ id: t.id, label: t.label, channel: t.channel, dur: t.dur, seed: t.seed, state: "pending" }} onClick={onPreview} />
                      : <div key={t.id} className="relative rounded-xl overflow-hidden border border-hairline bg-hair2 aspect-[9/16]">
                          <div className="absolute inset-0 gx-shimmer" />
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted">
                            <span className="w-6 h-6 rounded-full border-[3px] border-[#dcdbd9] border-t-primary gx-spin" />
                            <span className="text-[11px] font-semibold">生成中</span><span className="text-[10px] text-faint">{t.label}</span>
                          </div>
                        </div>)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))" }}>
            {shown.map((v) => <VideoTile key={v.id} v={v} onClick={onPreview} selectable selected={librarySel.has(v.id)} onToggleSel={() => onToggleLib(v.id)} />)}
          </div>
        )}
      </div>
    </div>
  );
}
function Tabs({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const items: [Tab, string][] = [["create", "素材"], ["deploy", "投放"]];
  return (
    <div className="flex items-center gap-0.5 bg-canvas rounded-lg p-0.5 ml-1">
      {items.map(([k, l]) => (
        <button key={k} onClick={() => onTab(k)} className={`px-3 py-1 rounded-md text-[13px] font-medium transition-colors ${tab === k ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : "text-muted hover:text-ink2"}`}>{l}</button>
      ))}
    </div>
  );
}

/* ───────────────────────── Chat ───────────────────────── */
function Chat({ project, messages, onClose, onSend }: { project: Project; messages: ChatMsg[]; onClose: () => void; onSend: (t: string) => void }) {
  const [input, setInput] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);
  useEffect(() => { threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" }); }, [messages.length]);
  const submit = () => { onSend(input); setInput(""); };
  return (
    <section className="w-full h-full bg-canvassoft border-l border-hairline flex flex-col overflow-hidden">
      <header className="px-4 py-2.5 border-b border-hairline flex items-center gap-2">
        <span className="text-[13px] font-bold tracking-tight truncate">{project.game} · {project.name}</span>
        <span className="flex-1" />
        <button onClick={onClose} title="收起对话" className="text-faint hover:text-ink2 p-1 rounded hover:bg-hair2"><CaretRight size={15} /></button>
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

/* ───────────────────────── shared bits ───────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] uppercase tracking-[0.06em] text-faint font-semibold mb-3">{children}</div>;
}
function ReopenPill({ show, onClick }: { show: boolean; onClick: () => void }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.button initial={{ opacity: 0, scale: 0.85, width: 0, marginLeft: 0 }} animate={{ opacity: 1, scale: 1, width: "auto", marginLeft: 4 }} exit={{ opacity: 0, scale: 0.85, width: 0, marginLeft: 0 }} transition={{ type: "spring", stiffness: 420, damping: 30 }} onClick={onClick}
          className="flex items-center gap-1.5 px-3 py-[7px] rounded-full bg-ink text-white text-[12.5px] font-medium hover:opacity-90 active:scale-95 whitespace-nowrap overflow-hidden shrink-0"><ChatCircle size={15} weight="fill" /> 对话</motion.button>
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
function ConceptCard({ c, selected, onToggle }: { c: Concept; selected: boolean; onToggle: () => void }) {
  return (
    <div className={`bg-surface border rounded-xl mb-3.5 overflow-hidden transition-colors ${selected ? "border-primary outline outline-2 -outline-offset-1 outline-primary" : "border-hairline"}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={onToggle} className={`w-[18px] h-[18px] rounded-md border grid place-items-center text-white transition-transform active:scale-90 ${selected ? "bg-primary border-primary" : "border-hairline hover:border-muted"}`}>{selected && <Check size={12} weight="bold" />}</button>
        <button onClick={onToggle} className="text-[14.5px] font-bold tracking-tight text-left"><span className="text-faint font-semibold mr-1.5">概念 {c.n}</span>{c.title}</button>
        <span className="flex gap-1.5">{c.tags.map((t) => <span key={t} className="text-[11.5px] px-2 py-0.5 rounded-full bg-hair2 text-muted">{t}</span>)}</span>
        {c.note && <span className="text-[11.5px] text-muted hidden xl:inline-flex items-center gap-1 ml-1"><span className="text-primary">✎</span>{c.note}</span>}
        <span className="flex-1" />
        <button className="text-[12.5px] text-muted px-2.5 py-1 rounded-lg hover:bg-hair2 hover:text-ink2">编辑</button>
      </div>
      <div className="px-4 pb-4 pt-1 flex gap-3 flex-wrap">{c.shots.map((s) => <ShotCard key={s.no} s={s} />)}</div>
    </div>
  );
}
function ShotCard({ s }: { s: Shot }) {
  const src = SRC[s.k];
  return (
    <div className="w-[172px] shrink-0 border border-hairline rounded-lg overflow-hidden bg-surface hover:border-[#cdd6e0] transition-colors">
      <div className="relative aspect-[16/10] bg-black">
        {src.real ? <img src={img(s.seed ?? s.k, 200, 125)} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full border-b border-dashed border-hairline bg-[#fafafa] grid place-items-center text-[10px] text-faint">待生成</div>}
        <span className="absolute top-1.5 left-1.5 text-[9.5px] font-semibold text-white bg-black/55 px-1.5 py-0.5 rounded-full">镜头 {s.no} · {s.t}</span>
      </div>
      <div className="p-2.5">
        <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold mb-1" style={{ color: src.color }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: src.color }} />{src.label}</span>
        <div className="text-[12px] text-ink2 leading-snug line-clamp-2">{s.d}</div>
      </div>
    </div>
  );
}
function VideoTile({ v, onClick, selectable, selected, onToggleSel }: { v: Video; onClick: (v: Video) => void; selectable?: boolean; selected?: boolean; onToggleSel?: () => void }) {
  return (
    <div onClick={() => onClick(v)} className={`group relative rounded-xl overflow-hidden border bg-black aspect-[9/16] cursor-pointer transition-transform active:scale-[0.98] ${selected ? "border-primary outline outline-[2.5px] -outline-offset-[2.5px] outline-primary" : "border-hairline"}`}>
      <img src={img(v.seed, 200, 356)} alt="" className="w-full h-full object-cover opacity-90" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[42px] h-[42px] rounded-full bg-white/[0.18] border border-white/45 backdrop-blur-sm grid place-items-center text-white opacity-90 group-hover:scale-110 transition-transform"><Play size={15} weight="fill" className="ml-0.5" /></div>
      <span className="absolute top-2 right-2 text-[10.5px] font-semibold text-white bg-black/55 px-1.5 py-0.5 rounded-full">{v.dur}</span>
      {selectable && (
        <button onClick={(e) => { e.stopPropagation(); onToggleSel?.(); }} className={`absolute top-2 left-2 w-[20px] h-[20px] rounded-md grid place-items-center transition-transform active:scale-90 ${selected ? "bg-primary text-white" : "bg-white/85 text-transparent hover:text-muted border border-black/10"}`}><Check size={13} weight="bold" /></button>
      )}
      <div className="absolute left-2 right-2 bottom-2 text-white text-[11.5px] font-semibold [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]">{v.label}<div className="text-[10.5px] text-white/75 font-medium">{v.channel}</div></div>
    </div>
  );
}

/* ───────────────────────── Preview modal ───────────────────────── */
function PreviewModal({ video, onClose }: { video: Video | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {video && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-[rgba(20,20,20,0.45)]" onClick={onClose} />
          <motion.div initial={{ scale: 0.92, y: 8, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative bg-surface rounded-2xl border border-hairline shadow-[0_24px_70px_rgba(0,0,0,0.25)] flex overflow-hidden w-[700px] max-w-[92vw] max-h-[86vh]">
            <div className="w-[300px] shrink-0 bg-black relative">
              <img src={img(video.seed, 360, 640)} alt="" className="w-full h-full object-cover" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[54px] h-[54px] rounded-full bg-white/[0.18] border border-white/45 backdrop-blur grid place-items-center text-white"><Play size={19} weight="fill" className="ml-0.5" /></div>
              <div className="absolute left-3 right-3 bottom-3 h-1 rounded-full bg-white/30"><span className="block w-[38%] h-full bg-white rounded-full" /></div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col">
              <header className="px-4 py-3 border-b border-hairline flex items-center gap-2">
                <div><div className="text-[14px] font-bold tracking-tight">{video.label}</div><div className="text-[12px] text-faint">{video.dur} · {video.channel}</div></div>
                <button onClick={onClose} className="ml-auto text-faint hover:bg-hair2 p-1 rounded"><X size={16} /></button>
              </header>
              <div className="flex-1 overflow-y-auto px-4 py-3">
                <div className="text-[11px] uppercase tracking-wide text-faint font-semibold mb-2">分镜 · 3 个镜头</div>
                <DrawerShot no="镜头 1 · 0–3s" d="黑屏，剑光劈开画面，连击数 ×1 弹出" src="ai" />
                <DrawerShot no="镜头 2 · 3–10s" d="连招实拍，震屏顿帧，数字飙到 ×99" src="gp" />
                <DrawerShot no="镜头 3 · 10–15s" d="大招金光 + logo + 「立即预约」+ 角标" src="cg" />
              </div>
              <div className="px-4 py-3 border-t border-hairline flex gap-2">
                <button className="flex-1 text-[13px] font-semibold rounded-full py-2.5 border bg-surface text-ink border-hairline hover:bg-canvas inline-flex items-center justify-center gap-1.5"><ArrowsClockwise size={14} /> 重新生成</button>
                <button onClick={onClose} className="flex-1 text-[13px] font-semibold rounded-full py-2.5 border bg-primary text-white border-primary hover:bg-primary2">加入素材库</button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
function DrawerShot({ no, d, src }: { no: string; d: string; src: keyof typeof SRC }) {
  const s = SRC[src];
  return (
    <div className="flex gap-2.5 py-2 border-b border-[#f4f3f2] last:border-0">
      <div className="flex-1">
        <div className="text-[11px] text-faint font-semibold">{no}</div>
        <div className="text-[12.5px] text-ink2 leading-snug mt-0.5">{d}</div>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold mt-1" style={{ color: s.color }}><span className="w-[5px] h-[5px] rounded-full" style={{ background: s.color }} />{s.label}</span>
      </div>
      <button className="text-[11.5px] text-primary font-medium shrink-0 self-start mt-0.5">重新生成</button>
    </div>
  );
}

/* ───────────────────────── New project modal ───────────────────────── */
function NewProjectModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (name: string, game: string) => void }) {
  const [game, setGame] = useState("");
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
            <Field label="游戏"><input value={game} onChange={(e) => setGame(e.target.value)} placeholder="如：星轨" className="w-full border border-hairline rounded-lg px-3 py-2 text-[13.5px] outline-none focus:border-primary" /></Field>
            <Field label="批次名称"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：连击特效批次" className="w-full border border-hairline rounded-lg px-3 py-2 text-[13.5px] outline-none focus:border-primary" /></Field>
            <Field label="给 Agent 的说明" optional><textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="这个项目的目标、风格、禁用项…" className="w-full border border-hairline rounded-lg px-3 py-2 text-[13.5px] outline-none focus:border-primary resize-none" /></Field>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={onClose} className="text-[13px] font-medium rounded-full px-4 py-2 border border-hairline hover:bg-canvas">取消</button>
              <button onClick={() => onCreate(name, game)} className="text-[13px] font-semibold rounded-full px-5 py-2 bg-primary text-white hover:bg-primary2 transition-transform active:scale-[0.97]">创建</button>
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

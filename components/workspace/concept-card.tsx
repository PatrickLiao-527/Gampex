"use client";

import { useState, useRef, useEffect } from "react";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { Play } from "@phosphor-icons/react/dist/csr/Play";
import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { Archive } from "@phosphor-icons/react/dist/csr/Archive";
import { Tooltip, ConfirmModal, CountStepper } from "./ui";
import { ShotBoard, Inspector } from "./shot-board";
import { type GenItem, type ShotSelection } from "./types";
import { img, type Concept, type ConceptRef, type Shot, type ShotVariation, type Video, type ParamValue, type AudioGlobal, type SubtitleConfig } from "@/lib/data";

export function ConceptCard({ c, gen, onGenerate, onPreview, onViewLibrary, onReorderShots, onDeleteShot, onAddShot, onSetShotModel, onSetShotPrompt, onSetShotParam, onSetShotVoLine, onSetShotAsset, onSetBgm, onSetVoStyle, selectedVariations, onGenerateVariation, onBulkGenerate, onSelectVariation, onPreviewVariation }: {
  c: Concept; gen?: GenItem[]; onGenerate: (count: number) => void; onPreview: (v: Video) => void; onViewLibrary: () => void;
  onReorderShots: (cn: number, orderedIds: string[]) => void; onDeleteShot: (cn: number, no: number) => void; onAddShot: (cn: number) => void;
  onSetShotModel: (cn: number, no: number, m: string) => void; onSetShotPrompt: (cn: number, no: number, p: string) => void; onSetShotParam: (cn: number, no: number, key: string, value: ParamValue) => void;
  onSetShotSfx?: (cn: number, no: number, v: string) => void; onSetShotVoLine: (cn: number, no: number, v: string) => void;
  onSetShotAsset: (cn: number, no: number, file: File) => void;
  onSetBgm: (cn: number, a: AudioGlobal) => void; onSetVoStyle: (cn: number, a: AudioGlobal) => void;
  selectedVariations: Record<string, string>;
  onGenerateVariation: (cn: number, no: number) => void; onBulkGenerate: (cn: number) => void;
  onSelectVariation: (cn: number, no: number, varId: string) => void;
  onPreviewVariation: (shot: Shot, v: ShotVariation) => void;
}) {
  const video = c.shots.filter((s) => s.type !== "vo");
  const [sel, setSel] = useState<ShotSelection>(() => (video[0] ? { kind: "shot", no: video[0].no } : { kind: "none" }));
  const [pendingDel, setPendingDel] = useState<number | null>(null);
  const [genCount, setGenCount] = useState(1);
  const [subtitle, setSubtitle] = useState<SubtitleConfig>({ on: true, template: "classic", pos: "bottom" });

  const items = gen ?? [];
  const selShot = sel.kind === "shot" ? c.shots.find((s) => s.no === sel.no) : undefined;
  const selectedVarId = selShot?.id ? selectedVariations[selShot.id] : undefined;
  // Pipeline stage — ② 生成镜头 must finish before ③ 成片 can assemble.
  const shotDone = video.filter((s) => s.variations?.some((v) => v.done)).length;
  const shotGenerating = video.some((s) => s.variations?.some((v) => !v.done));
  const shotsReady = video.length > 0 && shotDone === video.length;
  const cutGenerating = items.length > 0 && items.some((t) => !t.done);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Two-pane: spine | inspector (concept switcher + refs live in the merged tabs row above) */}
      <div className="flex-1 min-h-0 flex border border-hairline rounded-2xl overflow-hidden bg-surface">
        {/* LEFT — shot spine + audio tracks + generation pipeline */}
        <div className="w-[356px] shrink-0 flex flex-col border-r border-hairline min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto px-2">
            <ShotBoard shots={c.shots} selection={sel}
              onSelectShot={(no) => setSel({ kind: "shot", no })}
              onSelectTrack={(id) => setSel({ kind: "track", id })}
              onSelectOutput={() => setSel({ kind: "output" })}
              onReorderShots={(ids) => onReorderShots(c.n, ids)}
              onAdd={() => { onAddShot(c.n); setSel({ kind: "shot", no: video.length + 1 }); }}
              bgm={c.bgm} voStyle={c.voStyle} gen={gen}
              selectedVariations={selectedVariations} />
          </div>

          <div className="shrink-0 border-t border-hairline p-2.5 bg-canvassoft">
            {shotsReady ? (
              // ③ 成片 — shots are ready; assemble each shot's selected clip into the cut(s).
              <div className="flex items-center gap-2">
                <CountStepper value={genCount} onChange={setGenCount} />
                <span className="text-[11px] text-faint shrink-0">条</span>
                <span className="flex-1" />
                <button disabled={cutGenerating} onClick={() => { onGenerate(genCount); setSel({ kind: "output" }); }}
                  className="text-[13px] font-semibold rounded-full px-5 py-2 min-w-[116px] inline-flex items-center justify-center gap-1.5 bg-primary text-white hover:bg-primary2 disabled:opacity-60 disabled:hover:bg-primary transition-transform active:scale-[0.97] whitespace-nowrap">
                  {cutGenerating ? <><span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white gx-spin" />剪辑中</> : items.length > 0 ? "重新生成成片" : "生成成片"}
                </button>
              </div>
            ) : (
              // ② 生成镜头 — the 素材 engine. Bulk-fire all shots; no 成片 until they're ready.
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-ink2">生成镜头素材</div>
                  <div className="text-[10.5px] text-faint tabular-nums">{shotGenerating ? `生成中 · ${shotDone}/${video.length}` : shotDone > 0 ? `已生成 ${shotDone}/${video.length} · 还剩 ${video.length - shotDone} 镜` : `${video.length} 镜待生成`}</div>
                </div>
                <button disabled={shotGenerating} onClick={() => onBulkGenerate(c.n)}
                  className="text-[13px] font-semibold rounded-full px-5 py-2 min-w-[132px] inline-flex items-center justify-center gap-1.5 bg-primary text-white hover:bg-primary2 disabled:opacity-60 disabled:hover:bg-primary transition-transform active:scale-[0.97] whitespace-nowrap">
                  {shotGenerating ? <><span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white gx-spin" />生成中</> : shotDone > 0 ? `生成其余 ${video.length - shotDone} 镜` : "一键生成全部镜头"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — inspector for the selected shot or track */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          <Inspector selection={sel} shot={selShot} shots={c.shots}
            bgm={c.bgm} voStyle={c.voStyle} subtitle={subtitle}
            selectedVarId={selectedVarId}
            onSetModel={(m) => selShot && onSetShotModel(c.n, selShot.no, m)}
            onSetPrompt={(p) => selShot && onSetShotPrompt(c.n, selShot.no, p)}
            onSetParam={(k, v) => selShot && onSetShotParam(c.n, selShot.no, k, v)}
            onSetAsset={(file) => selShot && onSetShotAsset(c.n, selShot.no, file)}
            onGenerateVariation={() => selShot && onGenerateVariation(c.n, selShot.no)}
            onSelectVariation={(varId) => selShot && onSelectVariation(c.n, selShot.no, varId)}
            onPreviewVariation={(v) => selShot && onPreviewVariation(selShot, v)}
            onSetBgm={(a) => onSetBgm(c.n, a)}
            onSetVoStyle={(a) => onSetVoStyle(c.n, a)}
            onSetShotVoLine={(no, v) => onSetShotVoLine(c.n, no, v)}
            onSetSubtitle={setSubtitle}
            items={gen}
            onPlayResult={(item) => onPreview({ id: item.id, label: item.label, channel: item.channel, dur: item.dur, ratio: item.ratio, seed: item.seed, state: "pending" })}
            onGoDeploy={onViewLibrary}
            onDelete={() => selShot && setPendingDel(selShot.no)}
            canDelete={video.length > 1} />
        </div>
      </div>

      <ConfirmModal open={pendingDel !== null}
        title={`删除镜头 ${pendingDel ?? ""}?`}
        body="该镜头及其模型、提示词、参考素材都会被移除，且无法撤回。后面的镜头会自动重新编号。"
        confirmLabel="删除镜头"
        onCancel={() => setPendingDel(null)}
        onConfirm={() => { if (pendingDel !== null) { onDeleteShot(c.n, pendingDel); setSel(video.length > 1 ? { kind: "shot", no: 1 } : { kind: "none" }); } setPendingDel(null); }} />
    </div>
  );
}

export function ConceptTabs({ concepts, selectedN, onSelect, onDismiss, onPreview, gen, dismissedConcepts, onRestoreConcept, onRestoreAll, onAddConcept, onAddRef }: {
  concepts: Concept[]; selectedN: number; onSelect: (n: number) => void; onDismiss: (n: number) => void; onPreview: (v: Video) => void;
  gen: Record<number, GenItem[]>; dismissedConcepts: Concept[]; onRestoreConcept: (n: number) => void; onRestoreAll: () => void; onAddConcept: () => void;
  onAddRef: (file: File) => void;
}) {
  const selected = concepts.find((c) => c.n === selectedN) ?? concepts[0];
  // With many chips the strip scrolls horizontally; keep the active chip in view
  // (e.g. after adding a concept, whose chip is appended off the right edge).
  const activeChipRef = useRef<HTMLDivElement>(null);
  const refInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    activeChipRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [selectedN]);
  const openRef = (c: Concept, r: ConceptRef) =>
    onPreview({ id: `ref-${c.n}-${r.seed}`, label: r.label, channel: c.platform, dur: c.duration, ratio: c.aspectRatio, seed: r.seed, state: "pending", isRef: true, refSource: r.source, url: r.url, kind: r.kind, refMeta: { cn: c.n, seed: r.seed } });
  return (
    <div className="flex items-center gap-2 mb-3 shrink-0">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 min-w-0">
        {concepts.map((c) => {
          const items = gen[c.n] ?? [];
          const d = items.filter((t) => t.done).length;
          const generating = items.length > 0 && d < items.length;
          const allDone = items.length > 0 && d === items.length;
          const active = c.n === selectedN;
          return (
            <div key={c.n} ref={active ? activeChipRef : undefined} onClick={() => onSelect(c.n)}
              className={`group shrink-0 flex items-center gap-1.5 py-2 rounded-xl border cursor-pointer transition-colors ${active ? "bg-tint border-tintborder pl-3 pr-2" : "bg-surface border-hairline hover:bg-canvas px-3"}`}>
              <span className={`text-[12.5px] font-semibold whitespace-nowrap ${active ? "text-primary" : "text-ink2"}`}>{active ? c.title : c.short}</span>
              {generating
                ? <span className="w-3 h-3 rounded-full border-2 border-[#dcdbd9] border-t-primary gx-spin shrink-0" />
                : allDone ? <CheckCircle size={14} weight="fill" className="text-pass shrink-0" /> : null}
              {active && (
                <button onClick={(e) => { e.stopPropagation(); onDismiss(c.n); }}
                  className="shrink-0 grid place-items-center text-faint hover:text-reject rounded p-0.5 hover:bg-[#fdeee6] transition-colors" aria-label="忽略此概念">
                  <X size={12} weight="bold" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {/* Pinned OUTSIDE the overflow-x-auto strip, so it stays reachable no matter
          how many concept chips there are (chips scroll; this + never does). */}
      <Tooltip label="手动添加概念">
        <button onClick={onAddConcept} aria-label="手动添加概念"
          className="shrink-0 grid place-items-center w-8 h-8 rounded-xl border border-dashed border-hairline text-faint hover:border-[#cdd6e0] hover:text-ink2 hover:bg-canvas transition-colors">
          <Plus size={14} weight="bold" />
        </button>
      </Tooltip>
      <span className="flex-1" />
      {selected && (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] uppercase tracking-wide text-faint font-semibold whitespace-nowrap mr-0.5 hidden sm:inline">风格参考</span>
          {selected.refs.map((r) => (
            <Tooltip key={r.seed} label={`${r.label} · ${r.source}`}>
              <button onClick={() => openRef(selected, r)}
                className="relative w-8 h-8 rounded-md overflow-hidden bg-black ring-1 ring-hairline hover:ring-2 hover:ring-ink2 transition-all">
                {r.url
                  ? (r.kind === "video"
                    ? <video src={r.url} muted playsInline preload="metadata" className="w-full h-full object-cover opacity-90" />
                    : <img src={r.url} alt="" className="w-full h-full object-cover opacity-90" />)
                  : <img src={img(r.seed, 80, 80)} alt="" className="w-full h-full object-cover opacity-90" />}
                <span className="absolute inset-0 grid place-items-center text-white opacity-90"><Play size={9} weight="fill" className="ml-0.5 drop-shadow" /></span>
              </button>
            </Tooltip>
          ))}
          <Tooltip label="添加参考片">
            <button onClick={() => refInput.current?.click()} className="w-8 h-8 rounded-md border border-dashed border-hairline grid place-items-center text-faint hover:border-[#cdd6e0] hover:text-ink2 transition-colors"><Plus size={12} /></button>
          </Tooltip>
          <input ref={refInput} type="file" accept="video/*,image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onAddRef(f); }} />
        </div>
      )}
      <DismissedArchive concepts={dismissedConcepts} onRestore={onRestoreConcept} onRestoreAll={onRestoreAll} />
    </div>
  );
}

function DismissedArchive({ concepts, onRestore, onRestoreAll }: { concepts: Concept[]; onRestore: (n: number) => void; onRestoreAll: () => void }) {
  const [open, setOpen] = useState(false);
  if (concepts.length === 0) return null;
  return (
    <div className="relative shrink-0">
      <Tooltip label="已忽略的概念">
        <button onClick={() => setOpen((o) => !o)} className="relative inline-flex items-center justify-center w-8 h-8 rounded-md text-faint hover:text-ink2 hover:bg-hair2 transition-colors">
          <Archive size={16} />
          <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-ink text-white text-[9px] font-semibold grid place-items-center tabular-nums">{concepts.length}</span>
        </button>
      </Tooltip>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-40 w-[248px] bg-surface border border-hairline rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.16)] p-1.5">
            <div className="px-2 py-1.5 flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-[0.06em] text-faint font-semibold">已忽略</span>
              {concepts.length > 1 && <button onClick={() => { onRestoreAll(); setOpen(false); }} className="text-[11px] text-primary font-medium hover:underline">全部恢复</button>}
            </div>
            {concepts.map((c) => (
              <div key={c.n} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-hair2">
                <span className="text-[12.5px] text-ink2 truncate flex-1">{c.title}</span>
                <button onClick={() => onRestore(c.n)} className="text-[11.5px] text-primary font-medium hover:underline shrink-0">恢复</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}


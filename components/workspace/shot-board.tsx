"use client";

import { useRef, useState } from "react";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import { DotsSixVertical } from "@phosphor-icons/react/dist/csr/DotsSixVertical";
import { UploadSimple } from "@phosphor-icons/react/dist/csr/UploadSimple";
import { Play } from "@phosphor-icons/react/dist/csr/Play";
import { MusicNote } from "@phosphor-icons/react/dist/csr/MusicNote";
import { Microphone } from "@phosphor-icons/react/dist/csr/Microphone";
import { TextT } from "@phosphor-icons/react/dist/csr/TextT";
import { Sparkle } from "@phosphor-icons/react/dist/csr/Sparkle";
import { Check } from "@phosphor-icons/react/dist/csr/Check";
import { FilmSlate } from "@phosphor-icons/react/dist/csr/FilmSlate";
import { Info } from "@phosphor-icons/react/dist/csr/Info";
import { Reorder, useDragControls } from "motion/react";
import { Tooltip } from "./ui";
import { ModelSelect, ParamBar } from "./model-params";
import { spanOf, type ShotSelection, type GenItem } from "./types";
import { ELEM, MODEL_OPTIONS, MODEL_PARAMS, MODEL_INPUTS, BGM_MODELS, VO_MODELS, SUBTITLE_TEMPLATES, defaultParams, img, type Shot, type ShotVariation, type ParamValue, type AudioGlobal, type SubtitleTemplate, type SubtitleConfig } from "@/lib/data";

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-2 pt-3 pb-1 text-[10.5px] uppercase tracking-[0.06em] text-faint font-semibold flex items-center gap-1.5">{children}</div>;
}

// ── LEFT SPINE — the shot sequence + audio tracks, selection only ──────────
export function ShotBoard({ shots, selection, onSelectShot, onSelectTrack, onSelectOutput, onReorderShots, onAdd, bgm, voStyle, gen, selectedVariations }: {
  shots: Shot[]; selection: ShotSelection;
  onSelectShot: (n: number) => void; onSelectTrack: (id: "bgm" | "vo") => void; onSelectOutput: () => void;
  onReorderShots: (orderedIds: string[]) => void; onAdd: () => void;
  bgm?: AudioGlobal; voStyle?: AudioGlobal; gen?: GenItem[];
  selectedVariations: Record<string, string>;
}) {
  const video = shots.filter((s) => s.type !== "vo");
  const ids = video.map((s) => s.id as string);
  const totalSec = video.reduce((n, s) => { const [a, b] = spanOf(s.t); return n + Math.max(b - a, 1); }, 0);
  const doneCount = video.filter((s) => s.variations?.some((v) => v.done)).length;

  return (
    <div className="py-1">
      <GroupLabel>
        <span className="w-[5px] h-[5px] rounded-full" style={{ background: "var(--color-srcai)" }} />
        画面 · AI 视频
        <span className="text-faint/70 font-medium normal-case tracking-normal ml-0.5 tabular-nums">{video.length} 镜头 · {totalSec}s · {doneCount}/{video.length} 已生成</span>
      </GroupLabel>

      <Reorder.Group axis="y" values={ids} onReorder={onReorderShots} className="list-none" style={{ padding: 0, margin: 0 }}>
        {video.map((s) => (
          <SpineRow key={s.id} s={s}
            selected={selection.kind === "shot" && selection.no === s.no}
            onSelect={() => onSelectShot(s.no)}
            selectedVarId={s.id ? selectedVariations[s.id] : undefined} />
        ))}
      </Reorder.Group>

      <button onClick={onAdd}
        className="w-full flex items-center gap-1.5 py-2 px-2 mt-0.5 text-[11.5px] text-faint font-medium hover:bg-canvas hover:text-primary rounded-lg transition-colors">
        <Plus size={12} weight="bold" /> 添加镜头
      </button>

      <GroupLabel>音轨</GroupLabel>
      <TrackRow icon={<MusicNote size={13} weight="fill" />} color="var(--color-srcbgm)" label="BGM"
        summary={bgm?.model ? (bgm.prompt ? bgm.prompt.slice(0, 22) : bgm.model) : "未设置 · 点击配置"} hasContent={!!bgm?.model}
        selected={selection.kind === "track" && selection.id === "bgm"} onSelect={() => onSelectTrack("bgm")} />
      <TrackRow icon={<Microphone size={13} weight="fill" />} color="var(--color-srcvo)" label="配音 · 字幕"
        summary={voStyle?.model ? `${voStyle.model} · 台词轨` : "未设置 · 点击配置"} hasContent={!!voStyle?.model}
        selected={selection.kind === "track" && selection.id === "vo"} onSelect={() => onSelectTrack("vo")} />

      <GroupLabel>输出</GroupLabel>
      <OutputRow gen={gen} selected={selection.kind === "output"} onSelect={onSelectOutput} />
    </div>
  );
}

function SpineRow({ s, selected, onSelect, selectedVarId }: {
  s: Shot; selected: boolean; onSelect: () => void; selectedVarId?: string;
}) {
  const controls = useDragControls();
  const elem = ELEM[s.type];
  const [a, b] = spanOf(s.t); const len = Math.max(b - a, 1);
  const vars = s.variations ?? [];
  const generating = vars.some((v) => !v.done);
  const selectedVar = vars.find((v) => v.id === selectedVarId) ?? vars[0];

  return (
    <Reorder.Item value={s.id as string} dragListener={false} dragControls={controls} className="list-none">
      <div onClick={onSelect}
        className={`group flex items-center gap-2.5 py-2 pl-1 pr-2 rounded-lg cursor-pointer transition-colors ${selected ? "bg-tint" : "hover:bg-canvas"}`}>
        <button onPointerDown={(e) => { e.stopPropagation(); controls.start(e); }} onClick={(e) => e.stopPropagation()}
          className="shrink-0 grid place-items-center text-faint/0 group-hover:text-faint hover:!text-ink2 cursor-grab active:cursor-grabbing touch-none transition-colors">
          <DotsSixVertical size={13} weight="bold" />
        </button>

        <div className="shrink-0 w-[34px] aspect-[9/16] rounded-md overflow-hidden bg-canvassoft ring-1 ring-hairline relative grid place-items-center">
          {selectedVar?.done
            ? <img src={img(selectedVar.seed, 72, 128)} alt="" className="w-full h-full object-cover" />
            : generating ? <div className="absolute inset-0 gx-shimmer" />
            : s.refSeed
              ? <><img src={img(s.refSeed, 72, 128)} alt="" className="w-full h-full object-cover opacity-75" /><span className="absolute inset-x-0 bottom-0 text-[7px] leading-[1.4] text-center text-white bg-black/45">参考</span></>
              : <Play size={11} weight="fill" className="text-faint/40 ml-0.5" />}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] text-ink2 leading-snug line-clamp-1">{s.d}</p>
          <div className="flex items-center gap-1.5 mt-0.5 text-[10.5px] text-faint">
            <span className="inline-flex items-center gap-1 font-medium" style={{ color: elem.color }}>
              <span className="w-[5px] h-[5px] rounded-full" style={{ background: elem.color }} />{elem.label}
            </span>
            <span>·</span><span className="tabular-nums">{len}s</span>
          </div>
        </div>

        {generating && <span className="shrink-0 w-3 h-3 rounded-full border-2 border-[#dcdbd9] border-t-ink2 gx-spin" />}
      </div>
    </Reorder.Item>
  );
}

function TrackRow({ icon, color, label, summary, hasContent, selected, onSelect }: {
  icon: React.ReactNode; color: string; label: string; summary: string; hasContent: boolean; selected: boolean; onSelect: () => void;
}) {
  return (
    <div onClick={onSelect}
      className={`flex items-center gap-2.5 py-2 pl-1.5 pr-2 rounded-lg cursor-pointer transition-colors ${selected ? "bg-tint" : "hover:bg-canvas"}`}>
      <span className="shrink-0 w-[26px] h-[26px] rounded-md grid place-items-center bg-surface border border-hairline" style={{ color }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] text-ink2 font-medium leading-snug">{label}</p>
        <p className={`text-[10.5px] leading-snug mt-0.5 truncate ${hasContent ? "text-faint" : "text-faint/70"}`}>{summary}</p>
      </div>
    </div>
  );
}

function OutputRow({ gen, selected, onSelect }: { gen?: GenItem[]; selected: boolean; onSelect: () => void }) {
  const items = gen ?? [];
  const done = items.filter((t) => t.done).length;
  const generating = items.length > 0 && done < items.length;
  const summary = items.length === 0 ? "未生成 · 生成后在这里查看" : generating ? `生成中 · ${done}/${items.length}` : `${items.length} 条 · 点击查看`;
  return (
    <div onClick={onSelect}
      className={`flex items-center gap-2.5 py-2 pl-1.5 pr-2 rounded-lg cursor-pointer transition-colors ${selected ? "bg-tint" : "hover:bg-canvas"}`}>
      <span className="shrink-0 w-[26px] h-[26px] rounded-md grid place-items-center bg-surface border border-hairline text-ink2"><FilmSlate size={14} weight="fill" /></span>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] text-ink2 font-medium leading-snug">成片</p>
        <p className="text-[10.5px] text-faint leading-snug mt-0.5 truncate">{summary}</p>
      </div>
      {items.length > 0 && (generating
        ? <span className="w-3 h-3 rounded-full border-2 border-[#dcdbd9] border-t-primary gx-spin shrink-0" />
        : <span className="w-1.5 h-1.5 rounded-full bg-pass shrink-0" />)}
    </div>
  );
}

// ── RIGHT INSPECTOR — edits whatever is selected ───────────────────────────
export function Inspector({ selection, shot, shots, bgm, voStyle, subtitle, items,
  onSetModel, onSetPrompt, onSetParam, onSetAsset,
  selectedVarId, onGenerateVariation, onSelectVariation, onPreviewVariation,
  onSetBgm, onSetVoStyle, onSetShotVoLine, onSetSubtitle, onPlayResult, onGoDeploy, onDelete, canDelete }: {
  selection: ShotSelection; shot?: Shot; shots: Shot[]; items?: GenItem[];
  bgm?: AudioGlobal; voStyle?: AudioGlobal; subtitle: SubtitleConfig;
  onSetModel: (m: string) => void; onSetPrompt: (p: string) => void; onSetParam: (key: string, value: ParamValue) => void;
  onSetAsset: (file: File) => void;
  selectedVarId?: string; onGenerateVariation: () => void; onSelectVariation: (varId: string) => void; onPreviewVariation: (v: ShotVariation) => void;
  onSetBgm: (a: AudioGlobal) => void; onSetVoStyle: (a: AudioGlobal) => void; onSetShotVoLine: (no: number, v: string) => void;
  onSetSubtitle: (s: SubtitleConfig) => void; onPlayResult: (item: GenItem) => void; onGoDeploy: () => void; onDelete: () => void; canDelete: boolean;
}) {
  if (selection.kind === "shot" && shot) {
    return <ShotInspector s={shot} canDelete={canDelete} selectedVarId={selectedVarId} onGenerateVariation={onGenerateVariation} onSelectVariation={onSelectVariation} onPreviewVariation={onPreviewVariation} onSetModel={onSetModel} onSetPrompt={onSetPrompt} onSetParam={onSetParam} onSetAsset={onSetAsset} onDelete={onDelete} />;
  }
  if (selection.kind === "track" && selection.id === "bgm") return <BgmInspector bgm={bgm} onSetBgm={onSetBgm} />;
  if (selection.kind === "track" && selection.id === "vo") return <VoInspector voStyle={voStyle} shots={shots} subtitle={subtitle} onSetVoStyle={onSetVoStyle} onSetShotVoLine={onSetShotVoLine} onSetSubtitle={onSetSubtitle} />;
  if (selection.kind === "output") {
    const videoShots = shots.filter((s) => s.type !== "vo");
    const canAssemble = videoShots.length > 0 && videoShots.every((s) => s.variations?.some((v) => v.done));
    return <ResultsInspector items={items ?? []} canAssemble={canAssemble} onPlay={onPlayResult} onGoDeploy={onGoDeploy} />;
  }
  return <div className="h-full grid place-items-center text-center p-8"><div className="text-[13px] text-faint">选择左侧的镜头、音轨或成片开始编辑</div></div>;
}

function ResultsInspector({ items, canAssemble, onPlay, onGoDeploy }: { items: GenItem[]; canAssemble: boolean; onPlay: (item: GenItem) => void; onGoDeploy: () => void }) {
  const done = items.filter((t) => t.done).length;
  const generating = items.length > 0 && done < items.length;
  if (items.length === 0) {
    return (
      <div className="h-full grid place-items-center text-center p-8">
        <div>
          <div className="w-11 h-11 rounded-full bg-tint grid place-items-center mx-auto mb-3 text-ink2"><FilmSlate size={20} weight="fill" /></div>
          <div className="text-[13px] font-semibold text-ink2">还没有成片</div>
          <div className="text-[12px] text-faint mt-1 max-w-[248px] leading-relaxed mx-auto">{canAssemble ? "镜头都生成好了。点左下角「生成成片」，把每镜选中的那条剪到一起，在这里比选。" : "先在左侧把镜头生成好、每镜选一条满意的，再点左下角「生成成片」。"}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[13px] font-bold tracking-tight">成片</span>
        <span className="text-faint text-[11px]">· {items.length} 条{generating ? " · 生成中" : ""}</span>
        {generating && <span className="ml-auto w-3.5 h-3.5 rounded-full border-2 border-[#dcdbd9] border-t-ink2 gx-spin" />}
      </div>
      <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(104px, 1fr))" }}>
        {items.map((t) => (
          <div key={t.id} onClick={() => t.done && onPlay(t)}
            className={`relative aspect-[9/16] rounded-lg overflow-hidden bg-black ${t.done ? "cursor-pointer group/r ring-1 ring-hairline hover:ring-ink2 transition-all" : ""}`}>
            {t.done ? (
              <>
                <img src={img(t.seed, 220, 391)} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/55" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/[0.18] border border-white/55 backdrop-blur-sm grid place-items-center text-white opacity-90 group-hover/r:scale-110 transition-transform"><Play size={14} weight="fill" className="ml-0.5" /></div>
                <div className="absolute left-1.5 right-1.5 bottom-1.5 text-white text-[10.5px] font-semibold [text-shadow:0_1px_2px_rgba(0,0,0,0.6)] truncate">{t.label}</div>
                <span className="absolute top-1.5 right-1.5 text-[9px] font-semibold text-white bg-black/50 px-1.5 py-0.5 rounded-full tabular-nums">{t.ratio} · {t.dur}</span>
              </>
            ) : <div className="w-full h-full gx-shimmer" />}
          </div>
        ))}
      </div>
      {done > 0 && (
        <div className="mt-4 flex items-center gap-2 border-t border-hairline pt-4">
          <span className="text-[11.5px] text-faint min-w-0">满意的成片加入素材库后去投放</span>
          <span className="flex-1" />
          <button onClick={onGoDeploy} className="shrink-0 text-[12.5px] font-semibold rounded-full px-4 py-2 bg-primary text-white hover:bg-primary2 transition-transform active:scale-[0.97] inline-flex items-center gap-1.5"><FilmSlate size={14} weight="fill" />去投放 ({done})</button>
        </div>
      )}
    </div>
  );
}

function ShotInspector({ s, canDelete, selectedVarId, onGenerateVariation, onSelectVariation, onPreviewVariation, onSetModel, onSetPrompt, onSetParam, onSetAsset, onDelete }: {
  s: Shot; canDelete: boolean; selectedVarId?: string; onGenerateVariation: () => void; onSelectVariation: (varId: string) => void; onPreviewVariation: (v: ShotVariation) => void;
  onSetModel: (m: string) => void; onSetPrompt: (p: string) => void; onSetParam: (key: string, value: ParamValue) => void; onSetAsset: (file: File) => void; onDelete: () => void;
}) {
  const elem = ELEM[s.type];
  const vars = s.variations ?? [];
  const hasVars = vars.length > 0;
  const generating = vars.some((v) => !v.done);
  const selectedVar = vars.find((v) => v.id === selectedVarId) ?? vars[0];

  return (
    <div>
      {/* Editor zone — sticky on top so 提示词 stays put no matter how many candidates grow below */}
      <div className="sticky top-0 z-10 bg-surface px-5 pt-5 pb-4 border-b border-hairline">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[13px] font-bold tracking-tight">镜头 {s.no}</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: elem.color }}>
            <span className="w-[5px] h-[5px] rounded-full" style={{ background: elem.color }} />{elem.label}
          </span>
          <span className="text-faint text-[11px]">·</span>
          <span className="text-faint text-[11px] tabular-nums">{s.t}</span>
          {canDelete && (
            <button onClick={onDelete} className="ml-auto shrink-0 inline-flex items-center gap-1 text-[11.5px] text-faint hover:text-reject rounded-md px-2 py-1 hover:bg-[#fdeee6] transition-colors">
              <Trash size={13} /> 删除镜头
            </button>
          )}
        </div>
        <ShotCard s={s} onSetModel={onSetModel} onSetPrompt={onSetPrompt} onSetParam={onSetParam} onSetAsset={onSetAsset} />
      </div>

      {/* Candidates — grow / scroll BELOW the editor, so they never push 提示词 down */}
      <div className="px-5 py-4">
        {hasVars ? (
          <>
            <div className="flex items-center gap-1.5 mb-2 text-[11px]">
              <span className="text-muted font-medium">候选 <span className="tabular-nums">{vars.length}</span> 条</span>
              <span className="text-faint">· 点一条用于成片</span>
              {generating && <span className="text-faint ml-auto inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border-2 border-[#dcdbd9] border-t-ink2 gx-spin" />生成中</span>}
            </div>
            <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(92px, 1fr))" }}>
              {vars.map((v) => (
                <CandidateTile key={v.id} v={v} selected={v.id === selectedVar?.id}
                  onSelect={() => onSelectVariation(v.id)} onPlay={() => onPreviewVariation(v)} />
              ))}
              <button onClick={onGenerateVariation}
                className="aspect-[9/16] rounded-lg border border-dashed border-hairline flex flex-col items-center justify-center gap-2 text-faint hover:border-ink2 hover:text-primary hover:bg-surface transition-colors">
                <span className="w-8 h-8 rounded-full bg-tint grid place-items-center text-ink2"><Sparkle size={15} weight="fill" /></span>
                <span className="text-[11px] font-medium leading-tight text-center">再生成<br />一条</span>
              </button>
            </div>
          </>
        ) : s.source === "ai" ? (
          <button onClick={onGenerateVariation}
            className="w-full flex items-center gap-2.5 py-3.5 px-4 rounded-xl border border-dashed border-hairline text-muted hover:border-ink2 hover:text-primary hover:bg-surface transition-colors">
            <span className="w-9 h-9 rounded-full bg-tint grid place-items-center text-ink2 shrink-0"><Sparkle size={16} weight="fill" /></span>
            <span className="text-left"><span className="block text-[13px] font-semibold">生成画面</span><span className="block text-[11px] text-faint">按提示词生成这一镜的 AI 画面</span></span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

function CandidateTile({ v, selected, onSelect, onPlay }: { v: ShotVariation; selected: boolean; onSelect: () => void; onPlay: () => void }) {
  if (!v.done) return <div className="aspect-[9/16] rounded-lg overflow-hidden bg-black"><div className="w-full h-full gx-shimmer" /></div>;
  return (
    <div onClick={onSelect}
      className={`group/tile relative aspect-[9/16] rounded-lg overflow-hidden bg-black cursor-pointer transition-all ${selected ? "ring-[2.5px] ring-primary ring-offset-1 ring-offset-surface" : "ring-1 ring-hairline hover:ring-ink2"}`}>
      <img src={img(v.seed, 200, 356)} alt="" className="w-full h-full object-cover" />
      {selected && (
        <span className="absolute top-1.5 left-1.5 w-[18px] h-[18px] rounded-full bg-primary text-white grid place-items-center ring-2 ring-white/90 shadow-[0_1px_4px_rgba(0,0,0,0.35)]"><Check size={11} weight="bold" /></span>
      )}
      <button onClick={(e) => { e.stopPropagation(); onPlay(); }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 border border-white/50 backdrop-blur-sm grid place-items-center text-white opacity-0 group-hover/tile:opacity-100 transition-opacity">
        <Play size={13} weight="fill" className="ml-0.5" />
      </button>
      {!selected && (
        <span className="absolute inset-x-0 bottom-0 pt-6 pb-1.5 text-center text-[10.5px] font-semibold text-white opacity-0 group-hover/tile:opacity-100 transition-opacity bg-gradient-to-t from-black/60 to-transparent pointer-events-none">选用这条</span>
      )}
    </div>
  );
}

// Adaptive 画面输入 —— 首帧 / 尾帧 / 参考图 / 关键帧 slots, per the selected model's real inputs (MODEL_INPUTS).
// Slots hold real local files (object URLs). ★ BACKEND: on pick, upload and keep the returned
// URL alongside the shot's params so generation can reference it (see docs/agent-contract.md).
function ImgSlot({ label, url, onPick, onClear }: { label: string; url?: string; onPick: () => void; onClear: () => void }) {
  return (
    <span className="relative inline-flex group/slot">
      <button type="button" onClick={onPick}
        className={`relative w-[40px] aspect-[9/16] rounded-md overflow-hidden grid place-items-center transition-colors ${url ? "ring-[1.5px] ring-primary" : "border border-dashed border-hairline hover:border-ink2 hover:bg-canvas bg-surface"}`}>
        {url ? (
          <>
            <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <span className="absolute inset-x-0 bottom-0 text-[7.5px] leading-[1.5] text-center text-white bg-black/55">{label}</span>
          </>
        ) : (
          <span className="flex flex-col items-center gap-0.5 text-faint">
            <Plus size={11} weight="bold" />
            <span className="text-[8px] font-medium leading-none">{label}</span>
          </span>
        )}
      </button>
      {url && (
        <button type="button" onClick={(e) => { e.stopPropagation(); onClear(); }} aria-label={`移除${label}`}
          className="absolute -top-1 -right-1 w-[14px] h-[14px] rounded-full bg-ink text-white grid place-items-center opacity-0 group-hover/slot:opacity-100 transition-opacity shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
          <X size={8} weight="bold" />
        </button>
      )}
    </span>
  );
}

function ImageInputs({ model }: { model: string }) {
  const caps = MODEL_INPUTS[model];
  // slotKey → local object URL of the picked image
  const [filled, setFilled] = useState<Record<string, string>>({});
  const fileInput = useRef<HTMLInputElement>(null);
  const activeSlot = useRef<string | null>(null);
  if (!caps) return null;
  const pick = (k: string) => { activeSlot.current = k; fileInput.current?.click(); };
  const clear = (k: string) => setFilled((f) => { const n = { ...f }; delete n[k]; return n; });
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    const k = activeSlot.current;
    if (f && k) setFilled((m) => ({ ...m, [k]: URL.createObjectURL(f) }));
  };
  const refShown = Math.min(caps.refs, 3);
  const hint = `留空 = 文生视频 · 首帧 = 图生 · 首帧+尾帧 = 两端插值${caps.note ? `。${caps.note}` : ""}`;
  return (
    <div className="mt-2.5">
      <div className="flex items-center gap-1 mb-1.5">
        <label className="text-[10.5px] text-muted font-medium">画面输入</label>
        <Tooltip label={hint}><span className="text-faint hover:text-muted transition-colors inline-flex"><Info size={12} /></span></Tooltip>
      </div>
      <div className="flex flex-wrap items-start gap-1.5">
        {caps.start && <ImgSlot label="首帧" url={filled.start} onPick={() => pick("start")} onClear={() => clear("start")} />}
        {caps.end && <ImgSlot label="尾帧" url={filled.end} onPick={() => pick("end")} onClear={() => clear("end")} />}
        {caps.keyframes > 0 && Array.from({ length: caps.keyframes }).map((_, i) => (
          <ImgSlot key={`kf${i}`} label={`帧${i + 1}`} url={filled[`kf${i}`]} onPick={() => pick(`kf${i}`)} onClear={() => clear(`kf${i}`)} />
        ))}
        {refShown > 0 && (
          <span className="flex items-center gap-1.5 pl-2 ml-0.5 border-l border-hairline">
            {Array.from({ length: refShown }).map((_, i) => (
              <ImgSlot key={`ref${i}`} label="参考" url={filled[`ref${i}`]} onPick={() => pick(`ref${i}`)} onClear={() => clear(`ref${i}`)} />
            ))}
            {caps.refs > refShown && <span className="text-[10px] text-faint font-medium tabular-nums self-center">+{caps.refs - refShown} 参考</span>}
          </span>
        )}
      </div>
      <input ref={fileInput} type="file" accept="image/*" hidden onChange={onFile} />
    </div>
  );
}

function ShotCard({ s, onSetModel, onSetPrompt, onSetParam, onSetAsset }: {
  s: Shot; onSetModel: (m: string) => void; onSetPrompt: (p: string) => void; onSetParam: (key: string, value: ParamValue) => void; onSetAsset: (file: File) => void;
}) {
  const elem = ELEM[s.type];
  const isAI = s.source === "ai";
  const assetInput = useRef<HTMLInputElement>(null);
  const onAssetFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) onSetAsset(f);
  };
  return (
    <div className="w-full self-start">
      {isAI ? (
        <div>
          <label className="block text-[10.5px] text-muted font-medium mb-1">提示词</label>
          <textarea value={s.prompt ?? ""} onChange={(e) => onSetPrompt(e.target.value)} placeholder="描述你想要生成的画面内容…"
            rows={4} className="w-full text-[12.5px] border border-hairline rounded-lg px-3 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-tint bg-surface resize-none leading-relaxed placeholder:text-faint" />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ModelSelect compact type={s.type} value={s.model ?? ""} options={MODEL_OPTIONS[s.type]} onChange={onSetModel} />
            <ParamBar specs={MODEL_PARAMS[s.model ?? ""] ?? []} values={s.params ?? defaultParams(s.model ?? "")} onChange={onSetParam} />
          </div>
          <ImageInputs key={s.id ?? s.no} model={s.model ?? ""} />
          {/* TODO: AI 评分区 — 这里放模型 AI 评分（如 Kling 光效 87/100 vs Runway 72）以及其他路由/评测信息。
              原来的 ✦ {s.reasoning} 展示已按需求移除，待用新的评分组件替换。 */}
        </div>
      ) : (
        <div>
          {s.asset ? (
            <div className="flex items-center gap-2 rounded-md border border-hairline p-1.5">
              <span className="relative w-8 h-8 rounded overflow-hidden bg-black shrink-0">
                {s.assetUrl
                  ? (s.assetKind === "video"
                    ? <video src={s.assetUrl} muted playsInline preload="metadata" className="w-full h-full object-cover opacity-90" />
                    : <img src={s.assetUrl} alt="" className="w-full h-full object-cover opacity-90" />)
                  : <img src={img(s.seed ?? s.asset, 80, 80)} alt="" className="w-full h-full object-cover opacity-90" />}
                <span className="absolute inset-0 grid place-items-center text-white"><Play size={9} weight="fill" className="ml-0.5 drop-shadow" /></span>
              </span>
              <span className="text-[11.5px] text-ink2 font-medium truncate flex-1">{s.asset}</span>
              <button onClick={() => assetInput.current?.click()} className="text-[11px] text-primary font-medium shrink-0 hover:underline">替换</button>
            </div>
          ) : (
            <button onClick={() => assetInput.current?.click()} className="w-full flex flex-col items-center justify-center gap-1 rounded-md border border-dashed border-[#e3c08a] bg-modbg py-3 text-modified hover:border-modified transition-colors">
              <UploadSimple size={15} weight="bold" />
              <span className="text-[11px] font-semibold">上传{elem.label}</span>
            </button>
          )}
          <input ref={assetInput} type="file" accept={s.type === "static" ? "image/*" : "video/*,image/*"} hidden onChange={onAssetFile} />
          {s.reasoning && <div className="mt-3 text-[11px] text-faint leading-relaxed">✦ {s.reasoning}</div>}
        </div>
      )}
    </div>
  );
}

function AudioToggle({ on, onToggle }: { on: boolean; onToggle: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onToggle(!on)}
      className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${on ? "bg-primary" : "bg-hairline"}`}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}

function BgmInspector({ bgm, onSetBgm }: { bgm?: AudioGlobal; onSetBgm: (a: AudioGlobal) => void }) {
  const model = bgm?.model || BGM_MODELS[0];
  const params = bgm?.params ?? defaultParams(model);
  return (
    <div className="p-5 max-w-[560px]">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-[26px] h-[26px] rounded-md grid place-items-center bg-surface border border-hairline" style={{ color: "var(--color-srcbgm)" }}><MusicNote size={13} weight="fill" /></span>
        <span className="text-[13px] font-bold tracking-tight">BGM</span>
        <span className="text-faint text-[11px]">· 整片一条背景音乐</span>
      </div>
      <label className="block text-[10.5px] text-muted font-medium mb-1">音乐提示词</label>
      <textarea value={bgm?.prompt ?? ""} onChange={(e) => onSetBgm({ model, prompt: e.target.value, params })} placeholder="史诗战斗，管弦 + 电子鼓点，副歌在结尾 CTA 推到最高点…"
        rows={4} className="w-full text-[12.5px] border border-hairline rounded-lg px-3 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-tint bg-surface resize-none leading-relaxed placeholder:text-faint" />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <ModelSelect compact type="vo" value={model} options={BGM_MODELS} onChange={(m) => onSetBgm({ model: m, prompt: bgm?.prompt, params: defaultParams(m) })} />
        <ParamBar specs={MODEL_PARAMS[model] ?? []} values={params} onChange={(k, v) => onSetBgm({ model, prompt: bgm?.prompt, params: { ...params, [k]: v } })} />
      </div>
    </div>
  );
}

const SUB_SIZE: Record<string, number> = { xs: 6, sm: 7.5, md: 9, lg: 11, xl: 13.5 };
// Mini 9:16 video frame previewing one subtitle template at a position — real styles, so the picker actually shows what you get.
function SubtitlePreview({ tpl, pos, w = 44 }: { tpl: SubtitleTemplate; pos?: "top" | "center" | "bottom"; w?: number }) {
  const place = pos ?? tpl.pos;
  const justify = place === "top" ? "flex-start" : place === "center" ? "center" : "flex-end";
  const fs = SUB_SIZE[tpl.size] ?? 8;
  const textStyle: React.CSSProperties = {
    color: tpl.color, fontSize: fs, fontWeight: tpl.weight, lineHeight: 1.12,
    fontStyle: tpl.italic ? "italic" : "normal",
    textShadow: tpl.stroke ? "0 0 1px #000, 0 1px 1.5px rgba(0,0,0,0.9)" : "0 1px 1.5px rgba(0,0,0,0.55)",
    WebkitTextStroke: tpl.stroke ? "0.4px rgba(0,0,0,0.85)" : undefined,
    whiteSpace: "nowrap",
  };
  const s = tpl.sample; const cut = Math.ceil(s.length / 2);
  return (
    <div className="relative rounded-md overflow-hidden flex flex-col items-center"
      style={{ width: w, aspectRatio: "9 / 16", justifyContent: justify, padding: "6px 3px", background: "linear-gradient(160deg,#3a4150,#12151b)" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 32% 34%, rgba(120,132,152,0.55), transparent 55%)" }} />
      <div className="relative text-center" style={tpl.bg ? { background: tpl.bg, borderRadius: 3, padding: "1px 4px" } : undefined}>
        {tpl.accent ? (
          <span style={textStyle}><span style={{ color: tpl.accent }}>{s.slice(0, cut)}</span>{s.slice(cut)}</span>
        ) : (
          <span style={textStyle}>{s}</span>
        )}
      </div>
    </div>
  );
}

function VoInspector({ voStyle, shots, subtitle, onSetVoStyle, onSetShotVoLine, onSetSubtitle }: {
  voStyle?: AudioGlobal; shots: Shot[]; subtitle: SubtitleConfig;
  onSetVoStyle: (a: AudioGlobal) => void; onSetShotVoLine: (no: number, v: string) => void; onSetSubtitle: (s: SubtitleConfig) => void;
}) {
  const model = voStyle?.model || VO_MODELS[0];
  const voiceOn = !!voStyle?.model;
  const lines = shots.filter((s) => s.type !== "vo");

  return (
    <div className="p-5 max-w-[600px]">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-[26px] h-[26px] rounded-md grid place-items-center bg-surface border border-hairline" style={{ color: "var(--color-srcvo)" }}><Microphone size={13} weight="fill" /></span>
        <span className="text-[13px] font-bold tracking-tight">配音 · 字幕</span>
      </div>
      <p className="text-[11.5px] text-faint mb-4 leading-relaxed">同一条台词轨：台词写一次，可出声（配音）、可出字幕，两个开关各自独立。</p>

      <div className="flex items-center justify-between border border-hairline rounded-lg px-3 py-2.5 mb-4">
        <span className="text-[12.5px] inline-flex items-center gap-1.5"><Microphone size={13} weight="fill" className="text-muted" />生成配音</span>
        <div className="flex items-center gap-2.5">
          <ModelSelect compact type="vo" value={model} options={VO_MODELS} onChange={(m) => onSetVoStyle({ model: m, prompt: voStyle?.prompt, params: defaultParams(m) })} />
          <AudioToggle on={voiceOn} onToggle={(v) => onSetVoStyle(v ? { model, params: voStyle?.params ?? defaultParams(model) } : { model: "" })} />
        </div>
      </div>

      {/* 字幕 —— 自动给每镜上字幕；选一个预制模版 + 位置 */}
      <div className="border border-hairline rounded-xl p-3.5 mb-5">
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] font-semibold inline-flex items-center gap-1.5"><TextT size={13} weight="bold" className="text-muted" />字幕</span>
          <div className="flex items-center gap-2.5"><span className="text-[11px] text-faint">自动给每镜加字幕</span><AudioToggle on={subtitle.on} onToggle={(v) => onSetSubtitle({ ...subtitle, on: v })} /></div>
        </div>
        {subtitle.on && (
          <div className="mt-3.5">
            <div className="text-[10.5px] text-muted font-medium mb-2">模版</div>
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(86px, 1fr))" }}>
              {SUBTITLE_TEMPLATES.map((t) => {
                const sel = subtitle.template === t.id;
                return (
                  <button key={t.id} type="button" onClick={() => onSetSubtitle({ ...subtitle, template: t.id, pos: t.pos })}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border p-2 transition-colors ${sel ? "border-primary bg-tint" : "border-hairline hover:border-[#cdd6e0] hover:bg-canvas"}`}>
                    <SubtitlePreview tpl={t} pos={sel ? subtitle.pos : t.pos} />
                    <span className="w-full text-center">
                      <span className={`block text-[11px] font-semibold leading-tight ${sel ? "text-primary" : "text-ink2"}`}>{t.name}</span>
                      <span className="block text-[9.5px] text-faint leading-tight mt-0.5 line-clamp-1">{t.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="text-[10.5px] text-muted font-medium mb-1.5 mt-3.5">位置</div>
            <div className="flex bg-canvas rounded-lg p-0.5 gap-0.5 max-w-[240px]">
              {([["top", "顶部"], ["center", "居中"], ["bottom", "底部"]] as const).map(([v, label]) => {
                const sel = subtitle.pos === v;
                return (
                  <button key={v} type="button" onClick={() => onSetSubtitle({ ...subtitle, pos: v })}
                    className={`flex-1 text-[12px] py-1 px-2 rounded-md transition-colors ${sel ? "bg-surface text-ink font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : "text-muted font-medium hover:text-ink2"}`}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <label className="block text-[10.5px] text-muted font-medium mb-1.5">字幕文案 <span className="text-faint font-normal">· 按镜头，AI 自动写、可改；也用作配音台词</span></label>
      <div className="space-y-1.5">
        {lines.map((s) => (
          <div key={s.id ?? s.no} className="flex items-start gap-2.5 border border-hairline rounded-lg px-2.5 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-tint transition-colors">
            <span className="text-[10.5px] text-faint tabular-nums pt-1.5 shrink-0 w-[54px]">{s.t}</span>
            <input type="text" value={s.voLine ?? ""} onChange={(e) => onSetShotVoLine(s.no, e.target.value)} placeholder="这一镜的字幕文案…"
              className="flex-1 text-[12.5px] outline-none bg-transparent placeholder:text-faint" />
          </div>
        ))}
      </div>
    </div>
  );
}

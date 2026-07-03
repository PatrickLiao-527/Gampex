"use client";

import { useRef } from "react";
import { Check } from "@phosphor-icons/react/dist/csr/Check";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { Play } from "@phosphor-icons/react/dist/csr/Play";
import { ShieldCheck } from "@phosphor-icons/react/dist/csr/ShieldCheck";
import { motion, AnimatePresence } from "motion/react";
import { Tooltip } from "./ui";
import { img, type Video } from "@/lib/data";

export function VideoTile({ v, onClick, selectable, selected, member, onToggleMember, onToggleSel, compact }: { v: Video; onClick: (v: Video) => void; selectable?: boolean; selected?: boolean; member?: boolean; onToggleMember?: () => void; onToggleSel?: () => void; compact?: boolean }) {
  const out = onToggleMember !== undefined && member === false;
  return (
    <div onClick={() => onClick(v)} className={`group relative rounded-xl overflow-hidden border bg-black aspect-[9/16] cursor-pointer transition-all active:scale-[0.98] ${selected ? "border-primary outline outline-[2.5px] -outline-offset-[2.5px] outline-primary" : "border-hairline"} ${out ? "opacity-55" : ""}`}>
      <img src={img(v.seed, 200, 356)} alt="" className="w-full h-full object-cover opacity-90" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[42px] h-[42px] rounded-full bg-white/[0.18] border border-white/45 backdrop-blur-sm grid place-items-center text-white opacity-90 group-hover:scale-110 transition-transform"><Play size={15} weight="fill" className="ml-0.5" /></div>
      {!compact && <span className="absolute top-2 right-2 text-[10px] font-semibold text-white bg-black/55 px-1.5 py-0.5 rounded-full tabular-nums">{v.ratio} · {v.dur}</span>}
      {!compact && v.qc && (
        <span className={`absolute top-8 right-2 inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums ${v.qc.total >= 85 ? "bg-pass text-white" : v.qc.total >= 70 ? "bg-black/55 text-white" : "bg-modbg text-[#92610a]"}`}>
          <ShieldCheck size={10} weight="fill" /> {v.qc.total}
        </span>
      )}
      {onToggleMember && (
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

/* 数据密度视图 —— 上百条素材时按行扫，列对齐可比较。 */
export function VideoListRow({ v, selected, onToggleSel, onClick }: { v: Video; selected: boolean; onToggleSel: () => void; onClick: (v: Video) => void }) {
  return (
    <div onClick={() => onClick(v)} className={`group flex items-center gap-3 px-2.5 py-[7px] rounded-lg cursor-pointer border transition-colors ${selected ? "border-tintborder bg-tint" : "border-transparent hover:bg-canvassoft hover:border-hairline"}`}>
      <button onClick={(e) => { e.stopPropagation(); onToggleSel(); }} aria-label="选择素材"
        className={`w-[18px] h-[18px] rounded-full grid place-items-center shrink-0 transition-transform active:scale-90 border-[1.5px] ${selected ? "bg-primary border-primary text-white" : "border-hairline bg-surface text-transparent group-hover:border-faint"}`}>
        <Check size={11} weight="bold" />
      </button>
      <span className="w-7 h-12 rounded-md overflow-hidden bg-black shrink-0"><img src={img(v.seed, 56, 96)} alt="" className="w-full h-full object-cover" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] font-medium text-ink truncate">{v.label}</span>
        <span className="block text-[11px] text-faint truncate">{v.created ?? "—"}</span>
      </span>
      <span className="w-16 text-[12px] text-ink2 shrink-0">{v.channel}</span>
      <span className="w-[76px] text-[11.5px] text-muted tabular-nums shrink-0">{v.ratio} · {v.dur}</span>
      <span className="w-[92px] shrink-0 flex items-center gap-1.5">
        <span className="flex-1 h-1 rounded-full bg-hair2 overflow-hidden"><span className={`block h-full rounded-full ${(v.qc?.total ?? 0) >= 85 ? "bg-pass" : "bg-ink2"}`} style={{ width: `${v.qc?.total ?? 0}%` }} /></span>
        <span className="text-[11.5px] font-semibold text-ink2 tabular-nums w-6 text-right">{v.qc?.total ?? "—"}</span>
      </span>
      <span className="w-[52px] text-[11.5px] text-ink2 tabular-nums text-right shrink-0">{v.perf ? `${v.perf.ctr}%` : "—"}</span>
      <span className="w-[64px] text-[11.5px] text-ink2 tabular-nums text-right shrink-0">{v.perf ? `$${(v.perf.spend / 1000).toFixed(1)}k` : "—"}</span>
      <span className="w-[58px] shrink-0 flex justify-end"><LifecycleBadge lc={v.lifecycle} /></span>
    </div>
  );
}

export function LifecycleBadge({ lc }: { lc?: Video["lifecycle"] }) {
  if (!lc) return null;
  const cls = lc === "投放中" ? "bg-tint text-primary border-tintborder" : lc === "衰退" ? "bg-modbg text-[#92610a] border-[#f5e3bf]" : "bg-canvas text-muted border-hairline";
  return <span className={`text-[10.5px] font-semibold rounded-full px-2 py-0.5 border whitespace-nowrap ${cls}`}>{lc}</span>;
}

export function PreviewModal({ video, onClose, onReplaceRef }: { video: Video | null; onClose: () => void; onReplaceRef?: (video: Video, file: File) => void }) {
  const replaceInput = useRef<HTMLInputElement>(null);
  return (
    <AnimatePresence>
      {video && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-[rgba(20,20,20,0.45)]" onClick={onClose} />
          {video.isRef ? (
            // Style reference — explain what this reference is (a different click from watching a cut).
            <motion.div initial={{ scale: 0.92, y: 8, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="relative bg-surface rounded-2xl border border-hairline shadow-[0_24px_70px_rgba(0,0,0,0.25)] flex overflow-hidden w-[600px] max-w-[92vw] max-h-[86vh]">
              <div className="w-[268px] shrink-0 bg-black relative">
                {video.url
                  ? (video.kind === "video"
                    ? <video src={video.url} muted playsInline autoPlay loop className="w-full h-full object-cover" />
                    : <img src={video.url} alt="" className="w-full h-full object-cover" />)
                  : <img src={img(video.seed, 360, 640)} alt="" className="w-full h-full object-cover" />}
                {video.kind !== "video" && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[54px] h-[54px] rounded-full bg-white/[0.18] border border-white/45 backdrop-blur grid place-items-center text-white"><Play size={19} weight="fill" className="ml-0.5" /></div>}
              </div>
              <div className="flex-1 min-w-0 flex flex-col">
                <header className="px-4 py-3 border-b border-hairline flex items-center gap-2">
                  <div><div className="text-[14px] font-bold tracking-tight">{video.label}</div><div className="text-[12px] text-faint tabular-nums">{video.ratio} · {video.dur}</div></div>
                  <button onClick={onClose} className="ml-auto text-faint hover:bg-hair2 p-1 rounded"><X size={16} /></button>
                </header>
                <div className="flex-1 overflow-y-auto px-4 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-faint font-semibold mb-2">风格参考</div>
                  <div className="text-[13px] text-ink2 leading-relaxed">这是该方案对标的成片感觉 —— Agent 据此设计了分镜与模型选择。最终成片不会照搬，而是按你的素材和品牌重新生成。</div>
                  {video.refSource && (
                    <div className="mt-3 flex items-center gap-2 text-[12px]"><span className="text-faint">来源</span><span className="font-medium text-ink2 bg-hair2 px-2 py-0.5 rounded-full">{video.refSource}</span></div>
                  )}
                </div>
                <div className="px-4 py-3 border-t border-hairline flex gap-2">
                  {video.refMeta && onReplaceRef && (
                    <>
                      <button onClick={() => replaceInput.current?.click()} className="flex-1 text-[13px] font-semibold rounded-full py-2.5 border bg-surface text-ink border-hairline hover:bg-canvas">替换参考</button>
                      <input ref={replaceInput} type="file" accept="video/*,image/*" hidden
                        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onReplaceRef(video, f); }} />
                    </>
                  )}
                  <button onClick={onClose} className="flex-1 text-[13px] font-semibold rounded-full py-2.5 border bg-primary text-white border-primary hover:bg-primary2">知道了</button>
                </div>
              </div>
            </motion.div>
          ) : video.qc ? (
            // 留存素材 — 成片 + 生成链路元数据（对齐 SME 控制台第六步：留存视频绑定完整数据）。
            <motion.div initial={{ scale: 0.92, y: 8, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="relative bg-surface rounded-2xl border border-hairline shadow-[0_24px_70px_rgba(0,0,0,0.25)] flex overflow-hidden w-[640px] max-w-[92vw] max-h-[86vh]">
              <div className="w-[268px] shrink-0 bg-black relative">
                <img src={img(video.seed, 360, 640)} alt="" className="w-full h-full object-cover" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[54px] h-[54px] rounded-full bg-white/[0.18] border border-white/45 backdrop-blur grid place-items-center text-white"><Play size={19} weight="fill" className="ml-0.5" /></div>
                <div className="absolute left-3 right-3 bottom-3 text-white text-[12px] font-semibold [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]">{video.label}<div className="text-[10.5px] text-white/75 font-medium tabular-nums">{video.ratio} · {video.dur}{video.channel ? ` · ${video.channel}` : ""}</div></div>
              </div>
              <div className="flex-1 min-w-0 flex flex-col">
                <header className="px-4 py-3 border-b border-hairline flex items-center gap-2">
                  <div className="min-w-0">
                    <div className="text-[14px] font-bold tracking-tight truncate">{video.label}</div>
                    {video.brief && <div className="text-[11.5px] text-faint truncate">原始需求 · {video.brief}</div>}
                  </div>
                  <button onClick={onClose} className="ml-auto text-faint hover:bg-hair2 p-1 rounded shrink-0"><X size={16} /></button>
                </header>
                <div className="flex-1 overflow-y-auto px-4 py-3">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="text-[11px] uppercase tracking-wide text-faint font-semibold">AI 质检报告</div>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums ${video.qc.total >= 85 ? "bg-pass text-white" : "bg-modbg text-[#92610a]"}`}><ShieldCheck size={11} weight="fill" /> {video.qc.total} 分</span>
                  </div>
                  <div className="flex flex-col gap-1.5 mb-4">
                    {video.qc.dims.map((d) => (
                      <div key={d.label} className="flex items-center gap-2">
                        <span className="text-[12px] text-ink2 w-[88px] shrink-0">{d.label}</span>
                        <span className="text-[10.5px] text-faint w-8 shrink-0 tabular-nums">{d.weight}%</span>
                        <div className="flex-1 h-1.5 rounded-full bg-hair2 overflow-hidden"><span className={`block h-full rounded-full ${d.score >= 85 ? "bg-pass" : d.score >= 70 ? "bg-ink2" : "bg-[#d9a53f]"}`} style={{ width: `${d.score}%` }} /></div>
                        <span className="text-[11.5px] font-semibold text-ink2 w-7 text-right tabular-nums">{d.score}</span>
                      </div>
                    ))}
                  </div>
                  {video.tags && video.tags.length > 0 && (
                    <>
                      <div className="text-[11px] uppercase tracking-wide text-faint font-semibold mb-2">预期标签 · 质检基准</div>
                      <div className="flex flex-wrap gap-1.5 mb-1">
                        {video.tags.map((t) => <span key={t} className="text-[11.5px] text-ink2 bg-canvas border border-hairline rounded-full px-2.5 py-1">{t}</span>)}
                      </div>
                    </>
                  )}
                </div>
                <div className="px-4 py-3 border-t border-hairline text-[11.5px] text-faint">
                  留存素材已绑定完整生成链路：需求文本 · 正/负 Prompt · 预期标签 · 参考素材
                </div>
              </div>
            </motion.div>
          ) : (
            // Watch a cut / take — clean video lightbox, nothing else.
            <motion.div initial={{ scale: 0.92, y: 8, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="relative bg-black rounded-2xl border border-hairline shadow-[0_24px_70px_rgba(0,0,0,0.35)] overflow-hidden w-[356px] max-w-[92vw]">
              <div className="relative aspect-[9/16] max-h-[78vh]">
                <img src={img(video.seed, 400, 711)} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/70" />
                <button onClick={onClose} className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-sm grid place-items-center text-white transition-colors"><X size={16} /></button>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[54px] h-[54px] rounded-full bg-white/[0.18] border border-white/50 backdrop-blur grid place-items-center text-white"><Play size={20} weight="fill" className="ml-0.5" /></div>
                <div className="absolute left-3 right-3 bottom-3">
                  <div className="h-1 rounded-full bg-white/30 mb-2.5"><span className="block w-[38%] h-full bg-white rounded-full" /></div>
                  <div className="text-white text-[13px] font-semibold [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]">{video.label}</div>
                  <div className="text-white/75 text-[11px] font-medium tabular-nums">{video.ratio} · {video.dur}{video.channel ? ` · ${video.channel}` : ""}</div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

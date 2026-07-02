"use client";

import { useRef } from "react";
import { Check } from "@phosphor-icons/react/dist/csr/Check";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { Play } from "@phosphor-icons/react/dist/csr/Play";
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

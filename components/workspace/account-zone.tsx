"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Star } from "@phosphor-icons/react/dist/csr/Star";
import { ChatCircle } from "@phosphor-icons/react/dist/csr/ChatCircle";
import { Question } from "@phosphor-icons/react/dist/csr/Question";
import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import { Lightning } from "@phosphor-icons/react/dist/csr/Lightning";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { Image as ImageIcon } from "@phosphor-icons/react/dist/csr/Image";
import { Check } from "@phosphor-icons/react/dist/csr/Check";
import { motion, AnimatePresence } from "motion/react";
import { Tooltip } from "./ui";
import { accountUsage, team, FEEDBACK_KINDS, type FeedbackKind } from "@/lib/data";

// 1_240_000 → "1.24M", 760_000 → "760K"
function fmtCredits(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2).replace(/\.?0+$/, "") + "M";
  if (n >= 1_000) return Math.round(n / 1_000) + "K";
  return String(n);
}
function usageColor(pct: number): string {
  if (pct >= 95) return "var(--color-reject)";
  if (pct >= 80) return "var(--color-modified)";
  return "var(--color-primary)";
}

export function AccountZone({ collapsed, onToast }: { collapsed: boolean; onToast: (msg: string) => void }) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [usageAnchor, setUsageAnchor] = useState<DOMRect | null>(null);

  const u = accountUsage;
  const pct = Math.min(100, Math.round((u.used / u.total) * 100));
  const remaining = Math.max(0, u.total - u.used);
  const color = usageColor(pct);

  const openUsage = (e: React.MouseEvent) => setUsageAnchor(e.currentTarget.getBoundingClientRect());

  return (
    <>
      {collapsed ? (
        <div className="mt-auto flex flex-col items-center gap-1 py-2 border-t border-hairline">
          <Tooltip label={`额度 ${pct}% · 剩余 ${fmtCredits(remaining)}`} side="right">
            <button onClick={openUsage} className="w-9 h-9 grid place-items-center rounded-lg hover:bg-hair2 transition-colors">
              <UsageRing pct={pct} color={color} />
            </button>
          </Tooltip>
          <Tooltip label="发送反馈" side="right">
            <button onClick={() => setFeedbackOpen(true)} className="w-9 h-9 grid place-items-center rounded-lg text-muted hover:text-ink2 hover:bg-hair2 transition-colors"><ChatCircle size={17} /></button>
          </Tooltip>
          <Tooltip label={`${team.name} · ${team.desc}`} side="right">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4a4842] to-primary grid place-items-center text-white"><Star size={15} weight="fill" /></span>
          </Tooltip>
        </div>
      ) : (
        <div className="mt-auto">
          {/* Credit meter — compact row: label · plan, used/total, caret, thin bar */}
          <button onClick={openUsage}
            className="w-full text-left px-3 py-2.5 border-t border-hairline hover:bg-canvas transition-colors">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-ink2">额度</span>
              <span className="text-[9.5px] text-faint border border-hairline rounded px-1 leading-[15px]">{u.plan}</span>
              <span className="flex-1" />
              <span className="text-[10.5px] text-muted tabular-nums">{fmtCredits(u.used)} / {fmtCredits(u.total)}</span>
              <CaretRight size={11} className="text-faint" />
            </div>
            <div className="mt-1.5 h-1 rounded-full bg-hair2 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
            </div>
          </button>

          {/* Feedback + help */}
          <div className="flex items-center gap-1 px-2 py-1.5 border-t border-hairline">
            <button onClick={() => setFeedbackOpen(true)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-[12px] font-medium text-muted hover:text-ink2 hover:bg-hair2 rounded-lg py-1.5 transition-colors"><ChatCircle size={14} weight="fill" /> 反馈</button>
            <Tooltip label="帮助文档" side="top">
              <button onClick={() => onToast("帮助文档即将上线")}
                className="w-8 h-8 grid place-items-center text-muted hover:text-ink2 hover:bg-hair2 rounded-lg transition-colors"><Question size={15} /></button>
            </Tooltip>
          </div>

          {/* Team identity */}
          <div className="px-3 py-2.5 border-t border-hairline flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#4a4842] to-primary grid place-items-center text-white shrink-0"><Star size={15} weight="fill" /></span>
            <span className="min-w-0 flex-1"><span className="block text-[12.5px] font-medium truncate">{team.name}</span><span className="block text-[11px] text-faint">{team.desc}</span></span>
          </div>
        </div>
      )}

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} onSent={() => { setFeedbackOpen(false); onToast("反馈已发送，谢谢！"); }} />
      <UsagePopover anchor={usageAnchor} onClose={() => setUsageAnchor(null)} onUpgrade={() => { setUsageAnchor(null); onToast("升级通道即将开放"); }} />
    </>
  );
}

function UsageRing({ pct, color }: { pct: number; color: string }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" className="-rotate-90">
      <circle cx="12" cy="12" r={r} fill="none" stroke="var(--color-hair2)" strokeWidth="2.5" />
      <circle cx="12" cy="12" r={r} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
    </svg>
  );
}

// Anchored popover above the trigger (Claude/Higgsfield style), rendered via portal
// so the sidebar's overflow-hidden doesn't clip it.
function UsagePopover({ anchor, onClose, onUpgrade }: { anchor: DOMRect | null; onClose: () => void; onUpgrade: () => void }) {
  const u = accountUsage;
  const pct = Math.min(100, Math.round((u.used / u.total) * 100));
  const remaining = Math.max(0, u.total - u.used);
  const W = 300;
  const left = anchor ? Math.min(Math.max(anchor.left, 8), (typeof window !== "undefined" ? window.innerWidth : 1440) - W - 8) : 0;
  const bottom = anchor ? (typeof window !== "undefined" ? window.innerHeight : 900) - anchor.top + 8 : 0;
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {anchor && <motion.div key="usage-bd" className="fixed inset-0 z-[70]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />}
      {anchor && (
        <motion.div key="usage-pop" initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.98 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}
          style={{ left, bottom, width: W }}
          className="fixed z-[80] bg-surface rounded-xl border border-hairline shadow-[0_16px_50px_rgba(0,0,0,0.18)] p-4">
            {/* headline: remaining prominent */}
            <div className="flex items-baseline gap-1.5">
              <span className="text-[22px] font-bold tracking-tight tabular-nums leading-none">{fmtCredits(remaining)}</span>
              <span className="text-[12px] text-faint">credits 剩余</span>
              <span className="flex-1" />
              <span className="text-[11px] text-muted tabular-nums">已用 {pct}%</span>
            </div>
            <div className="text-[11px] text-faint mt-1">共 {fmtCredits(u.total)} · {u.resetLabel}重置</div>

            {/* per-category thin bars */}
            <div className="mt-3.5 flex flex-col gap-2.5">
              {u.slices.map((s) => {
                const p = Math.round((s.used / u.total) * 100);
                return (
                  <div key={s.label}>
                    <div className="flex items-center gap-1.5 text-[11.5px]">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.color }} />
                      <span className="text-ink2 flex-1">{s.label}</span>
                      <span className="text-muted tabular-nums">{fmtCredits(s.used)}</span>
                      <span className="text-faint tabular-nums w-8 text-right">{p}%</span>
                    </div>
                    <div className="mt-1 h-1 rounded-full bg-hair2 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${p}%`, background: s.color }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* grouped upgrade card */}
            <div className="mt-3.5 flex items-center gap-2.5 rounded-lg border border-hairline bg-canvas p-2.5">
              <span className="w-7 h-7 rounded-lg bg-primary text-white grid place-items-center shrink-0"><Lightning size={15} weight="fill" /></span>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-semibold text-ink2">升级套餐</div>
                <div className="text-[10.5px] text-faint">更多额度 · 更高并发</div>
              </div>
              <button onClick={onUpgrade} className="text-[12px] font-semibold rounded-full px-3.5 py-1.5 bg-primary text-white hover:bg-primary2 transition-transform active:scale-95">升级</button>
            </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function FeedbackModal({ open, onClose, onSent }: { open: boolean; onClose: () => void; onSent: () => void }) {
  const [kind, setKind] = useState<FeedbackKind>("问题");
  const [text, setText] = useState("");
  const [withShot, setWithShot] = useState(true);
  const reset = () => { setKind("问题"); setText(""); setWithShot(true); };
  const send = () => { if (!text.trim()) return; reset(); onSent(); };
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence onExitComplete={reset}>
      {open && (
        <motion.div key="fb" className="fixed inset-0 z-[80] grid place-items-center p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-[rgba(20,20,20,0.45)]" onClick={onClose} />
          <motion.div initial={{ scale: 0.94, y: 10, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative bg-surface rounded-2xl border border-hairline shadow-[0_24px_70px_rgba(0,0,0,0.25)] w-[440px] max-w-[92vw] p-6">
            <div className="flex items-center mb-4">
              <h2 className="text-[16px] font-bold tracking-tight">发送反馈</h2>
              <button onClick={onClose} className="ml-auto w-7 h-7 rounded-full border border-hairline grid place-items-center text-muted hover:bg-canvas transition-colors"><X size={15} /></button>
            </div>

            <div className="flex gap-1.5 mb-3">
              {FEEDBACK_KINDS.map((k) => (
                <button key={k.id} onClick={() => setKind(k.id)}
                  className={`text-[12.5px] font-medium px-3 py-1.5 rounded-full border transition-colors ${kind === k.id ? "bg-tint text-primary border-tintborder" : "bg-surface text-ink2 border-hairline hover:bg-canvas"}`}>{k.label}</button>
              ))}
            </div>

            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} autoFocus
              placeholder="描述你遇到的问题或想法，越具体越好…"
              className="w-full text-[13.5px] border border-hairline rounded-lg px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-tint resize-none leading-relaxed placeholder:text-faint" />

            <button onClick={() => setWithShot((v) => !v)}
              className="mt-2.5 w-full flex items-center gap-2.5 rounded-lg border border-hairline px-3 py-2 hover:bg-canvas transition-colors text-left">
              <span className={`w-4 h-4 rounded border grid place-items-center shrink-0 transition-colors ${withShot ? "bg-primary border-primary text-white" : "border-hairline"}`}>{withShot && <Check size={11} weight="bold" />}</span>
              <span className="w-8 h-8 rounded bg-canvas border border-hairline grid place-items-center text-faint shrink-0"><ImageIcon size={15} /></span>
              <span className="min-w-0 flex-1"><span className="block text-[12.5px] font-medium text-ink2">附带当前截图</span><span className="block text-[11px] text-faint">帮助我们更快定位问题</span></span>
            </button>

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={onClose} className="text-[13px] font-medium rounded-full px-4 py-2 border border-hairline hover:bg-canvas transition-colors">取消</button>
              <button onClick={send} disabled={!text.trim()}
                className="text-[13px] font-semibold rounded-full px-5 py-2 bg-primary text-white hover:bg-primary2 transition-transform active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100">发送反馈</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

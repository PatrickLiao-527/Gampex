"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Warning } from "@phosphor-icons/react/dist/csr/Warning";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { Minus } from "@phosphor-icons/react/dist/csr/Minus";
import { ChatCircle } from "@phosphor-icons/react/dist/csr/ChatCircle";
import { motion, AnimatePresence } from "motion/react";

type TipSide = "top" | "bottom" | "right" | "left";
const TIP_PLACE: Record<TipSide, string> = {
  top: "-translate-x-1/2 -translate-y-full -mt-1.5",
  bottom: "-translate-x-1/2 mt-1.5",
  right: "-translate-y-1/2 ml-1.5",
  left: "-translate-x-full -translate-y-1/2 -ml-1.5",
};
export function Tooltip({ label, side = "top", className, children }: { label: string; side?: TipSide; className?: string; children: React.ReactNode }) {
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
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.12 }}
          style={{ left: pos.x, top: pos.y }}
          className={`fixed z-[90] ${TIP_PLACE[side]} pointer-events-none whitespace-nowrap rounded-md bg-ink text-white text-[11px] font-medium px-2 py-1 shadow-[0_4px_14px_rgba(0,0,0,0.22)]`}>
          {label}
        </motion.span>, document.body)}
    </span>
  );
}

export function ConfirmModal({ open, title, body, confirmLabel, onConfirm, onCancel }: {
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

export function NewProjectModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (name: string, desc: string) => void }) {
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

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] uppercase tracking-[0.06em] text-faint font-semibold mb-3">{children}</div>;
}

export function ReopenPill({ show, onClick }: { show: boolean; onClick: () => void }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.button initial={{ opacity: 0, scale: 0.85, width: 0, marginLeft: 0 }} animate={{ opacity: 1, scale: 1, width: "auto", marginLeft: 4 }} exit={{ opacity: 0, scale: 0.85, width: 0, marginLeft: 0 }} transition={{ type: "spring", stiffness: 420, damping: 30 }} onClick={onClick}
          className="flex items-center gap-1.5 px-3.5 py-[7px] rounded-full bg-ink text-white text-[12.5px] font-medium hover:bg-[#383838] active:scale-95 transition-colors whitespace-nowrap overflow-hidden shrink-0"><ChatCircle size={15} weight="fill" /> 展开对话</motion.button>
      )}
    </AnimatePresence>
  );
}

export function PillBtn({ children, primary, onClick, disabled }: { children: React.ReactNode; primary?: boolean; onClick?: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`text-[13px] font-medium rounded-full px-4 py-2 border transition-transform active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 ${primary ? "bg-primary text-white border-primary hover:bg-primary2" : "bg-surface text-ink border-hairline hover:bg-canvas"}`}>{children}</button>
  );
}

export function CountStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const opts = [1, 2, 3, 4];
  const i = opts.indexOf(value);
  const prev = () => { if (i > 0) onChange(opts[i - 1]); };
  const next = () => { if (i < opts.length - 1) onChange(opts[i + 1]); };
  return (
    <Tooltip label={`每个方案生成 ${value} 条成片`}>
      <span className="inline-flex items-center rounded-full border border-hairline bg-surface h-[34px]">
        <button onClick={prev} disabled={i <= 0}
          className="w-[30px] h-full grid place-items-center rounded-l-full text-muted hover:text-ink hover:bg-hair2 disabled:text-faint/40 disabled:hover:bg-transparent transition-colors">
          <Minus size={12} weight="bold" />
        </button>
        <span className="text-[13px] tabular-nums font-semibold text-ink px-0.5 min-w-[24px] text-center">{value}</span>
        <button onClick={next} disabled={i >= opts.length - 1}
          className="w-[30px] h-full grid place-items-center rounded-r-full text-muted hover:text-ink hover:bg-hair2 disabled:text-faint/40 disabled:hover:bg-transparent transition-colors">
          <Plus size={12} weight="bold" />
        </button>
      </span>
    </Tooltip>
  );
}

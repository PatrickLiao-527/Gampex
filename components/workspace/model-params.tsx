"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "@phosphor-icons/react/dist/csr/Check";
import { CaretDown } from "@phosphor-icons/react/dist/csr/CaretDown";
import { Info } from "@phosphor-icons/react/dist/csr/Info";
import { SlidersHorizontal } from "@phosphor-icons/react/dist/csr/SlidersHorizontal";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { VideoCamera } from "@phosphor-icons/react/dist/csr/VideoCamera";
import { ImageSquare } from "@phosphor-icons/react/dist/csr/ImageSquare";
import { Waveform } from "@phosphor-icons/react/dist/csr/Waveform";
import { motion } from "motion/react";
import { Tooltip } from "./ui";
import { MODEL_META, type ElementType, type ParamSpec, type ParamValue } from "@/lib/data";

const MODEL_ICON: Record<ElementType, React.ComponentType<{ size?: number; weight?: "regular" | "bold" | "fill" | "duotone"; className?: string }>> = {
  "ai-video": VideoCamera,
  "static": ImageSquare,
  "vo": Waveform,
};

const MODEL_PANEL_W = 340;

export function ModelSelect({ value, options, onChange, compact, type = "ai-video" }: { value: string; options: string[]; onChange: (v: string) => void; compact?: boolean; type?: ElementType }) {
  const Icon = MODEL_ICON[type];
  const btnRef = useRef<HTMLButtonElement>(null);
  const [box, setBox] = useState<{ left: number; top?: number; bottom?: number; maxH: number; width: number } | null>(null);
  const open = box !== null;
  const place = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const gap = 6, margin = 12;
    const width = Math.max(r.width, MODEL_PANEL_W);
    const below = window.innerHeight - r.bottom - margin;
    const above = r.top - margin;
    const flip = below < 280 && above > below;
    setBox({
      left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)),
      width,
      maxH: Math.min(360, Math.max(180, flip ? above : below)),
      ...(flip ? { bottom: window.innerHeight - r.top + gap } : { top: r.bottom + gap }),
    });
  };
  // A fixed-position panel detaches from its anchor when the page scrolls, so
  // close on page scroll / resize. Scroll events don't bubble, so scrolling
  // *inside* the panel (an inner div) won't trigger this — only page scroll does.
  useEffect(() => {
    if (!open) return;
    const close = () => setBox(null);
    window.addEventListener("scroll", close);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close);
      window.removeEventListener("resize", close);
    };
  }, [open]);
  return (
    <div className={compact ? "relative shrink-0" : "relative"}>
      <button ref={btnRef} type="button" onClick={() => (open ? setBox(null) : place())}
        className={compact
          ? `inline-flex items-center gap-1.5 text-[12px] font-medium rounded-lg border px-2.5 py-1.5 bg-surface transition-colors ${open ? "border-primary ring-2 ring-tint" : "border-hairline hover:border-[#cdd6e0] hover:bg-canvas"}`
          : `w-full flex items-center justify-between text-[13px] rounded-lg px-3 py-2 bg-surface border transition-colors ${open ? "border-primary ring-2 ring-tint" : "border-hairline hover:border-[#cdd6e0]"}`}>
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <Icon size={compact ? 14 : 15} weight="regular" className="text-muted shrink-0" />
          <span className="font-medium text-ink truncate">{value}</span>
        </span>
        <CaretDown size={compact ? 12 : 13} weight="bold" className={`text-faint transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>
      {box && typeof document !== "undefined" && createPortal(
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setBox(null)} />
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.12 }}
            style={{ left: box.left, top: box.top, bottom: box.bottom, width: box.width, maxHeight: box.maxH }}
            className="fixed z-[70] overflow-y-auto overscroll-contain bg-surface border border-hairline rounded-xl shadow-[0_12px_36px_rgba(0,0,0,0.16)] p-1.5">
            {options.map((m) => {
              const sel = m === value;
              const meta = MODEL_META[m];
              return (
                <button key={m} type="button" onClick={() => { onChange(m); setBox(null); }}
                  className={`w-full flex items-center gap-2.5 text-left rounded-lg px-2 py-2 transition-colors ${sel ? "bg-tint" : "hover:bg-hair2"}`}>
                  <span className={`w-9 h-9 shrink-0 grid place-items-center rounded-lg border ${sel ? "border-primary text-primary bg-surface" : "border-hairline text-muted bg-canvas"}`}>
                    <Icon size={18} weight="regular" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className={`text-[13px] font-medium truncate ${sel ? "text-primary" : "text-ink"}`}>{m}</span>
                      {meta?.tag && (
                        <span className="shrink-0 text-[10px] font-semibold leading-none px-1.5 py-0.5 rounded-full bg-primary text-white">{meta.tag}</span>
                      )}
                      {sel && <Check size={13} weight="bold" className="text-primary shrink-0 ml-auto" />}
                    </span>
                    {meta?.desc && <span className="block text-[11.5px] text-muted truncate mt-0.5">{meta.desc}</span>}
                  </span>
                  {meta?.eta && (
                    <span className="shrink-0 self-start text-[11px] font-medium text-faint tabular-nums bg-hair2 rounded-full px-2 py-0.5">{meta.eta}</span>
                  )}
                </button>
              );
            })}
          </motion.div>
        </>, document.body)}
    </div>
  );
}

const FORMAT_KEYS = ["aspect", "resolution", "duration", "audio", "fps"];
const SLOT_W: Record<string, number> = { aspect: 32, resolution: 40, duration: 26, fps: 40 };

export function ParamBar({ specs, values, onChange }: { specs: ParamSpec[]; values: Record<string, ParamValue>; onChange: (key: string, value: ParamValue) => void }) {
  const format = specs.filter((s) => FORMAT_KEYS.includes(s.key));
  // 运镜 (camera) — 本期先不做，commented out. 恢复时取消下方注释 + 运镜 chip 区块。
  // const camera = specs.find((s) => s.key === "camera");
  const rest = specs.filter((s) => !FORMAT_KEYS.includes(s.key) && s.key !== "camera");
  const get = (k: string, d: ParamValue) => values[k] ?? d;
  const aspectSpec = format.find((p) => p.key === "aspect");
  const aspectVal = aspectSpec ? String(get("aspect", aspectSpec.default)) : "";
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
      {/* 运镜 (camera) — 本期先不做，commented out. 恢复时取消注释此块 + 上方 const camera。
      {camera && (
        <ParamChip summary={`运镜 · ${get(camera.key, camera.default)}`}>
          <ToggleList spec={camera} value={String(get(camera.key, camera.default))} onChange={(v) => onChange(camera.key, v)} />
        </ParamChip>
      )}
      */}
      {rest.length > 0 && (
        <ParamChip summary={<span className="inline-flex items-center gap-1"><SlidersHorizontal size={13} /> 更多</span>} align="right">
          <FieldStack specs={rest} values={values} onChange={onChange} />
        </ParamChip>
      )}
    </>
  );
}

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
    const flip = below < 280 && above > below;
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

function ratioBox(v: string): { w: number; h: number } {
  const max = 18;
  if (v === "Auto") return { w: 16, h: 12 };
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

function OnOffButtons({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[{ on: true, label: "开启" }, { on: false, label: "关闭" }].map(({ on, label }) => {
        const sel = value === on;
        return (
          <button key={label} type="button" onClick={() => onChange(on)}
            className={`text-[12.5px] font-medium py-2 rounded-lg border transition-colors ${sel ? "border-primary bg-tint text-primary" : "border-hairline text-muted hover:border-[#cdd6e0]"}`}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

function ParamControlEl({ spec, value, onChange }: { spec: ParamSpec; value: ParamValue; onChange: (v: ParamValue) => void }) {
  if (spec.key === "aspect" && spec.options) return <AspectTiles options={spec.options} value={String(value)} onChange={onChange} />;
  if (spec.key === "audio" && spec.control === "toggle") return <OnOffButtons value={Boolean(value)} onChange={onChange} />;
  switch (spec.control) {
    case "segmented":
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

function OptSelect({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [box, setBox] = useState<{ left: number; top?: number; bottom?: number; maxH: number; width: number } | null>(null);
  const open = box !== null;
  const cur = options.find((o) => o.value === value);
  const place = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const gap = 6, margin = 12;
    const below = window.innerHeight - r.bottom - margin;
    const above = r.top - margin;
    const flip = below < 200 && above > below;
    setBox({
      left: r.left,
      width: r.width,
      maxH: Math.min(240, Math.max(140, flip ? above : below)),
      ...(flip ? { bottom: window.innerHeight - r.top + gap } : { top: r.bottom + gap }),
    });
  };
  // The panel is a fixed portal, so it detaches from the anchor on scroll.
  // Capture-phase listener (third arg true) so scrolling the *parent* popover
  // — whose scroll doesn't bubble to window — also closes it. Without this the
  // option list stays pinned while the panel behind it scrolls away.
  useEffect(() => {
    if (!open) return;
    const close = () => setBox(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);
  return (
    <div className="relative">
      <button ref={btnRef} type="button" onClick={() => (open ? setBox(null) : place())}
        className={`w-full flex items-center justify-between text-[12.5px] rounded-lg px-3 py-1.5 bg-surface border transition-colors ${open ? "border-primary ring-2 ring-tint" : "border-hairline hover:border-[#cdd6e0]"}`}>
        <span className="font-medium text-ink truncate">{cur?.label ?? value}</span>
        <CaretDown size={12} weight="bold" className={`text-faint transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>
      {box && typeof document !== "undefined" && createPortal(
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setBox(null)} />
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.12 }}
            style={{ left: box.left, top: box.top, bottom: box.bottom, width: box.width, maxHeight: box.maxH }}
            className="fixed z-[70] overflow-y-auto overscroll-contain bg-surface border border-hairline rounded-xl shadow-[0_12px_36px_rgba(0,0,0,0.16)] p-1">
            {options.map((o) => {
              const sel = o.value === value;
              return (
                <button key={o.value} type="button" onClick={() => { onChange(o.value); setBox(null); }}
                  className={`w-full flex items-center justify-between text-left text-[12.5px] rounded-lg px-2.5 py-1.5 transition-colors ${sel ? "text-primary font-medium bg-tint" : "text-ink2 hover:bg-hair2"}`}>
                  <span className="truncate">{o.label}</span>
                  {sel && <Check size={12} weight="bold" className="text-primary shrink-0" />}
                </button>
              );
            })}
          </motion.div>
        </>, document.body)}
    </div>
  );
}

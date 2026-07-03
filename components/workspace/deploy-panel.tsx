"use client";

/* ───────────────────────── 投放面板 ─────────────────────────
   IA：中间 = 素材库 + 投放面板（相邻），右侧 = 唯一的对话栏。
   本面板只是计划的实时读出（live read-out）—— 所有变更、确认、发布都发生在
   右侧对话里；面板上的按钮也只是把动作转发回对话（onAskEdit / onRequestPublish）。 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import { Sparkle } from "@phosphor-icons/react/dist/csr/Sparkle";
import { MapPin } from "@phosphor-icons/react/dist/csr/MapPin";
import { UsersThree } from "@phosphor-icons/react/dist/csr/UsersThree";
import { Target } from "@phosphor-icons/react/dist/csr/Target";
import { Stack } from "@phosphor-icons/react/dist/csr/Stack";
import { PaperPlaneTilt } from "@phosphor-icons/react/dist/csr/PaperPlaneTilt";
import { SealCheck } from "@phosphor-icons/react/dist/csr/SealCheck";
import { Path } from "@phosphor-icons/react/dist/csr/Path";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { planCounts, CHANNEL_META, GEO_NAME, img, type DeployPlan, type BidStrategy, type AspectRatio, type Video } from "@/lib/data";
import { ShieldCheck } from "@phosphor-icons/react/dist/csr/ShieldCheck";
import { Tooltip } from "./ui";
import { fmtK } from "./plan-ops";

export function DeployPanel({ plan, edits, videoById, onPreview, onAskEdit, onRequestPublish, onClose }: {
  plan: DeployPlan;
  edits: number;
  videoById: Map<string, Video>;             // resolve creativeIds → real assets
  onPreview: (v: Video) => void;             // any creative thumb opens the preview
  onAskEdit: (label: string) => void;        // budget click → prefill the chat composer
  onRequestPublish: () => void;              // publish → confirmation happens in the chat
  onClose: () => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const c = planCounts(plan);
  function toggle(id: string) { setCollapsed((p) => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; }); }

  // Unique creatives across the whole plan, in first-appearance order.
  const planCreatives: Video[] = [];
  {
    const seen = new Set<string>();
    for (const ch of plan.channels) for (const s of ch.series) for (const g of s.groups) for (const cid of g.creativeIds) {
      if (seen.has(cid)) continue;
      seen.add(cid);
      const v = videoById.get(cid);
      if (v) planCreatives.push(v);
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden border-l border-hairline bg-canvas">
      <div className="px-4 h-[41px] shrink-0 border-b border-hairline flex items-center gap-2 bg-surface">
        <Path size={14} weight="bold" className="text-faint" />
        <span className="text-[12.5px] font-bold tracking-tight">投放面板</span>
        <span className="text-[11.5px] text-faint">· 对话即计划，这里是实时读出</span>
        <span className="flex-1" />
        <button onClick={onClose} className="w-6 h-6 grid place-items-center rounded-md text-faint hover:text-ink2 hover:bg-hair2 transition-colors"><X size={14} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="max-w-[760px] mx-auto">
        {/* intent + counts */}
        <div className="rounded-xl border border-hairline bg-surface px-4 py-3.5 mb-4">
          <div className="text-[11px] uppercase tracking-[0.06em] text-faint font-semibold mb-1">发行计划 · 意图</div>
          <div className="text-[13px] text-ink2 leading-relaxed">{plan.intent}</div>
          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
            <CountPill icon={<Stack size={12} weight="bold" />} n={c.channels} unit="渠道" />
            <CountPill icon={<Path size={12} weight="bold" />} n={c.series} unit="系列" />
            <CountPill icon={<Stack size={12} weight="bold" />} n={c.groups} unit="组" />
            <CountPill icon={<PaperPlaneTilt size={12} weight="bold" />} n={c.ads} unit="广告" highlight />
            <span className="text-[12px] text-muted ml-auto font-medium">{fmtK(c.budget)}<span className="text-faint">/天</span></span>
          </div>
          {/* 使用素材 — the actual creatives this plan will run, click to preview */}
          {planCreatives.length > 0 && (
            <div className="mt-3 pt-3 border-t border-hair2">
              <div className="text-[11px] uppercase tracking-[0.06em] text-faint font-semibold mb-2">使用素材 · {planCreatives.length} 条</div>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {planCreatives.map((v) => (
                  <button key={v.id} onClick={() => onPreview(v)} className="group relative shrink-0 w-[52px] aspect-[9/16] rounded-lg overflow-hidden border border-hairline bg-black hover:border-primary transition-colors" title={`${v.label} · ${v.channel}${v.qc ? ` · 质检 ${v.qc.total}` : ""}`}>
                    <img src={img(v.seed, 80, 142)} alt="" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                    {v.qc && <span className="absolute top-1 right-1 inline-flex items-center gap-0.5 text-[8.5px] font-bold text-white bg-black/60 px-1 py-px rounded-full tabular-nums"><ShieldCheck size={8} weight="fill" /> {v.qc.total}</span>}
                    <span className="absolute left-1 right-1 bottom-1 text-white text-[8.5px] font-semibold leading-tight [text-shadow:0_1px_2px_rgba(0,0,0,0.7)] truncate text-left">{v.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="mt-2.5 pt-2.5 border-t border-hair2 flex items-center gap-1.5 text-[11px] text-faint">
            <Sparkle size={12} weight="fill" className="text-srcai" /> 参数 AI 自动填充 · 在右侧对话里调整或确认
          </div>
        </div>

        {/* channel tree */}
        <div className="flex flex-col gap-2.5">
          {plan.channels.map((ch) => {
            const open = !collapsed.has(ch.id);
            const meta = CHANNEL_META[ch.channel];
            const chBudget = ch.series.flatMap((s) => s.groups).reduce((n, g) => n + g.budget, 0);
            const chAds = ch.series.flatMap((s) => s.groups).reduce((n, g) => n + g.creativeIds.length, 0);
            return (
              <div key={ch.id} className="rounded-xl border border-hairline bg-surface overflow-hidden">
                <button onClick={() => toggle(ch.id)} className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-canvassoft text-left">
                  <CaretRight size={12} weight="bold" className={`text-faint transition-transform ${open ? "rotate-90" : ""}`} />
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: meta.dot }} />
                  <span className="text-[12.5px] font-bold tracking-tight text-ink">{ch.channel}</span>
                  <BidBadge bid={ch.bid} roas={ch.targetRoas} />
                  <span className="flex-1" />
                  <span className="text-[11px] text-muted">{chAds} 广告</span>
                  <span className="text-[12px] font-medium text-ink2 w-14 text-right">{fmtK(chBudget)}<span className="text-faint text-[10px]">/天</span></span>
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="px-2.5 pb-2.5 flex flex-col gap-1.5">
                        {ch.series.map((s) => {
                          const sid = ch.id + s.id, sopen = !collapsed.has(sid);
                          const sBudget = s.groups.reduce((n, g) => n + g.budget, 0);
                          return (
                            <div key={s.id} className="rounded-lg border border-hair2 bg-canvassoft overflow-hidden">
                              <div role="button" tabIndex={0} onClick={() => toggle(sid)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(sid); } }} className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-hair2 text-left cursor-pointer">
                                <CaretRight size={11} weight="bold" className={`text-faint transition-transform ${sopen ? "rotate-90" : ""}`} />
                                <MapPin size={12} weight="fill" className="text-muted shrink-0" />
                                <span className="text-[12px] font-semibold text-ink2">{GEO_NAME[s.geo] ?? s.geo}</span>
                                <span className="inline-flex items-center gap-1 text-[11px] text-muted"><UsersThree size={11} />{s.audience}</span>
                                <span className="flex-1" />
                                <button onClick={(e) => { e.stopPropagation(); onAskEdit(`${ch.channel}·${GEO_NAME[s.geo] ?? s.geo}`); }} className="text-[11.5px] font-medium text-ink2 hover:text-primary hover:underline">{fmtK(sBudget)}</button>
                              </div>
                              <AnimatePresence initial={false}>
                                {sopen && (
                                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                                    <div className="px-2 pb-2 flex flex-col gap-1.5">
                                      {s.groups.map((g) => (
                                        <div key={g.id} className="flex items-center gap-2 rounded-md bg-surface border border-hair2 px-2 py-1.5">
                                          <RatioGlyph ratio={g.ratio} />
                                          <span className="text-[11.5px] font-medium text-ink2">{g.device}</span>
                                          <span className="text-[10.5px] text-faint inline-flex items-center gap-1"><Target size={10} weight="bold" /> {fmtMoney(g.bid)}</span>
                                          <span className="flex-1" />
                                          <div className="flex items-center gap-1">
                                            {Array.from(new Set(g.creativeIds)).slice(0, 4).map((cid) => {
                                              const v = videoById.get(cid);
                                              if (!v) return <span key={cid} className="w-[18px] h-8 rounded-[3px] bg-hair2 border border-surface" />;
                                              return (
                                                <Tooltip key={cid} label={`${v.label}${v.qc ? ` · 质检 ${v.qc.total}` : ""} · 点击预览`} side="top">
                                                  <button onClick={() => onPreview(v)} className="block w-[18px] h-8 rounded-[3px] overflow-hidden border border-surface ring-1 ring-hairline hover:ring-primary transition-shadow">
                                                    <img src={img(v.seed, 36, 64)} alt="" className="w-full h-full object-cover" />
                                                  </button>
                                                </Tooltip>
                                              );
                                            })}
                                            <span className="text-[10px] font-semibold text-muted tabular-nums ml-0.5">×{g.creativeIds.length}</span>
                                          </div>
                                          <button onClick={() => onAskEdit(`${ch.channel}·${GEO_NAME[s.geo] ?? s.geo}·${g.device}`)} className="text-[11.5px] font-semibold text-ink2 hover:text-primary hover:underline">{fmtK(g.budget)}</button>
                                        </div>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
        </div>
      </div>

      {/* sticky bar — the button routes back into the conversation */}
      <div className="shrink-0 border-t border-hairline bg-surface px-4 py-2.5 flex items-center gap-2">
        <div className="text-[11.5px] text-muted"><b className="text-ink2 font-semibold">{c.ads}</b> 广告 · <b className="text-ink2 font-semibold">{fmtK(c.budget)}/天</b></div>
        {edits > 0 && <span className="text-[10.5px] text-faint inline-flex items-center gap-1"><Sparkle size={11} weight="fill" className="text-srcai" />{edits} 处调整已记录</span>}
        <span className="flex-1" />
        <button onClick={onRequestPublish} className="text-[12.5px] font-semibold rounded-full px-4 py-2 bg-primary text-white hover:bg-primary2 active:scale-[0.97] transition inline-flex items-center gap-1.5">
          <PaperPlaneTilt size={13} weight="fill" /> 在对话中确认发布
        </button>
      </div>
    </div>
  );
}

export function SuccessOverlay({ counts, edits, onExit }: { counts: ReturnType<typeof planCounts>; edits: number; onExit: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-black/30 grid place-items-center">
      <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-[440px] bg-surface rounded-2xl border border-hairline shadow-[0_20px_60px_rgba(0,0,0,0.25)] p-6 text-center">
        <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 360, damping: 18 }} className="w-12 h-12 rounded-full bg-pass grid place-items-center mx-auto mb-3.5"><SealCheck size={24} weight="fill" className="text-white" /></motion.div>
        <div className="text-[17px] font-bold tracking-tight text-ink">{counts.ads} 条广告已提交</div>
        <div className="text-[13px] text-muted leading-relaxed mt-1.5">已向 {counts.channels} 个渠道下发，执行成功率 <b className="text-pass">99.2%</b>。剩余 {Math.max(0, Math.round(counts.ads * 0.008))} 条因账户校验排队，会自动重试。</div>
        {edits > 0 && (
          <div className="mt-3.5 rounded-lg bg-canvassoft border border-hairline px-3 py-2.5 text-[12.5px] text-muted leading-relaxed inline-flex items-start gap-1.5 text-left">
            <Sparkle size={14} weight="fill" className="text-srcai mt-[1px] shrink-0" />
            你在对话里的 {edits} 处调整已作为反馈写入数据集，下次同类发行计划的自动分配会更贴近你的偏好。
          </div>
        )}
        <button onClick={onExit} className="mt-5 w-full text-[13px] font-semibold rounded-full py-2.5 bg-primary text-white hover:bg-primary2">进入盯盘 · 返回素材库</button>
      </motion.div>
    </motion.div>
  );
}

function CountPill({ icon, n, unit, highlight }: { icon: React.ReactNode; n: number; unit: string; highlight?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] ${highlight ? "bg-primary text-white" : "bg-canvas text-ink2 border border-hairline"}`}>
      <span className={highlight ? "text-white/70" : "text-faint"}>{icon}</span>
      <motion.b key={n} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="font-bold tabular-nums">{n}</motion.b>
      <span className={highlight ? "text-white/80 font-normal" : "text-muted font-normal"}>{unit}</span>
    </span>
  );
}

function BidBadge({ bid, roas }: { bid: BidStrategy; roas: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-md px-1.5 py-0.5 bg-tint text-primary border border-tintborder">
      {bid}{bid === "ROAS" && roas > 0 ? ` ${roas.toFixed(1)}` : ""}
    </span>
  );
}

function RatioGlyph({ ratio }: { ratio: AspectRatio }) {
  const [w, h] = ratio.split(":").map(Number);
  const scale = 12 / Math.max(w, h);
  return <span className="inline-grid place-items-center w-3.5 shrink-0"><span className="bg-faint/40 rounded-[1.5px] border border-faint/50" style={{ width: w * scale, height: h * scale }} /></span>;
}

function fmtMoney(n: number) { return `$${n.toFixed(n % 1 === 0 ? 0 : 1)}`; }

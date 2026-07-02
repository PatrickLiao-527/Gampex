"use client";

/* ───────────────────────── 发行计划 · 对话优先构建 ─────────────────────────
   Chat-first deploy-plan builder. The conversation is the source of truth; the
   left tree is its live read-out. Intent goes in once → the agent expands it into
   渠道→广告系列→广告组→广告, pre-filling budget/bid/split-rules from the data layer.
   The user refines in natural language (or one-tap chips); every edit re-expands
   the tree and is logged as a 评测4 bad-case. One publish fans out to all channels. */

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import { Sparkle } from "@phosphor-icons/react/dist/csr/Sparkle";
import { MapPin } from "@phosphor-icons/react/dist/csr/MapPin";
import { UsersThree } from "@phosphor-icons/react/dist/csr/UsersThree";
import { Target } from "@phosphor-icons/react/dist/csr/Target";
import { Stack } from "@phosphor-icons/react/dist/csr/Stack";
import { PaperPlaneTilt } from "@phosphor-icons/react/dist/csr/PaperPlaneTilt";
import { ArrowUp } from "@phosphor-icons/react/dist/csr/ArrowUp";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { SealCheck } from "@phosphor-icons/react/dist/csr/SealCheck";
import { Warning } from "@phosphor-icons/react/dist/csr/Warning";
import { Pencil } from "@phosphor-icons/react/dist/csr/Pencil";
import { Path } from "@phosphor-icons/react/dist/csr/Path";
import {
  buildInitialPlan, planCounts, CHANNEL_META, GEO_NAME, img,
  type DeployPlan, type DeployChannel, type BidStrategy, type AspectRatio,
} from "@/lib/data";

type PlanMsg = { role: "u" | "a"; text: string; flags?: { tone: "warn" | "info"; text: string }[] };

const fmtK = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${n}`);

export default function DeployPlanView({
  creativeIds, onExit,
}: { creativeIds: string[]; onExit: () => void }) {
  const initialPlan = useMemo(() => buildInitialPlan(creativeIds), [creativeIds]);
  const ic = useMemo(() => planCounts(initialPlan), [initialPlan]);
  const [plan, setPlan] = useState<DeployPlan>(initialPlan);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [edits, setEdits] = useState(0);
  const [published, setPublished] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const c = useMemo(() => planCounts(plan), [plan]);

  const [messages, setMessages] = useState<PlanMsg[]>(() => [
    { role: "u", text: `把选中的 ${creativeIds.length || 12} 条素材投出去：星轨 NA+JP 冷启动，${fmtK(ic.budget)}/天，男 18-24，ROAS 出价，Meta + TikTok + AppLovin。` },
    {
      role: "a",
      text: `已按你的发行计划展开 → ${ic.channels} 渠道 · ${ic.series} 广告系列 · ${ic.ads} 广告。预算和出价我按巨量引擎 Q2 同品类跑量数据分配，每个渠道的拆分规则（地区/定向/创意）已按各自最优自动设好。两点要你确认：`,
      flags: [
        { tone: "warn", text: "日本 CPI 偏高，预算先给了保守值，跑稳再加。" },
        { tone: "info", text: "AppLovin 只在美国跑 —— 日韩量级不够，跑了也浪费。" },
      ],
    },
  ]);
  const [input, setInput] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" }); }, [messages.length]);

  function toggle(id: string) { setCollapsed((p) => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; }); }
  function logEdit() { setEdits((n) => n + 1); }

  // ── plan mutations (each returns the new plan; the conversation drives them) ──
  function adjustGeoBudget(geo: string, factor: number): [DeployPlan, string] {
    const next = { ...plan, channels: plan.channels.map((ch) => ({
      ...ch, series: ch.series.map((s) => s.geo !== geo ? s : ({
        ...s, groups: s.groups.map((g) => ({ ...g, budget: Math.round(g.budget * factor / 50) * 50 })),
      })),
    })) };
    const pct = Math.round((1 - factor) * 100);
    return [next, `${GEO_NAME[geo] ?? geo}的日预算已${pct > 0 ? `下调 ${pct}%` : `上调 ${-pct}%`}，其它地区不动。`];
  }
  function addGeo(geo: string): [DeployPlan, string] {
    if (plan.channels.some((ch) => ch.series.some((s) => s.geo === geo)))
      return [plan, `${GEO_NAME[geo] ?? geo}已经在计划里了。`];
    let seq = 90;
    const next = { ...plan, channels: plan.channels.map((ch) => ch.channel === "AppLovin" ? ch : ({
      ...ch, series: [...ch.series, {
        id: `s-${ch.id}-${geo}`, geo, audience: "男 18-24",
        groups: [{ id: `g${seq++}`, device: "全机型", budget: 700, bid: 2.4, ratio: "9:16" as AspectRatio, creativeIds: ch.series[0]?.groups[0]?.creativeIds.slice(0, 4) ?? [] }],
      }],
    })) };
    return [next, `已为 Meta、TikTok 各加一个${GEO_NAME[geo] ?? geo}广告系列，先用保守预算 $700/天 试水，复用同一批素材。`];
  }
  function removeChannel(ch: DeployChannel): [DeployPlan, string] {
    if (!plan.channels.some((x) => x.channel === ch)) return [plan, `计划里没有 ${ch}。`];
    return [{ ...plan, channels: plan.channels.filter((x) => x.channel !== ch) }, `${ch} 已从计划移除，预算不会重新分配到其它渠道 —— 需要的话告诉我往哪加。`];
  }
  function setAllBid(bid: BidStrategy): [DeployPlan, string] {
    return [{ ...plan, channels: plan.channels.map((ch) => ({ ...ch, bid })) }, `全部渠道改成 ${bid} 出价。注意 AppLovin 的 ${bid} 表现历史上波动大，我会在盯盘里重点标。`];
  }
  function trimCreatives(n: number): [DeployPlan, string] {
    const next = { ...plan, channels: plan.channels.map((ch) => ({ ...ch, series: ch.series.map((s) => ({
      ...s, groups: s.groups.map((g) => ({ ...g, creativeIds: g.creativeIds.slice(0, n) })),
    })) })) };
    return [next, `每个广告组只保留前 ${n} 条素材，广告总数随之减少 —— 想跑全量再说一声。`];
  }

  function apply(fn: () => [DeployPlan, string], userText: string) {
    const [next, reply] = fn();
    setPlan(next);
    logEdit();
    setMessages((m) => [...m, { role: "u", text: userText }]);
    const after = planCounts(next);
    window.setTimeout(() => setMessages((m) => [...m, { role: "a", text: `${reply}\n现在是 ${after.channels} 渠道 · ${after.series} 系列 · ${after.groups} 组 · ${after.ads} 广告 · ${fmtK(after.budget)}/天。` }]), 480);
  }

  // free-text → best-match mutation (prototype heuristics)
  function send() {
    const t = input.trim(); if (!t) return; setInput("");
    if (/(韩国|韩|kr)/i.test(t)) return apply(() => addGeo("KR"), t);
    if (/(台湾|台|tw)/i.test(t)) return apply(() => addGeo("TW"), t);
    if (/(日本|日|jp).*(减|降|低|-?30|砍|调低|少)/i.test(t)) return apply(() => adjustGeoBudget("JP", 0.7), t);
    if (/(applovin|al).*(去|删|掉|移除|不要)/i.test(t)) return apply(() => removeChannel("AppLovin"), t);
    if (/(google).*(去|删|掉|移除|不要)/i.test(t)) return apply(() => removeChannel("Google"), t);
    if (/\bcpi\b/i.test(t)) return apply(() => setAllBid("CPI"), t);
    if (/\broas\b/i.test(t)) return apply(() => setAllBid("ROAS"), t);
    if (/(2|两)\s*条/.test(t)) return apply(() => trimCreatives(2), t);
    setMessages((m) => [...m, { role: "u", text: t }]);
    window.setTimeout(() => setMessages((m) => [...m, { role: "a", text: "明白。可以直接说预算/地区/出价/素材的调整，比如「日本预算砍 30%」「加投韩国」「全改 CPI」，我会即时重排计划。" }]), 480);
  }

  function focusEdit(label: string) {
    setInput(`把 ${label} 的日预算改成 `);
    inputRef.current?.focus();
  }

  const chips: { label: string; fn: () => [DeployPlan, string] }[] = [
    { label: "日本预算 -30%", fn: () => adjustGeoBudget("JP", 0.7) },
    { label: "加投韩国", fn: () => addGeo("KR") },
    { label: "去掉 AppLovin", fn: () => removeChannel("AppLovin") },
    { label: "全改 CPI 出价", fn: () => setAllBid("CPI") },
    { label: "每组只留 2 条素材", fn: () => trimCreatives(2) },
  ];
  const lastIsAgent = messages[messages.length - 1]?.role === "a";

  return (
    <div className="flex-1 min-h-0 flex overflow-hidden">
      {/* ── Left: the plan tree (live read-out of the conversation) ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-5 pb-28">
          {/* intent + counts */}
          <div className="rounded-xl border border-hairline bg-surface px-5 py-4 mb-5">
            <div className="flex items-start gap-2">
              <Path size={15} weight="bold" className="text-faint mt-[3px] shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] uppercase tracking-[0.06em] text-faint font-semibold mb-1">发行计划 · 意图</div>
                <div className="text-[13.5px] text-ink2 leading-relaxed">{plan.intent}</div>
              </div>
              <button onClick={() => { setInput("调整发行计划意图："); inputRef.current?.focus(); }} className="text-[12px] text-muted hover:text-ink2 inline-flex items-center gap-1 shrink-0 rounded-md px-2 py-1 hover:bg-hair2"><Pencil size={13} /> 改</button>
            </div>
            <div className="flex items-center gap-2 mt-3.5 flex-wrap">
              <CountPill icon={<Stack size={13} weight="bold" />} n={c.channels} unit="渠道" />
              <CountPill icon={<Path size={13} weight="bold" />} n={c.series} unit="广告系列" />
              <CountPill icon={<Stack size={13} weight="bold" />} n={c.groups} unit="广告组" />
              <CountPill icon={<PaperPlaneTilt size={13} weight="bold" />} n={c.ads} unit="广告" highlight />
              <span className="text-[12.5px] text-muted ml-auto font-medium">{fmtK(c.budget)}<span className="text-faint">/天</span></span>
            </div>
            <div className="mt-3 pt-3 border-t border-hair2 flex items-center gap-1.5 text-[11.5px] text-faint">
              <Sparkle size={13} weight="fill" className="text-srcai" /> 全部参数 AI 自动填充 · 各渠道拆分规则已按历史跑量最优设定 · 在右侧对话里调整
            </div>
          </div>

          {/* channel tree */}
          <div className="flex flex-col gap-3">
            {plan.channels.map((ch) => {
              const open = !collapsed.has(ch.id);
              const meta = CHANNEL_META[ch.channel];
              const chBudget = ch.series.flatMap((s) => s.groups).reduce((n, g) => n + g.budget, 0);
              const chAds = ch.series.flatMap((s) => s.groups).reduce((n, g) => n + g.creativeIds.length, 0);
              return (
                <div key={ch.id} className="rounded-xl border border-hairline bg-surface overflow-hidden">
                  <button onClick={() => toggle(ch.id)} className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-canvassoft text-left">
                    <CaretRight size={13} weight="bold" className={`text-faint transition-transform ${open ? "rotate-90" : ""}`} />
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: meta.dot }} />
                    <span className="text-[13.5px] font-bold tracking-tight text-ink">{ch.channel}</span>
                    <span className="text-[12px] text-faint font-mono">{ch.account}</span>
                    <span className="flex-1" />
                    <BidBadge bid={ch.bid} roas={ch.targetRoas} />
                    <span className="text-[12px] text-muted w-14 text-right">{ch.series.length} 系列</span>
                    <span className="text-[12px] text-muted w-12 text-right">{chAds} 广告</span>
                    <span className="text-[12.5px] font-medium text-ink2 w-16 text-right">{fmtK(chBudget)}<span className="text-faint text-[11px]">/天</span></span>
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                        <div className="px-3 pb-3 flex flex-col gap-2">
                          {ch.series.map((s) => {
                            const sid = ch.id + s.id, sopen = !collapsed.has(sid);
                            const sBudget = s.groups.reduce((n, g) => n + g.budget, 0);
                            return (
                              <div key={s.id} className="rounded-lg border border-hair2 bg-canvassoft overflow-hidden">
                                <div role="button" tabIndex={0} onClick={() => toggle(sid)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(sid); } }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-hair2 text-left cursor-pointer">
                                  <CaretRight size={11} weight="bold" className={`text-faint transition-transform ${sopen ? "rotate-90" : ""}`} />
                                  <MapPin size={13} weight="fill" className="text-muted shrink-0" />
                                  <span className="text-[12.5px] font-semibold text-ink2">{GEO_NAME[s.geo] ?? s.geo}</span>
                                  <span className="inline-flex items-center gap-1 text-[11.5px] text-muted"><UsersThree size={12} />{s.audience}</span>
                                  <span className="flex-1" />
                                  <span className="text-[11.5px] text-faint">{s.groups.length} 组</span>
                                  <button onClick={(e) => { e.stopPropagation(); focusEdit(`${ch.channel}·${GEO_NAME[s.geo] ?? s.geo}`); }} className="text-[12px] font-medium text-ink2 w-14 text-right hover:text-primary hover:underline">{fmtK(sBudget)}</button>
                                </div>
                                <AnimatePresence initial={false}>
                                  {sopen && (
                                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                                      <div className="px-2.5 pb-2.5 flex flex-col gap-1.5">
                                        {s.groups.map((g) => (
                                          <div key={g.id} className="flex items-center gap-2.5 rounded-md bg-surface border border-hair2 px-2.5 py-2">
                                            <RatioGlyph ratio={g.ratio} />
                                            <span className="text-[12px] font-medium text-ink2 w-16">{g.device}</span>
                                            <span className="text-[11.5px] text-faint inline-flex items-center gap-1"><Target size={11} weight="bold" /> bid {fmtMoney(g.bid)}</span>
                                            <span className="flex-1" />
                                            <div className="flex -space-x-1.5">
                                              {g.creativeIds.slice(0, 5).map((cid, i) => (
                                                <img key={cid + i} src={img(cid + i, 28, 28)} alt="" className="w-6 h-6 rounded-[3px] object-cover border border-surface ring-1 ring-hairline" />
                                              ))}
                                              <span className="w-6 h-6 rounded-[3px] bg-tint grid place-items-center text-[10px] font-semibold text-muted border border-surface">{g.creativeIds.length}</span>
                                            </div>
                                            <button onClick={() => focusEdit(`${ch.channel}·${GEO_NAME[s.geo] ?? s.geo}·${g.device}`)} className="text-[12px] font-semibold text-ink2 w-14 text-right hover:text-primary hover:underline">{fmtK(g.budget)}<span className="text-faint text-[10.5px] font-normal">/天</span></button>
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

        {/* sticky publish bar */}
        <div className="shrink-0 border-t border-hairline bg-surface px-6 py-3 flex items-center gap-3">
          <div className="text-[12.5px] text-muted">将向 <b className="text-ink2 font-semibold">{c.channels}</b> 个渠道创建 <b className="text-ink2 font-semibold">{c.ads}</b> 条广告 · 合计 <b className="text-ink2 font-semibold">{fmtK(c.budget)}/天</b></div>
          <span className="flex-1" />
          {edits > 0 && <span className="text-[11.5px] text-faint inline-flex items-center gap-1"><Sparkle size={12} weight="fill" className="text-srcai" />{edits} 处调整已记录到数据集</span>}
          <button onClick={() => setConfirming(true)} className="text-[13px] font-semibold rounded-full px-5 py-2.5 bg-primary text-white hover:bg-primary2 active:scale-[0.97] transition inline-flex items-center gap-1.5">
            <PaperPlaneTilt size={15} weight="fill" /> 审阅并发布 {c.ads} 条
          </button>
        </div>
      </div>

      {/* ── Right: the plan conversation (the spine) ── */}
      <div className="w-px bg-hairline shrink-0" />
      <section className="w-[384px] shrink-0 h-full bg-canvassoft flex flex-col overflow-hidden">
        <header className="px-4 h-[49px] shrink-0 border-b border-hairline flex items-center gap-2">
          <button onClick={onExit} className="w-7 h-7 grid place-items-center rounded-md text-faint hover:text-ink2 hover:bg-hair2 transition-colors"><ArrowLeft size={16} /></button>
          <span className="text-[13px] font-bold tracking-tight">发行计划 · 对话构建</span>
        </header>
        <div ref={threadRef} className="flex-1 overflow-y-auto p-[18px] flex flex-col gap-4">
          {messages.map((m, i) => m.role === "u"
            ? <div key={i} className="flex justify-end"><div className="text-[13.5px] leading-relaxed bg-tint border border-tintborder rounded-[14px_14px_4px_14px] px-3 py-2.5 max-w-[92%] whitespace-pre-line">{m.text}</div></div>
            : (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="text-[11px] font-semibold text-faint flex items-center gap-1.5"><span className="w-[15px] h-[15px] rounded bg-primary text-white grid place-items-center text-[9px] font-bold">G</span>Gampex</div>
                <div className="text-[13.5px] leading-relaxed text-ink2 whitespace-pre-line">{m.text}</div>
                {m.flags && (
                  <div className="flex flex-col gap-1.5 mt-1">
                    {m.flags.map((f, j) => (
                      <div key={j} className={`flex items-start gap-1.5 text-[12.5px] rounded-lg px-2.5 py-2 border ${f.tone === "warn" ? "bg-modbg border-[#f5e3bf] text-[#92610a]" : "bg-canvas border-hairline text-muted"}`}>
                        {f.tone === "warn" ? <Warning size={14} weight="fill" className="mt-[1px] shrink-0" /> : <SealCheck size={14} weight="fill" className="mt-[1px] shrink-0 text-faint" />}
                        <span>{f.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          {lastIsAgent && !published && (
            <div className="flex flex-wrap gap-1.5">
              {chips.map((ch) => (
                <button key={ch.label} onClick={() => apply(ch.fn, ch.label)} className="text-[12px] text-ink2 bg-surface border border-hairline rounded-full px-2.5 py-1.5 hover:bg-canvas hover:border-tintborder active:scale-95 transition inline-flex items-center gap-1">
                  <Plus size={11} weight="bold" className="text-faint" />{ch.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="p-3.5 pt-2.5">
          <div className="bg-surface border border-hairline rounded-2xl px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <textarea ref={inputRef} rows={1} value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="调整计划，例如「日本预算砍 30%」「加投韩国」「全改 CPI」…" className="w-full resize-none outline-none bg-transparent text-[13.5px] leading-snug text-ink placeholder:text-faint" />
            <div className="flex items-center gap-1 mt-1.5">
              <span className="text-[11.5px] text-faint inline-flex items-center gap-1"><Path size={13} />对话即计划</span>
              <span className="flex-1" />
              <button onClick={send} disabled={!input.trim()} className="w-[31px] h-[31px] rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary2 transition-transform active:scale-90 disabled:opacity-40"><ArrowUp size={15} weight="bold" /></button>
            </div>
          </div>
        </div>
      </section>

      {/* confirm + success */}
      <AnimatePresence>
        {confirming && !published && (
          <ConfirmPublish counts={c} onCancel={() => setConfirming(false)} onConfirm={() => { setPublished(true); setConfirming(false); }} />
        )}
        {published && <SuccessOverlay counts={c} edits={edits} onExit={onExit} />}
      </AnimatePresence>
    </div>
  );
}

function CountPill({ icon, n, unit, highlight }: { icon: React.ReactNode; n: number; unit: string; highlight?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] ${highlight ? "bg-primary text-white" : "bg-canvas text-ink2 border border-hairline"}`}>
      <span className={highlight ? "text-white/70" : "text-faint"}>{icon}</span>
      <motion.b key={n} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="font-bold tabular-nums">{n}</motion.b>
      <span className={highlight ? "text-white/80 font-normal" : "text-muted font-normal"}>{unit}</span>
    </span>
  );
}

function BidBadge({ bid, roas }: { bid: BidStrategy; roas: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-md px-2 py-1 bg-tint text-primary border border-tintborder">
      {bid}{bid === "ROAS" && roas > 0 ? ` ${roas.toFixed(1)}` : ""}
    </span>
  );
}

function RatioGlyph({ ratio }: { ratio: AspectRatio }) {
  const [w, h] = ratio.split(":").map(Number);
  const scale = 14 / Math.max(w, h);
  return <span className="inline-grid place-items-center w-4 shrink-0"><span className="bg-faint/40 rounded-[1.5px] border border-faint/50" style={{ width: w * scale, height: h * scale }} /></span>;
}

function fmtMoney(n: number) { return `$${n.toFixed(n % 1 === 0 ? 0 : 1)}`; }

function ConfirmPublish({ counts, onCancel, onConfirm }: { counts: ReturnType<typeof planCounts>; onCancel: () => void; onConfirm: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-black/30 grid place-items-center" onClick={onCancel}>
      <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }} onClick={(e) => e.stopPropagation()}
        className="w-[420px] bg-surface rounded-2xl border border-hairline shadow-[0_20px_60px_rgba(0,0,0,0.25)] p-6">
        <div className="w-10 h-10 rounded-full bg-tint grid place-items-center mb-3"><PaperPlaneTilt size={18} weight="fill" className="text-primary" /></div>
        <div className="text-[16px] font-bold tracking-tight text-ink">发布 {counts.ads} 条广告？</div>
        <div className="text-[13px] text-muted leading-relaxed mt-1.5">将向 {counts.channels} 个渠道（{counts.series} 广告系列 · {counts.groups} 广告组）一次性创建并提交，合计 {fmtK(counts.budget)}/天。提交后进入盯盘，你随时可暂停或调价。</div>
        <div className="flex gap-2 mt-5">
          <button onClick={onCancel} className="flex-1 text-[13px] font-semibold rounded-full py-2.5 border border-hairline hover:bg-canvas">再看看</button>
          <button onClick={onConfirm} className="flex-1 text-[13px] font-semibold rounded-full py-2.5 bg-primary text-white hover:bg-primary2 inline-flex items-center justify-center gap-1.5"><PaperPlaneTilt size={15} weight="fill" /> 确认发布</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SuccessOverlay({ counts, edits, onExit }: { counts: ReturnType<typeof planCounts>; edits: number; onExit: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[70] bg-black/30 grid place-items-center">
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

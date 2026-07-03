/* 发行计划的纯函数变更集。右侧对话是唯一入口：每个操作返回新计划 + agent 回复，
   由 index.tsx 的投放助手调用（自由文本识别或 chips）。 */
import { GEO_NAME, planCounts, type AspectRatio, type BidStrategy, type DeployChannel, type DeployPlan } from "@/lib/data";

export type PlanOpResult = [DeployPlan, string];

export const fmtK = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${n}`);

export function adjustGeoBudget(plan: DeployPlan, geo: string, factor: number): PlanOpResult {
  const next = { ...plan, channels: plan.channels.map((ch) => ({
    ...ch, series: ch.series.map((s) => s.geo !== geo ? s : ({
      ...s, groups: s.groups.map((g) => ({ ...g, budget: Math.round(g.budget * factor / 50) * 50 })),
    })),
  })) };
  const pct = Math.round((1 - factor) * 100);
  return [next, `${GEO_NAME[geo] ?? geo}的日预算已${pct > 0 ? `下调 ${pct}%` : `上调 ${-pct}%`}，其它地区不动。`];
}

export function addGeo(plan: DeployPlan, geo: string): PlanOpResult {
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

export function removeChannel(plan: DeployPlan, ch: DeployChannel): PlanOpResult {
  if (!plan.channels.some((x) => x.channel === ch)) return [plan, `计划里没有 ${ch}。`];
  return [{ ...plan, channels: plan.channels.filter((x) => x.channel !== ch) }, `${ch} 已从计划移除，预算不会重新分配到其它渠道 —— 需要的话告诉我往哪加。`];
}

export function setAllBid(plan: DeployPlan, bid: BidStrategy): PlanOpResult {
  return [{ ...plan, channels: plan.channels.map((ch) => ({ ...ch, bid })) }, `全部渠道改成 ${bid} 出价。注意 AppLovin 的 ${bid} 表现历史上波动大，我会在盯盘里重点标。`];
}

export function trimCreatives(plan: DeployPlan, n: number): PlanOpResult {
  const next = { ...plan, channels: plan.channels.map((ch) => ({ ...ch, series: ch.series.map((s) => ({
    ...s, groups: s.groups.map((g) => ({ ...g, creativeIds: g.creativeIds.slice(0, n) })),
  })) })) };
  return [next, `每个广告组只保留前 ${n} 条素材，广告总数随之减少 —— 想跑全量再说一声。`];
}

/* 计划 ↔ 素材库的活链接：计划展开后勾选/取消素材，直接增减计划里的广告。 */
export function addCreative(plan: DeployPlan, id: string): PlanOpResult {
  let added = 0;
  const next = { ...plan, channels: plan.channels.map((ch) => ({ ...ch, series: ch.series.map((s) => ({
    ...s, groups: s.groups.map((g) => {
      if (g.creativeIds.includes(id)) return g;
      added++;
      return { ...g, creativeIds: [...g.creativeIds, id] };
    }),
  })) })) };
  return [next, added ? `已加进 ${added} 个广告组（+${added} 广告）。` : `这条素材已经在计划里了。`];
}

export function removeCreative(plan: DeployPlan, id: string): PlanOpResult {
  let removed = 0;
  const next = { ...plan, channels: plan.channels.map((ch) => ({ ...ch, series: ch.series.map((s) => ({
    ...s, groups: s.groups.map((g) => {
      if (!g.creativeIds.includes(id)) return g;
      removed += g.creativeIds.filter((x) => x === id).length;
      return { ...g, creativeIds: g.creativeIds.filter((x) => x !== id) };
    }),
  })) })) };
  return [next, removed ? `已从 ${removed} 个广告位撤下。` : `计划里没有这条素材。`];
}

export function countsLine(plan: DeployPlan): string {
  const c = planCounts(plan);
  return `现在是 ${c.channels} 渠道 · ${c.series} 系列 · ${c.groups} 组 · ${c.ads} 广告 · ${fmtK(c.budget)}/天。`;
}

/* 自由文本 → 最匹配的计划变更（prototype 启发式，与旧 DeployPlanView 一致）。 */
export function matchPlanOp(plan: DeployPlan, t: string): PlanOpResult | null {
  if (/(韩国|韩|kr)/i.test(t)) return addGeo(plan, "KR");
  if (/(台湾|台|tw)/i.test(t)) return addGeo(plan, "TW");
  if (/(日本|日|jp).*(减|降|低|-?30|砍|调低|少)/i.test(t)) return adjustGeoBudget(plan, "JP", 0.7);
  if (/(applovin|al).*(去|删|掉|移除|不要)/i.test(t)) return removeChannel(plan, "AppLovin");
  if (/(google).*(去|删|掉|移除|不要)/i.test(t)) return removeChannel(plan, "Google");
  if (/\bcpi\b/i.test(t)) return setAllBid(plan, "CPI");
  if (/\broas\b/i.test(t)) return setAllBid(plan, "ROAS");
  if (/(2|两)\s*条/.test(t)) return trimCreatives(plan, 2);
  return null;
}

export const PLAN_CHIPS: { label: string; op: (p: DeployPlan) => PlanOpResult }[] = [
  { label: "日本预算 -30%", op: (p) => adjustGeoBudget(p, "JP", 0.7) },
  { label: "加投韩国", op: (p) => addGeo(p, "KR") },
  { label: "去掉 AppLovin", op: (p) => removeChannel(p, "AppLovin") },
  { label: "全改 CPI 出价", op: (p) => setAllBid(p, "CPI") },
  { label: "每组只留 2 条素材", op: (p) => trimCreatives(p, 2) },
];

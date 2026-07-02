import { type Shot } from "@/lib/data";

export type Tab = "create" | "deploy";
export type ShotSelection = { kind: "shot"; no: number } | { kind: "track"; id: "bgm" | "vo" } | { kind: "output" } | { kind: "none" };
export type GenItem = { id: string; label: string; channel: string; dur: string; ratio: string; seed: string; done: boolean; readyAt?: number };
export type Project = { id: string; name: string; desc: string };

export const initialProjects: Project[] = [
  { id: "p1", name: "星轨连击特效", desc: "主投巨量 · 男性 18–24" },
  { id: "p2", name: "王者征途新春", desc: "新春买量批次" },
  { id: "p3", name: "星际争霸 ROAS", desc: "ROAS 测试" },
];

export function spanOf(t: string): [number, number] {
  const parts = t.replace(/s/gi, "").split(/[–-]/).map((x) => parseFloat(x.trim()));
  const a = isNaN(parts[0]) ? 0 : parts[0];
  const b = parts.length > 1 && !isNaN(parts[1]) ? parts[1] : a;
  return [a, b];
}

export function durOf(d: string): number { const n = parseFloat(d); return isNaN(n) ? 30 : n; }

export function reflowShots(shots: Shot[], duration: number): Shot[] {
  const lens = shots.map((s) => { const [a, b] = spanOf(s.t); return Math.max(b - a, 1); });
  const sum = lens.reduce((x, y) => x + y, 0) || 1;
  let acc = 0;
  return shots.map((s, i) => {
    const start = Math.round(acc);
    const end = Math.round(acc + (lens[i] / sum) * duration);
    acc = end;
    return { ...s, no: i + 1, t: `${start}–${end}s` };
  });
}

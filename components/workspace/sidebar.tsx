"use client";

import { Folder } from "@phosphor-icons/react/dist/csr/Folder";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { SidebarSimple } from "@phosphor-icons/react/dist/csr/SidebarSimple";
import { Sparkle } from "@phosphor-icons/react/dist/csr/Sparkle";
import { Broadcast } from "@phosphor-icons/react/dist/csr/Broadcast";
import { motion } from "motion/react";
import { Tooltip } from "./ui";
import { AccountZone } from "./account-zone";
import { type Project, type Tab } from "./types";

const FUNCTIONS: { key: Tab; label: string; Icon: typeof Sparkle }[] = [
  { key: "create", label: "生成素材", Icon: Sparkle },
  { key: "deploy", label: "管理投放", Icon: Broadcast },
];

export function Sidebar({ projects, activeId, onSelect, onNew, tab, onTab, deployCount, collapsed, onToggle, onToast }: {
  projects: Project[]; activeId: string; onSelect: (id: string) => void; onNew: () => void;
  tab: Tab; onTab: (t: Tab) => void; deployCount: number;
  collapsed: boolean; onToggle: () => void; onToast: (msg: string) => void;
}) {
  return (
    <motion.aside animate={{ width: collapsed ? 60 : 232 }} transition={{ type: "spring", stiffness: 280, damping: 30 }}
      className="shrink-0 bg-surface border-r border-hairline flex flex-col overflow-hidden">
      {collapsed ? (
        <>
          <div className="h-[49px] shrink-0 border-b border-hairline flex items-center justify-center">
            <Tooltip label="展开侧栏" side="bottom">
              <button onClick={onToggle} className="group relative w-9 h-9 rounded-lg grid place-items-center hover:bg-hair2 transition-colors">
                <span className="w-[22px] h-[22px] rounded-md bg-primary group-hover:opacity-0 transition-opacity" />
                <SidebarSimple size={18} className="absolute opacity-0 group-hover:opacity-100 text-ink2 transition-opacity" />
              </button>
            </Tooltip>
          </div>
          <div className="pt-2 flex flex-col items-center gap-1">
            {FUNCTIONS.map(({ key, label, Icon }) => {
              const active = tab === key;
              return (
                <Tooltip key={key} label={label} side="right">
                  <button onClick={() => onTab(key)} className={`relative w-9 h-9 rounded-lg grid place-items-center transition-colors ${active ? "bg-tint" : "hover:bg-hair2"}`}>
                    <Icon size={17} weight={active ? "fill" : "regular"} className={active ? "text-primary" : "text-muted"} />
                    {key === "deploy" && deployCount > 0 && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary" />}
                  </button>
                </Tooltip>
              );
            })}
          </div>
          <div className="mx-3 my-2 border-t border-hairline" />
          <div className="flex-1 overflow-y-auto flex flex-col items-center gap-1">
            <Tooltip label="新建项目" side="right">
              <button onClick={onNew} className="w-9 h-9 rounded-lg grid place-items-center text-muted hover:bg-hair2 hover:text-ink2 transition-colors"><Plus size={17} weight="bold" /></button>
            </Tooltip>
            {projects.map((p) => {
              const active = p.id === activeId;
              return (
                <Tooltip key={p.id} label={p.name} side="right">
                  <button onClick={() => onSelect(p.id)} className={`w-9 h-9 rounded-lg grid place-items-center transition-colors ${active ? "bg-tint" : "hover:bg-hair2"}`}>
                    <Folder size={17} weight={active ? "fill" : "regular"} className={active ? "text-primary" : "text-muted"} />
                  </button>
                </Tooltip>
              );
            })}
          </div>
          <AccountZone collapsed onToast={onToast} />
        </>
      ) : (
        <>
          <div className="h-[49px] shrink-0 px-4 border-b border-hairline flex items-center gap-2">
            <div className="w-[22px] h-[22px] rounded-md bg-primary shrink-0" />
            <span className="font-bold tracking-tight text-[15px] flex-1 truncate">Gampex</span>
            <Tooltip label="收起侧栏" side="bottom">
              <button onClick={onToggle} className="w-7 h-7 grid place-items-center rounded-md text-faint hover:text-ink2 hover:bg-hair2 transition-colors"><SidebarSimple size={16} /></button>
            </Tooltip>
          </div>
          <div className="px-2 pt-2 flex flex-col gap-0.5">
            {FUNCTIONS.map(({ key, label, Icon }) => {
              const active = tab === key;
              return (
                <button key={key} onClick={() => onTab(key)}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${active ? "bg-tint" : "hover:bg-hair2"}`}>
                  <Icon size={16} weight={active ? "fill" : "regular"} className={active ? "text-primary" : "text-muted"} />
                  <span className={`flex-1 text-[13px] font-medium truncate ${active ? "text-primary" : "text-ink"}`}>{label}</span>
                  {key === "deploy" && deployCount > 0 && (
                    <span className={`text-[10.5px] tabular-nums px-1.5 py-px rounded-full font-semibold ${active ? "bg-ink text-white" : "bg-hair2 text-muted"}`}>{deployCount}</span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mx-3 my-2.5 border-t border-hairline" />
          <div className="px-4 mt-1 mb-1 flex items-center">
            <span className="text-[12px] text-faint font-medium">项目</span>
            <span className="flex-1" />
            <span className="text-[11px] text-faint tabular-nums">{projects.length}</span>
          </div>
          <div className="px-2">
            <button onClick={onNew} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-muted hover:bg-hair2 hover:text-ink2 transition-colors">
              <Plus size={16} weight="bold" className="shrink-0" /><span className="text-[13px] font-medium">新建项目</span>
            </button>
          </div>
          <div className="px-2 flex-1 overflow-y-auto flex flex-col gap-0.5 mt-0.5">
            {projects.map((p) => {
              const active = p.id === activeId;
              return (
                <button key={p.id} onClick={() => onSelect(p.id)}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${active ? "bg-tint" : "hover:bg-hair2"}`}>
                  <Folder size={16} weight={active ? "fill" : "regular"} className={active ? "text-primary" : "text-muted"} />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[13px] font-medium truncate ${active ? "text-primary" : "text-ink"}`}>{p.name}</span>
                    <span className="block text-[11.5px] text-faint truncate">{p.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <AccountZone collapsed={false} onToast={onToast} />
        </>
      )}
    </motion.aside>
  );
}

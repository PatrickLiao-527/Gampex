"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "@phosphor-icons/react/dist/csr/ArrowUp";
import { SidebarSimple } from "@phosphor-icons/react/dist/csr/SidebarSimple";
import { Image as ImageIcon } from "@phosphor-icons/react/dist/csr/Image";
import { VideoCamera } from "@phosphor-icons/react/dist/csr/VideoCamera";
import { Play } from "@phosphor-icons/react/dist/csr/Play";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { Broadcast } from "@phosphor-icons/react/dist/csr/Broadcast";
import { Warning } from "@phosphor-icons/react/dist/csr/Warning";
import { SealCheck } from "@phosphor-icons/react/dist/csr/SealCheck";
import { Tooltip } from "./ui";
import { type Project } from "./types";
import { img, type ChatMsg, type ChatAttachment, type ChatPick } from "@/lib/data";

let attSeq = 0;
function filesToAttachments(files: FileList | null, kind: "image" | "video"): ChatAttachment[] {
  if (!files) return [];
  return Array.from(files).map((f) => ({
    id: `att-${attSeq++}-${f.name}`, name: f.name, kind, url: kind === "image" ? URL.createObjectURL(f) : undefined,
  }));
}

export function Chat({ project, messages, onClose, onSend, badge, placeholder, suggestions, onSuggest, onAction, composer }: {
  project: Project; messages: ChatMsg[]; onClose: () => void; onSend: (t: string, attachments?: ChatAttachment[]) => void;
  badge?: string;                       // context tag next to the project name (e.g. 投放助手)
  placeholder?: string;
  suggestions?: string[];               // one-tap prompts shown under the last agent message
  onSuggest?: (t: string) => void;
  onAction?: (id: string) => void;      // message.action clicks (e.g. 生成计划 / 确认发布)
  composer?: { value: string; onChange: (v: string) => void };  // controlled input (面板点击预填)
}) {
  const [inputInternal, setInputInternal] = useState("");
  const input = composer ? composer.value : inputInternal;
  const setInput = composer ? composer.onChange : setInputInternal;
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const threadRef = useRef<HTMLDivElement>(null);
  const imgInput = useRef<HTMLInputElement>(null);
  const vidInput = useRef<HTMLInputElement>(null);
  useEffect(() => { threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" }); }, [messages.length]);
  const addFiles = (e: React.ChangeEvent<HTMLInputElement>, kind: "image" | "video") => {
    const next = filesToAttachments(e.target.files, kind);
    e.target.value = "";
    setAttachments((a) => [...a, ...next]);
  };
  const removeAtt = (id: string) => setAttachments((a) => a.filter((x) => x.id !== id));
  const canSend = input.trim().length > 0 || attachments.length > 0;
  const submit = () => { if (!canSend) return; onSend(input, attachments); setInput(""); setAttachments([]); };
  return (
    <section className="w-full h-full bg-canvassoft flex flex-col overflow-hidden">
      <header className="px-4 h-[49px] shrink-0 border-b border-hairline flex items-center gap-2">
        <span className="text-[13px] font-bold tracking-tight truncate">{project.name}</span>
        {badge && <span className="text-[10.5px] font-semibold text-primary bg-tint border border-tintborder rounded-full px-2 py-0.5 whitespace-nowrap">{badge}</span>}
        <span className="flex-1" />
        <Tooltip label="收起对话" side="bottom">
          <button onClick={onClose} className="w-7 h-7 grid place-items-center rounded-md text-faint hover:text-ink2 hover:bg-hair2 transition-colors"><SidebarSimple size={16} className="-scale-x-100" /></button>
        </Tooltip>
      </header>
      <div ref={threadRef} className="flex-1 overflow-y-auto p-[18px] flex flex-col gap-4">
        {messages.map((m, i) => m.role === "u"
          ? <UserMsg key={i} refs={m.refs} attachments={m.attachments}>{m.text}</UserMsg>
          : <AgentMsg key={i} picks={m.picks} action={m.action} flags={m.flags} onAction={onAction}>{m.text}</AgentMsg>)}
        {suggestions && suggestions.length > 0 && messages[messages.length - 1]?.role === "a" && (
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button key={s} onClick={() => onSuggest?.(s)} className="text-[12px] text-ink2 bg-surface border border-hairline rounded-full px-2.5 py-1.5 hover:bg-canvas hover:border-tintborder active:scale-95 transition">{s}</button>
            ))}
          </div>
        )}
      </div>
      <div className="p-3.5 pt-2.5">
        <div className="bg-surface border border-hairline rounded-2xl px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {attachments.map((a) => <AttachmentChip key={a.id} a={a} onRemove={() => removeAtt(a.id)} />)}
            </div>
          )}
          <textarea rows={1} value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder={placeholder ?? "继续聊，或上传参考…"} className="w-full resize-none outline-none bg-transparent text-[13.5px] leading-snug text-ink placeholder:text-faint" />
          <div className="flex items-center gap-1 mt-1.5">
            <Tooltip label="上传图片参考" side="top"><ComposerTool aria-label="上传图片参考" onClick={() => imgInput.current?.click()}><ImageIcon size={15} /> 图片</ComposerTool></Tooltip>
            <Tooltip label="上传视频参考" side="top"><ComposerTool aria-label="上传视频参考" onClick={() => vidInput.current?.click()}><VideoCamera size={15} /> 视频</ComposerTool></Tooltip>
            <span className="flex-1" />
            <Tooltip label="发送 (Enter)" side="top">
              <button onClick={submit} disabled={!canSend} aria-label="发送" className="w-[31px] h-[31px] rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary2 transition-transform active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-primary"><ArrowUp size={15} weight="bold" /></button>
            </Tooltip>
          </div>
          <input ref={imgInput} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e, "image")} />
          <input ref={vidInput} type="file" accept="video/*" multiple hidden onChange={(e) => addFiles(e, "video")} />
        </div>
      </div>
    </section>
  );
}

function AttachmentChip({ a, onRemove }: { a: ChatAttachment; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-1.5 text-[11.5px] text-ink2 bg-canvas border border-hairline rounded-lg pl-1 pr-1 py-1">
      <AttachmentThumb a={a} />
      <span className="max-w-[120px] truncate">{a.name}</span>
      <button onClick={onRemove} aria-label={`移除 ${a.name}`} className="w-4 h-4 grid place-items-center rounded text-faint hover:text-ink hover:bg-hair2 transition-colors"><X size={11} weight="bold" /></button>
    </span>
  );
}

function AttachmentThumb({ a }: { a: ChatAttachment }) {
  if (a.kind === "image" && a.url) return <img src={a.url} alt="" className="w-6 h-6 rounded object-cover" />;
  return <span className="w-6 h-6 rounded bg-black text-white grid place-items-center"><VideoCamera size={12} weight="fill" /></span>;
}

function ComposerTool({ children, onClick, "aria-label": ariaLabel }: { children: React.ReactNode; onClick?: () => void; "aria-label"?: string }) {
  return <button type="button" onClick={onClick} aria-label={ariaLabel} className="inline-flex items-center gap-1.5 text-[12.5px] text-muted rounded-lg px-2 py-[5px] hover:bg-hair2 hover:text-ink2 transition-colors">{children}</button>;
}

function UserMsg({ children, refs, attachments }: { children: React.ReactNode; refs?: boolean; attachments?: ChatAttachment[] }) {
  return (
    <div className="flex flex-col items-end gap-1.5">
      {children ? <div className="text-[13.5px] leading-relaxed bg-tint border border-tintborder rounded-[14px_14px_4px_14px] px-3 py-2.5 max-w-[92%]">{children}</div> : null}
      {refs && (
        <div className="flex gap-1.5 flex-wrap justify-end">
          <RefChip><img src={img("r1", 40, 40)} alt="" className="w-6 h-6 rounded object-cover" /> 竞品钩子.jpg</RefChip>
          <RefChip><span className="w-6 h-6 rounded bg-black text-white grid place-items-center text-[10px]"><Play size={10} weight="fill" /></span> 旧素材v7.mp4</RefChip>
        </div>
      )}
      {attachments && attachments.length > 0 && (
        <div className="flex gap-1.5 flex-wrap justify-end">
          {attachments.map((a) => <RefChip key={a.id}><AttachmentThumb a={a} /> {a.name}</RefChip>)}
        </div>
      )}
    </div>
  );
}

function RefChip({ children }: { children: React.ReactNode }) {
  return <span className="flex items-center gap-1.5 text-[11.5px] text-ink2 bg-surface border border-hairline rounded-lg pl-1 pr-2 py-1">{children}</span>;
}

function AgentMsg({ children, picks, action, flags, onAction }: { children: React.ReactNode; picks?: ChatPick[]; action?: { id: string; label: string }; flags?: { tone: "warn" | "info"; text: string }[]; onAction?: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[11px] font-semibold text-faint flex items-center gap-1.5"><span className="w-[15px] h-[15px] rounded bg-primary text-white grid place-items-center text-[9px] font-bold">G</span>Gampex</div>
      <div className="text-[13.5px] leading-relaxed text-ink2 whitespace-pre-line">{children}</div>
      {flags && flags.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-1">
          {flags.map((f) => (
            <div key={f.text} className={`flex items-start gap-1.5 text-[12.5px] rounded-lg px-2.5 py-2 border ${f.tone === "warn" ? "bg-modbg border-[#f5e3bf] text-[#92610a]" : "bg-canvas border-hairline text-muted"}`}>
              {f.tone === "warn" ? <Warning size={14} weight="fill" className="mt-[1px] shrink-0" /> : <SealCheck size={14} weight="fill" className="mt-[1px] shrink-0 text-faint" />}
              <span>{f.text}</span>
            </div>
          ))}
        </div>
      )}
      {picks && picks.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mt-0.5">
          {picks.map((p) => (
            <span key={p.id} className="flex items-center gap-1.5 text-[11.5px] text-ink2 bg-surface border border-hairline rounded-lg pl-1 pr-2 py-1">
              <img src={img(p.seed, 40, 71)} alt="" className="w-6 h-9 rounded object-cover" />
              <span className="max-w-[110px] truncate">{p.label}</span>
            </span>
          ))}
        </div>
      )}
      {action && (
        <button onClick={() => onAction?.(action.id)}
          className="self-start mt-1 text-[12.5px] font-semibold rounded-full px-3.5 py-2 bg-primary text-white hover:bg-primary2 active:scale-95 transition inline-flex items-center gap-1.5">
          <Broadcast size={14} weight="fill" /> {action.label}
        </button>
      )}
    </div>
  );
}

import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { aiFillDatabase, aiMakeTasks, aiWrite } from "@/lib/ai.functions";
import { todayISO } from "@/lib/data";
import { cn } from "@/lib/utils";

const msg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

function Panel({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="rounded-2xl border-2 border-ink bg-card p-4 shadow-pop-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 font-bold"><Wand2 className="h-4 w-4 text-primary" /> {title}</span>
        <button onClick={onClose} className="text-sm text-muted-foreground">Close</button>
      </div>
      {children}
    </div>
  );
}

export function AiButton({ onClick, children, busy }: { onClick: () => void; children: React.ReactNode; busy?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="flex items-center gap-1.5 rounded-xl border-2 border-ink bg-grape px-3 py-1.5 text-sm font-bold text-ink shadow-pop-sm disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} {children}
    </button>
  );
}

export function AiTasksPanel({ listId }: { listId: string | null }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const run = useServerFn(aiMakeTasks);
  const qc = useQueryClient();
  if (!open) return <AiButton onClick={() => setOpen(true)}>Make tasks with AI</AiButton>;
  return (
    <Panel title="Turn text into tasks" onClose={() => setOpen(false)}>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. Plan my sister's birthday party next Saturday, or paste meeting notes…"
        className="min-h-28 w-full rounded-xl border-2 border-ink bg-background p-3 outline-none"
      />
      <div className="mt-3 flex justify-end">
        <AiButton
          busy={busy}
          onClick={async () => {
            if (!text.trim()) return;
            setBusy(true);
            try {
              const r = await run({ data: { text, today: todayISO(), listId } });
              await qc.invalidateQueries({ queryKey: ["tasks"] });
              toast.success(r.count ? `Added ${r.count} tasks` : "No tasks found in that text");
              setText("");
              setOpen(false);
            } catch (e) { toast.error(msg(e)); } finally { setBusy(false); }
          }}
        >
          Create tasks
        </AiButton>
      </div>
    </Panel>
  );
}

export function AiFillPanel({ databaseId }: { databaseId: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [count, setCount] = useState(5);
  const [busy, setBusy] = useState(false);
  const run = useServerFn(aiFillDatabase);
  const qc = useQueryClient();
  if (!open) return <AiButton onClick={() => setOpen(true)}>Fill with AI</AiButton>;
  return (
    <div className="w-full">
      <Panel title="Generate rows" onClose={() => setOpen(false)}>
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Content ideas for a cooking blog this month"
          className="w-full rounded-xl border-2 border-ink bg-background px-3 py-2 outline-none"
        />
        <div className="mt-3 flex items-center justify-end gap-3">
          <label className="text-sm">Rows
            <input type="number" min={1} max={25} value={count} onChange={(e) => setCount(Math.min(25, Math.max(1, Number(e.target.value) || 1)))} className="ml-2 w-16 rounded-lg border-2 border-ink bg-background px-2 py-1" />
          </label>
          <AiButton
            busy={busy}
            onClick={async () => {
              if (!text.trim()) return;
              setBusy(true);
              try {
                const r = await run({ data: { databaseId, instruction: text, count } });
                await Promise.all([qc.invalidateQueries({ queryKey: ["db_rows"] }), qc.invalidateQueries({ queryKey: ["db_cells"] })]);
                toast.success(`Added ${r.count} rows`);
                setOpen(false);
                setText("");
              } catch (e) { toast.error(msg(e)); } finally { setBusy(false); }
            }}
          >
            Generate
          </AiButton>
        </div>
      </Panel>
    </div>
  );
}

const MODES = [
  { id: "continue", label: "Continue writing" },
  { id: "summarize", label: "Summarize" },
  { id: "improve", label: "Improve writing" },
] as const;

export function AiWriteBar({ text, onResult }: { text: string; onResult: (out: string, mode: string) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [ask, setAsk] = useState("");
  const run = useServerFn(aiWrite);
  async function go(mode: "continue" | "summarize" | "improve" | "custom") {
    setBusy(mode);
    try {
      const r = await run({ data: { mode, text, instruction: mode === "custom" ? ask : "" } });
      onResult(r.text, mode);
      if (mode === "custom") setAsk("");
    } catch (e) { toast.error(msg(e)); } finally { setBusy(null); }
  }
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border-2 border-dashed border-ink/40 p-2">
      <Wand2 className="ml-1 h-4 w-4 text-primary" />
      {MODES.map((m) => (
        <button key={m.id} disabled={!!busy} onClick={() => go(m.id)} className={cn("flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-semibold hover:bg-accent", busy === m.id && "bg-accent")}>
          {busy === m.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {m.label}
        </button>
      ))}
      <form onSubmit={(e) => { e.preventDefault(); if (ask.trim()) go("custom"); }} className="flex min-w-48 flex-1 items-center gap-1">
        <input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="Ask AI to write anything…" className="flex-1 rounded-lg bg-background px-2.5 py-1 text-sm outline-none" />
        {busy === "custom" && <Loader2 className="h-4 w-4 animate-spin" />}
      </form>
    </div>
  );
}

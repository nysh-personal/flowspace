import { useState } from "react";
import { format, isBefore, parseISO } from "date-fns";
import { Calendar, ChevronRight, Flag, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PRIORITIES, STATUSES, todayISO, useCrud, useLists, useTasks, type Task } from "@/lib/data";
import { cn } from "@/lib/utils";

export function QuickAdd({ defaults = {}, placeholder = "Add a task… press Enter" }: { defaults?: Partial<Task>; placeholder?: string }) {
  const { insert } = useCrud("tasks");
  const [v, setV] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!v.trim()) return;
        insert.mutate({ title: v.trim(), ...defaults });
        setV("");
      }}
      className="flex items-center gap-2 rounded-2xl border-2 border-ink bg-card px-3 py-2 shadow-pop-sm"
    >
      <Plus className="h-5 w-5 text-primary" />
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} className="flex-1 bg-transparent py-1 outline-none" />
    </form>
  );
}

export function Check({ done, onClick, priority = 0 }: { done: boolean; onClick: () => void; priority?: number }) {
  const ring = ["border-ink", "border-sky", "border-sun", "border-coral"][priority] ?? "border-ink";
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={done ? "Mark not done" : "Mark done"}
      className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition", ring, done && "border-ink bg-lime")}
    >
      {done && <span className="text-xs font-bold">✓</span>}
    </button>
  );
}

export function TaskRow({ task, depth = 0 }: { task: Task; depth?: number }) {
  const { data: tasks = [] } = useTasks();
  const { data: lists = [] } = useLists();
  const { update } = useCrud("tasks");
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const kids = tasks.filter((t) => t.parent_id === task.id);
  const done = task.status === "done";
  const list = lists.find((l) => l.id === task.list_id);
  const overdue = task.due_date && !done && isBefore(parseISO(task.due_date), parseISO(todayISO()));
  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="group flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted"
        style={{ paddingLeft: 8 + depth * 24 }}
      >
        {kids.length > 0 ? (
          <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} className="-ml-1">
            <ChevronRight className={cn("h-4 w-4 transition", expanded && "rotate-90")} />
          </button>
        ) : (
          <span className="w-3" />
        )}
        <Check done={done} priority={task.priority} onClick={() => update.mutate({ id: task.id, status: done ? "todo" : "done" })} />
        <span className={cn("flex-1 truncate", done && "text-muted-foreground line-through")}>{task.title}</span>
        {kids.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {kids.filter((k) => k.status === "done").length}/{kids.length}
          </span>
        )}
        {list && depth === 0 && <span className={cn("hidden rounded-full px-2 text-xs font-medium sm:inline", `bg-${list.color}`)}>{list.name}</span>}
        {task.due_date && (
          <span className={cn("text-xs font-medium", overdue ? "text-destructive" : "text-muted-foreground")}>
            {format(parseISO(task.due_date), "MMM d")}
          </span>
        )}
      </div>
      {expanded && kids.map((k) => <TaskRow key={k.id} task={k} depth={depth + 1} />)}
      <TaskDialog task={task} open={open} onOpenChange={setOpen} />
    </>
  );
}

export function TaskDialog({ task, open, onOpenChange }: { task: Task; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: tasks = [] } = useTasks();
  const { data: lists = [] } = useLists();
  const { update, remove } = useCrud("tasks");
  const kids = tasks.filter((t) => t.parent_id === task.id);
  const set = (patch: Partial<Task>) => update.mutate({ id: task.id, ...patch });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl border-2 border-ink shadow-pop">
        <DialogHeader>
          <DialogTitle className="sr-only">Edit task</DialogTitle>
        </DialogHeader>
        <input
          defaultValue={task.title}
          onBlur={(e) => e.target.value !== task.title && set({ title: e.target.value })}
          className="w-full bg-transparent font-display text-2xl font-bold outline-none"
        />
        <div className="flex flex-wrap gap-2 text-sm">
          <label className="flex items-center gap-1.5 rounded-full border-2 border-ink px-3 py-1">
            <Calendar className="h-4 w-4" />
            <input type="date" value={task.due_date ?? ""} onChange={(e) => set({ due_date: e.target.value || null })} className="bg-transparent outline-none" />
          </label>
          <label className="flex items-center gap-1.5 rounded-full border-2 border-ink px-3 py-1">
            <Flag className="h-4 w-4" />
            <select value={task.priority} onChange={(e) => set({ priority: Number(e.target.value) })} className="bg-transparent outline-none">
              {PRIORITIES.map((p) => <option key={p.v} value={p.v}>{p.label}</option>)}
            </select>
          </label>
          <select value={task.status} onChange={(e) => set({ status: e.target.value })} className="rounded-full border-2 border-ink bg-transparent px-3 py-1 outline-none">
            {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          {!task.parent_id && (
            <select value={task.list_id ?? ""} onChange={(e) => set({ list_id: e.target.value || null })} className="rounded-full border-2 border-ink bg-transparent px-3 py-1 outline-none">
              <option value="">Inbox</option>
              {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          )}
        </div>
        <textarea
          defaultValue={task.notes}
          onBlur={(e) => e.target.value !== task.notes && set({ notes: e.target.value })}
          placeholder="Notes…"
          rows={4}
          className="w-full resize-none rounded-xl border-2 border-input bg-background p-3 outline-none focus:border-ink"
        />
        <div>
          <div className="mb-2 text-sm font-semibold">Subtasks</div>
          {kids.map((k) => <SubRow key={k.id} t={k} />)}
          <QuickAdd defaults={{ parent_id: task.id, list_id: task.list_id }} placeholder="Add subtask…" />
        </div>
        <button
          onClick={() => { remove.mutate(task.id); onOpenChange(false); }}
          className="flex items-center gap-1.5 self-start text-sm text-destructive"
        >
          <Trash2 className="h-4 w-4" /> Delete task
        </button>
      </DialogContent>
    </Dialog>
  );
}

function SubRow({ t }: { t: Task }) {
  const { update, remove } = useCrud("tasks");
  const done = t.status === "done";
  return (
    <div className="group flex items-center gap-2 py-1">
      <Check done={done} onClick={() => update.mutate({ id: t.id, status: done ? "todo" : "done" })} />
      <span className={cn("flex-1 text-sm", done && "text-muted-foreground line-through")}>{t.title}</span>
      <button onClick={() => remove.mutate(t.id)} className="opacity-0 group-hover:opacity-100" aria-label="Delete subtask">
        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border-2 border-dashed border-input p-8 text-center text-muted-foreground">{children}</div>;
}

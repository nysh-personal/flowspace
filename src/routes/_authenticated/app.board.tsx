import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { QuickAdd, TaskDialog } from "@/components/tasks";
import { PRIORITIES, STATUSES, useCrud, useTasks, type Task } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/board")({
  component: Board,
});

function Board() {
  const { data: tasks = [] } = useTasks();
  const { update } = useCrud("tasks");
  const [over, setOver] = useState<string | null>(null);
  const top = tasks.filter((t) => !t.parent_id);
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-extrabold md:text-5xl">Board</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {STATUSES.map((s) => {
          const col = top.filter((t) => t.status === s.id);
          return (
            <div
              key={s.id}
              onDragOver={(e) => { e.preventDefault(); setOver(s.id); }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => {
                const id = e.dataTransfer.getData("text/plain");
                setOver(null);
                if (id) update.mutate({ id, status: s.id });
              }}
              className={cn("flex min-h-64 flex-col gap-2 rounded-3xl border-2 border-ink bg-card p-3 transition", over === s.id && "-translate-y-1 shadow-pop")}
            >
              <div className="flex items-center gap-2 px-1">
                <span className={cn("h-3 w-3 rounded-full border-2 border-ink", s.color)} />
                <span className="font-display font-bold">{s.label}</span>
                <span className="ml-auto text-sm text-muted-foreground">{col.length}</span>
              </div>
              {col.map((t) => <Card key={t.id} t={t} />)}
              <QuickAdd defaults={{ status: s.id }} placeholder="Add card…" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Card({ t }: { t: Task }) {
  const [open, setOpen] = useState(false);
  const p = PRIORITIES[t.priority];
  return (
    <>
      <div
        draggable
        onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
        onClick={() => setOpen(true)}
        className="cursor-grab rounded-2xl border-2 border-ink bg-background p-3 shadow-pop-sm active:cursor-grabbing"
      >
        <div className={cn("font-medium", t.status === "done" && "line-through opacity-60")}>{t.title}</div>
        <div className="mt-2 flex gap-2 text-xs">
          {t.priority > 0 && <span className={cn("rounded-full px-2 py-0.5 font-semibold", p.color)}>{p.label}</span>}
          {t.due_date && <span className="rounded-full bg-muted px-2 py-0.5">{format(parseISO(t.due_date), "MMM d")}</span>}
        </div>
      </div>
      <TaskDialog task={t} open={open} onOpenChange={setOpen} />
    </>
  );
}

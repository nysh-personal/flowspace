import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { EmptyNote, QuickAdd, TaskRow } from "@/components/tasks";
import { useCrud, useLists, useTasks } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/tasks")({
  validateSearch: (s: Record<string, unknown>) => ({ list: typeof s["list"] === "string" ? s["list"] : undefined }),
  component: Tasks,
});

function Tasks() {
  const { list } = Route.useSearch();
  const navigate = useNavigate();
  const { data: tasks = [] } = useTasks();
  const { data: lists = [] } = useLists();
  const { remove } = useCrud("lists");
  const [showDone, setShowDone] = useState(false);
  const current = lists.find((l) => l.id === list);
  const top = tasks.filter((t) => !t.parent_id && (!list || t.list_id === list));
  const open = top.filter((t) => t.status !== "done").sort((a, b) => b.priority - a.priority);
  const done = top.filter((t) => t.status === "done");

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <h1 className="flex items-center gap-3 text-4xl font-extrabold md:text-5xl">
          {current && <span className={cn("h-6 w-6 rounded-full border-2 border-ink", `bg-${current.color}`)} />}
          {current?.name ?? "All tasks"}
        </h1>
        {current && (
          <button
            onClick={() => { remove.mutate(current.id); navigate({ to: "/app/tasks", search: { list: undefined } }); }}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" /> Delete list
          </button>
        )}
      </div>
      <QuickAdd defaults={list ? { list_id: list } : {}} />
      <section>
        {open.length ? open.map((t) => <TaskRow key={t.id} task={t} />) : <EmptyNote>All clear. Add something above.</EmptyNote>}
      </section>
      {done.length > 0 && (
        <section>
          <button onClick={() => setShowDone(!showDone)} className="mb-2 text-sm font-semibold text-muted-foreground">
            {showDone ? "Hide" : "Show"} completed ({done.length})
          </button>
          {showDone && done.map((t) => <TaskRow key={t.id} task={t} />)}
        </section>
      )}
    </div>
  );
}

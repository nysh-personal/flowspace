import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { QuickAdd, TaskRow } from "@/components/tasks";
import { todayISO, useTasks } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/calendar")({
  component: CalendarView,
});

function CalendarView() {
  const { data: tasks = [] } = useTasks();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [sel, setSel] = useState(todayISO());
  const days = eachDayOfInterval({ start: startOfWeek(month), end: endOfWeek(endOfMonth(month)) });
  const top = tasks.filter((t) => !t.parent_id && t.due_date);
  const today = todayISO();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-extrabold md:text-5xl">{format(month, "MMMM yyyy")}</h1>
        <div className="flex gap-2">
          <button onClick={() => setMonth(addMonths(month, -1))} className="rounded-full border-2 border-ink bg-card p-2 shadow-pop-sm" aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => setMonth(addMonths(month, 1))} className="rounded-full border-2 border-ink bg-card p-2 shadow-pop-sm" aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="overflow-hidden rounded-3xl border-2 border-ink bg-card shadow-pop">
        <div className="grid grid-cols-7 border-b-2 border-ink bg-sun text-center text-xs font-bold uppercase">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d) => {
            const iso = todayISO(d);
            const items = top.filter((t) => t.due_date === iso);
            return (
              <button
                key={iso}
                onClick={() => setSel(iso)}
                className={cn("min-h-16 border-b border-r p-1.5 text-left align-top md:min-h-24", !isSameMonth(d, month) && "opacity-40", sel === iso && "bg-accent")}
              >
                <span className={cn("inline-grid h-6 w-6 place-items-center rounded-full text-xs font-bold", iso === today && "bg-primary text-primary-foreground")}>{format(d, "d")}</span>
                <div className="mt-1 space-y-0.5">
                  {items.slice(0, 3).map((t) => (
                    <div key={t.id} className={cn("truncate rounded px-1 text-[10px] md:text-xs", t.status === "done" ? "bg-muted line-through" : "bg-sky")}>{t.title}</div>
                  ))}
                  {items.length > 3 && <div className="text-[10px] text-muted-foreground">+{items.length - 3}</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">{format(new Date(sel + "T00:00"), "EEEE, MMM d")}</h2>
        <QuickAdd key={sel} defaults={{ due_date: sel }} />
        {top.filter((t) => t.due_date === sel).map((t) => <TaskRow key={t.id} task={t} />)}
      </section>
    </div>
  );
}

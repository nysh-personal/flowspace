import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format, subDays } from "date-fns";
import { Flame, Plus, Trash2 } from "lucide-react";
import { EmptyNote } from "@/components/tasks";
import { todayISO, useCrud, useHabitLogs, useHabits, type HabitLog } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/habits")({
  component: Habits,
});

export function streak(logs: HabitLog[], habitId: string, today = todayISO()) {
  const days = new Set(logs.filter((l) => l.habit_id === habitId).map((l) => l.day));
  let n = 0;
  let d = new Date(today + "T00:00");
  if (!days.has(today)) d = subDays(d, 1);
  while (days.has(todayISO(d))) { n++; d = subDays(d, 1); }
  return n;
}

function Habits() {
  const { data: habits = [] } = useHabits();
  const { data: logs = [] } = useHabitLogs();
  const habitCrud = useCrud("habits");
  const logCrud = useCrud("habit_logs");
  const [name, setName] = useState("");
  const week = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));

  function toggle(habit_id: string, day: string) {
    const ex = logs.find((l) => l.habit_id === habit_id && l.day === day);
    if (ex) logCrud.remove.mutate(ex.id);
    else logCrud.insert.mutate({ habit_id, day });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-extrabold md:text-5xl">Habits</h1>
      <form
        onSubmit={(e) => { e.preventDefault(); if (name.trim()) habitCrud.insert.mutate({ name: name.trim() }); setName(""); }}
        className="flex items-center gap-2 rounded-2xl border-2 border-ink bg-card px-3 py-2 shadow-pop-sm"
      >
        <Plus className="h-5 w-5 text-primary" />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New habit, e.g. Read 20 minutes" className="flex-1 bg-transparent py-1 outline-none" />
      </form>
      {habits.length === 0 && <EmptyNote>Start a habit and build your streak 🔥</EmptyNote>}
      <div className="space-y-3">
        {habits.map((h) => (
          <div key={h.id} className="group rounded-3xl border-2 border-ink bg-card p-4 shadow-pop-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="font-display text-lg font-bold">{h.name}</span>
              <span className="ml-auto flex items-center gap-1 rounded-full bg-coral px-2.5 py-0.5 text-sm font-bold text-primary-foreground">
                <Flame className="h-4 w-4" /> {streak(logs, h.id)}
              </span>
              <button onClick={() => habitCrud.remove.mutate(h.id)} className="opacity-0 group-hover:opacity-100" aria-label="Delete habit">
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {week.map((d) => {
                const iso = todayISO(d);
                const on = logs.some((l) => l.habit_id === h.id && l.day === iso);
                return (
                  <button key={iso} onClick={() => toggle(h.id, iso)} className={cn("rounded-xl border-2 py-2 text-center text-xs font-semibold transition", on ? "border-ink bg-lime" : "border-input hover:border-ink")}>
                    <div>{format(d, "EEE")}</div>
                    <div className="text-base">{format(d, "d")}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

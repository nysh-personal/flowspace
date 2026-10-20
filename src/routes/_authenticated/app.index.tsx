import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { EmptyNote, QuickAdd, TaskRow } from "@/components/tasks";
import { todayISO, useHabitLogs, useHabits, useTasks } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Today,
});

function Today() {
  const { data: tasks = [] } = useTasks();
  const { data: habits = [] } = useHabits();
  const { data: logs = [] } = useHabitLogs();
  const today = todayISO();
  const top = tasks.filter((t) => !t.parent_id);
  const overdue = top.filter((t) => t.due_date && t.due_date < today && t.status !== "done");
  const due = top.filter((t) => t.due_date === today);
  const doneToday = due.filter((t) => t.status === "done").length;
  const habitsDone = habits.filter((h) => logs.some((l) => l.habit_id === h.id && l.day === today)).length;

  return (
    <div className="space-y-8">
      <div>
        <p className="font-semibold text-primary">{format(new Date(), "EEEE, MMMM d")}</p>
        <h1 className="text-4xl font-extrabold md:text-5xl">Today</h1>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Due today" value={`${doneToday}/${due.length}`} c="bg-sky" />
        <Stat label="Overdue" value={overdue.length} c="bg-coral" />
        <Stat label="Habits" value={`${habitsDone}/${habits.length}`} c="bg-lime" />
      </div>
      <QuickAdd defaults={{ due_date: today }} placeholder="Add a task for today…" />
      {overdue.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-bold text-destructive">Overdue</h2>
          {overdue.map((t) => <TaskRow key={t.id} task={t} />)}
        </section>
      )}
      <section>
        <h2 className="mb-2 text-lg font-bold">Due today</h2>
        {due.length ? due.map((t) => <TaskRow key={t.id} task={t} />) : <EmptyNote>Nothing due today. Enjoy it ✨</EmptyNote>}
      </section>
    </div>
  );
}

function Stat({ label, value, c }: { label: string; value: string | number; c: string }) {
  return (
    <div className={`rounded-2xl border-2 border-ink p-4 shadow-pop-sm ${c}`}>
      <div className="font-display text-3xl font-extrabold">{value}</div>
      <div className="text-sm font-medium">{label}</div>
    </div>
  );
}

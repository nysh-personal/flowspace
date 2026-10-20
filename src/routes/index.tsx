import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, CheckCircle2, FileText, Flame, KanbanSquare } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flowspace — notes, tasks, boards & habits" },
      { name: "description", content: "One colorful workspace for pages, to-dos, kanban boards, calendar and habits." },
      { property: "og:title", content: "Flowspace — notes, tasks, boards & habits" },
      { property: "og:description", content: "One colorful workspace for pages, to-dos, kanban boards, calendar and habits." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: FileText, title: "Pages", text: "Nested docs for notes, wikis and ideas.", c: "bg-sky" },
  { icon: CheckCircle2, title: "Tasks", text: "Lists, priorities, due dates and subtasks.", c: "bg-coral" },
  { icon: KanbanSquare, title: "Boards", text: "Drag work from To do to Done.", c: "bg-lime" },
  { icon: CalendarDays, title: "Calendar", text: "See every deadline on a month grid.", c: "bg-sun" },
  { icon: Flame, title: "Habits", text: "Build streaks, one tick a day.", c: "bg-grape" },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2 font-display text-xl font-extrabold">
          <span className="grid h-8 w-8 place-items-center rounded-lg border-2 border-ink bg-lime shadow-pop-sm">F</span>
          Flowspace
        </div>
        <Link to="/auth" className="rounded-full border-2 border-ink bg-card px-4 py-1.5 text-sm font-semibold shadow-pop-sm">
          Sign in
        </Link>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-10 md:pt-20">
        <h1 className="max-w-4xl font-display text-5xl font-extrabold leading-[0.95] md:text-8xl">
          Your notes, <span className="rounded-2xl bg-coral px-3 text-primary-foreground">to-dos</span> and{" "}
          <span className="rounded-2xl bg-lime px-3">habits</span>. One loud, happy place.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Write like Notion, plan like TickTick, organize like Taskade — without juggling three apps.
        </p>
        <Link
          to="/auth"
          className="mt-8 inline-flex rounded-full border-2 border-ink bg-primary px-7 py-3 text-lg font-bold text-primary-foreground shadow-pop transition-transform hover:-translate-y-0.5"
        >
          Start free →
        </Link>
        <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border-2 border-ink bg-card p-5 shadow-pop">
              <div className={`mb-4 grid h-11 w-11 place-items-center rounded-xl border-2 border-ink ${f.c}`}>
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

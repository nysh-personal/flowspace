import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarDays, CheckSquare, FileText, Flame, Inbox, KanbanSquare, LogOut, Menu, Plus, Sun, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LIST_COLORS, useCrud, useDatabases, useLists, usePages, type Page } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({ meta: [{ title: "Workspace — Flowspace" }, { name: "robots", content: "noindex" }] }),
  component: AppLayout,
});

const nav = [
  { to: "/app", label: "Today", icon: Sun, exact: true },
  { to: "/app/tasks", label: "All tasks", icon: Inbox },
  { to: "/app/board", label: "Board", icon: KanbanSquare },
  { to: "/app/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/app/habits", label: "Habits", icon: Flame },
] as const;

function AppLayout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 -translate-x-full overflow-y-auto bg-sidebar p-4 text-sidebar-foreground transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0",
          open && "translate-x-0",
        )}
      >
        <Sidebar onNavigate={() => setOpen(false)} />
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-ink/40 md:hidden" onClick={() => setOpen(false)} />}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3 border-b px-4 py-3 md:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></button>
          <span className="font-display font-extrabold">Flowspace</span>
        </div>
        <main className="mx-auto max-w-5xl px-4 py-6 md:px-10 md:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate: () => void }) {
  const { data: lists = [] } = useLists();
  const { data: pages = [] } = usePages();
  const listCrud = useCrud("lists");
  const pageCrud = useCrud("pages");
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [newList, setNewList] = useState<string | null>(null);
  const { data: databases = [] } = useDatabases();
  const dbCrud = useCrud("databases");
  const fieldCrud = useCrud("db_fields");
  const colors = Object.keys(LIST_COLORS);

  async function addPage(parent_id: string | null = null) {
    const p = await pageCrud.insert.mutateAsync({ parent_id });
    onNavigate();
    navigate({ to: "/app/pages/$id", params: { id: p.id } });
  }
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  async function addDatabase() {
    const d = await dbCrud.insert.mutateAsync({ title: "Untitled database" });
    await Promise.all([
      fieldCrud.insert.mutateAsync({ database_id: d.id, name: "Name", type: "text" }),
      fieldCrud.insert.mutateAsync({
        database_id: d.id,
        name: "Status",
        type: "select",
        options: [
          { name: "To do", color: "sky" },
          { name: "In progress", color: "sun" },
          { name: "Done", color: "lime" },
        ],
      }),
      fieldCrud.insert.mutateAsync({ database_id: d.id, name: "Date", type: "date" }),
      fieldCrud.insert.mutateAsync({ database_id: d.id, name: "Done", type: "checkbox" }),
    ]);
    onNavigate();
    navigate({ to: "/app/db/$id", params: { id: d.id } });
  }

  const linkCls = "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm hover:bg-sidebar-accent";
  const activeCls = "bg-sidebar-primary text-sidebar-primary-foreground font-semibold hover:bg-sidebar-primary";

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-display text-lg font-extrabold">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-lime text-ink">F</span>
          Flowspace
        </div>
        <button className="md:hidden" onClick={onNavigate} aria-label="Close menu"><X className="h-5 w-5" /></button>
      </div>
      <nav className="space-y-0.5">
        {nav.map((n) => (
          <Link key={n.to} to={n.to} onClick={onNavigate} activeOptions={{ exact: "exact" in n }} className={linkCls} activeProps={{ className: activeCls }}>
            <n.icon className="h-4 w-4" /> {n.label}
          </Link>
        ))}
      </nav>

      <section>
        <div className="mb-1 flex items-center justify-between px-2.5 text-xs font-semibold uppercase tracking-wider opacity-60">
          Lists
          <button onClick={() => setNewList("")} aria-label="New list"><Plus className="h-4 w-4" /></button>
        </div>
        {lists.map((l) => (
          <Link key={l.id} to="/app/tasks" search={{ list: l.id }} onClick={onNavigate} className={linkCls}>
            <span className={cn("h-3 w-3 rounded-full", LIST_COLORS[l.color])} /> <span className="truncate">{l.name}</span>
          </Link>
        ))}
        {newList !== null && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newList.trim()) listCrud.insert.mutate({ name: newList.trim(), color: colors[lists.length % colors.length] });
              setNewList(null);
            }}
          >
            <input autoFocus value={newList} onBlur={() => setNewList(null)} onChange={(e) => setNewList(e.target.value)} placeholder="List name" className="mt-1 w-full rounded-lg bg-sidebar-accent px-2.5 py-1.5 text-sm outline-none" />
          </form>
        )}
      </section>

      <section className="flex-1">
        <div className="mb-1 flex items-center justify-between px-2.5 text-xs font-semibold uppercase tracking-wider opacity-60">
          Pages
          <button onClick={() => addPage()} aria-label="New page"><Plus className="h-4 w-4" /></button>
        </div>
        <PageTree pages={pages} parent={null} depth={0} onNavigate={onNavigate} linkCls={linkCls} activeCls={activeCls} />
        {pages.length === 0 && (
          <button onClick={() => addPage()} className={cn(linkCls, "w-full opacity-60")}>
            <FileText className="h-4 w-4" /> New page
          </button>
        )}
      </section>

      <section>
        <div className="mb-1 flex items-center justify-between px-2.5 text-xs font-semibold uppercase tracking-wider opacity-60">
          Databases
          <button onClick={addDatabase} aria-label="New database"><Plus className="h-4 w-4" /></button>
        </div>
        {databases.map((d) => (
          <Link key={d.id} to="/app/db/$id" params={{ id: d.id }} onClick={onNavigate} className={linkCls} activeProps={{ className: activeCls }}>
            <span>{d.icon}</span> <span className="truncate">{d.title}</span>
          </Link>
        ))}
        {databases.length === 0 && (
          <button onClick={addDatabase} className={cn(linkCls, "w-full opacity-60")}>
            🗂️ New database
          </button>
        )}
      </section>

      <button onClick={signOut} className={linkCls}>
        <LogOut className="h-4 w-4" /> Sign out
      </button>
      <CheckSquare className="hidden" />
    </div>
  );
}

function PageTree({ pages, parent, depth, onNavigate, linkCls, activeCls }: { pages: Page[]; parent: string | null; depth: number; onNavigate: () => void; linkCls: string; activeCls: string }) {
  return (
    <>
      {pages
        .filter((p) => p.parent_id === parent)
        .map((p) => (
          <div key={p.id}>
            <Link to="/app/pages/$id" params={{ id: p.id }} onClick={onNavigate} className={linkCls} activeProps={{ className: activeCls }} style={{ paddingLeft: 10 + depth * 14 }}>
              <span>{p.icon}</span> <span className="truncate">{p.title || "Untitled"}</span>
            </Link>
            <PageTree pages={pages} parent={p.id} depth={depth + 1} onNavigate={onNavigate} linkCls={linkCls} activeCls={activeCls} />
          </div>
        ))}
    </>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { FilePlus, Trash2 } from "lucide-react";
import { useCrud, usePages } from "@/lib/data";
import { AiWriteBar } from "@/components/ai";

export const Route = createFileRoute("/_authenticated/app/pages/$id")({
  component: PageEditor,
});

const ICONS = ["📄", "📝", "💡", "📚", "🎯", "🚀", "🌈", "🍕", "🎨", "🧠", "🌱", "⭐"];

function PageEditor() {
  const { id } = Route.useParams();
  const { data: pages = [], isLoading } = usePages();
  const { update, insert, remove } = useCrud("pages");
  const navigate = useNavigate();
  const page = pages.find((p) => p.id === id);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (page) { setContent(page.content); setTitle(page.title); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page?.id]);

  function save(patch: { title?: string; content?: string }) {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => update.mutate({ id, ...patch, updated_at: new Date().toISOString() }), 500);
  }

  if (isLoading) return null;
  if (!page) return <p className="text-muted-foreground">Page not found.</p>;
  const children = pages.filter((p) => p.parent_id === id);

  return (
    <article className="mx-auto max-w-3xl">
      <div className="mb-2 flex flex-wrap gap-1">
        {ICONS.map((i) => (
          <button key={i} onClick={() => update.mutate({ id, icon: i })} className={`rounded-lg p-1 text-lg ${page.icon === i ? "bg-accent" : "opacity-50 hover:opacity-100"}`}>{i}</button>
        ))}
      </div>
      <div className="text-6xl">{page.icon}</div>
      <input
        value={title}
        onChange={(e) => { setTitle(e.target.value); save({ title: e.target.value }); }}
        placeholder="Untitled"
        className="mt-2 w-full bg-transparent font-display text-4xl font-extrabold outline-none md:text-5xl"
      />
      <AiWriteBar
        text={content}
        onResult={(out, mode) => {
          const next = mode === "improve" ? out : mode === "summarize" ? `${content}\n\nSummary:\n${out}` : `${content}${content ? "\n\n" : ""}${out}`;
          setContent(next);
          save({ content: next });
        }}
      />
      <textarea
        value={content}
        onChange={(e) => { setContent(e.target.value); save({ content: e.target.value }); }}
        placeholder="Start writing… your notes save automatically."
        className="mt-6 min-h-[50vh] w-full resize-none bg-transparent text-lg leading-relaxed outline-none"
      />
      <div className="mt-8 border-t-2 border-dashed pt-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold">Sub-pages</h3>
          <div className="flex gap-3 text-sm">
            <button
              onClick={async () => { const p = await insert.mutateAsync({ parent_id: id }); navigate({ to: "/app/pages/$id", params: { id: p.id } }); }}
              className="flex items-center gap-1 font-semibold text-primary"
            >
              <FilePlus className="h-4 w-4" /> Add sub-page
            </button>
            <button
              onClick={() => { remove.mutate(id); navigate({ to: page.parent_id ? "/app/pages/$id" : "/app", params: { id: page.parent_id ?? "" } }); }}
              className="flex items-center gap-1 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" /> Delete page
            </button>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {children.map((c) => (
            <Link key={c.id} to="/app/pages/$id" params={{ id: c.id }} className="flex items-center gap-2 rounded-2xl border-2 border-ink bg-card p-3 shadow-pop-sm">
              <span className="text-xl">{c.icon}</span> <span className="truncate font-medium">{c.title || "Untitled"}</span>
            </Link>
          ))}
        </div>
      </div>
    </article>
  );
}

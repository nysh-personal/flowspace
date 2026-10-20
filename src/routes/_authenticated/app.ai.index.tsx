import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MessageCircle, Plus } from "lucide-react";
import { useAiThreads, useCrud } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/app/ai/")({
  head: () => ({ meta: [{ title: "Ask Flo — Flowspace" }, { name: "robots", content: "noindex" }] }),
  component: AiHome,
});

function AiHome() {
  const { data: threads = [] } = useAiThreads();
  const { insert } = useCrud("ai_threads");
  const navigate = useNavigate();
  const sorted = [...threads].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-4xl font-extrabold md:text-5xl">Ask Flo</h1>
        <button
          onClick={async () => { const t = await insert.mutateAsync({}); navigate({ to: "/app/ai/$threadId", params: { threadId: t.id } }); }}
          className="flex items-center gap-1.5 rounded-xl border-2 border-ink bg-lime px-3 py-2 font-bold text-ink shadow-pop-sm"
        >
          <Plus className="h-4 w-4" /> New chat
        </button>
      </div>
      <p className="text-muted-foreground">Your AI assistant knows your tasks, pages and habits. Ask it to plan your day, find a note, or brainstorm.</p>
      <div className="grid gap-2">
        {sorted.map((t) => (
          <Link key={t.id} to="/app/ai/$threadId" params={{ threadId: t.id }} className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-card p-3 shadow-pop-sm">
            <MessageCircle className="h-4 w-4 text-primary" /> <span className="truncate font-medium">{t.title}</span>
          </Link>
        ))}
        {sorted.length === 0 && <p className="text-sm text-muted-foreground">No chats yet.</p>}
      </div>
    </div>
  );
}

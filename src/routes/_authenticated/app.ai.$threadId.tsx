import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowUp, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { aiChat } from "@/lib/ai.functions";
import { todayISO, useAiMessages, useAiThreads, useCrud } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/ai/$threadId")({
  head: () => ({ meta: [{ title: "Chat — Flowspace" }, { name: "robots", content: "noindex" }] }),
  component: ChatPage,
});

function ChatPage() {
  const { threadId } = Route.useParams();
  return <Chat key={threadId} threadId={threadId} />;
}

function Chat({ threadId }: { threadId: string }) {
  const { data: threads = [], isLoading } = useAiThreads();
  const { data: all = [] } = useAiMessages();
  const { remove } = useCrud("ai_threads");
  const send = useServerFn(aiChat);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const thread = threads.find((t) => t.id === threadId);
  const messages = all.filter((m) => m.thread_id === threadId);

  useEffect(() => { inputRef.current?.focus(); }, [pending]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length, pending]);

  async function submit() {
    const m = text.trim();
    if (!m || pending) return;
    setText("");
    setPending(m);
    try {
      await send({ data: { threadId, message: m, today: todayISO() } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      await Promise.all([qc.invalidateQueries({ queryKey: ["ai_messages"] }), qc.invalidateQueries({ queryKey: ["ai_threads"] })]);
      setPending(null);
    }
  }

  if (isLoading) return null;
  if (!thread) return <p className="text-muted-foreground">Chat not found.</p>;

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link to="/app/ai" className="flex items-center gap-1 text-sm font-semibold text-muted-foreground"><ArrowLeft className="h-4 w-4" /> All chats</Link>
        <button onClick={() => { remove.mutate(threadId); navigate({ to: "/app/ai" }); }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      </div>
      <h1 className="mb-6 truncate text-2xl font-extrabold">{thread.title}</h1>
      <div className="flex-1 space-y-4">
        {messages.length === 0 && !pending && (
          <p className="text-muted-foreground">Try: "What should I focus on today?" or "Summarize my notes about the trip".</p>
        )}
        {messages.map((m) => <Bubble key={m.id} role={m.role} content={m.content} />)}
        {pending && (
          <>
            <Bubble role="user" content={pending} />
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Flo is thinking…</div>
          </>
        )}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        className="sticky bottom-4 mt-6 flex items-end gap-2 rounded-2xl border-2 border-ink bg-card p-2 shadow-pop-sm"
      >
        <textarea
          ref={inputRef}
          value={text}
          rows={1}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder="Message Flo…"
          className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 outline-none"
        />
        <button type="submit" disabled={!!pending || !text.trim()} aria-label="Send" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink text-background disabled:opacity-40">
          <ArrowUp className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

function Bubble({ role, content }: { role: string; content: string }) {
  const user = role === "user";
  return (
    <div className={cn("flex", user && "justify-end")}>
      <div className={cn("max-w-[85%] whitespace-pre-wrap leading-relaxed", user ? "rounded-2xl border-2 border-ink bg-lime px-4 py-2 text-ink" : "")}>
        {!user && <div className="mb-1 text-xs font-bold uppercase tracking-wider text-primary">Flo</div>}
        {content}
      </div>
    </div>
  );
}

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AiError, extractJson, minimaxChat, type ChatMsg } from "./minimax.server";

function fail(e: unknown): never {
  if (e instanceof AiError) throw new Error(e.message);
  throw e;
}

/* ---------- Writing help ---------- */
const WRITE_PROMPTS: Record<string, string> = {
  continue: "Continue the text naturally for one or two more paragraphs. Return only the new text.",
  summarize: "Summarize the text into a short list of key points. Return only the summary.",
  improve: "Rewrite the text to be clearer and better written, keeping the meaning. Return only the rewritten text.",
  custom: "Follow the user's instruction about the text. Return only the resulting text.",
};

export const aiWrite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ mode: z.enum(["continue", "summarize", "improve", "custom"]), text: z.string().max(20000), instruction: z.string().max(1000).default("") }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const out = await minimaxChat([
        { role: "system", content: `You are a writing assistant inside a notes app. ${WRITE_PROMPTS[data.mode]} Use plain text, no markdown headings.` },
        { role: "user", content: `${data.instruction ? `Instruction: ${data.instruction}\n\n` : ""}Text:\n${data.text || "(empty page)"}` },
      ]);
      return { text: out };
    } catch (e) { fail(e); }
  });

/* ---------- Text -> tasks ---------- */
export const aiMakeTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ text: z.string().min(1).max(8000), today: z.string(), listId: z.string().uuid().nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    try {
      const raw = await minimaxChat([
        {
          role: "system",
          content: `Turn the user's notes or goal into concrete, actionable tasks. Today is ${data.today}. Reply ONLY with a JSON array like [{"title":"...","due_date":"YYYY-MM-DD or null","priority":0-3}]. Priority: 0 none, 1 low, 2 medium, 3 high. At most 20 tasks.`,
        },
        { role: "user", content: data.text },
      ]);
      const items = extractJson<{ title?: string; due_date?: string | null; priority?: number }[]>(raw);
      const rows = (Array.isArray(items) ? items : [])
        .filter((t) => t.title?.trim())
        .slice(0, 20)
        .map((t, i) => ({
          user_id: context.userId,
          list_id: data.listId,
          title: t.title!.trim().slice(0, 300),
          due_date: t.due_date && /^\d{4}-\d{2}-\d{2}$/.test(t.due_date) ? t.due_date : null,
          priority: Math.min(3, Math.max(0, Math.round(Number(t.priority) || 0))),
          position: Date.now() / 1000 + i,
        }));
      if (!rows.length) return { count: 0 };
      const { error } = await context.supabase.from("tasks").insert(rows);
      if (error) throw error;
      return { count: rows.length };
    } catch (e) { fail(e); }
  });

/* ---------- Fill a database ---------- */
type Opt = { name: string; color: string };
export const aiFillDatabase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ databaseId: z.string().uuid(), instruction: z.string().min(1).max(2000), count: z.number().int().min(1).max(25) }).parse(d))
  .handler(async ({ data, context }) => {
    try {
      const sb = context.supabase;
      const { data: db } = await sb.from("databases").select("id,title").eq("id", data.databaseId).maybeSingle();
      if (!db) throw new AiError("Database not found.");
      const { data: fields = [] } = await sb.from("db_fields").select("*").eq("database_id", db.id).order("position");
      const schema = (fields ?? []).map((f) => {
        const opts = Array.isArray(f.options) ? (f.options as Opt[]).map((o) => o.name) : [];
        const hint = f.type === "select" ? `one of ${JSON.stringify(opts)}` : f.type === "checkbox" ? "true/false" : f.type === "date" ? "YYYY-MM-DD" : f.type;
        return `"${f.name}": ${hint}`;
      });
      const raw = await minimaxChat([
        {
          role: "system",
          content: `You generate rows for a table called "${db.title}". Columns: {${schema.join(", ")}}. Today is ${new Date().toISOString().slice(0, 10)}. Reply ONLY with a JSON array of ${data.count} objects using exactly those column names.`,
        },
        { role: "user", content: data.instruction },
      ]);
      const items = extractJson<Record<string, unknown>[]>(raw);
      const list = (Array.isArray(items) ? items : []).slice(0, data.count);
      let n = 0;
      for (const [i, item] of list.entries()) {
        const { data: row, error } = await sb.from("db_rows").insert({ user_id: context.userId, database_id: db.id, position: Date.now() + i }).select("id").single();
        if (error) throw error;
        const cells = (fields ?? []).flatMap((f) => {
          let v = item[f.name];
          if (v == null || v === "") return [];
          if (f.type === "number") v = Number(v);
          else if (f.type === "checkbox") v = v === true || v === "true";
          else if (f.type === "select") {
            const names = Array.isArray(f.options) ? (f.options as Opt[]).map((o) => o.name) : [];
            if (!names.includes(String(v))) return [];
            v = String(v);
          } else v = String(v);
          return [{ user_id: context.userId, row_id: row.id, field_id: f.id, value: v as never }];
        });
        if (cells.length) {
          const { error: ce } = await sb.from("db_cells").insert(cells);
          if (ce) throw ce;
        }
        n++;
      }
      return { count: n };
    } catch (e) { fail(e); }
  });

/* ---------- Chat assistant ---------- */
export const aiChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ threadId: z.string().uuid(), message: z.string().min(1).max(8000), today: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    try {
      const sb = context.supabase;
      const { data: thread } = await sb.from("ai_threads").select("id,title").eq("id", data.threadId).maybeSingle();
      if (!thread) throw new AiError("Conversation not found.");

      const { error: ue } = await sb.from("ai_messages").insert({ user_id: context.userId, thread_id: thread.id, role: "user", content: data.message });
      if (ue) throw ue;

      const [{ data: history }, { data: tasks }, { data: pages }, { data: habits }] = await Promise.all([
        sb.from("ai_messages").select("role,content").eq("thread_id", thread.id).order("created_at", { ascending: false }).limit(30),
        sb.from("tasks").select("title,due_date,priority,status").neq("status", "done").limit(80),
        sb.from("pages").select("title,content").order("updated_at", { ascending: false }).limit(20),
        sb.from("habits").select("name").limit(30),
      ]);
      const ctx = [
        `Today is ${data.today}.`,
        `Open tasks:\n${(tasks ?? []).map((t) => `- ${t.title}${t.due_date ? ` (due ${t.due_date})` : ""}${t.priority ? ` [priority ${t.priority}]` : ""} {${t.status}}`).join("\n") || "none"}`,
        `Pages:\n${(pages ?? []).map((p) => `- ${p.title}: ${p.content.slice(0, 300).replace(/\s+/g, " ")}`).join("\n") || "none"}`,
        `Habits: ${(habits ?? []).map((h) => h.name).join(", ") || "none"}`,
      ].join("\n\n");

      const msgs: ChatMsg[] = [
        { role: "system", content: `You are Flo, a friendly productivity assistant inside Flowspace (tasks, notes, habits). Be concise and practical. Reply in plain text without markdown symbols like ** or #. Use the user's workspace data below when relevant.\n\n${ctx}` },
        ...(history ?? []).reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      ];
      const reply = await minimaxChat(msgs);

      const { error: ae } = await sb.from("ai_messages").insert({ user_id: context.userId, thread_id: thread.id, role: "assistant", content: reply || "…" });
      if (ae) throw ae;
      const patch: { updated_at: string; title?: string } = { updated_at: new Date().toISOString() };
      if (thread.title === "New chat") patch.title = data.message.slice(0, 50);
      await sb.from("ai_threads").update(patch).eq("id", thread.id);
      return { ok: true };
    } catch (e) { fail(e); }
  });

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type List = Database["public"]["Tables"]["lists"]["Row"];
export type Page = Database["public"]["Tables"]["pages"]["Row"];
export type Habit = Database["public"]["Tables"]["habits"]["Row"];
export type HabitLog = Database["public"]["Tables"]["habit_logs"]["Row"];

export const STATUSES = [
  { id: "todo", label: "To do", color: "bg-sky" },
  { id: "doing", label: "In progress", color: "bg-sun" },
  { id: "done", label: "Done", color: "bg-lime" },
] as const;

export const PRIORITIES = [
  { v: 0, label: "None", color: "bg-muted" },
  { v: 1, label: "Low", color: "bg-sky" },
  { v: 2, label: "Medium", color: "bg-sun" },
  { v: 3, label: "High", color: "bg-coral" },
];

export const LIST_COLORS: Record<string, string> = {
  coral: "bg-coral",
  lime: "bg-lime",
  sky: "bg-sky",
  sun: "bg-sun",
  grape: "bg-grape",
  mint: "bg-mint",
};

function must<T>(r: { data: T | null; error: unknown }): T {
  if (r.error) throw r.error;
  return r.data as T;
}

function useTable<T>(table: "tasks" | "lists" | "pages" | "habits" | "habit_logs", order = "created_at") {
  return useQuery({
    queryKey: [table],
    queryFn: async () =>
      must(await supabase.from(table).select("*").order(order, { ascending: true })) as T[],
  });
}

export const useTasks = () => useTable<Task>("tasks", "position");
export const useLists = () => useTable<List>("lists");
export const usePages = () => useTable<Page>("pages");
export const useHabits = () => useTable<Habit>("habits");
export const useHabitLogs = () => useTable<HabitLog>("habit_logs", "day");

type TableName = "tasks" | "lists" | "pages" | "habits" | "habit_logs";

export function useCrud(table: TableName) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [table] });
  const insert = useMutation({
    mutationFn: async (row: Record<string, unknown>) =>
      must(await supabase.from(table).insert(row as never).select().single()) as { id: string },
    onSettled: invalidate,
  });
  const update = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Record<string, unknown>) =>
      must(await supabase.from(table).update(patch as never).eq("id", id).select().single()),
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: [table] });
      qc.setQueryData<{ id: string }[]>([table], (old) =>
        old?.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      );
    },
    onSettled: invalidate,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      qc.setQueryData<{ id: string }[]>([table], (old) => old?.filter((r) => r.id !== id));
    },
    onSettled: invalidate,
  });
  return { insert, update, remove };
}

export function todayISO(d = new Date()) {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}

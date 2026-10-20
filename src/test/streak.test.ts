import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { streak } from "@/lib/data";
const log = (day: string) => ({ id: day, habit_id: "h", user_id: "u", day });
describe("habit streak", () => {
  it("counts consecutive days ending today", () => {
    expect(streak([log("2026-10-19"), log("2026-10-20"), log("2026-10-21")], "h", "2026-10-21")).toBe(3);
  });
  it("keeps yesterday's streak when today isn't ticked yet", () => {
    expect(streak([log("2026-10-19"), log("2026-10-20")], "h", "2026-10-21")).toBe(2);
  });
  it("breaks on a missed day", () => {
    expect(streak([log("2026-10-17"), log("2026-10-21")], "h", "2026-10-21")).toBe(1);
  });
});

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import "@lovable.dev/cloud-auth-js/styles.css";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Flowspace" },
      { name: "description", content: "Sign in or create your Flowspace account." },
      { property: "og:title", content: "Sign in — Flowspace" },
      { property: "og:description", content: "Sign in or create your Flowspace account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) navigate({ to: "/app", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/auth" },
        });
        if (error) throw error;
        if (!data.session) toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function oauth(p: "google" | "lovable") {
    const r = await lovable.auth.signInWithOAuth(p, { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error(String(r.error.message ?? r.error));
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm rounded-3xl border-2 border-ink bg-card p-7 shadow-pop">
        <div className="mb-6 flex items-center gap-2 font-display text-xl font-extrabold">
          <span className="grid h-8 w-8 place-items-center rounded-lg border-2 border-ink bg-lime">F</span>
          Flowspace
        </div>
        <h1 className="text-3xl font-extrabold">{mode === "in" ? "Welcome back" : "Create account"}</h1>
        <div className="mt-6 space-y-2">
          <button
            onClick={() => oauth("google")}
            className="w-full rounded-xl border-2 border-ink bg-background py-2.5 font-semibold"
          >
            Continue with Google
          </button>
          <button type="button" className="lovable-auth-button w-full" onClick={() => oauth("lovable")}>
            Continue with Lovable
          </button>
        </div>
        <div className="my-5 text-center text-xs uppercase tracking-wider text-muted-foreground">or email</div>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border-2 border-input bg-background px-3 py-2.5 outline-none focus:border-ink"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border-2 border-input bg-background px-3 py-2.5 outline-none focus:border-ink"
          />
          <button
            disabled={busy}
            className="w-full rounded-xl border-2 border-ink bg-primary py-2.5 font-bold text-primary-foreground shadow-pop-sm disabled:opacity-60"
          >
            {mode === "in" ? "Sign in" : "Sign up"}
          </button>
        </form>
        <button
          onClick={() => setMode(mode === "in" ? "up" : "in")}
          className="mt-4 w-full text-sm text-muted-foreground underline"
        >
          {mode === "in" ? "No account? Sign up" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}

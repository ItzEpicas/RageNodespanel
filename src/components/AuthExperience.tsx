import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, LockKeyhole, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSupabaseConfigured, SUPABASE_CONFIG_ERROR, supabase } from "@/lib/supabase";

type AuthMode = "login" | "register";
type AuthProvider = "discord" | "google";

export function AuthExperience({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState<"email" | AuthProvider | null>(null);
  const isRegister = mode === "register";

  const title = isRegister ? "Create admin account" : "Admin login";
  const subtitle = isRegister
    ? "Register with an approved staff email, then enter the admin panel."
    : "Login with Discord, Google, or email to open the protected panel.";

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let active = true;

    const syncSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error) {
        console.error("Supabase session check failed", error);
        return;
      }
      if (data.session) {
        navigate({ to: "/admin", replace: true });
      }
    };

    void syncSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (nextSession) {
        navigate({ to: "/admin", replace: true });
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const errorDescription =
      url.searchParams.get("error_description") ||
      new URLSearchParams(window.location.hash.replace(/^#/, "")).get("error_description");

    if (!errorDescription) return;

    const message = decodeURIComponent(errorDescription.replace(/\+/g, " "));
    toast.error(message);

    url.searchParams.delete("error");
    url.searchParams.delete("error_code");
    url.searchParams.delete("error_description");
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  }, []);

  const handleOAuth = async (provider: AuthProvider) => {
    if (!isSupabaseConfigured) {
      toast.error(SUPABASE_CONFIG_ERROR);
      return;
    }

    setLoading(provider);
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?next=/admin`
        : undefined;

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });

    if (error) {
      toast.error(error.message);
      setLoading(null);
    }
  };

  const handleEmailAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isSupabaseConfigured) {
      toast.error(SUPABASE_CONFIG_ERROR);
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (isRegister && password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading("email");
    const { error } = isRegister
      ? await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo:
              typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
          },
        })
      : await supabase.auth.signInWithPassword({ email, password });

    setLoading(null);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(
      isRegister ? "Account created. Check your email if confirmation is enabled." : "Logged in.",
    );
    navigate({ to: "/admin" });
  };

  return (
    <section className="relative isolate min-h-[calc(100vh-74px)] overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-80" />
      <div className="absolute inset-x-0 top-0 h-72 bg-[linear-gradient(180deg,oklch(0.62_0.24_27_/_0.22),transparent)]" />
      <div className="absolute left-[8%] top-[14%] h-80 w-80 rounded-full bg-primary/16 blur-[120px]" />
      <div className="absolute right-[6%] bottom-[12%] h-96 w-96 rounded-full bg-sky-500/10 blur-[130px]" />

      <div className="container relative mx-auto grid min-h-[calc(100vh-74px)] items-center gap-10 px-4 py-12 lg:grid-cols-[1fr_460px] lg:py-20">
        <div className="relative hidden lg:block">
          <div className="max-w-2xl">
            <img src="/logo.png" alt="" className="mb-6 h-16 w-16 object-contain" />
            <h2 className="text-6xl font-black uppercase leading-tight">
              Secure access.
              <br />
              Clean control.
            </h2>
            <p className="mt-5 max-w-lg text-lg leading-8 text-muted-foreground">
              One account for orders, profile settings, support, and server access.
            </p>
            <div className="mt-8 grid max-w-lg grid-cols-3 gap-3">
              {["OAuth", "Email", "Profile"].map((item) => (
                <div key={item} className="rounded-2xl bg-secondary/60 p-4">
                  <p className="text-sm font-bold text-primary">{item}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Ready</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass relative mx-auto w-full max-w-[460px] overflow-hidden rounded-2xl p-5 md:p-7">
          <div className="absolute right-5 top-5">
            <img src="/logo.png" alt="" className="h-10 w-10 object-contain" />
          </div>
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Admin panel
          </Link>

          <div className="mt-8">
            <h1 className="text-4xl font-black uppercase leading-tight md:text-5xl">{title}</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground md:text-base">{subtitle}</p>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <ProviderButton
              label="Discord"
              mark="D"
              loading={loading === "discord"}
              onClick={() => handleOAuth("discord")}
            />
            <ProviderButton
              label="Google"
              mark="G"
              loading={loading === "google"}
              onClick={() => handleOAuth("google")}
            />
          </div>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              or email
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@ragenodes.cloud"
                  className="h-12 rounded-xl bg-background/70 pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  required
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="********"
                  className="h-12 rounded-xl bg-background/70 pl-10"
                />
              </div>
            </div>

            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="********"
                    className="h-12 rounded-xl bg-background/70 pl-10"
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading !== null}
              className="h-12 w-full rounded-xl bg-primary text-base font-bold"
            >
              {loading === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isRegister ? "Sign Up" : "Login"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
            <Link to={isRegister ? "/login" : "/register"} className="font-semibold text-primary">
              {isRegister ? "Login" : "Sign Up"}
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

function ProviderButton({
  label,
  mark,
  loading,
  onClick,
}: {
  label: string;
  mark: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      disabled={loading}
      onClick={onClick}
      className="h-12 rounded-xl bg-secondary/70 font-bold hover:bg-secondary"
    >
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-background text-xs font-black text-primary">
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : mark}
      </span>
      {label}
    </Button>
  );
}

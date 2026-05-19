import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Handshake,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_SETTINGS, fetchSiteSettings, type SiteSettings } from "@/lib/cms";
import { isSupabaseConfigured, SUPABASE_CONFIG_ERROR, supabase } from "@/lib/supabase";

export const Route = createFileRoute("/profile")({
  component: ProfileRoute,
});

function ProfileRoute() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"profile" | "password" | "logout" | null>(null);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [company, setCompany] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [sponsorships, setSponsorships] = useState<
    Array<{ id: string; server_name: string; status: string; created_at: string }>
  >([]);

  useEffect(() => {
    fetchSiteSettings().then(setSettings);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      applyMetadata(data.session);
      if (data.session) {
        void loadSponsorships(data.session);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      applyMetadata(nextSession);
      if (nextSession) {
        void loadSponsorships(nextSession);
      } else {
        setSponsorships([]);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const user = session?.user;
  const provider = useMemo(() => {
    const identities = user?.identities ?? [];
    return identities[0]?.provider ?? "email";
  }, [user]);

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isSupabaseConfigured) {
      toast.error(SUPABASE_CONFIG_ERROR);
      return;
    }

    setSaving("profile");
    const { data, error } = await supabase.auth.updateUser({
      data: {
        full_name: fullName.trim(),
        username: username.trim(),
        company: company.trim(),
      },
    });
    setSaving(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    setSession((current) => (current ? { ...current, user: data.user } : current));
    toast.success("Profile updated.");
  };

  const updatePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isSupabaseConfigured) {
      toast.error(SUPABASE_CONFIG_ERROR);
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setSaving("password");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    setNewPassword("");
    toast.success("Password updated.");
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      toast.error(SUPABASE_CONFIG_ERROR);
      return;
    }

    setSaving("logout");
    const { error } = await supabase.auth.signOut();
    setSaving(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    setSession(null);
    toast.success("Logged out.");
    navigate({ to: "/login" });
  };

  if (loading) {
    return (
      <section className="container mx-auto grid min-h-[calc(100vh-74px)] place-items-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </section>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <ProfileGate
        title="Auth is not configured"
        description={SUPABASE_CONFIG_ERROR}
        actionLabel="Back home"
        actionTo="/"
      />
    );
  }

  if (!session || !user) {
    return (
      <ProfileGate
        title="Login required"
        description="Login or create an account to manage your RageNodes profile."
        actionLabel="Login"
        actionTo="/login"
      />
    );
  }

  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-70" />
      <div className="absolute left-[16%] top-24 h-80 w-80 rounded-full bg-primary/12 blur-[120px]" />
      <div className="container relative mx-auto px-4 py-12 lg:py-16">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Profile</p>
            <h1 className="mt-3 text-4xl font-black uppercase md:text-6xl">Account control</h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Manage your account details, password, provider status, and quick server actions.
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={signOut}
            disabled={saving !== null}
            className="h-12 rounded-xl bg-secondary/70 px-6"
          >
            {saving === "logout" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            Logout
          </Button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <aside className="glass rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-2xl font-black text-primary-foreground">
                {(fullName || user.email || "R").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-black">{fullName || "RageNodes User"}</h2>
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <InfoRow icon={ShieldCheck} label="Provider" value={provider} />
              <InfoRow icon={Mail} label="Email" value={user.email ?? "No email"} />
              <InfoRow icon={CalendarClock} label="Created" value={formatDate(user.created_at)} />
              <InfoRow
                icon={CheckCircle2}
                label="Last sign in"
                value={formatDate(user.last_sign_in_at)}
              />
            </div>
          </aside>

          <div className="grid gap-5">
            <form onSubmit={saveProfile} className="glass rounded-2xl p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black">Profile details</h2>
                  <p className="text-sm text-muted-foreground">
                    These are saved in Supabase auth metadata.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field
                  label="Full name"
                  value={fullName}
                  onChange={setFullName}
                  placeholder="Your name"
                />
                <Field
                  label="Username"
                  value={username}
                  onChange={setUsername}
                  placeholder="rageuser"
                />
                <Field
                  label="Company"
                  value={company}
                  onChange={setCompany}
                  placeholder="Optional"
                />
              </div>

              <Button
                type="submit"
                disabled={saving !== null}
                className="mt-5 h-11 rounded-xl bg-primary px-6 font-bold"
              >
                {saving === "profile" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save profile
              </Button>
            </form>

            <div className="grid gap-5 lg:grid-cols-2">
              <form onSubmit={updatePassword} className="glass rounded-2xl p-6">
                <div className="mb-6 flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black">Password</h2>
                    <p className="text-sm text-muted-foreground">Update email-account password.</p>
                  </div>
                </div>
                <Field
                  label="New password"
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder="Minimum 6 characters"
                  type="password"
                />
                <Button
                  type="submit"
                  disabled={saving !== null}
                  className="mt-5 h-11 rounded-xl bg-primary px-6 font-bold"
                >
                  {saving === "password" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Update password
                </Button>
              </form>

              <div className="glass rounded-2xl p-6">
                <h2 className="text-xl font-black">Quick actions</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Jump into the parts that matter after login.
                </p>
                <div className="mt-6 grid gap-3">
                  <QuickAction to="/order" label="Order server" />
                  <QuickAction to="/builder" label="Open builder" />
                  <QuickAction to="/sponsorships" label="Sponsorships" />
                  <a href={settings.panel_url} target="_blank" rel="noreferrer">
                    <Button
                      variant="ghost"
                      className="h-11 w-full justify-between rounded-xl bg-secondary/60"
                    >
                      Open panel
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Handshake className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black">Sponsorship status</h2>
                  <p className="text-sm text-muted-foreground">
                    Track your latest RageNodes sponsorship requests.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                {sponsorships.length === 0 ? (
                  <div className="rounded-xl bg-secondary/55 p-4 text-sm text-muted-foreground">
                    No sponsorship requests yet.
                  </div>
                ) : (
                  sponsorships.slice(0, 3).map((item) => (
                    <div key={item.id} className="rounded-xl bg-secondary/55 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{item.server_name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDate(item.created_at)}
                          </p>
                        </div>
                        <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                          {item.status.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                <Button
                  asChild
                  variant="ghost"
                  className="h-11 justify-between rounded-xl bg-secondary/60"
                >
                  <Link to="/sponsorships">
                    Open sponsorships
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  function applyMetadata(nextSession: Session | null) {
    const metadata = nextSession?.user.user_metadata ?? {};
    setFullName(String(metadata.full_name ?? metadata.name ?? ""));
    setUsername(String(metadata.username ?? ""));
    setCompany(String(metadata.company ?? ""));
  }

  async function loadSponsorships(nextSession: Session) {
    const response = await fetch("/api/sponsorships/me", {
      headers: {
        authorization: `Bearer ${nextSession.access_token}`,
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return;
    setSponsorships(payload.applications ?? []);
  }
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 rounded-xl bg-background/70"
      />
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-secondary/55 p-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </div>
      <span className="max-w-[11rem] truncate text-right text-sm font-bold">{value}</span>
    </div>
  );
}

function QuickAction({
  to,
  label,
}: {
  to: "/order" | "/builder" | "/sponsorships";
  label: string;
}) {
  return (
    <Button asChild variant="ghost" className="h-11 justify-between rounded-xl bg-secondary/60">
      <Link to={to}>
        {label}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </Button>
  );
}

function ProfileGate({
  title,
  description,
  actionLabel,
  actionTo,
}: {
  title: string;
  description: string;
  actionLabel: string;
  actionTo: "/" | "/login";
}) {
  return (
    <section className="container mx-auto grid min-h-[calc(100vh-74px)] place-items-center px-4">
      <div className="glass max-w-lg rounded-2xl p-7 text-center">
        <img src="/logo.png" alt="" className="mx-auto h-14 w-14 object-contain" />
        <h1 className="mt-5 text-3xl font-black uppercase">{title}</h1>
        <p className="mt-3 text-muted-foreground">{description}</p>
        <Button asChild className="mt-6 h-11 rounded-xl bg-primary px-6">
          <Link to={actionTo}>{actionLabel}</Link>
        </Button>
      </div>
    </section>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(value));
}

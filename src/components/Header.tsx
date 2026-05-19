import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  ArrowUpRight,
  Box,
  Calculator,
  CircleHelp,
  ExternalLink,
  Gamepad2,
  Handshake,
  Home,
  LogOut,
  Menu,
  User,
  ShieldCheck,
  X,
} from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { DEFAULT_SETTINGS, fetchSiteSettings } from "@/lib/cms";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type NavItem = {
  to:
    | "/"
    | "/games"
    | "/minecraft"
    | "/pricing"
    | "/builder"
    | "/faq"
    | "/contact"
    | "/support"
    | "/sponsorships";
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const PRIMARY_NAV: NavItem[] = [
  { to: "/games", label: "Game Servers", icon: Gamepad2 },
  { to: "/minecraft", label: "Minecraft", icon: ShieldCheck },
  { to: "/builder", label: "Builder", icon: Box },
  { to: "/sponsorships", label: "Sponsorships", icon: Handshake },
  { to: "/pricing", label: "Pricing", icon: Calculator },
];

const MOBILE_NAV: NavItem[] = [
  { to: "/", label: "Home", icon: Home },
  ...PRIMARY_NAV,
  { to: "/support", label: "Support", icon: CircleHelp },
  { to: "/faq", label: "FAQ", icon: CircleHelp },
  { to: "/contact", label: "Contact", icon: CircleHelp },
];

export function Header() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    fetchSiteSettings().then(setSettings);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const logout = async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
    setSession(null);
    setOpen(false);
    navigate({ to: "/login" });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/88 backdrop-blur-xl">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
      <div className="container mx-auto flex h-[74px] items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 items-center gap-6">
          <Logo />

          <nav className="hidden items-center gap-1 lg:flex">
            {PRIMARY_NAV.map((item) => (
              <NavLink key={item.to} item={item} />
            ))}
          </nav>
        </div>

        <div className="hidden min-w-0 items-center justify-end gap-1.5 lg:flex">
          <Link to="/support">
            <Button
              variant="ghost"
              size="sm"
              className="h-10 rounded-full px-4 text-muted-foreground"
            >
              Support
            </Button>
          </Link>
          <a href={settings.panel_url} target="_blank" rel="noreferrer">
            <Button
              variant="ghost"
              size="sm"
              className="h-10 rounded-full px-4 text-muted-foreground"
            >
              Panel
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </a>
          {session ? (
            <>
              <Link to="/profile">
                <Button variant="ghost" size="sm" className="h-10 rounded-full px-4">
                  <User className="h-4 w-4" />
                  Profile
                </Button>
              </Link>
              <Button
                variant="secondary"
                size="sm"
                onClick={logout}
                className="h-10 rounded-full px-4"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm" className="h-10 rounded-full px-4">
                  Login
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="h-10 rounded-full bg-primary px-5 font-bold glow-red">
                  Sign Up
                </Button>
              </Link>
            </>
          )}
        </div>

        <button
          className="grid h-11 w-11 place-items-center rounded-full border border-border/70 bg-secondary/70 text-foreground lg:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label="Menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/50 bg-background/96 lg:hidden">
          <div className="container mx-auto px-4 pb-4">
            <div className="overflow-hidden rounded-3xl border border-border/60 bg-card/94 shadow-[0_24px_80px_oklch(0_0_0_/_0.28)] backdrop-blur-xl">
              <div className="border-b border-border/50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Navigation
                </p>
              </div>

              <div className="grid gap-1 p-3">
                {MOBILE_NAV.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      activeOptions={{ exact: item.to === "/" }}
                      onClick={() => setOpen(false)}
                      className="group flex min-h-12 items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground data-[status=active]:bg-primary/10 data-[status=active]:text-foreground"
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-primary" />
                        {item.label}
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 opacity-40 transition-opacity group-hover:opacity-100" />
                    </Link>
                  );
                })}
              </div>

              {session ? (
                <div className="grid gap-2 border-t border-border/50 p-3 sm:grid-cols-2">
                  <Link to="/profile" onClick={() => setOpen(false)}>
                    <Button variant="ghost" className="h-11 w-full rounded-full bg-secondary/50">
                      Profile
                    </Button>
                  </Link>
                  <Button
                    onClick={logout}
                    className="h-11 w-full rounded-full bg-primary font-bold"
                  >
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="grid gap-2 border-t border-border/50 p-3 sm:grid-cols-2">
                  <Link to="/login" onClick={() => setOpen(false)}>
                    <Button variant="ghost" className="h-11 w-full rounded-full bg-secondary/50">
                      Login
                    </Button>
                  </Link>
                  <Link to="/register" onClick={() => setOpen(false)}>
                    <Button className="h-11 w-full rounded-full bg-primary font-bold">
                      Sign Up
                    </Button>
                  </Link>
                </div>
              )}

              <div className="border-t border-border/50 p-3">
                <a
                  href={settings.panel_url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setOpen(false)}
                >
                  <Button variant="ghost" className="h-11 w-full rounded-full bg-secondary/50">
                    Panel
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function NavLink({ item }: { item: NavItem }) {
  return (
    <Link
      to={item.to}
      activeOptions={{ exact: item.to === "/" }}
      className="group relative inline-flex h-11 items-center rounded-full px-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground data-[status=active]:text-foreground"
    >
      {item.label}
      <span className="pointer-events-none absolute inset-x-3 bottom-[7px] h-px scale-x-0 bg-primary transition-transform group-hover:scale-x-100 group-data-[status=active]:scale-x-100" />
    </Link>
  );
}

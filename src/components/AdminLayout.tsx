import { Link, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  CircleHelp,
  Gamepad2,
  Handshake,
  Home,
  Layers3,
  ListChecks,
  Lock,
  LogOut,
  Loader2,
  ShieldAlert,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { getAdminAccessState, type AdminAccessState } from "@/lib/admin-auth";
import { isSupabaseConfigured, supabase, SUPABASE_CONFIG_ERROR } from "@/lib/supabase";

type AdminRoute =
  | "/admin"
  | "/admin/users"
  | "/admin/orders"
  | "/admin/pricing"
  | "/admin/games"
  | "/admin/minecraft"
  | "/admin/vps"
  | "/admin/features"
  | "/admin/faq"
  | "/admin/homepage"
  | "/admin/settings"
  | "/admin/sponsorships";

const ADMIN_LINKS: Array<{
  to: AdminRoute;
  label: string;
  icon: typeof BarChart3;
}> = [
  { to: "/admin", label: "Dashboard", icon: BarChart3 },
  { to: "/admin/users", label: "Users & Roles", icon: Users },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/pricing", label: "Pricing", icon: Layers3 },
  { to: "/admin/games", label: "Games", icon: Gamepad2 },
  { to: "/admin/sponsorships", label: "Sponsorships", icon: Handshake },
  { to: "/admin/minecraft", label: "Minecraft Plans", icon: ListChecks },
  { to: "/admin/vps", label: "VPS Plans", icon: ShieldCheck },
  { to: "/admin/features", label: "Features", icon: Sparkles },
  { to: "/admin/faq", label: "FAQ", icon: CircleHelp },
  { to: "/admin/homepage", label: "Homepage", icon: Home },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [access, setAccess] = useState<AdminAccessState | null>(null);

  useEffect(() => {
    let active = true;

    async function loadAccess() {
      if (!isSupabaseConfigured) {
        setAccess({
          status: "error",
          session: null,
          email: null,
          isOwner: false,
          message: SUPABASE_CONFIG_ERROR,
        });
        return;
      }

      const nextAccess = await getAdminAccessState();
      if (active) setAccess(nextAccess);
    }

    void loadAccess();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void loadAccess();
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  if (!access) {
    return (
      <div className="container mx-auto grid min-h-screen place-items-center px-4 py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (access.status === "signed_out") {
    return (
      <div className="container mx-auto max-w-md px-4 py-20">
        <div className="glass rounded-3xl p-8 text-center glow-red-soft">
          <Lock className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-4 text-2xl font-bold">RageNodes admin</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Login or create an account before opening the protected admin panel.
          </p>
          <div className="mt-6 grid gap-3">
            <Button asChild className="w-full bg-gradient-to-r from-primary to-accent glow-red">
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/register">Register</Link>
            </Button>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Only approved staff roles can enter after authentication.
          </p>
        </div>
      </div>
    );
  }

  if (access.status === "forbidden" || access.status === "error") {
    const signedIn = Boolean(access.session);

    return (
      <div className="container mx-auto max-w-lg px-4 py-20">
        <div className="glass rounded-3xl p-8 text-center glow-red-soft">
          <ShieldAlert className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-4 text-2xl font-bold">
            {access.status === "forbidden" ? "Access denied" : "Admin setup required"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {access.status === "forbidden"
              ? `${access.email} is signed in, but this account does not have an admin role.`
              : access.message}
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Button asChild className="bg-gradient-to-r from-primary to-accent glow-red">
              <Link to={signedIn ? "/admin" : "/login"}>{signedIn ? "Retry" : "Login"}</Link>
            </Button>
            {signedIn ? (
              <Button variant="outline" onClick={logout}>
                Logout
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link to="/register">Register</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto grid gap-6 px-4 py-10 lg:grid-cols-[280px_1fr]">
      <aside className="glass h-fit rounded-3xl p-5 lg:sticky lg:top-24">
        <Logo />
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <p className="truncate text-sm font-semibold">{access.email}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {access.isOwner ? "Owner access" : "Staff access"}
          </p>
        </div>
        <nav className="mt-8 space-y-2">
          {ADMIN_LINKS.map((link) => (
            <AdminLink key={link.to} {...link} />
          ))}
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function AdminLink({ to, icon: Icon, label }: (typeof ADMIN_LINKS)[number]) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground data-[status=active]:bg-primary/10 data-[status=active]:text-primary"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

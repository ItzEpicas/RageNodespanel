import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { isSupabaseConfigured, SUPABASE_CONFIG_ERROR, supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackRoute,
});

function AuthCallbackRoute() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isSupabaseConfigured) {
      toast.error(SUPABASE_CONFIG_ERROR);
      navigate({ to: "/login", replace: true });
      return;
    }

    let active = true;

    const finishOAuth = async () => {
      let nextPath = "/admin";

      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const errorDescription =
          url.searchParams.get("error_description") || hashParams.get("error_description");
        const requestedNext = url.searchParams.get("next");

        if (requestedNext?.startsWith("/")) {
          nextPath = requestedNext;
        }

        if (errorDescription) {
          toast.error(decodeURIComponent(errorDescription.replace(/\+/g, " ")));
          navigate({ to: "/login", replace: true });
          return;
        }
      }

      const { data, error } = await supabase.auth.getSession();
      if (!active) return;

      if (error) {
        toast.error(error.message);
        navigate({ to: "/login", replace: true });
        return;
      }

      if (data.session) {
        navigate({ to: nextPath, replace: true });
      }
    };

    void finishOAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (nextSession) {
        let nextPath = "/admin";
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          const requestedNext = url.searchParams.get("next");
          if (requestedNext?.startsWith("/")) {
            nextPath = requestedNext;
          }
        }
        navigate({ to: nextPath, replace: true });
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <section className="container mx-auto grid min-h-[calc(100vh-74px)] place-items-center px-4">
      <div className="glass flex w-full max-w-md flex-col items-center rounded-2xl p-8 text-center">
        <img src="/logo.png" alt="" className="h-14 w-14 object-contain" />
        <h1 className="mt-5 text-3xl font-black uppercase">Finishing sign in</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Your Google or Discord login is being completed.
        </p>
        <Loader2 className="mt-6 h-7 w-7 animate-spin text-primary" />
      </div>
    </section>
  );
}

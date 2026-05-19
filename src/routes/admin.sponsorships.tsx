import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { CheckCircle2, Handshake, Loader2, Search, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSupabaseConfigured, supabase, SUPABASE_CONFIG_ERROR } from "@/lib/supabase";

export const Route = createFileRoute("/admin/sponsorships")({
  head: () => ({
    meta: [{ title: "Admin Sponsorships - RageNodes" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminSponsorshipsPage,
});

type AdminSponsorshipApplication = {
  id: string;
  server_name: string;
  discord_id: string;
  discord_username?: string | null;
  server_type: string;
  average_players: number;
  discord_members: number;
  status: string;
  created_at: string;
  admin_notes?: string | null;
  profile?: {
    full_name?: string | null;
    username?: string | null;
    email?: string | null;
  } | null;
  sponsorship_tickets?: Array<{
    channel_id?: string | null;
    status: string;
  }>;
};

function AdminSponsorshipsPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applications, setApplications] = useState<AdminSponsorshipApplication[]>([]);
  const [filters, setFilters] = useState({
    q: "",
    status: "",
    serverType: "",
    discordId: "",
  });

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError(SUPABASE_CONFIG_ERROR);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!session) return;
    void loadApplications(session.access_token);
  }, [session, filters.q, filters.status, filters.serverType, filters.discordId]);

  async function loadApplications(token: string) {
    setLoading(true);
    setError(null);
    const search = new URLSearchParams();
    if (filters.q) search.set("q", filters.q);
    if (filters.status) search.set("status", filters.status);
    if (filters.serverType) search.set("server_type", filters.serverType);
    if (filters.discordId) search.set("discord_id", filters.discordId);

    const response = await fetch(`/api/admin/sponsorships?${search.toString()}`, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(payload.error || "Could not load sponsorship applications.");
      return;
    }

    setApplications(payload.applications ?? []);
  }

  const summary = useMemo(
    () => ({
      total: applications.length,
      pending: applications.filter((item) => item.status === "pending").length,
      active: applications.filter((item) => item.status === "activated").length,
      approved: applications.filter((item) => item.status === "approved").length,
    }),
    [applications],
  );

  return (
    <AdminLayout>
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Admin</p>
        <h1 className="mt-2 text-4xl font-bold">Sponsorships</h1>
        <p className="mt-2 text-muted-foreground">
          Review Minecraft sponsorship applications, track Discord tickets, and manage approval
          flow.
        </p>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Stat title="Total" value={summary.total} icon={Handshake} />
        <Stat title="Pending" value={summary.pending} icon={Sparkles} />
        <Stat title="Approved" value={summary.approved} icon={CheckCircle2} />
        <Stat title="Activated" value={summary.active} icon={Users} />
      </div>

      <div className="mt-8 glass rounded-3xl p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FilterField
            label="Search"
            value={filters.q}
            onChange={(value) => setFilters((current) => ({ ...current, q: value }))}
            placeholder="server, username, discord..."
          />
          <FilterSelect
            label="Status"
            value={filters.status}
            onChange={(value) => setFilters((current) => ({ ...current, status: value }))}
            options={[
              "",
              "pending",
              "ticket_opened",
              "under_review",
              "approved",
              "rejected",
              "changes_required",
              "activated",
              "cancelled",
            ]}
          />
          <FilterSelect
            label="Server type"
            value={filters.serverType}
            onChange={(value) => setFilters((current) => ({ ...current, serverType: value }))}
            options={[
              "",
              "Survival",
              "Lifesteal",
              "BoxPvP",
              "Practice",
              "SkyBlock",
              "SMP",
              "Other",
            ]}
          />
          <FilterField
            label="Discord ID"
            value={filters.discordId}
            onChange={(value) => setFilters((current) => ({ ...current, discordId: value }))}
            placeholder="1234567890..."
          />
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/8 p-4 text-sm text-primary">
            {error}
          </div>
        ) : null}

        {!session && !loading ? (
          <div className="mt-5 rounded-2xl border border-white/8 bg-secondary/35 p-5 text-sm text-muted-foreground">
            Log in with an admin account before loading sponsorship data.
          </div>
        ) : null}

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[1080px] text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-3 text-left">Server</th>
                <th className="px-3 py-3 text-left">Applicant</th>
                <th className="px-3 py-3 text-left">Type</th>
                <th className="px-3 py-3 text-left">Players</th>
                <th className="px-3 py-3 text-left">Members</th>
                <th className="px-3 py-3 text-left">Status</th>
                <th className="px-3 py-3 text-left">Ticket</th>
                <th className="px-3 py-3 text-left">Created</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">
                    No sponsorship applications found.
                  </td>
                </tr>
              ) : (
                applications.map((application) => (
                  <tr key={application.id} className="border-b border-white/5">
                    <td className="px-3 py-3">
                      <div className="font-semibold">{application.server_name}</div>
                      <div className="text-xs text-muted-foreground">{application.discord_id}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div>
                        {application.profile?.full_name || application.discord_username || "-"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {application.profile?.email || "-"}
                      </div>
                    </td>
                    <td className="px-3 py-3">{application.server_type}</td>
                    <td className="px-3 py-3">{application.average_players}</td>
                    <td className="px-3 py-3">{application.discord_members}</td>
                    <td className="px-3 py-3">
                      <StatusCell status={application.status} />
                    </td>
                    <td className="px-3 py-3">
                      {application.sponsorship_tickets?.find((ticket) => ticket.status === "open")
                        ?.channel_id || "-"}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {new Date(application.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link
                          to="/admin/sponsorships/$applicationId"
                          params={{ applicationId: application.id }}
                        >
                          View
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

function Stat({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: typeof Handshake;
}) {
  return (
    <div className="glass rounded-3xl p-5">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{title}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </div>
  );
}

function FilterField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-11 rounded-xl bg-background/70 pl-9"
        />
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-input bg-background/70 px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {options.map((option) => (
          <option key={option || "all"} value={option}>
            {option || "All"}
          </option>
        ))}
      </select>
    </div>
  );
}

function StatusCell({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "border-primary/20 bg-primary/10 text-primary",
    ticket_opened: "border-sky-400/20 bg-sky-400/10 text-sky-200",
    under_review: "border-yellow-400/20 bg-yellow-400/10 text-yellow-200",
    approved: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    rejected: "border-white/10 bg-white/5 text-muted-foreground",
    changes_required: "border-orange-400/20 bg-orange-400/10 text-orange-200",
    activated: "border-emerald-400/25 bg-emerald-400/12 text-emerald-200",
    cancelled: "border-white/10 bg-white/5 text-muted-foreground",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status] || styles.pending}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

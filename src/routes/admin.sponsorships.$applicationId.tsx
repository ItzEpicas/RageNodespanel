import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isSupabaseConfigured, supabase, SUPABASE_CONFIG_ERROR } from "@/lib/supabase";

export const Route = createFileRoute("/admin/sponsorships/$applicationId")({
  head: () => ({
    meta: [{ title: "Sponsorship Details - RageNodes" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminSponsorshipDetailsPage,
});

const statuses = [
  "pending",
  "ticket_opened",
  "under_review",
  "approved",
  "rejected",
  "changes_required",
  "activated",
  "cancelled",
];

type SponsorshipTicket = {
  id: string;
  channel_id?: string | null;
  status: string;
};

type SponsorshipStatusLog = {
  id: string;
  old_status?: string | null;
  new_status: string;
  note?: string | null;
  created_at: string;
};

type SponsorshipApplicationDetail = {
  id: string;
  server_name: string;
  discord_username?: string | null;
  discord_id?: string | null;
  discord_invite?: string | null;
  minecraft_ip?: string | null;
  server_version?: string | null;
  server_type: string;
  average_players?: number | null;
  discord_members?: number | null;
  status: string;
  archived_at?: string | null;
  admin_notes?: string | null;
  server_description?: string | null;
  sponsorship_reason?: string | null;
  spawn_promotion_plan?: string | null;
  proof_links?: string | null;
  extra_notes?: string | null;
  sponsorship_tickets?: SponsorshipTicket[];
  sponsorship_status_logs?: SponsorshipStatusLog[];
};

function AdminSponsorshipDetailsPage() {
  const { applicationId } = Route.useParams();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [application, setApplication] = useState<SponsorshipApplicationDetail | null>(null);
  const [status, setStatus] = useState("pending");
  const [statusNote, setStatusNote] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [archived, setArchived] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError(SUPABASE_CONFIG_ERROR);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) {
        setLoading(false);
        return;
      }
      void loadDetails(data.session.access_token);
    });
  }, [applicationId]);

  async function loadDetails(token: string) {
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/admin/sponsorships/${applicationId}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(payload.error || "Could not load sponsorship details.");
      return;
    }

    setApplication(payload.application);
    setStatus(payload.application.status);
    setAdminNotes(payload.application.admin_notes || "");
    setArchived(Boolean(payload.application.archived_at));
  }

  async function updateStatus() {
    if (!session) return;
    setSavingStatus(true);

    const response = await fetch(`/api/admin/sponsorships/${applicationId}/status`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ status, note: statusNote }),
    });
    const payload = await response.json().catch(() => ({}));
    setSavingStatus(false);

    if (!response.ok) {
      toast.error(payload.error || "Could not update sponsorship status.");
      return;
    }

    toast.success("Sponsorship status updated.");
    setApplication(payload.application);
    setStatusNote("");
  }

  async function updateNotes() {
    if (!session) return;
    setSavingNotes(true);

    const response = await fetch(`/api/admin/sponsorships/${applicationId}/notes`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ adminNotes, archived }),
    });
    const payload = await response.json().catch(() => ({}));
    setSavingNotes(false);

    if (!response.ok) {
      toast.error(payload.error || "Could not update sponsorship notes.");
      return;
    }

    toast.success("Admin notes saved.");
    setApplication(payload.application);
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Admin</p>
          <h1 className="mt-2 text-4xl font-bold">Sponsorship details</h1>
        </div>
        <Button asChild variant="outline">
          <Link to="/admin/sponsorships">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/8 p-4 text-sm text-primary">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-10 flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Loading sponsorship details...
        </div>
      ) : !session ? (
        <div className="mt-6 rounded-2xl border border-white/8 bg-secondary/35 p-5 text-sm text-muted-foreground">
          Log in with an admin account first.
        </div>
      ) : application ? (
        <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-6">
            <div className="glass rounded-3xl p-6">
              <h2 className="text-xl font-black">{application.server_name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {application.server_type} - {application.minecraft_ip || "No IP"} -{" "}
                {application.server_version || "No version"}
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Detail label="Discord username" value={application.discord_username || "-"} />
                <Detail label="Discord ID" value={application.discord_id || "-"} />
                <Detail label="Discord invite" value={application.discord_invite || "-"} />
                <Detail
                  label="Players / Members"
                  value={`${application.average_players ?? 0} / ${application.discord_members ?? 0}`}
                />
                <Detail label="Current status" value={application.status} />
                <Detail
                  label="Open ticket channel"
                  value={
                    application.sponsorship_tickets?.find(
                      (ticket: SponsorshipTicket) => ticket.status === "open",
                    )?.channel_id || "-"
                  }
                />
              </div>

              <div className="mt-6 grid gap-4">
                <LongBlock title="Server description" value={application.server_description} />
                <LongBlock
                  title="Why they want sponsorship"
                  value={application.sponsorship_reason}
                />
                <LongBlock title="Spawn promotion plan" value={application.spawn_promotion_plan} />
                <LongBlock title="Proof links" value={application.proof_links} />
                <LongBlock title="Extra notes" value={application.extra_notes} />
              </div>
            </div>

            <div className="glass rounded-3xl p-6">
              <h2 className="text-xl font-black">Status history</h2>
              <div className="mt-4 grid gap-3">
                {(application.sponsorship_status_logs || []).length === 0 ? (
                  <div className="rounded-2xl border border-white/8 bg-secondary/35 p-4 text-sm text-muted-foreground">
                    No status history yet.
                  </div>
                ) : (
                  application.sponsorship_status_logs
                    .slice()
                    .sort(
                      (a: SponsorshipStatusLog, b: SponsorshipStatusLog) =>
                        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
                    )
                    .map((entry: SponsorshipStatusLog) => (
                      <div
                        key={entry.id}
                        className="rounded-2xl border border-white/8 bg-secondary/30 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-semibold">{entry.new_status}</span>
                          <span className="text-muted-foreground">
                            {new Date(entry.created_at).toLocaleString()}
                          </span>
                        </div>
                        {entry.old_status ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            From {entry.old_status}
                          </p>
                        ) : null}
                        {entry.note ? (
                          <p className="mt-3 text-sm text-muted-foreground">{entry.note}</p>
                        ) : null}
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="glass rounded-3xl p-6">
              <h2 className="text-xl font-black">Update status</h2>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="h-11 w-full rounded-xl border border-input bg-background/70 px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {statuses.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Status note</Label>
                  <Textarea
                    value={statusNote}
                    onChange={(event) => setStatusNote(event.target.value)}
                    rows={5}
                    className="rounded-2xl bg-background/70"
                    placeholder="Optional note for the status log..."
                  />
                </div>

                <Button
                  onClick={updateStatus}
                  disabled={savingStatus}
                  className="h-11 w-full rounded-xl bg-primary font-bold"
                >
                  {savingStatus ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save status
                </Button>
              </div>
            </div>

            <div className="glass rounded-3xl p-6">
              <h2 className="text-xl font-black">Admin notes</h2>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Internal notes</Label>
                  <Textarea
                    value={adminNotes}
                    onChange={(event) => setAdminNotes(event.target.value)}
                    rows={8}
                    className="rounded-2xl bg-background/70"
                    placeholder="Private admin notes for review, follow-up, and verification..."
                  />
                </div>

                <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={archived}
                    onChange={(event) => setArchived(event.target.checked)}
                    className="h-4 w-4 accent-red-500"
                  />
                  Archive this sponsorship application
                </label>

                <Button
                  onClick={updateNotes}
                  disabled={savingNotes}
                  variant="outline"
                  className="h-11 w-full rounded-xl"
                >
                  {savingNotes ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save notes
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-secondary/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm">{value}</p>
    </div>
  );
}

function LongBlock({ title, value }: { title: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-secondary/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </p>
      <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{value || "-"}</p>
    </div>
  );
}

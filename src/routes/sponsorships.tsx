import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  ArrowRight,
  CheckCircle2,
  Handshake,
  Loader2,
  MessageSquareText,
  Server,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isSupabaseConfigured, supabase, SUPABASE_CONFIG_ERROR } from "@/lib/supabase";

export const Route = createFileRoute("/sponsorships")({
  head: () => ({
    meta: [
      { title: "Apply for Sponsorship - RageNodes" },
      {
        name: "description",
        content:
          "Apply for RageNodes Minecraft sponsorship and get 4GB RAM, 100% CPU, and 30GB SSD hosting in exchange for verified promotion.",
      },
    ],
  }),
  component: SponsorshipsPage,
});

type SponsorshipApplication = {
  id: string;
  server_name: string;
  discord_invite: string;
  minecraft_ip?: string | null;
  server_version?: string | null;
  server_type: string;
  average_players: number;
  discord_members: number;
  server_description?: string | null;
  sponsorship_reason?: string | null;
  spawn_promotion_plan?: string | null;
  can_create_dedicated_channel: boolean;
  can_create_admin_roles: boolean;
  can_add_spawn_promotion: boolean;
  can_add_ragenodes_to_tab: boolean;
  proof_links?: string | null;
  extra_notes?: string | null;
  package_ram_gb: number;
  package_cpu_percent: number;
  package_ssd_gb: number;
  status: string;
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
  sponsorship_tickets?: Array<{
    id: string;
    channel_id?: string | null;
    guild_id?: string | null;
    status: string;
    opened_at?: string | null;
    closed_at?: string | null;
  }>;
};

type SponsorshipResponse = {
  applications: SponsorshipApplication[];
  stats?: {
    total: number;
    active: number;
    approved: number;
    activated: number;
  };
};

const serverTypes = ["Survival", "Lifesteal", "BoxPvP", "Practice", "SkyBlock", "SMP", "Other"];

function SponsorshipsPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [applications, setApplications] = useState<SponsorshipApplication[]>([]);
  const [discordUrl, setDiscordUrl] = useState("https://discord.gg/ragenodes");
  const [form, setForm] = useState({
    serverName: "",
    discordInvite: "",
    minecraftIp: "",
    serverVersion: "",
    serverType: "Survival",
    averagePlayers: "0",
    discordMembers: "0",
    serverDescription: "",
    sponsorshipReason: "",
    spawnPromotionPlan: "",
    canAddRageNodesToTab: false,
    canCreateDedicatedChannel: false,
    canCreateAdminRoles: false,
    canAddSpawnPromotion: false,
    proofLinks: "",
    extraNotes: "",
  });

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session) {
        await loadApplications(data.session.access_token);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        await loadApplications(nextSession.access_token);
      } else {
        setApplications([]);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const hasDiscordLogin = useMemo(() => hasDiscordIdentity(session), [session]);

  const activeApplication = useMemo(
    () =>
      applications.find((item) =>
        [
          "pending",
          "ticket_opened",
          "under_review",
          "approved",
          "changes_required",
          "activated",
        ].includes(item.status),
      ) || null,
    [applications],
  );

  async function loadApplications(token: string) {
    const response = await fetch("/api/sponsorships/me", {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
    const payload = (await response.json().catch(() => ({}))) as SponsorshipResponse;
    if (!response.ok) return;
    setApplications(payload.applications ?? []);
  }

  async function submitApplication(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      toast.error("Login with Discord first.");
      return;
    }

    setSubmitting(true);
    const response = await fetch("/api/sponsorships/apply", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        ...form,
        averagePlayers: Number(form.averagePlayers || 0),
        discordMembers: Number(form.discordMembers || 0),
      }),
    });

    const payload = await response.json().catch(() => ({}));
    setSubmitting(false);

    if (!response.ok) {
      toast.error(payload.error || "Could not submit sponsorship application.");
      return;
    }

    if (payload.continueInDiscordUrl) {
      setDiscordUrl(String(payload.continueInDiscordUrl));
    }

    toast.success("Sponsorship application submitted. Choose Discord ticket or Live Support.");
    setForm({
      serverName: "",
      discordInvite: "",
      minecraftIp: "",
      serverVersion: "",
      serverType: "Survival",
      averagePlayers: "0",
      discordMembers: "0",
      serverDescription: "",
      sponsorshipReason: "",
      spawnPromotionPlan: "",
      canAddRageNodesToTab: false,
      canCreateDedicatedChannel: false,
      canCreateAdminRoles: false,
      canAddSpawnPromotion: false,
      proofLinks: "",
      extraNotes: "",
    });
    await loadApplications(session.access_token);
  }

  async function claimTicket(applicationId: string, options?: { silent?: boolean }) {
    if (!session) {
      toast.error("Login required.");
      return false;
    }

    if (!hasDiscordLogin) {
      toast.error("Discord login is required for sponsorship tickets.");
      return false;
    }

    setClaiming(applicationId);
    const response = await fetch("/api/discord/claim-sponsorship", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ applicationId }),
    });
    const payload = await response.json().catch(() => ({}));
    setClaiming(null);

    if (!response.ok) {
      if (!options?.silent) {
        toast.error(payload.error || "Could not open the Discord sponsorship ticket.");
      }
      return false;
    }

    if (!options?.silent) {
      toast.success(
        payload.created ? "Discord sponsorship ticket created." : "Discord ticket already exists.",
      );
    }
    await loadApplications(session.access_token);
    return true;
  }

  async function continueWithDiscord() {
    if (!isSupabaseConfigured) {
      toast.error(SUPABASE_CONFIG_ERROR);
      return;
    }

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent("/sponsorships")}`
        : undefined;

    if (session) {
      await supabase.auth.signOut();
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo },
    });

    if (error) {
      toast.error(error.message);
    }
  }

  function buildSponsorshipSupportUrl(application?: SponsorshipApplication | null) {
    const params = new URLSearchParams({
      category: "Sponsorship",
      priority: "Normal",
      subject: application
        ? `Sponsorship follow-up for ${application.server_name}`
        : "Sponsorship application support",
      message: application
        ? `I need sponsorship help for ${application.server_name}. Application status: ${application.status}.`
        : "I need help with my RageNodes sponsorship application.",
    });

    if (session?.user?.email) {
      params.set("email", session.user.email);
    }

    return `/support?${params.toString()}`;
  }

  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-70" />
      <div className="absolute left-[8%] top-28 h-80 w-80 rounded-full bg-primary/12 blur-[120px]" />
      <div className="absolute right-[10%] top-40 h-72 w-72 rounded-full bg-primary/10 blur-[140px]" />

      <div className="container relative mx-auto px-4 py-12 lg:py-16">
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="glass rounded-3xl p-8 lg:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
              Sponsorship Program
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black uppercase md:text-6xl">
              Get Your Server Sponsored by RageNodes
            </h1>
            <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
              Apply for free hosting and grow your Minecraft community with RageNodes.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <HighlightCard icon={Server} title="4GB DDR5 RAM" />
              <HighlightCard icon={Sparkles} title="100% CPU" />
              <HighlightCard icon={ShieldCheck} title="30GB SSD" />
              <HighlightCard icon={CheckCircle2} title="Manual review by staff" />
              <HighlightCard icon={MessageSquareText} title="Discord ticket support" />
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#apply">
                <Button className="h-12 rounded-xl bg-gradient-to-r from-primary to-accent px-6 font-bold glow-red">
                  Apply for Sponsorship
                </Button>
              </a>
              <a href={discordUrl} target="_blank" rel="noreferrer">
                <Button variant="outline" className="h-12 rounded-xl px-6">
                  Continue in Discord
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
              <Link to={buildSponsorshipSupportUrl()}>
                <Button variant="outline" className="h-12 rounded-xl px-6">
                  Open Live Support
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              After you apply, you can choose either a Discord ticket path or a Live Support ticket
              on the website.
            </p>
          </div>

          <div className="glass rounded-3xl p-6 lg:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
              Sponsorship Package
            </p>
            <div className="mt-5 rounded-3xl border border-primary/20 bg-[linear-gradient(135deg,rgba(255,43,43,0.16),rgba(255,43,43,0.04)_60%,rgba(255,255,255,0.02))] p-6">
              <div className="grid gap-4">
                <PackageLine label="RAM" value="4GB" />
                <PackageLine label="CPU" value="100%" />
                <PackageLine label="SSD" value="30GB" />
                <PackageLine label="Billing" value="Free while requirements are maintained" />
              </div>
            </div>
            <div className="mt-5 rounded-2xl border border-white/8 bg-secondary/35 p-5 text-sm text-muted-foreground">
              To keep your sponsorship active, your server must promote RageNodes with a dedicated
              Discord channel, staff roles, spawn promotion, and RageNodes branding on TAB.
            </div>
            <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/8 p-5 text-sm text-primary">
              Sponsorships are manually reviewed. RageNodes may reject applications that do not meet
              quality, activity, or branding requirements.
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_1fr]">
          <section className="glass rounded-3xl p-6 lg:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
              Benefits
            </p>
            <div className="mt-5 grid gap-3">
              {[
                "Free Minecraft server hosting",
                "4GB RAM",
                "100% CPU",
                "30GB SSD",
                "RageNodes support",
                "Upgrade options later",
                "Partnership visibility",
              ].map((item) => (
                <ListRow key={item} text={item} />
              ))}
            </div>
          </section>

          <section className="glass rounded-3xl p-6 lg:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
              Requirements
            </p>
            <div className="mt-5 grid gap-3">
              {[
                "Dedicated RageNodes channel on your Discord",
                "Dedicated roles for RageNodes admins and staff",
                "RageNodes NPC, hologram, sign, or advertisement at spawn",
                "RageNodes displayed on TAB",
                "Active community or server",
                "No fake or botted community",
                "Staff must be able to verify the promotion",
              ].map((item) => (
                <ListRow key={item} text={item} />
              ))}
            </div>
          </section>
        </div>

        <section className="mt-8 glass rounded-3xl p-6 lg:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
                Your status
              </p>
              <h2 className="mt-2 text-3xl font-black uppercase">Sponsorship dashboard</h2>
            </div>
            {!session ? (
              <Link to="/login">
                <Button className="h-11 rounded-xl bg-primary px-5 font-bold">
                  Login with Discord
                </Button>
              </Link>
            ) : null}
          </div>

          {!isSupabaseConfigured ? (
            <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/8 p-4 text-sm text-primary">
              {SUPABASE_CONFIG_ERROR}
            </div>
          ) : loading ? (
            <div className="mt-6 flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Loading sponsorship state...
            </div>
          ) : !session ? (
            <div className="mt-5 rounded-2xl border border-white/8 bg-secondary/35 p-5 text-sm text-muted-foreground">
              Log in with Discord to apply and track your sponsorship review.
            </div>
          ) : !hasDiscordLogin ? (
            <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/8 p-5 text-sm text-primary">
              This section is Discord-only. You are currently signed in with another provider, so
              please continue with Discord before applying or opening a sponsorship ticket.
              <div className="mt-4">
                <Button
                  onClick={continueWithDiscord}
                  className="h-11 rounded-xl bg-primary px-5 font-bold"
                >
                  Continue with Discord
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-5 grid gap-4">
              <div className="grid gap-4 md:grid-cols-4">
                <StatusStat icon={Handshake} label="Applications" value={applications.length} />
                <StatusStat
                  icon={Sparkles}
                  label="Active"
                  value={
                    applications.filter((item) =>
                      [
                        "pending",
                        "ticket_opened",
                        "under_review",
                        "approved",
                        "changes_required",
                        "activated",
                      ].includes(item.status),
                    ).length
                  }
                />
                <StatusStat
                  icon={CheckCircle2}
                  label="Approved"
                  value={applications.filter((item) => item.status === "approved").length}
                />
                <StatusStat
                  icon={Users}
                  label="Activated"
                  value={applications.filter((item) => item.status === "activated").length}
                />
              </div>

              <div className="grid gap-4">
                {applications.length === 0 ? (
                  <div className="rounded-2xl border border-white/8 bg-secondary/35 p-5 text-sm text-muted-foreground">
                    No sponsorship applications yet. Submit one below and continue in Discord for
                    staff review.
                  </div>
                ) : (
                  applications.map((application) => {
                    const openTicket = application.sponsorship_tickets?.find(
                      (ticket) => ticket.status === "open",
                    );
                    return (
                      <div
                        key={application.id}
                        className="rounded-2xl border border-white/8 bg-secondary/30 p-5"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-black">{application.server_name}</h3>
                              <StatusPill status={application.status} />
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {application.server_type} • {application.minecraft_ip || "No IP yet"}{" "}
                              • submitted {new Date(application.created_at).toLocaleString()}
                            </p>
                            <p className="mt-3 text-sm text-muted-foreground">
                              {application.server_description}
                            </p>
                            {application.admin_notes ? (
                              <div className="mt-4 rounded-xl border border-primary/15 bg-primary/8 p-3 text-sm text-primary">
                                Staff notes: {application.admin_notes}
                              </div>
                            ) : null}
                          </div>

                          <div className="flex flex-col gap-2 lg:min-w-56">
                            <a href={discordUrl} target="_blank" rel="noreferrer">
                              <Button variant="outline" className="h-11 w-full rounded-xl">
                                Continue in Discord
                              </Button>
                            </a>
                            <Link to={buildSponsorshipSupportUrl(application)}>
                              <Button variant="outline" className="h-11 w-full rounded-xl">
                                Open Live Support
                              </Button>
                            </Link>
                            <Button
                              onClick={() => claimTicket(application.id)}
                              disabled={claiming === application.id || Boolean(openTicket)}
                              className="h-11 rounded-xl bg-primary font-bold"
                            >
                              {claiming === application.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : null}
                              {openTicket ? "Discord ticket open" : "Open Discord ticket"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </section>

        <section id="apply" className="mt-8 glass rounded-3xl p-6 lg:p-8">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
              Application form
            </p>
            <h2 className="mt-2 text-3xl font-black uppercase">Apply for sponsorship</h2>
            <p className="mt-3 max-w-3xl text-muted-foreground">
              This request is reviewed manually by staff. Keep the details clear so we can verify
              your community, your spawn promotion plan, and your Discord setup quickly.
            </p>
          </div>

          {!session ? (
            <div className="rounded-2xl border border-primary/15 bg-primary/8 p-5 text-primary">
              You need to log in with Discord before you can apply.
            </div>
          ) : !hasDiscordLogin ? (
            <div className="rounded-2xl border border-primary/15 bg-primary/8 p-5 text-primary">
              Sponsorship applications require a Discord login. Your current session is not linked
              through Discord yet.
              <div className="mt-4">
                <Button
                  onClick={continueWithDiscord}
                  className="h-11 rounded-xl bg-primary px-5 font-bold"
                >
                  Continue with Discord
                </Button>
              </div>
            </div>
          ) : activeApplication ? (
            <div className="rounded-2xl border border-primary/15 bg-primary/8 p-5 text-primary">
              You already have an active sponsorship request for{" "}
              <strong>{activeApplication.server_name}</strong>. Finish that review flow before
              opening another one.
            </div>
          ) : (
            <form onSubmit={submitApplication} className="grid gap-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field
                  label="Server name"
                  value={form.serverName}
                  onChange={(value) => setForm((current) => ({ ...current, serverName: value }))}
                  placeholder="Rage SMP"
                />
                <Field
                  label="Discord invite link"
                  value={form.discordInvite}
                  onChange={(value) => setForm((current) => ({ ...current, discordInvite: value }))}
                  placeholder="https://discord.gg/yourserver"
                />
                <Field
                  label="Minecraft server IP"
                  value={form.minecraftIp}
                  onChange={(value) => setForm((current) => ({ ...current, minecraftIp: value }))}
                  placeholder="play.example.net"
                />
                <Field
                  label="Server version"
                  value={form.serverVersion}
                  onChange={(value) => setForm((current) => ({ ...current, serverVersion: value }))}
                  placeholder="1.21.x"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <SelectField
                  label="Server type"
                  value={form.serverType}
                  options={serverTypes}
                  onChange={(value) => setForm((current) => ({ ...current, serverType: value }))}
                />
                <Field
                  label="Average player count"
                  type="number"
                  value={form.averagePlayers}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, averagePlayers: value }))
                  }
                  placeholder="25"
                />
                <Field
                  label="Discord member count"
                  type="number"
                  value={form.discordMembers}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, discordMembers: value }))
                  }
                  placeholder="400"
                />
              </div>

              <LongField
                label="Server description"
                value={form.serverDescription}
                onChange={(value) =>
                  setForm((current) => ({ ...current, serverDescription: value }))
                }
                placeholder="Tell us about your community, gameplay loop, goals, and what makes the server worth sponsoring."
              />
              <LongField
                label="Why do you want RageNodes sponsorship?"
                value={form.sponsorshipReason}
                onChange={(value) =>
                  setForm((current) => ({ ...current, sponsorshipReason: value }))
                }
                placeholder="Explain why your server is a good partnership fit for RageNodes."
              />
              <LongField
                label="Where will you place RageNodes promotion at spawn?"
                value={form.spawnPromotionPlan}
                onChange={(value) =>
                  setForm((current) => ({ ...current, spawnPromotionPlan: value }))
                }
                placeholder="NPC, hologram, sign wall, board, TAB slot, Discord channel, or another visible plan."
              />

              <div className="grid gap-4 md:grid-cols-2">
                <LongField
                  label="Screenshots or proof links"
                  value={form.proofLinks}
                  onChange={(value) => setForm((current) => ({ ...current, proofLinks: value }))}
                  placeholder="Paste screenshot URLs, galleries, or proof links if you already have them."
                  rows={4}
                />
                <LongField
                  label="Extra notes"
                  value={form.extraNotes}
                  onChange={(value) => setForm((current) => ({ ...current, extraNotes: value }))}
                  placeholder="Anything else staff should know before review."
                  rows={4}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <CheckField
                  label="Can you add RageNodes to TAB?"
                  checked={form.canAddRageNodesToTab}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({ ...current, canAddRageNodesToTab: checked }))
                  }
                />
                <CheckField
                  label="Can you create a dedicated Discord channel?"
                  checked={form.canCreateDedicatedChannel}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({ ...current, canCreateDedicatedChannel: checked }))
                  }
                />
                <CheckField
                  label="Can you give dedicated roles to RageNodes admins?"
                  checked={form.canCreateAdminRoles}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({ ...current, canCreateAdminRoles: checked }))
                  }
                />
                <CheckField
                  label="Can you add spawn promotion?"
                  checked={form.canAddSpawnPromotion}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({ ...current, canAddSpawnPromotion: checked }))
                  }
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-12 rounded-xl bg-gradient-to-r from-primary to-accent px-6 font-bold glow-red"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Apply for Sponsorship
                </Button>
                <a href={discordUrl} target="_blank" rel="noreferrer">
                  <Button type="button" variant="outline" className="h-12 rounded-xl px-6">
                    Continue in Discord
                  </Button>
                </a>
                <Link to={buildSponsorshipSupportUrl()}>
                  <Button type="button" variant="outline" className="h-12 rounded-xl px-6">
                    Open Live Support
                  </Button>
                </Link>
              </div>
            </form>
          )}
        </section>

        <section className="mt-8 glass rounded-3xl px-6 lg:px-8">
          <div className="py-6">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">FAQ</p>
            <h2 className="mt-2 text-3xl font-black uppercase">Sponsorship answers</h2>
          </div>
          <Accordion type="single" collapsible className="pb-3">
            <FaqItem
              value="free"
              question="Is sponsorship free?"
              answer="Yes, approved sponsorships receive free hosting with 4GB RAM, 100% CPU, and 30GB SSD."
            />
            <FaqItem
              value="promote"
              question="Do I need to promote RageNodes?"
              answer="Yes, you must add RageNodes branding to your Discord and Minecraft server."
            />
            <FaqItem
              value="time"
              question="How long does approval take?"
              answer="Applications are manually reviewed by staff inside Discord tickets."
            />
            <FaqItem
              value="remove"
              question="Can RageNodes remove my sponsorship?"
              answer="Yes, if requirements are removed, hidden, or abused, the sponsorship can be removed."
            />
          </Accordion>
        </section>
      </div>
    </section>
  );
}

function hasDiscordIdentity(session: Session | null) {
  if (!session?.user) return false;

  const user = session.user as Record<string, unknown>;
  const identities = Array.isArray(user.identities) ? user.identities : [];
  for (const identity of identities) {
    const record =
      typeof identity === "object" && identity !== null
        ? (identity as Record<string, unknown>)
        : {};
    if (String(record.provider || "") === "discord") {
      return true;
    }
  }

  const userMetadata =
    typeof user.user_metadata === "object" && user.user_metadata !== null
      ? (user.user_metadata as Record<string, unknown>)
      : {};
  const appMetadata =
    typeof user.app_metadata === "object" && user.app_metadata !== null
      ? (user.app_metadata as Record<string, unknown>)
      : {};
  const providers = Array.isArray(appMetadata.providers) ? appMetadata.providers : [];

  return Boolean(
    userMetadata.discord_id || providers.some((provider) => String(provider) === "discord"),
  );
}

function HighlightCard({ icon: Icon, title }: { icon: typeof Server; title: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-secondary/30 p-4">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm font-semibold">{title}</p>
    </div>
  );
}

function PackageLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/18 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

function ListRow({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-secondary/30 px-4 py-3">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span className="text-sm text-muted-foreground">{text}</span>
    </div>
  );
}

function StatusStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Server;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-secondary/30 p-4">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "border-primary/20 bg-primary/10 text-primary",
    ticket_opened: "border-sky-400/20 bg-sky-400/10 text-sky-200",
    under_review: "border-yellow-400/20 bg-yellow-400/10 text-yellow-200",
    approved: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    rejected: "border-white/10 bg-white/6 text-muted-foreground",
    changes_required: "border-orange-400/20 bg-orange-400/10 text-orange-200",
    activated: "border-emerald-400/25 bg-emerald-400/12 text-emerald-200",
    cancelled: "border-white/10 bg-white/6 text-muted-foreground",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status] || styles.pending}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
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
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 rounded-xl bg-background/70"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-xl border border-input bg-background/70 px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function LongField({
  label,
  value,
  onChange,
  placeholder,
  rows = 6,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows?: number;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="rounded-2xl bg-background/70"
      />
    </div>
  );
}

function CheckField({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-white/8 bg-secondary/30 p-4">
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(Boolean(value))}
        className="mt-0.5"
      />
      <span className="text-sm text-muted-foreground">{label}</span>
    </label>
  );
}

function FaqItem({ value, question, answer }: { value: string; question: string; answer: string }) {
  return (
    <AccordionItem value={value} className="border-border/50">
      <AccordionTrigger className="text-left">{question}</AccordionTrigger>
      <AccordionContent className="text-muted-foreground">{answer}</AccordionContent>
    </AccordionItem>
  );
}

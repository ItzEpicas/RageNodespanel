import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

type Env = Record<string, string | undefined>;

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
};

const sponsorshipStatuses = [
  "pending",
  "ticket_opened",
  "under_review",
  "approved",
  "rejected",
  "changes_required",
  "activated",
  "cancelled",
] as const;

const serverTypes = [
  "Survival",
  "Lifesteal",
  "BoxPvP",
  "Practice",
  "SkyBlock",
  "SMP",
  "Other",
] as const;

const activeSponsorshipStatuses = [
  "pending",
  "ticket_opened",
  "under_review",
  "approved",
  "changes_required",
  "activated",
] as const;

const applySchema = z.object({
  serverName: z.string().trim().min(2).max(120),
  discordInvite: z.string().trim().url().max(300),
  minecraftIp: z.string().trim().max(120).optional().default(""),
  serverVersion: z.string().trim().max(80).optional().default(""),
  serverType: z.enum(serverTypes),
  averagePlayers: z.coerce.number().int().min(0).max(100000),
  discordMembers: z.coerce.number().int().min(0).max(1000000),
  serverDescription: z.string().trim().min(10).max(3000),
  sponsorshipReason: z.string().trim().min(10).max(3000),
  spawnPromotionPlan: z.string().trim().min(3).max(1500),
  canAddRageNodesToTab: z.boolean(),
  canCreateDedicatedChannel: z.boolean(),
  canCreateAdminRoles: z.boolean(),
  canAddSpawnPromotion: z.boolean(),
  proofLinks: z.string().trim().max(2000).optional().default(""),
  extraNotes: z.string().trim().max(2000).optional().default(""),
});

const statusPatchSchema = z.object({
  status: z.enum(sponsorshipStatuses),
  note: z.string().trim().max(2000).optional().default(""),
});

const notesPatchSchema = z.object({
  adminNotes: z.string().trim().max(5000).optional().default(""),
  archived: z.boolean().optional(),
});

const claimSchema = z.object({
  applicationId: z.string().uuid().optional(),
  discordId: z.string().trim().max(40).optional(),
  guildId: z.string().trim().max(40).optional(),
});

const ticketCreatedSchema = z.object({
  applicationId: z.string().uuid(),
  channelId: z.string().trim().min(5).max(40),
  guildId: z.string().trim().max(40).optional().default(""),
  discordId: z.string().trim().max(40).optional().default(""),
});

export async function handleSponsorshipApi(
  request: Request,
  rawEnv: unknown,
): Promise<Response | null> {
  const url = new URL(request.url);
  const env = normalizeEnv(rawEnv);

  if (url.pathname === "/api/sponsorships/apply" && request.method === "POST") {
    return applyForSponsorship(request, env);
  }

  if (url.pathname === "/api/sponsorships/me" && request.method === "GET") {
    return listMySponsorships(request, env);
  }

  if (url.pathname === "/api/admin/sponsorships" && request.method === "GET") {
    return listAdminSponsorships(request, env, url);
  }

  const adminDetailsMatch = url.pathname.match(/^\/api\/admin\/sponsorships\/([^/]+)$/);
  if (adminDetailsMatch && request.method === "GET") {
    return getAdminSponsorship(request, env, adminDetailsMatch[1]);
  }

  const adminStatusMatch = url.pathname.match(/^\/api\/admin\/sponsorships\/([^/]+)\/status$/);
  if (adminStatusMatch && request.method === "PATCH") {
    return patchAdminSponsorshipStatus(request, env, adminStatusMatch[1]);
  }

  const adminNotesMatch = url.pathname.match(/^\/api\/admin\/sponsorships\/([^/]+)\/notes$/);
  if (adminNotesMatch && request.method === "PATCH") {
    return patchAdminSponsorshipNotes(request, env, adminNotesMatch[1]);
  }

  if (url.pathname === "/api/discord/claim-sponsorship" && request.method === "POST") {
    return claimSponsorshipTicket(request, env);
  }

  if (url.pathname === "/api/discord/sponsorship-ticket-created" && request.method === "POST") {
    return notifySponsorshipTicketCreated(request, env);
  }

  return null;
}

async function applyForSponsorship(request: Request, env: Env): Promise<Response> {
  const auth = await requireAuthenticatedUser(request, env);
  if ("error" in auth) return auth.error;
  if (!auth.discordId) {
    return json(
      {
        error:
          "Discord login is required for sponsorships. Log in with Discord first, then apply again.",
      },
      403,
    );
  }

  const payload = applySchema.safeParse(await safeJson(request));
  if (!payload.success) {
    return json({ error: payload.error.issues[0]?.message || "Invalid sponsorship data." }, 400);
  }

  const supabase = getServiceSupabase(env);
  if (!supabase) return missingConfig(env);

  const profileError = await ensureProfileRow(supabase, auth.user, auth.profile);
  if (profileError) return json({ error: profileError }, 500);

  const { data: existing } = await supabase
    .from("sponsorship_applications")
    .select("id, status, server_name, created_at")
    .eq("user_id", auth.userId)
    .in("status", [...activeSponsorshipStatuses])
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (existing?.length) {
    return json(
      {
        error: `You already have an active sponsorship request for ${existing[0].server_name}.`,
      },
      409,
    );
  }

  const values = payload.data;
  const { data, error } = await supabase
    .from("sponsorship_applications")
    .insert({
      user_id: auth.userId,
      discord_id: auth.discordId,
      discord_username: auth.discordUsername,
      server_name: values.serverName,
      discord_invite: values.discordInvite,
      minecraft_ip: values.minecraftIp || null,
      server_version: values.serverVersion || null,
      server_type: values.serverType,
      average_players: values.averagePlayers,
      discord_members: values.discordMembers,
      server_description: values.serverDescription,
      sponsorship_reason: values.sponsorshipReason,
      spawn_promotion_plan: values.spawnPromotionPlan,
      can_create_dedicated_channel: values.canCreateDedicatedChannel,
      can_create_admin_roles: values.canCreateAdminRoles,
      can_add_spawn_promotion: values.canAddSpawnPromotion,
      can_add_ragenodes_to_tab: values.canAddRageNodesToTab,
      proof_links: values.proofLinks || null,
      extra_notes: values.extraNotes || null,
      package_ram_gb: 4,
      package_cpu_percent: 100,
      package_ssd_gb: 30,
      status: "pending",
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("Could not create sponsorship application", error);
    return json({ error: explainSponsorshipDatabaseError(error) }, 500);
  }

  const discordInviteUrl = await getDiscordInviteUrl(supabase);
  return json({
    application: serializeApplication(data),
    continueInDiscordUrl: discordInviteUrl,
    canContinueInDiscord: Boolean(discordInviteUrl),
  });
}

async function listMySponsorships(request: Request, env: Env): Promise<Response> {
  const auth = await requireAuthenticatedUser(request, env);
  if ("error" in auth) return auth.error;

  const supabase = getServiceSupabase(env);
  if (!supabase) return missingConfig(env);

  const { data, error } = await supabase
    .from("sponsorship_applications")
    .select(
      "*, sponsorship_tickets(id, channel_id, guild_id, status, opened_at, closed_at, created_at)",
    )
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Could not load user sponsorships", error);
    return json({ error: explainSponsorshipDatabaseError(error) }, 500);
  }

  const applications = (data ?? []).map(serializeApplication);
  return json({
    applications,
    stats: {
      total: applications.length,
      active: applications.filter((item) =>
        activeSponsorshipStatuses.includes(
          item.status as (typeof activeSponsorshipStatuses)[number],
        ),
      ).length,
      approved: applications.filter((item) => item.status === "approved").length,
      activated: applications.filter((item) => item.status === "activated").length,
    },
  });
}

async function listAdminSponsorships(request: Request, env: Env, url: URL): Promise<Response> {
  const auth = await requireAdminUser(request, env);
  if ("error" in auth) return auth.error;

  const supabase = getServiceSupabase(env);
  if (!supabase) return missingConfig(env);

  const query = clean(url.searchParams.get("q"), 120);
  const status = clean(url.searchParams.get("status"), 40);
  const serverType = clean(url.searchParams.get("server_type"), 40);
  const discordId = clean(url.searchParams.get("discord_id"), 40);

  let builder = supabase
    .from("sponsorship_applications")
    .select(
      "*, profile:profiles!sponsorship_applications_user_id_fkey(id, full_name, username, email, avatar_url), sponsorship_tickets(id, channel_id, guild_id, status, opened_at, closed_at, created_at)",
    )
    .order("created_at", { ascending: false });

  if (status) builder = builder.eq("status", status);
  if (serverType) builder = builder.eq("server_type", serverType);
  if (discordId) builder = builder.ilike("discord_id", `%${discordId}%`);
  if (query) {
    const escaped = escapeLike(query);
    builder = builder.or(
      [
        `server_name.ilike.%${escaped}%`,
        `discord_username.ilike.%${escaped}%`,
        `discord_id.ilike.%${escaped}%`,
      ].join(","),
    );
  }

  const { data, error } = await builder;
  if (error) {
    console.error("Could not load admin sponsorships", error);
    return json({ error: explainSponsorshipDatabaseError(error) }, 500);
  }

  const applications = (data ?? []).map(serializeApplication);
  return json({
    applications,
    summary: {
      total: applications.length,
      pending: applications.filter((item) => item.status === "pending").length,
      ticketOpened: applications.filter((item) => item.status === "ticket_opened").length,
      underReview: applications.filter((item) => item.status === "under_review").length,
      approved: applications.filter((item) => item.status === "approved").length,
      rejected: applications.filter((item) => item.status === "rejected").length,
      activated: applications.filter((item) => item.status === "activated").length,
      active: applications.filter((item) => item.status === "activated").length,
    },
    admin: {
      userId: auth.userId,
    },
  });
}

async function getAdminSponsorship(
  request: Request,
  env: Env,
  applicationId: string,
): Promise<Response> {
  const auth = await requireAdminUser(request, env);
  if ("error" in auth) return auth.error;

  const supabase = getServiceSupabase(env);
  if (!supabase) return missingConfig(env);

  const { data, error } = await supabase
    .from("sponsorship_applications")
    .select(
      "*, profile:profiles!sponsorship_applications_user_id_fkey(id, full_name, username, email, avatar_url, metadata), sponsorship_tickets(*), sponsorship_status_logs(*)",
    )
    .eq("id", applicationId)
    .single();

  if (error || !data) {
    return json(
      {
        error: error
          ? explainSponsorshipDatabaseError(error)
          : "Sponsorship application not found.",
      },
      error ? 500 : 404,
    );
  }

  return json({ application: serializeApplication(data), adminUserId: auth.userId });
}

async function patchAdminSponsorshipStatus(
  request: Request,
  env: Env,
  applicationId: string,
): Promise<Response> {
  const auth = await requireAdminUser(request, env);
  if ("error" in auth) return auth.error;

  const payload = statusPatchSchema.safeParse(await safeJson(request));
  if (!payload.success) {
    return json({ error: payload.error.issues[0]?.message || "Invalid status update." }, 400);
  }

  const supabase = getServiceSupabase(env);
  if (!supabase) return missingConfig(env);

  const { data: current, error: loadError } = await supabase
    .from("sponsorship_applications")
    .select("id, status, admin_notes")
    .eq("id", applicationId)
    .single();

  if (loadError || !current) {
    return json({ error: "Sponsorship application not found." }, 404);
  }

  const updatePayload: Record<string, unknown> = {
    status: payload.data.status,
  };

  if (payload.data.note) {
    updatePayload.admin_notes = [current.admin_notes, payload.data.note]
      .filter(Boolean)
      .join("\n\n");
  }

  const { data: updated, error: updateError } = await supabase
    .from("sponsorship_applications")
    .update(updatePayload)
    .eq("id", applicationId)
    .select("*")
    .single();

  if (updateError || !updated) {
    console.error("Could not update sponsorship status", updateError);
    return json({ error: "Could not update sponsorship status." }, 500);
  }

  await supabase.from("sponsorship_status_logs").insert({
    sponsorship_application_id: applicationId,
    admin_user_id: auth.userId,
    old_status: current.status,
    new_status: payload.data.status,
    note: payload.data.note || null,
  });

  if (payload.data.status === "cancelled") {
    await supabase
      .from("sponsorship_tickets")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("sponsorship_application_id", applicationId)
      .eq("status", "open");
  }

  return json({ application: serializeApplication(updated) });
}

async function patchAdminSponsorshipNotes(
  request: Request,
  env: Env,
  applicationId: string,
): Promise<Response> {
  const auth = await requireAdminUser(request, env);
  if ("error" in auth) return auth.error;

  const payload = notesPatchSchema.safeParse(await safeJson(request));
  if (!payload.success) {
    return json({ error: payload.error.issues[0]?.message || "Invalid admin notes update." }, 400);
  }

  const supabase = getServiceSupabase(env);
  if (!supabase) return missingConfig(env);

  const updatePayload: Record<string, unknown> = {
    admin_notes: payload.data.adminNotes || null,
  };

  if (payload.data.archived === true) {
    updatePayload.archived_at = new Date().toISOString();
    updatePayload.archived_by = auth.userId;
  } else if (payload.data.archived === false) {
    updatePayload.archived_at = null;
    updatePayload.archived_by = null;
  }

  const { data, error } = await supabase
    .from("sponsorship_applications")
    .update(updatePayload)
    .eq("id", applicationId)
    .select("*")
    .single();

  if (error || !data) {
    console.error("Could not update sponsorship notes", error);
    return json({ error: "Could not update sponsorship notes." }, 500);
  }

  return json({ application: serializeApplication(data) });
}

async function claimSponsorshipTicket(request: Request, env: Env): Promise<Response> {
  const payload = claimSchema.safeParse(await safeJson(request));
  if (!payload.success) {
    return json(
      { error: payload.error.issues[0]?.message || "Invalid sponsorship claim payload." },
      400,
    );
  }

  const supabase = getServiceSupabase(env);
  if (!supabase) return missingConfig(env);

  const secretAuthorized = hasDiscordSecret(request, env);
  let application: Record<string, unknown> | null = null;

  if (secretAuthorized) {
    if (payload.data.applicationId) {
      application = await getApplicationById(supabase, payload.data.applicationId);
    } else if (payload.data.discordId) {
      application = await getLatestClaimableApplicationByDiscordId(
        supabase,
        payload.data.discordId,
      );
    }
  } else {
    const auth = await requireAuthenticatedUser(request, env);
    if ("error" in auth) return auth.error;
    if (payload.data.applicationId) {
      application = await getOwnedApplicationById(
        supabase,
        auth.userId,
        payload.data.applicationId,
      );
    } else {
      application = await getLatestClaimableApplicationByUserId(supabase, auth.userId);
    }
  }

  if (!application) {
    return json({ error: "No pending sponsorship application was found to claim." }, 404);
  }

  const ticket = await ensureSponsorshipTicket(
    env,
    supabase,
    application,
    payload.data.guildId || null,
  );
  if ("error" in ticket) return json({ error: ticket.error }, ticket.status || 500);

  return json({
    application: serializeApplication(ticket.application),
    ticket: ticket.ticket,
    created: ticket.created,
  });
}

async function notifySponsorshipTicketCreated(request: Request, env: Env): Promise<Response> {
  if (!hasDiscordSecret(request, env)) {
    return json({ error: "Unauthorized Discord integration request." }, 401);
  }

  const payload = ticketCreatedSchema.safeParse(await safeJson(request));
  if (!payload.success) {
    return json(
      { error: payload.error.issues[0]?.message || "Invalid ticket-created payload." },
      400,
    );
  }

  const supabase = getServiceSupabase(env);
  if (!supabase) return missingConfig(env);

  const now = new Date().toISOString();
  const values = payload.data;

  const { data: application, error: applicationError } = await supabase
    .from("sponsorship_applications")
    .update({ status: "ticket_opened" })
    .eq("id", values.applicationId)
    .select("*")
    .single();

  if (applicationError || !application) {
    return json({ error: "Sponsorship application was not found." }, 404);
  }

  const { data: ticket, error: ticketError } = await supabase
    .from("sponsorship_tickets")
    .upsert(
      {
        sponsorship_application_id: values.applicationId,
        user_id: application.user_id,
        discord_id: values.discordId || application.discord_id,
        guild_id: values.guildId || null,
        channel_id: values.channelId,
        status: "open",
        opened_at: now,
      },
      { onConflict: "sponsorship_application_id" },
    )
    .select("*")
    .single();

  if (ticketError || !ticket) {
    console.error("Could not save sponsorship ticket row", ticketError);
    return json({ error: "Could not save sponsorship ticket details." }, 500);
  }

  await supabase.from("sponsorship_status_logs").insert({
    sponsorship_application_id: application.id,
    old_status: application.status === "ticket_opened" ? null : application.status,
    new_status: "ticket_opened",
    note: `Discord sponsorship ticket linked: ${values.channelId}`,
  });

  return json({
    application: serializeApplication(application),
    ticket: ticket,
  });
}

async function ensureSponsorshipTicket(
  env: Env,
  supabase: ReturnType<typeof createClient>,
  application: Record<string, unknown>,
  guildIdOverride: string | null,
) {
  const existingOpenTicket = await supabase
    .from("sponsorship_tickets")
    .select("*")
    .eq("sponsorship_application_id", String(application.id))
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingOpenTicket.data) {
    return {
      application,
      ticket: existingOpenTicket.data,
      created: false,
    };
  }

  const discordResult = await createDiscordSponsorshipTicket(env, application, guildIdOverride);
  if ("error" in discordResult) return discordResult;

  const now = new Date().toISOString();
  const { data: updatedApplication, error: updateError } = await supabase
    .from("sponsorship_applications")
    .update({ status: "ticket_opened" })
    .eq("id", String(application.id))
    .select("*")
    .single();

  if (updateError || !updatedApplication) {
    console.error("Could not mark sponsorship ticket as opened", updateError);
    return { error: "Could not update sponsorship application status.", status: 500 };
  }

  const { data: ticket, error: ticketError } = await supabase
    .from("sponsorship_tickets")
    .insert({
      sponsorship_application_id: String(application.id),
      user_id: String(application.user_id),
      discord_id: String(application.discord_id),
      guild_id: discordResult.guildId || guildIdOverride || null,
      channel_id: discordResult.channelId,
      status: "open",
      opened_at: now,
    })
    .select("*")
    .single();

  if (ticketError || !ticket) {
    console.error("Could not insert sponsorship ticket", ticketError);
    return { error: "Could not save sponsorship ticket row.", status: 500 };
  }

  await supabase.from("sponsorship_status_logs").insert({
    sponsorship_application_id: String(application.id),
    old_status: String(application.status || "pending"),
    new_status: "ticket_opened",
    note: `Discord ticket opened: ${discordResult.channelId}`,
  });

  return {
    application: updatedApplication,
    ticket,
    created: true,
  };
}

async function createDiscordSponsorshipTicket(
  env: Env,
  application: Record<string, unknown>,
  guildIdOverride: string | null,
): Promise<{ channelId: string; guildId?: string } | { error: string; status?: number }> {
  const token = env.DISCORD_BOT_TOKEN;
  if (!token) {
    return { error: "Discord bot token is missing for sponsorship tickets.", status: 503 };
  }

  const guildId = guildIdOverride || env.DISCORD_GUILD_ID || "";
  const categoryId =
    env.DISCORD_SPONSORSHIP_CATEGORY_ID || env.DISCORD_TICKET_CATEGORY_ID || undefined;
  const logChannelId = env.DISCORD_SPONSORSHIP_CHANNEL_ID || env.DISCORD_TICKET_CHANNEL_ID;
  const channelName = formatSponsorshipChannelName(
    String(application.server_name || "sponsorship"),
    String(application.id || ""),
  );

  if (guildId && categoryId) {
    const channel = await discordApi(env, `/guilds/${guildId}/channels`, {
      method: "POST",
      body: {
        name: channelName,
        type: 0,
        parent_id: categoryId,
        topic: `RageNodes sponsorship application for ${String(application.server_name || "server")}`,
      },
    });

    if (!channel.ok) {
      return {
        error: `Discord sponsorship channel creation failed (${channel.status}).`,
        status: 502,
      };
    }

    const createdChannel = await channel.json();
    const channelId = String(createdChannel.id);
    const message = await postDiscordMessage(
      env,
      channelId,
      buildSponsorshipDiscordPayload(application),
    );
    if (!message.ok) {
      return { error: `Discord sponsorship message failed (${message.status}).`, status: 502 };
    }
    return { channelId, guildId };
  }

  if (logChannelId) {
    const message = await postDiscordMessage(
      env,
      logChannelId,
      buildSponsorshipDiscordPayload(application),
    );
    if (!message.ok) {
      return { error: `Discord sponsorship thread seed failed (${message.status}).`, status: 502 };
    }
    const seedMessage = await message.json();
    const thread = await discordApi(
      env,
      `/channels/${logChannelId}/messages/${seedMessage.id}/threads`,
      {
        method: "POST",
        body: {
          name: channelName,
          auto_archive_duration: 10080,
        },
      },
    );
    if (!thread.ok) {
      return {
        error: `Discord sponsorship thread creation failed (${thread.status}).`,
        status: 502,
      };
    }
    const createdThread = await thread.json();
    return { channelId: String(createdThread.id), guildId };
  }

  return { error: "Discord sponsorship destination is not configured.", status: 503 };
}

function buildSponsorshipDiscordPayload(application: Record<string, unknown>) {
  const applicantMention = looksLikeSnowflake(String(application.discord_id || ""))
    ? `<@${String(application.discord_id)}>`
    : String(application.discord_username || "Unknown");
  const yesNo = (value: unknown) => (value ? "Yes" : "No");

  return {
    content: "@everyone New sponsorship application.",
    allowed_mentions: {
      parse: ["everyone"],
    },
    embeds: [
      {
        title: "🤝 New Sponsorship Application",
        color: 0xef4444,
        fields: [
          {
            name: "Applicant",
            value: `${applicantMention}\nDiscord ID: ${String(application.discord_id || "Unknown")}`,
            inline: false,
          },
          {
            name: "Server Information",
            value: [
              `Server Name: ${String(application.server_name || "-")}`,
              `Minecraft IP: ${String(application.minecraft_ip || "-")}`,
              `Version: ${String(application.server_version || "-")}`,
              `Type: ${String(application.server_type || "-")}`,
              `Average Players: ${String(application.average_players ?? 0)}`,
              `Discord Members: ${String(application.discord_members ?? 0)}`,
              `Discord Invite: ${String(application.discord_invite || "-")}`,
            ].join("\n"),
            inline: false,
          },
          {
            name: "Requested Sponsorship Package",
            value: [
              `RAM: ${String(application.package_ram_gb ?? 4)}GB`,
              `CPU: ${String(application.package_cpu_percent ?? 100)}%`,
              `SSD: ${String(application.package_ssd_gb ?? 30)}GB`,
            ].join("\n"),
            inline: false,
          },
          {
            name: "Applicant Requirements",
            value: [
              `Dedicated RageNodes Channel: ${yesNo(application.can_create_dedicated_channel)}`,
              `Dedicated RageNodes Admin Roles: ${yesNo(application.can_create_admin_roles)}`,
              `Spawn NPC/Hologram/Ad: ${yesNo(application.can_add_spawn_promotion)}`,
              `RageNodes on TAB: ${yesNo(application.can_add_ragenodes_to_tab)}`,
            ].join("\n"),
            inline: false,
          },
          {
            name: "Description",
            value: truncate(String(application.server_description || "-"), 1024),
            inline: false,
          },
          {
            name: "Why they want sponsorship",
            value: truncate(String(application.sponsorship_reason || "-"), 1024),
            inline: false,
          },
          {
            name: "Status",
            value: "Waiting for staff review",
            inline: false,
          },
        ],
        footer: {
          text: `Application ID: ${String(application.id)}`,
        },
        timestamp: new Date().toISOString(),
      },
    ],
    components: buildSponsorshipDiscordButtons(String(application.id)),
  };
}

function buildSponsorshipDiscordButtons(applicationId: string) {
  return [
    {
      type: 1,
      components: [
        sponsorButton("Approve", "approved", applicationId, 3),
        sponsorButton("Reject", "rejected", applicationId, 4),
        sponsorButton("Request Changes", "changes_required", applicationId, 2),
        sponsorButton("Activate", "activated", applicationId, 1),
        sponsorButton("Close Ticket", "close_ticket", applicationId, 2),
      ],
    },
  ];
}

function sponsorButton(
  label: string,
  action: "approved" | "rejected" | "changes_required" | "activated" | "close_ticket",
  applicationId: string,
  style: number,
) {
  return {
    type: 2,
    style,
    label,
    custom_id: `sponsorship_status:${action}:${applicationId}`,
  };
}

async function requireAuthenticatedUser(request: Request, env: Env) {
  const token = getBearerToken(request);
  if (!token) {
    return { error: json({ error: "Authentication is required." }, 401) };
  }

  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return { error: json({ error: "Supabase authentication config is missing." }, 503) };
  }

  const userClient = createClient(url, key, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data.user) {
    return { error: json({ error: "Invalid session." }, 401) };
  }

  const supabase = getServiceSupabase(env);
  if (!supabase) return { error: missingConfig(env) };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();

  const discordIdentity = extractDiscordIdentity(data.user, profile);

  return {
    userClient,
    user: data.user,
    profile,
    token,
    userId: data.user.id,
    discordId: discordIdentity.discordId,
    discordUsername: discordIdentity.discordUsername,
  };
}

async function requireAdminUser(request: Request, env: Env) {
  const auth = await requireAuthenticatedUser(request, env);
  if ("error" in auth) return auth;

  const { data, error } = await auth.userClient.rpc("current_user_has_permission", {
    permission_key_to_check: "support.manage",
  });

  if (error || !data) {
    return { error: json({ error: "Admin permission is required." }, 403) };
  }

  return auth;
}

async function ensureProfileRow(
  supabase: ReturnType<typeof createClient>,
  user: Record<string, unknown>,
  existingProfile?: Record<string, unknown> | null,
) {
  if (existingProfile?.id) return null;

  const userMetadata = asRecord(user.user_metadata);
  const email =
    firstText(user.email, userMetadata.email, userMetadata.preferred_email, userMetadata.mail) ||
    "";

  const payload = {
    id: String(user.id || ""),
    email,
    billing_email: email,
    full_name:
      firstText(
        userMetadata.full_name,
        userMetadata.name,
        userMetadata.user_name,
        userMetadata.username,
      ) || null,
    username: firstText(userMetadata.username, userMetadata.user_name) || null,
    avatar_url: firstText(userMetadata.avatar_url, userMetadata.picture) || null,
    metadata: Object.keys(userMetadata).length ? userMetadata : {},
    last_seen_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
  if (!error) return null;

  console.error("Could not ensure profile row for sponsorship flow", error);
  return "Your account profile is not ready yet. Please re-login once and try again.";
}

function extractDiscordIdentity(
  user: Record<string, unknown>,
  profile?: Record<string, unknown> | null,
) {
  const userMetadata = asRecord(user.user_metadata);
  const profileMetadata = asRecord(profile?.metadata);
  const identities = Array.isArray(user.identities) ? user.identities : [];

  for (const identity of identities) {
    const identityRecord = asRecord(identity);
    if (String(identityRecord.provider || "") !== "discord") continue;
    const identityData = asRecord(identityRecord.identity_data);
    const discordId = firstSnowflake(
      identityRecord.id,
      identityData.provider_id,
      identityData.sub,
      identityData.id,
    );
    const discordUsername = firstText(
      identityData.preferred_username,
      identityData.user_name,
      identityData.username,
      identityData.name,
    );
    if (discordId) return { discordId, discordUsername };
  }

  return {
    discordId: firstSnowflake(
      userMetadata.provider_id,
      userMetadata.sub,
      userMetadata.discord_id,
      userMetadata.id,
      profileMetadata.provider_id,
      profileMetadata.sub,
      profileMetadata.discord_id,
    ),
    discordUsername: firstText(
      userMetadata.preferred_username,
      userMetadata.user_name,
      userMetadata.username,
      userMetadata.full_name,
      userMetadata.name,
      profile?.discord_username,
      profileMetadata.preferred_username,
      profileMetadata.user_name,
      profileMetadata.username,
      profileMetadata.name,
    ),
  };
}

async function getLatestClaimableApplicationByUserId(
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  const { data } = await supabase
    .from("sponsorship_applications")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["pending", "changes_required", "under_review", "ticket_opened"])
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as Record<string, unknown> | null;
}

async function getLatestClaimableApplicationByDiscordId(
  supabase: ReturnType<typeof createClient>,
  discordId: string,
) {
  const { data } = await supabase
    .from("sponsorship_applications")
    .select("*")
    .eq("discord_id", discordId)
    .in("status", ["pending", "changes_required", "under_review", "ticket_opened"])
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as Record<string, unknown> | null;
}

async function getApplicationById(
  supabase: ReturnType<typeof createClient>,
  applicationId: string,
) {
  const { data } = await supabase
    .from("sponsorship_applications")
    .select("*")
    .eq("id", applicationId)
    .maybeSingle();
  return data as Record<string, unknown> | null;
}

async function getOwnedApplicationById(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  applicationId: string,
) {
  const { data } = await supabase
    .from("sponsorship_applications")
    .select("*")
    .eq("id", applicationId)
    .eq("user_id", userId)
    .maybeSingle();
  return data as Record<string, unknown> | null;
}

function serializeApplication(row: Record<string, unknown>) {
  return {
    ...row,
    sponsorship_tickets: Array.isArray(row.sponsorship_tickets) ? row.sponsorship_tickets : [],
    sponsorship_status_logs: Array.isArray(row.sponsorship_status_logs)
      ? row.sponsorship_status_logs
      : [],
  };
}

async function getDiscordInviteUrl(supabase: ReturnType<typeof createClient>) {
  const { data } = await supabase
    .from("site_settings")
    .select("discord_invite_url")
    .eq("settings_key", "primary")
    .maybeSingle();
  return String(data?.discord_invite_url || "https://discord.gg/ragenodes");
}

function getServiceSupabase(env: Env) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function postDiscordMessage(env: Env, channelId: string, payload: Record<string, unknown>) {
  return discordApi(env, `/channels/${channelId}/messages`, {
    method: "POST",
    body: payload,
  });
}

async function discordApi(
  env: Env,
  path: string,
  init: { method: string; body?: Record<string, unknown> },
) {
  const token = env.DISCORD_BOT_TOKEN;
  if (!token) {
    return new Response("Missing DISCORD_BOT_TOKEN", { status: 503 });
  }

  return fetch(`https://discord.com/api/v10${path}`, {
    method: init.method,
    headers: {
      authorization: `Bot ${token}`,
      "content-type": "application/json",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
}

function formatSponsorshipChannelName(serverName: string, applicationId: string) {
  const slug = serverName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `sponsor-${slug || "server"}-${applicationId.slice(0, 6).toLowerCase()}`.slice(0, 95);
}

function normalizeEnv(rawEnv: unknown): Env {
  return {
    ...(typeof process !== "undefined" ? process.env : {}),
    ...((rawEnv && typeof rawEnv === "object" ? rawEnv : {}) as Env),
  };
}

async function safeJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function getBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length).trim() || null;
}

function hasDiscordSecret(request: Request, env: Env) {
  const expected = env.DISCORD_INTERNAL_API_SECRET || env.RAGENODES_DISCORD_SECRET;
  if (!expected) return false;
  const received =
    request.headers.get("x-ragenodes-discord-secret") || request.headers.get("x-discord-secret");
  return Boolean(received && received === expected);
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: jsonHeaders });
}

function missingConfig(env: Env) {
  const missing: string[] = [];
  if (!env.SUPABASE_URL && !env.VITE_SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!env.SUPABASE_SERVICE_ROLE_KEY && !env.SUPABASE_SERVICE_KEY && !env.SUPABASE_SECRET_KEY) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }
  return json(
    {
      error:
        missing.length > 0
          ? `Sponsorship API is missing server environment variables: ${missing.join(", ")}.`
          : "Sponsorship API server configuration is incomplete.",
    },
    503,
  );
}

function clean(value: unknown, max: number) {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

function truncate(value: string, max: number) {
  return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 3))}...`;
}

function escapeLike(value: string) {
  return value.replace(/[%_,]/g, (char) => `\\${char}`);
}

function firstSnowflake(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (/^[0-9]{15,22}$/.test(text)) return text;
  }
  return "";
}

function explainSponsorshipDatabaseError(error: unknown) {
  const code =
    typeof error === "object" && error && "code" in error ? String(error.code || "") : "";
  const message =
    typeof error === "object" && error && "message" in error ? String(error.message || "") : "";

  if (
    code === "PGRST205" ||
    (/sponsorship_applications/i.test(message) && /schema cache/i.test(message))
  ) {
    return "Sponsorship tables are not installed in Supabase yet. Run the sponsorship migration first.";
  }

  if (code === "23503" && /profiles/i.test(message)) {
    return "Your account profile was missing. Please log out, log back in with Discord, and try again.";
  }

  if (code === "23505") {
    return "You already have an active sponsorship request.";
  }

  return "Could not save the sponsorship application.";
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function looksLikeSnowflake(value: string) {
  return /^[0-9]{15,22}$/.test(value);
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

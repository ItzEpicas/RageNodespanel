import { createClient } from "@supabase/supabase-js";

type Env = Record<string, string | undefined>;

type TicketPayload = {
  name?: string;
  email?: string;
  discord?: string;
  subject?: string;
  category?: string;
  priority?: string;
  message?: string;
};

type MessagePayload = {
  token?: string;
  name?: string;
  message?: string;
};

type TicketAccessPayload = {
  token?: string;
  name?: string;
};

type SupportAttachment = {
  url: string;
  name?: string;
  content_type?: string;
  width?: number;
  height?: number;
  size?: number;
  kind?: "image" | "video" | "file" | "sticker" | "embed";
};

type DiscordCommandOption = {
  name: string;
  value?: string | number | boolean;
};

type DiscordInteractionPayload = {
  type?: number;
  data?: {
    name?: string;
    options?: DiscordCommandOption[];
    custom_id?: string;
    component_type?: number;
  };
  channel_id?: string;
  member?: {
    user?: {
      global_name?: string;
      username?: string;
    };
  };
  user?: {
    global_name?: string;
    username?: string;
  };
};

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
};

export async function handleSupportApi(
  request: Request,
  rawEnv: unknown,
): Promise<Response | null> {
  const url = new URL(request.url);
  const env = normalizeEnv(rawEnv);

  if (url.pathname === "/api/support/tickets" && request.method === "POST") {
    return createTicket(request, env);
  }

  const ticketMessagesMatch = url.pathname.match(/^\/api\/support\/tickets\/([^/]+)\/messages$/);
  if (ticketMessagesMatch && request.method === "GET") {
    return listTicketMessages(ticketMessagesMatch[1], url.searchParams.get("token"), env);
  }
  if (ticketMessagesMatch && request.method === "POST") {
    return createTicketMessage(ticketMessagesMatch[1], request, env);
  }

  const ticketCloseMatch = url.pathname.match(/^\/api\/support\/tickets\/([^/]+)\/close$/);
  if (ticketCloseMatch && request.method === "POST") {
    return closeTicket(ticketCloseMatch[1], request, env);
  }

  if (url.pathname === "/api/discord/interactions" && request.method === "POST") {
    return handleDiscordInteraction(request, env);
  }

  return null;
}

async function createTicket(request: Request, env: Env): Promise<Response> {
  const payload = (await safeJson(request)) as TicketPayload;
  const name = clean(payload.name, 80);
  const email = clean(payload.email, 160);
  const discord = clean(payload.discord, 80);
  const subject = clean(payload.subject, 120);
  const category = clean(payload.category || "General", 40);
  const priority = clean(payload.priority || "Normal", 20);
  const message = clean(payload.message, 2000);

  if (!name || !email || !subject || !message) {
    return json({ error: "Name, email, subject and message are required." }, 400);
  }

  const supabase = getSupabase(env);
  if (!supabase) return missingConfig(env);

  const accessToken = cryptoRandom(32);
  const accessTokenHash = await sha256(accessToken);
  const shortId = `RN-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  const { data: ticket, error: ticketError } = await supabase
    .from("support_tickets")
    .insert({
      short_id: shortId,
      access_token_hash: accessTokenHash,
      name,
      email,
      discord_username: discord,
      subject,
      category,
      priority,
      status: "open",
    })
    .select("*")
    .single();

  if (ticketError || !ticket) {
    console.error(ticketError);
    return json({ error: "Could not create support ticket." }, 500);
  }

  const { data: firstMessage, error: messageError } = await supabase
    .from("support_ticket_messages")
    .insert({
      ticket_id: ticket.id,
      author_type: "customer",
      author_name: name,
      message,
    })
    .select("*")
    .single();

  if (messageError || !firstMessage) {
    console.error(messageError);
    return json({ error: "Could not save support message." }, 500);
  }

  const discordResult = await createDiscordTicket(env, {
    id: ticket.id,
    shortId,
    name,
    email,
    discord,
    subject,
    category,
    priority,
    message,
  });

  if (discordResult.messageId || discordResult.threadId) {
    await supabase
      .from("support_tickets")
      .update({
        discord_message_id: discordResult.messageId,
        discord_thread_id: discordResult.threadId,
      })
      .eq("id", ticket.id);
  }

  return json({
    ticket: {
      id: ticket.id,
      shortId,
      subject,
      status: "open",
      category,
      priority,
      createdAt: ticket.created_at,
      closedAt: ticket.closed_at,
      transcript: extractLatestTranscript(ticket.metadata),
      token: accessToken,
    },
  });
}

async function listTicketMessages(
  ticketId: string,
  accessToken: string | null,
  env: Env,
): Promise<Response> {
  if (!accessToken) return json({ error: "Ticket token is required." }, 401);
  const supabase = getSupabase(env);
  if (!supabase) return missingConfig(env);

  const ticket = await getTicketByAccess(supabase, ticketId, accessToken);
  if (!ticket) return json({ error: "Ticket not found." }, 404);

  const { data, error } = await supabase
    .from("support_ticket_messages")
    .select("id, author_type, author_name, message, created_at, attachments, metadata")
    .eq("ticket_id", ticket.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    return json({ error: "Could not load messages." }, 500);
  }

  return json({
    ticket: {
      id: ticket.id,
      shortId: ticket.short_id,
      subject: ticket.subject,
      status: ticket.status,
      category: ticket.category,
      priority: ticket.priority,
      createdAt: ticket.created_at,
      closedAt: ticket.closed_at,
      transcript: extractLatestTranscript(ticket.metadata),
    },
    messages: data ?? [],
  });
}

async function createTicketMessage(
  ticketId: string,
  request: Request,
  env: Env,
): Promise<Response> {
  const payload = (await safeJson(request)) as MessagePayload;
  const accessToken = payload.token;
  const name = clean(payload.name || "Customer", 80);
  const message = clean(payload.message, 2000);

  if (!accessToken || !message)
    return json({ error: "Ticket token and message are required." }, 400);
  const supabase = getSupabase(env);
  if (!supabase) return missingConfig(env);

  const ticket = await getTicketByAccess(supabase, ticketId, accessToken);
  if (!ticket) return json({ error: "Ticket not found." }, 404);
  if (ticket.status === "closed") return json({ error: "Ticket is closed." }, 409);

  const { data, error } = await supabase
    .from("support_ticket_messages")
    .insert({
      ticket_id: ticket.id,
      author_type: "customer",
      author_name: name,
      message,
    })
    .select("id, author_type, author_name, message, created_at, attachments, metadata")
    .single();

  if (error || !data) {
    console.error(error);
    return json({ error: "Could not save message." }, 500);
  }

  await supabase
    .from("support_tickets")
    .update({
      status: "waiting_staff",
      closed_at: null,
      resolved_at: null,
    })
    .eq("id", ticket.id);

  await sendDiscordMessage(env, ticket.discord_thread_id || env.DISCORD_TICKET_CHANNEL_ID, {
    content: formatCustomerDiscordMessage(name, message),
  });

  return json({ message: data });
}

async function closeTicket(ticketId: string, request: Request, env: Env): Promise<Response> {
  const payload = (await safeJson(request)) as TicketAccessPayload;
  const accessToken = payload.token;
  const actorName = clean(payload.name || "Customer", 80);

  if (!accessToken) return json({ error: "Ticket token is required." }, 400);
  const supabase = getSupabase(env);
  if (!supabase) return missingConfig(env);

  const ticket = await getTicketByAccess(supabase, ticketId, accessToken);
  if (!ticket) return json({ error: "Ticket not found." }, 404);
  if (ticket.status === "closed") {
    return json({
      ok: true,
      ticket: {
        id: ticket.id,
        shortId: ticket.short_id,
        subject: ticket.subject,
        status: ticket.status,
        category: ticket.category,
        priority: ticket.priority,
        createdAt: ticket.created_at,
        closedAt: ticket.closed_at,
        transcript: extractLatestTranscript(ticket.metadata),
      },
    });
  }

  const transcript = await applyTicketStatusChange({
    env,
    supabase,
    ticket,
    nextStatus: "closed",
    actorName,
    actorType: "system",
  });

  return json({
    ok: true,
    ticket: {
      id: ticket.id,
      shortId: ticket.short_id,
      subject: ticket.subject,
      status: "closed",
      category: ticket.category,
      priority: ticket.priority,
      createdAt: ticket.created_at,
      closedAt: transcript?.closed_at ?? new Date().toISOString(),
      transcript,
    },
  });
}

async function handleDiscordInteraction(request: Request, env: Env): Promise<Response> {
  const bodyText = await request.text();
  const verified = await verifyDiscordRequest(request, bodyText, env);
  if (!verified) return json({ error: "Invalid Discord signature." }, 401);

  const payload = JSON.parse(bodyText) as DiscordInteractionPayload;
  if (payload.type === 1) return json({ type: 1 });

  const commandName = payload.data?.name;
  const componentId = payload.data?.custom_id;
  const options = payload.data?.options ?? [];
  const supabase = getSupabase(env);
  if (!supabase) {
    return discordEphemeral("Support API is missing Supabase env.");
  }

  if (payload.type === 3 && componentId) {
    return handleDiscordComponentInteraction(payload, env, supabase);
  }

  if (commandName === "support_reply") {
    const ticketRef = optionValue(options, "ticket");
    const message = clean(optionValue(options, "message"), 2000);
    const staffName =
      payload.member?.user?.global_name ||
      payload.member?.user?.username ||
      payload.user?.global_name ||
      payload.user?.username ||
      "Staff";
    if (!ticketRef || !message)
      return discordEphemeral("Usage: /support_reply ticket:<id> message:<text>");

    const ticket = await findTicket(supabase, ticketRef);
    if (!ticket) return discordEphemeral(`Ticket ${ticketRef} was not found.`);
    if (ticket.status === "closed") return discordEphemeral(`${ticket.short_id} is closed.`);

    await supabase.from("support_ticket_messages").insert({
      ticket_id: ticket.id,
      author_type: "staff",
      author_name: staffName,
      message,
    });

    await supabase
      .from("support_tickets")
      .update({
        status: "waiting_customer",
        closed_at: null,
        resolved_at: null,
      })
      .eq("id", ticket.id);

    return discordEphemeral(`Reply sent to ${ticket.short_id}.`);
  }

  if (commandName === "support_close") {
    const ticketRef = optionValue(options, "ticket");
    const staffName =
      payload.member?.user?.global_name ||
      payload.member?.user?.username ||
      payload.user?.global_name ||
      payload.user?.username ||
      "Staff";
    if (!ticketRef) return discordEphemeral("Usage: /support_close ticket:<id>");

    const ticket = await findTicket(supabase, ticketRef);
    if (!ticket) return discordEphemeral(`Ticket ${ticketRef} was not found.`);

    await applyTicketStatusChange({
      env,
      supabase,
      ticket,
      nextStatus: "closed",
      actorName: staffName,
      actorType: "staff",
    });

    return discordEphemeral(`${ticket.short_id} closed.`);
  }

  return discordEphemeral("Unknown support command.");
}

async function createDiscordTicket(
  env: Env,
  ticket: {
    id: string;
    shortId: string;
    name: string;
    email: string;
    discord: string;
    subject: string;
    category: string;
    priority: string;
    message: string;
  },
): Promise<{ messageId?: string; threadId?: string }> {
  const logChannelId = env.DISCORD_TICKET_CHANNEL_ID;
  const categoryId = env.DISCORD_TICKET_CATEGORY_ID;
  const guildId = env.DISCORD_GUILD_ID;
  if (!env.DISCORD_BOT_TOKEN) return {};

  const target = await resolveDiscordTicketTarget(env, { logChannelId, categoryId, guildId });

  if (target.mode === "category" && target.guildId) {
    const channel = await discordFetch(env, `/guilds/${target.guildId}/channels`, {
      method: "POST",
      body: {
        name: formatDiscordTicketChannelName(ticket.shortId, ticket.subject),
        type: 0,
        parent_id: target.categoryId,
        topic: truncate(
          `Ticket ${ticket.shortId} | Website ticket id: ${ticket.id} | ${ticket.email}`,
          1024,
        ),
      },
    });

    const ticketChannelId = channel?.id as string | undefined;
    let messageId: string | undefined;

    if (ticketChannelId) {
      const message = await discordFetch(env, `/channels/${ticketChannelId}/messages`, {
        method: "POST",
        body: {
          embeds: [buildDiscordTicketEmbed(ticket)],
          components: buildDiscordTicketControlComponents(ticket.shortId),
        },
      });

      messageId = message?.id as string | undefined;

      if (target.logChannelId && target.logChannelId !== ticketChannelId) {
        await sendDiscordMessage(env, target.logChannelId, {
          content: `New ticket **${ticket.shortId}** created in <#${ticketChannelId}>`,
        });
      }
    }

    return { messageId, threadId: ticketChannelId };
  }

  const channelId = target.channelId;
  if (!channelId) return {};

  const message = await discordFetch(env, `/channels/${channelId}/messages`, {
    method: "POST",
    body: {
      embeds: [buildDiscordTicketEmbed(ticket)],
      components: buildDiscordTicketControlComponents(ticket.shortId),
    },
  });

  const messageId = message?.id as string | undefined;
  let threadId: string | undefined;

  if (messageId && target.mode === "thread") {
    const thread = await discordFetch(env, `/channels/${channelId}/messages/${messageId}/threads`, {
      method: "POST",
      body: {
        name: `${ticket.shortId} ${truncate(ticket.subject, 60)}`,
        auto_archive_duration: 1440,
      },
    });
    threadId = thread?.id as string | undefined;
  }

  return { messageId, threadId };
}

async function handleDiscordComponentInteraction(
  payload: DiscordInteractionPayload,
  env: Env,
  supabase: ReturnType<typeof createClient>,
): Promise<Response> {
  const customId = payload.data?.custom_id ?? "";
  const staffName =
    payload.member?.user?.global_name ||
    payload.member?.user?.username ||
    payload.user?.global_name ||
    payload.user?.username ||
    "Staff";

  if (!customId.startsWith("support_status:")) {
    return discordEphemeral("Unknown support action.");
  }

  const [, nextStatus, ticketRef] = customId.split(":");
  if (!nextStatus || !ticketRef) {
    return discordEphemeral("Invalid support action payload.");
  }

  const ticket = await findTicket(supabase, ticketRef);
  if (!ticket) return discordEphemeral(`Ticket ${ticketRef} was not found.`);

  const validStatuses = new Set(["open", "waiting_customer", "resolved", "closed"]);
  if (!validStatuses.has(nextStatus)) {
    return discordEphemeral("Unsupported support status action.");
  }

  if (ticket.status === nextStatus) {
    return discordEphemeral(`${ticket.short_id} is already ${formatSupportStatus(nextStatus)}.`);
  }

  await applyTicketStatusChange({
    env,
    supabase,
    ticket,
    nextStatus,
    actorName: staffName,
    actorType: "staff",
  });

  return discordEphemeral(`${ticket.short_id} is now ${formatSupportStatus(nextStatus)}.`);
}

async function sendDiscordMessage(
  env: Env,
  channelId: string | undefined,
  payload: Record<string, unknown>,
) {
  if (!env.DISCORD_BOT_TOKEN || !channelId) return;
  await discordFetch(env, `/channels/${channelId}/messages`, {
    method: "POST",
    body: payload,
  });
}

async function discordFetch(
  env: Env,
  path: string,
  init: { method: string; body?: Record<string, unknown> },
) {
  const response = await fetch(`https://discord.com/api/v10${path}`, {
    method: init.method,
    headers: {
      authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      "content-type": "application/json",
    },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  });

  if (!response.ok) {
    console.error("Discord API error", response.status, await response.text());
    return null;
  }

  if (response.status === 204) return null;

  const responseText = await response.text();
  if (!responseText) return null;

  try {
    return JSON.parse(responseText);
  } catch {
    return responseText;
  }
}

async function getTicketByAccess(
  supabase: ReturnType<typeof createClient>,
  ticketId: string,
  token: string,
) {
  const tokenHash = await sha256(token);
  const { data } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("id", ticketId)
    .eq("access_token_hash", tokenHash)
    .maybeSingle();
  return data;
}

async function findTicket(supabase: ReturnType<typeof createClient>, ticketRef: string) {
  const query = supabase.from("support_tickets").select("*");
  if (ticketRef.startsWith("RN-")) {
    const { data } = await query.eq("short_id", ticketRef).maybeSingle();
    return data;
  }
  const { data } = await query.eq("id", ticketRef).maybeSingle();
  return data;
}

function getSupabase(env: Env) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function verifyDiscordRequest(request: Request, bodyText: string, env: Env) {
  const publicKey = env.DISCORD_INTERACTIONS_PUBLIC_KEY;
  if (!publicKey) return false;

  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");
  if (!signature || !timestamp) return false;

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      hexToBytes(publicKey),
      { name: "Ed25519", namedCurve: "Ed25519" } as EcKeyImportParams,
      false,
      ["verify"],
    );
    return crypto.subtle.verify(
      "Ed25519",
      key,
      hexToBytes(signature),
      new TextEncoder().encode(timestamp + bodyText),
    );
  } catch (error) {
    console.error("Discord signature verification failed", error);
    return false;
  }
}

function optionValue(options: DiscordCommandOption[], name: string): string {
  return String(options.find((option) => option.name === name)?.value ?? "");
}

function discordEphemeral(content: string) {
  return json({ type: 4, data: { content, flags: 64 } });
}

function normalizeEnv(rawEnv: unknown): Env {
  const env = {
    ...(typeof process !== "undefined" ? process.env : {}),
    ...((rawEnv && typeof rawEnv === "object" ? rawEnv : {}) as Env),
  };

  const publicKey = env.DISCORD_INTERACTIONS_PUBLIC_KEY;
  const applicationId = env.DISCORD_APPLICATION_ID;
  if (looksLikeSnowflake(publicKey) && looksLikeDiscordPublicKey(applicationId)) {
    env.DISCORD_INTERACTIONS_PUBLIC_KEY = applicationId;
    env.DISCORD_APPLICATION_ID = publicKey;
    console.warn(
      "Swapped DISCORD_INTERACTIONS_PUBLIC_KEY and DISCORD_APPLICATION_ID because they were reversed in the environment.",
    );
  }

  return env;
}

async function safeJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function clean(value: unknown, max: number) {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

function truncate(value: string, max: number) {
  return value.length <= max ? value : `${value.slice(0, max - 3)}...`;
}

function formatDiscordTicketChannelName(shortId: string, subject: string) {
  const normalizedSubject = subject
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);

  return `rn-${shortId.toLowerCase().replace(/^rn-/, "")}${normalizedSubject ? `-${normalizedSubject}` : ""}`.slice(
    0,
    100,
  );
}

function buildDiscordTicketEmbed(ticket: {
  id: string;
  shortId: string;
  name: string;
  email: string;
  discord: string;
  subject: string;
  category: string;
  priority: string;
  message: string;
}) {
  return {
    title: `New support ticket ${ticket.shortId}`,
    color: 0xff3030,
    fields: [
      { name: "Name", value: ticket.name || "-", inline: true },
      { name: "Email", value: ticket.email || "-", inline: true },
      { name: "Discord", value: ticket.discord || "-", inline: true },
      { name: "Category", value: ticket.category, inline: true },
      { name: "Priority", value: ticket.priority, inline: true },
      { name: "Subject", value: ticket.subject },
      { name: "Message", value: truncate(ticket.message, 1000) },
    ],
    footer: { text: `Website ticket id: ${ticket.id}` },
    timestamp: new Date().toISOString(),
  };
}

function buildDiscordTicketControlComponents(ticketRef: string) {
  return [
    {
      type: 1,
      components: [
        {
          type: 2,
          custom_id: `support_status:open:${ticketRef}`,
          label: "Open",
          style: 1,
        },
        {
          type: 2,
          custom_id: `support_status:waiting_customer:${ticketRef}`,
          label: "Waiting Customer",
          style: 2,
        },
        {
          type: 2,
          custom_id: `support_status:resolved:${ticketRef}`,
          label: "Resolved",
          style: 3,
        },
        {
          type: 2,
          custom_id: `support_status:closed:${ticketRef}`,
          label: "Close",
          style: 4,
        },
      ],
    },
  ];
}

async function applyTicketStatusChange({
  env,
  supabase,
  ticket,
  nextStatus,
  actorName,
  actorType,
}: {
  env: Env;
  supabase: ReturnType<typeof createClient>;
  ticket: {
    id: string;
    short_id: string;
    subject?: string;
    category?: string;
    priority?: string;
    name?: string;
    email?: string;
    created_at?: string;
    discord_thread_id?: string | null;
    status: string;
    metadata?: Record<string, unknown> | null;
  };
  nextStatus: string;
  actorName: string;
  actorType: "staff" | "system";
}): Promise<Record<string, unknown> | null> {
  const updatePayload: Record<string, string | null> = {
    status: nextStatus,
  };

  if (nextStatus === "closed") {
    updatePayload.closed_at = new Date().toISOString();
    updatePayload.resolved_at = null;
  } else if (nextStatus === "resolved") {
    updatePayload.resolved_at = new Date().toISOString();
    updatePayload.closed_at = null;
  } else {
    updatePayload.closed_at = null;
    updatePayload.resolved_at = null;
  }

  await supabase.from("support_tickets").update(updatePayload).eq("id", ticket.id);

  const systemMessage = buildSupportStatusSystemMessage(nextStatus, actorName);
  await supabase.from("support_ticket_messages").insert({
    ticket_id: ticket.id,
    author_type: actorType,
    author_name: actorType === "staff" ? actorName : "RageNodes",
    message: systemMessage,
  });

  let transcript: Record<string, unknown> | null = null;
  if (nextStatus === "closed") {
    transcript = await buildTicketTranscript(supabase, {
      ...ticket,
      closed_at: updatePayload.closed_at,
    });

    if (transcript) {
      const metadata = normalizeTicketMetadata(ticket.metadata);
      const transcriptHistory = Array.isArray(metadata.transcripts)
        ? metadata.transcripts.filter((entry) => entry && typeof entry === "object")
        : [];

      await supabase
        .from("support_tickets")
        .update({
          metadata: {
            ...metadata,
            last_transcript: transcript,
            transcripts: [...transcriptHistory, transcript],
          },
        })
        .eq("id", ticket.id);
    }

    await finalizeClosedTicketDiscordArtifacts(env, ticket, transcript);
    return transcript;
  }

  await sendDiscordMessage(env, ticket.discord_thread_id || env.DISCORD_TICKET_CHANNEL_ID, {
    content: `**${ticket.short_id}** ${systemMessage}`,
  });

  return transcript;
}

function buildSupportStatusSystemMessage(nextStatus: string, actorName: string) {
  if (nextStatus === "open") return `reopened by ${actorName}.`;
  if (nextStatus === "waiting_customer") return `marked as waiting for customer by ${actorName}.`;
  if (nextStatus === "resolved") return `marked as resolved by ${actorName}.`;
  if (nextStatus === "closed") return `closed by ${actorName}.`;
  return `updated by ${actorName}.`;
}

function formatSupportStatus(status: string) {
  if (status === "waiting_staff") return "waiting for staff";
  if (status === "waiting_customer") return "waiting for customer";
  return status.replace(/_/g, " ");
}

async function buildTicketTranscript(
  supabase: ReturnType<typeof createClient>,
  ticket: {
    id: string;
    short_id: string;
    subject?: string;
    category?: string;
    priority?: string;
    name?: string;
    email?: string;
    created_at?: string;
    closed_at?: string | null;
  },
) {
  const { data: messages, error } = await supabase
    .from("support_ticket_messages")
    .select("author_type, author_name, message, attachments, created_at")
    .eq("ticket_id", ticket.id)
    .order("created_at", { ascending: true });

  if (error || !messages) {
    console.error("Could not build support transcript", error);
    return null;
  }

  const transcriptLines = [
    `Ticket: ${ticket.short_id}`,
    `Subject: ${ticket.subject || "-"}`,
    `Category: ${ticket.category || "-"}`,
    `Priority: ${ticket.priority || "-"}`,
    `Customer: ${ticket.name || "-"}`,
    `Email: ${ticket.email || "-"}`,
    `Created: ${ticket.created_at || "-"}`,
    `Closed: ${ticket.closed_at || new Date().toISOString()}`,
    "",
  ];

  let attachmentsCount = 0;
  for (const message of messages) {
    transcriptLines.push(
      `[${message.created_at}] ${message.author_name} (${message.author_type})`,
      message.message || "(attachment only)",
    );

    const attachments = Array.isArray(message.attachments) ? message.attachments : [];
    if (attachments.length > 0) {
      transcriptLines.push("Attachments:");
      for (const attachment of attachments) {
        const attachmentName =
          attachment && typeof attachment === "object" && "name" in attachment
            ? String(attachment.name || "attachment")
            : "attachment";
        const attachmentUrl =
          attachment && typeof attachment === "object" && "url" in attachment
            ? String(attachment.url || "")
            : "";
        transcriptLines.push(`- ${attachmentName}${attachmentUrl ? `: ${attachmentUrl}` : ""}`);
        attachmentsCount += 1;
      }
    }

    transcriptLines.push("");
  }

  return {
    generated_at: new Date().toISOString(),
    closed_at: ticket.closed_at || new Date().toISOString(),
    filename: buildTranscriptFilename(ticket.short_id, ticket.subject || "ticket"),
    entry_count: messages.length,
    attachments_count: attachmentsCount,
    body: transcriptLines.join("\n").trim(),
  };
}

function buildTranscriptFilename(shortId: string, subject: string) {
  const safeSubject = subject
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `${shortId.toLowerCase()}${safeSubject ? `-${safeSubject}` : ""}-transcript.txt`;
}

function normalizeTicketMetadata(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function extractLatestTranscript(value: unknown) {
  const metadata = normalizeTicketMetadata(value);
  const transcript =
    metadata.last_transcript && typeof metadata.last_transcript === "object"
      ? metadata.last_transcript
      : null;

  return transcript as Record<string, unknown> | null;
}

async function finalizeClosedTicketDiscordArtifacts(
  env: Env,
  ticket: {
    id: string;
    short_id: string;
    subject?: string;
    category?: string;
    priority?: string;
    email?: string;
    discord_thread_id?: string | null;
  },
  transcript: Record<string, unknown> | null,
) {
  if (!env.DISCORD_BOT_TOKEN) return;

  const transcriptChannelId = getDiscordTranscriptChannelId(env);
  if (transcriptChannelId && transcript) {
    await sendDiscordTranscript(env, transcriptChannelId, ticket, transcript);
  }

  if (ticket.discord_thread_id) {
    await deleteDiscordChannel(env, ticket.discord_thread_id);
  }
}

async function sendDiscordTranscript(
  env: Env,
  channelId: string,
  ticket: {
    short_id: string;
    subject?: string;
    category?: string;
    priority?: string;
    email?: string;
  },
  transcript: Record<string, unknown>,
) {
  const body = typeof transcript.body === "string" ? transcript.body : "";
  const filename =
    typeof transcript.filename === "string"
      ? transcript.filename
      : `${ticket.short_id.toLowerCase()}-transcript.txt`;
  const closedAt =
    typeof transcript.closed_at === "string" ? transcript.closed_at : new Date().toISOString();

  const payload = {
    embeds: [
      {
        title: "Site Ticket Transcript",
        color: 0xff3030,
        fields: [
          { name: "Ticket", value: ticket.short_id, inline: true },
          { name: "Category", value: ticket.category || "-", inline: true },
          { name: "Priority", value: ticket.priority || "-", inline: true },
          { name: "Subject", value: truncate(ticket.subject || "-", 1024) },
          { name: "Email", value: ticket.email || "-" },
        ],
        footer: { text: `Closed at ${closedAt}` },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  const form = new FormData();
  form.set("payload_json", JSON.stringify(payload));
  form.set("files[0]", new Blob([body], { type: "text/plain;charset=utf-8" }), filename);

  const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
    },
    body: form,
  });

  if (!response.ok) {
    console.error("Discord transcript upload failed", response.status, await response.text());
  }
}

async function deleteDiscordChannel(env: Env, channelId: string) {
  await discordFetch(env, `/channels/${channelId}`, {
    method: "DELETE",
  });
}

function getDiscordTranscriptChannelId(env: Env) {
  return env.DISCORD_TRANSCRIPT_CHANNEL_ID || "1505956160640123131";
}

async function resolveDiscordTicketTarget(
  env: Env,
  options: {
    logChannelId?: string;
    categoryId?: string;
    guildId?: string;
  },
): Promise<
  | { mode: "category"; categoryId: string; guildId: string; logChannelId?: string }
  | { mode: "thread"; channelId: string }
  | { mode: "channel"; channelId: string }
  | { mode: "none" }
> {
  if (options.categoryId) {
    const category = await discordFetch(env, `/channels/${options.categoryId}`, {
      method: "GET",
    });
    return {
      mode: "category",
      categoryId: options.categoryId,
      guildId: String(category?.guild_id || options.guildId || ""),
      logChannelId:
        options.logChannelId && options.logChannelId !== options.categoryId
          ? options.logChannelId
          : undefined,
    };
  }

  if (options.logChannelId) {
    const existingTarget = await discordFetch(env, `/channels/${options.logChannelId}`, {
      method: "GET",
    });

    if (existingTarget?.type === 4 && (existingTarget.guild_id || options.guildId)) {
      return {
        mode: "category",
        categoryId: options.logChannelId,
        guildId: String(existingTarget.guild_id || options.guildId),
        logChannelId: undefined,
      };
    }

    return { mode: "thread", channelId: options.logChannelId };
  }

  return { mode: "none" };
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: jsonHeaders });
}

function missingConfig(env: Env) {
  const missing: string[] = [];
  if (!env.SUPABASE_URL && !env.VITE_SUPABASE_URL) {
    missing.push("SUPABASE_URL");
  }
  if (!env.SUPABASE_SERVICE_ROLE_KEY && !env.SUPABASE_SERVICE_KEY && !env.SUPABASE_SECRET_KEY) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  return json(
    {
      error:
        missing.length > 0
          ? `Support API is missing server environment variables: ${missing.join(", ")}. Publishable/anon keys are not enough for the support server API.`
          : "Support API server configuration is incomplete.",
    },
    503,
  );
}

function formatCustomerDiscordMessage(name: string, message: string) {
  return `**${name}**\n${message}`;
}

function looksLikeSnowflake(value: string | undefined) {
  return typeof value === "string" && /^[0-9]{17,20}$/.test(value);
}

function looksLikeDiscordPublicKey(value: string | undefined) {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
}

function cryptoRandom(bytes: number) {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return [...array].map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

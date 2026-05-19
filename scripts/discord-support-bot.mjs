import { createClient } from "@supabase/supabase-js";
import { ChannelType, Client, GatewayIntentBits, Partials } from "discord.js";
import { loadLocalEnv } from "./discord-support-env.mjs";

loadLocalEnv();

const token = process.env.DISCORD_BOT_TOKEN;
const supportChannelId = process.env.DISCORD_TICKET_CHANNEL_ID;
const supportCategoryId = process.env.DISCORD_TICKET_CATEGORY_ID;
const sponsorshipChannelId = process.env.DISCORD_SPONSORSHIP_CHANNEL_ID || supportChannelId;
const sponsorshipCategoryId =
  process.env.DISCORD_SPONSORSHIP_CATEGORY_ID || process.env.DISCORD_TICKET_CATEGORY_ID;
const guildId = process.env.DISCORD_GUILD_ID;
const transcriptChannelId = process.env.DISCORD_TRANSCRIPT_CHANNEL_ID || "1505956160640123131";
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!token || !supabaseUrl || !supabaseServiceRoleKey) {
  console.error(
    "Missing DISCORD_BOT_TOKEN, SUPABASE_URL/VITE_SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message],
});

client.once("clientReady", () => {
  console.log(`RageNodes support bot online as ${client.user?.tag}.`);
  void backfillRecentDiscordReplies();
});

client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;
    if (!message.guildId) return;
    if (!isTicketConversationChannel(message.channel)) return;

    const ticket = await findTicketForConversation(message.channel);
    if (!ticket || ticket.status === "closed") return;

    const payload = serializeDiscordStaffMessage(message);
    if (!payload.message && payload.attachments.length === 0) return;

    const authorName =
      message.member?.displayName || message.author.globalName || message.author.username;
    const { error } = await supabase.from("support_ticket_messages").insert({
      ticket_id: ticket.id,
      author_type: "staff",
      author_name: authorName,
      message: payload.message,
      attachments: payload.attachments,
      discord_message_id: message.id,
    });

    if (error) {
      console.error("Could not save Discord support reply", error);
      return;
    }

    await supabase
      .from("support_tickets")
      .update({
        status: "waiting_customer",
        closed_at: null,
        resolved_at: null,
      })
      .eq("id", ticket.id);

    console.log(`Saved Discord reply for ${ticket.short_id}.`);
  } catch (error) {
    console.error("Discord support bot message handler failed", error);
  }
});

client.on("guildMemberAdd", async (member) => {
  try {
    const application = await findLatestClaimableSponsorshipByDiscordId(member.id);
    if (!application) return;

    const ensured = await ensureSponsorshipConversation(application, member.guild.id);
    if (ensured?.created) {
      console.log(`Opened sponsorship ticket for ${application.server_name} after guild join.`);
    }
  } catch (error) {
    console.error("Discord sponsorship auto-claim on guild join failed", error);
  }
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      await handleChatInputCommand(interaction);
      return;
    }

    if (interaction.isButton()) {
      await handleButtonInteraction(interaction);
    }
  } catch (error) {
    console.error("Discord support interaction failed", error);

    if (!interaction.isRepliable()) return;
    const replyPayload = {
      content: "Support action failed. Check the bot logs and try again.",
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(replyPayload).catch(() => undefined);
      return;
    }

    await interaction.reply(replyPayload).catch(() => undefined);
  }
});

client.on("error", (error) => {
  console.error("Discord client error", error);
});

await client.login(token);

async function handleChatInputCommand(interaction) {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral: true });
  }

  const staffName = interaction.user.globalName || interaction.user.username || "Staff";

  if (interaction.commandName === "claim-sponsorship") {
    const application = await findLatestClaimableSponsorshipByDiscordId(interaction.user.id);

    if (!application) {
      await interaction.editReply({
        content: "No pending RageNodes sponsorship application was found for your Discord account.",
      });
      return;
    }

    const ticket = await ensureSponsorshipConversation(
      application,
      interaction.guildId || guildId || "",
    );
    if (!ticket) {
      await interaction.editReply({
        content: "Could not create the sponsorship ticket right now. Check bot permissions.",
      });
      return;
    }

    await interaction.editReply({
      content: ticket.created
        ? `Sponsorship ticket created for ${application.server_name}.`
        : `You already have an open sponsorship ticket for ${application.server_name}.`,
    });
    return;
  }

  if (interaction.commandName === "support_reply") {
    const ticketRef = interaction.options.getString("ticket", true).trim();
    const message = interaction.options.getString("message", true).trim().slice(0, 2000);
    const ticket = await findTicket(ticketRef);

    if (!ticket) {
      await interaction.editReply({ content: `Ticket ${ticketRef} was not found.` });
      return;
    }

    if (ticket.status === "closed") {
      await interaction.editReply({ content: `${ticket.short_id} is closed.` });
      return;
    }

    const { error } = await supabase.from("support_ticket_messages").insert({
      ticket_id: ticket.id,
      author_type: "staff",
      author_name: staffName,
      message,
    });

    if (error) {
      console.error("Could not save slash command support reply", error);
      await interaction.editReply({ content: "Could not save the reply." });
      return;
    }

    await supabase
      .from("support_tickets")
      .update({
        status: "waiting_customer",
        closed_at: null,
        resolved_at: null,
      })
      .eq("id", ticket.id);

    await interaction.editReply({ content: `Reply sent to ${ticket.short_id}.` });
    return;
  }

  if (interaction.commandName === "support_close") {
    const ticketRef = interaction.options.getString("ticket", true).trim();
    const ticket = await findTicket(ticketRef);

    if (!ticket) {
      await interaction.editReply({ content: `Ticket ${ticketRef} was not found.` });
      return;
    }

    await applyTicketStatusChange({
      ticket,
      nextStatus: "closed",
      actorName: staffName,
      actorType: "staff",
      channelId: interaction.channelId,
    });

    await interaction.editReply({ content: `${ticket.short_id} closed.` });
  }
}

async function handleButtonInteraction(interaction) {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral: true });
  }

  const customId = interaction.customId;
  if (customId.startsWith("sponsorship_status:")) {
    await handleSponsorshipButton(interaction);
    return;
  }

  if (!customId.startsWith("support_status:")) return;

  const [, nextStatus, ticketRef] = customId.split(":");
  if (!nextStatus || !ticketRef) {
    await interaction.editReply({ content: "Invalid support action payload." });
    return;
  }

  const validStatuses = new Set(["open", "waiting_customer", "resolved", "closed"]);
  if (!validStatuses.has(nextStatus)) {
    await interaction.editReply({ content: "Unsupported support status action." });
    return;
  }

  const ticket = await findTicket(ticketRef);
  if (!ticket) {
    await interaction.editReply({ content: `Ticket ${ticketRef} was not found.` });
    return;
  }

  if (ticket.status === nextStatus) {
    await interaction.editReply({
      content: `${ticket.short_id} is already ${formatSupportStatus(nextStatus)}.`,
    });
    return;
  }

  const staffName = interaction.user.globalName || interaction.user.username || "Staff";
  await applyTicketStatusChange({
    ticket,
    nextStatus,
    actorName: staffName,
    actorType: "staff",
    channelId: interaction.channelId,
  });

  await interaction.editReply({
    content: `${ticket.short_id} is now ${formatSupportStatus(nextStatus)}.`,
  });
}

async function backfillRecentDiscordReplies() {
  try {
    const { data: tickets, error } = await supabase
      .from("support_tickets")
      .select("id, short_id, status, discord_thread_id")
      .not("discord_thread_id", "is", null)
      .neq("status", "closed")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error || !tickets?.length) {
      if (error) console.error("Could not load support tickets for backfill", error);
      return;
    }

    let syncedMessages = 0;

    for (const ticket of tickets) {
      const channel = await client.channels.fetch(ticket.discord_thread_id).catch(() => null);
      if (!channel?.isTextBased?.() || !("messages" in channel)) continue;

      const recentMessages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
      if (!recentMessages?.size) continue;

      const staffMessages = [...recentMessages.values()]
        .filter((message) => !message.author.bot)
        .sort((left, right) => left.createdTimestamp - right.createdTimestamp);
      if (!staffMessages.length) continue;

      const messageIds = staffMessages.map((message) => message.id);
      const { data: existingRows, error: existingError } = await supabase
        .from("support_ticket_messages")
        .select("discord_message_id")
        .in("discord_message_id", messageIds);

      if (existingError) {
        console.error(`Could not inspect existing replies for ${ticket.short_id}`, existingError);
        continue;
      }

      const existingIds = new Set(
        (existingRows ?? [])
          .map((row) => row.discord_message_id)
          .filter((value) => typeof value === "string" && value.length > 0),
      );

      let insertedForTicket = 0;
      for (const message of staffMessages) {
        if (existingIds.has(message.id)) continue;

        const payload = serializeDiscordStaffMessage(message);
        if (!payload.message && payload.attachments.length === 0) continue;

        const authorName =
          message.member?.displayName || message.author.globalName || message.author.username;
        const { error: insertError } = await supabase.from("support_ticket_messages").insert({
          ticket_id: ticket.id,
          author_type: "staff",
          author_name: authorName,
          message: payload.message,
          attachments: payload.attachments,
          discord_message_id: message.id,
        });

        if (insertError) {
          console.error(`Could not backfill Discord reply for ${ticket.short_id}`, insertError);
          continue;
        }

        insertedForTicket += 1;
        syncedMessages += 1;
      }

      if (insertedForTicket > 0) {
        await supabase
          .from("support_tickets")
          .update({
            status: "waiting_customer",
            closed_at: null,
            resolved_at: null,
          })
          .eq("id", ticket.id);
      }
    }

    if (syncedMessages > 0) {
      console.log(`Backfilled ${syncedMessages} Discord support message(s) into Supabase.`);
    }
  } catch (error) {
    console.error("Support bot backfill failed", error);
  }
}

async function findTicketForConversation(channel) {
  const channelName = typeof channel?.name === "string" ? channel.name : "";
  const channelId = channel?.id;
  const channelTopic = typeof channel?.topic === "string" ? channel.topic : "";

  if (!channelId) return null;

  const { data: ticketByThread } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("discord_thread_id", channelId)
    .maybeSingle();

  if (ticketByThread) return ticketByThread;

  const shortId =
    channelName.match(/RN-[A-Z0-9]+/i)?.[0]?.toUpperCase() ||
    channelTopic.match(/RN-[A-Z0-9]+/i)?.[0]?.toUpperCase();
  if (!shortId) return null;

  return findTicket(shortId);
}

async function findTicket(ticketRef) {
  const query = supabase.from("support_tickets").select("*");
  if (ticketRef.startsWith("RN-")) {
    const { data } = await query.eq("short_id", ticketRef).maybeSingle();
    return data;
  }

  const { data } = await query.eq("id", ticketRef).maybeSingle();
  return data;
}

function isTicketConversationChannel(channel) {
  if (!channel?.isTextBased?.()) return false;

  if (channel?.isThread?.()) {
    return supportChannelId ? channel.parentId === supportChannelId : true;
  }

  if (supportCategoryId && channel.parentId === supportCategoryId) {
    return true;
  }

  const channelName = typeof channel?.name === "string" ? channel.name : "";
  const channelTopic = typeof channel?.topic === "string" ? channel.topic : "";
  if (
    channelName.startsWith("rn-") ||
    channelName.startsWith("ticket-rn-") ||
    /ticket\s+rn-[a-z0-9]+/i.test(channelTopic)
  ) {
    return true;
  }

  return false;
}

function formatStaffMessage(message) {
  return message.content.trim().slice(0, 2000);
}

function serializeDiscordStaffMessage(message) {
  return {
    message: formatStaffMessage(message),
    attachments: buildDiscordAttachments(message),
  };
}

function buildDiscordAttachments(message) {
  const seen = new Set();
  const records = [];

  for (const attachment of message.attachments.values()) {
    if (!attachment.url || seen.has(attachment.url)) continue;
    seen.add(attachment.url);
    records.push({
      url: attachment.url,
      name: attachment.name || "attachment",
      content_type: attachment.contentType || null,
      width: attachment.width || null,
      height: attachment.height || null,
      size: attachment.size || null,
      kind: attachment.contentType?.startsWith("image/")
        ? "image"
        : attachment.contentType?.startsWith("video/")
          ? "video"
          : "file",
    });
  }

  for (const embed of message.embeds) {
    const imageUrl = embed.image?.url || embed.thumbnail?.url || embed.video?.url || null;
    if (!imageUrl || seen.has(imageUrl)) continue;
    seen.add(imageUrl);
    records.push({
      url: imageUrl,
      name: embed.title || embed.provider?.name || "embed",
      content_type: embed.image?.proxyURL?.endsWith(".gif") ? "image/gif" : null,
      width: embed.image?.width || embed.thumbnail?.width || null,
      height: embed.image?.height || embed.thumbnail?.height || null,
      size: null,
      kind: embed.video?.url ? "video" : "embed",
    });
  }

  for (const sticker of message.stickers.values()) {
    const stickerUrl = sticker.url;
    if (!stickerUrl || seen.has(stickerUrl)) continue;
    seen.add(stickerUrl);
    records.push({
      url: stickerUrl,
      name: sticker.name || "sticker",
      content_type: "image/png",
      width: null,
      height: null,
      size: null,
      kind: "sticker",
    });
  }

  return records;
}

async function applyTicketStatusChange({ ticket, nextStatus, actorName, actorType, channelId }) {
  const updatePayload = { status: nextStatus };

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

  if (nextStatus === "closed") {
    const transcript = await buildTicketTranscript({
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

    await finalizeClosedTicketDiscordArtifacts({
      ticket,
      transcript,
    });
    return;
  }

  const destinationChannelId = channelId || ticket.discord_thread_id || supportChannelId;
  await sendDiscordMessage(destinationChannelId, {
    content: `**${ticket.short_id}** ${systemMessage}`,
  });
}

function buildSupportStatusSystemMessage(nextStatus, actorName) {
  if (nextStatus === "open") return `reopened by ${actorName}.`;
  if (nextStatus === "waiting_customer") return `marked as waiting for customer by ${actorName}.`;
  if (nextStatus === "resolved") return `marked as resolved by ${actorName}.`;
  if (nextStatus === "closed") return `closed by ${actorName}.`;
  return `updated by ${actorName}.`;
}

function formatSupportStatus(status) {
  if (status === "waiting_staff") return "waiting for staff";
  if (status === "waiting_customer") return "waiting for customer";
  return status.replace(/_/g, " ");
}

async function buildTicketTranscript(ticket) {
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

function buildTranscriptFilename(shortId, subject) {
  const safeSubject = subject
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `${shortId.toLowerCase()}${safeSubject ? `-${safeSubject}` : ""}-transcript.txt`;
}

function normalizeTicketMetadata(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

async function finalizeClosedTicketDiscordArtifacts({ ticket, transcript }) {
  if (transcriptChannelId && transcript) {
    await sendDiscordTranscriptLog({
      ticket,
      transcript,
    });
  }

  if (ticket.discord_thread_id) {
    const ticketChannel = await client.channels.fetch(ticket.discord_thread_id).catch(() => null);
    if (ticketChannel && "delete" in ticketChannel) {
      await ticketChannel.delete("Support ticket closed").catch((error) => {
        console.error(`Could not delete closed support channel ${ticket.discord_thread_id}`, error);
      });
    }
  }
}

async function sendDiscordTranscriptLog({ ticket, transcript }) {
  const transcriptChannel = await client.channels.fetch(transcriptChannelId).catch(() => null);
  if (!transcriptChannel?.isTextBased?.()) {
    console.error(`Discord transcript channel ${transcriptChannelId} is unavailable.`);
    return;
  }

  const body = typeof transcript.body === "string" ? transcript.body : "";
  const filename =
    typeof transcript.filename === "string"
      ? transcript.filename
      : `${ticket.short_id.toLowerCase()}-transcript.txt`;
  const closedAt =
    typeof transcript.closed_at === "string" ? transcript.closed_at : new Date().toISOString();

  await transcriptChannel
    .send({
      embeds: [
        {
          title: "Site Ticket Transcript",
          color: 0xff3030,
          fields: [
            { name: "Ticket", value: ticket.short_id, inline: true },
            { name: "Category", value: ticket.category || "-", inline: true },
            { name: "Priority", value: ticket.priority || "-", inline: true },
            { name: "Subject", value: truncateForDiscord(ticket.subject || "-", 1024) },
            { name: "Email", value: ticket.email || "-" },
          ],
          footer: { text: `Closed at ${closedAt}` },
          timestamp: new Date().toISOString(),
        },
      ],
      files: [
        {
          attachment: Buffer.from(body, "utf8"),
          name: filename,
        },
      ],
    })
    .catch((error) => {
      console.error(`Could not post support transcript for ${ticket.short_id}`, error);
    });
}

function truncateForDiscord(value, max) {
  return value.length <= max ? value : `${value.slice(0, max - 3)}...`;
}

async function sendDiscordMessage(channelId, payload) {
  if (!channelId) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased?.()) return;

  await channel.send(payload).catch((error) => {
    console.error(`Could not send support bot message to channel ${channelId}`, error);
  });
}

async function handleSponsorshipButton(interaction) {
  const [, action, applicationId] = interaction.customId.split(":");
  if (!action || !applicationId) {
    await interaction.editReply({ content: "Invalid sponsorship action." });
    return;
  }

  const { data: application } = await supabase
    .from("sponsorship_applications")
    .select("*")
    .eq("id", applicationId)
    .maybeSingle();

  if (!application) {
    await interaction.editReply({ content: "Sponsorship application not found." });
    return;
  }

  const actorName = interaction.user.globalName || interaction.user.username || "Staff";

  if (action === "close_ticket") {
    await closeSponsorshipTicket(applicationId);
    await interaction.editReply({
      content: `Closed the sponsorship ticket for ${application.server_name}.`,
    });
    return;
  }

  const statusMap = new Set(["approved", "rejected", "changes_required", "activated"]);
  if (!statusMap.has(action)) {
    await interaction.editReply({ content: "Unsupported sponsorship action." });
    return;
  }

  await updateSponsorshipStatus({
    applicationId,
    nextStatus: action,
    actorName,
    adminUserId: null,
    note: `Updated from Discord by ${actorName}.`,
  });

  await interaction.editReply({
    content: `${application.server_name} is now ${action.replace(/_/g, " ")}.`,
  });
}

async function findLatestClaimableSponsorshipByDiscordId(discordId) {
  const { data } = await supabase
    .from("sponsorship_applications")
    .select("*")
    .eq("discord_id", discordId)
    .in("status", ["pending", "ticket_opened", "under_review", "changes_required"])
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

async function ensureSponsorshipConversation(application, guildIdOverride = "") {
  const { data: existingOpenTicket } = await supabase
    .from("sponsorship_tickets")
    .select("*")
    .eq("sponsorship_application_id", application.id)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingOpenTicket) {
    return { created: false, ticket: existingOpenTicket };
  }

  const guild = guildIdOverride
    ? await client.guilds.fetch(guildIdOverride).catch(() => null)
    : guildId
      ? await client.guilds.fetch(guildId).catch(() => null)
      : null;

  let conversationChannel = null;

  if (guild && sponsorshipCategoryId) {
    conversationChannel = await guild.channels
      .create({
        name: formatSponsorshipChannelName(application.server_name, application.id),
        type: ChannelType.GuildText,
        parent: sponsorshipCategoryId,
        topic: `RageNodes sponsorship application ${application.id} for ${application.server_name}`,
        reason: "RageNodes sponsorship application",
      })
      .catch((error) => {
        console.error("Could not create sponsorship text channel", error);
        return null;
      });
  }

  if (!conversationChannel && sponsorshipChannelId) {
    const parentChannel = await client.channels.fetch(sponsorshipChannelId).catch(() => null);
    if (parentChannel?.isTextBased?.() && "threads" in parentChannel) {
      const seed = await parentChannel
        .send(buildSponsorshipMessagePayload(application))
        .catch((error) => {
          console.error("Could not post sponsorship seed message", error);
          return null;
        });

      if (seed) {
        conversationChannel = await seed.startThread({
          name: formatSponsorshipChannelName(application.server_name, application.id),
          autoArchiveDuration: 10080,
          reason: "RageNodes sponsorship application",
        });
      }
    }
  }

  if (!conversationChannel) return null;

  if (!conversationChannel.isThread?.()) {
    await conversationChannel.send(buildSponsorshipMessagePayload(application)).catch((error) => {
      console.error("Could not send sponsorship channel intro", error);
    });
  }

  const now = new Date().toISOString();
  const { data: ticket, error: ticketError } = await supabase
    .from("sponsorship_tickets")
    .insert({
      sponsorship_application_id: application.id,
      user_id: application.user_id,
      discord_id: application.discord_id,
      guild_id: guild?.id || guildIdOverride || guildId || null,
      channel_id: conversationChannel.id,
      status: "open",
      opened_at: now,
    })
    .select("*")
    .single();

  if (ticketError || !ticket) {
    console.error("Could not save sponsorship ticket row", ticketError);
    return null;
  }

  await updateSponsorshipStatus({
    applicationId: application.id,
    nextStatus: "ticket_opened",
    actorName: "RageNodes Bot",
    adminUserId: null,
    note: `Discord ticket opened in ${conversationChannel.id}.`,
  });

  return { created: true, ticket };
}

function buildSponsorshipMessagePayload(application) {
  const applicantMention = /^[0-9]{15,22}$/.test(String(application.discord_id || ""))
    ? `<@${application.discord_id}>`
    : application.discord_username || "Unknown";
  const yesNo = (value) => (value ? "Yes" : "No");

  return {
    embeds: [
      {
        title: "🤝 New Sponsorship Application",
        color: 0xef4444,
        fields: [
          {
            name: "Applicant",
            value: `${applicantMention}\nDiscord ID: ${application.discord_id || "Unknown"}`,
          },
          {
            name: "Server Information",
            value: [
              `Server Name: ${application.server_name || "-"}`,
              `Minecraft IP: ${application.minecraft_ip || "-"}`,
              `Version: ${application.server_version || "-"}`,
              `Type: ${application.server_type || "-"}`,
              `Average Players: ${application.average_players ?? 0}`,
              `Discord Members: ${application.discord_members ?? 0}`,
              `Discord Invite: ${application.discord_invite || "-"}`,
            ].join("\n"),
          },
          {
            name: "Requested Sponsorship Package",
            value: [
              `RAM: ${application.package_ram_gb ?? 4}GB`,
              `CPU: ${application.package_cpu_percent ?? 100}%`,
              `SSD: ${application.package_ssd_gb ?? 30}GB`,
            ].join("\n"),
          },
          {
            name: "Applicant Requirements",
            value: [
              `Dedicated RageNodes Channel: ${yesNo(application.can_create_dedicated_channel)}`,
              `Dedicated RageNodes Admin Roles: ${yesNo(application.can_create_admin_roles)}`,
              `Spawn NPC/Hologram/Ad: ${yesNo(application.can_add_spawn_promotion)}`,
              `RageNodes on TAB: ${yesNo(application.can_add_ragenodes_to_tab)}`,
            ].join("\n"),
          },
          {
            name: "Description",
            value: truncateForDiscord(application.server_description || "-", 1024),
          },
          {
            name: "Why they want sponsorship",
            value: truncateForDiscord(application.sponsorship_reason || "-", 1024),
          },
          {
            name: "Status",
            value: "Waiting for staff review",
          },
        ],
        footer: {
          text: `Application ID: ${application.id}`,
        },
        timestamp: new Date().toISOString(),
      },
    ],
    components: [
      {
        type: 1,
        components: [
          sponsorshipButton("Approve sponsorship", "approved", application.id, 3),
          sponsorshipButton("Reject sponsorship", "rejected", application.id, 4),
          sponsorshipButton("Request changes", "changes_required", application.id, 2),
          sponsorshipButton("Mark activated", "activated", application.id, 1),
          sponsorshipButton("Close ticket", "close_ticket", application.id, 2),
        ],
      },
    ],
  };
}

function sponsorshipButton(label, action, applicationId, style) {
  return {
    type: 2,
    style,
    label,
    custom_id: `sponsorship_status:${action}:${applicationId}`,
  };
}

function formatSponsorshipChannelName(serverName, applicationId) {
  const slug = String(serverName || "sponsorship")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return `sponsor-${slug || "server"}-${String(applicationId).slice(0, 6).toLowerCase()}`.slice(
    0,
    90,
  );
}

async function updateSponsorshipStatus({
  applicationId,
  nextStatus,
  actorName,
  adminUserId,
  note,
}) {
  const { data: current } = await supabase
    .from("sponsorship_applications")
    .select("id, status, server_name")
    .eq("id", applicationId)
    .maybeSingle();

  if (!current) return null;

  const { data: updated } = await supabase
    .from("sponsorship_applications")
    .update({ status: nextStatus })
    .eq("id", applicationId)
    .select("*")
    .single();

  await supabase.from("sponsorship_status_logs").insert({
    sponsorship_application_id: applicationId,
    admin_user_id: adminUserId,
    old_status: current.status,
    new_status: nextStatus,
    note: note || `Updated by ${actorName}.`,
  });

  const { data: openTicket } = await supabase
    .from("sponsorship_tickets")
    .select("*")
    .eq("sponsorship_application_id", applicationId)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (openTicket?.channel_id) {
    const channel = await client.channels.fetch(openTicket.channel_id).catch(() => null);
    if (channel?.isTextBased?.()) {
      await channel
        .send(`**${current.server_name}** is now **${nextStatus.replace(/_/g, " ")}**.`)
        .catch(() => undefined);
    }
  }

  return updated;
}

async function closeSponsorshipTicket(applicationId) {
  const now = new Date().toISOString();
  const { data: openTicket } = await supabase
    .from("sponsorship_tickets")
    .update({ status: "closed", closed_at: now })
    .eq("sponsorship_application_id", applicationId)
    .eq("status", "open")
    .select("*")
    .single();

  if (openTicket?.channel_id) {
    const channel = await client.channels.fetch(openTicket.channel_id).catch(() => null);
    if (channel && "delete" in channel) {
      await channel.delete("RageNodes sponsorship ticket closed").catch(() => undefined);
    }
  }
}

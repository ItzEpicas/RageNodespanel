import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

type Env = Record<string, string | undefined>;

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
};

const orderSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  discord_username: z.string().trim().max(120).optional().default(""),
  hosting_type: z.enum(["Minecraft", "Game Server", "Custom"]),
  selected_game: z.string().trim().max(120).optional().nullable(),
  selected_plan: z.string().trim().max(120).optional().nullable(),
  server_name: z.string().trim().min(2).max(120),
  ram: z.coerce.number().int().min(0).max(65535).optional().nullable(),
  cpu: z.coerce.number().int().min(0).max(100000).optional().nullable(),
  vcpu: z.coerce.number().int().min(0).max(1024).optional().nullable(),
  storage: z.coerce.number().int().min(0).max(100000).optional().nullable(),
  backups: z.coerce.number().int().min(0).max(1000).optional().nullable(),
  extra_ports: z.coerce.number().int().min(0).max(1000).optional().nullable(),
  minecraft_version: z.string().trim().max(80).optional().nullable(),
  server_software: z.string().trim().max(80).optional().nullable(),
  operating_system: z.string().trim().max(80).optional().nullable(),
  ipv4_count: z.coerce.number().int().min(0).max(256).optional().nullable(),
  payment_method: z.enum(["Manual"]).optional().nullable(),
  estimated_price: z.coerce.number().min(0).max(1000000),
  notes: z.string().trim().max(4000).optional().nullable(),
  status: z
    .enum(["Pending", "Contacted", "Waiting Payment", "Paid", "Server Created", "Cancelled"])
    .optional()
    .default("Pending"),
});

export async function handleOrdersApi(request: Request, rawEnv: unknown): Promise<Response | null> {
  const url = new URL(request.url);
  const env = normalizeEnv(rawEnv);

  if (url.pathname === "/api/orders" && request.method === "POST") {
    return createOrder(request, env);
  }

  return null;
}

async function createOrder(request: Request, env: Env): Promise<Response> {
  const payload = orderSchema.safeParse(await safeJson(request));
  if (!payload.success) {
    return json({ error: payload.error.issues[0]?.message || "Invalid order data." }, 400);
  }

  const supabase = getServiceSupabase(env);
  if (!supabase) return missingConfig(env);

  const auth = await getOptionalAuthenticatedUser(request, env);
  const values = payload.data;

  const insertPayload = {
    user_id: auth?.userId || null,
    full_name: values.full_name,
    email: values.email,
    discord_username: values.discord_username || null,
    hosting_type: values.hosting_type,
    selected_game: values.selected_game || null,
    selected_plan: values.selected_plan || null,
    server_name: values.server_name,
    ram: values.ram ?? null,
    cpu: values.cpu ?? null,
    vcpu: values.vcpu ?? null,
    storage: values.storage ?? null,
    backups: values.backups ?? null,
    extra_ports: values.extra_ports ?? null,
    minecraft_version: values.minecraft_version || null,
    server_software: values.server_software || null,
    operating_system: values.operating_system || null,
    ipv4_count: values.ipv4_count ?? null,
    payment_method: values.payment_method || null,
    estimated_price: values.estimated_price,
    subtotal_amount: values.estimated_price,
    total_amount: values.estimated_price,
    status: values.status,
    source: "website",
    notes: values.notes || null,
    pricing_snapshot: {
      estimated_price: values.estimated_price,
      hosting_type: values.hosting_type,
      selected_plan: values.selected_plan || null,
    },
    metadata: {
      submitted_from: "website_checkout",
      discord_login: Boolean(auth?.discordId),
      discord_id: auth?.discordId || null,
    },
  };

  const { data, error } = await supabase.from("orders").insert(insertPayload).select("*").single();
  if (error || !data) {
    console.error("Could not create order", error);
    return json({ error: error?.message || "Could not save the order request." }, 500);
  }

  await sendCheckoutLogToDiscord(env, data).catch((discordError) => {
    console.error("Could not send checkout log to Discord", discordError);
  });

  return json({
    ok: true,
    order: {
      id: data.id,
      order_number: data.order_number,
      status: data.status,
    },
  });
}

async function sendCheckoutLogToDiscord(env: Env, order: Record<string, unknown>) {
  const channelId = env.DISCORD_CHECKOUT_LOG_CHANNEL_ID || env.DISCORD_ORDER_LOG_CHANNEL_ID;
  if (!channelId) return;

  const embed = {
    title: "New Checkout Request",
    color: 0xef4444,
    fields: [
      {
        name: "Order",
        value: [
          `Order Number: ${String(order.order_number || order.id || "-")}`,
          `Status: ${String(order.status || "Pending")}`,
          `Hosting Type: ${String(order.hosting_type || "-")}`,
          `Game: ${String(order.selected_game || "-")}`,
          `Plan: ${String(order.selected_plan || "-")}`,
        ].join("\n"),
        inline: false,
      },
      {
        name: "Customer",
        value: [
          `Name: ${String(order.full_name || "-")}`,
          `Email: ${String(order.email || "-")}`,
          `Discord: ${String(order.discord_username || "-")}`,
        ].join("\n"),
        inline: false,
      },
      {
        name: "Configuration",
        value: [
          `Server Name: ${String(order.server_name || "-")}`,
          `RAM: ${String(order.ram ?? "-")}GB`,
          `CPU: ${String(order.cpu ?? "-")}%`,
          `Storage: ${String(order.storage ?? "-")}GB`,
          `Backups: ${String(order.backups ?? "-")}`,
          `Extra Ports: ${String(order.extra_ports ?? "-")}`,
        ].join("\n"),
        inline: false,
      },
      {
        name: "Billing",
        value: [
          `Payment: ${String(order.payment_method || "-")}`,
          `Estimated Price: $${formatAmount(order.total_amount ?? order.estimated_price ?? 0)}`,
        ].join("\n"),
        inline: false,
      },
    ],
    footer: {
      text: `Website order id: ${String(order.id || "-")}`,
    },
    timestamp: new Date().toISOString(),
  };

  if (String(order.notes || "").trim()) {
    embed.fields.push({
      name: "Notes",
      value: truncate(String(order.notes), 1000),
      inline: false,
    });
  }

  const response = await discordApi(env, `/channels/${channelId}/messages`, {
    method: "POST",
    body: {
      content: "@everyone New checkout request submitted.",
      allowed_mentions: {
        parse: ["everyone"],
      },
      embeds: [embed],
    },
  });

  if (!response.ok) {
    throw new Error(`Discord checkout log failed (${response.status})`);
  }
}

async function getOptionalAuthenticatedUser(request: Request, env: Env) {
  const token = getBearerToken(request);
  if (!token) return null;

  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  const client = createClient(url, key, {
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

  const { data } = await client.auth.getUser(token);
  if (!data.user) return null;

  const discordId = extractDiscordIdentity(data.user);
  return {
    userId: data.user.id,
    discordId,
  };
}

function extractDiscordIdentity(user: Record<string, unknown>) {
  const userMetadata = asRecord(user.user_metadata);
  const identities = Array.isArray(user.identities) ? user.identities : [];

  for (const identity of identities) {
    const identityRecord = asRecord(identity);
    if (String(identityRecord.provider || "") !== "discord") continue;
    const identityData = asRecord(identityRecord.identity_data);
    const snowflake = firstSnowflake(
      identityRecord.id,
      identityData.provider_id,
      identityData.sub,
      identityData.id,
    );
    if (snowflake) return snowflake;
  }

  return firstSnowflake(
    userMetadata.provider_id,
    userMetadata.sub,
    userMetadata.discord_id,
    userMetadata.id,
  );
}

function getServiceSupabase(env: Env) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
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
          ? `Orders API is missing server environment variables: ${missing.join(", ")}.`
          : "Orders API server configuration is incomplete.",
    },
    503,
  );
}

function truncate(value: string, max = 1000) {
  return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 3))}...`;
}

function formatAmount(value: unknown) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue.toFixed(2) : "0.00";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function firstSnowflake(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (/^[0-9]{15,22}$/.test(text)) return text;
  }
  return "";
}

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function loadLocalEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  const source = readFileSync(envPath, "utf8");
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;

    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }

  normalizeDiscordEnvInPlace();
}

export function normalizeDiscordEnvInPlace() {
  const publicKey = process.env.DISCORD_INTERACTIONS_PUBLIC_KEY;
  const applicationId = process.env.DISCORD_APPLICATION_ID;

  if (looksLikeSnowflake(publicKey) && looksLikeDiscordPublicKey(applicationId)) {
    process.env.DISCORD_INTERACTIONS_PUBLIC_KEY = applicationId;
    process.env.DISCORD_APPLICATION_ID = publicKey;
    console.warn(
      "Swapped DISCORD_INTERACTIONS_PUBLIC_KEY and DISCORD_APPLICATION_ID because they were reversed in .env.",
    );
  }
}

function looksLikeSnowflake(value) {
  return typeof value === "string" && /^[0-9]{17,20}$/.test(value);
}

function looksLikeDiscordPublicKey(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
}

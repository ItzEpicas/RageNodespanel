import { loadLocalEnv } from "./discord-support-env.mjs";

loadLocalEnv();

const token = process.env.DISCORD_BOT_TOKEN;
const applicationId = process.env.DISCORD_APPLICATION_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !applicationId || !guildId) {
  console.error(
    "Missing DISCORD_BOT_TOKEN, DISCORD_APPLICATION_ID, or DISCORD_GUILD_ID environment variable.",
  );
  process.exit(1);
}

const commands = [
  {
    name: "support_reply",
    description: "Send a staff reply to a RageNodes website ticket.",
    options: [
      {
        name: "ticket",
        description: "Ticket id or short id, for example RN-ABC123",
        type: 3,
        required: true,
      },
      {
        name: "message",
        description: "Message to send to the customer",
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: "support_close",
    description: "Close a RageNodes website ticket.",
    options: [
      {
        name: "ticket",
        description: "Ticket id or short id, for example RN-ABC123",
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: "claim-sponsorship",
    description: "Create or reopen your RageNodes sponsorship review ticket.",
  },
];

const response = await fetch(
  `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`,
  {
    method: "PUT",
    headers: {
      authorization: `Bot ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(commands),
  },
);

if (!response.ok) {
  console.error(`Discord command registration failed: ${response.status}`);
  console.error(await response.text());
  process.exit(1);
}

console.log("Registered support and sponsorship commands.");

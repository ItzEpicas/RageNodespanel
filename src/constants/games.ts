export type GameCategory = "Sandbox" | "Survival" | "FPS" | "Simulation" | "RP" | "Strategy";

export const GAME_CATEGORIES = [
  "All",
  "Sandbox",
  "Survival",
  "FPS",
  "Simulation",
  "RP",
  "Strategy",
] as const;

export type GameFilter = (typeof GAME_CATEGORIES)[number];

export interface SupportedGame {
  name: string;
  category: GameCategory;
  description: string;
  startingPrice: string;
}

const DEFAULT_GAME_STARTING_PRICE = "$9.94/month";

export const SUPPORTED_GAMES: SupportedGame[] = [
  {
    name: "Minecraft",
    category: "Sandbox",
    description: "Vanilla, Paper, Purpur, Fabric, Forge, and modpack-ready worlds.",
    startingPrice: DEFAULT_GAME_STARTING_PRICE,
  },
  {
    name: "Counter-Strike 2",
    category: "FPS",
    description: "Low-latency competitive servers for private matches and communities.",
    startingPrice: DEFAULT_GAME_STARTING_PRICE,
  },
  {
    name: "Rust",
    category: "Survival",
    description: "Persistent survival servers with fast storage for wipes and saves.",
    startingPrice: DEFAULT_GAME_STARTING_PRICE,
  },
  {
    name: "ARK: Survival Evolved",
    category: "Survival",
    description: "Dino survival hosting with room for mods, maps, and backups.",
    startingPrice: DEFAULT_GAME_STARTING_PRICE,
  },
  {
    name: "ARK: Survival Ascended",
    category: "Survival",
    description: "Modern ARK hosting for heavier worlds and growing tribes.",
    startingPrice: DEFAULT_GAME_STARTING_PRICE,
  },
  {
    name: "Palworld",
    category: "Survival",
    description: "Private Palworld servers with NVMe storage and DDoS protection.",
    startingPrice: DEFAULT_GAME_STARTING_PRICE,
  },
  {
    name: "Valheim",
    category: "Survival",
    description: "Stable Viking survival worlds for friends and communities.",
    startingPrice: DEFAULT_GAME_STARTING_PRICE,
  },
  {
    name: "7 Days to Die",
    category: "Survival",
    description: "Zombie survival hosting with scheduled backups and easy management.",
    startingPrice: DEFAULT_GAME_STARTING_PRICE,
  },
  {
    name: "DayZ",
    category: "Survival",
    description: "Survival communities with persistent storage and reliable uptime.",
    startingPrice: DEFAULT_GAME_STARTING_PRICE,
  },
  {
    name: "Garry's Mod",
    category: "Sandbox",
    description: "Sandbox, DarkRP, TTT, and custom community server hosting.",
    startingPrice: DEFAULT_GAME_STARTING_PRICE,
  },
  {
    name: "Team Fortress 2",
    category: "FPS",
    description: "Classic community FPS hosting for pubs, events, and private games.",
    startingPrice: DEFAULT_GAME_STARTING_PRICE,
  },
  {
    name: "Left 4 Dead 2",
    category: "FPS",
    description: "Co-op and versus servers with quick setup and simple management.",
    startingPrice: DEFAULT_GAME_STARTING_PRICE,
  },
  {
    name: "Killing Floor 2",
    category: "FPS",
    description: "Wave survival servers tuned for fast loading and stable sessions.",
    startingPrice: DEFAULT_GAME_STARTING_PRICE,
  },
  {
    name: "Unturned",
    category: "Survival",
    description: "Lightweight survival servers for modded and vanilla communities.",
    startingPrice: DEFAULT_GAME_STARTING_PRICE,
  },
  {
    name: "Terraria",
    category: "Sandbox",
    description: "Small, fast Terraria worlds with easy backups and restores.",
    startingPrice: DEFAULT_GAME_STARTING_PRICE,
  },
  {
    name: "Factorio",
    category: "Strategy",
    description: "Automation servers built for long-running factories and saves.",
    startingPrice: DEFAULT_GAME_STARTING_PRICE,
  },
  {
    name: "Satisfactory",
    category: "Simulation",
    description: "Factory-building servers with persistent worlds and reliable storage.",
    startingPrice: DEFAULT_GAME_STARTING_PRICE,
  },
  {
    name: "Conan Exiles",
    category: "Survival",
    description: "Survival RPG hosting for private clans and public communities.",
    startingPrice: DEFAULT_GAME_STARTING_PRICE,
  },
  {
    name: "Squad",
    category: "FPS",
    description: "Tactical FPS hosting for organized communities and events.",
    startingPrice: DEFAULT_GAME_STARTING_PRICE,
  },
  {
    name: "Insurgency: Sandstorm",
    category: "FPS",
    description: "Realistic FPS servers with dependable network protection.",
    startingPrice: DEFAULT_GAME_STARTING_PRICE,
  },
  {
    name: "Hell Let Loose",
    category: "FPS",
    description: "Large-scale tactical servers for serious communities.",
    startingPrice: DEFAULT_GAME_STARTING_PRICE,
  },
  {
    name: "Project Zomboid",
    category: "Survival",
    description: "Persistent apocalypse worlds with backups and mod support.",
    startingPrice: DEFAULT_GAME_STARTING_PRICE,
  },
  {
    name: "Space Engineers",
    category: "Sandbox",
    description: "Engineering sandbox servers for creative and survival builds.",
    startingPrice: DEFAULT_GAME_STARTING_PRICE,
  },
  {
    name: "Eco",
    category: "Simulation",
    description: "Long-running society simulation hosting for community projects.",
    startingPrice: DEFAULT_GAME_STARTING_PRICE,
  },
  {
    name: "Vintage Story",
    category: "Survival",
    description: "Survival sandbox hosting with fast disk and memory options.",
    startingPrice: DEFAULT_GAME_STARTING_PRICE,
  },
  {
    name: "FiveM / GTA V RP",
    category: "RP",
    description: "Roleplay server hosting for custom scripts and communities.",
    startingPrice: DEFAULT_GAME_STARTING_PRICE,
  },
  {
    name: "RimWorld",
    category: "Strategy",
    description: "Colony simulation hosting for multiplayer and community sessions.",
    startingPrice: DEFAULT_GAME_STARTING_PRICE,
  },
  {
    name: "Don't Starve Together",
    category: "Survival",
    description: "Co-op survival hosting for private groups and public worlds.",
    startingPrice: DEFAULT_GAME_STARTING_PRICE,
  },
  {
    name: "OpenTTD",
    category: "Simulation",
    description: "Transport simulation servers for long-running multiplayer games.",
    startingPrice: DEFAULT_GAME_STARTING_PRICE,
  },
  {
    name: "Assetto Corsa",
    category: "Simulation",
    description: "Racing server hosting for leagues, events, and practice sessions.",
    startingPrice: DEFAULT_GAME_STARTING_PRICE,
  },
  {
    name: "American Truck Simulator",
    category: "Simulation",
    description: "Convoy and community server hosting for trucking groups.",
    startingPrice: DEFAULT_GAME_STARTING_PRICE,
  },
  {
    name: "Euro Truck Simulator 2",
    category: "Simulation",
    description: "European trucking community hosting with dependable uptime.",
    startingPrice: DEFAULT_GAME_STARTING_PRICE,
  },
];

export const SUPPORTED_GAME_NAMES = SUPPORTED_GAMES.map((game) => game.name);

import { GAME_SERVER_PLANS, VPS_PLANS } from "@/constants/plans";
import {
  calculateGameServerPrice,
  GAME_PRICING,
  MINECRAFT_SOFTWARE,
  MINECRAFT_VERSIONS,
  PAYMENT_METHODS,
} from "@/constants/pricing";
import { SUPPORTED_GAME_NAMES } from "@/constants/games";

export const PRICE = {
  ramPerGb: GAME_PRICING.ramPerGb,
  ssdPer50: GAME_PRICING.storagePer50Gb,
  cpuPer100: GAME_PRICING.cpuPer100Percent,
  port: GAME_PRICING.additionalPort,
  backup: GAME_PRICING.backup,
};

export interface BuildConfig {
  ram: number;
  ssd?: number;
  storage?: number;
  cpu: number;
  backups: number;
  ports?: number;
  extra_ports?: number;
}

export function calculatePrice(c: BuildConfig): number {
  return calculateGameServerPrice({
    ram: c.ram,
    storage: c.storage ?? c.ssd ?? 0,
    cpu: c.cpu,
    backups: c.backups,
    extra_ports: c.extra_ports ?? c.ports ?? 0,
  });
}

export const PLANS = GAME_SERVER_PLANS.map((plan) => ({
  ...plan,
  id: plan.id.replace("-game", ""),
  ssd: plan.storage,
}));

export { VPS_PLANS };

export const SOFTWARE = MINECRAFT_SOFTWARE;
export const MC_VERSIONS = MINECRAFT_VERSIONS;
export { PAYMENT_METHODS };
export const SUPPORTED_GAMES = SUPPORTED_GAME_NAMES;

export const DISCORD_URL = "https://discord.gg/ragenodes";
export const PANEL_URL = "https://panel.ragenodes.cloud";

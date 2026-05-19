import { calculateGameServerPrice, calculateVpsPrice } from "./pricing";

const gamePlanPrice = (ram: number, storage: number, cpu: number, backups: number) =>
  calculateGameServerPrice({ ram, storage, cpu, backups, extra_ports: 0 });

const vpsPlanPrice = (vcpu: number, ram: number, storage: number, ipv4_count = 1) =>
  calculateVpsPrice({ vcpu, ram, storage, ipv4_count });

export const GAME_SERVER_PLANS = [
  {
    id: "budget-game",
    name: "Budget Game Server",
    price: gamePlanPrice(2, 20, 100, 1),
    ram: 2,
    storage: 20,
    cpu: 100,
    backups: 1,
    databases: 1,
    tagline: "For small communities and lightweight servers",
    popular: false,
  },
  {
    id: "standard-game",
    name: "Standard Game Server",
    price: gamePlanPrice(4, 30, 150, 2),
    ram: 4,
    storage: 30,
    cpu: 150,
    backups: 2,
    databases: 2,
    tagline: "Balanced resources for most game servers",
    popular: true,
  },
  {
    id: "premium-game",
    name: "Premium Game Server",
    price: gamePlanPrice(6, 50, 200, 3),
    ram: 6,
    storage: 50,
    cpu: 200,
    backups: 3,
    databases: 3,
    tagline: "Extra power for growing communities",
    popular: false,
  },
] as const;

export const MINECRAFT_PLANS = [
  {
    id: "budget-minecraft",
    name: "Budget Minecraft",
    price: gamePlanPrice(2, 20, 100, 1),
    ram: 2,
    storage: 20,
    cpu: 100,
    backups: 1,
    databases: 1,
    tagline: "A clean start for small Minecraft servers",
    popular: false,
  },
  {
    id: "standard-minecraft",
    name: "Standard Minecraft",
    price: gamePlanPrice(4, 30, 150, 2),
    ram: 4,
    storage: 30,
    cpu: 150,
    backups: 2,
    databases: 2,
    tagline: "Most Popular for SMPs and friend groups",
    popular: true,
  },
  {
    id: "premium-minecraft",
    name: "Premium Minecraft",
    price: gamePlanPrice(6, 50, 200, 3),
    ram: 6,
    storage: 50,
    cpu: 200,
    backups: 3,
    databases: 3,
    tagline: "More headroom for plugins and modpacks",
    popular: false,
  },
] as const;

export const VPS_PLANS = [
  {
    id: "starter-vps",
    name: "Starter VPS",
    price: vpsPlanPrice(2, 4, 40),
    features: ["2 vCPU", "4GB RAM", "40GB NVMe SSD", "1 IPv4", "Full root access"],
    popular: false,
  },
  {
    id: "performance-vps",
    name: "Performance VPS",
    price: vpsPlanPrice(4, 8, 80),
    features: ["4 vCPU", "8GB RAM", "80GB NVMe SSD", "1 IPv4", "Full root access"],
    popular: true,
  },
  {
    id: "pro-vps",
    name: "Pro VPS",
    price: vpsPlanPrice(6, 16, 160),
    features: ["6 vCPU", "16GB RAM", "160GB NVMe SSD", "1 IPv4", "Full root access"],
    popular: false,
  },
] as const;

export type GamePlan = (typeof GAME_SERVER_PLANS)[number] | (typeof MINECRAFT_PLANS)[number];
export type VpsPlan = (typeof VPS_PLANS)[number];

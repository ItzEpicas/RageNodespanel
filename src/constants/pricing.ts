export const GAME_PRICING = {
  ramPerGb: 1.4,
  storagePer50Gb: 4.1,
  cpuPer100Percent: 1.5,
  additionalPort: 0.5,
  backup: 4,
};

export const VPS_PRICING = {
  vcpuPerCore: GAME_PRICING.cpuPer100Percent,
  ramPerGb: GAME_PRICING.ramPerGb,
  storagePer50Gb: GAME_PRICING.storagePer50Gb,
  ipv4: GAME_PRICING.additionalPort,
};

export const PAYMENT_METHODS = ["Manual"] as const;

export const ORDER_STATUSES = [
  "Pending",
  "Contacted",
  "Waiting Payment",
  "Paid",
  "Server Created",
  "Cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const OPERATING_SYSTEMS = ["Ubuntu", "Debian", "AlmaLinux", "Rocky Linux"] as const;

export const MINECRAFT_SOFTWARE = ["Paper", "Purpur", "Vanilla", "Forge", "Fabric"] as const;

export const MINECRAFT_VERSIONS = [
  "1.21.4",
  "1.21.1",
  "1.20.6",
  "1.20.4",
  "1.20.1",
  "1.19.4",
  "1.18.2",
  "1.16.5",
  "1.12.2",
] as const;

export function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateGameServerPrice(config: {
  ram: number;
  storage: number;
  cpu: number;
  backups: number;
  extra_ports: number;
}) {
  return roundCurrency(
    config.ram * GAME_PRICING.ramPerGb +
      (config.storage / 50) * GAME_PRICING.storagePer50Gb +
      (config.cpu / 100) * GAME_PRICING.cpuPer100Percent +
      config.extra_ports * GAME_PRICING.additionalPort +
      config.backups * GAME_PRICING.backup,
  );
}

export function calculateVpsPrice(config: {
  vcpu: number;
  ram: number;
  storage: number;
  ipv4_count: number;
}) {
  return roundCurrency(
    config.vcpu * VPS_PRICING.vcpuPerCore +
      config.ram * VPS_PRICING.ramPerGb +
      (config.storage / 50) * VPS_PRICING.storagePer50Gb +
      config.ipv4_count * VPS_PRICING.ipv4,
  );
}

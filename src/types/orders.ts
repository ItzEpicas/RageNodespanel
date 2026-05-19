import type { OrderStatus } from "@/constants/pricing";

export type HostingType = "Minecraft" | "Game Server" | "VPS" | "Custom";

export interface BuilderConfig {
  hosting_type: HostingType;
  selected_game?: string;
  selected_plan?: string;
  server_name?: string;
  ram?: number;
  cpu?: number;
  vcpu?: number;
  storage?: number;
  backups?: number;
  extra_ports?: number;
  minecraft_version?: string;
  server_software?: string;
  operating_system?: string;
  ipv4_count?: number;
  location?: string;
  notes?: string;
  estimated_price?: number;
}

export interface OrderFormValues extends BuilderConfig {
  full_name: string;
  email: string;
  discord_username: string;
  payment_method: string;
}

export interface OrderRow extends OrderFormValues {
  id: string;
  created_at: string;
  status: OrderStatus;
}

export const BUILDER_STORAGE_KEY = "ragenodes_builder_config";

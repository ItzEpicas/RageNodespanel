import { GAME_SERVER_PLANS, MINECRAFT_PLANS, VPS_PLANS } from "@/constants/plans";
import { SUPPORTED_GAMES } from "@/constants/games";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type PlanCategory = "Minecraft" | "Game Server" | "VPS" | "Custom";

export interface CmsPlan {
  id: string;
  name: string;
  category: PlanCategory;
  price: number;
  billing_cycle: string;
  ram: number | null;
  cpu: number | null;
  vcpu: number | null;
  storage: number | null;
  backups: number | null;
  databases: number | null;
  ipv4_count: number | null;
  description: string | null;
  features: string[];
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface CmsGame {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  starting_price: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface CmsFeature {
  id: string;
  title: string;
  description: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
}

export interface CmsFaq {
  id: string;
  question: string;
  answer: string;
  category: string;
  is_active: boolean;
  sort_order: number;
}

export interface HomepageContent {
  id?: string;
  hero_title: string;
  hero_subtitle: string;
  primary_button_text: string;
  primary_button_url: string;
  secondary_button_text: string;
  secondary_button_url: string;
  cta_title: string;
  cta_subtitle: string;
  cta_button_text: string;
  cta_button_url: string;
}

export interface SiteSettings {
  id?: string;
  site_name: string;
  discord_invite_url: string;
  panel_url: string;
  billing_url: string;
  support_email: string;
  currency: string;
  maintenance_mode: boolean;
}

export const DEFAULT_HOMEPAGE: HomepageContent = {
  hero_title: "Powerful Game Server Hosting",
  hero_subtitle:
    "Deploy high-performance game servers on fast Ryzen hardware with DDR5 memory, NVMe SSDs, DDoS protection, and simple management.",
  primary_button_text: "Start Building",
  primary_button_url: "/builder",
  secondary_button_text: "View Games",
  secondary_button_url: "/games",
  cta_title: "Ready to launch your server?",
  cta_subtitle:
    "Join RageNodes and deploy your next game server with powerful hardware and fast support.",
  cta_button_text: "Order Now",
  cta_button_url: "/order",
};

export const DEFAULT_SETTINGS: SiteSettings = {
  site_name: "RageNodes",
  discord_invite_url: "https://discord.gg/ragenodes",
  panel_url: "https://panel.ragenodes.cloud",
  billing_url: "https://billing.ragenodes.cloud",
  support_email: "support@ragenodes.cloud",
  currency: "USD",
  maintenance_mode: false,
};

export const DEFAULT_FEATURES: CmsFeature[] = [
  {
    id: "ryzen-cpus",
    title: "Ryzen CPUs",
    description: "High-performance processors built for demanding multiplayer workloads.",
    icon: "Cpu",
    is_active: true,
    sort_order: 1,
  },
  {
    id: "ddr5-memory",
    title: "DDR5 Memory",
    description: "Fast memory for smoother gameplay and better server performance.",
    icon: "MemoryStick",
    is_active: true,
    sort_order: 2,
  },
  {
    id: "nvme-ssd",
    title: "NVMe SSD",
    description: "Fast storage for quick loading, backups, and world saves.",
    icon: "HardDrive",
    is_active: true,
    sort_order: 3,
  },
  {
    id: "ddos-protection",
    title: "DDoS Protection",
    description: "Protection to help keep your services online.",
    icon: "Shield",
    is_active: true,
    sort_order: 4,
  },
  {
    id: "pterodactyl-panel",
    title: "Pterodactyl Panel",
    description: "Simple and powerful control panel for managing game servers.",
    icon: "Gauge",
    is_active: true,
    sort_order: 5,
  },
  {
    id: "fast-support",
    title: "Fast Support",
    description: "Get help quickly through Discord and support tickets.",
    icon: "Headphones",
    is_active: true,
    sort_order: 6,
  },
];

export const DEFAULT_FAQS: CmsFaq[] = [
  {
    id: "setup",
    question: "How fast is setup?",
    answer: "After your order is confirmed, most services are prepared within minutes.",
    category: "General",
    is_active: true,
    sort_order: 1,
  },
  {
    id: "pterodactyl",
    question: "Do you use Pterodactyl?",
    answer: "Yes. Game servers are managed through a clean Pterodactyl-powered panel.",
    category: "Panel",
    is_active: true,
    sort_order: 2,
  },
  {
    id: "upgrades",
    question: "Can I upgrade later?",
    answer: "Yes. Open a ticket and we can adjust resources as your server grows.",
    category: "Billing",
    is_active: true,
    sort_order: 3,
  },
  {
    id: "ddos",
    question: "Do you offer DDoS protection?",
    answer: "Yes. RageNodes includes DDoS protection to help keep services online.",
    category: "Network",
    is_active: true,
    sort_order: 4,
  },
  {
    id: "payments",
    question: "How do payments work?",
    answer: "Submit an order request and our team will contact you with payment instructions.",
    category: "Billing",
    is_active: true,
    sort_order: 5,
  },
];

export const DEFAULT_GAMES: CmsGame[] = SUPPORTED_GAMES.map((game, index) => ({
  id: game.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, ""),
  name: game.name,
  slug: game.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, ""),
  category: game.category,
  description: game.description,
  starting_price: game.startingPrice,
  image_url: null,
  is_active: true,
  sort_order: index + 1,
}));

export const DEFAULT_PLANS: CmsPlan[] = [
  ...GAME_SERVER_PLANS.map((plan, index) => planToCms(plan, "Game Server", index + 1)),
  ...MINECRAFT_PLANS.map((plan, index) => planToCms(plan, "Minecraft", index + 20)),
  ...VPS_PLANS.map((plan, index) => ({
    id: plan.id,
    name: plan.name,
    category: "VPS" as PlanCategory,
    price: plan.price,
    billing_cycle: "monthly",
    ram: plan.id === "starter-vps" ? 4 : plan.id === "performance-vps" ? 8 : 16,
    cpu: null,
    vcpu: plan.id === "starter-vps" ? 2 : plan.id === "performance-vps" ? 4 : 6,
    storage: plan.id === "starter-vps" ? 40 : plan.id === "performance-vps" ? 80 : 160,
    backups: null,
    databases: null,
    ipv4_count: 1,
    description: "Dedicated resources for apps, bots, panels, and services.",
    features: [...plan.features],
    is_popular: plan.popular,
    is_active: true,
    sort_order: index + 40,
  })),
];

function planToCms(
  plan: (typeof GAME_SERVER_PLANS)[number] | (typeof MINECRAFT_PLANS)[number],
  category: PlanCategory,
  sortOrder: number,
): CmsPlan {
  return {
    id: plan.id,
    name: plan.name,
    category,
    price: plan.price,
    billing_cycle: "monthly",
    ram: plan.ram,
    cpu: plan.cpu,
    vcpu: null,
    storage: plan.storage,
    backups: plan.backups,
    databases: plan.databases,
    ipv4_count: null,
    description: plan.tagline,
    features: [
      `${plan.ram}GB DDR5 RAM`,
      `${plan.storage}GB NVMe SSD`,
      `${plan.cpu}% Ryzen CPU`,
      `${plan.backups} backup${plan.backups > 1 ? "s" : ""}`,
      `${plan.databases} database${plan.databases > 1 ? "s" : ""}`,
      "DDoS protection",
    ],
    is_popular: plan.popular,
    is_active: true,
    sort_order: sortOrder,
  };
}

function parseFeatures(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizePlan(row: Record<string, unknown>): CmsPlan {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    category: String(row.category ?? "Custom") as PlanCategory,
    price: Number(row.price ?? 0),
    billing_cycle: String(row.billing_cycle ?? "monthly"),
    ram: row.ram == null ? null : Number(row.ram),
    cpu: row.cpu == null ? null : Number(row.cpu),
    vcpu: row.vcpu == null ? null : Number(row.vcpu),
    storage: row.storage == null ? null : Number(row.storage),
    backups: row.backups == null ? null : Number(row.backups),
    databases: row.databases == null ? null : Number(row.databases),
    ipv4_count: row.ipv4_count == null ? null : Number(row.ipv4_count),
    description: row.description == null ? null : String(row.description),
    features: parseFeatures(row.features),
    is_popular: Boolean(row.is_popular),
    is_active: row.is_active !== false,
    sort_order: Number(row.sort_order ?? 0),
  };
}

export async function fetchActivePlans(category?: PlanCategory): Promise<CmsPlan[]> {
  if (!isSupabaseConfigured) {
    return DEFAULT_PLANS.filter((plan) => !category || plan.category === category);
  }

  let query = supabase
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (category) query = query.eq("category", category);

  const { data, error } = await query;
  if (error || !data?.length) {
    return DEFAULT_PLANS.filter((plan) => !category || plan.category === category);
  }
  return data.map((row) => normalizePlan(row as Record<string, unknown>));
}

export async function fetchActiveGames(): Promise<CmsGame[]> {
  if (!isSupabaseConfigured) return DEFAULT_GAMES;

  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data?.length) return DEFAULT_GAMES;
  return data as CmsGame[];
}

export async function fetchActiveFeatures(): Promise<CmsFeature[]> {
  if (!isSupabaseConfigured) return DEFAULT_FEATURES;

  const { data, error } = await supabase
    .from("features")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data?.length) return DEFAULT_FEATURES;
  return data as CmsFeature[];
}

export async function fetchActiveFaqs(): Promise<CmsFaq[]> {
  if (!isSupabaseConfigured) return DEFAULT_FAQS;

  const { data, error } = await supabase
    .from("faqs")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data?.length) return DEFAULT_FAQS;
  return data as CmsFaq[];
}

export async function fetchHomepageContent(): Promise<HomepageContent> {
  if (!isSupabaseConfigured) return DEFAULT_HOMEPAGE;

  const { data, error } = await supabase
    .from("homepage_content")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return DEFAULT_HOMEPAGE;
  return { ...DEFAULT_HOMEPAGE, ...(data as Partial<HomepageContent>) };
}

export async function fetchSiteSettings(): Promise<SiteSettings> {
  if (!isSupabaseConfigured) return DEFAULT_SETTINGS;

  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...(data as Partial<SiteSettings>) };
}

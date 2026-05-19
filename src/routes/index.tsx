import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Boxes,
  Check,
  Code2,
  Cpu,
  Gamepad2,
  Gauge,
  Globe2,
  HardDrive,
  Headphones,
  Mail,
  MemoryStick,
  MessageCircle,
  Network,
  Rocket,
  Shield,
  ShieldCheck,
  Sparkles,
  Terminal,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_FEATURES,
  DEFAULT_GAMES,
  DEFAULT_HOMEPAGE,
  DEFAULT_PLANS,
  DEFAULT_SETTINGS,
  fetchActiveFeatures,
  fetchActiveGames,
  fetchActivePlans,
  fetchHomepageContent,
  fetchSiteSettings,
  type CmsFeature,
  type CmsPlan,
  type HomepageContent,
  type SiteSettings,
} from "@/lib/cms";

export const Route = createFileRoute("/")({
  component: Index,
});

const iconMap: Record<string, LucideIcon> = {
  Cpu,
  MemoryStick,
  HardDrive,
  Shield,
  Gauge,
  Headphones,
  Zap,
};

const productTabs = [
  { label: "Game Servers", icon: Gamepad2, href: "#game-plans", active: true },
  { label: "Minecraft", icon: Boxes, href: "/minecraft" },
  { label: "Web Apps", icon: Code2, href: "/hosting" },
  { label: "Storage", icon: HardDrive, href: "#hardware" },
];

const stackRail = [
  { label: "Pricing", icon: Sparkles, href: "#pricing" },
  { label: "Hardware", icon: Cpu, href: "#hardware" },
  { label: "Games", icon: Gamepad2, href: "#games" },
  { label: "Panel", icon: Terminal, href: "panel" },
];

function Index() {
  const [homepage, setHomepage] = useState<HomepageContent>(DEFAULT_HOMEPAGE);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [features, setFeatures] = useState<CmsFeature[]>(DEFAULT_FEATURES);
  const [plans, setPlans] = useState<CmsPlan[]>(
    DEFAULT_PLANS.filter((plan) => plan.category === "Game Server"),
  );
  const [games, setGames] = useState(DEFAULT_GAMES);

  useEffect(() => {
    fetchHomepageContent().then(setHomepage);
    fetchSiteSettings().then(setSettings);
    fetchActiveFeatures().then(setFeatures);
    fetchActivePlans("Game Server").then(setPlans);
    fetchActiveGames().then(setGames);
  }, []);

  const bestPlan = useMemo(() => plans.find((plan) => plan.is_popular) ?? plans[0], [plans]);
  const socialRail = useMemo(
    () => [
      { label: "Discord", icon: MessageCircle, href: settings.discord_invite_url, external: true },
      { label: "Panel", icon: Globe2, href: settings.panel_url, external: true },
      { label: "Contact", icon: Mail, href: `mailto:${settings.support_email}`, external: true },
      { label: "Support", icon: Headphones, href: "/contact" },
      { label: "Status", icon: Gauge, href: "/status" },
    ],
    [settings.discord_invite_url, settings.panel_url, settings.support_email],
  );
  const rightRail = useMemo(
    () =>
      stackRail.map((item) => ({
        ...item,
        href: item.href === "panel" ? settings.panel_url : item.href,
        external: item.href === "panel",
      })),
    [settings.panel_url],
  );

  return (
    <>
      <section className="relative isolate min-h-[calc(100vh-74px)] overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-90" />
        <div className="absolute inset-x-0 top-0 h-64 bg-[linear-gradient(180deg,oklch(0.62_0.24_27_/_0.16),transparent)]" />
        <div className="absolute left-[18%] top-[18%] h-72 w-72 rounded-full bg-primary/14 blur-[110px]" />
        <div className="absolute right-[12%] top-[32%] h-80 w-80 rounded-full bg-sky-500/10 blur-[120px]" />
        <SideRail items={socialRail} side="left" />
        <SideRail items={rightRail} side="right" />
        <MobileDock items={rightRail.slice(0, 5)} />

        <div className="container relative mx-auto grid min-h-[calc(100vh-74px)] items-center gap-12 px-4 py-16 lg:grid-cols-[1fr_620px] xl:gap-20">
          <div className="pt-8 lg:pt-0">
            <div className="mb-7 inline-flex h-11 items-center gap-3 rounded-full bg-secondary/80 px-4 text-sm font-semibold text-muted-foreground shadow-[0_16px_50px_oklch(0_0_0_/_0.24)]">
              <img src="/logo.png" alt="" className="h-7 w-7 object-contain" />
              RageNodes deploy grid
              <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_22px_oklch(0.62_0.24_27)]" />
            </div>
            <h1 className="max-w-5xl font-black uppercase leading-[0.95] text-foreground [font-size:clamp(3.5rem,7.6vw,7.4rem)] [letter-spacing:0.02em]">
              Launch
              <br />
              game servers
              <br />
              <span className="text-primary">that hit hard</span>
            </h1>
            <p className="mt-8 max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
              {homepage.hero_subtitle}
            </p>

            <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3">
              <HeroStat value="99.9%" label="Uptime" />
              <HeroStat value="DDR5" label="Memory" />
              <HeroStat value="24/7" label="Support" />
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {productTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <a
                    key={tab.label}
                    href={tab.href}
                    className={`inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold ${
                      tab.active
                        ? "bg-primary text-primary-foreground glow-red"
                        : "bg-secondary/75 text-muted-foreground"
                    } transition-transform hover:-translate-y-1 hover:text-foreground`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </a>
                );
              })}
            </div>

            <div className="mt-12 flex flex-col gap-3 sm:flex-row">
              <SmartButton
                href={homepage.primary_button_url}
                className="h-14 rounded-xl bg-gradient-to-r from-primary to-accent px-8 text-base font-bold"
              >
                {homepage.primary_button_text}
                <ArrowRight className="h-4 w-4" />
              </SmartButton>
              <SmartButton
                href={homepage.secondary_button_url}
                variant="ghost"
                className="h-14 rounded-xl bg-secondary/70 px-8 text-base font-bold text-foreground hover:bg-secondary"
              >
                {homepage.secondary_button_text}
              </SmartButton>
            </div>
          </div>

          <CommandCenter plan={bestPlan} />
        </div>
      </section>

      <section id="pricing" className="container mx-auto scroll-mt-28 px-4 py-16">
        <Comparison plans={plans} />
      </section>

      <section id="hardware" className="container mx-auto scroll-mt-28 px-4 py-16">
        <SectionHeading
          eyebrow="Built for real loads"
          title="The hardware story is visible, not hidden"
          desc="Ryzen compute, DDR5 memory, SSD storage, protection and support are presented clearly from the first scroll."
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <HardwareCard
            icon={Cpu}
            title="Ryzen CPUs"
            detail="High clock speed for Minecraft, FiveM and modded servers."
            value="Fast cores"
          />
          <HardwareCard
            icon={MemoryStick}
            title="DDR5 RAM"
            detail="Clean memory pricing from the builder to every plan."
            value="$1.40/GB"
          />
          <HardwareCard
            icon={HardDrive}
            title="SSD Storage"
            detail="Predictable SSD upgrades with no hidden storage math."
            value="$4.10/50GB"
          />
          <HardwareCard
            icon={ShieldCheck}
            title="DDoS Shield"
            detail="Protection-first layout with status and SLA confidence."
            value="Always on"
          />
        </div>
      </section>

      <section id="game-plans" className="container mx-auto scroll-mt-28 px-4 py-16">
        <SectionHeading
          eyebrow="Game hosting"
          title="Plans built from clean resource prices"
          desc="Game servers and Minecraft plans use one clear pricing model."
        />
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
          {plans.map((plan) => (
            <PlanPreview key={plan.id} plan={plan} />
          ))}
        </div>
      </section>

      <section id="platform" className="container mx-auto scroll-mt-28 px-4 py-16">
        <SectionHeading
          eyebrow="Platform"
          title="Premium hosting without the clutter"
          desc="The essentials stay easy to scan: hardware, protection, panel access and support."
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.slice(0, 6).map((feature) => {
            const Icon = iconMap[feature.icon] ?? Zap;
            return (
              <div key={feature.id} className="glass rounded-2xl p-6">
                <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="games" className="container mx-auto scroll-mt-28 px-4 py-16">
        <div className="grid gap-8 overflow-hidden rounded-2xl bg-card/80 p-6 shadow-[0_30px_90px_oklch(0_0_0_/_0.28)] md:p-10 lg:grid-cols-[1fr_380px]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              Game library
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-black md:text-5xl">
              Pick the game, choose resources, deploy fast
            </h2>
            <div className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {games.slice(0, 12).map((game) => (
                <div key={game.id} className="rounded-xl bg-secondary/70 px-4 py-3 text-sm">
                  {game.name}
                </div>
              ))}
            </div>
          </div>
          <div className="relative rounded-2xl bg-secondary/70 p-6">
            <img
              src="/logo.png"
              alt=""
              className="absolute right-5 top-5 h-12 w-12 object-contain opacity-90"
            />
            <Gamepad2 className="h-8 w-8 text-primary" />
            <h3 className="mt-5 max-w-[15rem] text-2xl font-bold">Need a custom game?</h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Choose resources in the builder and tell us what game or stack you want deployed.
            </p>
            <Button asChild className="mt-6 w-full rounded-xl">
              <Link to="/builder">Open Builder</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="glass grid gap-8 rounded-2xl p-6 md:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              Ready to launch?
            </p>
            <h2 className="mt-3 text-3xl font-black md:text-5xl">{homepage.cta_title}</h2>
            <p className="mt-4 max-w-2xl text-muted-foreground">{homepage.cta_subtitle}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <SmartButton
              href={homepage.cta_button_url}
              className="h-12 rounded-xl bg-gradient-to-r from-primary to-accent px-7"
            >
              {homepage.cta_button_text}
            </SmartButton>
            <Button asChild variant="ghost" className="h-12 rounded-xl bg-secondary/70 px-7">
              <a href={settings.discord_invite_url} target="_blank" rel="noreferrer">
                Discord
              </a>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-secondary/55 p-4">
      <p className="text-2xl font-black text-foreground">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function SideRail({
  items,
  side,
}: {
  items: { label: string; icon: LucideIcon; href: string; external?: boolean }[];
  side: "left" | "right";
}) {
  return (
    <div
      className={`fixed top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-4 xl:flex ${
        side === "left" ? "left-5 2xl:left-7" : "right-5 2xl:right-7"
      }`}
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <a
            key={item.label}
            aria-label={item.label}
            href={item.href}
            target={item.external ? "_blank" : undefined}
            rel={item.external ? "noreferrer" : undefined}
            style={{ transitionDelay: `${index * 25}ms` }}
            className="group grid h-14 w-14 place-items-center rounded-2xl bg-secondary/70 text-primary shadow-[0_18px_48px_oklch(0_0_0_/_0.24)] transition-all duration-300 hover:-translate-y-1 hover:bg-primary hover:text-primary-foreground hover:shadow-[0_22px_54px_oklch(0.62_0.24_27_/_0.32)]"
          >
            <Icon className="h-5 w-5 transition-transform group-hover:scale-110" />
          </a>
        );
      })}
    </div>
  );
}

function MobileDock({
  items,
}: {
  items: { label: string; icon: LucideIcon; href: string; external?: boolean }[];
}) {
  return (
    <nav
      aria-label="Mobile quick navigation"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      className="fixed inset-x-3 bottom-3 z-50 grid gap-2 rounded-2xl bg-background/86 p-2 shadow-[0_20px_70px_oklch(0_0_0_/_0.45)] backdrop-blur-xl xl:hidden"
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <a
            key={item.label}
            href={item.href}
            target={item.external ? "_blank" : undefined}
            rel={item.external ? "noreferrer" : undefined}
            aria-label={item.label}
            className="grid h-12 place-items-center rounded-xl bg-secondary/75 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <Icon className="h-5 w-5" />
          </a>
        );
      })}
    </nav>
  );
}

function CommandCenter({ plan }: { plan?: CmsPlan }) {
  return (
    <div className="relative mx-auto w-full max-w-[680px]">
      <div className="absolute -inset-8 rounded-[2rem] bg-primary/12 blur-[70px]" />
      <div className="relative overflow-hidden rounded-2xl bg-[#07070a] shadow-[0_34px_100px_oklch(0_0_0_/_0.46)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,58,58,0.14),transparent_28%)]" />
        <div className="absolute inset-0 grid-bg opacity-15" />
        <div className="flex h-16 items-center justify-between bg-card/85 px-5">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="RageNodes" className="h-10 w-10 object-contain" />
            <div>
              <p className="text-sm font-black">RageNodes Command</p>
              <p className="text-xs text-muted-foreground">FRA-01 deployment cluster</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold text-primary">
            <span className="h-2 w-2 rounded-full bg-primary" />
            live
          </span>
        </div>

        <div className="grid gap-4 p-5 md:p-7">
          <div className="rounded-2xl bg-secondary/80 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Active deployment
                </p>
                <h2 className="mt-2 text-2xl font-black">Minecraft Network</h2>
              </div>
              <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-black/35 text-primary">
                <Boxes className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-background">
              <div className="h-full w-[78%] rounded-full bg-primary shadow-[0_0_26px_oklch(0.62_0.24_27)]" />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MiniStat label="Plan" value={plan?.name ?? "Standard"} />
              <MiniStat label="RAM" value={`${plan?.ram ?? 4} GB DDR5`} />
              <MiniStat label="SSD" value={`${plan?.storage ?? 50} GB`} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ConsoleMetric icon={Gauge} label="Latency" value="21 ms" tone="red" />
            <ConsoleMetric icon={Network} label="Network" value="10 Gbps" tone="blue" />
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_1.1fr]">
            <div className="rounded-2xl bg-secondary/70 p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Protection
              </div>
              <p className="mt-5 text-3xl font-black">480 Gbps</p>
              <p className="mt-2 text-sm text-muted-foreground">Filtering active</p>
            </div>
            <div className="rounded-2xl bg-secondary/70 p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Instant setup
              </div>
              <p className="mt-5 text-3xl font-black">&lt; 60 sec</p>
              <p className="mt-2 text-sm text-muted-foreground">Panel-ready after payment</p>
            </div>
          </div>

          <Button className="h-12 w-full rounded-xl bg-primary font-bold text-primary-foreground hover:bg-primary/90">
            <Terminal className="mr-2 h-4 w-4" />
            Open Control Panel
          </Button>
        </div>

        <div className="h-1 bg-primary" />
      </div>
    </div>
  );
}

function ConsoleMetric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: "red" | "blue";
}) {
  return (
    <div className="rounded-2xl bg-secondary/80 p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className={`h-4 w-4 ${tone === "red" ? "text-primary" : "text-sky-300"}`} />
        {label}
      </div>
      <p className="mt-7 text-4xl font-black">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-bold">{value}</p>
    </div>
  );
}

function HardwareCard({
  icon: Icon,
  title,
  detail,
  value,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  value: string;
}) {
  return (
    <div className="glass relative overflow-hidden rounded-2xl p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="relative grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <span className="relative rounded-lg bg-secondary/80 px-3 py-1 text-xs font-bold text-primary">
          {value}
        </span>
      </div>
      <h3 className="relative mt-5 text-xl font-black">{title}</h3>
      <p className="relative mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
    </div>
  );
}

function Comparison({ plans }: { plans: CmsPlan[] }) {
  const rows = [
    {
      provider: "RageNodes Game",
      tag: "Best value",
      cpu: "100% CPU",
      ram: "2 GB DDR5",
      storage: "20 GB SSD",
      price: `$${plans[0]?.price ?? "9.94"}/mo`,
      featured: true,
    },
    {
      provider: "Custom Builder",
      tag: "Flexible",
      cpu: "Your choice",
      ram: "1-32 GB",
      storage: "10-500 GB",
      price: "Live estimate",
      featured: false,
    },
  ];

  return (
    <div className="glass rounded-2xl p-5 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Transparent pricing
          </p>
          <h2 className="mt-2 text-3xl font-black md:text-5xl">Know exactly what you pay for</h2>
        </div>
        <p className="max-w-xl text-muted-foreground">
          Flat monthly pricing based on RAM, CPU, SSD, ports and backups. No guessing.
        </p>
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl bg-[#07070a]">
        <div className="grid min-w-[760px] grid-cols-[1.2fr_1fr_1fr_1fr_1fr] bg-secondary/80 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Product</span>
          <span>CPU</span>
          <span>RAM</span>
          <span>Storage</span>
          <span>Price</span>
        </div>
        {rows.map((row) => (
          <div
            key={row.provider}
            className={`grid min-w-[760px] grid-cols-[1.2fr_1fr_1fr_1fr_1fr] items-center gap-3 px-4 py-5 text-sm ${
              row.featured ? "bg-primary/10" : ""
            }`}
          >
            <div>
              <p className="font-bold">{row.provider}</p>
              <p className="text-xs text-muted-foreground">{row.tag}</p>
            </div>
            <span>{row.cpu}</span>
            <span>{row.ram}</span>
            <span>{row.storage}</span>
            <span className="font-bold text-primary">{row.price}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="mx-auto mb-10 max-w-3xl text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
      <h2 className="mt-3 text-4xl font-black md:text-5xl">{title}</h2>
      <p className="mx-auto mt-4 max-w-2xl text-muted-foreground md:text-lg">{desc}</p>
    </div>
  );
}

function SmartButton({
  href,
  children,
  className,
  variant = "default",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "outline" | "ghost";
}) {
  const isInternal = href.startsWith("/");

  return (
    <Button asChild size="lg" variant={variant} className={className}>
      {isInternal ? (
        <Link to={href as never}>{children}</Link>
      ) : (
        <a href={href} target="_blank" rel="noreferrer">
          {children}
        </a>
      )}
    </Button>
  );
}

function PlanPreview({ plan }: { plan: CmsPlan }) {
  return (
    <div className="glass relative flex flex-col rounded-2xl p-6">
      {plan.is_popular && (
        <div className="mb-4 w-fit rounded-lg bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-foreground">
          Most Popular
        </div>
      )}
      <h3 className="text-xl font-black">{plan.name}</h3>
      <p className="mt-2 min-h-10 text-sm text-muted-foreground">{plan.description}</p>
      <div className="mt-6 flex items-end gap-1">
        <span className="text-5xl font-black">${plan.price}</span>
        <span className="pb-1 text-muted-foreground">/{plan.billing_cycle}</span>
      </div>
      <ul className="mt-6 flex-1 space-y-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Button
        asChild
        className={`mt-7 w-full rounded-xl ${
          plan.is_popular ? "bg-gradient-to-r from-primary to-accent" : "bg-secondary/70"
        }`}
        variant={plan.is_popular ? "default" : "ghost"}
      >
        <Link to="/order">Order Now</Link>
      </Button>
    </div>
  );
}

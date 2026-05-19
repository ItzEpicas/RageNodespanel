import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Boxes, Database, Globe, PackageOpen, ServerCog, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeatureCard } from "@/components/FeatureCard";
import { PricingCard } from "@/components/PricingCard";
import { MINECRAFT_SOFTWARE } from "@/constants/pricing";
import { DEFAULT_PLANS, fetchActivePlans, type CmsPlan } from "@/lib/cms";

export const Route = createFileRoute("/minecraft")({
  head: () => ({
    meta: [
      { title: "Minecraft Hosting - RageNodes" },
      {
        name: "description",
        content:
          "Premium Minecraft hosting with Paper, Purpur, Vanilla, Forge, Fabric, modpacks, backups, DDoS protection, and Pterodactyl panel.",
      },
    ],
  }),
  component: MinecraftPage,
});

function MinecraftPage() {
  const [plans, setPlans] = useState<CmsPlan[]>(
    DEFAULT_PLANS.filter((plan) => plan.category === "Minecraft"),
  );

  useEffect(() => {
    fetchActivePlans("Minecraft").then(setPlans);
  }, []);

  return (
    <div className="container mx-auto px-4 py-16 md:py-24">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(120deg,rgba(255,58,58,0.12),rgba(7,7,10,0.94)_34%,rgba(7,7,10,1))] p-8 md:p-12">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="absolute right-[-8%] top-[-10%] h-64 w-64 rounded-full bg-primary/10 blur-[100px]" />
        <div className="relative max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Minecraft Hosting
          </p>
          <h1 className="mt-3 text-5xl font-bold md:text-7xl">
            Minecraft servers built on serious hardware
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            Run Vanilla, Paper, Purpur, Forge, Fabric, plugins, and modpacks on Ryzen CPUs, DDR5
            memory, NVMe storage, and DDoS protected networking.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-gradient-to-r from-primary to-accent glow-red">
              <Link to="/order">Order Now</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/builder">Build Custom</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-3xl flex-wrap justify-center gap-2">
        {MINECRAFT_SOFTWARE.map((software) => (
          <span key={software} className="glass rounded-full px-4 py-2 text-sm">
            {software}
          </span>
        ))}
      </div>

      <div className="mt-16 grid gap-5 md:grid-cols-3">
        <FeatureCard
          icon={PackageOpen}
          title="Modpacks support"
          description="Bring CurseForge, Modrinth, Forge, Fabric, and custom packs to your server."
        />
        <FeatureCard
          icon={Globe}
          title="Free subdomain"
          description="Use a clean RageNodes subdomain while you prepare your own domain."
        />
        <FeatureCard
          icon={Database}
          title="Backups"
          description="Create and restore backups for worlds, configs, plugins, and saves."
        />
        <FeatureCard
          icon={ShieldCheck}
          title="DDoS protection"
          description="Network protection helps keep your server online during attacks."
        />
        <FeatureCard
          icon={ServerCog}
          title="Pterodactyl panel"
          description="Manage files, console, schedules, databases, and power controls in one place."
        />
        <FeatureCard
          icon={Boxes}
          title="Plugin friendly"
          description="Performance headroom for plugins, datapacks, maps, and growing communities."
        />
      </div>

      <div className="mt-24">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-4xl font-bold md:text-5xl">Minecraft pricing</h2>
          <p className="mt-4 text-muted-foreground">
            Simple plans for SMPs, modpacks, plugins, and communities.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <PricingCard
              key={plan.id}
              name={plan.name}
              price={plan.price}
              description={plan.description ?? undefined}
              badge={plan.is_popular ? "Most Popular" : undefined}
              buttonLabel="Order Now"
              features={plan.features}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

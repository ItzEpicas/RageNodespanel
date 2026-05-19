import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PricingCard } from "@/components/PricingCard";
import { Button } from "@/components/ui/button";
import { GAME_PRICING } from "@/constants/pricing";
import { DEFAULT_PLANS, fetchActivePlans, type CmsPlan } from "@/lib/cms";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing - RageNodes" },
      {
        name: "description",
        content:
          "Transparent game server hosting pricing powered by Ryzen CPUs, DDR5 memory, and NVMe SSD storage.",
      },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  const [gamePlans, setGamePlans] = useState<CmsPlan[]>(
    DEFAULT_PLANS.filter((plan) => plan.category === "Game Server"),
  );

  useEffect(() => {
    fetchActivePlans("Game Server").then(setGamePlans);
  }, []);

  return (
    <div className="container mx-auto px-4 py-16 md:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Pricing</p>
        <h1 className="mt-3 text-5xl font-bold md:text-7xl">Simple, honest pricing</h1>
        <p className="mt-5 text-lg text-muted-foreground">
          Game server plans and custom builds without confusing tiers.
        </p>
      </div>

      <div className="mt-16">
        <h2 className="text-center text-3xl font-bold md:text-4xl">Game server hosting</h2>
        <div className="mx-auto mt-10 grid max-w-6xl gap-6 md:grid-cols-3">
          {gamePlans.map((plan) => (
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

      <div className="mx-auto mt-24 max-w-3xl">
        <h2 className="text-center text-3xl font-bold">Custom build pricing</h2>
        <p className="mt-2 text-center text-muted-foreground">
          Pay only for what you need. Adjust at any time.
        </p>
        <div className="glass mt-8 overflow-hidden rounded-2xl divide-y divide-border/50">
          {[
            { label: "DDR5 RAM", price: `$${GAME_PRICING.ramPerGb.toFixed(2)} / 1GB` },
            { label: "SSD storage", price: `$${GAME_PRICING.storagePer50Gb.toFixed(2)} / 50GB` },
            { label: "CPU", price: `$${GAME_PRICING.cpuPer100Percent.toFixed(2)} / 100%` },
            {
              label: "Additional port",
              price: `$${GAME_PRICING.additionalPort.toFixed(2)} / port`,
            },
            { label: "Backup", price: `$${GAME_PRICING.backup.toFixed(2)} / backup` },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 p-5">
              <span>{row.label}</span>
              <span className="font-mono text-primary">{row.price}</span>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Button asChild size="lg" className="bg-gradient-to-r from-primary to-accent glow-red">
            <Link to="/builder">Open the builder</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

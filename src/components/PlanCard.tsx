import { Check } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

interface Plan {
  id: string;
  name: string;
  price: number;
  ram: number;
  ssd: number;
  cpu: number;
  backups: number;
  databases: number;
  tagline: string;
  popular: boolean;
}

export function PlanCard({ plan }: { plan: Plan }) {
  const shortName = plan.id.charAt(0).toUpperCase() + plan.id.slice(1);
  const features = [
    `${plan.ram}GB DDR5 RAM`,
    `${plan.ssd}GB NVMe SSD`,
    `${plan.cpu}% Ryzen CPU`,
    `${plan.backups} backup${plan.backups > 1 ? "s" : ""}`,
    `${plan.databases} database${plan.databases > 1 ? "s" : ""}`,
    "DDoS protection",
  ];
  return (
    <div
      className={`relative glass rounded-2xl p-6 flex flex-col transition-all hover:-translate-y-1 ${
        plan.popular ? "border-primary/60 glow-red-soft" : ""
      }`}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground text-xs font-semibold uppercase tracking-wider glow-red">
          Most Popular
        </div>
      )}
      <h3 className="text-xl font-bold">{plan.name}</h3>
      <p className="text-sm text-muted-foreground mt-1">{plan.tagline}</p>
      <div className="mt-6 flex items-baseline gap-1">
        <span className="text-5xl font-black">${plan.price}</span>
        <span className="text-muted-foreground">/mo</span>
      </div>
      <ul className="mt-6 space-y-3 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link to="/order" search={{ plan: plan.id }} className="mt-6">
        <Button
          className={`w-full ${
            plan.popular ? "bg-gradient-to-r from-primary to-accent glow-red" : ""
          }`}
          variant={plan.popular ? "default" : "outline"}
        >
          Order {shortName}
        </Button>
      </Link>
    </div>
  );
}

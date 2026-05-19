import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PricingCard({
  name,
  price,
  description,
  features,
  badge,
  buttonLabel,
  buttonTo = "/order",
}: {
  name: string;
  price: number;
  description?: string;
  features: string[];
  badge?: string;
  buttonLabel: string;
  buttonTo?: "/order" | "/builder";
}) {
  return (
    <div
      className={`glass relative flex flex-col rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 ${
        badge ? "border-primary/60 glow-red-soft" : "hover:border-primary/40"
      }`}
    >
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary to-accent px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-foreground glow-red">
          {badge}
        </div>
      )}
      <h3 className="text-xl font-bold">{name}</h3>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-6 flex items-end gap-1">
        <span className="text-5xl font-black">${price}</span>
        <span className="pb-1 text-muted-foreground">/month</span>
      </div>
      <ul className="mt-6 flex-1 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Button
        asChild
        className={`mt-7 w-full ${badge ? "bg-gradient-to-r from-primary to-accent glow-red" : ""}`}
        variant={badge ? "default" : "outline"}
      >
        <Link to={buttonTo}>{buttonLabel}</Link>
      </Button>
    </div>
  );
}

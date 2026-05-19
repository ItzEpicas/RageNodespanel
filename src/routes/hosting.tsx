import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PlanCard } from "@/components/PlanCard";
import { PLANS, SOFTWARE } from "@/lib/pricing";
import { Boxes, Database, GitBranch, ShieldCheck, Sparkles, Wrench } from "lucide-react";

export const Route = createFileRoute("/hosting")({
  head: () => ({
    meta: [
      { title: "Minecraft Hosting — RageNodes" },
      {
        name: "description",
        content:
          "DDR5 Ryzen Minecraft hosting — Paper, Purpur, Fabric, Forge, Vanilla. One-click installs and instant deploy.",
      },
    ],
  }),
  component: HostingPage,
});

function HostingPage() {
  return (
    <div className="container mx-auto px-4 py-16 md:py-24">
      <div className="max-w-3xl">
        <p className="text-primary font-semibold uppercase tracking-wider text-sm">
          Minecraft Hosting
        </p>
        <h1 className="text-4xl md:text-6xl font-bold mt-3">
          Hosting tuned for Minecraft, not generic shared hosting
        </h1>
        <p className="text-lg text-muted-foreground mt-5">
          Every node is hand-tuned for Minecraft TPS. Pre-installed JARs, instant version switching,
          and a modern panel built on Pterodactyl.
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          {SOFTWARE.map((s) => (
            <span key={s} className="px-3 py-1.5 rounded-full glass text-sm">
              {s}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-20 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[
          {
            icon: Sparkles,
            title: "One-click modpack installs",
            desc: "Curseforge & Modrinth modpacks deploy in a single click.",
          },
          {
            icon: GitBranch,
            title: "Any version, any time",
            desc: "Switch between 1.8 and 1.21 with one dropdown.",
          },
          {
            icon: Database,
            title: "Free MySQL databases",
            desc: "Phpmyadmin included. Make plugins fly.",
          },
          {
            icon: Boxes,
            title: "SFTP & file manager",
            desc: "Drag, drop, edit. Or use the in-browser code editor.",
          },
          {
            icon: ShieldCheck,
            title: "Automated backups",
            desc: "Restore your world to any point in seconds.",
          },
          {
            icon: Wrench,
            title: "Schedules & tasks",
            desc: "Auto restart, broadcast, run console commands on cron.",
          },
        ].map((f) => (
          <div key={f.title} className="glass rounded-2xl p-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 grid place-items-center mb-4">
              <f.icon className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">{f.title}</h3>
            <p className="text-sm text-muted-foreground mt-2">{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-24">
        <h2 className="text-3xl md:text-4xl font-bold text-center">Pick a plan to get started</h2>
        <div className="grid md:grid-cols-3 gap-6 mt-10 max-w-6xl mx-auto">
          {PLANS.map((p) => (
            <PlanCard key={p.id} plan={p} />
          ))}
        </div>
        <div className="text-center mt-10">
          <Link to="/builder">
            <Button variant="outline" size="lg">
              Build a custom server
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

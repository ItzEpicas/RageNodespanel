import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/vps")({
  head: () => ({
    meta: [
      { title: "Product Update - RageNodes" },
      {
        name: "description",
        content:
          "VPS hosting is no longer offered. Explore RageNodes game servers and custom builds.",
      },
    ],
  }),
  component: VpsPage,
});

function VpsPage() {
  return (
    <div className="container mx-auto px-4 py-16 md:py-24">
      <div className="glass mx-auto max-w-4xl rounded-[2rem] p-8 text-center md:p-12">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Boxes className="h-7 w-7" />
        </div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-primary">
          Product update
        </p>
        <h1 className="mt-3 text-4xl font-black md:text-6xl">
          VPS is no longer part of the lineup
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
          We now focus the public catalog on game servers, Minecraft hosting, and custom builds.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="bg-gradient-to-r from-primary to-accent glow-red">
            <Link to="/pricing">
              View pricing
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/builder">Open builder</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

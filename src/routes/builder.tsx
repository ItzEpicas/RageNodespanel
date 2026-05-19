import { createFileRoute } from "@tanstack/react-router";
import { BuilderCalculator } from "@/components/BuilderCalculator";

export const Route = createFileRoute("/builder")({
  head: () => ({
    meta: [
      { title: "Custom Server Builder - RageNodes" },
      {
        name: "description",
        content:
          "Build a custom Minecraft server or game server with live pricing and RageNodes hardware.",
      },
    ],
  }),
  component: BuilderPage,
});

function BuilderPage() {
  return (
    <div className="container mx-auto px-4 py-16 md:py-20">
      <div className="mb-10 max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">
          Custom builder
        </p>
        <h1 className="mt-3 text-4xl font-bold md:text-6xl">Build your own custom server</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Choose RAM, CPU, storage, backups, ports, game, and software. The estimate updates live
          before you continue to order.
        </p>
      </div>
      <BuilderCalculator />
    </div>
  );
}

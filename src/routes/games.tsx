import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Gamepad2, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FeatureCard } from "@/components/FeatureCard";
import { GameCard } from "@/components/GameCard";
import { GAME_CATEGORIES, type GameFilter } from "@/constants/games";
import { DEFAULT_GAMES, fetchActiveGames, type CmsGame } from "@/lib/cms";

export const Route = createFileRoute("/games")({
  head: () => ({
    meta: [
      { title: "Game Server Hosting - RageNodes" },
      {
        name: "description",
        content:
          "Host Minecraft, Rust, Counter-Strike 2, ARK, Palworld, Valheim, DayZ, FiveM, and more on RageNodes.",
      },
    ],
  }),
  component: GamesPage,
});

function GamesPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<GameFilter>("All");
  const [sourceGames, setSourceGames] = useState<CmsGame[]>(DEFAULT_GAMES);

  useEffect(() => {
    fetchActiveGames().then(setSourceGames);
  }, []);

  const games = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return sourceGames.filter((game) => {
      const matchesSearch =
        !needle ||
        game.name.toLowerCase().includes(needle) ||
        game.description.toLowerCase().includes(needle);
      const matchesCategory = filter === "All" || game.category === filter;
      return matchesSearch && matchesCategory;
    });
  }, [filter, search, sourceGames]);

  return (
    <div className="container mx-auto px-4 py-16 md:py-24">
      <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Game Hosting
          </p>
          <h1 className="mt-3 text-5xl font-bold md:text-7xl">Host your favorite game</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            Serious hosting for survival worlds, modded servers, FPS communities, automation games,
            and roleplay networks.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-gradient-to-r from-primary to-accent glow-red">
              <Link to="/order">
                Order Now
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/builder">Start Building</Link>
            </Button>
          </div>
        </div>
        <div className="glass relative min-h-[340px] overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,58,58,0.16),rgba(8,8,12,0.92)_36%,rgba(8,8,12,1))]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,58,58,0.24),transparent_32%)]" />
          <div className="absolute inset-0 grid-bg opacity-20" />
          <div className="absolute inset-x-6 bottom-6 grid gap-3 sm:grid-cols-2">
            {["Minecraft", "Rust", "FiveM", "CS2"].map((title) => (
              <div
                key={title}
                className="rounded-2xl border border-white/10 bg-black/42 px-4 py-3 text-sm font-semibold text-white/88 backdrop-blur-md"
              >
                {title}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-16 grid gap-5 md:grid-cols-3">
        <FeatureCard
          icon={Zap}
          title="Fast deploys"
          description="Launch configured game servers quickly with storage and memory ready for real workloads."
        />
        <FeatureCard
          icon={Shield}
          title="Protected network"
          description="DDoS protection helps keep communities reachable during busy launches and events."
        />
        <FeatureCard
          icon={Gamepad2}
          title="Broad game support"
          description="Run popular titles across survival, sandbox, FPS, racing, simulation, and automation."
        />
      </div>

      <div className="glass mt-16 rounded-3xl p-5 md:p-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search games..."
            className="h-11"
          />
          <div className="flex flex-wrap gap-2">
            {GAME_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setFilter(category)}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                  filter === category
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {games.map((game) => (
          <GameCard key={game.name} game={game} />
        ))}
        {games.length === 0 && (
          <div className="glass col-span-full rounded-2xl p-8 text-center text-muted-foreground">
            No games found.
          </div>
        )}
      </div>
    </div>
  );
}

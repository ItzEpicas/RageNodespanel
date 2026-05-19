import { Link } from "@tanstack/react-router";
import { Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CmsGame } from "@/lib/cms";
import { getGameImageUrl } from "@/lib/game-images";

export function GameCard({ game }: { game: CmsGame }) {
  const imageUrl = getGameImageUrl(game.name, game.image_url);

  return (
    <div className="glass flex min-h-64 flex-col overflow-hidden rounded-2xl p-0 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50">
      <div
        className="relative h-40 overflow-hidden border-b border-white/10 bg-[linear-gradient(135deg,rgba(255,58,58,0.14),rgba(10,10,14,0.92)_42%,rgba(10,10,14,1))]"
        style={
          imageUrl
            ? {
                backgroundImage: `linear-gradient(180deg, rgba(8,8,12,0.12), rgba(8,8,12,0.84)), url(${imageUrl})`,
                backgroundPosition: "center",
                backgroundSize: "cover",
              }
            : undefined
        }
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,58,58,0.22),transparent_38%)]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        <span className="absolute right-5 top-5 rounded-full border border-white/10 bg-black/45 px-3 py-1 text-xs text-white/80 backdrop-blur-md">
          {game.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold">{game.name}</h3>
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Gamepad2 className="h-4 w-4" />
          </div>
        </div>
        <p className="flex-1 text-sm leading-6 text-muted-foreground">{game.description}</p>
        <div className="mt-5 text-sm">
          <span className="text-muted-foreground">Starting at </span>
          <span className="font-semibold text-primary">{game.starting_price}</span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button asChild className="bg-gradient-to-r from-primary to-accent glow-red">
            <Link to="/order">Order</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/builder">Configure</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

import { Link } from "@tanstack/react-router";

export function Logo() {
  return (
    <Link to="/" className="group flex items-center gap-2">
      <img
        src="/logo.png"
        alt="RageNodes"
        className="h-9 w-9 object-contain transition-transform group-hover:scale-110"
      />
      <span className="text-lg font-bold tracking-tight">
        Rage<span className="text-primary text-glow">Nodes</span>
      </span>
    </Link>
  );
}

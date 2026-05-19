import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { DEFAULT_SETTINGS, fetchSiteSettings } from "@/lib/cms";
import { MessagesSquare, Mail, ExternalLink, Clock } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact & Discord Support - RageNodes" },
      { name: "description", content: "Get help from the RageNodes team on Discord or by email." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    void fetchSiteSettings().then(setSettings);
  }, []);

  return (
    <div className="container mx-auto px-4 py-16 md:py-24 max-w-4xl">
      <div className="text-center">
        <h1 className="text-5xl md:text-6xl font-bold">We're on Discord</h1>
        <p className="text-muted-foreground mt-4 text-lg max-w-xl mx-auto">
          The fastest way to get help. Open a ticket and a real human responds - usually in minutes.
        </p>
      </div>

      <div className="mt-14 grid md:grid-cols-2 gap-6">
        <a
          href={settings.discord_invite_url}
          target="_blank"
          rel="noreferrer"
          className="glass rounded-2xl p-8 hover:border-primary/50 transition-all hover:-translate-y-1"
        >
          <MessagesSquare className="w-8 h-8 text-primary" />
          <h3 className="text-xl font-bold mt-4">Join our Discord</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Live chat, support tickets, server status, and a community of players.
          </p>
          <Button className="mt-6 bg-gradient-to-r from-primary to-accent w-full glow-red">
            Join server <ExternalLink className="w-4 h-4 ml-1" />
          </Button>
        </a>
        <a
          href={`mailto:${settings.support_email}`}
          className="glass rounded-2xl p-8 hover:border-primary/50 transition-all hover:-translate-y-1"
        >
          <Mail className="w-8 h-8 text-primary" />
          <h3 className="text-xl font-bold mt-4">Email us</h3>
          <p className="text-sm text-muted-foreground mt-2">
            For billing, partnerships, or anything that doesn't fit a Discord ticket.
          </p>
          <Button variant="outline" className="mt-6 w-full">
            {settings.support_email}
          </Button>
        </a>
      </div>

      <div className="mt-10 glass rounded-2xl p-6 flex items-start gap-4">
        <Clock className="w-5 h-5 text-primary mt-1 shrink-0" />
        <div>
          <h4 className="font-semibold">Response times</h4>
          <p className="text-sm text-muted-foreground mt-1">
            Average first response on Discord:{" "}
            <span className="text-foreground font-medium">under 5 minutes</span>. Email: within 24
            hours.
          </p>
        </div>
      </div>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        Already a customer?{" "}
        <a
          href={settings.panel_url}
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline"
        >
          Open the game panel
        </a>
      </div>
    </div>
  );
}

import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { DEFAULT_SETTINGS, fetchSiteSettings } from "@/lib/cms";

export function Footer() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    fetchSiteSettings().then(setSettings);
  }, []);

  return (
    <footer className="mt-24 border-t bg-background/85 backdrop-blur-xl">
      <div className="container mx-auto px-4 py-12 grid grid-cols-2 lg:grid-cols-5 gap-8">
        <div className="col-span-2">
          <Logo />
          <p className="text-sm text-muted-foreground mt-3 max-w-sm">
            Premium game server hosting powered by Ryzen hardware, DDR5 memory, and NVMe SSDs.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3">Product</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/games" className="hover:text-primary">
                Game Hosting
              </Link>
            </li>
            <li>
              <Link to="/minecraft" className="hover:text-primary">
                Minecraft Hosting
              </Link>
            </li>
            <li>
              <Link to="/builder" className="hover:text-primary">
                Custom Builder
              </Link>
            </li>
            <li>
              <Link to="/sponsorships" className="hover:text-primary">
                Sponsorships
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3">Support</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/faq" className="hover:text-primary">
                FAQ
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-primary">
                Contact
              </Link>
            </li>
            <li>
              <a
                href={settings.discord_invite_url}
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary"
              >
                Discord
              </a>
            </li>
            <li>
              <a
                href={settings.panel_url}
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary"
              >
                Panel
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3">Company</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/terms" className="hover:text-primary">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="hover:text-primary">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/status" className="hover:text-primary">
                Status
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t py-5 text-center text-xs text-muted-foreground">
        Copyright {new Date().getFullYear()} {settings.site_name}. All rights reserved.
      </div>
    </footer>
  );
}

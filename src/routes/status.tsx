import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [{ title: "Status - RageNodes" }],
  }),
  component: StatusPage,
});

function StatusPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16 md:py-24">
      <div className="glass rounded-3xl p-8 text-center md:p-10">
        <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
        <h1 className="mt-4 text-4xl font-bold md:text-6xl">Status</h1>
        <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
          Service updates and incidents are shared through the RageNodes Discord. If you are
          experiencing an issue, open a support ticket and our team will check it quickly.
        </p>
      </div>
    </div>
  );
}

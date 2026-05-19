import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [{ title: "Terms of Service - RageNodes" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16 md:py-24">
      <div className="glass rounded-3xl p-8 md:p-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Company</p>
        <h1 className="mt-3 text-4xl font-bold md:text-6xl">Terms of Service</h1>
        <p className="mt-5 text-muted-foreground">
          RageNodes provides game server hosting services. Customers are responsible for the
          content, software, and activity hosted on their services. Abuse, illegal activity,
          attacks, spam, and attempts to disrupt the network are not permitted.
        </p>
        <p className="mt-4 text-muted-foreground">
          For billing, service, or acceptable use questions, contact support through Discord or the
          contact page.
        </p>
      </div>
    </div>
  );
}

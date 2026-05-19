import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [{ title: "Privacy Policy - RageNodes" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16 md:py-24">
      <div className="glass rounded-3xl p-8 md:p-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Company</p>
        <h1 className="mt-3 text-4xl font-bold md:text-6xl">Privacy Policy</h1>
        <p className="mt-5 text-muted-foreground">
          RageNodes collects order details such as name, email, Discord username, selected plan, and
          server configuration so we can provision services and provide support.
        </p>
        <p className="mt-4 text-muted-foreground">
          We use this information for billing, support, abuse prevention, and service communication.
          Contact support if you need help with your account data.
        </p>
      </div>
    </div>
  );
}

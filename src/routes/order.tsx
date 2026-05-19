import { createFileRoute } from "@tanstack/react-router";
import { OrderForm } from "@/components/OrderForm";

export const Route = createFileRoute("/order")({
  head: () => ({
    meta: [
      { title: "Order Request - RageNodes" },
      {
        name: "description",
        content:
          "Submit a RageNodes game server, Minecraft server, or custom hosting order request.",
      },
    ],
  }),
  component: OrderPage,
});

function OrderPage() {
  return (
    <div className="container mx-auto px-4 py-16 md:py-20">
      <div className="mb-10 max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Order request</p>
        <h1 className="mt-3 text-4xl font-bold md:text-6xl">Launch with RageNodes</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Submit your order request and our team will contact you on Discord to confirm setup and
          payment instructions.
        </p>
      </div>
      <OrderForm />
    </div>
  );
}

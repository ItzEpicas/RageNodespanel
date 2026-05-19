import type { OrderStatus } from "@/constants/pricing";

const STATUS_STYLES: Record<OrderStatus, string> = {
  Pending: "border-red-400/30 bg-red-400/10 text-red-200",
  Contacted: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  "Waiting Payment": "border-primary/40 bg-primary/15 text-primary",
  Paid: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  "Server Created": "border-primary/40 bg-primary/15 text-primary",
  Cancelled: "border-white/15 bg-white/5 text-muted-foreground",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

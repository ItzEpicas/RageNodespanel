import { useEffect, useMemo, useState } from "react";
import { Eye, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ORDER_STATUSES, type OrderStatus } from "@/constants/pricing";
import { isSupabaseConfigured, supabase, SUPABASE_CONFIG_ERROR } from "@/lib/supabase";
import type { HostingType, OrderRow } from "@/types/orders";
import { StatusBadge } from "./StatusBadge";

const HOSTING_FILTERS = ["All", "Minecraft", "Game Server", "VPS", "Custom"] as const;

export function AdminOrdersTable() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [hostingFilter, setHostingFilter] = useState("All");
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);

  const loadOrders = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      toast.error(SUPABASE_CONFIG_ERROR);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    setLoading(false);

    if (error) {
      toast.error(error.message || "Failed to load orders.");
      return;
    }

    setOrders((data ?? []) as OrderRow[]);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesSearch =
        !needle ||
        [
          order.full_name,
          order.email,
          order.discord_username,
          order.server_name,
          order.selected_game,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle));

      const matchesStatus = statusFilter === "All" || order.status === statusFilter;
      const matchesHosting = hostingFilter === "All" || order.hosting_type === hostingFilter;

      return matchesSearch && matchesStatus && matchesHosting;
    });
  }, [orders, search, statusFilter, hostingFilter]);

  const updateStatus = async (order: OrderRow, status: OrderStatus) => {
    if (!isSupabaseConfigured) {
      toast.error(SUPABASE_CONFIG_ERROR);
      return;
    }

    const { error } = await supabase.from("orders").update({ status }).eq("id", order.id);

    if (error) {
      toast.error(error.message || "Failed to update order status.");
      return;
    }

    setOrders((current) =>
      current.map((item) => (item.id === order.id ? { ...item, status } : item)),
    );
    toast.success("Order status updated");
  };

  const deleteOrder = async (order: OrderRow) => {
    if (!window.confirm("Are you sure you want to delete this?")) return;
    if (!isSupabaseConfigured) {
      toast.error(SUPABASE_CONFIG_ERROR);
      return;
    }

    const { error } = await supabase.from("orders").delete().eq("id", order.id);

    if (error) {
      toast.error(error.message || "Failed to delete order.");
      return;
    }

    setOrders((current) => current.filter((item) => item.id !== order.id));
    toast.success("Test order deleted");
  };

  return (
    <>
      <div className="glass rounded-3xl p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_auto]">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email, Discord, server, or game..."
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All statuses</SelectItem>
              {ORDER_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={hostingFilter} onValueChange={setHostingFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HOSTING_FILTERS.map((type) => (
                <SelectItem key={type} value={type}>
                  {type === "All" ? "All hosting" : type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadOrders}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[1180px] text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-3 text-left">Date</th>
                <th className="px-3 py-3 text-left">Full name</th>
                <th className="px-3 py-3 text-left">Email</th>
                <th className="px-3 py-3 text-left">Discord username</th>
                <th className="px-3 py-3 text-left">Hosting type</th>
                <th className="px-3 py-3 text-left">Game</th>
                <th className="px-3 py-3 text-left">Plan</th>
                <th className="px-3 py-3 text-left">Server name</th>
                <th className="px-3 py-3 text-left">RAM</th>
                <th className="px-3 py-3 text-left">CPU / vCPU</th>
                <th className="px-3 py-3 text-left">Storage</th>
                <th className="px-3 py-3 text-left">Estimated price</th>
                <th className="px-3 py-3 text-left">Payment method</th>
                <th className="px-3 py-3 text-left">Status</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={15} className="px-3 py-10 text-center text-muted-foreground">
                    Loading orders...
                  </td>
                </tr>
              )}
              {!loading && filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={15} className="px-3 py-10 text-center text-muted-foreground">
                    No orders found.
                  </td>
                </tr>
              )}
              {filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-white/5 transition-colors hover:bg-white/[0.03]"
                >
                  <td className="px-3 py-3 text-muted-foreground">
                    {new Date(order.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-3 font-medium">{order.full_name}</td>
                  <td className="px-3 py-3 text-muted-foreground">{order.email}</td>
                  <td className="px-3 py-3 text-primary">{order.discord_username}</td>
                  <td className="px-3 py-3">{order.hosting_type}</td>
                  <td className="px-3 py-3">{order.selected_game || "-"}</td>
                  <td className="px-3 py-3">{order.selected_plan || "-"}</td>
                  <td className="px-3 py-3">{order.server_name || "-"}</td>
                  <td className="px-3 py-3">{order.ram ? `${order.ram}GB` : "-"}</td>
                  <td className="px-3 py-3">
                    {order.hosting_type === "VPS"
                      ? `${order.vcpu ?? 0} vCPU`
                      : `${order.cpu ?? 0}%`}
                  </td>
                  <td className="px-3 py-3">{order.storage ? `${order.storage}GB` : "-"}</td>
                  <td className="px-3 py-3 font-mono">
                    ${Number(order.estimated_price ?? 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-3">{order.payment_method || "-"}</td>
                  <td className="px-3 py-3">
                    <Select
                      value={order.status}
                      onValueChange={(value) => updateStatus(order, value as OrderStatus)}
                    >
                      <SelectTrigger className="h-8 w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORDER_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="icon" onClick={() => setSelectedOrder(order)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => deleteOrder(order)}>
                        <Trash2 className="h-4 w-4 text-primary" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog
        open={Boolean(selectedOrder)}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
      >
        <DialogContent className="glass max-h-[85vh] overflow-y-auto border-white/10 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order details</DialogTitle>
            <DialogDescription>Full order configuration and customer notes.</DialogDescription>
          </DialogHeader>
          {selectedOrder && <OrderDetails order={selectedOrder} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function OrderDetails({ order }: { order: OrderRow }) {
  const rows: Array<[string, string | number | null | undefined]> = [
    ["Status", order.status],
    ["Full name", order.full_name],
    ["Email", order.email],
    ["Discord username", order.discord_username],
    ["Hosting type", order.hosting_type],
    ["Game", order.selected_game],
    ["Plan", order.selected_plan],
    ["Server name", order.server_name],
    ["RAM", order.ram ? `${order.ram}GB` : null],
    ["CPU", order.cpu ? `${order.cpu}%` : null],
    ["vCPU", order.vcpu],
    ["Storage", order.storage ? `${order.storage}GB` : null],
    ["Backups", order.backups],
    ["Extra ports", order.extra_ports],
    ["Minecraft version", order.minecraft_version],
    ["Server software", order.server_software],
    ["Operating system", order.operating_system],
    ["IPv4 count", order.ipv4_count],
    ["Payment method", order.payment_method],
    ["Estimated price", `$${Number(order.estimated_price ?? 0).toFixed(2)}`],
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <StatusBadge status={order.status} />
        <span className="text-sm text-muted-foreground">
          Created {new Date(order.created_at).toLocaleString()}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
            <div className="mt-1 font-medium">{value || "-"}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Notes</div>
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
          {order.notes || "No notes."}
        </p>
      </div>
    </div>
  );
}

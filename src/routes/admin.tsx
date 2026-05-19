import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  DollarSign,
  Gamepad2,
  Layers3,
  Server,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminLayout } from "@/components/AdminLayout";
import { StatCard } from "@/components/StatCard";
import { ORDER_STATUSES } from "@/constants/pricing";
import { isSupabaseConfigured, supabase, SUPABASE_CONFIG_ERROR } from "@/lib/supabase";
import type { OrderRow } from "@/types/orders";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin Dashboard - RageNodes" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminPage,
});

function AdminPage() {
  const location = useLocation();

  if (location.pathname !== "/admin") {
    return <Outlet />;
  }

  return (
    <AdminLayout>
      <AdminDashboard />
    </AdminLayout>
  );
}

function AdminDashboard() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [totalGames, setTotalGames] = useState(0);
  const [totalPlans, setTotalPlans] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!isSupabaseConfigured) {
        setError(SUPABASE_CONFIG_ERROR);
        return;
      }

      const { data, error: loadError } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (loadError) {
        setError(loadError.message);
        return;
      }
      setOrders((data ?? []) as OrderRow[]);

      const [{ count: gameCount }, { count: planCount }] = await Promise.all([
        supabase.from("games").select("id", { count: "exact", head: true }),
        supabase.from("plans").select("id", { count: "exact", head: true }),
      ]);
      setTotalGames(gameCount ?? 0);
      setTotalPlans(planCount ?? 0);
    }

    load();
  }, []);

  const stats = useMemo(() => {
    const count = (status: (typeof ORDER_STATUSES)[number]) =>
      orders.filter((order) => order.status === status).length;
    const revenue = orders
      .filter((order) => order.status === "Paid" || order.status === "Server Created")
      .reduce((total, order) => total + Number(order.estimated_price ?? 0), 0);

    return {
      total: orders.length,
      pending: count("Pending"),
      waitingPayment: count("Waiting Payment"),
      paid: count("Paid"),
      created: count("Server Created"),
      revenue,
    };
  }, [orders]);

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Admin</p>
          <h1 className="mt-2 text-4xl font-bold">Dashboard overview</h1>
          <p className="mt-2 text-muted-foreground">
            Review RageNodes order activity and jump into order management.
          </p>
        </div>
        <Button asChild className="bg-gradient-to-r from-primary to-accent glow-red">
          <Link to="/admin/orders">Manage Orders</Link>
        </Button>
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm text-primary">
          {error}
        </div>
      )}

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ShoppingCart} label="Total Orders" value={stats.total} />
        <StatCard icon={Clock} label="Pending Orders" value={stats.pending} />
        <StatCard icon={DollarSign} label="Waiting Payment" value={stats.waitingPayment} />
        <StatCard icon={CheckCircle2} label="Paid Orders" value={stats.paid} />
        <StatCard icon={Server} label="Created Servers" value={stats.created} />
        <StatCard icon={Gamepad2} label="Total Games" value={totalGames} />
        <StatCard icon={Layers3} label="Total Plans" value={totalPlans} />
        <StatCard
          icon={DollarSign}
          label="Estimated Revenue"
          value={`$${stats.revenue.toFixed(2)}`}
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="glass rounded-3xl p-5">
          <h2 className="text-xl font-bold">Recent orders</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 text-left">Date</th>
                  <th className="px-3 py-3 text-left">Customer</th>
                  <th className="px-3 py-3 text-left">Type</th>
                  <th className="px-3 py-3 text-left">Status</th>
                  <th className="px-3 py-3 text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 6).map((order) => (
                  <tr key={order.id} className="border-b border-white/5">
                    <td className="px-3 py-3 text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-3">{order.full_name}</td>
                    <td className="px-3 py-3">{order.hosting_type}</td>
                    <td className="px-3 py-3">{order.status}</td>
                    <td className="px-3 py-3 text-right font-mono">
                      ${Number(order.estimated_price ?? 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                      No orders yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass rounded-3xl p-5">
          <h2 className="text-xl font-bold">Quick actions</h2>
          <div className="mt-4 grid gap-3">
            <Button asChild variant="outline">
              <Link to="/admin/games">Add Game</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/admin/pricing">Add Plan</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/admin/homepage">Edit Homepage</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/admin/sponsorships">Review Sponsorships</Link>
            </Button>
            <Button asChild className="bg-gradient-to-r from-primary to-accent glow-red">
              <Link to="/admin/orders">Manage Orders</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

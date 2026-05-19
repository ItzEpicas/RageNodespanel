import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import { AdminOrdersTable } from "@/components/AdminOrdersTable";

export const Route = createFileRoute("/admin/orders")({
  head: () => ({
    meta: [{ title: "Admin Orders - RageNodes" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminOrdersPage,
});

function AdminOrdersPage() {
  return (
    <AdminLayout>
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Admin</p>
        <h1 className="mt-2 text-4xl font-bold">Orders management</h1>
        <p className="mt-2 text-muted-foreground">
          Search, view, update statuses, and delete test orders from Supabase.
        </p>
      </div>
      <div className="mt-8">
        <AdminOrdersTable />
      </div>
    </AdminLayout>
  );
}

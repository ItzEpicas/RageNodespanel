import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import { AdminCmsManager } from "@/components/AdminCmsManager";

export const Route = createFileRoute("/admin/minecraft")({
  component: AdminMinecraftPage,
});

function AdminMinecraftPage() {
  return (
    <AdminLayout>
      <AdminCmsManager
        title="Minecraft Plans"
        description="Manage Minecraft-specific plans, pricing, resources, features, and popular badge."
        table="plans"
        fields={[
          { key: "name", label: "Name", type: "text", required: true },
          { key: "price", label: "Price", type: "number", required: true },
          { key: "billing_cycle", label: "Billing cycle", type: "text", required: true },
          { key: "ram", label: "RAM", type: "number" },
          { key: "cpu", label: "CPU", type: "number" },
          { key: "storage", label: "Storage", type: "number" },
          { key: "backups", label: "Backups", type: "number" },
          { key: "databases", label: "Databases", type: "number" },
          { key: "description", label: "Description", type: "textarea", table: false },
          { key: "features", label: "Features", type: "features", table: false },
          { key: "sort_order", label: "Sort", type: "number" },
          { key: "is_popular", label: "Popular", type: "boolean" },
          { key: "is_active", label: "Active", type: "boolean" },
        ]}
        defaults={{
          name: "",
          category: "Minecraft",
          price: 18.31,
          billing_cycle: "monthly",
          ram: 4,
          cpu: 150,
          vcpu: 0,
          storage: 30,
          backups: 1,
          databases: 1,
          ipv4_count: 0,
          description: "",
          features: [],
          sort_order: 100,
          is_popular: false,
          is_active: true,
        }}
        fixedValues={{ category: "Minecraft" }}
        emptyText="No plans found"
        searchKeys={["name", "description"]}
      />
    </AdminLayout>
  );
}

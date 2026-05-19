import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import { AdminCmsManager } from "@/components/AdminCmsManager";

export const Route = createFileRoute("/admin/vps")({
  component: AdminVpsPage,
});

function AdminVpsPage() {
  return (
    <AdminLayout>
      <AdminCmsManager
        title="VPS Plans"
        description="Manage VPS plans, vCPU, RAM, storage, IPv4 count, pricing, and features."
        table="plans"
        fields={[
          { key: "name", label: "Name", type: "text", required: true },
          { key: "price", label: "Price", type: "number", required: true },
          { key: "billing_cycle", label: "Billing cycle", type: "text", required: true },
          { key: "vcpu", label: "vCPU", type: "number" },
          { key: "ram", label: "RAM", type: "number" },
          { key: "storage", label: "Storage", type: "number" },
          { key: "ipv4_count", label: "IPv4", type: "number" },
          { key: "description", label: "Description", type: "textarea", table: false },
          { key: "features", label: "Features", type: "features", table: false },
          { key: "sort_order", label: "Sort", type: "number" },
          { key: "is_popular", label: "Popular", type: "boolean" },
          { key: "is_active", label: "Active", type: "boolean" },
        ]}
        defaults={{
          name: "",
          category: "VPS",
          price: 12.38,
          billing_cycle: "monthly",
          ram: 4,
          cpu: 0,
          vcpu: 2,
          storage: 40,
          backups: 0,
          databases: 0,
          ipv4_count: 1,
          description: "",
          features: [],
          sort_order: 100,
          is_popular: false,
          is_active: true,
        }}
        fixedValues={{ category: "VPS" }}
        emptyText="No plans found"
        searchKeys={["name", "description"]}
      />
    </AdminLayout>
  );
}

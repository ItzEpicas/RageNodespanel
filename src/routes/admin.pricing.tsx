import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import { AdminCmsManager, type CmsField } from "@/components/AdminCmsManager";

export const Route = createFileRoute("/admin/pricing")({
  component: AdminPricingPage,
});

const PLAN_FIELDS: CmsField[] = [
  { key: "name", label: "Name", type: "text", required: true },
  {
    key: "category",
    label: "Category",
    type: "select",
    required: true,
    options: ["Minecraft", "Game Server", "VPS", "Custom"],
  },
  { key: "price", label: "Price", type: "number", required: true },
  { key: "billing_cycle", label: "Billing cycle", type: "text", required: true },
  { key: "ram", label: "RAM", type: "number" },
  { key: "cpu", label: "CPU", type: "number" },
  { key: "vcpu", label: "vCPU", type: "number" },
  { key: "storage", label: "Storage", type: "number" },
  { key: "backups", label: "Backups", type: "number" },
  { key: "databases", label: "Databases", type: "number" },
  { key: "ipv4_count", label: "IPv4", type: "number" },
  { key: "description", label: "Description", type: "textarea", table: false },
  { key: "features", label: "Features", type: "features", table: false },
  { key: "sort_order", label: "Sort", type: "number" },
  { key: "is_popular", label: "Popular", type: "boolean" },
  { key: "is_active", label: "Active", type: "boolean" },
];

const PLAN_DEFAULTS = {
  name: "",
  category: "Game Server",
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
};

function AdminPricingPage() {
  return (
    <AdminLayout>
      <AdminCmsManager
        title="Pricing"
        description="Add, edit, disable, and reorder hosting plans shown across the public website."
        table="plans"
        fields={PLAN_FIELDS}
        defaults={PLAN_DEFAULTS}
        emptyText="No plans found"
        searchKeys={["name", "category", "description"]}
      />
    </AdminLayout>
  );
}

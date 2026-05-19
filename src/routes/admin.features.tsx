import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import { AdminCmsManager } from "@/components/AdminCmsManager";

export const Route = createFileRoute("/admin/features")({
  component: AdminFeaturesPage,
});

function AdminFeaturesPage() {
  return (
    <AdminLayout>
      <AdminCmsManager
        title="Features"
        description="Manage homepage feature cards and trust cards."
        table="features"
        fields={[
          { key: "title", label: "Title", type: "text", required: true },
          { key: "description", label: "Description", type: "textarea" },
          { key: "icon", label: "Icon name", type: "text" },
          { key: "sort_order", label: "Sort", type: "number" },
          { key: "is_active", label: "Active", type: "boolean" },
        ]}
        defaults={{
          title: "",
          description: "",
          icon: "Zap",
          sort_order: 100,
          is_active: true,
        }}
        emptyText="No features found"
        searchKeys={["title", "description", "icon"]}
      />
    </AdminLayout>
  );
}

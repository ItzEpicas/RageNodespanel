import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import { AdminCmsManager } from "@/components/AdminCmsManager";

export const Route = createFileRoute("/admin/games")({
  component: AdminGamesPage,
});

function AdminGamesPage() {
  return (
    <AdminLayout>
      <AdminCmsManager
        title="Games"
        description="Manage supported games, categories, starting prices, descriptions, and visibility."
        table="games"
        fields={[
          { key: "name", label: "Name", type: "text", required: true },
          { key: "slug", label: "Slug", type: "text", required: true },
          {
            key: "category",
            label: "Category",
            type: "select",
            required: true,
            options: ["Sandbox", "Survival", "FPS", "Simulation", "RP", "Strategy", "Other"],
          },
          { key: "starting_price", label: "Starting price", type: "text" },
          { key: "description", label: "Description", type: "textarea" },
          { key: "image_url", label: "Image URL", type: "text", table: false },
          { key: "sort_order", label: "Sort", type: "number" },
          { key: "is_active", label: "Active", type: "boolean" },
        ]}
        defaults={{
          name: "",
          slug: "",
          category: "Other",
          description: "",
          starting_price: "$9.94/month",
          image_url: "",
          sort_order: 100,
          is_active: true,
        }}
        emptyText="No games found"
        searchKeys={["name", "slug", "category", "description"]}
      />
    </AdminLayout>
  );
}

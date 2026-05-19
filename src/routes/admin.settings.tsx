import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import { AdminSingletonEditor } from "@/components/AdminSingletonEditor";
import { DEFAULT_SETTINGS } from "@/lib/cms";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  return (
    <AdminLayout>
      <AdminSingletonEditor
        title="Settings"
        description="Manage global site settings used by public pages."
        table="site_settings"
        defaults={DEFAULT_SETTINGS}
        fields={[
          { key: "site_name", label: "Site name", type: "text" },
          { key: "discord_invite_url", label: "Discord invite URL", type: "text" },
          { key: "panel_url", label: "Panel URL", type: "text" },
          { key: "billing_url", label: "Billing URL", type: "text" },
          { key: "support_email", label: "Support email", type: "text" },
          { key: "currency", label: "Currency", type: "text" },
          { key: "maintenance_mode", label: "Maintenance mode", type: "boolean" },
        ]}
      />
    </AdminLayout>
  );
}

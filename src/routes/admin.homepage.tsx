import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import { AdminSingletonEditor } from "@/components/AdminSingletonEditor";
import { DEFAULT_HOMEPAGE } from "@/lib/cms";

export const Route = createFileRoute("/admin/homepage")({
  component: AdminHomepagePage,
});

function AdminHomepagePage() {
  return (
    <AdminLayout>
      <AdminSingletonEditor
        title="Homepage"
        description="Edit homepage hero and CTA content. Empty Supabase content falls back to safe defaults."
        table="homepage_content"
        defaults={DEFAULT_HOMEPAGE}
        fields={[
          { key: "hero_title", label: "Hero title", type: "text" },
          { key: "hero_subtitle", label: "Hero subtitle", type: "textarea" },
          { key: "primary_button_text", label: "Primary button text", type: "text" },
          { key: "primary_button_url", label: "Primary button URL", type: "text" },
          { key: "secondary_button_text", label: "Secondary button text", type: "text" },
          { key: "secondary_button_url", label: "Secondary button URL", type: "text" },
          { key: "cta_title", label: "CTA title", type: "text" },
          { key: "cta_subtitle", label: "CTA subtitle", type: "textarea" },
          { key: "cta_button_text", label: "CTA button text", type: "text" },
          { key: "cta_button_url", label: "CTA button URL", type: "text" },
        ]}
      />
    </AdminLayout>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import { AdminCmsManager } from "@/components/AdminCmsManager";

export const Route = createFileRoute("/admin/faq")({
  component: AdminFaqPage,
});

function AdminFaqPage() {
  return (
    <AdminLayout>
      <AdminCmsManager
        title="FAQ"
        description="Manage public FAQ questions, answers, categories, visibility, and order."
        table="faqs"
        fields={[
          { key: "question", label: "Question", type: "text", required: true },
          { key: "answer", label: "Answer", type: "textarea", required: true },
          { key: "category", label: "Category", type: "text" },
          { key: "sort_order", label: "Sort", type: "number" },
          { key: "is_active", label: "Active", type: "boolean" },
        ]}
        defaults={{
          question: "",
          answer: "",
          category: "General",
          sort_order: 100,
          is_active: true,
        }}
        emptyText="No FAQ entries found"
        searchKeys={["question", "answer", "category"]}
      />
    </AdminLayout>
  );
}

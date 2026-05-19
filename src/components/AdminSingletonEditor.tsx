import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { isSupabaseConfigured, supabase, SUPABASE_CONFIG_ERROR } from "@/lib/supabase";

type Value = string | boolean | undefined;
type Row = Record<string, Value> & { id?: string };

interface Field {
  key: string;
  label: string;
  type: "text" | "textarea" | "boolean";
}

export function AdminSingletonEditor({
  title,
  description,
  table,
  defaults,
  fields,
}: {
  title: string;
  description: string;
  table: string;
  defaults: Row;
  fields: Field[];
}) {
  const [form, setForm] = useState<Row>(defaults);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!isSupabaseConfigured) {
        setErrorMessage(SUPABASE_CONFIG_ERROR);
        toast.error(SUPABASE_CONFIG_ERROR);
        return;
      }

      const { data, error } = await supabase
        .from(table)
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        const message = getSingletonErrorMessage(error.message);
        setErrorMessage(message);
        toast.error(message);
        return;
      }

      setErrorMessage(null);
      if (data) setForm({ ...defaults, ...(data as Row) });
    }

    load();
  }, [defaults, table]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isSupabaseConfigured) {
      setErrorMessage(SUPABASE_CONFIG_ERROR);
      toast.error(SUPABASE_CONFIG_ERROR);
      return;
    }

    const payload = { ...form };
    delete payload.id;
    setSaving(true);

    const { data, error } = form.id
      ? await supabase.from(table).update(payload).eq("id", form.id).select("*").single()
      : await supabase.from(table).insert(payload).select("*").single();

    setSaving(false);

    if (error) {
      const message = getSingletonErrorMessage(error.message || "Save failed.");
      setErrorMessage(message);
      toast.error(message);
      return;
    }

    setErrorMessage(null);
    toast.success("Saved");
    if (data) setForm({ ...defaults, ...(data as Row) });
  };

  return (
    <>
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">CMS</p>
        <h1 className="mt-2 text-4xl font-bold">{title}</h1>
        <p className="mt-2 text-muted-foreground">{description}</p>
      </div>

      {errorMessage && (
        <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm text-primary">
          {errorMessage}
        </div>
      )}

      <form onSubmit={save} className="glass mt-8 grid gap-5 rounded-3xl p-6 md:grid-cols-2">
        {fields.map((field) => {
          if (field.type === "boolean") {
            return (
              <label
                key={field.key}
                className="flex items-center justify-between rounded-xl border border-white/10 p-3"
              >
                <span className="text-sm">{field.label}</span>
                <Switch
                  checked={Boolean(form[field.key])}
                  onCheckedChange={(value) =>
                    setForm((current) => ({ ...current, [field.key]: value }))
                  }
                />
              </label>
            );
          }

          return (
            <div key={field.key} className={field.type === "textarea" ? "md:col-span-2" : ""}>
              <Label className="mb-2 block text-sm">{field.label}</Label>
              {field.type === "textarea" ? (
                <Textarea
                  rows={4}
                  value={String(form[field.key] ?? "")}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, [field.key]: event.target.value }))
                  }
                />
              ) : (
                <Input
                  value={String(form[field.key] ?? "")}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, [field.key]: event.target.value }))
                  }
                />
              )}
            </div>
          );
        })}
        <div className="flex justify-end md:col-span-2">
          <Button disabled={saving} className="bg-gradient-to-r from-primary to-accent glow-red">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </>
  );
}

function getSingletonErrorMessage(message: string) {
  if (message.includes("Could not find the table")) {
    return `${message}. Run supabase/schema.sql in the Supabase SQL Editor, then refresh this admin page.`;
  }

  return message;
}

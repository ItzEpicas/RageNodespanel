import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { isSupabaseConfigured, supabase, SUPABASE_CONFIG_ERROR } from "@/lib/supabase";

type FieldType = "text" | "number" | "textarea" | "select" | "boolean" | "features";
type CmsValue = string | number | boolean | string[] | null;
type CmsRow = Record<string, CmsValue> & { id?: string };

export interface CmsField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: readonly string[];
  table?: boolean;
}

export function AdminCmsManager({
  title,
  description,
  table,
  fields,
  defaults,
  emptyText,
  searchKeys = ["name", "title", "question"],
  fixedValues,
}: {
  title: string;
  description: string;
  table: string;
  fields: CmsField[];
  defaults: CmsRow;
  emptyText: string;
  searchKeys?: string[];
  fixedValues?: CmsRow;
}) {
  const [rows, setRows] = useState<CmsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<CmsRow | null>(null);
  const [form, setForm] = useState<CmsRow>(defaults);
  const [modalOpen, setModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fixedValuesKey = JSON.stringify(fixedValues ?? {});

  const tableFields = fields.filter((field) => field.table !== false);

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      searchKeys.some((key) =>
        String(row[key] ?? "")
          .toLowerCase()
          .includes(needle),
      ),
    );
  }, [rows, search, searchKeys]);

  const loadRows = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      setErrorMessage(SUPABASE_CONFIG_ERROR);
      toast.error(SUPABASE_CONFIG_ERROR);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    let query = supabase
      .from(table)
      .select("*")
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    const fixed = JSON.parse(fixedValuesKey) as CmsRow;

    for (const [key, value] of Object.entries(fixed)) {
      query = query.eq(key, value);
    }

    const { data, error } = await query;
    setLoading(false);

    if (error) {
      const message = getCmsErrorMessage(error.message || `Failed to load ${title}.`);
      setErrorMessage(message);
      toast.error(message);
      return;
    }

    setErrorMessage(null);
    setRows((data ?? []) as CmsRow[]);
  }, [fixedValuesKey, table, title]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...defaults, ...(JSON.parse(fixedValuesKey) as CmsRow) });
    setModalOpen(true);
  };

  const openEdit = (row: CmsRow) => {
    setEditing(row);
    setForm({ ...row, ...(JSON.parse(fixedValuesKey) as CmsRow) });
    setModalOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isSupabaseConfigured) {
      toast.error(SUPABASE_CONFIG_ERROR);
      return;
    }

    for (const field of fields) {
      if (field.required && !form[field.key]) {
        toast.error(`${field.label} is required`);
        return;
      }
    }

    const payload = { ...form, ...(JSON.parse(fixedValuesKey) as CmsRow) };
    delete payload.id;

    const { error } = editing?.id
      ? await supabase.from(table).update(payload).eq("id", editing.id)
      : await supabase.from(table).insert(payload);

    if (error) {
      const message = getCmsErrorMessage(error.message || "Save failed.");
      setErrorMessage(message);
      toast.error(message);
      return;
    }

    setErrorMessage(null);
    toast.success(editing ? "Updated" : "Created");
    setEditing(null);
    setForm(defaults);
    setModalOpen(false);
    await loadRows();
  };

  const deleteRow = async (row: CmsRow) => {
    if (!row.id) return;
    if (!window.confirm("Are you sure you want to delete this?")) return;
    if (!isSupabaseConfigured) {
      toast.error(SUPABASE_CONFIG_ERROR);
      return;
    }

    const { error } = await supabase.from(table).delete().eq("id", row.id);
    if (error) {
      const message = getCmsErrorMessage(error.message || "Delete failed.");
      setErrorMessage(message);
      toast.error(message);
      return;
    }

    setErrorMessage(null);
    setRows((current) => current.filter((item) => item.id !== row.id));
    toast.success("Deleted");
  };

  return (
    <>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">CMS</p>
          <h1 className="mt-2 text-4xl font-bold">{title}</h1>
          <p className="mt-2 text-muted-foreground">{description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadRows}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={openCreate} className="bg-gradient-to-r from-primary to-accent glow-red">
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm text-primary">
          {errorMessage}
        </div>
      )}

      <div className="glass mt-8 rounded-3xl p-5">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={`Search ${title.toLowerCase()}...`}
        />
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                {tableFields.map((field) => (
                  <th key={field.key} className="px-3 py-3 text-left">
                    {field.label}
                  </th>
                ))}
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={tableFields.length + 1}
                    className="px-3 py-10 text-center text-muted-foreground"
                  >
                    Loading...
                  </td>
                </tr>
              )}
              {!loading && filteredRows.length === 0 && (
                <tr>
                  <td
                    colSpan={tableFields.length + 1}
                    className="px-3 py-10 text-center text-muted-foreground"
                  >
                    {emptyText}
                  </td>
                </tr>
              )}
              {filteredRows.map((row) => (
                <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                  {tableFields.map((field) => (
                    <td key={field.key} className="px-3 py-3">
                      <CellValue value={row[field.key]} field={field} />
                    </td>
                  ))}
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="icon" onClick={() => openEdit(row)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => deleteRow(row)}>
                        <Trash2 className="h-4 w-4 text-primary" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            setEditing(null);
            setForm(defaults);
          }
        }}
      >
        <DialogContent className="glass max-h-[88vh] overflow-y-auto border-white/10 sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${title}` : `Add ${title}`}</DialogTitle>
            <DialogDescription>Changes save directly to Supabase.</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <AdminField
                key={field.key}
                field={field}
                value={form[field.key]}
                onChange={(value) => setForm((current) => ({ ...current, [field.key]: value }))}
              />
            ))}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditing(null);
                  setForm(defaults);
                  setModalOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-primary to-accent glow-red">
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function getCmsErrorMessage(message: string) {
  if (message.includes("Could not find the table")) {
    return `${message}. Run supabase/schema.sql in the Supabase SQL Editor, then refresh this admin page.`;
  }

  return message;
}

function CellValue({ value, field }: { value: CmsValue | undefined; field: CmsField }) {
  if (field.type === "boolean") return value ? "Enabled" : "Disabled";
  if (field.type === "features" && Array.isArray(value)) return `${value.length} features`;
  return <span className="line-clamp-2">{String(value ?? "-")}</span>;
}

function AdminField({
  field,
  value,
  onChange,
}: {
  field: CmsField;
  value: CmsValue | undefined;
  onChange: (value: CmsValue) => void;
}) {
  const commonLabel = (
    <Label className="mb-2 block text-sm">
      {field.label}
      {field.required && <span className="text-primary">*</span>}
    </Label>
  );

  if (field.type === "boolean") {
    return (
      <label className="flex items-center justify-between rounded-xl border border-white/10 p-3">
        <span className="text-sm">{field.label}</span>
        <Switch checked={Boolean(value)} onCheckedChange={onChange} />
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <div>
        {commonLabel}
        <Select value={String(value ?? "")} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.type === "textarea" || field.type === "features") {
    return (
      <div className="sm:col-span-2">
        {commonLabel}
        <Textarea
          rows={field.type === "features" ? 6 : 4}
          value={Array.isArray(value) ? value.join("\n") : String(value ?? "")}
          onChange={(event) =>
            onChange(
              field.type === "features"
                ? event.target.value
                    .split("\n")
                    .map((item) => item.trim())
                    .filter(Boolean)
                : event.target.value,
            )
          }
        />
      </div>
    );
  }

  return (
    <div>
      {commonLabel}
      <Input
        type={field.type === "number" ? "number" : "text"}
        value={String(value ?? "")}
        onChange={(event) =>
          onChange(field.type === "number" ? Number(event.target.value) : event.target.value)
        }
      />
    </div>
  );
}

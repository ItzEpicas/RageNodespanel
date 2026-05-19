import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, MessagesSquare } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { GAME_SERVER_PLANS, MINECRAFT_PLANS } from "@/constants/plans";
import {
  calculateGameServerPrice,
  MINECRAFT_SOFTWARE,
  MINECRAFT_VERSIONS,
  PAYMENT_METHODS,
} from "@/constants/pricing";
import { SUPPORTED_GAME_NAMES } from "@/constants/games";
import { DEFAULT_SETTINGS, fetchSiteSettings } from "@/lib/cms";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  BUILDER_STORAGE_KEY,
  type BuilderConfig,
  type HostingType,
  type OrderFormValues,
} from "@/types/orders";

const allPlans = [...GAME_SERVER_PLANS, ...MINECRAFT_PLANS];
const supportStorageKey = "ragenodes_support_ticket";

const DEFAULT_FORM: OrderFormValues = {
  full_name: "",
  email: "",
  discord_username: "",
  hosting_type: "Game Server",
  selected_game: "Minecraft",
  selected_plan: "Custom",
  server_name: "",
  ram: 4,
  cpu: 150,
  vcpu: 2,
  storage: 30,
  backups: 1,
  extra_ports: 0,
  minecraft_version: "1.21.4",
  server_software: "Paper",
  operating_system: "Ubuntu",
  ipv4_count: 1,
  payment_method: "Manual",
  estimated_price: 0,
  notes: "",
};

export function OrderForm() {
  const [form, setForm] = useState<OrderFormValues>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submittedOrderNumber, setSubmittedOrderNumber] = useState<string | null>(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const estimatedPrice = useMemo(() => {
    const plan = allPlans.find((item) => item.id === form.selected_plan);
    if (plan) return plan.price;

    return calculateGameServerPrice({
      ram: form.ram ?? 4,
      storage: form.storage ?? 30,
      cpu: form.cpu ?? 150,
      backups: form.backups ?? 0,
      extra_ports: form.extra_ports ?? 0,
    });
  }, [form]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryPlan = params.get("plan");
    const saved = localStorage.getItem(BUILDER_STORAGE_KEY);

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as BuilderConfig;
        const hostingType: HostingType =
          parsed.hosting_type === "VPS" ? "Custom" : (parsed.hosting_type ?? "Custom");
        const selectedPlan = parsed.selected_plan?.includes("vps")
          ? "Custom"
          : (parsed.selected_plan ?? "Custom");
        setForm((current) => ({
          ...current,
          ...parsed,
          hosting_type: hostingType,
          selected_plan: selectedPlan,
          selected_game:
            hostingType === "Minecraft"
              ? "Minecraft"
              : parsed.selected_game || current.selected_game,
          estimated_price: parsed.estimated_price ?? current.estimated_price,
        }));
        return;
      } catch {
        localStorage.removeItem(BUILDER_STORAGE_KEY);
      }
    }

    if (queryPlan) {
      const plan = allPlans.find(
        (item) => item.id === queryPlan || item.id.replace("-game", "") === queryPlan,
      );
      if (!plan) return;

      const hostingType: HostingType = plan.id.includes("minecraft") ? "Minecraft" : "Game Server";

      setForm((current) => ({
        ...current,
        hosting_type: hostingType,
        selected_plan: plan.id,
        selected_game: hostingType === "Minecraft" ? "Minecraft" : current.selected_game,
        ram: "ram" in plan ? plan.ram : current.ram,
        cpu: "cpu" in plan ? plan.cpu : current.cpu,
        storage: "storage" in plan ? plan.storage : current.storage,
        backups: "backups" in plan ? plan.backups : current.backups,
      }));
    }
  }, []);

  useEffect(() => {
    void fetchSiteSettings().then(setSettings);
  }, []);

  const set = <K extends keyof OrderFormValues>(key: K, value: OrderFormValues[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (
      !form.full_name.trim() ||
      !form.email.trim() ||
      !form.hosting_type ||
      !form.server_name?.trim() ||
      !form.payment_method
    ) {
      toast.error(
        "Please fill in full name, email, hosting type, server name, and payment method.",
      );
      return;
    }

    setSubmitting(true);
    const session = isSupabaseConfigured ? (await supabase.auth.getSession()).data.session : null;
    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      discord_username: form.discord_username.trim(),
      hosting_type: form.hosting_type,
      selected_game: form.selected_game || null,
      selected_plan: form.selected_plan || null,
      server_name: form.server_name.trim(),
      ram: form.ram ?? null,
      cpu: form.cpu ?? null,
      vcpu: null,
      storage: form.storage ?? null,
      backups: form.backups ?? null,
      extra_ports: form.extra_ports ?? null,
      minecraft_version: form.minecraft_version || null,
      server_software: form.server_software || null,
      operating_system: null,
      ipv4_count: null,
      payment_method: form.payment_method || null,
      estimated_price: estimatedPrice,
      notes: form.notes || null,
      status: "Pending",
    };

    const response = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(session?.access_token ? { authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const responsePayload = await response.json().catch(() => ({}));
    setSubmitting(false);

    if (!response.ok) {
      toast.error(responsePayload.error || "Order submission failed. Please try again.");
      return;
    }

    localStorage.removeItem(BUILDER_STORAGE_KEY);
    const orderNumber = String(
      responsePayload.order?.order_number || responsePayload.order?.id || "",
    );
    setSubmittedOrderNumber(orderNumber || null);
    toast.success("Order submitted. Choose Discord ticket or Live Support to continue.");
    setDone(true);
  };

  if (done) {
    return (
      <div className="glass mx-auto max-w-xl rounded-3xl p-10 text-center glow-red-soft">
        <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
        <h1 className="mt-4 text-3xl font-bold">Order request submitted</h1>
        <p className="mt-3 text-muted-foreground">
          {submittedOrderNumber
            ? `Order ${submittedOrderNumber} is waiting for manual payment review.`
            : "Your order request has been submitted. Choose Discord or Live Support."}
        </p>
        <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/8 p-4 text-sm text-primary">
          Choose how you want to continue: open a Discord ticket path or open a Live Support ticket
          on the website.
        </div>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button
            onClick={async () => {
              const supportTicket = await createManualPaymentTicket({
                form,
                estimatedPrice,
                orderNumber: submittedOrderNumber || "",
              });
              if (!supportTicket) {
                toast.error("Could not open Live Support right now.");
                return;
              }
              window.localStorage.setItem(supportStorageKey, JSON.stringify(supportTicket));
              window.location.assign("/support");
            }}
            className="bg-primary"
          >
            <MessagesSquare className="h-4 w-4" />
            Open Live Support
          </Button>
          <Button asChild className="bg-gradient-to-r from-primary to-accent glow-red">
            <a href={settings.discord_invite_url} target="_blank" rel="noreferrer">
              <MessagesSquare className="h-4 w-4" />
              Open Discord
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Back home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <section className="glass rounded-3xl p-6 md:p-8">
          <h2 className="text-xl font-bold">Order details</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <TextField
              label="Full name"
              value={form.full_name}
              required
              onChange={(value) => set("full_name", value)}
            />
            <TextField
              label="Email"
              value={form.email}
              required
              type="email"
              onChange={(value) => set("email", value)}
            />
            <TextField
              label="Discord username"
              value={form.discord_username}
              required
              onChange={(value) => set("discord_username", value)}
            />
            <TextField
              label="Server name"
              value={form.server_name ?? ""}
              required
              onChange={(value) => set("server_name", value)}
            />
          </div>
        </section>

        <section className="glass rounded-3xl p-6 md:p-8">
          <h2 className="text-xl font-bold">Configuration</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Hosting type"
              value={form.hosting_type}
              values={["Minecraft", "Game Server", "Custom"]}
              onChange={(value) => set("hosting_type", value as HostingType)}
            />
            <SelectField
              label="Selected game"
              value={form.selected_game ?? "Minecraft"}
              values={SUPPORTED_GAME_NAMES}
              onChange={(value) => set("selected_game", value)}
            />
            <TextField
              label="Selected plan"
              value={form.selected_plan ?? ""}
              onChange={(value) => set("selected_plan", value)}
            />
            <SelectField
              label="Payment method"
              value={form.payment_method}
              values={PAYMENT_METHODS}
              onChange={(value) => set("payment_method", value)}
            />
            <NumberField
              label="RAM (GB)"
              value={form.ram ?? 0}
              onChange={(value) => set("ram", value)}
            />
            <NumberField
              label="CPU (%)"
              value={form.cpu ?? 0}
              onChange={(value) => set("cpu", value)}
            />
            <NumberField
              label="Storage (GB)"
              value={form.storage ?? 0}
              onChange={(value) => set("storage", value)}
            />
            <NumberField
              label="Backups"
              value={form.backups ?? 0}
              onChange={(value) => set("backups", value)}
            />
            <NumberField
              label="Extra ports"
              value={form.extra_ports ?? 0}
              onChange={(value) => set("extra_ports", value)}
            />
            <SelectField
              label="Minecraft version"
              value={form.minecraft_version ?? "1.21.4"}
              values={MINECRAFT_VERSIONS}
              onChange={(value) => set("minecraft_version", value)}
            />
            <SelectField
              label="Server software"
              value={form.server_software ?? "Paper"}
              values={MINECRAFT_SOFTWARE}
              onChange={(value) => set("server_software", value)}
            />
          </div>
          <div className="mt-4">
            <div className="mb-4 rounded-2xl border border-primary/15 bg-primary/8 px-4 py-3 text-sm text-primary">
              Checkout uses <strong>manual payment only</strong>. When you submit, RageNodes opens a
              Live Support ticket and the Discord payment flow for staff review.
            </div>
            <Label className="mb-2 block text-sm">Notes</Label>
            <Textarea
              value={form.notes ?? ""}
              rows={4}
              maxLength={2000}
              onChange={(event) => set("notes", event.target.value)}
              placeholder="Plugins, modpacks, OS requirements, locations, deadlines, or anything else we should know."
            />
          </div>
        </section>
      </div>

      <aside className="glass h-fit rounded-3xl p-6 glow-red-soft lg:sticky lg:top-24">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Estimated total
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="gradient-text text-5xl font-black">${estimatedPrice.toFixed(2)}</span>
          <span className="text-muted-foreground">/month</span>
        </div>
        <Button
          type="submit"
          disabled={submitting}
          className="mt-7 h-12 w-full bg-gradient-to-r from-primary to-accent glow-red"
        >
          {submitting ? "Submitting..." : "Submit order request"}
        </Button>
      </aside>
    </form>
  );
}

async function createManualPaymentTicket({
  form,
  estimatedPrice,
  orderNumber,
}: {
  form: OrderFormValues;
  estimatedPrice: number;
  orderNumber: string;
}) {
  const subject = orderNumber
    ? `Manual payment for ${orderNumber}`
    : `Manual payment for ${form.server_name.trim() || "new order"}`;

  const message = [
    "A new checkout was submitted and needs manual payment review.",
    "",
    `Order Number: ${orderNumber || "Pending assignment"}`,
    `Customer: ${form.full_name.trim()}`,
    `Email: ${form.email.trim()}`,
    `Discord: ${form.discord_username.trim() || "-"}`,
    `Hosting Type: ${form.hosting_type}`,
    `Game: ${form.selected_game || "-"}`,
    `Plan: ${form.selected_plan || "Custom"}`,
    `Server Name: ${form.server_name.trim()}`,
    `RAM: ${form.ram ?? 0}GB`,
    `CPU: ${form.cpu ?? 0}%`,
    `Storage: ${form.storage ?? 0}GB`,
    `Backups: ${form.backups ?? 0}`,
    `Extra Ports: ${form.extra_ports ?? 0}`,
    `Estimated Total: $${estimatedPrice.toFixed(2)}/month`,
    `Payment Method: Manual`,
    "",
    `Notes: ${form.notes?.trim() || "None"}`,
  ].join("\n");

  const response = await fetch("/api/support/tickets", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: form.full_name.trim(),
      email: form.email.trim(),
      discord: form.discord_username.trim(),
      subject,
      category: "Billing",
      priority: "High",
      message,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("Could not open manual payment support ticket", payload);
    return null;
  }

  return payload.ticket ?? null;
}

function TextField({
  label,
  value,
  type = "text",
  required,
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Label className="mb-2 block text-sm">
        {label}
        {required && <span className="text-primary">*</span>}
      </Label>
      <Input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <Label className="mb-2 block text-sm">{label}</Label>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Label className="mb-2 block text-sm">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {values.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

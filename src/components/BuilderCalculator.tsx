import { useMemo, useState } from "react";
import { Cpu, HardDrive, MemoryStick, Network, ShieldCheck } from "lucide-react";
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
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { SUPPORTED_GAME_NAMES } from "@/constants/games";
import {
  calculateGameServerPrice,
  MINECRAFT_SOFTWARE,
  MINECRAFT_VERSIONS,
} from "@/constants/pricing";
import { BUILDER_STORAGE_KEY, type BuilderConfig, type HostingType } from "@/types/orders";

const LOCATIONS = ["Europe", "North America", "Best available"];

const DEFAULTS: Record<HostingType, BuilderConfig> = {
  Minecraft: {
    hosting_type: "Minecraft",
    selected_game: "Minecraft",
    server_name: "",
    ram: 4,
    cpu: 150,
    storage: 30,
    backups: 2,
    extra_ports: 0,
    minecraft_version: "1.21.4",
    server_software: "Paper",
    notes: "",
  },
  "Game Server": {
    hosting_type: "Game Server",
    selected_game: "Rust",
    server_name: "",
    ram: 4,
    cpu: 150,
    storage: 50,
    backups: 1,
    extra_ports: 0,
    location: "Europe",
    notes: "",
  },
  VPS: {
    hosting_type: "VPS",
    server_name: "",
    vcpu: 2,
    ram: 4,
    storage: 40,
    operating_system: "Ubuntu",
    ipv4_count: 1,
    notes: "",
  },
  Custom: {
    hosting_type: "Custom",
    server_name: "",
    ram: 4,
    cpu: 150,
    storage: 40,
    backups: 1,
    extra_ports: 0,
    notes: "",
  },
};

export function BuilderCalculator() {
  const [config, setConfig] = useState<BuilderConfig>(DEFAULTS.Minecraft);

  const estimatedPrice = useMemo(
    () =>
      calculateGameServerPrice({
        ram: config.ram ?? 4,
        storage: config.storage ?? 30,
        cpu: config.cpu ?? 150,
        backups: config.backups ?? 0,
        extra_ports: config.extra_ports ?? 0,
      }),
    [config],
  );

  const setHostingType = (hostingType: HostingType) => {
    setConfig(DEFAULTS[hostingType]);
  };

  const set = <K extends keyof BuilderConfig>(key: K, value: BuilderConfig[K]) => {
    setConfig((current) => ({ ...current, [key]: value }));
  };

  const continueToOrder = () => {
    const savedConfig = { ...config, estimated_price: estimatedPrice };
    localStorage.setItem(BUILDER_STORAGE_KEY, JSON.stringify(savedConfig));
    window.location.href = "/order";
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="glass rounded-3xl p-5 md:p-8">
        <div className="grid gap-3 sm:grid-cols-3">
          {(["Minecraft", "Game Server", "Custom"] as HostingType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setHostingType(type)}
              className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                config.hosting_type === type
                  ? "border-primary bg-primary/10 text-foreground glow-red-soft"
                  : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <span className="text-sm font-semibold">{type}</span>
            </button>
          ))}
        </div>

        <div className="mt-8 space-y-7">
          {config.hosting_type === "Minecraft" && <MinecraftFields config={config} set={set} />}
          {config.hosting_type === "Game Server" && <GameServerFields config={config} set={set} />}
          {config.hosting_type === "Custom" && <CustomFields config={config} set={set} />}
        </div>
      </div>

      <aside className="glass h-fit rounded-3xl p-6 glow-red-soft lg:sticky lg:top-24">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Estimated monthly price
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="gradient-text text-5xl font-black">${estimatedPrice.toFixed(2)}</span>
          <span className="text-muted-foreground">/mo</span>
        </div>
        <div className="mt-6 space-y-2 text-sm">
          <SummaryRow label="Type" value={config.hosting_type} />
          {config.selected_game && <SummaryRow label="Game" value={config.selected_game} />}
          <SummaryRow label="RAM" value={`${config.ram ?? 0} GB`} />
          <SummaryRow label="CPU" value={`${config.cpu ?? 0}%`} />
          <SummaryRow label="Storage" value={`${config.storage ?? 0} GB`} />
          <SummaryRow label="Backups" value={`${config.backups ?? 0}`} />
          <SummaryRow label="Extra ports" value={`${config.extra_ports ?? 0}`} />
        </div>
        <Button
          onClick={continueToOrder}
          className="mt-7 h-12 w-full bg-gradient-to-r from-primary to-accent glow-red"
        >
          Continue to Order
        </Button>
      </aside>
    </div>
  );
}

function MinecraftFields({
  config,
  set,
}: {
  config: BuilderConfig;
  set: <K extends keyof BuilderConfig>(key: K, value: BuilderConfig[K]) => void;
}) {
  return (
    <>
      <TextField
        label="Server name"
        value={config.server_name ?? ""}
        onChange={(value) => set("server_name", value)}
        placeholder="RageNodes SMP"
      />
      <ResourceGrid>
        <NumberSlider
          icon={MemoryStick}
          label="RAM"
          value={config.ram ?? 4}
          suffix="GB"
          min={1}
          max={32}
          step={1}
          onChange={(value) => set("ram", value)}
        />
        <NumberSlider
          icon={Cpu}
          label="CPU"
          value={config.cpu ?? 150}
          suffix="%"
          min={100}
          max={800}
          step={50}
          onChange={(value) => set("cpu", value)}
        />
        <NumberSlider
          icon={HardDrive}
          label="Storage"
          value={config.storage ?? 30}
          suffix="GB"
          min={10}
          max={500}
          step={5}
          onChange={(value) => set("storage", value)}
        />
        <NumberSlider
          icon={ShieldCheck}
          label="Backups"
          value={config.backups ?? 2}
          suffix="backups"
          min={0}
          max={10}
          step={1}
          onChange={(value) => set("backups", value)}
        />
        <NumberSlider
          icon={Network}
          label="Extra ports"
          value={config.extra_ports ?? 0}
          suffix="ports"
          min={0}
          max={10}
          step={1}
          onChange={(value) => set("extra_ports", value)}
        />
      </ResourceGrid>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Minecraft version"
          value={config.minecraft_version ?? "1.21.4"}
          values={MINECRAFT_VERSIONS}
          onChange={(value) => set("minecraft_version", value)}
        />
        <SelectField
          label="Software"
          value={config.server_software ?? "Paper"}
          values={MINECRAFT_SOFTWARE}
          onChange={(value) => set("server_software", value)}
        />
      </div>
      <Notes value={config.notes ?? ""} onChange={(value) => set("notes", value)} />
    </>
  );
}

function GameServerFields({
  config,
  set,
}: {
  config: BuilderConfig;
  set: <K extends keyof BuilderConfig>(key: K, value: BuilderConfig[K]) => void;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Game"
          value={config.selected_game ?? "Rust"}
          values={SUPPORTED_GAME_NAMES}
          onChange={(value) => set("selected_game", value)}
        />
        <TextField
          label="Server name"
          value={config.server_name ?? ""}
          onChange={(value) => set("server_name", value)}
          placeholder="RageNodes Community"
        />
      </div>
      <ResourceGrid>
        <NumberSlider
          icon={MemoryStick}
          label="RAM"
          value={config.ram ?? 4}
          suffix="GB"
          min={1}
          max={64}
          step={1}
          onChange={(value) => set("ram", value)}
        />
        <NumberSlider
          icon={Cpu}
          label="CPU"
          value={config.cpu ?? 150}
          suffix="%"
          min={100}
          max={1000}
          step={50}
          onChange={(value) => set("cpu", value)}
        />
        <NumberSlider
          icon={HardDrive}
          label="Storage"
          value={config.storage ?? 50}
          suffix="GB"
          min={10}
          max={1000}
          step={10}
          onChange={(value) => set("storage", value)}
        />
        <NumberSlider
          icon={ShieldCheck}
          label="Backups"
          value={config.backups ?? 1}
          suffix="backups"
          min={0}
          max={10}
          step={1}
          onChange={(value) => set("backups", value)}
        />
        <NumberSlider
          icon={Network}
          label="Extra ports"
          value={config.extra_ports ?? 0}
          suffix="ports"
          min={0}
          max={20}
          step={1}
          onChange={(value) => set("extra_ports", value)}
        />
      </ResourceGrid>
      <SelectField
        label="Location"
        value={config.location ?? "Europe"}
        values={LOCATIONS}
        onChange={(value) => set("location", value)}
      />
      <Notes value={config.notes ?? ""} onChange={(value) => set("notes", value)} />
    </>
  );
}

function CustomFields({
  config,
  set,
}: {
  config: BuilderConfig;
  set: <K extends keyof BuilderConfig>(key: K, value: BuilderConfig[K]) => void;
}) {
  return (
    <>
      <TextField
        label="Server name"
        value={config.server_name ?? ""}
        onChange={(value) => set("server_name", value)}
        placeholder="RageNodes Custom"
      />
      <ResourceGrid>
        <NumberSlider
          icon={MemoryStick}
          label="RAM"
          value={config.ram ?? 4}
          suffix="GB"
          min={1}
          max={64}
          step={1}
          onChange={(value) => set("ram", value)}
        />
        <NumberSlider
          icon={Cpu}
          label="CPU"
          value={config.cpu ?? 150}
          suffix="%"
          min={100}
          max={1000}
          step={50}
          onChange={(value) => set("cpu", value)}
        />
        <NumberSlider
          icon={HardDrive}
          label="Storage"
          value={config.storage ?? 40}
          suffix="GB"
          min={10}
          max={1000}
          step={10}
          onChange={(value) => set("storage", value)}
        />
        <NumberSlider
          icon={ShieldCheck}
          label="Backups"
          value={config.backups ?? 1}
          suffix="backups"
          min={0}
          max={10}
          step={1}
          onChange={(value) => set("backups", value)}
        />
        <NumberSlider
          icon={Network}
          label="Extra ports"
          value={config.extra_ports ?? 0}
          suffix="ports"
          min={0}
          max={20}
          step={1}
          onChange={(value) => set("extra_ports", value)}
        />
      </ResourceGrid>
      <Notes value={config.notes ?? ""} onChange={(value) => set("notes", value)} />
    </>
  );
}

function ResourceGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-6 md:grid-cols-2">{children}</div>;
}

function NumberSlider({
  icon: Icon,
  label,
  value,
  suffix,
  min,
  max,
  step,
  onChange,
}: {
  icon: typeof Cpu;
  label: string;
  value: number;
  suffix: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <Label className="flex items-center gap-2 text-sm">
          <Icon className="h-4 w-4 text-primary" />
          {label}
        </Label>
        <span className="font-mono text-sm text-primary">
          {value} {suffix}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(next) => onChange(next[0])}
      />
    </div>
  );
}

function TextField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Label className="mb-2 block text-sm">{label}</Label>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
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

function Notes({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <Label className="mb-2 block text-sm">Notes</Label>
      <Textarea
        value={value}
        rows={4}
        maxLength={2000}
        placeholder="Anything we should know about plugins, mods, locations, deadlines, or setup preferences."
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

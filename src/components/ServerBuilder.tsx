import { useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calculatePrice, type BuildConfig, MC_VERSIONS, SOFTWARE } from "@/lib/pricing";
import { Cpu, HardDrive, MemoryStick, ShieldCheck, Network } from "lucide-react";

export interface BuilderState extends BuildConfig {
  version: string;
  software: string;
}

export const DEFAULT_BUILD: BuilderState = {
  ram: 4,
  ssd: 30,
  cpu: 150,
  backups: 2,
  ports: 0,
  version: "1.21.4",
  software: "Paper",
};

interface Props {
  value: BuilderState;
  onChange: (v: BuilderState) => void;
}

export function ServerBuilder({ value, onChange }: Props) {
  const price = useMemo(() => calculatePrice(value), [value]);

  const set = <K extends keyof BuilderState>(k: K, v: BuilderState[K]) =>
    onChange({ ...value, [k]: v });

  const Row = ({
    icon: Icon,
    label,
    value: v,
    suffix,
    min,
    max,
    step,
    onSlide,
  }: {
    icon: typeof Cpu;
    label: string;
    value: number;
    suffix: string;
    min: number;
    max: number;
    step: number;
    onSlide: (n: number) => void;
  }) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-sm">
          <Icon className="w-4 h-4 text-primary" /> {label}
        </Label>
        <span className="font-mono text-sm text-primary">
          {v} {suffix}
        </span>
      </div>
      <Slider value={[v]} min={min} max={max} step={step} onValueChange={(n) => onSlide(n[0])} />
    </div>
  );

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6">
      <div className="glass rounded-2xl p-6 md:p-8 space-y-7">
        <Row
          icon={MemoryStick}
          label="RAM"
          value={value.ram}
          suffix="GB"
          min={1}
          max={32}
          step={1}
          onSlide={(n) => set("ram", n)}
        />
        <Row
          icon={HardDrive}
          label="SSD storage"
          value={value.ssd}
          suffix="GB"
          min={10}
          max={500}
          step={5}
          onSlide={(n) => set("ssd", n)}
        />
        <Row
          icon={Cpu}
          label="CPU"
          value={value.cpu}
          suffix="%"
          min={100}
          max={800}
          step={50}
          onSlide={(n) => set("cpu", n)}
        />
        <Row
          icon={ShieldCheck}
          label="Backups"
          value={value.backups}
          suffix={value.backups === 1 ? "backup" : "backups"}
          min={0}
          max={10}
          step={1}
          onSlide={(n) => set("backups", n)}
        />
        <Row
          icon={Network}
          label="Extra ports"
          value={value.ports}
          suffix={value.ports === 1 ? "port" : "ports"}
          min={0}
          max={10}
          step={1}
          onSlide={(n) => set("ports", n)}
        />

        <div className="grid sm:grid-cols-2 gap-4 pt-2">
          <div>
            <Label className="text-sm mb-2 block">Minecraft version</Label>
            <Select value={value.version} onValueChange={(v) => set("version", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MC_VERSIONS.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm mb-2 block">Server software</Label>
            <Select value={value.software} onValueChange={(v) => set("software", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOFTWARE.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 h-fit sticky top-20 glow-red-soft">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Estimated total
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-5xl font-black gradient-text">${price.toFixed(2)}</span>
          <span className="text-muted-foreground">/mo</span>
        </div>
        <div className="mt-6 space-y-2 text-sm">
          <SummaryRow label="RAM" value={`${value.ram} GB`} />
          <SummaryRow label="SSD" value={`${value.ssd} GB`} />
          <SummaryRow label="CPU" value={`${value.cpu}%`} />
          <SummaryRow label="Backups" value={`${value.backups}`} />
          <SummaryRow label="Extra ports" value={`${value.ports}`} />
          <SummaryRow label="Software" value={`${value.software} ${value.version}`} />
        </div>
      </div>
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

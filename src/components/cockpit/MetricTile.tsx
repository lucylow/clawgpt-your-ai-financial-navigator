import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MetricTileProps {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  iconClassName?: string;
  className?: string;
}

/** Scannable KPI tile for cockpit overview — consistent padding and hierarchy. */
export function MetricTile({ label, value, icon: Icon, iconClassName, className }: MetricTileProps) {
  return (
    <div
      className={cn(
        "glass-card flex items-start gap-3 rounded-[var(--radius)] px-4 py-3",
        className,
      )}
    >
      <div className={cn("mt-0.5 rounded-md bg-primary/15 p-2 text-primary", iconClassName)}>
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className="text-lg font-semibold tabular-nums tracking-tight text-foreground">{value}</div>
      </div>
    </div>
  );
}

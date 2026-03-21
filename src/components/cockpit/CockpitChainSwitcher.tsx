import { Layers } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COCKPIT_CHAIN_META, SUPPORTED_WDK_CHAINS, type WdkChainId } from "@/config/chains";
import { useCockpitChainStore } from "@/store/useCockpitChainStore";
import { cn } from "@/lib/utils";

type Props = { className?: string; disabled?: boolean };

export default function CockpitChainSwitcher({ className, disabled }: Props) {
  const focusChain = useCockpitChainStore((s) => s.focusChain);
  const setFocusChain = useCockpitChainStore((s) => s.setFocusChain);

  return (
    <div className={cn("flex items-center gap-2 min-w-0", className)}>
      <Layers className="h-3.5 w-3.5 shrink-0 text-muted-foreground hidden sm:block" aria-hidden />
      <Select
        value={focusChain}
        onValueChange={(v) => setFocusChain(v as WdkChainId)}
        disabled={disabled}
      >
        <SelectTrigger
          className="h-8 w-[min(100%,220px)] text-xs border-border/50 bg-background/60"
          aria-label="Cockpit chain context"
        >
          <SelectValue placeholder="Chain" />
        </SelectTrigger>
        <SelectContent align="end" className="max-h-72">
          {SUPPORTED_WDK_CHAINS.map((id) => {
            const m = COCKPIT_CHAIN_META[id];
            const sub =
              m.chainId != null ? `${m.network} · ${m.native} · ${m.chainId}` : `${m.network} · ${m.native}`;
            return (
              <SelectItem key={id} value={id} className="text-xs">
                <span className="font-medium capitalize">{m.label}</span>
                <span className="text-muted-foreground ml-1">— {sub}</span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

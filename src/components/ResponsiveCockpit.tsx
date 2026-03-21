import type { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const MOBILE_SPLIT = "min-h-[min(46vh,28rem)]";
const MOBILE_PANEL = "min-h-[min(42vh,24rem)]";

type ResponsiveCockpitProps = {
  /** Chat / agent surface (left on md+, top on mobile stacked) */
  primary: ReactNode;
  /** Charts / globe / metrics (right on md+, bottom on mobile) */
  secondary: ReactNode;
  className?: string;
};

/**
 * Switches cockpit chrome: stacked cards on small viewports, true split from md up.
 * Uses the same 768px breakpoint as `useIsMobile` for consistent behavior.
 */
export default function ResponsiveCockpit({ primary, secondary, className }: ResponsiveCockpitProps) {
  const isMobile = useIsMobile();

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full max-w-[100vw] flex-col overflow-x-hidden overflow-y-hidden md:flex-row",
        className
      )}
    >
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-col border-b border-border/30 md:h-full md:max-w-[44%] md:basis-[40%] md:shrink-0 md:border-b-0 md:border-r",
          isMobile ? cn("flex-1", MOBILE_SPLIT) : "md:flex-1"
        )}
      >
        {primary}
      </div>
      <div
        className={cn(
          "min-h-0 min-w-0 flex-1 overflow-hidden md:h-full",
          isMobile && cn(MOBILE_PANEL, "border-t border-border/20")
        )}
      >
        {secondary}
      </div>
    </div>
  );
}

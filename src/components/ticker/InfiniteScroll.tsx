import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InfiniteScrollProps {
  children: ReactNode;
  className?: string;
  /** Hover pause uses CSS (see index.css .ticker-marquee-wrap:hover) */
  durationSec?: number;
}

export function InfiniteScroll({ children, className, durationSec = 45 }: InfiniteScrollProps) {
  return (
    <div className={cn("ticker-marquee-wrap relative h-full w-full overflow-hidden", className)}>
      <div
        className="ticker-marquee-track flex w-max will-change-transform"
        style={{ animationDuration: `${durationSec}s` }}
      >
        {children}
      </div>
    </div>
  );
}

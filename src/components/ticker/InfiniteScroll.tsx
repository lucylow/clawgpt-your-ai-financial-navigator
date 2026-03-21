import { type ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

interface InfiniteScrollProps {
  children: ReactNode;
  className?: string;
  pauseOnHover?: boolean;
  durationSec?: number;
}

export function InfiniteScroll({
  children,
  className,
  pauseOnHover = true,
  durationSec = 45,
}: InfiniteScrollProps) {
  const [paused, setPaused] = useState(false);

  return (
    <div
      className={cn("ticker-marquee-wrap group/ticker relative h-full w-full overflow-hidden", className)}
      onMouseEnter={pauseOnHover ? () => setPaused(true) : undefined}
      onMouseLeave={pauseOnHover ? () => setPaused(false) : undefined}
    >
      <div
        className="ticker-marquee-track flex w-max will-change-transform"
        style={{
          animationDuration: `${durationSec}s`,
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        {children}
      </div>
    </div>
  );
}

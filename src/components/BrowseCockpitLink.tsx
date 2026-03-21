import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { COCKPIT_APP_BASE } from "@/config/routes";
import { setBrowseSessionActive } from "@/lib/cockpitAccess";
import { cn } from "@/lib/utils";

/** Sets read-only browse flag and opens the cockpit (allowed when strict auth is off). */
export default function BrowseCockpitLink({
  className,
  children = "Preview sample cockpit (no sign-in)",
}: {
  className?: string;
  children?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => {
        setBrowseSessionActive();
        navigate(COCKPIT_APP_BASE);
      }}
      className={cn(
        "text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm",
        className,
      )}
    >
      {children}
    </button>
  );
}

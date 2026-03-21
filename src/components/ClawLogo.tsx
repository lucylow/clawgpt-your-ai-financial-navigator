import { cn } from "@/lib/utils";

type ClawLogoProps = {
  className?: string;
  title?: string;
};

/** Inline mark: gradient claw + terminal cue for hero branding */
export function ClawLogo({ className, title = "ClawGPT" }: ClawLogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("shrink-0", className)}
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id="claw-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect x="2" y="4" width="28" height="20" rx="4" fill="rgba(26,31,46,0.95)" stroke="url(#claw-logo-grad)" strokeWidth="1.5" />
      <path
        fill="url(#claw-logo-grad)"
        d="M8 11h14v2H8v-2zm0 5h10v2H8v-2zm0 5h7v2H8v-2z"
      />
      <path fill="url(#claw-logo-grad)" d="M22 21l4 3-4 3v-2.5h-4v-1h4V21z" opacity="0.95" />
      <circle cx="25" cy="9" r="2" fill="#10b981" opacity="0.95" />
    </svg>
  );
}

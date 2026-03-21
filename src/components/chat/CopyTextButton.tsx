import { useCallback, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CopyTextButtonProps = {
  text: string;
  /** Accessible name for the control */
  label: string;
  className?: string;
};

export function CopyTextButton({ text, label, className }: CopyTextButtonProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore — clipboard may be unavailable */
    }
  }, [text]);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground", className)}
      onClick={() => void onCopy()}
      aria-label={label}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
    </Button>
  );
}

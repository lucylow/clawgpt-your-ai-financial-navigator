import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDemoStore } from "@/store/useDemoStore";

type Variant = "hero" | "compact" | "inline";

interface DemoWalletButtonProps {
  className?: string;
  variant?: Variant;
  navigateToApp?: boolean;
}

export default function DemoWalletButton({
  className,
  variant = "hero",
  navigateToApp = true,
}: DemoWalletButtonProps) {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [busy, setBusy] = useState(false);
  const connectDemoWallet = useDemoStore((s) => s.connectDemoWallet);
  const isDemoWalletConnected = useDemoStore((s) => s.isDemoWalletConnected);

  const handleClick = async () => {
    setBusy(true);
    try {
      await connectDemoWallet();
      const mode = useDemoStore.getState().walletMode;
      if (mode === "wdk") {
        toast.success("Real WDK wallet connected", {
          description: "Testnet RPCs — fund from faucets, then refresh balances in the cockpit.",
          duration: 5000,
        });
      } else {
        toast.success("Demo wallet connected!", {
          description: "6-chain portfolio loaded — welcome to the cockpit.",
          duration: 4000,
        });
      }
      if (navigateToApp) {
        navigate("/app");
      }
    } catch {
      toast.error("Could not connect wallet");
    } finally {
      setBusy(false);
    }
  };

  const baseMotion = reduceMotion
    ? {}
    : {
        whileHover: { scale: 1.02 },
        whileTap: { scale: 0.98 },
        animate: {
          boxShadow: [
            "0 0 0 0 rgba(99, 102, 241, 0.45)",
            "0 0 40px 4px rgba(139, 92, 246, 0.35)",
            "0 0 0 0 rgba(99, 102, 241, 0.45)",
          ],
        },
        transition: {
          duration: 2.4,
          repeat: Infinity,
          ease: "easeInOut" as const,
        },
      };

  if (isDemoWalletConnected && navigateToApp) {
    return (
      <Link
        to="/app"
        className={cn(
          "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-300",
          variant === "hero" && "px-8 py-3.5 text-base min-h-[52px] shadow-lg shadow-indigo-500/20",
          variant === "compact" && "px-4 py-2 text-sm",
          variant === "inline" && "px-3 py-1.5 text-xs",
          "border border-[#6366f1]/40 bg-[#1A1F2E]/90 text-[#F8FAFC] hover:border-[#8b5cf6]/60 hover:bg-[#1A1F2E]",
          className
        )}
      >
        <Sparkles className="h-4 w-4 shrink-0 text-[#a5b4fc]" aria-hidden />
        Open cockpit
      </Link>
    );
  }

  return (
    <motion.button
      type="button"
      disabled={busy}
      onClick={handleClick}
      {...baseMotion}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-[filter] duration-300",
        "bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#8b5cf6] text-white",
        "hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1F]",
        variant === "hero" && "px-8 py-3.5 text-base min-h-[52px]",
        variant === "compact" && "px-4 py-2 text-sm min-h-[44px]",
        variant === "inline" && "px-3 py-1.5 text-xs min-h-[36px]",
        className
      )}
    >
      <Sparkles className="h-5 w-5 shrink-0 opacity-95 sm:h-6 sm:w-6" aria-hidden />
      {busy ? "Connecting…" : "Launch demo"}
    </motion.button>
  );
}

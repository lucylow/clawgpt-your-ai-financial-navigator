import { type ReactNode, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { COCKPIT_APP_BASE } from "@/config/routes";
import { isWalletSessionActive } from "@/lib/demoWallet";
import { isBrowseSessionActive } from "@/lib/cockpitAccess";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  children: ReactNode;
}

/**
 * Cockpit guard: Supabase session, or (unless `VITE_REQUIRE_AUTH_FOR_APP=true`) wallet session or browse flag.
 * Unauthenticated users are sent to `/auth?redirect=…` for post-login return.
 */
export default function ProtectedRoute({ children }: Props) {
  const { session, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const requireAuthOnly = import.meta.env.VITE_REQUIRE_AUTH_FOR_APP === "true";

  useEffect(() => {
    if (loading) return;
    const walletSession = isWalletSessionActive();
    const browse = isBrowseSessionActive();
    const allowDevBypass = !requireAuthOnly && (walletSession || browse);
    if (session || allowDevBypass) return;
    const next = `${location.pathname}${location.search}`;
    const redirect = encodeURIComponent(next.startsWith("/") ? next : COCKPIT_APP_BASE);
    navigate(`/auth?redirect=${redirect}`, { replace: true });
  }, [session, loading, navigate, location.pathname, location.search, requireAuthOnly]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const walletConnected = isWalletSessionActive();
  const browseOnly = isBrowseSessionActive();
  const allowDevBypass = !requireAuthOnly && (walletConnected || browseOnly);
  if (!session && !allowDevBypass) return null;

  return <>{children}</>;
}

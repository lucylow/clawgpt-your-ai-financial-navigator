import { type ReactNode, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { COCKPIT_APP_BASE } from "@/config/routes";
import { DEMO_SESSION_KEY } from "@/lib/demoWallet";
import { isBrowseSessionActive } from "@/lib/cockpitAccess";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  children: ReactNode;
}

/**
 * Cockpit guard: Supabase session, or (unless `VITE_REQUIRE_AUTH_FOR_APP=true`) demo wallet or browse flag.
 * Unauthenticated users are sent to `/auth?redirect=…` for post-login return.
 */
export default function ProtectedRoute({ children }: Props) {
  const { session, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const requireAuthOnly = import.meta.env.VITE_REQUIRE_AUTH_FOR_APP === "true";

  useEffect(() => {
    if (loading) return;
    const demo =
      typeof localStorage !== "undefined" && localStorage.getItem(DEMO_SESSION_KEY) === "1";
    const browse = isBrowseSessionActive();
    const allowDevBypass = !requireAuthOnly && (demo || browse);
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

  const demoConnected =
    typeof localStorage !== "undefined" && localStorage.getItem(DEMO_SESSION_KEY) === "1";
  const browseOnly = isBrowseSessionActive();
  const allowDevBypass = !requireAuthOnly && (demoConnected || browseOnly);
  if (!session && !allowDevBypass) return null;

  return <>{children}</>;
}

import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { DEMO_SESSION_KEY } from "@/lib/demoWallet";

interface Props {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
      const demo = typeof localStorage !== "undefined" && localStorage.getItem(DEMO_SESSION_KEY) === "1";
      if (!session && !demo) {
        navigate("/auth", { replace: true });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      const demo = typeof localStorage !== "undefined" && localStorage.getItem(DEMO_SESSION_KEY) === "1";
      if (!session && !demo) {
        navigate("/auth", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const demoConnected = typeof localStorage !== "undefined" && localStorage.getItem(DEMO_SESSION_KEY) === "1";
  if (!session && !demoConnected) return null;

  return <>{children}</>;
}

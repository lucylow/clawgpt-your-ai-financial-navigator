import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { setQueryClient } from "@/lib/queryClientSingleton";
import { getRouterBasename } from "@/lib/routerBasename";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import AuthPage from "./pages/AuthPage.tsx";
import NotFound from "./pages/NotFound.tsx";

/** Code-split the cockpit so Tether WDK + heavy deps are not evaluated on the public landing route (fixes blank Lovable preview). */
const CockpitLayout = lazy(() => import("./layouts/CockpitLayout.tsx"));
const DashboardPage = lazy(() => import("./pages/cockpit/DashboardPage.tsx"));
const PortfolioPage = lazy(() => import("./pages/cockpit/PortfolioPage.tsx"));
const TransactionsPage = lazy(() => import("./pages/cockpit/TransactionsPage.tsx"));
const WalletsPage = lazy(() => import("./pages/cockpit/WalletsPage.tsx"));
const SettingsPage = lazy(() => import("./pages/cockpit/SettingsPage.tsx"));
const HelpPage = lazy(() => import("./pages/cockpit/HelpPage.tsx"));
const NFTsPage = lazy(() => import("./pages/cockpit/NFTsPage.tsx"));
const ChatPage = lazy(() => import("./pages/cockpit/ChatPage.tsx"));

function CockpitFallback() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background" role="status">
      <Loader2 className="h-10 w-10 animate-spin text-primary" aria-label="Loading cockpit" />
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

setQueryClient(queryClient);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter basename={getRouterBasename()}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<CockpitFallback />}>
                      <CockpitLayout />
                    </Suspense>
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="portfolio" element={<PortfolioPage />} />
                <Route path="transactions" element={<TransactionsPage />} />
                <Route path="wallets" element={<WalletsPage />} />
                <Route path="nfts" element={<NFTsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="help" element={<HelpPage />} />
                <Route path="chat" element={<ChatPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

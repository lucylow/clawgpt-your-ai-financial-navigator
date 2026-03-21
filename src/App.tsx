import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import CockpitLayout from "./layouts/CockpitLayout.tsx";
import DashboardPage from "./pages/cockpit/DashboardPage.tsx";
import PortfolioPage from "./pages/cockpit/PortfolioPage.tsx";
import TransactionsPage from "./pages/cockpit/TransactionsPage.tsx";
import WalletsPage from "./pages/cockpit/WalletsPage.tsx";
import SettingsPage from "./pages/cockpit/SettingsPage.tsx";
import HelpPage from "./pages/cockpit/HelpPage.tsx";
import NFTsPage from "./pages/cockpit/NFTsPage.tsx";
import ChatPage from "./pages/cockpit/ChatPage.tsx";
import NotFound from "./pages/NotFound.tsx";

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
                    <CockpitLayout />
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

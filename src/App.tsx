import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import CockpitLayout from "./layouts/CockpitLayout.tsx";
import DashboardPage from "./pages/cockpit/DashboardPage.tsx";
import PortfolioPage from "./pages/cockpit/PortfolioPage.tsx";
import TransactionsPage from "./pages/cockpit/TransactionsPage.tsx";
import WalletsPage from "./pages/cockpit/WalletsPage.tsx";
import SettingsPage from "./pages/cockpit/SettingsPage.tsx";
import HelpPage from "./pages/cockpit/HelpPage.tsx";
import NFTsPage from "./pages/cockpit/NFTsPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/app" element={<CockpitLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="portfolio" element={<PortfolioPage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="wallets" element={<WalletsPage />} />
            <Route path="nfts" element={<NFTsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="help" element={<HelpPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

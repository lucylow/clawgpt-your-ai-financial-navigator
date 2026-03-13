import { Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/useUIStore";
import CockpitSidebar from "@/components/cockpit/CockpitSidebar";
import CockpitHeader from "@/components/cockpit/CockpitHeader";

export default function CockpitLayout() {
  const { sidebarOpen } = useUIStore();

  return (
    <div className="h-screen flex bg-background text-foreground overflow-hidden">
      <CockpitSidebar />
      <div
        className={cn(
          "flex-1 flex flex-col transition-all duration-300",
          sidebarOpen ? "ml-56" : "ml-14"
        )}
      >
        <CockpitHeader />
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import CockpitChat from "@/components/cockpit/CockpitChat";
import CockpitDashboard from "@/components/cockpit/CockpitDashboard";

export default function DashboardPage() {
  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden">
      <div className="lg:w-[380px] xl:w-[420px] border-r border-border/30 flex flex-col h-1/2 lg:h-full">
        <CockpitChat />
      </div>
      <div className="flex-1 h-1/2 lg:h-full overflow-hidden">
        <CockpitDashboard />
      </div>
    </div>
  );
}

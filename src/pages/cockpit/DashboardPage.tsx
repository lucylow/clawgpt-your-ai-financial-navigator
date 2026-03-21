import CockpitChat from "@/components/cockpit/CockpitChat";
import CockpitDashboard from "@/components/cockpit/CockpitDashboard";

export default function DashboardPage() {
  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0 overflow-hidden">
      {/* ~40% chat / ~60% dashboard on large screens */}
      <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-border/30 h-[45vh] lg:h-full lg:min-w-0 lg:basis-[40%] lg:max-w-[44%] lg:shrink-0">
        <CockpitChat />
      </div>
      <div className="flex-1 min-h-0 min-w-0 h-[55vh] lg:h-full overflow-hidden lg:basis-[60%]">
        <CockpitDashboard />
      </div>
    </div>
  );
}

import CockpitChat from "@/components/cockpit/CockpitChat";
import CockpitDashboard from "@/components/cockpit/CockpitDashboard";

export default function DashboardPage() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
      {/* Mobile: flexible split; lg+: ~40% chat / ~60% dashboard */}
      <div className="flex min-h-0 flex-[1_1_45%] flex-col border-b border-border/30 lg:h-full lg:max-w-[44%] lg:basis-[40%] lg:shrink-0 lg:border-b-0 lg:border-r">
        <CockpitChat />
      </div>
      <div className="flex min-h-0 flex-[1_1_55%] flex-col overflow-hidden lg:flex-1 lg:h-full lg:basis-[60%]">
        <CockpitDashboard />
      </div>
    </div>
  );
}

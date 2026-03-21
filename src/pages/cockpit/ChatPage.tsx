import CockpitChat from "@/components/cockpit/CockpitChat";

/** Full-bleed chat for mobile bottom-nav “Chat” tab; mirrors dashboard agent without split chrome. */
export default function ChatPage() {
  return (
    <div className="flex h-full min-h-0 w-full max-w-[100vw] flex-col overflow-hidden">
      <CockpitChat />
    </div>
  );
}

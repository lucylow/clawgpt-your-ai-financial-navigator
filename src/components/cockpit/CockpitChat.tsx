import ChatInterface from "@/components/chat/ChatInterface";

/** Agent UI boundary — full chat surface lives in `components/chat`. */
export default function CockpitChat() {
  return (
    <div className="flex h-full min-h-0 flex-col" role="region" aria-label="Claw agent chat">
      <ChatInterface />
    </div>
  );
}

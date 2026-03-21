import ChatInterface from "@/components/chat/ChatInterface";

/** Thin wrapper — chat UI lives in `components/chat` for a clear agent boundary. */
export default function CockpitChat() {
  return <ChatInterface />;
}

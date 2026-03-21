import { Loader2 } from "lucide-react";
import MessageBubble from "./MessageBubble";
import type { ChatCardPayload, Message } from "@/types";

interface MessageListProps {
  messages: Message[];
  isThinking: boolean;
  scrollRef: React.RefObject<HTMLDivElement>;
  onWizardStep: (messageId: string, step: number) => void;
  onWizardDone: (messageId: string) => void;
  onConfirmTransaction: (card: Extract<ChatCardPayload, { kind: "transaction_ready" }>) => void | Promise<void>;
  onConfirmOpportunity: (card: Extract<ChatCardPayload, { kind: "opportunity" }>) => void | Promise<void>;
  confirmTransactionLabel?: string;
  confirmOpportunityLabel?: string;
}

export default function MessageList({
  messages,
  isThinking,
  scrollRef,
  onWizardStep,
  onWizardDone,
  onConfirmTransaction,
  onConfirmOpportunity,
  confirmTransactionLabel,
  confirmOpportunityLabel,
}: MessageListProps) {
  return (
    <section
      ref={scrollRef}
      className="flex-1 space-y-3 overflow-y-auto p-4"
      aria-label="Conversation with Claw"
      role="region"
    >
      {messages.map((m) => (
        <MessageBubble
          key={m.id}
          message={m}
          onWizardStep={onWizardStep}
          onWizardDone={onWizardDone}
          onConfirmTransaction={onConfirmTransaction}
          onConfirmOpportunity={onConfirmOpportunity}
          confirmTransactionLabel={confirmTransactionLabel}
          confirmOpportunityLabel={confirmOpportunityLabel}
        />
      ))}
      {isThinking ? (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Loader2 size={14} className="shrink-0 animate-spin" aria-hidden />
          <span>Claw is analyzing your request…</span>
        </div>
      ) : null}
    </section>
  );
}

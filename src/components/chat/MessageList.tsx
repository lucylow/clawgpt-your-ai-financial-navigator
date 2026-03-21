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
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
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
      {isThinking && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 size={14} className="animate-spin" />
          Claw is thinking…
        </div>
      )}
    </div>
  );
}

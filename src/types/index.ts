export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: MessageAction[];
}

export interface MessageAction {
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface Transaction {
  hash: string;
  type: "send" | "receive" | "swap" | "bridge";
  amount: number;
  asset: "USDt" | "XAUt";
  fromChain: string;
  toChain: string;
  toAddress: string;
  status: "pending" | "confirmed" | "failed";
  timestamp: number;
}

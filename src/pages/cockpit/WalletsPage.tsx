import { Wallet } from "lucide-react";

export default function WalletsPage() {
  const wallets = [
    { chain: "Ethereum", address: "0x3f2a...91b4", balance: "$5,200" },
    { chain: "Polygon", address: "0x7c8b...2e10", balance: "$3,100" },
    { chain: "Arbitrum", address: "0xaa42...ff03", balance: "$2,150" },
    { chain: "Solana", address: "7Kp3...x9Rm", balance: "$1,200" },
    { chain: "Tron", address: "TXk2...Jm8N", balance: "$500" },
    { chain: "TON", address: "EQBv...w2Qp", balance: "$610" },
  ];

  return (
    <div className="p-6 overflow-y-auto h-full space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Wallets</h1>
        <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          + Add Wallet
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {wallets.map((w) => (
          <div key={w.chain} className="glass-card rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wallet size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{w.chain}</p>
                <p className="text-xs text-muted-foreground font-mono">{w.address}</p>
              </div>
            </div>
            <p className="text-lg font-bold text-foreground">{w.balance}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

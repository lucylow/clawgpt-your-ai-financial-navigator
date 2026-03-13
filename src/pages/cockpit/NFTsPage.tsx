import { useState } from "react";
import { cn } from "@/lib/utils";
import { Image, Lock, Unlock, ExternalLink, Send } from "lucide-react";

interface NFT {
  id: string;
  tokenId: string;
  fileType: string;
  isValid: boolean;
  owner: string;
  metadata: {
    name: string;
    description: string;
    attributes: { trait_type: string; value: string | number }[];
  };
  createdAt: number;
}

const MOCK_NFTS: NFT[] = [
  {
    id: "1",
    tokenId: "42",
    fileType: "agent-context",
    isValid: true,
    owner: "0x3f2a...91b4",
    metadata: {
      name: "Agent Claw Context",
      description: "Private context memory — low-risk DeFi strategy preferences",
      attributes: [
        { trait_type: "Agent ID", value: "claw-1" },
        { trait_type: "Type", value: "Agent Context" },
      ],
    },
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: "2",
    tokenId: "37",
    fileType: "credit-score",
    isValid: true,
    owner: "0x3f2a...91b4",
    metadata: {
      name: "On-Chain Credit Score",
      description: "Reputation score for DeFi lending — 820/900",
      attributes: [
        { trait_type: "Score", value: 820 },
        { trait_type: "Type", value: "Credit Score" },
      ],
    },
    createdAt: Date.now() - 86400000 * 10,
  },
  {
    id: "3",
    tokenId: "12",
    fileType: "premium-access",
    isValid: false,
    owner: "0x3f2a...91b4",
    metadata: {
      name: "Premium Analytics Access",
      description: "30-day access to advanced portfolio analytics",
      attributes: [
        { trait_type: "Duration", value: "30 days" },
        { trait_type: "Type", value: "Premium Access" },
      ],
    },
    createdAt: Date.now() - 86400000 * 45,
  },
  {
    id: "4",
    tokenId: "58",
    fileType: "identity",
    isValid: true,
    owner: "0x3f2a...91b4",
    metadata: {
      name: "ClawGPT Identity Badge",
      description: "Verified identity for cross-chain operations",
      attributes: [
        { trait_type: "Level", value: "Gold" },
        { trait_type: "Type", value: "Identity" },
      ],
    },
    createdAt: Date.now() - 86400000 * 1,
  },
];

const TYPE_COLORS: Record<string, string> = {
  "agent-context": "bg-primary/20 text-primary",
  "credit-score": "bg-emerald-500/20 text-emerald-400",
  "premium-access": "bg-amber-500/20 text-amber-400",
  identity: "bg-violet-500/20 text-violet-400",
};

export default function NFTsPage() {
  const [nfts] = useState<NFT[]>(MOCK_NFTS);

  return (
    <div className="p-6 overflow-y-auto h-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">NFT Gallery</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Access tokens, agent contexts & on-chain reputation
          </p>
        </div>
        <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          + Mint NFT
        </button>
      </div>

      {nfts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
          <Image size={48} className="opacity-30" />
          <p>You don't own any NFTs yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {nfts.map((nft) => (
            <div
              key={nft.id}
              className="glass-card rounded-xl overflow-hidden flex flex-col hover:border-primary/30 transition-colors group"
            >
              {/* Visual header */}
              <div className="h-32 bg-gradient-to-br from-primary/10 via-muted/50 to-accent/10 flex items-center justify-center relative">
                <Image
                  size={36}
                  className="text-muted-foreground/40 group-hover:text-primary/60 transition-colors"
                />
                <span
                  className={cn(
                    "absolute top-3 right-3 text-[10px] font-medium px-2 py-0.5 rounded-full",
                    nft.isValid
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-destructive/20 text-destructive"
                  )}
                >
                  {nft.isValid ? "Valid" : "Expired"}
                </span>
              </div>

              {/* Info */}
              <div className="p-4 flex-1 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground leading-tight">
                    {nft.metadata.name}
                  </h3>
                  <span className="text-xs text-muted-foreground font-mono shrink-0">
                    #{nft.tokenId}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2">
                  {nft.metadata.description}
                </p>

                {/* Attributes */}
                <div className="flex flex-wrap gap-1.5 mt-auto">
                  <span
                    className={cn(
                      "text-[10px] font-medium px-2 py-0.5 rounded-full",
                      TYPE_COLORS[nft.fileType] || "bg-muted text-muted-foreground"
                    )}
                  >
                    {nft.fileType}
                  </span>
                  {nft.metadata.attributes.map((attr, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground"
                    >
                      {attr.trait_type}: {attr.value}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-border/20">
                  <button
                    disabled={!nft.isValid}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-lg transition-colors",
                      nft.isValid
                        ? "bg-primary/10 text-primary hover:bg-primary/20"
                        : "bg-muted/30 text-muted-foreground cursor-not-allowed"
                    )}
                  >
                    {nft.isValid ? <Unlock size={12} /> : <Lock size={12} />}
                    Access File
                  </button>
                  <button className="flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-3 rounded-lg bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                    <Send size={12} />
                  </button>
                  <button className="flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-3 rounded-lg bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                    <ExternalLink size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
